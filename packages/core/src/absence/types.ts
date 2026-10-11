// Shared types of the absence rules.

// The one declaration of the hour types; corrections/catalog.ts re-exports it.
export type HourType = 'THEORY' | 'PRACTICE';

// MET: the attendance requirement is met (DEVAMLI); NOT_MET: failed by absence
// (DEVAMSIZ); MET_EXEMPT: exempt from attendance (DEVAMLI_MUAF).
export type TypeDecision = 'MET' | 'NOT_MET';
export type CourseResult = 'MET' | 'NOT_MET' | 'MET_EXEMPT';

// A required attendance rate in whole percent, 0 to 100; 0 means no requirement.
export type RatePercent = number;
