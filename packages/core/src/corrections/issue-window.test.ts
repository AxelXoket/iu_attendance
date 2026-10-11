import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ISSUE_REPORT_WINDOW_MS, issueReportWindow } from './issue-window.ts';

const HOUR = 60 * 60 * 1000;
const instant = fc.integer({ min: Date.UTC(2025, 0, 1), max: Date.UTC(2030, 0, 1) });

describe('Issue report window limit', () => {
  it('ends 72 hours after the start and is open only before the end', () => {
    fc.assert(
      fc.property(
        instant,
        fc.option(fc.integer({ min: -10 * HOUR, max: 100 * HOUR }), { nil: null }),
        fc.integer({ min: 0, max: 100 * HOUR }),
        (startAt, lowerOffset, arrivalOffset) => {
          const clientLowerAt = lowerOffset === null ? null : startAt + lowerOffset;
          const arrivedAt = startAt + arrivalOffset;
          const window = issueReportWindow({ startAt, clientLowerAt, arrivedAt });
          expect(window.endAt).toBe(startAt + 72 * HOUR);
          const reportedAt = clientLowerAt ?? arrivedAt;
          expect(window.reportedAt).toBe(reportedAt);
          expect(window.status).toBe(reportedAt < window.endAt ? 'OPEN' : 'EXPIRED');
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('switches to expired exactly at the end', () => {
    const startAt = Date.UTC(2026, 9, 11, 6, 0);
    const endAt = startAt + ISSUE_REPORT_WINDOW_MS;
    expect(
      issueReportWindow({ startAt, clientLowerAt: endAt - 1, arrivedAt: endAt + HOUR }).status,
    ).toBe('OPEN');
    expect(issueReportWindow({ startAt, clientLowerAt: endAt, arrivedAt: endAt }).status).toBe(
      'EXPIRED',
    );
  });

  it('uses the arrival time when there is no anchor', () => {
    const startAt = Date.UTC(2026, 9, 11, 6, 0);
    const arrivedAt = startAt + 80 * HOUR;
    expect(issueReportWindow({ startAt, clientLowerAt: null, arrivedAt }).status).toBe('EXPIRED');
    expect(issueReportWindow({ startAt, clientLowerAt: startAt + HOUR, arrivedAt }).status).toBe(
      'OPEN',
    );
  });
});
