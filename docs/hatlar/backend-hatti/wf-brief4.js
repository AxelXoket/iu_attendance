export const meta = {
  name: 'backend-phase-briefings-final',
  description: 'Surgical fix of the remaining named problems in 13 phase briefings, then a cold verifier checks each fix and the changed sentences',
  phases: [{ title: 'Brief', detail: 'one fixer and one verifier per phase, a second pass where the verifier still finds a problem' }],
}
const B = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r17\backend`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const pad = n => String(n).padStart(2, '0')
const PHASES = [2, 4, 5, 6, 7, 8, 11, 12, 15, 16, 18, 19, 21]
const file = n => `${B}\\ozet\\asama-${pad(n)}.json`
const inputs = `${B}\\ozet\\asamalar.json, ${B}\\packages\\Dxx.json, ${B}\\spec\\Dxx.json and ${REPO}\\plan.html`
const rules = `Rules that still hold: every package id of the phase stays named; 100 to 320 words; one or two paragraphs; plain Turkish, plain text, never U+2013 or U+2014, never the stem "sahip", never "kullanıcı"; product words as plan.html uses them; nothing from another phase presented as built here; no internal names a non-engineer cannot know.`
const fix = (n, src) => `Phase ${n} build briefing of the İÜ Yoklama server: ${file(n)}. A cold critic left named problems ${src}. Check each against ${inputs}; where the critic is right, change only the sentence it names (keep every other sentence as it is, so nothing new breaks); where it is wrong, leave the text. ${rules} Do NOT launch sub-agents. Run node ${B}\\ozet-validate.js ${n} until OK. Return {asama, changed, rejected_as_wrong, validator}.`
const verify = (n, src) => `You verify one fix, coldly. Phase ${n} build briefing of the İÜ Yoklama server: ${file(n)}. The problems it had are ${src}; the earlier version is ${B}\\ozet\\r3\\asama-${pad(n)}.json. Read ${inputs}.
Check (a) each named problem is fixed in the current text, or the critic was wrong (say why, with the spec or plan line), and (b) every sentence that changed between the two versions is true for this phase and readable: ${rules} Do not raise anything else. Do NOT edit files. Do NOT launch sub-agents. Return {asama, ok, problems}.`
const FIX = { type: 'object', properties: { asama: { type: 'integer' }, changed: { type: 'integer' }, rejected_as_wrong: { type: 'integer' }, validator: { type: 'string' } }, required: ['asama', 'validator'] }
const VER = { type: 'object', properties: { asama: { type: 'integer' }, ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } }, required: ['asama', 'ok', 'problems'] }
phase('Brief')
const out = await pipeline(PHASES,
  n => agent(fix(n, `in ${B}\\ozet\\son-hukumler3.json under key "${n}" (field problems)`), { label: `fix:${n}`, phase: 'Brief', schema: FIX }),
  async (f, n) => {
    const src = `in ${B}\\ozet\\son-hukumler3.json under key "${n}" (field problems)`
    let v = await agent(verify(n, src), { label: `verify:${n}`, phase: 'Brief', schema: VER })
    const first = v
    if (v && !v.ok) {
      await agent(fix(n, `listed here (JSON): ${JSON.stringify(v.problems)}`), { label: `fix2:${n}`, phase: 'Brief', schema: FIX })
      v = await agent(verify(n, `listed here (JSON): ${JSON.stringify(v.problems)}`), { label: `verify2:${n}`, phase: 'Brief', schema: VER })
    }
    return { n, first: first && { ok: first.ok, k: first.problems.length }, last: v }
  })
return { out }
