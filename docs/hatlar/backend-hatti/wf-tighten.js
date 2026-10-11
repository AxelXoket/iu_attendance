export const meta = {
  name: 'backend-tighten-packages',
  description: 'Shorten the build order: 15 modules cut false dependencies and split packages so exports others need come early',
  phases: [{ title: 'Tighten', detail: '15 modules edit only their own packages file' }],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const IDS = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']
const p = id => `You own the work packages of module ${id} of the İÜ Yoklama server: ${B}\\packages\\${id}.json. The 234 packages of all 15 modules were scheduled into 33 phases of at most 15 packages, because one chain of 33 packages waits on each other. 234 packages need at least 16 phases; the target is 20 or fewer. Phases with one to five packages waste the other builders.
Read ${B}\\packages\\rapor-${id}.txt (your packages: level, tail, the edge that holds each one back, and who waits on it), ${B}\\packages\\r1\\schedule.json (all packages, read only), ${B}\\spec\\${id}.json (read only) and the specs of modules you call (read only).
Shorten every chain your packages are on, editing only ${B}\\packages\\${id}.json:
- Remove a depends_on or needs entry unless the package's code really imports that file or calls that export to build or to run its own tests. Ordering by habit ("schema, then service, then routes, then scenarios" when the later part only uses types) is not a dependency; types come from packages/contracts and can be built first.
- Exports other modules wait on (the report shows "is waited on by ... via needs ..."): move each into the earliest package that can build it, and keep that package's own needs as few as possible. Split a package when an early, widely needed piece sits next to a late piece.
- Test support: module tests run against their own module with a throwaway database; they must not wait for the whole application to be assembled. Only end-to-end scenarios and the process start wait for the composition roots (apiKur and uygulamaKur in D13, worker.ts in D14, the CLI roots). If you own test helpers others use (for example D12 test database helpers, D13 senaryo düzeneği, D15 TestDunyasi), put the part others need into an early package with no late needs, and the full-application part into a late one.
- Size for comfort: S about half a day, M one day, L a little more than one day. Prefer M; split L packages that hold two separable jobs.
Keep every rule of the gate: every spec file, table, endpoint, job and export in exactly one package; depends_on only your own package ids; needs as Dxx.export; tests in every package. Renumbering your package ids is fine (others refer to your exports, not your ids). Never U+2013 or U+2014. Do not edit any other file; do not run node schedule.js without --check (others are editing at the same time). Do NOT launch sub-agents.
Run node ${B}\\schedule.js --check ${id} until it prints OK. Return {id, packages, removed_edges, splits, validator}.`
const RET = { type: 'object', properties: { id: { type: 'string' }, packages: { type: 'integer' }, removed_edges: { type: 'integer' }, splits: { type: 'integer' }, validator: { type: 'string' } }, required: ['id', 'packages', 'validator'] }
phase('Tighten')
const res = await parallel(IDS.map(id => () => agent(p(id), { label: `tighten:${id}`, phase: 'Tighten', schema: RET })))
return { res }
