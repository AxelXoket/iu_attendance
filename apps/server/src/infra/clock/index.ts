// The clock infrastructure: the Clock type, the real clock and the Istanbul calendar
// helpers. wallClockOffsetMs is for the clock module only.
export type { Clock } from '@iu-attendance/core/clock/clock';
export { istanbulDate, istanbulDayEndInstant, istanbulInstant } from './istanbul.ts';
export { systemClock, wallClockOffsetMs } from './system-clock.ts';
