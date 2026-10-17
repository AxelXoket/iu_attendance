import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { DECISION_PENDING_REASONS } from '../absence/decision-pending.ts';
import { COUNT_BASES, COURSE_RESULTS, TYPE_DECISIONS } from '../absence/types.ts';
import { PROVISIONAL_REASONS } from './codes.ts';
import { OUTPUT_STATES } from './output-state.ts';
import {
  SUMMARY_FORMAT_VERSION,
  type SummaryRow,
  type SummarySnapshot,
  type SummaryTypeValues,
  summaryContent,
  summaryDigest,
} from './summary-content.ts';

const ID = (last: string) => `0190b000-0000-7000-8000-${last.padStart(12, '0')}`;

// Three students: a tie on the roster order broken by the id (the later id arrives in upper
// case, so only the lower-case ids keep it second), an exempt student, a type with no held
// hours and both decision-pending reasons.
const SAMPLE: SummarySnapshot = {
  courseId: ID('1'),
  sectionId: ID('2'),
  courseCode: 'BİL101',
  courseName: 'Programlamaya Giriş',
  sectionLabel: 'A',
  trackingStart: '2026-09-21',
  lastHeldClassDay: '2027-01-08',
  countBase: 'HELD',
  theoryPercent: 70,
  practicePercent: 80,
  theoryScheduled: true,
  practiceScheduled: true,
  theoryMissingMakeupHours: 2,
  practiceMissingMakeupHours: 0,
  unansweredSessionCount: 1,
  provisionalReasons: [
    { code: 'DECISION_PENDING_STUDENT', count: 1 },
    { code: 'UNANSWERED_SESSIONS', count: 1 },
  ],
  rows: [
    {
      rosterRowId: ID('c').toUpperCase(),
      studentNumber: '2301234568',
      fullName: 'İlker Şahin',
      order: 2,
      source: 'SYSTEM',
      exempt: false,
      theory: {
        heldHours: 0,
        absentHours: 0,
        excusedHours: 0,
        attendedPerMille: null,
        decision: 'MET',
      },
      practice: {
        heldHours: 14,
        absentHours: 2,
        excusedHours: 0,
        attendedPerMille: 857,
        decision: 'MET',
      },
      result: 'MET',
      decisionPendingReasons: ['OPEN_FLAG', 'NO_CONNECTION'],
    },
    {
      rosterRowId: ID('a'),
      studentNumber: '2301234567',
      fullName: 'Ayşe Yılmaz',
      order: 2,
      source: 'FILE',
      exempt: false,
      theory: {
        heldHours: 42,
        absentHours: 6,
        excusedHours: 2,
        attendedPerMille: 857,
        decision: 'MET',
      },
      practice: {
        heldHours: 14,
        absentHours: 0,
        excusedHours: 0,
        attendedPerMille: 1000,
        decision: 'MET',
      },
      result: 'MET',
      decisionPendingReasons: [],
    },
    {
      rosterRowId: ID('b'),
      studentNumber: '230123456',
      fullName: 'Çağrı Öztürk',
      order: 1,
      source: 'MANUAL',
      exempt: true,
      theory: {
        heldHours: 42,
        absentHours: 20,
        excusedHours: 0,
        attendedPerMille: 523,
        decision: 'NOT_MET',
      },
      practice: {
        heldHours: 14,
        absentHours: 7,
        excusedHours: 0,
        attendedPerMille: 500,
        decision: 'NOT_MET',
      },
      result: 'MET_EXEMPT',
      decisionPendingReasons: [],
    },
  ],
};

// The golden texts, written by hand from D10-B29's field order, not produced by the code.
const GOLDEN = [
  '[1,"0190b000-0000-7000-8000-000000000001","0190b000-0000-7000-8000-000000000002","BİL101","Programlamaya Giriş","A","2026-09-21","2027-01-08","HELD",70,80,true,true,2,0,1,["DECISION_PENDING_STUDENT","UNANSWERED_SESSIONS"],[1,1],3]',
  '["0190b000-0000-7000-8000-00000000000b","230123456","Çağrı Öztürk",1,"MANUAL",true,42,20,0,523,"NOT_MET",14,7,0,500,"NOT_MET","MET_EXEMPT",[]]',
  '["0190b000-0000-7000-8000-00000000000a","2301234567","Ayşe Yılmaz",2,"FILE",false,42,6,2,857,"MET",14,0,0,1000,"MET","MET",[]]',
  '["0190b000-0000-7000-8000-00000000000c","2301234568","İlker Şahin",2,"SYSTEM",false,0,0,0,null,"MET",14,2,0,857,"MET","MET",["OPEN_FLAG","NO_CONNECTION"]]',
  '',
].join('\n');
// The second student's row once the retention period made it anonymous.
const ANONYMOUS_LINE =
  '["0190b000-0000-7000-8000-00000000000a",null,null,2,"FILE",false,42,6,2,857,"MET",14,0,0,1000,"MET","MET",[]]';

// A section without practice hours: every student's practice values are five nulls.
const NO_PRACTICE: SummarySnapshot = {
  ...SAMPLE,
  practiceScheduled: false,
  provisionalReasons: [],
  rows: SAMPLE.rows.slice(1).map((row) => ({ ...row, practice: null })),
};
const GOLDEN_NO_PRACTICE = [
  '[1,"0190b000-0000-7000-8000-000000000001","0190b000-0000-7000-8000-000000000002","BİL101","Programlamaya Giriş","A","2026-09-21","2027-01-08","HELD",70,80,true,false,2,0,1,[],[],2]',
  '["0190b000-0000-7000-8000-00000000000b","230123456","Çağrı Öztürk",1,"MANUAL",true,42,20,0,523,"NOT_MET",null,null,null,null,null,"MET_EXEMPT",[]]',
  '["0190b000-0000-7000-8000-00000000000a","2301234567","Ayşe Yılmaz",2,"FILE",false,42,6,2,857,"MET",null,null,null,null,null,"MET",[]]',
  '',
].join('\n');

const withRow = (index: number, change: Partial<SummaryRow>): SummarySnapshot => ({
  ...SAMPLE,
  rows: SAMPLE.rows.map((row, at) => (at === index ? { ...row, ...change } : row)),
});
type TypeName = 'theory' | 'practice';
const withType = (type: TypeName, change: Partial<SummaryTypeValues>) =>
  withRow(1, { [type]: { ...(SAMPLE.rows[1]?.[type] as SummaryTypeValues), ...change } });
// Format 1's text, which stays when a later format is added.
const content = (snapshot: SummarySnapshot) => summaryContent(snapshot, 1);
const BIG = Number.MAX_SAFE_INTEGER;

// One change per content field, each to another valid value.
const FIELD_CHANGES: readonly (readonly [string, SummarySnapshot])[] = [
  ['courseId', { ...SAMPLE, courseId: ID('9') }],
  ['sectionId', { ...SAMPLE, sectionId: ID('9') }],
  ['courseCode', { ...SAMPLE, courseCode: 'BİL102' }],
  ['courseName', { ...SAMPLE, courseName: 'Programlamaya giriş' }],
  ['sectionLabel', { ...SAMPLE, sectionLabel: 'B' }],
  ['trackingStart', { ...SAMPLE, trackingStart: null }],
  ['lastHeldClassDay', { ...SAMPLE, lastHeldClassDay: '2027-01-09' }],
  ['countBase', { ...SAMPLE, countBase: 'PLANNED' }],
  ['theoryPercent', { ...SAMPLE, theoryPercent: 71 }],
  ['practicePercent', { ...SAMPLE, practicePercent: 79 }],
  ['theoryScheduled', { ...SAMPLE, theoryScheduled: false }],
  ['practiceScheduled', { ...SAMPLE, practiceScheduled: false }],
  ['theoryMissingMakeupHours', { ...SAMPLE, theoryMissingMakeupHours: 3 }],
  ['practiceMissingMakeupHours', { ...SAMPLE, practiceMissingMakeupHours: 1 }],
  ['unansweredSessionCount', { ...SAMPLE, unansweredSessionCount: 0 }],
  [
    'provisional reason codes',
    {
      ...SAMPLE,
      provisionalReasons: [
        { code: 'DECISION_PENDING_STUDENT', count: 1 },
        { code: 'HEAD_COUNT_FLAG', count: 1 },
      ],
    },
  ],
  [
    'provisional reason counts',
    {
      ...SAMPLE,
      provisionalReasons: [
        { code: 'DECISION_PENDING_STUDENT', count: 1 },
        { code: 'UNANSWERED_SESSIONS', count: 2 },
      ],
    },
  ],
  ['student count', { ...SAMPLE, rows: SAMPLE.rows.slice(1) }],
  ['rosterRowId', withRow(0, { rosterRowId: ID('d') })],
  ['studentNumber', withRow(0, { studentNumber: '2301234569' })],
  ['fullName', withRow(0, { fullName: 'İlker Şahın' })],
  ['anonymous row', withRow(1, { studentNumber: null, fullName: null })],
  ['order', withRow(0, { order: 3 })],
  ['source', withRow(0, { source: 'FILE' })],
  ['exempt', withRow(0, { exempt: true })],
  ['theory heldHours', withType('theory', { heldHours: 40 })],
  ['theory absentHours', withType('theory', { absentHours: 5 })],
  ['theory excusedHours', withType('theory', { excusedHours: 3 })],
  ['theory attendedPerMille', withType('theory', { attendedPerMille: 858 })],
  ['theory decision', withType('theory', { decision: 'NOT_MET' })],
  ['theory present', withRow(1, { theory: null })],
  ['practice heldHours', withType('practice', { heldHours: 13 })],
  ['practice decision', withType('practice', { decision: 'NOT_MET' })],
  ['practice present', withRow(1, { practice: null })],
  ['result', withRow(1, { result: 'NOT_MET' })],
  ['decisionPendingReasons', withRow(1, { decisionPendingReasons: ['NO_CONNECTION'] })],
];

// Two texts, often close ones: another case, a space more at an end or inside.
const textArb = fc.string({ unit: 'grapheme', minLength: 1, maxLength: 30 });
const textPairArb: fc.Arbitrary<readonly [string, string]> = fc.oneof(
  fc.tuple(textArb, textArb),
  textArb.map((text) => [text, text.toUpperCase()] as const),
  textArb.map((text) => [text, text.toLocaleLowerCase('tr')] as const),
  textArb.map((text) => [text, `${text} `] as const),
  textArb.map((text) => [` ${text}`, text] as const),
  textArb.map((text) => [`${text} x`, `${text}  x`] as const),
);
const TEXT_FIELDS: readonly (readonly [string, (text: string) => SummarySnapshot])[] = [
  ['courseCode', (courseCode) => ({ ...SAMPLE, courseCode })],
  ['courseName', (courseName) => ({ ...SAMPLE, courseName })],
  ['sectionLabel', (sectionLabel) => ({ ...SAMPLE, sectionLabel })],
  ['fullName', (fullName) => withRow(1, { fullName })],
];
// Each number field with its range.
const NUMBER_FIELDS: readonly (readonly [
  string,
  number,
  number,
  (n: number) => SummarySnapshot,
])[] = [
  ['theoryPercent', 0, 100, (theoryPercent) => ({ ...SAMPLE, theoryPercent })],
  ['practicePercent', 0, 100, (practicePercent) => ({ ...SAMPLE, practicePercent })],
  ['theoryMissingMakeupHours', 0, BIG, (hours) => ({ ...SAMPLE, theoryMissingMakeupHours: hours })],
  [
    'practiceMissingMakeupHours',
    0,
    BIG,
    (hours) => ({ ...SAMPLE, practiceMissingMakeupHours: hours }),
  ],
  ['unansweredSessionCount', 0, BIG, (count) => ({ ...SAMPLE, unansweredSessionCount: count })],
  [
    'provisional reason count',
    1,
    BIG,
    (count) => ({ ...SAMPLE, provisionalReasons: [{ code: 'UNANSWERED_SESSIONS', count }] }),
  ],
  ['order', 1, BIG, (order) => withRow(1, { order })],
  ...(['theory', 'practice'] as const).flatMap((type) => [
    [`${type} heldHours`, 0, BIG, (heldHours: number) => withType(type, { heldHours })] as const,
    [
      `${type} absentHours`,
      0,
      BIG,
      (absent: number) => withType(type, { absentHours: absent }),
    ] as const,
    [
      `${type} excusedHours`,
      0,
      BIG,
      (excused: number) => withType(type, { excusedHours: excused }),
    ] as const,
    [
      `${type} attendedPerMille`,
      0,
      1000,
      (perMille: number) => withType(type, { attendedPerMille: perMille }),
    ] as const,
  ]),
];

// What the summary answer carries beside the content; none of it reaches the digest.
const outsideArb = fc.record({
  preparedAt: fc.date({ noInvalidDate: true }),
  computedAt: fc.date({ noInvalidDate: true }),
  takenAt: fc.date({ noInvalidDate: true }),
  output: fc.record({
    state: fc.constantFrom(...OUTPUT_STATES),
    snapshotAllowed: fc.boolean(),
  }),
  baseline: fc.option(fc.record({ snapshotId: fc.uuid() })),
  uncountedAfterLock: fc.nat(),
  lockApplied: fc.boolean(),
  lockAt: fc.option(fc.date({ noInvalidDate: true })),
  lastDay: fc.option(fc.constant('2027-02-01')),
  lastSessionEndAt: fc.option(fc.date({ noInvalidDate: true })),
  sendingTimeRunningSessions: fc.nat(),
  unansweredSessions: fc.array(fc.record({ sessionId: fc.uuid() }), { maxLength: 3 }),
  ratesConfirmed: fc.boolean(),
});

describe('Kanonik özet içeriği kararlıdır (the canonical summary content is stable)', () => {
  it('writes the sample byte for byte as the golden text', () => {
    const text = content(SAMPLE);
    expect(text).toBe(GOLDEN);
    expect(Buffer.from(text, 'utf8').equals(Buffer.from(GOLDEN, 'utf8'))).toBe(true);
    expect(Buffer.from(summaryDigest(SAMPLE, 1)).toString('hex')).toBe(
      createHash('sha256').update(GOLDEN, 'utf8').digest('hex'),
    );
    expect(summaryDigest(SAMPLE, 1)).toHaveLength(32);
    expect(content(NO_PRACTICE)).toBe(GOLDEN_NO_PRACTICE);
    // A new snapshot is written with a format the builders know.
    expect(() => summaryContent(SAMPLE, SUMMARY_FORMAT_VERSION)).not.toThrow();
  });

  it('writes an anonymous row with no number and no name', () => {
    const lines = content(withRow(1, { studentNumber: null, fullName: null })).split('\n');
    expect(lines[2]).toBe(ANONYMOUS_LINE);
    // Ground control: every other line is the golden one.
    const golden = GOLDEN.split('\n');
    expect(lines.filter((_, at) => at !== 2)).toEqual(golden.filter((_, at) => at !== 2));
  });

  it('writes the same text under any time zone', () => {
    const zone = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Europe/Istanbul', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
        process.env.TZ = tz;
        expect(content(SAMPLE), tz).toBe(GOLDEN);
      }
      // Ground control: the zone switch is real.
      process.env.TZ = 'UTC';
      expect(new Date(0).getHours()).toBe(0);
      process.env.TZ = 'Europe/Istanbul';
      expect(new Date(0).getHours()).toBe(2);
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  it('writes the same text whatever the locale functions do', () => {
    function broken(): never {
      throw new Error('locale used');
    }
    vi.spyOn(String.prototype, 'localeCompare').mockImplementation(broken);
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(broken);
    vi.spyOn(String.prototype, 'toLocaleUpperCase').mockImplementation(broken);
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(broken);
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(broken);
    vi.spyOn(Intl, 'Collator').mockImplementation(broken as never);
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(broken as never);
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(broken as never);
    try {
      expect(content(SAMPLE)).toBe(GOLDEN);
      expect(content(NO_PRACTICE)).toBe(GOLDEN_NO_PRACTICE);
      // Ground control: the locale functions are broken for real.
      expect(() => 'a'.localeCompare('b')).toThrow('locale used');
      expect(() => new Intl.Collator('tr')).toThrow('locale used');
      expect(() => (1).toLocaleString('tr')).toThrow('locale used');
    } finally {
      vi.restoreAllMocks();
    }
    expect('a'.localeCompare('b')).toBe(-1);
  });

  it('changes with every content field', () => {
    const base = Buffer.from(summaryDigest(SAMPLE, 1)).toString('hex');
    for (const [field, changed] of FIELD_CHANGES) {
      expect(Buffer.from(summaryDigest(changed, 1)).toString('hex'), field).not.toBe(base);
    }
  });

  it('gives two texts of a text field that differ after NFC two contents', () => {
    for (const [field, set] of TEXT_FIELDS) {
      fc.assert(
        fc.property(textPairArb, ([a, b]) => {
          fc.pre(a.normalize('NFC') !== b.normalize('NFC'));
          expect(content(set(a)), field).not.toBe(content(set(b)));
        }),
        {
          numRuns: 1000,
          examples: [[['a', 'A']], [['Giriş ', 'Giriş']], [['a  b', 'a b']], [['ı', 'I']]],
        },
      );
    }
  });

  it('gives two numbers of a number field two contents, and two student numbers too', () => {
    for (const [field, min, max, set] of NUMBER_FIELDS) {
      fc.assert(
        fc.property(fc.integer({ min, max }), fc.integer({ min, max }), (a, b) => {
          fc.pre(a !== b);
          expect(content(set(a)), field).not.toBe(content(set(b)));
        }),
        {
          numRuns: 1000,
          examples: [
            [min, min + 1],
            [max - 1, max],
          ],
        },
      );
    }
    const numberArb = fc.stringMatching(/^[0-9]{9,10}$/);
    fc.assert(
      fc.property(numberArb, numberArb, (a, b) => {
        fc.pre(a !== b);
        expect(content(withRow(1, { studentNumber: a }))).not.toBe(
          content(withRow(1, { studentNumber: b })),
        );
      }),
      { numRuns: 1000, examples: [['230123456', '0230123456']] },
    );
  });

  it('gives every code of a list its own content', () => {
    const [first, second] = DECISION_PENDING_REASONS;
    const codeFields: readonly (readonly [string, readonly SummarySnapshot[]])[] = [
      ['countBase', COUNT_BASES.map((countBase) => ({ ...SAMPLE, countBase }))],
      ['theory decision', TYPE_DECISIONS.map((decision) => withType('theory', { decision }))],
      ['practice decision', TYPE_DECISIONS.map((decision) => withType('practice', { decision }))],
      ['result', COURSE_RESULTS.map((result) => withRow(1, { result }))],
      [
        'decisionPendingReasons',
        [[], [first], [second], [first, second]].map((reasons) =>
          withRow(1, { decisionPendingReasons: reasons }),
        ),
      ],
      ['source', ['FILE', 'MANUAL', 'SYSTEM'].map((source) => withRow(1, { source }))],
      [
        'provisional reasons',
        PROVISIONAL_REASONS.map((code) => ({
          ...SAMPLE,
          provisionalReasons: [{ code, count: 1 }],
        })),
      ],
    ];
    for (const [field, snapshots] of codeFields) {
      expect(new Set(snapshots.map(content)).size, field).toBe(snapshots.length);
    }
  });

  it('ignores every field outside the content and the order the rows come in', () => {
    fc.assert(
      fc.property(
        outsideArb,
        fc.record({ attendedHours: fc.nat(), retentionExpired: fc.boolean() }),
        fc.shuffledSubarray([0, 1, 2], { minLength: 3, maxLength: 3 }),
        (outside, rowOutside, arrival) => {
          const rows = arrival.map(
            (index) => ({ ...SAMPLE.rows[index], ...rowOutside }) as SummaryRow,
          );
          const answer: SummarySnapshot = { ...SAMPLE, ...outside, rows };
          expect(content(answer)).toBe(GOLDEN);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('gives one content for a name written NFC or NFD', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 30 }), (name) => {
        const decomposed = withRow(0, { fullName: `${name}İş`.normalize('NFD') });
        const composed = withRow(0, { fullName: `${name}İş`.normalize('NFC') });
        expect(content(decomposed)).toBe(content(composed));
        const code = { ...SAMPLE, courseName: `Gİ${name}`.normalize('NFD') };
        expect(content(code)).toBe(
          content({ ...SAMPLE, courseName: `Gİ${name}`.normalize('NFC') }),
        );
      }),
      { numRuns: 1000 },
    );
    // Ground control: the two forms differ as JavaScript text.
    expect('İş'.normalize('NFD')).not.toBe('İş'.normalize('NFC'));
    // NFC, not NFKC: a ligature and a full-width digit are kept as typed.
    expect(content(withRow(0, { fullName: 'Deﬁne Ｓ２' }))).toContain('"Deﬁne Ｓ２"');
  });

  it('rebuilds with the given format only and rejects values the tables cannot store', () => {
    expect(() => summaryContent(SAMPLE, 2)).toThrow(RangeError);
    expect(() => summaryContent(SAMPLE, 0)).toThrow(RangeError);
    const reasons = (...list: [string, number][]) =>
      list.map(([code, count]) => ({ code, count })) as SummarySnapshot['provisionalReasons'];
    const bad: readonly (readonly [string, SummarySnapshot])[] = [
      ['course id', { ...SAMPLE, courseId: 'not-a-uuid' }],
      ['section id', { ...SAMPLE, sectionId: ID('2').slice(1) }],
      ['course code', { ...SAMPLE, courseCode: '' }],
      ['course name', { ...SAMPLE, courseName: '' }],
      ['section label', { ...SAMPLE, sectionLabel: '' }],
      ['tracking start', { ...SAMPLE, trackingStart: '2026-02-30' }],
      ['last held day', { ...SAMPLE, lastHeldClassDay: '2027-1-8' }],
      ['count base', { ...SAMPLE, countBase: 'PLANED' as 'HELD' }],
      ['count base in Turkish', { ...SAMPLE, countBase: 'YAPILAN' as 'HELD' }],
      ['theory percent fraction', { ...SAMPLE, theoryPercent: 70.5 }],
      ['theory percent past 100', { ...SAMPLE, theoryPercent: 101 }],
      ['practice percent under 0', { ...SAMPLE, practicePercent: -1 }],
      ['theory make-up hours', { ...SAMPLE, theoryMissingMakeupHours: -1 }],
      ['practice make-up hours', { ...SAMPLE, practiceMissingMakeupHours: 0.5 }],
      ['unanswered count NaN', { ...SAMPLE, unansweredSessionCount: Number.NaN }],
      ['unanswered count 2^53', { ...SAMPLE, unansweredSessionCount: 2 ** 53 }],
      ['reason code', { ...SAMPLE, provisionalReasons: reasons(['ZZZ', 1]) }],
      [
        'reasons out of order',
        {
          ...SAMPLE,
          provisionalReasons: reasons(['UNANSWERED_SESSIONS', 1], ['DECISION_PENDING_STUDENT', 1]),
        },
      ],
      [
        'reason twice',
        {
          ...SAMPLE,
          provisionalReasons: reasons(['UNANSWERED_SESSIONS', 1], ['UNANSWERED_SESSIONS', 1]),
        },
      ],
      ['reason count 0', { ...SAMPLE, provisionalReasons: reasons(['UNANSWERED_SESSIONS', 0]) }],
      [
        'reason count fraction',
        { ...SAMPLE, provisionalReasons: reasons(['HEAD_COUNT_FLAG', 1.5]) },
      ],
      ['reason count 1e21', { ...SAMPLE, provisionalReasons: reasons(['HEAD_COUNT_FLAG', 1e21]) }],
      ['row id', withRow(0, { rosterRowId: '' })],
      ['student number short', withRow(0, { studentNumber: '12345678' })],
      ['student number digits', withRow(0, { studentNumber: '٢٣٠١٢٣٤٥٦٧' })],
      ['roster order NaN', withRow(0, { order: Number.NaN })],
      ['roster order 0', withRow(0, { order: 0 })],
      ['source', withRow(0, { source: 'file' })],
      ['held hours', withType('theory', { heldHours: -1 })],
      ['held hours 1e21', withType('practice', { heldHours: 1e21 })],
      ['absent hours', withType('practice', { absentHours: 0.5 })],
      ['excused hours', withType('theory', { excusedHours: -1 })],
      ['per mille infinite', withType('theory', { attendedPerMille: Number.POSITIVE_INFINITY })],
      ['per mille past 1000', withType('practice', { attendedPerMille: 1001 })],
      ['per mille under 0', withType('theory', { attendedPerMille: -1 })],
      ['type decision exempt', withType('theory', { decision: 'MET_EXEMPT' as 'MET' })],
      ['type decision in Turkish', withType('practice', { decision: 'DEVAMLI' as 'MET' })],
      ['result', withRow(1, { result: 'XYZ' as 'MET' })],
      ['pending reason', withRow(1, { decisionPendingReasons: ['ZZZ' as 'OPEN_FLAG'] })],
      [
        'pending reasons out of order',
        withRow(0, { decisionPendingReasons: ['NO_CONNECTION', 'OPEN_FLAG'] }),
      ],
      ['pending reason twice', withRow(0, { decisionPendingReasons: ['OPEN_FLAG', 'OPEN_FLAG'] })],
    ];
    for (const [what, snapshot] of bad) {
      expect(() => content(snapshot), what).toThrow(RangeError);
    }
    // Ground control: the sample and the edges of every range are written.
    expect(content(SAMPLE)).toBe(GOLDEN);
    const edges: readonly SummarySnapshot[] = [
      { ...SAMPLE, theoryPercent: 0, practicePercent: 100 },
      { ...SAMPLE, provisionalReasons: PROVISIONAL_REASONS.map((code) => ({ code, count: 1 })) },
      withRow(1, { order: 1 }),
      withType('theory', { attendedPerMille: 0 }),
      withType('practice', { heldHours: 0, absentHours: 0, attendedPerMille: null }),
    ];
    for (const snapshot of edges) expect(() => content(snapshot)).not.toThrow();
    expect(content({ ...SAMPLE, unansweredSessionCount: BIG })).toContain(`,${BIG},`);
    // An id in upper case is the same id.
    expect(content({ ...SAMPLE, sectionId: ID('2').toUpperCase() })).toBe(GOLDEN);
  });
});
