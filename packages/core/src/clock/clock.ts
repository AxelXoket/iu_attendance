// The single source of every rule-bearing instant. Composition roots hand a Clock to
// the modules; module, job and core code never read the wall clock themselves.
export interface Clock {
  // The current instant in UTC milliseconds since the Unix epoch.
  now(): number;
  // The current instant as a Date, for APIs that take one.
  nowDate(): Date;
}
