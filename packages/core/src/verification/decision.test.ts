import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WINDOW_RESULTS } from '../clock/codes.ts';
import { DAY_MS } from '../clock/constants.ts';
import { QR_DELAY_RESULTS, QR_VERIFICATION_RESULTS } from '../projection/constants.ts';
import { sendWindowEndAtMs } from '../sync/send-window.ts';
import {
  DECISION_PRIORITY,
  DECISION_REASONS,
  type DecisionReason,
  reasonDefinition,
} from './codes.ts';
import { decideRecord, rankReasons } from './decision.ts';
import {
  DECISION_TABLE,
  type DecisionTableRow,
  PLAIN_RECORD,
  tableView,
} from './decision-table.ts';
import { computeLabels, type QrEvidence } from './labels.ts';

type Facts = DecisionTableRow['facts'];
const catalogIndex = (code: DecisionReason) =>
  DECISION_REASONS.findIndex((entry) => entry.code === code);
// A record when it arrives: its labels from its own facts.
const decide = (facts: Facts) => decideRecord(facts, computeLabels(facts));

// What the rule itself can give: the automatic reasons and the lecturer's not-in-class
// mark, which the rule reads from the session. A lecturer's own rulings come only from
// a lecturer's decision.
const RULE_REASONS = DECISION_REASONS.filter(
  (entry) => entry.source === 'AUTOMATIC' || entry.code === 'NOT_IN_CLASS_AT_CHECK',
).map((entry) => entry.code);
const SHARED_LIMIT_REASONS: readonly DecisionReason[] = [
  'ACCEPTED_BY_SHARED_LIMIT',
  'SHARED_LIMIT_EXCEEDED',
];
// The reasons a rule fits with; the shared limit's two come after them, never with them.
const FITTING_REASONS = RULE_REASONS.filter((code) => !SHARED_LIMIT_REASONS.includes(code));

const PLAIN_RANGE = (() => {
  const { range } = PLAIN_RECORD.clock;
  if (range === null) throw new Error('the plain record has a verified clock');
  return range;
})();
const SEND_WINDOW_END_AT_MS = sendWindowEndAtMs(
  PLAIN_RECORD.session.endAtMs,
  PLAIN_RECORD.session.lockAtMs,
);
const withFacts = (change: Partial<Facts>): Facts => ({ ...PLAIN_RECORD, ...change });
const withStudent = (change: Partial<Facts['student']>) =>
  withFacts({ student: { ...PLAIN_RECORD.student, ...change } });
const withSession = (change: Partial<Facts['session']>) =>
  withFacts({ session: { ...PLAIN_RECORD.session, ...change } });
const closedAt = (closedAtMs: number, activated = true): Facts['device'] => ({
  ...PLAIN_RECORD.device,
  status: 'closed',
  closedAtMs,
  activated,
});
const EMPTY = { used: 0, usedSessionIds: [] };
const clockOf = (status: Facts['clock']['status'], source?: Facts['clock']['source']) => {
  const row = DECISION_TABLE.find(
    (entry) =>
      entry.facts.clock.status === status &&
      (source === undefined || entry.facts.clock.source === source),
  );
  if (row === undefined) throw new Error(`the table has a ${status} clock`);
  return row.facts.clock;
};

describe('the decision table (D07 karar-tablosu)', () => {
  it('has its ground: rows with unique names, the rule giving 40 of the 44 reasons', () => {
    expect(DECISION_TABLE.length).toBeGreaterThan(70);
    expect(new Set(DECISION_TABLE.map((row) => row.name)).size).toBe(DECISION_TABLE.length);
    expect(DECISION_REASONS).toHaveLength(44);
    expect(RULE_REASONS).toHaveLength(40);
    const lecturerOnly = DECISION_REASONS.filter((entry) => !RULE_REASONS.includes(entry.code));
    expect(lecturerOnly.every((entry) => entry.source === 'LECTURER')).toBe(true);
    expect(SHARED_LIMIT_REASONS.every((code) => RULE_REASONS.includes(code))).toBe(true);
  });

  it.each(DECISION_TABLE.map((row) => [row.name, row] as const))('%s', (_name, row) => {
    const outcome = decide(row.facts);
    expect(outcome.labels).toEqual(computeLabels(row.facts));
    expect(tableView(outcome)).toEqual(row.expected);
  });

  it('gives every reason the rule can give as the primary reason of a row', () => {
    const primaries = new Set(DECISION_TABLE.map((row) => row.expected.reasonCode));
    expect(RULE_REASONS.filter((code) => !primaries.has(code))).toEqual([]);
    expect(primaries.has(null)).toBe(true);
  });

  it("never gives a lecturer's own ruling", () => {
    const given = DECISION_TABLE.flatMap((row) => [
      row.expected.reasonCode,
      ...row.expected.extraReasons,
    ]);
    expect(given.filter((code) => code !== null && !RULE_REASONS.includes(code))).toEqual([]);
    // Positive control: the rows do carry extra reasons for the check to read.
    expect(given.length).toBeGreaterThan(DECISION_TABLE.length);
  });

  it('sets every label in some row and leaves it unset in another', () => {
    const labelled = DECISION_TABLE.map((row) => row.expected.labels);
    for (const label of Object.keys(computeLabels(PLAIN_RECORD))) {
      expect(labelled.some((labels) => labels.some((set) => set === label))).toBe(true);
      expect(labelled.some((labels) => labels.every((set) => set !== label))).toBe(true);
    }
  });

  it('runs every value of the window, QR verification and QR delay lists in a row', () => {
    const facts = DECISION_TABLE.map((row) => row.facts);
    const qr = facts.flatMap((fact) => (fact.qr.evidenceKind === 'NONE' ? [] : [fact.qr]));
    const missing = (all: readonly string[], seen: readonly (string | null)[]) =>
      all.filter((value) => !seen.includes(value));
    expect(
      missing(
        WINDOW_RESULTS,
        facts.map((fact) => fact.window.result),
      ),
    ).toEqual([]);
    // NONE is the evidence of a record without QR, the rows' plain records.
    expect(
      missing(
        QR_VERIFICATION_RESULTS,
        qr.map((evidence) => evidence.verification),
      ),
    ).toEqual(['NONE']);
    expect(
      missing(
        QR_DELAY_RESULTS,
        qr.map((evidence) => evidence.delay),
      ),
    ).toEqual([]);
  });
});

describe('decideRecord boundaries', () => {
  const reasonsOf = (facts: Facts) => {
    const outcome = decide(facts);
    return [outcome.reasonCode, ...outcome.extraReasons];
  };

  it('places a closing instant against the verified clock, the instant itself in the student’s favour', () => {
    const deletedAt = (deletedAtMs: number) => decide(withStudent({ deletedAtMs })).reasonCode;
    const deviceAt = (atMs: number) => decide(withFacts({ device: closedAt(atMs) })).reasonCode;
    for (const at of [deletedAt, deviceAt]) {
      expect(at(PLAIN_RANGE.lowMs - 1)).not.toBe('CLOSED_DEVICE_TIME_UNCERTAIN');
      expect(at(PLAIN_RANGE.lowMs)).toBe('CLOSED_DEVICE_TIME_UNCERTAIN');
      expect(at(PLAIN_RANGE.highMs - 1)).toBe('CLOSED_DEVICE_TIME_UNCERTAIN');
      expect(at(PLAIN_RANGE.highMs)).toBeNull();
    }
    expect(deletedAt(PLAIN_RANGE.lowMs - 1)).toBe('DELETED_ACCOUNT');
    expect(deviceAt(PLAIN_RANGE.lowMs - 1)).toBe('OLD_DEVICE');
  });

  it('never places a device that was never active against its closing', () => {
    const closings = [
      PLAIN_RANGE.lowMs - 1,
      PLAIN_RANGE.lowMs,
      PLAIN_RANGE.highMs - 1,
      PLAIN_RANGE.highMs,
      PLAIN_RECORD.arrivedAtMs,
      PLAIN_RECORD.arrivedAtMs + 1,
    ];
    for (const clock of [PLAIN_RECORD.clock, clockOf('UNVERIFIED'), clockOf('ANCHORS_DISAGREE')]) {
      for (const atMs of closings) {
        const facts = {
          ...withFacts({ device: closedAt(atMs, false), clock }),
          sharedLimitCounter: EMPTY,
        };
        const outcome = decide(facts);
        const disagreement = clock.status === 'ANCHORS_DISAGREE' ? ['ANCHORS_DISAGREE'] : [];
        expect([outcome.reasonCode, ...outcome.extraReasons]).toEqual([
          'DEVICE_NOT_APPROVED',
          ...disagreement,
        ]);
      }
    }
    // Control: the same closing of a device that was active is placed by the clock.
    expect(decide(withFacts({ device: closedAt(PLAIN_RANGE.lowMs) })).reasonCode).toBe(
      'CLOSED_DEVICE_TIME_UNCERTAIN',
    );
  });

  it('counts a record that reached the server by the closing as taken before it, whatever its clock', () => {
    const arrival = PLAIN_RECORD.arrivedAtMs;
    const rules: readonly (DecisionReason | null)[] = [
      'OLD_DEVICE',
      'CLOSED_DEVICE_TIME_UNCERTAIN',
    ];
    for (const clock of DECISION_TABLE.map((row) => row.facts.clock)) {
      const closed = (atMs: number) =>
        reasonsOf({ ...withFacts({ device: closedAt(atMs), clock }), sharedLimitCounter: EMPTY });
      expect(closed(arrival).filter((code) => rules.includes(code))).toEqual([]);
      // Control: a closing 1 ms before the arrival is placed by the clock.
      if (clock.status !== 'VERIFIED') {
        expect(closed(arrival - 1)).toContain('CLOSED_DEVICE_TIME_UNCERTAIN');
      }
    }
  });

  it('treats a closing as uncertain whenever the clock is not verified', () => {
    // Long before every range the table's clocks have, so a range alone would say after.
    const longBefore = PLAIN_RANGE.lowMs - 60_000;
    for (const clock of DECISION_TABLE.map((row) => row.facts.clock)) {
      const reasons = reasonsOf({ ...withStudent({ deletedAtMs: longBefore }), clock });
      expect(reasons.includes('CLOSED_DEVICE_TIME_UNCERTAIN')).toBe(clock.status !== 'VERIFIED');
      expect(reasons.includes('DELETED_ACCOUNT')).toBe(clock.status === 'VERIFIED');
    }
  });

  it('rejects an unconfirmed account that was deleted or closed, and only an unconfirmed one', () => {
    const deleted = { deletedAtMs: PLAIN_RECORD.arrivedAtMs + 1 };
    expect(decide(withStudent({ confirmation: 'pending', ...deleted })).reasonCode).toBe(
      'CONFIRMATION_REJECTED',
    );
    expect(decide(withStudent({ confirmation: 'pending', accountClosed: true })).reasonCode).toBe(
      'CONFIRMATION_REJECTED',
    );
    // Control: a confirmed account deleted after the record arrived keeps the record.
    expect(decide(withStudent({ confirmation: 'confirmed', ...deleted })).reasonCode).toBeNull();
    expect(decide(withStudent({ confirmation: 'pending' })).reasonCode).toBe(
      'CONFIRMATION_PENDING',
    );
  });

  it('counts a record that arrives at the lock instant as after the last day', () => {
    expect(decide(withSession({ lockAtMs: PLAIN_RECORD.arrivedAtMs })).reasonCode).toBe(
      'AFTER_LAST_DAY',
    );
    expect(decide(withSession({ lockAtMs: PLAIN_RECORD.arrivedAtMs + 1 })).reasonCode).toBeNull();
  });

  it('marks a record late from the end of the sending time on', () => {
    const at = (arrivedAtMs: number) => decide(withFacts({ arrivedAtMs, nowMs: arrivedAtMs })).late;
    expect(at(SEND_WINDOW_END_AT_MS - 1)).toBe(false);
    expect(at(SEND_WINDOW_END_AT_MS)).toBe(true);
  });

  it('settles a change slice once the sending time has ended', () => {
    const slice = { ...PLAIN_RECORD.window, result: 'CHANGE_SLICE' } as const;
    const at = (nowMs: number) => decide(withFacts({ window: slice, nowMs })).reasonCode;
    expect(at(SEND_WINDOW_END_AT_MS - 1)).toBe('SETTING_NOT_FINAL');
    expect(at(SEND_WINDOW_END_AT_MS)).toBe('OUTSIDE_WINDOW');
  });

  it('gives a course without a unit term 7 days and never a last day', () => {
    const facts = (arrivedAtMs: number) =>
      withFacts({
        arrivedAtMs,
        nowMs: arrivedAtMs,
        session: { ...PLAIN_RECORD.session, lockAtMs: null },
      });
    const end = sendWindowEndAtMs(PLAIN_RECORD.session.endAtMs, null);
    expect(decide(facts(end - 1))).toMatchObject({ reasonCode: null, late: false });
    expect(decide(facts(end))).toMatchObject({ reasonCode: null, late: true });
    expect(decide(facts(Number.MAX_SAFE_INTEGER))).toMatchObject({ reasonCode: null, late: true });
  });

  it('reads the stored labels, not the facts, for the shared limit', () => {
    const counter = EMPTY;
    const stored = { ...computeLabels(PLAIN_RECORD), CLOCK_UNVERIFIED: true };
    const outcome = decideRecord({ ...PLAIN_RECORD, sharedLimitCounter: counter }, stored);
    expect(outcome.reasonCode).toBe('ACCEPTED_BY_SHARED_LIMIT');
    expect(outcome.labels).toBe(stored);
    // Control: the labels the facts give leave the shared limit out.
    expect(decide({ ...PLAIN_RECORD, sharedLimitCounter: counter }).sharedLimit).toBeNull();
  });

  it('names the marking lecturer only when the mark is the primary reason', () => {
    const marked = withStudent({ notInClassBy: lecturer() });
    expect(decide(marked).actorPersonId).toBe(marked.student.notInClassBy);
    const earlier = { ...marked, session: { ...marked.session, cancelled: true } };
    expect(decide(earlier)).toMatchObject({
      reasonCode: 'SESSION_CANCELLED',
      extraReasons: ['NOT_IN_CLASS_AT_CHECK'],
      decisionSource: 'AUTOMATIC',
      actorPersonId: null,
    });
  });

  it('throws RangeError for an instant that is not integer milliseconds', () => {
    const broken: Facts[] = [
      withFacts({ nowMs: 0.5 }),
      withFacts({ arrivedAtMs: Number.NaN }),
      withSession({ endAtMs: Number.POSITIVE_INFINITY }),
      withSession({ lockAtMs: 1.5 }),
      withStudent({ deletedAtMs: Number.MAX_SAFE_INTEGER + 1 }),
      withFacts({ device: closedAt(-0.5) }),
      withFacts({ device: closedAt(-0.5, false) }),
    ];
    for (const facts of broken) expect(() => decide(facts)).toThrow(RangeError);
    expect(() => decide(withSession({ lockAtMs: null }))).not.toThrow();
  });

  it('throws RangeError when the shared limit decides and no counter was read', () => {
    const noClock = DECISION_TABLE.find((row) => row.expected.spendsRight === true)?.facts;
    if (noClock === undefined) throw new Error('the table has a row that spends a right');
    expect(() => decide({ ...noClock, sharedLimitCounter: null })).toThrow(RangeError);
    // Control: a rule that fits keeps the shared limit, and its counter, out.
    const fits = { ...noClock, sharedLimitCounter: null, faultyVersion: true };
    expect(decide(fits).reasonCode).toBe('FAULTY_VERSION');
  });
});

function lecturer() {
  const row = DECISION_TABLE.find((entry) => entry.expected.actorPersonId !== null);
  if (row?.expected.actorPersonId == null) throw new Error('the table has a marked row');
  return row.expected.actorPersonId;
}

// The spec's priority statement, written out on its own: the highest class that fits,
// the first catalog reason in it, the rest in the catalog's order; after the last day
// in review AFTER_LAST_DAY unless a rejection fits.
function expectedRanking(fits: ReadonlySet<DecisionReason>) {
  const fitting = [...fits].sort((a, b) => catalogIndex(a) - catalogIndex(b));
  const top = DECISION_PRIORITY.find((decision) =>
    fitting.some((code) => reasonDefinition(code).decision === decision),
  );
  if (top === undefined) return { reasonCode: null, extraReasons: [] };
  const reasonCode =
    fits.has('AFTER_LAST_DAY') && top !== 'REJECTED'
      ? 'AFTER_LAST_DAY'
      : fitting.find((code) => reasonDefinition(code).decision === top);
  return { reasonCode, extraReasons: fitting.filter((code) => code !== reasonCode) };
}

describe('the priority property (D07 Oncelik ozelligi)', () => {
  it('ranks any set of fitting reasons by class, then catalog order', () => {
    fc.assert(
      fc.property(fc.subarray([...FITTING_REASONS]), (subset) => {
        const fits = new Set(subset);
        expect(rankReasons(fits)).toEqual(expectedRanking(fits));
      }),
      { numRuns: 10_000 },
    );
  });

  it('has its ground: rejections, the last day and the empty set all occur', () => {
    expect(rankReasons(new Set())).toEqual({ reasonCode: null, extraReasons: [] });
    expect(
      rankReasons(new Set(['AFTER_LAST_DAY', 'OVERLAPPING_SESSION', 'SETTING_NOT_FINAL'])),
    ).toEqual({
      reasonCode: 'AFTER_LAST_DAY',
      extraReasons: ['SETTING_NOT_FINAL', 'OVERLAPPING_SESSION'],
    });
    expect(rankReasons(new Set(['AFTER_LAST_DAY', 'QR_DELAY_EXCEEDED']))).toEqual({
      reasonCode: 'QR_DELAY_EXCEEDED',
      extraReasons: ['AFTER_LAST_DAY'],
    });
  });
});

// Random records over every field the rule reads; the clocks and the shared limit
// counters are the table's own, and a counter is always read. A quiet record turns every
// rule off, so the shared limit and the plain present record are reached too.
const clocks = [...new Set(DECISION_TABLE.map((row) => row.facts.clock))];
const counters = [...new Set(DECISION_TABLE.flatMap((row) => row.facts.sharedLimitCounter ?? []))];
const around = fc.integer({
  min: PLAIN_RECORD.arrivedAtMs - DAY_MS,
  max: PLAIN_RECORD.arrivedAtMs + 40 * DAY_MS,
});
const qrArb: fc.Arbitrary<QrEvidence> = fc.oneof(
  fc.constant({ evidenceKind: 'NONE' } as const),
  fc.record({
    evidenceKind: fc.constantFrom('QR', 'BACKUP_CODE'),
    verification: fc.constantFrom(...QR_VERIFICATION_RESULTS.filter((value) => value !== 'NONE')),
    delay: fc.option(fc.constantFrom(...QR_DELAY_RESULTS), { nil: null }),
  }),
);
// Each rule is off three times in four, so records with few rules, every class among
// them, are common.
const mostly = <T>(usual: T, other: fc.Arbitrary<T>) =>
  fc.oneof({ arbitrary: fc.constant(usual), weight: 3 }, { arbitrary: other, weight: 1 });
const busyArb: fc.Arbitrary<Facts> = fc
  .record({
    nowMs: around,
    arrivedAtMs: around,
    lockAtMs: fc.option(around, { nil: null }),
    cancelled: mostly(false, fc.constant(true)),
    headCountEntered: fc.boolean(),
    qrClass: fc.boolean(),
    confirmation: mostly('confirmed' as const, fc.constantFrom('pending', 'rejected')),
    deletedAtMs: mostly(null, around),
    accountClosed: mostly(false, fc.constant(true)),
    onRoster: mostly(true, fc.constant(false)),
    notInClass: mostly(false, fc.constant(true)),
    overlappingSession: mostly(false, fc.constant(true)),
    device: fc.oneof(
      fc.record({ status: fc.constant('active' as const), openChangeRequest: fc.boolean() }),
      fc.constant({ status: 'change_pending' } as const),
      fc.record({
        status: fc.constant('closed' as const),
        closedAtMs: around,
        activated: fc.boolean(),
      }),
    ),
    verified: fc.boolean(),
    secondProfile: fc.boolean(),
    appAttestCounterOk: mostly(true, fc.constant(false)),
    clock: fc.constantFrom(...clocks),
    windowResult: mostly('INSIDE' as const, fc.constantFrom(...WINDOW_RESULTS)),
    windowChosenAtRecord: fc.boolean(),
    faultyVersion: mostly(false, fc.constant(true)),
    qr: qrArb,
    counter: fc.constantFrom(...counters),
  })
  .map((pick) => ({
    nowMs: pick.nowMs,
    arrivedAtMs: pick.arrivedAtMs,
    session: {
      ...PLAIN_RECORD.session,
      cancelled: pick.cancelled,
      lockAtMs: pick.lockAtMs,
      headCountEntered: pick.headCountEntered,
      qrClass: pick.qrClass,
    },
    student: {
      confirmation: pick.confirmation,
      deletedAtMs: pick.deletedAtMs,
      accountClosed: pick.accountClosed,
      onRoster: pick.onRoster,
      notInClassBy: pick.notInClass ? lecturer() : null,
      overlappingSession: pick.overlappingSession,
    },
    device: {
      ...pick.device,
      verified: pick.verified,
      secondProfile: pick.secondProfile,
      appAttestCounterOk: pick.appAttestCounterOk,
    },
    clock: pick.clock,
    window: { result: pick.windowResult, windowChosenAtRecord: pick.windowChosenAtRecord },
    faultyVersion: pick.faultyVersion,
    qr: pick.qr,
    sharedLimitCounter: pick.counter,
  }));
const quietArb: fc.Arbitrary<Facts> = fc
  .record({
    clock: fc.constantFrom(clockOf('VERIFIED'), clockOf('UNVERIFIED', 'NONE')),
    backupCode: fc.boolean(),
    counter: fc.constantFrom(...counters),
  })
  .map(({ clock, backupCode, counter }) => ({
    ...PLAIN_RECORD,
    clock,
    qr: backupCode
      ? { evidenceKind: 'BACKUP_CODE', verification: 'VALID', delay: 'NORMAL' }
      : PLAIN_RECORD.qr,
    sharedLimitCounter: counter,
  }));
const factsArb = fc.oneof({ arbitrary: busyArb, weight: 4 }, { arbitrary: quietArb, weight: 1 });

describe('decideRecord on random records', () => {
  it('reaches the shared limit, a plain present record and every class (ground control)', () => {
    const outcomes = fc.sample(factsArb, { numRuns: 5_000, seed: 1 }).map(decide);
    const count = (test: (outcome: (typeof outcomes)[number]) => boolean) =>
      outcomes.filter(test).length;
    expect(count((outcome) => outcome.sharedLimit?.spendsRight === true)).toBeGreaterThan(20);
    expect(count((outcome) => outcome.reasonCode === 'SHARED_LIMIT_EXCEEDED')).toBeGreaterThan(20);
    expect(count((outcome) => outcome.reasonCode === null)).toBeGreaterThan(20);
    for (const decision of DECISION_PRIORITY) {
      expect(count((outcome) => outcome.decision === decision)).toBeGreaterThan(20);
    }
  });

  it('gives a consistent outcome: the catalog class, the catalog order, no lecturer ruling', () => {
    fc.assert(
      fc.property(factsArb, (facts) => {
        const outcome = decide(facts);
        const { reasonCode, extraReasons } = outcome;
        const definition = reasonCode === null ? null : reasonDefinition(reasonCode);
        expect(outcome.decision).toBe(definition?.decision ?? 'PRESENT');
        expect(outcome.decisionSource).toBe(definition?.source ?? 'AUTOMATIC');
        expect(outcome.actorPersonId).toBe(
          reasonCode === 'NOT_IN_CLASS_AT_CHECK' ? facts.student.notInClassBy : null,
        );
        const given = [reasonCode, ...extraReasons];
        expect(given.every((code) => code === null || RULE_REASONS.includes(code))).toBe(true);
        expect(extraReasons.includes(reasonCode as DecisionReason)).toBe(false);
        const order = extraReasons.map(catalogIndex);
        expect(order).toEqual([...new Set(order)].sort((a, b) => a - b));
        // The shared limit decides exactly when nothing fits and a label sends it there.
        const shared = reasonCode !== null && SHARED_LIMIT_REASONS.includes(reasonCode);
        expect(outcome.sharedLimit !== null).toBe(shared);
        if (shared) expect(extraReasons).toEqual([]);
        expect(outcome.late).toBe(
          facts.arrivedAtMs >= sendWindowEndAtMs(facts.session.endAtMs, facts.session.lockAtMs),
        );
      }),
      { numRuns: 10_000 },
    );
  });

  it('lets a rejection win over any other rule', () => {
    fc.assert(
      fc.property(factsArb, (facts) => {
        const outcome = decide({ ...facts, student: { ...facts.student, onRoster: false } });
        expect(outcome.decision).toBe('REJECTED');
        expect([outcome.reasonCode, ...outcome.extraReasons]).toContain('NOT_ON_ROSTER');
      }),
      { numRuns: 10_000 },
    );
  });

  it('freezes a record that arrived after the last day in review unless it is rejected', () => {
    fc.assert(
      fc.property(factsArb, (facts) => {
        const lockAtMs = facts.arrivedAtMs;
        const outcome = decide({ ...facts, session: { ...facts.session, lockAtMs } });
        if (outcome.decision !== 'REJECTED') {
          expect(outcome).toMatchObject({ decision: 'IN_REVIEW', reasonCode: 'AFTER_LAST_DAY' });
        } else {
          expect(outcome.extraReasons).toContain('AFTER_LAST_DAY');
        }
      }),
      { numRuns: 10_000 },
    );
  });
});

describe('the rule reads no clock (D07 Kural saat okumaz)', () => {
  const zone = process.env.TZ;
  afterEach(() => {
    vi.useRealTimers();
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it('switches the system clock and the time zone for real (ground control)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000);
    expect(Date.now()).toBe(1_000);
    const hourAt = (tz: string) => {
      process.env.TZ = tz;
      return new Date(0).getHours();
    };
    expect(hourAt('UTC')).toBe(0);
    expect(hourAt('Europe/Istanbul')).toBe(2);
  });

  it('gives the same outcome under any system clock and time zone', () => {
    process.env.TZ = 'UTC';
    fc.assert(
      fc.property(
        factsArb,
        fc.integer({ min: 0, max: 4_102_444_800_000 }),
        fc.constantFrom('UTC', 'Europe/Istanbul', 'America/Los_Angeles', 'Pacific/Kiritimati'),
        (facts, systemMs, tz) => {
          vi.useRealTimers();
          process.env.TZ = 'UTC';
          const expected = decide(facts);
          vi.useFakeTimers({ toFake: ['Date'] });
          vi.setSystemTime(systemMs);
          process.env.TZ = tz;
          expect(decide(facts)).toEqual(expected);
        },
      ),
      { numRuns: 2_000 },
    );
  });
});
