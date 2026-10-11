import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyDownloadPage,
  BACKOFF_MAX_MS,
  BACKOFF_MIN_MS,
  BATCH_ITEMS_FIELD,
  BATCH_MAX_BYTES,
  BATCH_MAX_ITEMS,
  type BatchChoice,
  backoffDelayMs,
  classifySubmitResponse,
  cursorToSend,
  downloadFailureClearsLists,
  FIRST_SEND_MAX_SECONDS,
  firstSendDelayMs,
  type InstallationQueue,
  LOCAL_REJECTS_MAX,
  localRejectEntry,
  observeLastSequence,
  type QueueItem,
  type QueueItemState,
  rewindItem,
  type SubmitResponse,
  selectBatch,
  splitStep,
  versionChangeItem,
} from './protocol.ts';

const KIB = 1024;
const NOW = 1_000_000;
const idle: InstallationQueue = { waitUntilMs: 0, stopped: false, sending: false };
const states: QueueItemState[] = ['WAITING', 'ARRIVED', 'REJECTED', 'LOCAL_REJECT'];

// A queue of one installation: sequences 1..n, random states, sizes and retry times.
const queueArb = fc
  .array(
    fc.record({
      state: fc.constantFrom(...states, 'WAITING', 'WAITING'),
      sizeBytes: fc.oneof(
        fc.integer({ min: 1, max: 2 * KIB }),
        fc.integer({ min: 1, max: 120 * KIB }),
      ),
      answered: fc.boolean(),
      retryOffset: fc.option(fc.integer({ min: -5000, max: 5000 }), { nil: null }),
    }),
    // size 'max' lets lengths reach 400, past the 200-item limit; the default stays short.
    { maxLength: 400, size: 'max' },
  )
  .map((list) =>
    list.map(
      (item, index): QueueItem => ({
        sequence: index + 1,
        state: item.state,
        sizeBytes: item.sizeBytes,
        answered: item.answered,
        retryAtMs: item.answered && item.retryOffset !== null ? NOW + item.retryOffset : null,
      }),
    ),
  );

const isCandidate = (item: QueueItem) =>
  item.state === 'WAITING' && !(item.answered && item.retryAtMs !== null && NOW < item.retryAtMs);

describe('batch selection', () => {
  it('takes waiting items in order without skipping an unanswered one, within 200 items and 768 KiB', () => {
    let full = 0;
    let skippedAnswered = 0;
    fc.assert(
      fc.property(queueArb, fc.boolean(), (queue, shuffle) => {
        const input = shuffle ? [...queue].reverse() : queue;
        const choice = selectBatch(input, idle, NOW);
        const bySequence = new Map(queue.map((item) => [item.sequence, item]));
        const localRejects = queue
          .filter((item) => item.state === 'LOCAL_REJECT' && !item.answered)
          .map((item) => item.sequence)
          .slice(0, LOCAL_REJECTS_MAX);
        const candidates = queue.filter(isCandidate);
        if (candidates.length === 0 && localRejects.length === 0) {
          expect(choice).toBeNull();
          return;
        }
        expect(choice).not.toBeNull();
        const items = choice?.items ?? [];
        expect(choice?.localRejects).toEqual(localRejects);
        // Ascending, waiting only, never an arrived item.
        expect(items).toEqual([...items].sort((a, b) => a - b));
        for (const sequence of items) expect(bySequence.get(sequence)?.state).toBe('WAITING');
        expect(items.length).toBeLessThanOrEqual(BATCH_MAX_ITEMS);
        const bytes = items.reduce((sum, s) => sum + (bySequence.get(s)?.sizeBytes ?? 0), 0);
        if (items.length > 1) expect(bytes).toBeLessThanOrEqual(BATCH_MAX_BYTES);
        // The batch is a prefix of the candidates: nothing that may go is skipped.
        expect(items).toEqual(candidates.slice(0, items.length).map((item) => item.sequence));
        // And it is as long as the limits allow.
        const next = candidates[items.length];
        if (next !== undefined) {
          const tooMany = items.length >= BATCH_MAX_ITEMS;
          const tooBig = bytes + next.sizeBytes > BATCH_MAX_BYTES;
          expect(tooMany || tooBig).toBe(true);
          full += 1;
        }
        if (queue.some((item) => item.state === 'WAITING' && !isCandidate(item)))
          skippedAnswered += 1;
      }),
      { numRuns: 500 },
    );
    // Ground control: limits and skipped answered items both happen.
    expect(full).toBeGreaterThan(50);
    expect(skippedAnswered).toBeGreaterThan(50);
  });

  it('sends one oversized item alone rather than block the queue', () => {
    const big: QueueItem = {
      sequence: 1,
      state: 'WAITING',
      sizeBytes: 2 * BATCH_MAX_BYTES,
      answered: false,
      retryAtMs: null,
    };
    const small: QueueItem = {
      sequence: 2,
      state: 'WAITING',
      sizeBytes: 10,
      answered: false,
      retryAtMs: null,
    };
    expect(selectBatch([big, small], idle, NOW)).toEqual({ items: [1], localRejects: [] });
  });

  it('sends nothing while the installation waits, is stopped or has a batch in flight', () => {
    const waiting: QueueItem = {
      sequence: 1,
      state: 'WAITING',
      sizeBytes: 10,
      answered: false,
      retryAtMs: null,
    };
    expect(selectBatch([waiting], { ...idle, waitUntilMs: NOW + 1 }, NOW)).toBeNull();
    expect(selectBatch([waiting], { ...idle, stopped: true }, NOW)).toBeNull();
    expect(selectBatch([waiting], { ...idle, sending: true }, NOW)).toBeNull();
    const sending: QueueItem = { ...waiting, sequence: 2, state: 'SENDING' };
    expect(selectBatch([waiting, sending], idle, NOW)).toBeNull();
    // Ground control: the same queue goes once the wait is over.
    expect(selectBatch([waiting], { ...idle, waitUntilMs: NOW }, NOW)).toEqual({
      items: [1],
      localRejects: [],
    });
  });

  it('does not send a batch of local rejects again while it is in flight', () => {
    const reject: QueueItem = {
      sequence: 3,
      state: 'LOCAL_REJECT',
      sizeBytes: 10,
      answered: false,
      retryAtMs: null,
    };
    expect(selectBatch([reject], idle, NOW)).toEqual({ items: [], localRejects: [3] });
    // No item is SENDING in such a batch; the installation's own flag holds it back.
    expect(selectBatch([reject], { ...idle, sending: true }, NOW)).toBeNull();
  });

  it('keeps the item waits through a batch-level failure: only the installation waits', () => {
    fc.assert(
      fc.property(
        queueArb,
        fc.nat({ max: 12 }),
        fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }),
        (queue, attempt, random) => {
          const outcome = classifySubmitResponse(
            { kind: 'NETWORK_ERROR' },
            { items: [1], localRejects: [] },
          );
          expect(outcome.kind).toBe('INSTALLATION_WAIT');
          const waitUntilMs = NOW + backoffDelayMs(attempt, random);
          expect(selectBatch(queue, { ...idle, waitUntilMs }, NOW)).toBeNull();
          // The items themselves did not change, so after the wait the same batch goes.
          expect(selectBatch(queue, { ...idle, waitUntilMs }, waitUntilMs)).toEqual(
            selectBatch(queue, idle, waitUntilMs),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('stops at 200 small items, the count limit, before the byte limit', () => {
    const small = Array.from(
      { length: 250 },
      (_, index): QueueItem => ({
        sequence: index + 1,
        state: 'WAITING',
        sizeBytes: KIB,
        answered: false,
        retryAtMs: null,
      }),
    );
    const choice = selectBatch(small, idle, NOW);
    expect(choice?.items).toHaveLength(BATCH_MAX_ITEMS);
    expect(choice?.items.at(-1)).toBe(200);
  });

  it('caps the local rejects at 200', () => {
    const rejects = Array.from(
      { length: 250 },
      (_, index): QueueItem => ({
        sequence: index + 1,
        state: 'LOCAL_REJECT',
        sizeBytes: 10,
        answered: false,
        retryAtMs: null,
      }),
    );
    const choice = selectBatch(rejects, idle, NOW);
    expect(choice?.items).toEqual([]);
    expect(choice?.localRejects).toHaveLength(200);
    expect(choice?.localRejects[199]).toBe(200);
  });
});

describe('waits', () => {
  const unit = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });

  it('backs off between 2 seconds and 10 minutes, at least the wait the server asked for', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 40 }),
        unit,
        fc.option(fc.integer({ min: 0, max: 3600 }), { nil: null }),
        (attempt, random, server) => {
          const delay = backoffDelayMs(attempt, random, server);
          const serverMs = (server ?? 0) * 1000;
          expect(delay).toBeGreaterThanOrEqual(Math.max(BACKOFF_MIN_MS, serverMs));
          // Under 10 minutes whenever the server wait leaves 2 seconds of room.
          expect(delay).toBeLessThan(Math.max(BACKOFF_MAX_MS, serverMs + BACKOFF_MIN_MS));
          expect(Number.isSafeInteger(delay)).toBe(true);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('spreads every try, the first one included, and grows the ceiling up to 10 minutes', () => {
    const top = (attempt: number) => backoffDelayMs(attempt, 0.999999);
    // The first retry already spreads over [2 s, 4 s): phones that failed together part.
    expect(backoffDelayMs(0, 0)).toBe(BACKOFF_MIN_MS);
    expect(top(0)).toBeGreaterThan(3990);
    expect(top(0)).toBeLessThan(4000);
    // The ceiling doubles each try: 4 s, 8 s, 16 s and so on, up to 10 minutes.
    expect(top(1)).toBeGreaterThan(7990);
    expect(top(1)).toBeLessThan(8000);
    expect(top(2)).toBeGreaterThan(15990);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect(top(attempt + 1)).toBeGreaterThanOrEqual(top(attempt));
    }
    expect(top(30)).toBeGreaterThan(BACKOFF_MAX_MS - 10);
    expect(top(30)).toBeLessThan(BACKOFF_MAX_MS);
    // A short server wait keeps the spread under 10 minutes.
    expect(backoffDelayMs(9, 0.999, 5)).toBeLessThan(BACKOFF_MAX_MS);
  });

  it('honours a long server wait with a small spread above it', () => {
    expect(backoffDelayMs(0, 0, 3600)).toBe(3600 * 1000);
    expect(backoffDelayMs(0, 0.999999, 3600)).toBeLessThan(3600 * 1000 + BACKOFF_MIN_MS);
  });

  it('treats a server wait that is not a number from 0 as none, and one over a day as a day', () => {
    expect(backoffDelayMs(0, 0, -3)).toBe(BACKOFF_MIN_MS);
    expect(backoffDelayMs(0, 0, Number.NaN)).toBe(BACKOFF_MIN_MS);
    expect(backoffDelayMs(0, 0, 100000)).toBe(86400 * 1000);
    expect(backoffDelayMs(0, 0, Number.POSITIVE_INFINITY)).toBe(86400 * 1000);
  });

  it('delays the first send by 0 to N seconds', () => {
    fc.assert(
      fc.property(unit, (random) => {
        const delay = firstSendDelayMs(random);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThan(FIRST_SEND_MAX_SECONDS * 1000);
      }),
      { numRuns: 1000 },
    );
    expect(FIRST_SEND_MAX_SECONDS).toBe(10);
    expect(firstSendDelayMs(0.5, 20)).toBe(10000);
  });

  it.each([-0.1, 1, Number.NaN])('refuses a random value of %s', (random) => {
    expect(() => backoffDelayMs(0, random)).toThrow(RangeError);
    expect(() => firstSendDelayMs(random)).toThrow(RangeError);
  });

  it('refuses an attempt that is not a whole number from 0', () => {
    expect(() => backoffDelayMs(-1, 0)).toThrow(RangeError);
    expect(() => backoffDelayMs(1.5, 0)).toThrow(RangeError);
    expect(() => firstSendDelayMs(0, -1)).toThrow(RangeError);
  });
});

// An answer from the API: its body passed the schema for the status (results or error envelope).
const http = (
  status: number,
  extra: Partial<Extract<SubmitResponse, { kind: 'HTTP' }>> = {},
): SubmitResponse => ({
  kind: 'HTTP',
  status,
  bodyValid: true,
  fieldPath: null,
  retryAfterSeconds: null,
  ...extra,
});
const batchOfTwo: BatchChoice = { items: [1, 2], localRejects: [] };

describe('specification numbers', () => {
  // Written out on purpose: these are the specification's numbers (D06 phone contract T1,
  // T3, T5, T6 and the request schema), not values derived from the code.
  it('keeps the limits and waits the specification names', () => {
    expect(BATCH_MAX_ITEMS).toBe(200);
    expect(BATCH_MAX_BYTES).toBe(768 * 1024);
    expect(LOCAL_REJECTS_MAX).toBe(200);
    expect(BACKOFF_MIN_MS).toBe(2000);
    expect(BACKOFF_MAX_MS).toBe(600000);
    expect(FIRST_SEND_MAX_SECONDS).toBe(10);
    expect(BATCH_ITEMS_FIELD).toBe('items');
  });
});

describe('response classes', () => {
  it.each<[string, SubmitResponse, string]>([
    ['200 with a valid body', http(200), 'RESULTS'],
    [
      '200 with a body that is not the answer (a captive portal)',
      http(200, { bodyValid: false }),
      'INSTALLATION_WAIT',
    ],
    ['a network error or timeout', { kind: 'NETWORK_ERROR' }, 'INSTALLATION_WAIT'],
    ['408', http(408), 'INSTALLATION_WAIT'],
    ['429', http(429), 'INSTALLATION_WAIT'],
    ['500', http(500), 'INSTALLATION_WAIT'],
    ['503', http(503), 'INSTALLATION_WAIT'],
    ['302', http(302), 'INSTALLATION_WAIT'],
    ['201', http(201), 'INSTALLATION_WAIT'],
    ['413', http(413), 'SPLIT'],
    [
      '400 pointing into the items',
      http(400, { fieldPath: [BATCH_ITEMS_FIELD, 3, 'type'] }),
      'SPLIT',
    ],
    ['400 about the item count', http(400, { fieldPath: [BATCH_ITEMS_FIELD] }), 'SPLIT'],
    ['400 about the batch id', http(400, { fieldPath: ['batchId'] }), 'STOP'],
    ['400 without a field path', http(400), 'STOP'],
    ['401', http(401), 'STOP'],
    ['403', http(403), 'STOP'],
    ['404', http(404), 'STOP'],
    ['422', http(422), 'STOP'],
    // The same statuses from a captive portal, a proxy or a firewall: not the API's envelope.
    [
      'a 400 that is not the API error envelope',
      http(400, { bodyValid: false, fieldPath: [BATCH_ITEMS_FIELD] }),
      'INSTALLATION_WAIT',
    ],
    [
      'a 401 that is not the API error envelope',
      http(401, { bodyValid: false }),
      'INSTALLATION_WAIT',
    ],
    [
      'a 403 that is not the API error envelope',
      http(403, { bodyValid: false }),
      'INSTALLATION_WAIT',
    ],
    [
      'a 404 that is not the API error envelope',
      http(404, { bodyValid: false }),
      'INSTALLATION_WAIT',
    ],
    ['a 407 from a proxy', http(407, { bodyValid: false }), 'INSTALLATION_WAIT'],
    ['a 413 from a proxy', http(413, { bodyValid: false }), 'SPLIT'],
  ])('treats %s as %s', (_name, response, kind) => {
    expect(classifySubmitResponse(response, batchOfTwo).kind).toBe(kind);
  });

  it('names why sending stopped and carries the server wait', () => {
    expect(classifySubmitResponse(http(401), batchOfTwo)).toEqual({
      kind: 'STOP',
      reason: 'UNAUTHORIZED',
    });
    expect(classifySubmitResponse(http(403), batchOfTwo)).toEqual({
      kind: 'STOP',
      reason: 'FORBIDDEN',
    });
    expect(classifySubmitResponse(http(409), batchOfTwo)).toEqual({
      kind: 'STOP',
      reason: 'CLIENT_ERROR',
    });
    expect(classifySubmitResponse(http(503, { retryAfterSeconds: 5 }), batchOfTwo)).toEqual({
      kind: 'INSTALLATION_WAIT',
      serverWaitSeconds: 5,
    });
    expect(classifySubmitResponse(http(429, { retryAfterSeconds: 30 }), batchOfTwo)).toEqual({
      kind: 'INSTALLATION_WAIT',
      serverWaitSeconds: 30,
    });
  });

  it.each<[string, number, number | null]>([
    ['a negative Retry-After (an HTTP date read on a skewed clock)', -3, null],
    ['a Retry-After that is not a number', Number.NaN, null],
    ['a Retry-After over a day', 100000, 86400],
    ['a Retry-After of 0', 0, 0],
  ])('reads %s safely', (_name, retryAfterSeconds, expected) => {
    const outcome = classifySubmitResponse(http(503, { retryAfterSeconds }), batchOfTwo);
    expect(outcome).toEqual({ kind: 'INSTALLATION_WAIT', serverWaitSeconds: expected });
    // And the wait it gives never throws.
    expect(() => backoffDelayMs(0, 0.5, expected)).not.toThrow();
  });

  it('waits instead of splitting a batch that holds only local rejects', () => {
    const rejectsOnly: BatchChoice = { items: [], localRejects: [3] };
    expect(classifySubmitResponse(http(413), rejectsOnly)).toEqual({
      kind: 'INSTALLATION_WAIT',
      serverWaitSeconds: null,
    });
    expect(
      classifySubmitResponse(http(400, { fieldPath: [BATCH_ITEMS_FIELD] }), rejectsOnly),
    ).toEqual({ kind: 'INSTALLATION_WAIT', serverWaitSeconds: null });
    // Ground control: the same answers split a batch with items.
    expect(classifySubmitResponse(http(413), batchOfTwo)).toEqual({ kind: 'SPLIT' });
  });

  it('clears the staff lists only on a 401 from the API', () => {
    expect(downloadFailureClearsLists(401, 'STAFF', true)).toBe(true);
    expect(downloadFailureClearsLists(401, 'STAFF', false)).toBe(false);
    expect(downloadFailureClearsLists(403, 'STAFF', true)).toBe(false);
    expect(downloadFailureClearsLists(500, 'STAFF', true)).toBe(false);
    expect(downloadFailureClearsLists(401, 'STUDENT', true)).toBe(false);
  });
});

describe('splitting', () => {
  it('finds every bad item with at most 2n - 1 requests, left half first', () => {
    let splits = 0;
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.array(fc.nat(), { maxLength: 6 }),
        fc.boolean(),
        (count, badPicks, use400) => {
          const all = Array.from({ length: count }, (_, index) => index + 1);
          const bad = new Set(badPicks.map((pick) => (pick % count) + 1));
          let pending: readonly BatchChoice[] = [{ items: all, localRejects: [7] }];
          const answered: number[] = [];
          const localRejects: number[] = [];
          let requests = 0;
          while (pending.length > 0) {
            const [batch, ...rest] = pending as [BatchChoice, ...BatchChoice[]];
            pending = rest;
            requests += 1;
            // Checked inside the loop, so a split that never ends fails instead of hanging.
            expect(requests).toBeLessThanOrEqual(2 * count - 1);
            if (requests > 1) expect(batch.localRejects).toEqual([]);
            const hasBad = batch.items.some((sequence) => bad.has(sequence));
            const response = hasBad
              ? use400
                ? http(400, { fieldPath: [BATCH_ITEMS_FIELD, 0, 'body'] })
                : http(413)
              : http(200);
            const outcome = classifySubmitResponse(response, batch);
            if (outcome.kind === 'SPLIT') {
              splits += 1;
              const step = splitStep(pending, batch);
              pending = step.pending;
              if (step.localReject !== null) localRejects.push(step.localReject);
            } else {
              answered.push(...batch.items);
            }
          }
          expect(requests).toBeLessThanOrEqual(2 * count - 1);
          expect(localRejects.sort((a, b) => a - b)).toEqual([...bad].sort((a, b) => a - b));
          // Every good item answered once, in ascending order: left halves settle first.
          expect(answered).toEqual(all.filter((sequence) => !bad.has(sequence)));
        },
      ),
      { numRuns: 500 },
    );
    expect(splits).toBeGreaterThan(500);
  });

  it('splits into two non-empty halves, the lower first, and refuses an empty batch', () => {
    const step = splitStep([], { items: [1, 2, 3], localRejects: [9] });
    expect(step.pending).toEqual([
      { items: [1, 2], localRejects: [] },
      { items: [3], localRejects: [] },
    ]);
    expect(splitStep([], { items: [5], localRejects: [] })).toEqual({
      pending: [],
      localReject: 5,
    });
    expect(() => splitStep([], { items: [], localRejects: [1] })).toThrow(RangeError);
  });
});

describe('local reject entries', () => {
  it('are built only from values that fit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        fc.oneof(fc.uuid(), fc.string({ maxLength: 600 }), fc.constant(null)),
        fc.option(fc.string({ unit: 'grapheme', maxLength: 600 }), { nil: null }),
        fc.option(fc.string({ maxLength: 600 }), { nil: null }),
        fc.integer({ min: 100, max: 599 }),
        (sequence, itemId, type, errorCode, httpStatus) => {
          const entry = localRejectEntry({ sequence, itemId, type, errorCode, httpStatus });
          expect(entry.sequence).toBe(sequence);
          expect(entry.httpStatus).toBe(httpStatus);
          const isUuid =
            itemId !== null &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
          expect(entry.itemId).toBe(isUuid ? itemId : null);
          for (const [given, kept] of [
            [type, entry.type],
            [errorCode, entry.errorCode],
          ] as const) {
            if (given === null) {
              expect(kept).toBeNull();
              continue;
            }
            expect(Array.from(kept ?? '').length).toBeLessThanOrEqual(64);
            expect(given.startsWith(kept ?? '')).toBe(true);
            if (given.isWellFormed()) expect(kept?.isWellFormed()).toBe(true);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('cuts by code point, never inside a surrogate pair', () => {
    const type = `${'a'.repeat(63)}\u{1f600}tail`;
    expect(
      localRejectEntry({ sequence: 1, itemId: null, type, errorCode: null, httpStatus: 413 }).type,
    ).toBe(`${'a'.repeat(63)}\u{1f600}`);
  });

  it('refuses a sequence that is not a whole number from 1', () => {
    for (const sequence of [0, -1, 1.5]) {
      expect(() =>
        localRejectEntry({ sequence, itemId: null, type: null, errorCode: null, httpStatus: 400 }),
      ).toThrow(RangeError);
    }
  });
});

describe('rewind', () => {
  it('sends arrived and rejected items above the new last sequence once, and reports local rejects again', () => {
    let rewinds = 0;
    fc.assert(
      fc.property(queueArb, fc.nat({ max: 400 }), fc.nat({ max: 400 }), (queue, stored, last) => {
        const observed = observeLastSequence(stored, last);
        expect(observed.storedMax).toBe(last);
        expect(observed.rewound).toBe(last < stored);
        if (!observed.rewound) {
          // Without a rewind nothing changes, so no arrived item can be chosen.
          const choice = selectBatch(queue, idle, NOW);
          for (const sequence of choice?.items ?? []) {
            expect(queue[sequence - 1]?.state).not.toBe('ARRIVED');
          }
          return;
        }
        rewinds += 1;
        const after = queue.map((item) => rewindItem(item, last));
        after.forEach((item, index) => {
          const before = queue[index] as QueueItem;
          if (before.sequence <= last) {
            expect(item).toEqual(before);
          } else if (before.state === 'LOCAL_REJECT') {
            expect(item.state).toBe('LOCAL_REJECT');
            expect(item.answered).toBe(false);
          } else {
            expect(item.state).toBe('WAITING');
            expect(item.answered).toBe(false);
          }
        });
        // Resent once: after they arrive again, a second look without a rewind sends none.
        const arrivedAgain = after.map((item) =>
          item.state === 'WAITING' && item.sequence > last
            ? { ...item, state: 'ARRIVED' as const, answered: true }
            : item,
        );
        const second = selectBatch(arrivedAgain, idle, NOW);
        for (const sequence of second?.items ?? []) expect(sequence).toBeLessThanOrEqual(last);
      }),
      { numRuns: 500 },
    );
    expect(rewinds).toBeGreaterThan(100);
  });

  it('sees a rewind only when the last sequence goes down', () => {
    expect(observeLastSequence(5, 5)).toEqual({ storedMax: 5, rewound: false });
    expect(observeLastSequence(5, 6)).toEqual({ storedMax: 6, rewound: false });
    expect(observeLastSequence(6, 5)).toEqual({ storedMax: 5, rewound: true });
    expect(observeLastSequence(0, 0)).toEqual({ storedMax: 0, rewound: false });
  });

  it('leaves an item in flight to its own answer', () => {
    const sending: QueueItem = {
      sequence: 9,
      state: 'SENDING',
      sizeBytes: 1,
      answered: true,
      retryAtMs: null,
    };
    expect(rewindItem(sending, 3)).toBe(sending);
  });

  it('refuses a sequence that is not a whole number', () => {
    expect(() => observeLastSequence(-1, 0)).toThrow(RangeError);
    expect(() => observeLastSequence(0, 1.5)).toThrow(RangeError);
  });

  it('sends rejected and locally rejected items once more after an app or update change', () => {
    for (const state of states) {
      const item: QueueItem = { sequence: 4, state, sizeBytes: 1, answered: true, retryAtMs: 5 };
      const after = versionChangeItem(item);
      if (state === 'REJECTED' || state === 'LOCAL_REJECT') {
        expect(after).toEqual({ ...item, state: 'WAITING', retryAtMs: null });
      } else {
        expect(after).toBe(item);
      }
    }
  });
});

describe('full download number', () => {
  type Page = {
    readonly startOver: boolean;
    readonly hasMore: boolean;
    readonly rows: readonly string[];
  };
  const pageArb = fc.record({
    startOver: fc.boolean(),
    hasMore: fc.boolean(),
    rows: fc.uniqueArray(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'), { maxLength: 4 }),
    restartAfter: fc.boolean(),
  });

  it('keeps only the rows of the last full download when it ends, across restarts', () => {
    let cleanups = 0;
    let interrupted = 0;
    fc.assert(
      fc.property(fc.array(pageArb, { minLength: 1, maxLength: 30 }), (pages) => {
        // The phone's disk: rows with their stamp, the number and the cursor survive a restart.
        let disk = {
          rows: new Map<string, number>(),
          number: null as number | null,
          cursor: null as string | null,
        };
        let sinceStartOver = new Set<string>();
        let restarted = false;
        pages.forEach((generated, index) => {
          // The server starts over whenever the phone sends no cursor.
          const sent = cursorToSend(disk.cursor, disk.number);
          const page: Page = { ...generated, startOver: generated.startOver || sent === null };
          const { fullDownloadNumber, deleteOthers } = applyDownloadPage(disk.number, page);
          if (page.startOver) {
            sinceStartOver = new Set();
            restarted = false;
          } else {
            expect(fullDownloadNumber).toBe(disk.number);
          }
          const rows = new Map(disk.rows);
          for (const key of page.rows) {
            rows.set(key, fullDownloadNumber);
            sinceStartOver.add(key);
          }
          if (deleteOthers) {
            for (const [key, stamp] of rows) if (stamp !== fullDownloadNumber) rows.delete(key);
            // Only the rows of the last full download remain.
            expect(new Set(rows.keys())).toEqual(sinceStartOver);
            cleanups += 1;
            if (restarted) interrupted += 1;
          }
          // Page, cursor and number are written in one local transaction.
          disk = { rows, number: fullDownloadNumber, cursor: `cursor-${index}` };
          if (generated.restartAfter) restarted = true;
        });
      }),
      { numRuns: 1000 },
    );
    // Ground control: many runs end a full download, some after a restart in the middle.
    expect(cleanups).toBeGreaterThan(1000);
    expect(interrupted).toBeGreaterThan(100);
  });

  it('opens a new number on start over and refuses a first page without it', () => {
    expect(applyDownloadPage(null, { startOver: true, hasMore: true })).toEqual({
      fullDownloadNumber: 1,
      deleteOthers: false,
    });
    expect(applyDownloadPage(4, { startOver: true, hasMore: false })).toEqual({
      fullDownloadNumber: 5,
      deleteOthers: true,
    });
    expect(applyDownloadPage(4, { startOver: false, hasMore: true })).toEqual({
      fullDownloadNumber: 4,
      deleteOthers: false,
    });
    expect(() => applyDownloadPage(null, { startOver: false, hasMore: false })).toThrow(RangeError);
    expect(() => applyDownloadPage(-1, { startOver: true, hasMore: false })).toThrow(RangeError);
  });

  it('sends no cursor without a full download number', () => {
    expect(cursorToSend('abc', null)).toBeNull();
    expect(cursorToSend('abc', 2)).toBe('abc');
    expect(cursorToSend(null, 2)).toBeNull();
  });
});
