export const ISSUE_REPORT_WINDOW_MS = 72 * 60 * 60 * 1000;

export type IssueReportWindowInput = {
  // UTC milliseconds: when the current decision reached the phone (or the session
  // end for a report without a record).
  startAt: number;
  // The lower end of the clock result for the report; null without an anchor.
  clientLowerAt: number | null;
  // When the report reached the server.
  arrivedAt: number;
};

export type IssueReportWindow = {
  endAt: number;
  reportedAt: number;
  status: 'OPEN' | 'EXPIRED';
};

// An issue report may be sent for 72 hours. Without an anchor the arrival time
// stands for the report time. Pure UTC arithmetic, so the result does not depend on
// the time zone the code runs in.
export function issueReportWindow(input: IssueReportWindowInput): IssueReportWindow {
  const endAt = input.startAt + ISSUE_REPORT_WINDOW_MS;
  const reportedAt = input.clientLowerAt ?? input.arrivedAt;
  return { endAt, reportedAt, status: reportedAt < endAt ? 'OPEN' : 'EXPIRED' };
}
