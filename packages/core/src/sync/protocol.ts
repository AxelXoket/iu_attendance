import { uuidBytes } from '../shared/uuid.ts';

// The phone's queue protocol (D06 phone contract T1 to T12, state machine "Telefondaki
// kuyruk öğesi"): batch selection, first send delay, backoff, response classes and
// splitting, local reject entries, the rewind rule and the full download number. Pure
// rules shared by the phone's queue (apps/mobile), the server's state machine test and the
// load test; time and randomness come in as numbers, so the same input gives the same answer.

/** A batch holds at most 200 items (the request schema's limit). */
export const BATCH_MAX_ITEMS = 200;
/** The phone keeps the items of a batch within 768 KiB, under the server's 1 MiB body limit. */
export const BATCH_MAX_BYTES = 768 * 1024;
/** At most 200 local reject entries go with one batch. */
export const LOCAL_REJECTS_MAX = 200;
/** N: the first send after a check-in waits 0 to N seconds (set again from the load test). */
export const FIRST_SEND_MAX_SECONDS = 10;
export const BACKOFF_MIN_MS = 2000;
export const BACKOFF_MAX_MS = 10 * 60 * 1000;
/** The request field that holds the items; a 400 pointing into it is split. */
export const BATCH_ITEMS_FIELD = 'items';
const LOCAL_REJECT_TEXT_MAX = 64;

/** BEKLIYOR, GONDERILIYOR, ULASTI, RET, YEREL_RET. */
export type QueueItemState = 'WAITING' | 'SENDING' | 'ARRIVED' | 'REJECTED' | 'LOCAL_REJECT';

export type QueueItem = {
  readonly sequence: number;
  readonly state: QueueItemState;
  /** Bytes of the item's envelope in the request body. */
  readonly sizeBytes: number;
  /**
   * The server holds a ledger row for the item: it got an item result (or, for a local
   * reject, the batch that reported it was answered) since the last rewind.
   */
  readonly answered: boolean;
  /** When an answered item may go again after TEKRAR_DENE; null when it need not wait. */
  readonly retryAtMs: number | null;
};

export type InstallationQueue = {
  /** Installation-level wait after a batch-level failure; 0 when there is none. */
  readonly waitUntilMs: number;
  /** Sending stopped after 401, 403 or another 4xx that is not split. */
  readonly stopped: boolean;
  /**
   * A batch of this installation is in flight. One send at a time (the foreground and the
   * background share the lock); a batch of local rejects only has no SENDING item to show it.
   */
  readonly sending: boolean;
};

export type BatchChoice = {
  /** Item sequences, ascending. */
  readonly items: readonly number[];
  /** Sequences of local rejects to report, ascending. */
  readonly localRejects: readonly number[];
};

const isWhole = (value: number) => Number.isSafeInteger(value) && value >= 0;

/**
 * The next batch of one installation, or null when there is nothing to send now. Nothing
 * goes while the installation waits, is stopped, or has a batch in flight. Items go in
 * ascending sequence order from the smallest one: an item that never got an answer is never
 * skipped (the batch ends at the first one that does not fit), while an answered item still
 * waiting after TEKRAR_DENE is passed over, since its ledger row leaves no gap. At most 200
 * items and 768 KiB; the first item always goes, so one oversized item meets the 413 path
 * instead of blocking the queue. Unreported local rejects ride along, at most 200.
 */
export function selectBatch(
  items: readonly QueueItem[],
  installation: InstallationQueue,
  nowMs: number,
): BatchChoice | null {
  if (installation.stopped || installation.sending || nowMs < installation.waitUntilMs) {
    return null;
  }
  if (items.some((item) => item.state === 'SENDING')) return null;
  const sorted = [...items].sort((a, b) => a.sequence - b.sequence);
  const chosen: number[] = [];
  let bytes = 0;
  for (const item of sorted) {
    if (item.state !== 'WAITING') continue;
    if (item.answered && item.retryAtMs !== null && nowMs < item.retryAtMs) continue;
    const fits =
      chosen.length === 0 ||
      (chosen.length < BATCH_MAX_ITEMS && bytes + item.sizeBytes <= BATCH_MAX_BYTES);
    if (!fits) break;
    chosen.push(item.sequence);
    bytes += item.sizeBytes;
  }
  const localRejects = sorted
    .filter((item) => item.state === 'LOCAL_REJECT' && !item.answered)
    .slice(0, LOCAL_REJECTS_MAX)
    .map((item) => item.sequence);
  if (chosen.length === 0 && localRejects.length === 0) return null;
  return { items: chosen, localRejects };
}

function checkRandom(random: number): void {
  if (!(random >= 0 && random < 1)) throw new RangeError('random must be in [0, 1)');
}

/** The wait before the first send of a check-in: 0 to N seconds, so a class does not send at once. */
export function firstSendDelayMs(random: number, maxSeconds = FIRST_SEND_MAX_SECONDS): number {
  checkRandom(random);
  if (!isWhole(maxSeconds)) throw new RangeError('maxSeconds must be a whole number from 0');
  return Math.floor(random * maxSeconds * 1000);
}

/** The longest server wait the phone honours: one day. */
export const SERVER_WAIT_MAX_SECONDS = 86400;

/**
 * The wait before try number `attempt` (0 for the first retry), always random so phones that
 * failed together do not return together. Without a server wait: a point in [2 s, ceiling),
 * the ceiling doubling from 4 seconds up to 10 minutes. With a server wait W (waitSeconds or
 * Retry-After): a point in [W, max(ceiling, W + 2 s)), so at least W, with a random share on
 * top, and under 10 minutes whenever W is at least 2 seconds below that. A server wait that is
 * not a number from 0 counts as none, and one above a day as a day.
 */
export function backoffDelayMs(
  attempt: number,
  random: number,
  serverWaitSeconds: number | null = null,
): number {
  if (!isWhole(attempt)) throw new RangeError('attempt must be a whole number from 0');
  checkRandom(random);
  const serverMs =
    serverWaitSeconds !== null && serverWaitSeconds > 0
      ? Math.ceil(Math.min(serverWaitSeconds, SERVER_WAIT_MAX_SECONDS) * 1000)
      : 0;
  // A large attempt makes 2 ** attempt Infinity, which the cap turns back into 10 minutes.
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** (attempt + 1));
  const lower = Math.max(BACKOFF_MIN_MS, serverMs);
  const upper = Math.max(ceiling, lower + BACKOFF_MIN_MS);
  return lower + Math.floor(random * (upper - lower));
}

/** What came back for a submission. */
export type SubmitResponse =
  | { readonly kind: 'NETWORK_ERROR' }
  | {
      readonly kind: 'HTTP';
      readonly status: number;
      /**
       * The body passed the schema for its status: the results for 200, the API's error
       * envelope for any other status. A captive portal, a proxy or a firewall answers with
       * some other body, and that answer says nothing about the batch.
       */
      readonly bodyValid: boolean;
      /** The field path of a 400 API_ISTEK_GECERSIZ detail, when it has one. */
      readonly fieldPath: readonly (string | number)[] | null;
      /** Retry-After in seconds, as read; any value. */
      readonly retryAfterSeconds: number | null;
    };

export type SubmitOutcome =
  | { readonly kind: 'RESULTS' }
  | { readonly kind: 'INSTALLATION_WAIT'; readonly serverWaitSeconds: number | null }
  | { readonly kind: 'SPLIT' }
  | { readonly kind: 'STOP'; readonly reason: 'UNAUTHORIZED' | 'FORBIDDEN' | 'CLIENT_ERROR' };

// Retry-After from the network: a number from 0, at most a day; anything else is no wait.
const serverWait = (seconds: number | null) =>
  seconds !== null && seconds >= 0 ? Math.min(seconds, SERVER_WAIT_MAX_SECONDS) : null;

/**
 * The class of a submission response (D06-C05) for the batch that was sent. Results are
 * applied item by item. A network error, a timeout, 408, 429, 5xx and any unexpected body or
 * status make the installation wait; so does a 4xx whose body is not the API's error envelope
 * (a captive portal or a proxy said it, not the server). 413, and an API 400 whose field path
 * points into the items, split the batch; a batch without items cannot be split and waits.
 * An API 401 stops the installation until the next login; an API 403 and every other API 4xx
 * stop it until the app or the update changes (the request itself is wrong, so splitting
 * could not find the fault).
 */
export function classifySubmitResponse(
  response: SubmitResponse,
  batch: BatchChoice,
): SubmitOutcome {
  const wait: SubmitOutcome = { kind: 'INSTALLATION_WAIT', serverWaitSeconds: null };
  if (response.kind === 'NETWORK_ERROR') return wait;
  const { status, bodyValid } = response;
  if (status === 200 && bodyValid) return { kind: 'RESULTS' };
  const split = batch.items.length > 0 ? ({ kind: 'SPLIT' } as const) : wait;
  if (status === 413) return split;
  const apiClientError = status >= 400 && status < 500 && status !== 408 && status !== 429;
  if (apiClientError && bodyValid) {
    if (
      status === 400 &&
      response.fieldPath !== null &&
      response.fieldPath[0] === BATCH_ITEMS_FIELD
    ) {
      return split;
    }
    if (status === 401) return { kind: 'STOP', reason: 'UNAUTHORIZED' };
    if (status === 403) return { kind: 'STOP', reason: 'FORBIDDEN' };
    return { kind: 'STOP', reason: 'CLIENT_ERROR' };
  }
  return { kind: 'INSTALLATION_WAIT', serverWaitSeconds: serverWait(response.retryAfterSeconds) };
}

/**
 * A download failure clears the staff's class lists and cursor only on a 401 from the API
 * (its error envelope); 403 keeps them, and so does a 401 from anything in between.
 */
export function downloadFailureClearsLists(
  status: number,
  role: 'STUDENT' | 'STAFF',
  bodyValid: boolean,
): boolean {
  return role === 'STAFF' && status === 401 && bodyValid;
}

/**
 * The next step after a batch came back SPLIT. The halves go depth first, the left (lower)
 * half first, and carry no local rejects: the split batch's local rejects stay unreported and
 * go with the next batch that is not split. A single item that comes back SPLIT becomes a
 * local reject. `pending` holds the batches still to send, next first.
 */
export function splitStep(
  pending: readonly BatchChoice[],
  batch: BatchChoice,
): { readonly pending: readonly BatchChoice[]; readonly localReject: number | null } {
  const { items } = batch;
  if (items.length === 0) throw new RangeError('splitStep expects a batch with items');
  if (items.length === 1) return { pending, localReject: items[0] as number };
  const middle = Math.ceil(items.length / 2);
  const left: BatchChoice = { items: items.slice(0, middle), localRejects: [] };
  const right: BatchChoice = { items: items.slice(middle), localRejects: [] };
  return { pending: [left, right, ...pending], localReject: null };
}

export type LocalRejectEntry = {
  readonly sequence: number;
  readonly itemId: string | null;
  readonly type: string | null;
  readonly httpStatus: number;
  readonly errorCode: string | null;
};

// The first 64 code points: a cut never leaves half of a surrogate pair.
const cut = (text: string | null) =>
  text === null ? null : Array.from(text).slice(0, LOCAL_REJECT_TEXT_MAX).join('');

/**
 * A local reject entry built only from values that fit the server's check: an item id that
 * is not a UUID becomes null, the type and the error code are cut to 64 code points, and the
 * sequence is the phone's own. Values the server refused once are never sent back as they were.
 */
export function localRejectEntry(input: LocalRejectEntry): LocalRejectEntry {
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    throw new RangeError('localRejectEntry expects the item sequence, a whole number from 1');
  }
  return {
    sequence: input.sequence,
    itemId: input.itemId !== null && uuidBytes(input.itemId) !== null ? input.itemId : null,
    type: cut(input.type),
    httpStatus: input.httpStatus,
    errorCode: cut(input.errorCode),
  };
}

/**
 * The stored largest lastSequence after a response. A smaller value than the stored one is a
 * rewind (the server came back from a backup): the stored value goes down to it.
 */
export function observeLastSequence(
  storedMax: number,
  lastSequence: number,
): { readonly storedMax: number; readonly rewound: boolean } {
  if (!isWhole(storedMax) || !isWhole(lastSequence)) {
    throw new RangeError('observeLastSequence expects whole numbers from 0');
  }
  return { storedMax: lastSequence, rewound: lastSequence < storedMax };
}

/**
 * An item after a rewind to lastSequence. Above it the server lost the ledger rows: an arrived
 * or rejected item waits again to go once more, with its receipt; a local reject is reported
 * again and never resent (resending would open a split loop); a waiting item loses its
 * answered mark, so the next batch cannot skip it. A sending item is left to its own answer.
 */
export function rewindItem(item: QueueItem, lastSequence: number): QueueItem {
  if (item.sequence <= lastSequence || item.state === 'SENDING') return item;
  if (item.state === 'LOCAL_REJECT') return { ...item, answered: false };
  return { ...item, state: 'WAITING', answered: false, retryAtMs: null };
}

/**
 * An item after the app's runtimeVersion or update id changed: a rejected or locally rejected
 * item goes once more. Its answered mark stays, since its ledger row stays.
 */
export function versionChangeItem(item: QueueItem): QueueItem {
  if (item.state !== 'REJECTED' && item.state !== 'LOCAL_REJECT') return item;
  return { ...item, state: 'WAITING', retryAtMs: null };
}

/**
 * The full download number for a page's rows. A page with startOver opens a new number;
 * every other page keeps the current one, also after an app restart, so an interrupted full
 * download never turns into an incremental one. When hasMore is false, program and list
 * rows that do not carry the number are deleted. Throws RangeError for a page without
 * startOver while there is no number: cursorToSend never sends a cursor without one.
 */
export function applyDownloadPage(
  current: number | null,
  page: { readonly startOver: boolean; readonly hasMore: boolean },
): { readonly fullDownloadNumber: number; readonly deleteOthers: boolean } {
  if (current !== null && !isWhole(current)) {
    throw new RangeError('applyDownloadPage expects a whole number or null');
  }
  if (!page.startOver && current === null) {
    throw new RangeError('applyDownloadPage expects startOver on the first page');
  }
  const fullDownloadNumber = page.startOver ? (current ?? 0) + 1 : (current as number);
  return { fullDownloadNumber, deleteOthers: !page.hasMore };
}

/** The cursor the phone sends: none while it holds no full download number. */
export function cursorToSend(
  cursor: string | null,
  fullDownloadNumber: number | null,
): string | null {
  return fullDownloadNumber === null ? null : cursor;
}
