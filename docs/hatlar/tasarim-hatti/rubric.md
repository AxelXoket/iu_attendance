# Frozen rubric: İÜ Yoklama design document and research file

Frozen on 6 October 2026, before any building. Builders cannot change it or write their own exam.

## Reference analogs (judge side by side)
- IBM Carbon Design System documentation: a sharp-corner system with documented color, type, spacing and motion tokens (productive and expressive motion).
- Apple Human Interface Guidelines: foundations (color, typography, motion, layout) and platform conventions.
- Material Design 3 documentation: token tables, motion physics with springs.
- Vercel Geist: restraint, precision, neutral scale with one accent.
- Linear: calm neutral surfaces and precise, quick motion.

## Owner constraints (any miss is a FAIL)
- O1. Base is off-white ("kırık beyaz"): a little darker than pure white and never cream or yellow. Measurable: page background OKLCH L between 0.955 and 0.985; chroma at most 0.012; when chroma is above 0.003 the hue lies between 200 and 290 degrees; CIELAB b* at most 0.
- O2. Gray tones carry the rest of the neutral UI.
- O3. Undertone: midnight blue ("gece mavisi"). Amended 6 October 2026 by the owner's live instruction ("hiçbir şekilde sarı ya da yeşil olmayacak ... bahsedilen renkler kilitlenmeli"): the palette in locked.json is fixed and used exactly; no alternative undertones are shown.
- O3b. No yellow and no green anywhere (chroma above 0.02 with hue between 35 and 220 is banned), including success, warning, statuses, charts and the documents themselves. Script-checked by tcheck.js and dgate.js.
- O3c. Added 6 October 2026 by the owner ("gece mavisi alt ton olacak, ana tonlar gri ve kırık beyaz ... gece mavisini nasıl ve nerede kullanacağımızı düşünmemiz lazım"): gray and off-white dominate every screen; midnight blue is an undertone. The document states where midnight blue appears (role, place, step, reason), where it never appears, and a per-screen coverage budget measured by coverage.js on the rendered screens; every rendered screen meets its budget.
- O4. Angular, sharp corners, yet elegant. Measurable: every component radius is at most 2 px, stated per component; exceptions only where the operating system draws its own UI.
- O5. Smooth animation for every interactive element: hover (pointer devices), press, focus, open and close of buttons, panels, menus, sheets, dialogs, toasts, tabs, switches, lists. Each has a duration, a curve or spring, and a reduced-motion behavior.
- O6. Panel-specific animations are explicitly deferred to a later conversation and listed as an open point; general open and close rules are defined now.
- O7. Two separate files: the design document (tasarim.html in the repository) and the research file (outside the repository).

## Design document acceptance criteria
- D1. Every token has an exact value: color (OKLCH and hex), type (family, size, line height, weight, tracking), spacing, radius, border, elevation, duration (ms), easing (cubic-bezier), spring (Reanimated parameters plus a CSS fallback).
- D2. Contrast for every text and UI pair defined by the tokens is computed by script and shown: text at least 4.5:1 (large text at least 3:1); UI components and focus indicators at least 3:1 (WCAG 2.2: 1.4.3, 1.4.11).
- D3. Semantic layer: tokens are named by role (background, surface, border, text, accent, focus, status) so a dark theme or another undertone is a value swap.
- D4. Attendance statuses never rely on color alone (icon plus text) and stay distinguishable under protan, deutan and tritan simulation (script check).
- D5. Motion: duration scale, easing set, spring set; a per-interaction table; rules (what animates and what does not, interruptibility, origin-aware, exit faster than enter, frequent actions stay minimal); performance rules (transform and opacity, UI thread); reduced-motion mapping per pattern; hover only on pointer devices, press feedback on touch.
- D6. Platform mapping: iOS (current version and its system UI), Android (current Material, predictive back, edge-to-edge), web panel (hover, focus-visible, keyboard).
- D7. Typography: one family with full Turkish support, its license, weights, a scale for phone and panel, tabular numbers, Turkish casing rules.
- D8. Components, each shown live with the tokens: buttons (all variants and states), text input, list row, status chip, card or panel, bottom sheet, dialog, toast or banner (including the offline banner), tabs, switch, table (panel).
- D9. Screen examples rendered with the tokens: the student check-in flow (home, scan, success), the instructor QR screen, one panel screen.
- D10. Live demos work: hover, press, focus-visible, open and close; prefers-reduced-motion respected; zero console errors; renders with no network (fonts embedded or a documented fallback); readable at 390 px and 1440 px without horizontal page scroll.
- D11. Every decision has a reason and a source (research file entry or external link); nothing duplicates plan.html or teknik.html (link instead); no contradiction with them.
- D12. Turkish: plain, consistent terms, the plan's voice; zero U+2013 or U+2014; none of the banned words.
- D13. A developer reading cold could implement the theme and motion without asking a question. The first confusion is a FAIL.
- D14. Visual quality: a critic comparing screenshots with the analogs must judge it on par or better. "Acceptable" or "pretty good" is a FAIL.

## Research file acceptance criteria
- R1. Covers color, motion, interaction patterns, shape and layout, typography, best-selling and award-winning app UIs, international forums, Turkish forums and app reviews, platform rules, accessibility, implementation path, modern trends, data display and microcopy.
- R2. Every finding has at least one source link; load-bearing findings show their verification result.
- R3. Forum signals are paraphrased, quotes under 15 words, with date and link.
- R4. Each design decision in tasarim.html maps to research entries (a traceability table).
- R5. Turkish, no dashes, no banned words.

## Measurable outcomes
- M1. The owner can pick the undertone and approve the direction in one sitting (alternatives rendered live side by side).
- M2. 100% of the defined token pairs meet the contrast thresholds (script output).
- M3. Zero console errors, zero dashes, all internal links resolve (gate script).
