export const meta = {
  name: 'design-blind-critics',
  description: 'Three harsh blind critics judge the three İÜ Yoklama design directions under shuffled labels against the frozen rubric',
  phases: [{ title: 'Judge', detail: '3 blind critics, shuffled labels' }],
}

const S = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r16\design`
const CRITICS = ['c1', 'c2', 'c3']

const DIM = { type: 'object', properties: { score: { type: 'number' }, why: { type: 'string' } }, required: ['score', 'why'] }
const VERDICT = {
  type: 'object',
  properties: {
    critic: { type: 'string' },
    directions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          owner_constraints: { type: 'object', properties: { pass: { type: 'boolean' }, failures: { type: 'array', items: { type: 'string' } } }, required: ['pass', 'failures'] },
          blue_usage: DIM, status_semantics: DIM, typography: DIM, shape_elegance: DIM, motion: DIM, components: DIM, screens: DIM, accessibility: DIM, visual_quality: DIM,
          overall: { type: 'number' },
          wow: { type: 'boolean' },
          defects: { type: 'array', items: { type: 'string' } },
        },
        required: ['label', 'owner_constraints', 'blue_usage', 'status_semantics', 'typography', 'shape_elegance', 'motion', 'components', 'screens', 'accessibility', 'visual_quality', 'overall', 'wow', 'defects'],
      },
    },
    winner: { type: 'string' },
    why_winner: { type: 'string' },
    best_blue_usage: { type: 'string' },
    grafts: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, what: { type: 'string' }, why: { type: 'string' } }, required: ['from', 'what', 'why'] } },
    must_fix_in_winner: { type: 'array', items: { type: 'string' } },
    none_wows: { type: 'string' },
  },
  required: ['critic', 'directions', 'winner', 'why_winner', 'best_blue_usage', 'grafts', 'must_fix_in_winner'],
}

const prompt = c => `You are a harsh senior design critic. Your job is to reject. You judge three design directions for İÜ Yoklama, a Turkish university attendance app (phone app plus web panel), labelled X, Y and Z in an order that tells you nothing. You did not build any of them and you must not look for their authors' reasoning.

Read: ${S}\\context.md (the owner's words verbatim, the locks, the fact-checker corrections), ${S}\\rubric.md (the frozen rubric), ${S}\\brief.md (screens and exact status names).
Your folder: ${S}\\blind\\${c}\\ with X, Y and Z. Each has specimen.html, tokens.json, tokens.check.json (contrast, color vision and spring numbers from a script), contrast.html, and shots\\ (screenshots at 390 and 1440 px, reduced-motion runs, hover probes, element shots, report.json with console errors, overflow, a motion audit and the midnight-blue coverage per screen). Look at the screenshots yourself with the Read tool, all of them that matter. You may run node ${S}\\shot.js <specimen.html> <your own out dir under ${S}\\blind\\${c}\\probe> --widths 390,1440 --hover "<selectors>" --elements "<selectors>" for extra probes, and node ${S}\\coverage.js <png> to measure color families. Do not open anything under ${S}\\variants.

Judge against the analogs too: IBM Carbon, Apple HIG, Material 3, Vercel Geist, Linear. Score each dimension 1 to 10 with a concrete reason that names what you saw (element, screen, value):
- blue_usage: does it answer the owner's question "gece mavisini nasıl ve nerede kullanacağız" so that gray and off-white clearly dominate and midnight blue reads as an undertone, yet the blue carries meaning where it appears? Check the measured coverage numbers against the stated budget.
- status_semantics: the real statuses from brief.md, no yellow or green, icon plus label, distinguishable.
- typography, shape_elegance (sharp corners yet elegant), motion (token set and how the demos feel: hover, press, open and close, reduced motion), components (every state), screens (phone and panel, real Turkish content), accessibility (contrast table, focus, targets, reduced motion), visual_quality (would this stand next to the analogs?).
owner_constraints: pass only if O1 to O7, O3b and O3c all hold; list each failure.
"Acceptable" or "pretty good" is a failing grade: give 7 or less. Give 9 or 10 only if you are genuinely impressed. wow = true only if you would show it to the owner as is.

Then pick the winner, name the best midnight-blue usage map (it may come from a different direction than the overall winner), list concrete grafts from the others (what exactly, why), and list everything that must be fixed in the winner. If none of them wows you, say exactly what is missing in none_wows.
Never write U+2013 or U+2014. Do NOT launch sub-agents. Return the structured verdict.`

const verdicts = await parallel(CRITICS.map(c => () => agent(prompt(c), { label: `critic:${c}`, phase: 'Judge', schema: VERDICT })))
return { verdicts }
