export const meta = {
  name: 'backend-breakdown',
  description: 'Stage 5: 15 module agents split their module into comfortable, buildable work packages with disjoint files; a script schedules them into phases of at most 15',
  phases: [{ title: 'Packages', detail: '15 modules' }],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const IDS = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']
const p = id => `Split module ${id} of the İÜ Yoklama server into work packages that one engineer (or one coding agent) can build comfortably in one sitting, ordered by feasibility. Read ${B}\\spec\\${id}.json (tables, endpoints, jobs, exports, files, tests), ${B}\\contracts.json (your file globs; other modules' exports you call), ${B}\\PROGRESS.md.
Rules: every file in your spec's "files" belongs to exactly one package; packages of your module never share a file; a package lists the tables it creates or migrates, the endpoints and jobs it implements, the tests it ships with (from your spec), and its dependencies: other packages (yours or other modules', by id like D05-P02) whose exports it needs. The first packages are the ones others depend on (schema, exports, contracts types). Size: about 300 to 800 lines of code and their tests, at most one day of work. Everything ships with its tests in the same package.
Write ${B}\\packages\\${id}.json: { "id": "${id}", "packages": [ { "id": "${id}-P01", "title": "<Turkish>", "files": [""], "tables": [""], "endpoints": [""], "jobs": [""], "tests": ["<test names from your spec>"], "depends_on": ["<package ids>"], "size": "S|M|L", "notes": "<Turkish>" } ] }. Never U+2013 or U+2014. Do NOT launch sub-agents. Run node ${B}\\schedule.js --check ${id} until it prints OK. Return {id, packages, validator}.`
const RET = { type: 'object', properties: { id: { type: 'string' }, packages: { type: 'integer' }, validator: { type: 'string' } }, required: ['id', 'packages', 'validator'] }
const res = await parallel(IDS.map(id => () => agent(p(id), { label: `pkg:${id}`, phase: 'Packages', schema: RET })))
return { res }
