export const meta = {
  name: 'backend-review-fix',
  description: 'Stage 3 and 4: 15 cold critics, one per module and its interfaces, then 15 module owners fix their own spec and section',
  phases: [{ title: 'Review', detail: '15 critics, one module each' }, { title: 'Fix', detail: '15 owners fix their own files' }],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const IDS = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']
const FIND = { type: 'object', properties: { id: { type: 'string' }, score: { type: 'number' }, findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] }, where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' }, owner: { type: 'string' } }, required: ['severity', 'where', 'problem', 'fix', 'owner'] } } }, required: ['id', 'score', 'findings'] }
const review = id => `You are a cold, harsh reviewer of module ${id} of the İÜ Yoklama server design. You did not write it. Read ${B}\\spec\\${id}.json and ${B}\\frag\\${id}.html, the module's entry and shared rules in ${B}\\contracts.json, its inventory ${B}\\inv\\${id}.json, the specs of the modules it calls or is called by (${B}\\spec\\*.json, read only), ${B}\\PROGRESS.md (the architect's unresolved items), and the plan.html and teknik.html passages it cites (${REPO}).
Find what would stop an engineer from building it or would make it wrong: a decided fact from plan.html or teknik.html contradicted or lost; a gap left unresolved; ambiguous types, states or errors; an interface mismatch with another module's exports (name, signature, data); a table another module would need to write; race conditions, idempotency holes, time zone mistakes (Europe/Istanbul), security holes; untestable rules. Each finding: severity (HIGH breaks correctness or blocks building; MEDIUM a real defect; LOW polish), where (spec path or fragment heading), problem, concrete fix, and owner (the module id that must change; ${id} unless the fix belongs to another module). Do NOT launch sub-agents. Return the findings.`
const fix = (id, items) => `You own module ${id} of the İÜ Yoklama server design: ${B}\\spec\\${id}.json and ${B}\\frag\\${id}.html. Fix every finding below that names you as owner, in your own two files only, then run node ${B}\\spec-validate.js ${id} until OK. Keep plain Turkish, no U+2013 or U+2014, link plan.html or teknik.html anchors instead of restating. Where a fix would change a product decision, add an open point with a recommendation instead. Do NOT launch sub-agents.
Findings (JSON): ${JSON.stringify(items)}
Return {id, fixed, not_fixed: [reasons], validator}.`
phase('Review')
const reviews = (await parallel(IDS.map(id => () => agent(review(id), { label: `review:${id}`, phase: 'Review', schema: FIND })))).filter(Boolean)
const all = reviews.flatMap(r => r.findings.map(f => ({ ...f, from: r.id })))
log(`findings: ${all.length} (HIGH ${all.filter(f => f.severity === 'HIGH').length})`)
phase('Fix')
const RET = { type: 'object', properties: { id: { type: 'string' }, fixed: { type: 'integer' }, not_fixed: { type: 'array', items: { type: 'string' } }, validator: { type: 'string' } }, required: ['id', 'fixed', 'validator'] }
const fixes = await parallel(IDS.map(id => () => { const items = all.filter(f => (f.owner || f.from) === id); return items.length ? agent(fix(id, items), { label: `fix:${id}`, phase: 'Fix', schema: RET }) : Promise.resolve({ id, fixed: 0, validator: 'no findings' }) }))
return { reviews: reviews.map(r => ({ id: r.id, score: r.score, n: r.findings.length, high: r.findings.filter(f => f.severity === 'HIGH').length })), fixes }
