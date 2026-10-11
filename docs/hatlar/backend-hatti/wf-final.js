export const meta = {
  name: 'backend-clean-and-brief',
  description: '15 modules remove the sahip stem from their prose; then 21 phase briefings are written, checked cold and fixed',
  phases: [
    { title: 'Clean', detail: '15 modules, own spec, section, packages text and generator' },
    { title: 'Brief', detail: '11 writers (phases in pairs), each checked by a cold critic, fixed when rejected' },
  ],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const IDS = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']
const GEN = { D01: 'd01work', D02: 'd02work', D03: 'd03work', D04: 'D04work', D05: 'D05work', D06: 'd06_spec_work', D07: 'd07spec', D08: 'd08', D09: 'd09work', D10: 'd10work', D11: 'd11work', D12: 'd12work', D13: 'd13work', D14: 'work-D14', D15: 'd15work' }
const pad = n => String(n).padStart(2, '0')

const clean = id => `You own module ${id} of the İÜ Yoklama server design: ${B}\\spec\\${id}.json, ${B}\\frag\\${id}.html and the text fields (title, notes) of ${B}\\packages\\${id}.json. Your generator scripts are in ${B}\\${GEN[id]}; if a script there writes your spec or section, change its source and regenerate so script and files stay identical, otherwise edit the files directly.
Writing rule for these documents: the word stem "sahip" (sahip, sahibi, sahibin, sahibe, sahiplik, sahiplenir, sahipsiz and every other form) never appears, and the documents never speak about the person who decides in the third person. Code identifiers that contained it are already renamed (for example hoca_kisi_id, hocaAtamaGecmisi, yoklama_goc); keep those as they are. Rewrite every remaining occurrence in prose, keeping the meaning exactly:
- Module or table responsibility: "D02'nin tablosu", "tabloyu yalnız D02 yazar", "sorumlu modül", "öğe türünün modülü", "işi kuran modül".
- The hoca who gives a course: "dersin hocası" (plan.html says "o dersin hocası").
- A decision waiting for approval: impersonal, for example "onay bekliyor (Açık noktalar, ${id}-Axx)", "karar verilene kadar önerilen değer geçerlidir", "bu bir ürün kararı değildir". Never "sahibe sorulur", "sahibin onayı", "sahibin kararı".
- Other uses (a database role that owns the schema, a domain name, an account): name the thing itself, for example "şemayı kuran yoklama_goc rolü", "alan adı İÜ'nündür".
Change only wording. Do not change ids, depends_on, needs, files, exports, tables, endpoints, jobs or tests. Plain Turkish, never U+2013 or U+2014.
Run until all three print OK: node ${B}\\sahip-check.js ${id}; node ${B}\\spec-validate.js ${id}; node ${B}\\schedule.js --check ${id}. Do NOT launch sub-agents. Return {id, rewritten, generator_in_sync, validator}.`

const GROUPS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21]]
const inputs = `${B}\\ozet\\asamalar.json (each phase: its packages and what each waits on), ${B}\\packages\\Dxx.json (each package: title, notes, tables, endpoints, jobs, exports, needs, tests), ${B}\\spec\\Dxx.json (what those endpoints, jobs, exports and rules do), ${B}\\contracts.json (module titles), and ${REPO}\\plan.html for the product words (öğrenci, hoca, yönetici, panel, telefon, yoklama, düzeltme, rapor)`
const brief = g => `Write the build briefings for phase${g.length > 1 ? 's' : ''} ${g.join(' and ')} of the İÜ Yoklama server. Before any phase starts, the person who decides reads its briefing and changes what should change, so the briefing must say plainly which functions this phase builds. Read ${inputs}.
For each phase write ${B}\\ozet\\asama-NN.json (NN two digits): { "asama": N, "baslik": "<2 to 8 words naming what the phase delivers>", "paragraflar": ["<paragraph>", "<optional second paragraph>"] }.
Content, 90 to 280 words in total: what works at the end of the phase that did not work before, told as functions and behaviour (what an öğrenci telefonu, a hoca, the panel, a yönetici or a night job can now do, which records and decisions the server now keeps), the rules and guards built in this phase and how they are proven by tests, and what it prepares for later phases. Name modules by their Turkish titles. Package ids (like D05-P03) may appear in parentheses where they help point at something to change; only ids of this phase. Not a file list. No vague lines like "altyapı hazırlanır": say which infrastructure and what it allows.
Plain Turkish, plain text (no markup), never U+2013 or U+2014, never the stem "sahip", never "kullanıcı". Do NOT launch sub-agents. Run node ${B}\\ozet-validate.js N for each phase until OK. Return {phases: [N], validator}.`
const critic = g => `You are a cold, harsh critic of the build briefings for phase${g.length > 1 ? 's' : ''} ${g.join(' and ')} of the İÜ Yoklama server: ${g.map(n => `${B}\\ozet\\asama-${pad(n)}.json`).join(', ')}. You did not write them. The person who decides will read each briefing before the phase starts and must be able to say "change this" from it. Read ${inputs}.
Reject a briefing for any of: a function claimed that no package of that phase builds (built earlier or later is a FAIL unless the text says so); an important function of the phase left out (an endpoint, job, rule or guard a reader would want to steer); vague wording a non-engineer cannot act on; wrong product words against plan.html; more than two paragraphs. "Acceptable" is a FAIL. Do NOT edit files. Do NOT launch sub-agents. Return {verdicts: [{asama, ok, problems: ["<concrete problem and the fix>"]}]}.`
const fix = (g, problems) => `Revise the build briefings ${g.map(n => `${B}\\ozet\\asama-${pad(n)}.json`).join(', ')} of the İÜ Yoklama server. A cold critic rejected them with these problems (JSON): ${JSON.stringify(problems)}. Read ${inputs}, fix every problem without breaking the rules: 90 to 280 words, one or two paragraphs, functions and behaviour not files, only this phase's package ids, plain Turkish, no markup, never U+2013 or U+2014, never the stem "sahip", never "kullanıcı". Do NOT launch sub-agents. Run node ${B}\\ozet-validate.js N for each phase until OK. Return {phases: [N], validator}.`

const CLN = { type: 'object', properties: { id: { type: 'string' }, rewritten: { type: 'integer' }, generator_in_sync: { type: 'boolean' }, validator: { type: 'string' } }, required: ['id', 'validator'] }
const BRF = { type: 'object', properties: { phases: { type: 'array', items: { type: 'integer' } }, validator: { type: 'string' } }, required: ['phases', 'validator'] }
const VER = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { asama: { type: 'integer' }, ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } }, required: ['asama', 'ok', 'problems'] } } }, required: ['verdicts'] }

phase('Clean')
const cleaned = await parallel(IDS.map(id => () => agent(clean(id), { label: `clean:${id}`, phase: 'Clean', schema: CLN })))
phase('Brief')
const briefs = await pipeline(GROUPS,
  g => agent(brief(g), { label: `brief:${g.join('-')}`, phase: 'Brief', schema: BRF }),
  (w, g) => agent(critic(g), { label: `critic:${g.join('-')}`, phase: 'Brief', schema: VER }),
  async (v, g) => {
    const bad = ((v && v.verdicts) || []).filter(x => !x.ok)
    if (!bad.length) return { g, first: v, fixed: null }
    const f = await agent(fix(g, bad), { label: `fix:${g.join('-')}`, phase: 'Brief', schema: BRF })
    const v2 = await agent(critic(g), { label: `recheck:${g.join('-')}`, phase: 'Brief', schema: VER })
    return { g, first: v, fixed: f, second: v2 }
  })
return { cleaned, briefs }
