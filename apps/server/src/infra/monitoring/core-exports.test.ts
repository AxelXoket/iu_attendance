import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The server resolves core the way every consumer does: through core's exports, under the
// source condition. Core's test helpers (src/testing) are not one of its paths.
const SERVER_DIR = fileURLToPath(new URL('../../..', import.meta.url));

const resolve = (specifier: string) =>
  spawnSync(
    process.execPath,
    [
      '--conditions=source',
      '--input-type=module',
      '-e',
      `import.meta.resolve(${JSON.stringify(specifier)})`,
    ],
    { cwd: SERVER_DIR, encoding: 'utf8', windowsHide: true },
  );

describe("core's public paths", () => {
  it('keep the test helpers out, and let the rules in (control)', () => {
    const helpers = resolve('@iu-attendance/core/testing/orders');
    expect(helpers.status).not.toBe(0);
    expect(helpers.stderr).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
    const rule = resolve('@iu-attendance/core/shared/uuid');
    expect(rule.status, rule.stderr).toBe(0);
  });
});
