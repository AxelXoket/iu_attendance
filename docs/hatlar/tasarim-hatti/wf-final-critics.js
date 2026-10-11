export const meta = {
  name: 'design-doc-critics',
  description: 'Five cold critics review the finished tasarim.html and the research file from five non-overlapping angles',
  phases: [{ title: 'Review', detail: '5 cold critics' }],
}

const S = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r16\design`
const REPO = String.raw`C:\Users\USER\Desktop\iu_attendance`
const R = (args && args.round) || 1

const COMMON = `You are a cold, harsh reviewer. You did not build anything here and you will not read anyone's reasoning or notes. Your job is to find what is wrong.
The deliverables: ${S}\\out\\tasarim.html (the design document of İÜ Yoklama, a Turkish university attendance app: phone app for students and instructors, web panel for instructors and admins; it will sit in the repository next to ${REPO}\\plan.html and ${REPO}\\teknik.html) and ${S}\\out\\tasarim-arastirmasi.html (the research behind it; it stays outside the repository).
The owner's words, locks and binding facts: ${S}\\context.md. The frozen rubric: ${S}\\rubric.md. Screenshots: ${S}\\out\\shots\\ (390 and 1440 px, sections, reduced motion, hover probes, element shots with the midnight-blue share in report.json). Tools you may run: node ${S}\\shot.js <html> <your out dir under ${S}\\out\\review${R}> [--widths --sections --reduced --hover "sel|sel" --elements "sel|sel"], node ${S}\\coverage.js <png>, node ${S}\\dgate.js <html> --repo ${REPO}, node ${S}\\tcheck.js <tokens.json>, node ${S}\\color.js contrast <fg> <bg>.
Do NOT launch sub-agents. Never write U+2013 or U+2014. Report each finding with severity (HIGH: breaks an owner constraint, a rubric item, a fact, or makes the document unusable; MEDIUM: a real defect a reader would hit; LOW: polish), the exact place (section id, element, quote of at most 15 words), what is wrong, and the concrete fix. No vague findings. The owner dislikes length that carries no information (tasarim.html is about 29,000 words now; plan.html is 12,500): flag every repeated fact (the same value or rule stated in two places where a link would do), filler sentences, and tables that could be shorter without losing a decision, as MEDIUM findings with the exact cut. If something is excellent, you may say so in "praise", but your verdict passes only if you would hand this to the owner today without changes.`

const ANGLES = [
  { id: 'dev', task: `ANGLE: the developer who must build this. Read tasarim.html from top to bottom as the engineer who will implement the phone theme (Expo SDK 57, React Native 0.86) and the panel styles (Vite 8, React 19, plain CSS). Try to write, in your head, the tokens module, the button, the sheet, the toast, the panel table and the motion helpers from the document alone. Every place where you would have to ask a question, guess a value, or where two places disagree, is a finding. The first real confusion is a HIGH finding. Check that every value (color, size, duration, curve, spring, radius, spacing) is exact and consistent between sections, the token tables and the live demos (inspect the page's CSS and tokens where needed).` },
  { id: 'visual', task: `ANGLE: visual quality against the best design system documentation (IBM Carbon, Apple HIG, Material 3, Vercel Geist, Linear). Look at every screenshot at 390 and 1440 px, then run your own probes for hover, open and close states and reduced motion. Judge layout rhythm, alignment, hierarchy, density, typography, the phone screens and the panel screen, the demos' motion feel, and whether gray and off-white dominate with midnight blue as an undertone exactly as the owner asked. "Acceptable" is a FAIL. Name every visual defect with a screenshot path.` },
  { id: 'owner', task: `ANGLE: the owner's constraints and the language. Check every owner constraint in context.md and rubric.md (O1 to O7, O3b, O3c): off-white not cream, gray and off-white dominant, midnight blue only as an undertone with the measured budget, the locked palette used exactly, no yellow and no green anywhere (also in the document's own chrome; run coverage.js on screenshots), sharp corners, smooth animation on everything interactive with hover only on pointer devices, panel-specific animations deferred as an open point. Then the Turkish: plain, correct, consistent terms with plan.html (status names exactly as in ${S}\\brief.md section 4), no dashes (U+2013, U+2014), no marketing words, no English filler, no KVKK, timelines, sponsors or phase re-staging. Every Turkish sentence that reads machine-made or wrong is a finding.` },
  { id: 'research', task: `ANGLE: the research file. Check tasarim-arastirmasi.html: it covers color, motion, interaction, shape and layout, typography, best-selling and award-winning app UIs, international forums, Turkish forums and app reviews, platform rules, accessibility, implementation path, modern trends, data display and microcopy, and libraries; every finding has a source link; verification results are visible; forum quotes are under 15 words with date and link; the voided recommendations are clearly marked; the introduction (section "one-cikanlar") is accurate against the data (spot-check 10 claims against the JSON in ${S}\\research, ${S}\\verify, ${S}\\lib); the traceability table maps tasarim.html's decisions to research entries and the ids resolve. Open 15 random external links with WebFetch (load it with ToolSearch "select:WebFetch") and report dead ones.` },
  { id: 'consistency', task: `ANGLE: consistency with the repository documents. Read ${REPO}\\plan.html and ${REPO}\\teknik.html (search them; they are long) and compare with tasarim.html: no contradiction (stack versions, minimum platforms, browser targets, QR rules, accessibility decision, statuses and labels, receipt states, warning texts, the native-elements decision for the panel, keep-awake, camera lens), no duplicated decision that should be a link, every plan.html#... and teknik.html#... link lands on the right place, and nothing in tasarim.html quietly changes a product decision. Where tasarim.html proposes something that would change plan.html or teknik.html, it must say so as an open point.` },
]

const FIND = {
  type: 'object',
  properties: {
    angle: { type: 'string' },
    pass: { type: 'boolean' },
    wow: { type: 'boolean' },
    score: { type: 'number' },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] }, where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'where', 'problem', 'fix'] } },
    praise: { type: 'array', items: { type: 'string' } },
  },
  required: ['angle', 'pass', 'wow', 'score', 'findings'],
}

const results = await parallel(ANGLES.map(a => () => agent(COMMON + '\n\n' + a.task, { label: `critic:${a.id}`, phase: 'Review', schema: FIND })))
return { round: R, results }
