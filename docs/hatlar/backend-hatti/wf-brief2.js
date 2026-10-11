export const meta = {
  name: 'backend-phase-briefings',
  description: 'Rewrite the 21 phase briefings against a fixed rubric: true, every package named, steerable decisions, readable; cold critic, up to two fix rounds',
  phases: [{ title: 'Brief', detail: '11 writers (phases in pairs), cold critic, fix and recheck up to twice' }],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const pad = n => String(n).padStart(2, '0')
const GROUPS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21]]
const files = g => g.map(n => `${B}\\ozet\\asama-${pad(n)}.json`).join(', ')
const inputs = `${B}\\ozet\\asamalar.json (each phase: its packages and what each waits on), ${B}\\packages\\Dxx.json (each package: title, notes, tables, endpoints, jobs, exports, needs, tests), ${B}\\spec\\Dxx.json (what those endpoints, jobs, exports and rules do), ${B}\\contracts.json (module titles) and ${REPO}\\plan.html (product words and decided facts)`
const RUBRIC = `The reader is the person who decides what is built. Before each phase starts they read its briefing and say what to change. They asked for one or two paragraphs per phase. Rubric, fixed:
R1 True: every function the text says this phase builds is built by a package of this phase. Something built in another phase is either left out or clearly marked as earlier or later. Product facts match plan.html.
R2 Every package of the phase is named at least once by its id in parentheses, attached to what it does (ids may be grouped: "(D05-P03, D07-P02)"). The gate checks this.
R3 Paragraph one: what works at the end of this phase that did not before, as functions and behaviour in product words (öğrenci telefonu, hoca, panel, yönetici, gece işi, kayıt, karar, düzeltme, rapor). Paragraph two: the decisions built into this phase that the reader may want to change (a limit, a time, a rule, an order of events), each with its package id, and how the phase is proven (which behaviour the tests pin). Not every rule: the ones a decider would care about.
R4 Readable: whole sentences in plain Turkish, grouped by theme, no stacked lists of numbers, at most two mentions of other phases. Never "altyapı hazırlanır" without saying which and what it allows.
Format: { "asama": N, "baslik": "<2 to 8 words>", "paragraflar": ["<p1>", "<p2>"] }, 100 to 320 words, plain text, never U+2013 or U+2014, never the stem "sahip", never "kullanıcı".`

const write = g => `Write the build briefing${g.length > 1 ? 's' : ''} for phase${g.length > 1 ? 's' : ''} ${g.join(' and ')} of the İÜ Yoklama server, replacing ${files(g)}. Read ${inputs}. The previous version was rejected; the critic's points are in ${g.map(n => `${B}\\ozet\\eski-sorunlar-${pad(n)}.json`).join(', ')}. Use them only to learn which facts were wrong (what a package really does, which phase builds what); the old versions tried to list every rule and became unreadable, so do not copy that style.
${RUBRIC}
Do NOT launch sub-agents. Run node ${B}\\ozet-validate.js N for each phase until OK. Return {phases: [N], validator}.`
const critic = g => `You are a cold, harsh critic of the build briefing${g.length > 1 ? 's' : ''} ${files(g)} of the İÜ Yoklama server. You did not write them. Read ${inputs}.
${RUBRIC}
Judge each briefing only against R1 to R4. FAIL for any false or misplaced claim (R1), any package named with a function it does not build (R2), a paragraph a decider cannot act on, or an important steerable decision of the phase missing from paragraph two (R3, name it), or unreadable text (R4). Do not fail it for leaving out details that are not decisions a reader would steer; those live in the package list. Each problem must say exactly what to change. Do NOT edit files. Do NOT launch sub-agents. Return {verdicts: [{asama, ok, problems}]}.`
const fix = (g, problems) => `Revise the build briefing${g.length > 1 ? 's' : ''} ${files(g)} of the İÜ Yoklama server. A cold critic rejected them; problems (JSON): ${JSON.stringify(problems)}. Read ${inputs}.
${RUBRIC}
Fix every problem without breaking the rubric. Do NOT launch sub-agents. Run node ${B}\\ozet-validate.js N for each phase until OK. Return {phases: [N], validator}.`

const BRF = { type: 'object', properties: { phases: { type: 'array', items: { type: 'integer' } }, validator: { type: 'string' } }, required: ['phases', 'validator'] }
const VER = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { asama: { type: 'integer' }, ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } }, required: ['asama', 'ok', 'problems'] } } }, required: ['verdicts'] }

phase('Brief')
const out = await pipeline(GROUPS,
  g => agent(write(g), { label: `write:${g.join('-')}`, phase: 'Brief', schema: BRF }),
  async (w, g) => {
    const rounds = []
    let v = await agent(critic(g), { label: `critic:${g.join('-')}`, phase: 'Brief', schema: VER })
    rounds.push(v)
    for (let r = 1; r <= 2; r++) {
      const bad = ((v && v.verdicts) || []).filter(x => !x.ok)
      if (!bad.length) break
      await agent(fix(g, bad), { label: `fix${r}:${g.join('-')}`, phase: 'Brief', schema: BRF })
      v = await agent(critic(g), { label: `recheck${r}:${g.join('-')}`, phase: 'Brief', schema: VER })
      rounds.push(v)
    }
    return { g, rounds: rounds.map(x => ((x && x.verdicts) || []).map(y => ({ asama: y.asama, ok: y.ok, n: y.problems.length }))), last: v }
  })
return { out }
