// The status of a roster row (D03): an active row is on the current list; an inactive one
// has left it and keeps its history. The session view counts active rows only.
export const ROW_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type RowStatus = (typeof ROW_STATUSES)[number];
