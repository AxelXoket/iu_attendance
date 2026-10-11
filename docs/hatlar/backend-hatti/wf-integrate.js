export const meta = {
  name: 'backend-integrate-breakdown',
  description: 'Architect settles 123 cross-module items and the contracts; 15 modules align their specs; 15 modules split into disjoint work packages',
  phases: [
    { title: 'Architect', detail: 'decide every cross-module item, update contracts, write per-module instructions' },
    { title: 'Align', detail: '15 modules apply the instructions to their own spec and section' },
    { title: 'Package', detail: '15 modules split into work packages, gate schedule.js --check' },
  ],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const IDS = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']
const GEN = { D01: 'd01work', D02: 'd02work', D03: 'd03work', D04: 'D04work', D05: 'D05work', D06: 'd06_spec_work', D07: 'd07spec', D08: 'd08', D09: 'd09work', D10: 'd10work', D11: 'd11work', D12: 'd12work', D13: 'd13work', D14: 'work-D14', D15: 'd15work' }

const architect = `You are the architect of the İÜ Yoklama server design. Fifteen module specs (${B}\\spec\\D01..D15.json, sections ${B}\\frag\\D01..D15.html) were written, reviewed and fixed. What is left is the work between modules: ${B}\\align\\inbox.json holds 123 items (field n, I001..I123): open points one module raised about another, explicit requests to other modules, and fixer notes about changes they could not make because contracts.json or another module's files are not theirs. Also read ${B}\\PROGRESS.md (section "Architect's unresolved items", five items), ${B}\\contracts.json and its generator ${B}\\build-contracts.js, and the specs as needed (read only). Product decisions come from ${REPO}\\plan.html and ${REPO}\\teknik.html; never contradict them.
Your job, in this order:
1. Decide every inbox item. verdict ACCEPT (do as proposed), CHANGE (do it, but differently; say how), REJECT (say why; the requesting module adapts), OWNER (a product decision only the owner can make; it stays an owner open point with a recommendation). Where two modules want different things on the same topic (for example who registers the student scope source, D02 or D03; job times in D14's schedule against D02 and D10; lock modes between D07, D11 and D12), decide once and give both the same instruction. Prefer the smallest change that keeps one owner per table, endpoint, job, file and decision.
2. Settle the five architect items in PROGRESS.md the same way. Add them to decisions with n A1..A5. A1 (one migrations folder): the rule is that each module writes only folders apps/server/migrations/<14 digit UTC>_<its token>_<açıklama>/ (token as in contracts.json migration_dir) and D12 owns the folder rule and the CI check; say how parallel work avoids clashes in drizzle-kit snapshots. A2 (two-way module pairs D01-D02, D01-D07, D05-D07, D08-D09): break each with listener registration or a narrower export so the import graph has no cycle.
3. Apply every contract-level change by editing build-contracts.js (never hand-edit contracts.json): endpoint paths (for example D08 and D10 admin paths under /v1/<modül>/yonetim/), a table, endpoint or job that a module needs and you accept, file globs (for example D13 apps/server/scripts/api/), reads_from, exports, decisions. Then run node ${B}\\build-contracts.js and node ${B}\\contracts-validate.js until OK. Each table, endpoint, job and glob still has exactly one owner.
4. Write ${B}\\align\\decisions.json: [{ "n": "I001", "verdict": "ACCEPT", "targets": ["D05", "D07"], "decision": "<Turkish, what is decided and why, one to three sentences>" }] covering every inbox item and A1..A5. targets are the modules that must change their spec. When the item came from a module's own open point, that module is a target too, with an instruction to close the open point (or, for OWNER, to keep it as an owner open point with the recommendation).
5. Write ${B}\\align\\D01.json .. D15.json, one per module, all fifteen even if empty: { "id": "D05", "instructions": [ { "refs": ["I014", "A2"], "do": "<Turkish, the exact change: which export, field, table column, state, error code, job time or section text, old and new>" } ] }. Each module will apply only its own file, in parallel, without seeing the others, so every instruction must be complete on its own and both sides of an interface must get matching instructions (same names, same signature, same order of locks).
6. Run node ${B}\\align-validate.js until it prints OK. Update the "Architect's unresolved items" section of PROGRESS.md: each item marked settled with a pointer to its decision.
Plain Turkish in decision and instruction texts, never U+2013 or U+2014. Do NOT launch sub-agents. Do NOT edit spec/ or frag/ files; the modules do that. Return {decisions, owner, contract_changes, validator}.`

const align = id => `You own module ${id} of the İÜ Yoklama server design: ${B}\\spec\\${id}.json and ${B}\\frag\\${id}.html. Your generator scripts are in ${B}\\${GEN[id]}; if a script there writes your spec or section, change its source and regenerate so the script and the files stay identical, otherwise edit the two files directly. Edit nothing else.
The architect has settled the work between modules. Read ${B}\\align\\${id}.json (your instructions), ${B}\\align\\decisions.json (all decisions, for context; the other modules apply theirs at the same time), and ${B}\\contracts.json (just regenerated; it may have changed your endpoint paths, globs, exports or reads_from).
Do all of this:
1. Apply every instruction in align\\${id}.json exactly. Where an instruction names an interface, use the same names and signature the decision gives, because the other side is applying the same text.
2. Make your spec match contracts.json again (tables, endpoints with their new paths, jobs, files inside your globs).
3. Close your open points that the architect decided (ACCEPT, CHANGE, REJECT): remove them from open_points and record the outcome where it belongs (resolved_gaps, the rule, the export, the section). OWNER decisions stay open points with needs_owner true and the architect's recommendation. No open point with needs_owner false may remain.
4. Exports: every entry in spec.exports has a name that is one plain identifier. Split combined entries ("a ve b" becomes two entries), move remarks like "(tip)" or "(ek, ...)" into the signature or a note field. The contracts file itself is not an export. Remove duplicates.
5. Keep the section in step with the spec: what changed in the spec changes in frag\\${id}.html. Plain Turkish, no U+2013 or U+2014, link plan.html or teknik.html anchors instead of restating them.
Run node ${B}\\spec-validate.js ${id} until it prints OK. Do NOT launch sub-agents. Return {id, applied, open_points_left, validator}.`

const pack = id => `Split module ${id} of the İÜ Yoklama server into work packages that one engineer or one coding agent can build comfortably in one sitting. Read ${B}\\spec\\${id}.json (tables, endpoints, jobs, exports, files, tests), ${B}\\contracts.json (your globs and migration token), and the exports of the modules you call (their ${B}\\spec\\Dxx.json, read only).
Rules:
- Every file in your spec's files belongs to exactly one package; your packages never share a file. A package that creates or changes tables may also list its migration folder files apps/server/migrations/<14 digit UTC>_<your token>_<açıklama>/migration.sql and snapshot.json (one folder per package, distinct names).
- Every table, endpoint, job and export your module owns is in exactly one package (fields tables, endpoints, jobs, exports; exports use the plain names from spec.exports).
- needs: the exports of OTHER modules this package calls, as "D12.danismaKilidi". Only list what the code really calls. depends_on: packages of YOUR module that must be finished first. Never put another module's package id in depends_on.
- Order by feasibility: the first packages are what others wait on (contracts types, schema, the exports other modules need). Put an export other modules need into the earliest package that can be built, and keep such packages free of needs where you can, so no cycle forms between modules.
- Size: S about half a day, M one day, L a little more than one day; about 300 to 800 lines with tests. Split anything bigger.
- tests: the test names from your spec that this package ships. Every package ships its own tests.
Write ${B}\\packages\\${id}.json: { "id": "${id}", "packages": [ { "id": "${id}-P01", "title": "<short Turkish title>", "files": [], "tables": [], "endpoints": [], "jobs": [], "exports": [], "needs": [], "tests": [], "depends_on": [], "size": "S", "notes": "<one Turkish sentence: what is done and how it is checked>" } ] }. Never U+2013 or U+2014. Do NOT launch sub-agents. Run node ${B}\\schedule.js --check ${id} until it prints OK. Return {id, packages, validator}.`

const DEC = { type: 'object', properties: { decisions: { type: 'integer' }, owner: { type: 'integer' }, contract_changes: { type: 'array', items: { type: 'string' } }, validator: { type: 'string' } }, required: ['decisions', 'validator'] }
const ALN = { type: 'object', properties: { id: { type: 'string' }, applied: { type: 'integer' }, open_points_left: { type: 'integer' }, validator: { type: 'string' } }, required: ['id', 'applied', 'validator'] }
const PKG = { type: 'object', properties: { id: { type: 'string' }, packages: { type: 'integer' }, validator: { type: 'string' } }, required: ['id', 'packages', 'validator'] }

phase('Architect')
const arch = await agent(architect, { label: 'architect', phase: 'Architect', schema: DEC })
if (!arch || !/^OK/.test(arch.validator)) return { arch, stopped: 'architect gate not OK' }
log(`architect: ${arch.decisions} decisions, ${arch.owner ?? '?'} for the owner`)
phase('Align')
const aligned = await parallel(IDS.map(id => () => agent(align(id), { label: `align:${id}`, phase: 'Align', schema: ALN })))
const bad = aligned.filter(a => !a || !/^OK/.test(a.validator))
if (bad.length) log(`align not OK: ${bad.map(a => a ? a.id : '?').join(', ')}`)
phase('Package')
const packs = await parallel(IDS.map(id => () => agent(pack(id), { label: `pkg:${id}`, phase: 'Package', schema: PKG })))
return { arch, aligned, packs }
