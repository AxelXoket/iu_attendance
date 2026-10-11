export const meta = {
  name: 'design-tournament',
  description: 'Three competing designers each build a full İÜ Yoklama design direction (tokens plus a live specimen) from the verified research',
  phases: [
    { title: 'Build', detail: '3 competing design directions' },
  ],
}

const S = String.raw`C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r16\design`

const LOCKNOTE = `The palette is LOCKED by the owner (see the "Owner lock" section of context.md and locked.json): copy the neutral and accent scales exactly, page #F2F4F8, primary fill #143065, focus and links #2B58B1. No yellow and no green anywhere (chroma above 0.02 with hue 35 to 220 is banned, also in the specimen's own CSS and SVG). Success uses the midnight-blue family; warning uses reds or violets; every status is icon plus label first. Use the real status names from brief.md section 4 (Var, Yok, Görevli, Belgeli düzeltme, Elle eklendi, Devamdan muaf; sunucu kararları Var, Beklemede, İncelemede, Ret; makbuz "Telefonda kayıtlı, gönderilmedi" and "Sunucuya ulaştı"; the four warning levels). Directions differ in everything except the locked colors.`
const BLUENOTE = `The owner's latest words: "gece mavisi alt ton olacak, ana tonlar gri ve kırık beyaz dediğimiz gibi, gece mavisini nasıl ve nerede kullanacağımızı düşünmemiz lazım". Gray and off-white are the main tones; midnight blue is an undertone. WHERE and HOW midnight blue appears is the main question your direction answers. Fill accentUsage, accentNever and coverageBudget in tokens.json, and give the specimen a section "Gece mavisi nerede" that shows the usage map, the never list and the measured share of midnight blue on every phone screen and on the panel screen (shot.js --elements with one selector per screen; report the numbers it prints).`
const DIRECTIONS = [
  { id: 'A', brief: `Direction A, "Kesin" with midnight blue as INK: Swiss and Carbon rigor; IBM Plex Sans with a matching mono for codes; 0 px radius everywhere; hairline borders; no shadows except on overlays; a strict 4 and 8 point grid; dense but clear; productive motion (quick, almost no overshoot). Midnight blue lives as ink: the one primary action per screen is filled with #143065 and key figures may be set in it; selection and active states use neutral fills with a small navy mark; no tinted backgrounds anywhere. ${BLUENOTE} ${LOCKNOTE}` },
  { id: 'B', brief: `Direction B, "Sakin" with midnight blue as LINE: the calm of Linear and Things; Inter with tabular figures; 2 px radius on interactive controls only; generous spacing; tonal layering of the locked neutrals; a faint navy-tinted shadow only on overlays; smooth critically damped springs. Midnight blue appears only as lines and small marks: focus ring, active tab underline, selected row bar, progress line, checkmarks, links. Decide and justify whether primary buttons are navy-filled or dark neutral; either way the screen must read gray and off-white. ${BLUENOTE} ${LOCKNOTE}` },
  { id: 'C', brief: `Direction C, free typography with midnight blue as MOMENT: choose a typographic strategy from the research that A and B do not use (for example an editorial contrast for large titles, or Geist-like monochrome precision) and justify it. Midnight blue is almost absent from everyday screens (focus and links only) and is reserved for one or two meaningful moments, for example the check-in success or the live QR session, where it may briefly cover a larger area. Justify the moments from the research and give them explicit exceptions in coverageBudget. ${BLUENOTE} ${LOCKNOTE}` },
]

const prompt = d => `You are one of three competing senior product designers. Build one complete design direction for İÜ Yoklama. Harsh critics will judge the three directions blind, against ${S}\\rubric.md and against best-in-class analogs (IBM Carbon, Apple HIG, Material 3, Vercel Geist, Linear). "Acceptable" loses. Aim to make the owner say "this is it".

Read first: ${S}\\context.md (the owner's words, verbatim, the locks and the fact-checker corrections; follow every word), ${S}\\brief.md (screens, flows, exact Turkish status names), ${S}\\digest-short.md (verified research: summaries, recommendations, load-bearing findings; a finding marked kısmen or eskimiş is corrected by its note), ${S}\\digest-lib-short.md (the final library stack, settled by an adversarial critic), ${S}\\rubric.md, ${S}\\token-schema.md, ${S}\\locked.json. For details, search ${S}\\digest.md and ${S}\\digest-lib.md with grep instead of reading them whole.

${d.brief}

Deliverables in ${S}\\variants\\${d.id}\\ :
1. tokens.json following token-schema.md. Compute every color with node ${S}\\color.js, every spring's CSS fallback with node ${S}\\spring.js. Run node ${S}\\tcheck.js ${S}\\variants\\${d.id}\\tokens.json --css ${S}\\variants\\${d.id}\\tokens.css --table ${S}\\variants\\${d.id}\\contrast.html until it prints PASS. Map decisions to research ids in "sources".
2. specimen.html: one self-contained page in Turkish (no network at all: inline CSS and JS, include the generated tokens.css, embed fonts with node ${S}\\fontget.js <fontsource package> "<family>" <out.css> and inline that CSS). It must show, using only your tokens:
   - the locked neutral and accent scales, your status colors and every status chip from brief.md section 4 (icon plus label plus color), the warning levels, and the receipt states;
   - the type scale for phone and panel with real Turkish text (include İ ı ğ ş ç ö ü, a 10-digit student number, a percentage);
   - shape, borders, elevation, spacing and icon samples (draw icons as inline SVG in the chosen set's style);
   - live components with every state: buttons (primary, secondary, ghost, danger; hover, pressed, focus-visible, disabled, loading), text input (focus, error), a 6-digit e-mail code input, list row, switch, tabs with a moving indicator, a menu or popover that opens and closes, a dialog that opens and closes, a bottom sheet that opens and closes inside a phone frame, a toast, the offline banner, a panel data table row with hover;
   - phone screens inside phone frames: student home, QR scanning, check-in success (a short success animation), instructor QR screen; and one web panel screen (attendance table);
   - the motion tokens: easing curves drawn as SVG and a way to replay them, spring presets with their settle time and overshoot from spring.js.
   Rules: hover styles only inside @media (hover: hover) and (pointer: fine); press feedback through :active; :focus-visible rings at least 2 px; every interactive element animates according to your motion tokens; prefers-reduced-motion replaces movement with short cross-fades or nothing; animate transform and opacity only, never layout properties; component border-radius at most 2 px (a phone frame drawing may be rounded because it depicts hardware: give it a class containing "device"). The page must look like a top-tier design system page, not a demo.
3. rationale.md (Turkish, at most 1200 words): the idea of the direction and each major decision with its research ids. Critics will not see this file.
4. Verify: node ${S}\\shot.js ${S}\\variants\\${d.id}\\specimen.html ${S}\\variants\\${d.id}\\shots --widths 390,1440 --sections --reduced --hover "<three CSS selectors of buttons, separated by |>" and node ${S}\\dgate.js ${S}\\variants\\${d.id}\\specimen.html. Fix until: zero console errors and exceptions, no horizontal overflow, every interactive element has motion (withMotion equals interactive), maxRadius at most 2, hover probes changed, dgate PASS. Then open your own screenshots with the Read tool and fix every visual flaw you see: alignment, spacing rhythm, clipping, weak hierarchy, cramped phone screens, anything that looks generic.
Never write U+2013 or U+2014 anywhere. Turkish text plain, no marketing words. Do NOT launch sub-agents.
Return the compact summary.`

const RET = {
  type: 'object',
  properties: {
    id: { type: 'string' }, undertone: { type: 'string' }, page_bg: { type: 'string' }, accent: { type: 'string' }, font: { type: 'string' },
    tcheck: { type: 'string' }, dgate: { type: 'string' }, shot: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'undertone', 'page_bg', 'accent', 'font', 'tcheck', 'dgate', 'shot'],
}

const results = await parallel(DIRECTIONS.map(d => () => agent(prompt(d), { label: `build:${d.id}`, phase: 'Build', schema: RET })))
return { results }
