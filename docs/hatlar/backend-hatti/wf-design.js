export const meta = {
  name: 'backend-design',
  description: 'Stage 2 of the backend design: 15 module designers each write their exact spec and their section of backend.html against the ownership contracts',
  phases: [{ title: 'Design', detail: '15 modules, one owner each' }],
}

const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const IDS = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']

const prompt = id => `You are the designer of module ${id} of the İÜ Yoklama server (Turkish university attendance app: phone app for students and instructors, web panel, offline check-in synced later). The owner asked for a backend document where the server design is made exact, then split into work packages that up to 15 engineers can build in parallel without overlap.
Read first: ${B}\\contracts.json (your module entry: owned tables, endpoints, jobs, exports, reads_from, file globs; plus shared_rules and decisions: binding), ${B}\\inv\\${id}.json (your domain's decided facts with anchors, gaps, contradictions), the inventories of the modules you read from (${B}\\inv\\Dxx.json) for their exports, and the plan.html and teknik.html passages your inventory anchors point to (${REPO}). Look at the classes in ${REPO}\\plan.html's stylesheet (rows, row, k, tag, callout, card, details, summary, code, pre, table) for the fragment.
Write ${B}\\spec\\${id}.json:
{ "id": "${id}", "module": "<module name from contracts>", "summary": "<Turkish, 3 to 6 sentences>",
  "tables": [ { "name": "", "purpose": "<Turkish>", "columns": [ { "name": "", "type": "<PostgreSQL type>", "null": false, "default": "", "note": "<Turkish>" } ], "indexes": [""], "constraints": [""] } ],
  "endpoints": [ { "method": "", "path": "", "client": "telefon|panel|kürsü|sunucu", "auth": "<who may call>", "request": { "<field>": "<type and rule>" }, "response": { "<field>": "<type>" }, "errors": ["<error code>"], "idempotency": "", "rate_limit": "" } ],
  "jobs": [ { "name": "", "schedule": "", "idempotency": "", "does": "<Turkish>" } ],
  "state_machines": [ { "name": "", "states": [""], "transitions": [ { "from": "", "to": "", "by": "", "when": "<Turkish>" } ] } ],
  "invariants": ["<Turkish: what must always hold>"],
  "exports": [ { "name": "", "signature": "<TypeScript signature>", "purpose": "<Turkish>" } ],
  "files": ["<every file you plan to create, inside your file globs>"],
  "tests": [ { "name": "<Turkish>", "kind": "behavior|property|contract|load|mutation", "asserts": "<Turkish>" } ],
  "resolved_gaps": [ { "gap": "<gap id>", "decision": "<Turkish>", "why": "<Turkish>" } ],
  "contradictions_resolved": [ { "id": "<contradiction id>", "resolution": "<Turkish>" } ],
  "open_points": [ { "id": "${id}-A01", "question": "<Turkish>", "recommendation": "<Turkish>", "needs_owner": true } ] }
Then ${B}\\frag\\${id}.html: one <section id="<module name>"> with <h2> (the Turkish title) and <h3> parts: Amaç ve sınırlar; Tablolar; Uç noktalar; İşler; Durumlar ve kurallar; Hata kodları; Testler; Netleştirilenler; Açık noktalar. Long tables go inside <details> with a <summary> that states the point in one line. Link decided facts to their plan.html or teknik.html anchors instead of restating long text.
Rules: exactly your owned tables, endpoints and jobs (a script checks both directions); talk to other modules only through the exports contracts.json lists; files only inside your globs; resolve every gap and contradiction of your inventory: either a decision with a reason, or an open point with a recommendation when it changes a product decision or needs the owner; never contradict plan.html or teknik.html silently. Plain Turkish, never U+2013 or U+2014, no KVKK, timelines, sponsors or phase re-staging. Do NOT launch sub-agents.
Validate with node ${B}\\spec-validate.js ${id} until it prints OK. Return the compact summary.`

const RET = { type: 'object', properties: { id: { type: 'string' }, validator: { type: 'string' }, open_points: { type: 'integer' }, resolved: { type: 'integer' }, notes: { type: 'array', items: { type: 'string' } } }, required: ['id', 'validator'] }
const res = await parallel(IDS.map(id => () => agent(prompt(id), { label: `design:${id}`, phase: 'Design', schema: RET })))
return { res }
