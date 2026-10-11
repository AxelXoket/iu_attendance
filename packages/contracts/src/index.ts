// The package root, @iu-attendance/contracts. No package of the spec writes this file,
// so it only re-exports the shared foundation; module contracts, routes, errors and
// the client keep their own entry points (@iu-attendance/contracts/<name>).
export * from './shared/index.ts';
