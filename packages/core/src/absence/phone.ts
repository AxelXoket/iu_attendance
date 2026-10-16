// The phone's local correction (D08-B07). The level a student sees is the server's: it is
// stored there and comes down with the student's own section, so it never goes back and
// survives a new phone. The phone does one thing on top, per course and hour type: while
// it holds a record it has not sent, of a session the server counts absent, it takes that
// session's hours as present and raises the remaining allowance it shows by them, and it
// holds back a level increase notice until no unsent record of that type is left.

import { idKey } from '../shared/uuid.ts';
import { isHours } from './allowance.ts';
import {
  type DisplayedLevel,
  isLevel,
  type Level,
  type LevelMessage,
  MESSAGE_LEVELS,
} from './level.ts';
import { ABSENCE_FINAL_STATUS_CODES, type AbsenceFinalStatus } from './session-layer.ts';

export type UnsentRecord = {
  readonly sessionId: string;
  /** The session's hours of this type; 0 when it has none, and then it changes nothing. */
  readonly hours: number;
  /** The server's final status of the session for the student in this type; null before it has one. */
  readonly serverStatus: AbsenceFinalStatus | null;
};

export type PhoneCorrectionInput = {
  /** The server's level, message and remaining allowance for the course and type. */
  readonly displayed: DisplayedLevel;
  /** The level the phone notified last for the course and type. */
  readonly notifiedLevel: Level;
  readonly unsent: readonly UnsentRecord[];
};

export type PhoneCorrection = {
  /** The remaining allowance to show: the server's, plus the hours of each unsent absent session once. */
  readonly remaining: number;
  /** The level to keep as notified: the server's, or the last notified one while an increase is held back. */
  readonly notifyLevel: Level;
  /** The warning to notify now: the server's message when its level rose above the last notified one and nothing holds it back. */
  readonly notice: LevelMessage | null;
};

// The server writes a message exactly for levels 1 to 4, the one that stands for its
// level; a message off the list stands for no level. The remainder is checked once
// corrected.
const isDisplayed = ({ level, message }: DisplayedLevel) =>
  message === null ? level === 0 : MESSAGE_LEVELS[message] === level;
const isServerStatus = (status: AbsenceFinalStatus | null) =>
  status === null || ABSENCE_FINAL_STATUS_CODES.includes(status);

/** RangeError for a level, a status or hours out of form, or one session given twice with other values. */
export function phoneCorrection(input: PhoneCorrectionInput): PhoneCorrection {
  const { displayed, notifiedLevel } = input;
  if (!isDisplayed(displayed) || !isLevel(notifiedLevel)) {
    throw new RangeError('the displayed level or the notified level is out of form');
  }
  // One session counts once, however many records the phone holds for it.
  const sessions = new Map<string, UnsentRecord>();
  for (const record of input.unsent) {
    const key = idKey(record.sessionId);
    const seen = sessions.get(key);
    if (
      !isHours(record.hours) ||
      !isServerStatus(record.serverStatus) ||
      (seen !== undefined &&
        (seen.hours !== record.hours || seen.serverStatus !== record.serverStatus))
    ) {
      throw new RangeError(`unsent session ${record.sessionId} is out of form`);
    }
    sessions.set(key, record);
  }
  const withHours = [...sessions.values()].filter((record) => record.hours > 0);
  const returned = withHours
    .filter((record) => record.serverStatus === 'ABSENT')
    .reduce((sum, record) => sum + record.hours, 0);
  const remaining = displayed.remaining + returned;
  if (!Number.isSafeInteger(remaining))
    throw new RangeError('the remaining allowance is out of range');
  const rises = displayed.level > notifiedLevel;
  const held = rises && withHours.length > 0;
  return {
    remaining,
    notifyLevel: held ? notifiedLevel : displayed.level,
    notice: rises && !held ? displayed.message : null,
  };
}
