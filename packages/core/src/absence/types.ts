// Shared types of the absence rules.

// The one declaration of the hour types; corrections/catalog.ts re-exports it.
export const HOUR_TYPES = ['THEORY', 'PRACTICE'] as const;
export type HourType = (typeof HOUR_TYPES)[number];

// The version of the absence rules (D08 KURAL_SURUMU). Raise it when a rule in this
// folder changes a figure: the nightly check recomputes the rows written under an older
// one (devam_sonuclari.kural_surumu).
export const RULE_VERSION = 1;

// MET: the attendance requirement is met (DEVAMLI); NOT_MET: failed by absence
// (DEVAMSIZ); MET_EXEMPT: exempt from attendance (DEVAMLI_MUAF).
export const TYPE_DECISIONS = ['MET', 'NOT_MET'] as const;
export type TypeDecision = (typeof TYPE_DECISIONS)[number];
export const COURSE_RESULTS = ['MET', 'NOT_MET', 'MET_EXEMPT'] as const;
export type CourseResult = (typeof COURSE_RESULTS)[number];

// The hours an allowance is counted on: the sessions held so far, or every planned one
// (the count base setting).
export const COUNT_BASES = ['HELD', 'PLANNED'] as const;
export type CountBase = (typeof COUNT_BASES)[number];

// A required attendance rate in whole percent, 0 to 100; 0 means no requirement.
export type RatePercent = number;
