export const meta = {
  name: 'backend-phase-briefings-truth',
  description: 'Fix every truth and readability problem in the 21 phase briefings; missing decisions become advice (top two added); cold recheck, one more fix round',
  phases: [{ title: 'Brief', detail: '11 groups: fix, cold critic, fix and recheck once more' }],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const pad = n => String(n).padStart(2, '0')
const GROUPS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21]]
const files = g => g.map(n => `${B}\\ozet\\asama-${pad(n)}.json`).join(', ')
const inputs = `${B}\\ozet\\asamalar.json (each phase: its packages and what each waits on), ${B}\\packages\\Dxx.json (each package: title, notes, tables, endpoints, jobs, exports, needs, tests), ${B}\\spec\\Dxx.json (what those endpoints, jobs, exports and rules do), ${B}\\contracts.json (module titles) and ${REPO}\\plan.html (product words and decided facts)`
const RUBRIC = `The reader decides what is built and asked for one or two paragraphs per phase, read before the phase starts. Rubric, fixed:
R1 True (hard): every function the text says this phase builds is built by a package of this phase; what comes earlier or later is left out or clearly marked so. A package that only writes a pure rule, a format or a type must not read as a working feature. Product facts, numbers and words match plan.html and the specs exactly.
R2 Every package of the phase is named by its id in parentheses, attached to what it really does (ids may be grouped). The gate checks the ids.
R3 Paragraph one: what works at the end of this phase that did not before, in product words. Paragraph two: the few decisions in this phase a decider would most likely want to change (a limit, a time, a rule), each with its package id, and which behaviour the tests pin. It cannot hold every decision; the module sections and Açık noktalar hold the rest. A missing decision is ADVICE, not a failure.
R4 Readable (hard): whole sentences in plain Turkish, grouped by theme, no stacked lists of numbers, at most two mentions of other phases; a term the reader cannot know (a letter like T or p, an internal name) is explained or left out.
Format: { "asama": N, "baslik": "<2 to 8 words>", "paragraflar": ["<p1>", "<p2>"] }, 100 to 320 words, plain text, never U+2013 or U+2014, never the stem "sahip", never "kullanıcı".`
const fix = (g, problems) => `Revise the build briefing${g.length > 1 ? 's' : ''} ${files(g)} of the İÜ Yoklama server. Read ${inputs}.
${RUBRIC}
A cold critic's problems: ${typeof problems === 'string' ? problems : JSON.stringify(problems)}. Fix every R1, R2 and R4 problem fully; check each against the package and spec yourself, because a critic can be wrong too (if it is, keep the true text). Of the "missing decision" (R3) points, add at most the two most important per phase, and drop detail elsewhere to stay within 320 words. Do NOT launch sub-agents. Run node ${B}\\ozet-validate.js N for each phase until OK. Return {phases: [N], validator}.`
const critic = g => `You are a cold, harsh critic of the build briefing${g.length > 1 ? 's' : ''} ${files(g)} of the İÜ Yoklama server. You did not write them. Read ${inputs}.
${RUBRIC}
ok is false only for an R1, R2 or R4 problem; verify each one against the package, spec and plan.html before you report it. List missing decisions separately as advice. Each problem says exactly what to change. Do NOT edit files. Do NOT launch sub-agents. Return {verdicts: [{asama, ok, problems, advice}]}.`

const BRF = { type: 'object', properties: { phases: { type: 'array', items: { type: 'integer' } }, validator: { type: 'string' } }, required: ['phases', 'validator'] }
const VER = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { asama: { type: 'integer' }, ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } }, advice: { type: 'array', items: { type: 'string' } } }, required: ['asama', 'ok', 'problems'] } } }, required: ['verdicts'] }

phase('Brief')
const out = await pipeline(GROUPS,
  g => agent(fix(g, `in ${B}\\ozet\\son-hukumler.json, keys ${g.join(' and ')} (field problems)`), { label: `fix0:${g.join('-')}`, phase: 'Brief', schema: BRF }),
  async (w, g) => {
    const rounds = []
    let v = await agent(critic(g), { label: `critic:${g.join('-')}`, phase: 'Brief', schema: VER })
    rounds.push(v)
    const bad = ((v && v.verdicts) || []).filter(x => !x.ok)
    if (bad.length) {
      await agent(fix(g, bad.map(x => ({ asama: x.asama, problems: x.problems }))), { label: `fix1:${g.join('-')}`, phase: 'Brief', schema: BRF })
      v = await agent(critic(g), { label: `recheck:${g.join('-')}`, phase: 'Brief', schema: VER })
      rounds.push(v)
    }
    return { g, rounds: rounds.map(x => ((x && x.verdicts) || []).map(y => ({ asama: y.asama, ok: y.ok, n: y.problems.length }))), last: v }
  })
return { out }
