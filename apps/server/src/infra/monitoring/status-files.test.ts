import { execFile, spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { BACKUP_JOBS, DATABASE_ERROR_CODES } from '@iu-attendance/contracts/database';
import { chronyStatusSchema, MACHINE_SERVICES } from '@iu-attendance/contracts/operations';
import { VERSION_MAX_LENGTH } from '@iu-attendance/contracts/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { envFor, secretsDirFor } from '../../../test/support/settings.ts';
import { CLOCK_SYNC_DEFAULTS, loadSettings, unloadSettings } from '../settings/index.ts';
import { checkEnvironment } from '../settings/schema.ts';
import {
  backupJobStatus,
  clockSyncStatus,
  MACHINE_FILE_MAX_BYTES,
  machineStatus,
  maintenanceStatus,
  readStatusFile,
  STATUS_FILE_MAX_BYTES,
} from './status-files.ts';

// The host scripts run for real under sh, with stand-ins for chronyc, docker and df named
// by CHRONYC, DOCKER and DF: no stand-in is put on PATH (security software may treat that
// as a hijacked command). The settings point statusDir at the scripts' STATUS_ROOT, so the
// server's readers check what the scripts wrote.

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const SCRIPTS = path.join(REPO_ROOT, 'docker/operations');
const run = promisify(execFile);

let root = '';
let statusDir = '';
let stateDir = '';
let fakes = '';

const CHRONYC_STUB = `#!/bin/sh
[ "$*" = "-c tracking" ] || exit 3
printf '%s\\n' "$FAKE_TRACKING"
# A failing chronyc still prints its line: only the exit status tells.
[ "\${FAKE_CHRONYC_FAIL:-}" = 1 ] && exit 1
exit 0
`;
// docker info, ps, inspect and events from the files in FAKE_DIR; every call is logged.
// events takes both bounds inclusively, as docker does, comparing nanoseconds as text of
// one length (awk numbers would round them).
const DOCKER_STUB = `#!/bin/sh
printf '%s\\n' "$*" >>"$FAKE_DIR/calls"
[ "$1" = "\${FAKE_DOCKER_FAIL:-}" ] && exit 1
case $1 in
  info) cat "$FAKE_DIR/root" ;;
  # One-off containers are listed unless the one-off filter is given.
  ps)
    cat "$FAKE_DIR/ids"
    case " $* " in
      *" label=com.docker.compose.oneoff=False "*) ;;
      *) cat "$FAKE_DIR/oneoff-ids" ;;
    esac
    ;;
  # The lines of the ids asked for, after inspect --format <format>.
  inspect)
    shift 3
    for id in "$@"; do grep -F "|$id|" "$FAKE_DIR/inspect" || :; done
    ;;
  events)
    since=$(printf '%s' "$3" | tr -d .)
    until=$(printf '%s' "$5" | tr -d .)
    awk -v s="$since" -v u="$until" '($1 "") >= (s "") && ($1 "") <= (u "") { print $2 }' "$FAKE_DIR/events"
    ;;
esac
`;
const DF_STUB = `#!/bin/sh
printf '%s\\n' "$*" >>"$FAKE_DIR/df-calls"
cat "$FAKE_DIR/df"
`;

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'status-files-'));
  statusDir = path.join(root, 'status');
  stateDir = path.join(root, 'state');
  fakes = path.join(root, 'fakes');
  await mkdir(fakes);
  for (const [name, body] of [
    ['chronyc-stub', CHRONYC_STUB],
    ['docker-stub', DOCKER_STUB],
    ['df-stub', DF_STUB],
  ] as const) {
    await writeFile(path.join(fakes, name), body);
    await chmod(path.join(fakes, name), 0o755);
  }
  loadSettings({
    process: 'cli',
    env: envFor({ STATUS_DIR: statusDir }),
    secretsDir: secretsDirFor('cli'),
  });
});

afterAll(async () => {
  unloadSettings();
  await rm(root, { recursive: true, force: true });
});

// Runs a host script with the stand-ins; env adds to the common ones, and an undefined
// value leaves a variable unset. The settings the scripts read are unset unless a case sets
// them, so a developer's own environment does not reach the cases.
type ScriptEnv = Record<string, string | undefined>;
const scriptEnv = (env: ScriptEnv) => ({
  ...process.env,
  CLOCK_SYNC_THRESHOLD_MS: undefined,
  COMPOSE_PROJECT_NAME: undefined,
  STATUS_ROOT: statusDir,
  STATE_ROOT: stateDir,
  CHRONYC: path.join(fakes, 'chronyc-stub'),
  DOCKER: path.join(fakes, 'docker-stub'),
  DF: path.join(fakes, 'df-stub'),
  ...env,
});
const runScript = (name: string, env: ScriptEnv) =>
  spawnSync('sh', [path.join(SCRIPTS, name)], {
    env: scriptEnv(env),
    encoding: 'utf8',
    windowsHide: true,
  });
// Runs a copy of a script from a folder of its own, without common.sh beside it: a broken
// install.
const runWithoutCommon = async (name: string, env: ScriptEnv) => {
  const alone = await mkdtemp(path.join(root, 'alone-'));
  await copyFile(path.join(SCRIPTS, name), path.join(alone, name));
  return spawnSync('sh', [path.join(alone, name)], {
    env: scriptEnv(env),
    encoding: 'utf8',
    windowsHide: true,
  });
};
const nsOf = (iso: string) => `${BigInt(Date.parse(iso)) * 1_000_000n}`;

// Each case runs the scripts several times; a process start on Windows under load takes
// long enough that the default five seconds is not a bound on the scripts.
const SCRIPT_CASES = { timeout: 60_000 };

describe('clock sync monitor (D15 clock_sync_monitor)', SCRIPT_CASES, () => {
  const chronyFile = () => path.join(statusDir, 'clock', 'chrony.json');
  // One `chronyc -c tracking` line: 14 fields, the ones a case names replaced.
  const tracking = (patch: {
    name?: string;
    stratum?: string;
    system?: string;
    delay?: string;
    dispersion?: string;
    leap?: string;
  }) =>
    [
      'C0A80101',
      patch.name ?? '192.168.1.1',
      patch.stratum ?? '2',
      '1792054790.582633950',
      patch.system ?? '-0.000040000',
      '-0.000000044',
      '0.000000357',
      '-11.207',
      '-0.002',
      '0.012',
      patch.delay ?? '0.020000000',
      patch.dispersion ?? '0.000500000',
      '64.2',
      patch.leap ?? 'Normal',
    ].join(',');
  // The threshold is left unset unless a case sets it: the script's default is the setting's.
  const monitor = (at: string, fakeTracking: string, env: ScriptEnv = {}) =>
    runScript('clock-sync-monitor.sh', {
      TEST_NOW_NS: nsOf(at),
      FAKE_TRACKING: fakeTracking,
      ...env,
    });
  const written = async () => JSON.parse(await readFile(chronyFile(), 'utf8'));

  beforeEach(async () => {
    await rm(path.join(statusDir, 'clock'), { recursive: true, force: true });
  });

  it('turns a synced chronyc line into the clock file: offset is the error bound in whole milliseconds, rounded up', async () => {
    const at = '2026-10-15T09:00:00.123Z';
    const result = monitor(at, tracking({}));
    expect(result.status, result.stderr).toBe(0);
    // ceil(1000 x (0.00004 + 0.0005 + 0.02 / 2)) = ceil(10.54)
    expect(await written()).toEqual({
      format: 1,
      measuredAt: at,
      synced: true,
      offsetMs: 11,
      stratum: 2,
      source: '192.168.1.1',
      lastBrokenAt: null,
    });
    // The server reads it back through the contract schema.
    expect(await clockSyncStatus()).toEqual({
      status: 'READ',
      synced: true,
      offsetMs: 11,
      stratum: 2,
      source: '192.168.1.1',
      measuredAt: new Date(at),
      lastBrokenAt: null,
    });
  });

  it('adds half the root delay and the whole dispersion to the absolute system time', async () => {
    const cases: [Parameters<typeof tracking>[0], number][] = [
      // 1000 x (0 + 0.03125 + 0.0625 / 2) = 62.5
      [{ system: '0.000000000', delay: '0.062500000', dispersion: '0.031250000' }, 63],
      // A clock behind counts like one ahead.
      [{ system: '-0.500000000', delay: '0', dispersion: '0' }, 500],
      // A whole second and more behind: the sign belongs to the whole number.
      [{ system: '-1.250000000', delay: '0', dispersion: '0' }, 1250],
      [{ system: '0.000000000', delay: '0', dispersion: '0' }, 0],
    ];
    for (const [patch, offsetMs] of cases) {
      expect(monitor('2026-10-15T09:00:00.000Z', tracking(patch)).status).toBe(0);
      expect((await written()).offsetMs, JSON.stringify(patch)).toBe(offsetMs);
    }
  });

  it('is synced only with a healthy leap status (not "Not synchronised") and a stratum of 1 to 15', async () => {
    const cases: [Parameters<typeof tracking>[0], boolean, number | null][] = [
      [{ leap: 'Not synchronised' }, false, 2],
      [{ leap: 'Insert second' }, true, 2],
      [{ leap: 'Delete second' }, true, 2],
      // A leap status chrony never prints is not taken as healthy.
      [{ leap: 'Unknown' }, false, 2],
      [{ leap: '' }, false, 2],
      [{ stratum: '1' }, true, 1],
      [{ stratum: '15' }, true, 15],
      [{ stratum: '16' }, false, 16],
      // chrony shows stratum 0 before it has a source: no stratum in the file.
      [{ stratum: '0', name: '', leap: 'Not synchronised' }, false, null],
      // Stratum 0 is not synced even when the leap status says Normal.
      [{ stratum: '0' }, false, null],
    ];
    for (const [patch, synced, stratum] of cases) {
      monitor('2026-10-15T09:00:00.000Z', tracking(patch));
      const file = await written();
      expect([file.synced, file.stratum], JSON.stringify(patch)).toEqual([synced, stratum]);
      expect(chronyStatusSchema.safeParse(file).success).toBe(true);
    }
    // A line ending in a carriage return reads the same. (On Windows the shell's command
    // substitution already drops it; on Linux the script's own strip does.)
    const carriageReturned = `${tracking({})}${String.fromCharCode(13)}`;
    expect(carriageReturned.charCodeAt(carriageReturned.length - 1)).toBe(13);
    expect(monitor('2026-10-15T09:00:00.000Z', carriageReturned).status).toBe(0);
    expect(await written()).toMatchObject({ synced: true, offsetMs: 11 });
  });

  it('writes the source name only, without characters a JSON string or a log line could carry, at most 64', async () => {
    monitor('2026-10-15T09:00:00.000Z', tracking({ name: '' }));
    expect((await written()).source).toBeNull();
    monitor('2026-10-15T09:00:00.000Z', tracking({ name: '2001:db8::1' }));
    expect((await written()).source).toBe('2001:db8::1');
    monitor('2026-10-15T09:00:00.000Z', tracking({ name: 'a"b\\c d' }));
    expect((await written()).source).toBe('abcd');
    monitor('2026-10-15T09:00:00.000Z', tracking({ name: 'n'.repeat(80) }));
    expect((await written()).source).toBe('n'.repeat(64));
  });

  it('marks the instant broken while not synced or over the threshold (the setting, by default 100), and carries it over while healthy', async () => {
    const steps: [string, Parameters<typeof tracking>[0], string | null][] = [
      ['2026-10-15T09:00:00.000Z', {}, null],
      ['2026-10-15T09:00:30.000Z', { leap: 'Not synchronised' }, '2026-10-15T09:00:30.000Z'],
      ['2026-10-15T09:01:00.000Z', {}, '2026-10-15T09:00:30.000Z'],
      // 1000 x 103 / 1024 = 100.5859375: 101, above the threshold of 100, though synced.
      [
        '2026-10-15T09:01:30.000Z',
        { system: '0.1005859375', delay: '0', dispersion: '0' },
        '2026-10-15T09:01:30.000Z',
      ],
      // 1000 x 51 / 512 = 99.609375: 100, at the threshold, is healthy.
      [
        '2026-10-15T09:02:00.000Z',
        { system: '0.099609375', delay: '0', dispersion: '0' },
        '2026-10-15T09:01:30.000Z',
      ],
      // Decimal parts whose bound is exactly 100 ms: summed as whole nanoseconds, never 101.
      [
        '2026-10-15T09:02:10.000Z',
        { system: '0.066364606', delay: '0.012424752', dispersion: '0.027423018' },
        '2026-10-15T09:01:30.000Z',
      ],
      [
        '2026-10-15T09:02:20.000Z',
        { system: '-0.091462017', delay: '0.012334052', dispersion: '0.002370957' },
        '2026-10-15T09:01:30.000Z',
      ],
    ];
    for (const [at, patch, lastBrokenAt] of steps) {
      expect(monitor(at, tracking(patch)).status).toBe(0);
      expect((await written()).lastBrokenAt, at).toBe(lastBrokenAt);
    }
    expect((await written()).offsetMs).toBe(100);
    expect(CLOCK_SYNC_DEFAULTS.thresholdMs).toBe(100);
    // The threshold comes from the setting.
    monitor(
      '2026-10-15T09:02:30.000Z',
      tracking({ system: '0.099609375', delay: '0', dispersion: '0' }),
      {
        CLOCK_SYNC_THRESHOLD_MS: '99',
      },
    );
    expect((await written()).lastBrokenAt).toBe('2026-10-15T09:02:30.000Z');
  });

  it('writes not synced and exits 1 when chronyc fails or prints something else', async () => {
    const failures: ScriptEnv[] = [
      { FAKE_CHRONYC_FAIL: '1', FAKE_TRACKING: tracking({}) },
      { FAKE_TRACKING: tracking({}).split(',').slice(0, 13).join(',') },
      { FAKE_TRACKING: tracking({ system: 'nan' }) },
      { FAKE_TRACKING: tracking({ stratum: 'x' }) },
      { FAKE_TRACKING: tracking({ delay: '-0.001000000' }) },
      { FAKE_TRACKING: `${tracking({})}\n${tracking({})}` },
    ];
    for (const env of failures) {
      const at = '2026-10-15T09:03:00.000Z';
      const result = runScript('clock-sync-monitor.sh', { TEST_NOW_NS: nsOf(at), ...env });
      expect(result.status, JSON.stringify(env)).toBe(1);
      expect(await written()).toEqual({
        format: 1,
        measuredAt: at,
        synced: false,
        offsetMs: 0,
        stratum: null,
        source: null,
        lastBrokenAt: at,
      });
    }
  });

  it('takes exactly the thresholds the settings take and refuses any other without writing', async () => {
    const candidates = [
      // Empty is no value: the settings and the script take the default.
      '',
      // Each width of the taken range: one to four digits, both ends of each.
      '1',
      '9',
      '10',
      '99',
      '100',
      '999',
      '1000',
      '4999',
      '5000',
      '0100',
      '00100',
      '0000000000000100',
      '00000000000000100',
      '0',
      '000',
      '5001',
      '1e3',
      '-1',
      '+100',
      '10ms',
      ' 100',
      '100 ',
      '99999999999999999999',
    ];
    const outcomes = new Set<boolean>();
    for (const threshold of candidates) {
      // The api's own check is the oracle: the script and the api never disagree.
      const taken = checkEnvironment('api', envFor({ CLOCK_SYNC_THRESHOLD_MS: threshold })).ok;
      outcomes.add(taken);
      await rm(chronyFile(), { force: true });
      const result = monitor('2026-10-15T09:04:00.000Z', tracking({}), {
        CLOCK_SYNC_THRESHOLD_MS: threshold,
      });
      expect(result.status, JSON.stringify(threshold)).toBe(taken ? 0 : 2);
      expect((await clockSyncStatus()).status, JSON.stringify(threshold)).toBe(
        taken ? 'READ' : 'UNREADABLE',
      );
    }
    // Ground control: both outcomes occur, a leading zero among the taken values.
    expect(outcomes).toEqual(new Set([true, false]));
    expect(checkEnvironment('api', envFor({ CLOCK_SYNC_THRESHOLD_MS: '0100' })).ok).toBe(true);
    // A taken value keeps its number: 0099 is 99, so an offset of 100 is above it.
    monitor(
      '2026-10-15T09:04:30.000Z',
      tracking({ system: '0.099609375', delay: '0', dispersion: '0' }),
      {
        CLOCK_SYNC_THRESHOLD_MS: '0099',
      },
    );
    expect((await written()).lastBrokenAt).toBe('2026-10-15T09:04:30.000Z');
  });

  it('exits 2 and writes nothing when common.sh is not beside it', async () => {
    const env = { TEST_NOW_NS: nsOf('2026-10-15T09:06:00.000Z'), FAKE_TRACKING: tracking({}) };
    expect((await runWithoutCommon('clock-sync-monitor.sh', env)).status).toBe(2);
    expect(await clockSyncStatus()).toEqual({ status: 'UNREADABLE', reason: 'FILE_MISSING' });
    // Ground control: the same run from its own folder writes the file.
    expect(runScript('clock-sync-monitor.sh', env).status).toBe(0);
    expect((await clockSyncStatus()).status).toBe('READ');
  });

  it('turns a broken instant ahead of now, left by a clock stepped back, into now', async () => {
    monitor('2026-10-15T10:00:00.000Z', tracking({ leap: 'Not synchronised' }));
    expect((await written()).lastBrokenAt).toBe('2026-10-15T10:00:00.000Z');
    monitor('2026-10-15T09:00:00.000Z', tracking({}));
    expect((await written()).lastBrokenAt).toBe('2026-10-15T09:00:00.000Z');
    // Ground control: one in the past is carried over.
    monitor('2026-10-15T09:00:30.000Z', tracking({}));
    expect((await written()).lastBrokenAt).toBe('2026-10-15T09:00:00.000Z');
  });

  it('never shows a reader half a file: 1,000 reads at once while the file is rewritten', async () => {
    monitor('2026-10-15T09:05:00.000Z', tracking({}));
    const healthy = tracking({});
    const behind = tracking({
      system: '0.000000000',
      delay: '0.062500000',
      dispersion: '0.031250000',
    });
    let writing = true;
    const writer = async () => {
      for (let n = 0; n < 10; n += 1) {
        await run('sh', [path.join(SCRIPTS, 'clock-sync-monitor.sh')], {
          env: scriptEnv({
            TEST_NOW_NS: nsOf('2026-10-15T09:05:00.000Z'),
            FAKE_TRACKING: n % 2 === 0 ? behind : healthy,
            CLOCK_SYNC_THRESHOLD_MS: '100',
          }),
          windowsHide: true,
        });
      }
      writing = false;
    };
    // Rounds of 1,000 reads at once, for as long as the writer runs.
    const offsets: number[] = [];
    const reader = async () => {
      for (let round = 0; writing || round < 1; round += 1) {
        const readings = await Promise.all(Array.from({ length: 1_000 }, () => clockSyncStatus()));
        for (const reading of readings) {
          expect(reading.status).toBe('READ');
          if (reading.status === 'READ') offsets.push(reading.offsetMs);
        }
      }
    };
    await Promise.all([writer(), reader()]);
    expect(offsets.length).toBeGreaterThanOrEqual(1_000);
    for (const offset of offsets) expect([11, 63]).toContain(offset);
    // Ground control: the reads saw both files, so they ran while the file was replaced.
    expect(new Set(offsets)).toEqual(new Set([11, 63]));
    // Positive control: a half-written file is what the reader would report.
    const whole = await readFile(chronyFile(), 'utf8');
    await writeFile(chronyFile(), whole.slice(0, whole.length / 2));
    expect(await clockSyncStatus()).toEqual({ status: 'UNREADABLE', reason: 'MALFORMED' });
  });
});

describe('machine check (D15 machine_check)', SCRIPT_CASES, () => {
  const fakeDir = () => path.join(root, 'docker-fake');
  const machineFile = () => path.join(statusDir, 'machine', 'machine.json');
  const previousFile = () => path.join(stateDir, 'machine-previous.json');
  const inspectLine = (service: string, id: string, restarts: number, extra = {}) => {
    const fields = {
      state: 'running',
      health: 'healthy',
      startedAt: '2026-10-15T07:00:01.123456789Z',
      ...extra,
    };
    return [service, id, fields.state, fields.health, restarts, fields.startedAt].join('|');
  };
  const API = 'a'.repeat(64);
  const API_NEW = 'b'.repeat(64);
  const WORKER = 'c'.repeat(64);
  const MIGRATION = 'd'.repeat(64);
  const ONE_OFF = 'e'.repeat(64);
  const setFakes = async (
    files: Partial<Record<'ids' | 'oneoff-ids' | 'inspect' | 'events', string>>,
  ) => {
    for (const [name, body] of Object.entries(files)) {
      await writeFile(path.join(fakeDir(), name), body);
    }
  };
  const check = (at: string, env: ScriptEnv = {}) =>
    runScript('machine-check.sh', {
      TEST_NOW_NS: nsOf(at),
      FAKE_DIR: fakeDir(),
      MEMINFO_FILE: path.join(fakeDir(), 'meminfo'),
      COMPOSE_PROJECT_NAME: 'iu-attendance',
      ...env,
    });
  const containers = async () => {
    const reading = await machineStatus();
    expect(reading.status).toBe('READ');
    return reading.status === 'READ' ? reading.value.containers : [];
  };
  const calls = async () => (await readFile(path.join(fakeDir(), 'calls'), 'utf8')).split('\n');

  beforeEach(async () => {
    await rm(fakeDir(), { recursive: true, force: true });
    await rm(path.join(statusDir, 'machine'), { recursive: true, force: true });
    await rm(stateDir, { recursive: true, force: true });
    await mkdir(fakeDir(), { recursive: true });
    await writeFile(path.join(fakeDir(), 'root'), '/var/lib/docker\n');
    await writeFile(
      path.join(fakeDir(), 'df'),
      [
        'Filesystem 1-blocks Used Available Capacity Mounted on',
        '/dev/sda1 100000000000 40000000000 60000000000 40% /',
        '/dev/sdb1 500000000000 125000000000 375000000000 25% /var/lib/docker',
      ].join('\n'),
    );
    await writeFile(
      path.join(fakeDir(), 'meminfo'),
      'MemTotal:        8000000 kB\nMemFree:          100000 kB\nMemAvailable:    2000000 kB\n',
    );
    await setFakes({ ids: '', 'oneoff-ids': '', inspect: '', events: '' });
  });

  it('counts a restart once, against the same container id only, and never below 0', async () => {
    const steps: [string, string, number, number][] = [
      // [instant, container id, restart count, expected increase]
      ['2026-10-15T08:08:00.000Z', API, 2, 0],
      ['2026-10-15T08:18:00.000Z', API, 3, 1],
      ['2026-10-15T08:28:00.000Z', API, 3, 0],
      // The same id's count fell (Docker reset it): no increase, and the file stays valid.
      ['2026-10-15T08:33:00.000Z', API, 1, 0],
      // The release recreated the container: a new id, its count back at 0.
      ['2026-10-15T08:38:00.000Z', API_NEW, 0, 0],
      ['2026-10-15T08:48:00.000Z', API_NEW, 2, 2],
    ];
    for (const [at, id, restarts, increase] of steps) {
      await setFakes({ ids: `${id}\n`, inspect: `${inspectLine('api-1', id, restarts)}\n` });
      const result = check(at);
      expect(result.status, result.stderr).toBe(0);
      expect(await containers(), at).toEqual([
        {
          service: 'api-1',
          containerId: id,
          state: 'running',
          health: 'healthy',
          restartCount: restarts,
          restartIncrease: increase,
          oomIncrease: 0,
          startedAt: '2026-10-15T07:00:01.123Z',
        },
      ]);
    }
  });

  it('counts an out-of-memory event in the one window it falls in, and never reads OOMKilled', async () => {
    await setFakes({
      ids: `${API}\n${WORKER}\n`,
      inspect: `${inspectLine('api-1', API, 0)}\n${inspectLine('worker', WORKER, 0)}\n`,
      // One event at 08:03, one exactly at the first run's instant.
      events: `${nsOf('2026-10-15T08:03:00.000Z')} ${API}\n${nsOf('2026-10-15T08:08:00.000Z')} ${WORKER}\n`,
    });
    const oomOf = async () =>
      Object.fromEntries((await containers()).map((each) => [each.service, each.oomIncrease]));
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    expect(await oomOf()).toEqual({ 'api-1': 1, worker: 1 });
    expect(check('2026-10-15T08:18:00.000Z').status).toBe(0);
    expect(await oomOf()).toEqual({ 'api-1': 0, worker: 0 });
    // The windows: the last ten minutes at first, then from just after the previous run.
    const windows = (await calls()).filter((call) => call.startsWith('events '));
    expect(windows).toEqual([
      `events --since ${nsOf('2026-10-15T07:58:00.000Z').slice(0, 10)}.000000000 --until ${nsOf('2026-10-15T08:08:00.000Z').slice(0, 10)}.000000000 --filter event=oom --format {{.Actor.ID}}`,
      `events --since ${nsOf('2026-10-15T08:08:00.000Z').slice(0, 10)}.000000001 --until ${nsOf('2026-10-15T08:18:00.000Z').slice(0, 10)}.000000000 --filter event=oom --format {{.Actor.ID}}`,
    ]);
    const reading = await machineStatus();
    expect(reading.status === 'READ' && reading.value.eventWindow).toEqual({
      start: '2026-10-15T08:08:00.000Z',
      end: '2026-10-15T08:18:00.000Z',
    });
    // The inspect call asks for the restart count and nothing about OOMKilled.
    const inspects = (await calls()).filter((call) => call.startsWith('inspect '));
    expect(inspects.length).toBeGreaterThan(0);
    for (const call of inspects) {
      expect(call).toContain('.RestartCount');
      expect(call).not.toContain('OOMKilled');
    }
  });

  it('writes the disks once per mount, the memory in bytes, and only the six services', async () => {
    await writeFile(
      path.join(fakeDir(), 'df'),
      [
        'Filesystem 1-blocks Used Available Capacity Mounted on',
        '/dev/sda1 100000000000 40000000000 60000000000 40% /',
        '/dev/sda1 100000000000 40000000000 60000000000 40% /',
      ].join('\n'),
    );
    await setFakes({
      ids: `${API}\n${MIGRATION}\n${WORKER}\n`,
      inspect: [
        inspectLine('api-1', API, 0),
        inspectLine('migration', MIGRATION, 0, { state: 'exited', health: '' }),
        inspectLine('worker', WORKER, 1, { health: '', startedAt: '2026-10-15T07:00:01Z' }),
      ].join('\n'),
    });
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    const reading = await machineStatus();
    expect(reading.status).toBe('READ');
    if (reading.status !== 'READ') return;
    expect(reading.value.disks).toEqual([
      { mount: '/', totalBytes: 100_000_000_000, usedBytes: 40_000_000_000 },
    ]);
    expect(reading.value.memory).toEqual({
      totalBytes: 8_000_000 * 1024,
      availableBytes: 2_000_000 * 1024,
    });
    expect(
      reading.value.containers.map((each) => [each.service, each.health, each.startedAt]),
    ).toEqual([
      ['api-1', 'healthy', '2026-10-15T07:00:01.123Z'],
      ['worker', null, '2026-10-15T07:00:01.000Z'],
    ]);
    // df is asked for the root and Docker's data directory.
    expect(await readFile(path.join(fakeDir(), 'df-calls'), 'utf8')).toBe(
      '-P -B1 / /var/lib/docker\n',
    );
  });

  it('keeps the root and the Docker data disks apart when they are two mounts', async () => {
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    const reading = await machineStatus();
    expect(reading.status === 'READ' && reading.value.disks.map((disk) => disk.mount)).toEqual([
      '/',
      '/var/lib/docker',
    ]);
    // No container yet: an empty list, still of the schema.
    expect(reading.status === 'READ' && reading.value.containers).toEqual([]);
  });

  it('counts no event but still the restarts when the clock went back behind the previous run, and keeps its end', async () => {
    await setFakes({
      ids: `${API}\n`,
      inspect: `${inspectLine('api-1', API, 2)}\n`,
      events: `${nsOf('2026-10-15T08:03:00.000Z')} ${API}\n${nsOf('2026-10-15T08:10:00.000Z')} ${API}\n`,
    });
    const counts = async () => {
      const [only] = await containers();
      return [only?.restartIncrease, only?.oomIncrease];
    };
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    expect(await counts()).toEqual([0, 1]);
    // The clock steps back a second, and the container restarts meanwhile: the restart is
    // counted, the 08:03 event is not counted again, and no events are asked for.
    await setFakes({ inspect: `${inspectLine('api-1', API, 3)}\n` });
    expect(check('2026-10-15T08:07:59.000Z').status).toBe(0);
    expect(await counts()).toEqual([1, 0]);
    const reading = await machineStatus();
    expect(reading.status === 'READ' && reading.value.eventWindow).toEqual({
      start: '2026-10-15T08:07:59.000Z',
      end: '2026-10-15T08:07:59.000Z',
    });
    expect(await readFile(previousFile(), 'utf8')).toContain(
      `"until":"${nsOf('2026-10-15T08:08:00.000Z')}"`,
    );
    // The next run's window starts just after the first run's end, and a restart in it
    // counts against the count the clock-back run carried.
    await setFakes({ inspect: `${inspectLine('api-1', API, 4)}\n` });
    expect(check('2026-10-15T08:18:00.000Z').status).toBe(0);
    expect(await counts()).toEqual([1, 1]);
    const windows = (await calls()).filter((call) => call.startsWith('events '));
    expect(windows.map((call) => call.split(' ')[2])).toEqual([
      `${nsOf('2026-10-15T07:58:00.000Z').slice(0, 10)}.000000000`,
      `${nsOf('2026-10-15T08:08:00.000Z').slice(0, 10)}.000000001`,
    ]);
  });

  it('starts a fresh ten-minute window over a damaged previous file, one with a leading zero among them', async () => {
    await setFakes({ ids: `${API}\n`, inspect: `${inspectLine('api-1', API, 4)}\n` });
    for (const damaged of [
      // 19 characters with a leading zero, digits 8 and 9 among them: not a number the
      // shell can read as octal.
      `{"format":1,"until":"0179205168000000000","containers":[{"id":"${API}","restartCount":1}]}`,
      `{"format":1,"until":"0${nsOf('2026-10-15T08:00:00.000Z')}","containers":[{"id":"${API}","restartCount":1}]}`,
      `{"format":1,"until":"${nsOf('2026-10-15T08:00:00.000Z')}0","containers":[]}`,
      'not json',
      '',
    ]) {
      await mkdir(stateDir, { recursive: true });
      await writeFile(previousFile(), damaged);
      const result = check('2026-10-15T08:08:00.000Z');
      expect(result.status, `${damaged}: ${result.stderr}`).toBe(0);
      const reading = await machineStatus();
      expect(reading.status === 'READ' && reading.value.eventWindow, damaged).toEqual({
        start: '2026-10-15T07:58:00.000Z',
        end: '2026-10-15T08:08:00.000Z',
      });
      // A first run has nothing to compare with.
      expect((await containers())[0]?.restartIncrease, damaged).toBe(0);
    }
  });

  it('reports exactly the services the operations check expects, and no other', async () => {
    // The spec's six services (D15 makine_denetimi) and two others, written out: the input
    // does not come from the list under test.
    const services = [
      'caddy',
      'api-1',
      'api-2',
      'worker',
      'postgres',
      'xprem',
      'migration',
      'adminer',
    ];
    const ids = services.map((_, n) => n.toString(16).padStart(64, '0'));
    await setFakes({
      ids: ids.map((each) => `${each}\n`).join(''),
      inspect: services.map((service, n) => inspectLine(service, ids[n] ?? '', 0)).join('\n'),
    });
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    expect((await containers()).map((each) => each.service).sort()).toEqual(
      [...MACHINE_SERVICES].sort(),
    );
    // The contract's list is the spec's six.
    expect([...MACHINE_SERVICES].sort()).toEqual(services.slice(0, 6).sort());
  });

  it('leaves out one-off containers that compose run left behind', async () => {
    await setFakes({
      ids: `${WORKER}\n`,
      'oneoff-ids': `${ONE_OFF}\n`,
      inspect: [
        inspectLine('worker', WORKER, 0),
        inspectLine('worker', ONE_OFF, 0, { state: 'exited', health: '' }),
      ].join('\n'),
    });
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    expect((await containers()).map((each) => [each.service, each.containerId])).toEqual([
      ['worker', WORKER],
    ]);
  });

  it('exits 2 and writes nothing when common.sh is not beside it', async () => {
    const env = {
      TEST_NOW_NS: nsOf('2026-10-15T08:08:00.000Z'),
      FAKE_DIR: fakeDir(),
      MEMINFO_FILE: path.join(fakeDir(), 'meminfo'),
    };
    expect((await runWithoutCommon('machine-check.sh', env)).status).toBe(2);
    expect(await machineStatus()).toEqual({ status: 'UNREADABLE', reason: 'FILE_MISSING' });
    // Ground control: the same run from its own folder writes the file.
    expect(runScript('machine-check.sh', env).status).toBe(0);
    expect((await machineStatus()).status).toBe('READ');
  });

  it('writes nothing and exits 1 when docker fails, so the file ages', async () => {
    await setFakes({ ids: `${API}\n`, inspect: `${inspectLine('api-1', API, 2)}\n` });
    expect(check('2026-10-15T08:08:00.000Z').status).toBe(0);
    const before = [await readFile(machineFile(), 'utf8'), await readFile(previousFile(), 'utf8')];
    for (const failing of ['info', 'ps', 'inspect', 'events']) {
      await setFakes({ inspect: `${inspectLine('api-1', API, 5)}\n` });
      const result = check('2026-10-15T08:18:00.000Z', { FAKE_DOCKER_FAIL: failing });
      expect(result.status, failing).toBe(1);
      expect([
        await readFile(machineFile(), 'utf8'),
        await readFile(previousFile(), 'utf8'),
      ]).toEqual(before);
    }
    // Ground control: the same run without a failure writes the new count.
    expect(check('2026-10-15T08:18:00.000Z').status).toBe(0);
    expect((await containers())[0]?.restartIncrease).toBe(3);
  });
});

describe('status file readers', () => {
  const file = (...parts: string[]) => path.join(statusDir, ...parts);
  const chrony = {
    format: 1,
    measuredAt: '2026-10-15T09:00:00.000Z',
    synced: true,
    offsetMs: 3,
    stratum: 2,
    source: null,
    lastBrokenAt: '2026-10-15T08:00:00.000Z',
  };

  beforeEach(async () => {
    await rm(statusDir, { recursive: true, force: true });
    await mkdir(file('clock'), { recursive: true });
  });

  it('reads the clock file with its instants as dates', async () => {
    await writeFile(file('clock', 'chrony.json'), JSON.stringify(chrony));
    expect(await clockSyncStatus()).toEqual({
      status: 'READ',
      synced: true,
      offsetMs: 3,
      stratum: 2,
      source: null,
      measuredAt: new Date('2026-10-15T09:00:00.000Z'),
      lastBrokenAt: new Date('2026-10-15T08:00:00.000Z'),
    });
  });

  it('tells a missing file, an unreadable one and a malformed one apart, and never throws', async () => {
    const reason = async () => {
      const reading = await clockSyncStatus();
      return reading.status === 'UNREADABLE' ? reading.reason : null;
    };
    expect(await reason()).toBe('FILE_MISSING');
    await rm(file('clock'), { recursive: true });
    expect(await reason()).toBe('FILE_MISSING');
    // A directory where the file should be cannot be read as one.
    await mkdir(file('clock', 'chrony.json'), { recursive: true });
    expect(await reason()).toBe('NO_ACCESS');
    await rm(file('clock', 'chrony.json'), { recursive: true });
    for (const body of [
      '{"format":1',
      JSON.stringify({ ...chrony, format: 2 }),
      JSON.stringify({ ...chrony, extra: 1 }),
      JSON.stringify({ ...chrony, measuredAt: '2026-10-15T09:00:00Z' }),
    ]) {
      await writeFile(file('clock', 'chrony.json'), body);
      expect(await reason(), body).toBe('MALFORMED');
    }
    // A byte that is not UTF-8 inside the source name, which a lenient decoding would
    // turn into a valid string.
    const [head, tail] = JSON.stringify({ ...chrony, source: 'ab' }).split('ab');
    await writeFile(
      file('clock', 'chrony.json'),
      Buffer.concat([Buffer.from(`${head}a`), Buffer.from([0xff]), Buffer.from(`b${tail}`)]),
    );
    expect(await reason()).toBe('MALFORMED');
    // Ground control: the same file with a valid byte is read.
    await writeFile(file('clock', 'chrony.json'), `${head}axb${tail}`);
    expect(await reason()).toBeNull();
  });

  it('takes the clock file up to 4 KiB and no byte more', async () => {
    expect(STATUS_FILE_MAX_BYTES).toBe(4096);
    const body = JSON.stringify(chrony);
    await writeFile(file('clock', 'chrony.json'), body.padEnd(STATUS_FILE_MAX_BYTES, ' '));
    expect((await clockSyncStatus()).status).toBe('READ');
    await writeFile(file('clock', 'chrony.json'), body.padEnd(STATUS_FILE_MAX_BYTES + 1, ' '));
    expect(await clockSyncStatus()).toEqual({ status: 'UNREADABLE', reason: 'MALFORMED' });
  });

  it('never refuses the largest file the machine schema allows, and refuses one byte over its bound', async () => {
    const most = Number.MAX_SAFE_INTEGER;
    const machine = {
      format: 2,
      measuredAt: '2026-10-15T09:00:00.000Z',
      eventWindow: { start: '2026-10-15T08:50:00.000Z', end: '2026-10-15T09:00:00.000Z' },
      disks: Array.from({ length: 64 }, () => ({
        mount: '/'.padEnd(512, 'm'),
        totalBytes: most,
        usedBytes: most,
      })),
      memory: { totalBytes: most, availableBytes: most },
      containers: Array.from({ length: 64 }, () => ({
        service: 's'.repeat(64),
        containerId: 'c'.repeat(128),
        state: 't'.repeat(32),
        health: 'h'.repeat(32),
        restartCount: most,
        restartIncrease: most,
        oomIncrease: most,
        startedAt: '2026-10-15T07:00:00.000Z',
      })),
    };
    const body = JSON.stringify(machine);
    // The bound is needed: the largest valid file is well over the small files' bound.
    expect(body.length).toBeGreaterThan(STATUS_FILE_MAX_BYTES * 8);
    await mkdir(file('machine'), { recursive: true });
    await writeFile(file('machine', 'machine.json'), body);
    expect(await machineStatus()).toEqual({ status: 'READ', value: machine });
    // The decided bound, 128 KiB: about twice the largest valid file.
    expect(MACHINE_FILE_MAX_BYTES).toBe(128 * 1024);
    await writeFile(file('machine', 'machine.json'), body.padEnd(MACHINE_FILE_MAX_BYTES + 1, ' '));
    expect(await machineStatus()).toEqual({ status: 'UNREADABLE', reason: 'MALFORMED' });
  });

  it('reads the maintenance file and each backup job file from their own paths', async () => {
    expect(await maintenanceStatus()).toEqual({ status: 'UNREADABLE', reason: 'FILE_MISSING' });
    // The longest version the contract allows: the file stays far under its bound.
    const maintenance = {
      format: 1,
      version: '9999.9999.9999',
      startedAt: '2026-10-15T09:00:00.000Z',
      validUntil: '2026-10-15T09:45:00.000Z',
    };
    await mkdir(file('machine'), { recursive: true });
    expect(maintenance.version).toHaveLength(VERSION_MAX_LENGTH);
    await writeFile(file('machine', 'maintenance.json'), JSON.stringify(maintenance));
    expect(await maintenanceStatus()).toEqual({ status: 'READ', value: maintenance });
    await mkdir(file('database'), { recursive: true });
    for (const job of BACKUP_JOBS) {
      const status = {
        format: 1,
        job,
        lastRunAt: '2026-10-15T03:00:00.000Z',
        lastResult: 'succeeded',
        lastSuccessAt: '2026-10-15T03:00:00.000Z',
        consecutiveSkipped: 0,
        errorCode: null,
      };
      expect(await backupJobStatus(job), job).toEqual({
        status: 'UNREADABLE',
        reason: 'FILE_MISSING',
      });
      await writeFile(file('database', `${job}.json`), JSON.stringify(status));
      expect(await backupJobStatus(job)).toEqual({ status: 'READ', value: status });
    }
    // The longest failed file: any job and error code, far under the bound.
    const longestCode = Object.keys(DATABASE_ERROR_CODES).reduce((a, b) =>
      b.length > a.length ? b : a,
    );
    const failed = {
      format: 1,
      job: 'pgbackrest_full_backup',
      lastRunAt: '2026-10-15T03:00:00.000Z',
      lastResult: 'failed',
      lastSuccessAt: '2026-10-14T03:00:00.000Z',
      consecutiveSkipped: 0,
      errorCode: longestCode,
    } as const;
    await writeFile(file('database', 'pgbackrest_full_backup.json'), JSON.stringify(failed));
    expect(await backupJobStatus('pgbackrest_full_backup')).toEqual({
      status: 'READ',
      value: failed,
    });
    // A file that names another job is not this job's.
    const [first, second] = BACKUP_JOBS;
    await writeFile(
      file('database', `${first}.json`),
      await readFile(file('database', `${second}.json`), 'utf8'),
    );
    expect(await backupJobStatus(first)).toEqual({ status: 'UNREADABLE', reason: 'MALFORMED' });
  });

  it('checks any file with the schema it is given', async () => {
    await writeFile(file('clock', 'chrony.json'), JSON.stringify(chrony));
    const reading = await readStatusFile(file('clock', 'chrony.json'), chronyStatusSchema, 4096);
    expect(reading).toEqual({ status: 'READ', value: chrony });
    expect(await readStatusFile(file('clock', 'chrony.json'), chronyStatusSchema, 10)).toEqual({
      status: 'UNREADABLE',
      reason: 'MALFORMED',
    });
    // A file that is not a regular one (here the null device, which reads as empty) is
    // NO_ACCESS, never opened as a status file.
    expect(await readStatusFile(os.devNull, chronyStatusSchema, 4096)).toEqual({
      status: 'UNREADABLE',
      reason: 'NO_ACCESS',
    });
    // A failure other than a missing file, here a path the system refuses, is NO_ACCESS.
    expect(await readStatusFile(file('clock', 'bad\0name.json'), chronyStatusSchema, 4096)).toEqual(
      {
        status: 'UNREADABLE',
        reason: 'NO_ACCESS',
      },
    );
  });
});
