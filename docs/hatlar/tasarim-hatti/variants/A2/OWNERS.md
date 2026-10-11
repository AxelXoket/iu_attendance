# OWNERS · variants/A2

Two owners, F1a and F1b, edit this variant at the same time. Every source file of the build has exactly one owner, so
two edits never touch the same file. `tools/ownercheck.js` reads the two owner lists below (the `- ` lines under
`## F1a` and `## F1b`); keep one path per line.

## How the build is split

- **Sections.** Each section of `tasarim.html` is one module, `tools/sections/<id>.js`. It exports a function that
  returns the section's HTML, with the navigation title as `.title`. `tools/build.js` only composes: it loads the
  fragments of `../../doc/sections`, numbers the sections and draws the side navigation, builds the sections in
  navigation order, and writes the page.
- **Shared code.** `tools/lib/` (F1a) holds what both owners' sections use: build inputs, text and token helpers,
  icons and the sprite, status marks, the phone kit, measured coverage, demo controls, section scaffolding, page
  chrome, the generated CSS, the token file in DTCG format, token references in prose (refs.js), the interaction
  patterns (motion.js), the component anatomy (anatomy.js), and the source merge. `tools/screens/` (F1b) holds what only screen sections share: the
  home screen, the class roster, the QR drawing and the warning level mark.
- **Stylesheet and page script.** `src/css/base.css`, `system.css` and `screens.css` are chunks of one stylesheet;
  `src/js/base.js`, `system.js` and `screens.js` are chunks of one script (the IIFE that `base.js` opens and closes).
  A chunk starts with a marker line `/* @order NNNN */` (four digits) and runs to the next marker. The build joins the
  chunks of the three files in marker order, so the cascade and the script keep one order across files. Markers, and
  the note above a file's first marker, never reach `tasarim.html`.
- **What goes where.** A CSS rule, or a document-wide lookup of the page script, that only screen sections use belongs
  in `screens.*`; one that only system sections use belongs in `system.*`; anything the page itself or both owners'
  sections use belongs in `base.*`, and so do the classes the fragments of `../../doc/sections` rely on. An edit to
  `screens.*` or `system.*` can then only change its own owner's sections. `node tools/ownercheck.js` checks this
  against the built page; it skips the fragments, which other authors keep editing.

## Working rules

1. Edit only your own files. If you need a change in a file of the other owner, ask that owner.
2. Add CSS or script by extending one of your chunks. For a new chunk, pick a free four-digit number between its
   neighbours in the cascade (the numbers step by 100; `grep -n "@order" src/css/*.css` lists them all). The build
   stops with a message on a number used twice, on anything above a file's first marker, and on a stylesheet chunk
   that leaves a block open.
3. A new source file gets a line in this file under its owner; `npm test` fails while a file has no owner. This file
   is F1a's: F1b sends its new lines to F1a. A new section also needs two lines in `tools/build.js` (its id in `ORDER`
   and in `SECTIONS`), which F1a adds.
4. After a change run `node tools/build.js`, then `node tools/ownercheck.js`, `node tools/rulecheck.js` and
   `npm test` in `tools/` (the same as `node --test "tools/test/*.test.js"`). The page behaviour suite is
   `node tools/interact.js`.
5. `tasarim.html`, `specimen.html`, `tasarim.tokens.json` and `work/build-report.json` are generated: never edit them by
   hand. The build is
   deterministic, so either owner may run it.

## F1a

System sections: renk, kontrast, bilesenler, katmanlar, hareket, etkilesim, tokenlar, and the page's own
platform section (built only when its fragment is missing). Also the tokens, the shared code, the page frame and the tools.

- `OWNERS.md`
- `tokens.json`
- `tokens.css`
- `tokens.check.json`
- `contrast.html`
- `fonts/plex-sans.css`
- `fonts/plex-mono.css`
- `tools/build.js`
- `tools/lib/inputs.js`
- `tools/lib/format.js`
- `tools/lib/icons.js`
- `tools/lib/marks.js`
- `tools/lib/page.js`
- `tools/lib/phone.js`
- `tools/lib/coverage.js`
- `tools/lib/controls.js`
- `tools/lib/section.js`
- `tools/lib/gencss.js`
- `tools/lib/sources.js`
- `tools/lib/owners.js`
- `tools/lib/dtcg.js`
- `tools/lib/refs.js`
- `tools/lib/motion.js`
- `tools/lib/anatomy.js`
- `tools/sections/renk.js`
- `tools/sections/kontrast.js`
- `tools/sections/bilesenler.js`
- `tools/sections/katmanlar.js`
- `tools/sections/hareket.js`
- `tools/sections/etkilesim.js`
- `tools/sections/platform.js`
- `tools/sections/tokenlar.js`
- `src/css/base.css`
- `src/css/system.css`
- `src/js/base.js`
- `src/js/system.js`
- `tools/measure.js`
- `tools/rulecheck.js`
- `tools/interact.js`
- `tools/ownercheck.js`
- `tools/classcheck.js`
- `tools/test/sources.test.js`
- `tools/test/build.test.js`
- `tools/test/owners.test.js`
- `tools/test/dtcg.test.js`
- `tools/test/contracts.test.js`
- `tools/test/fixture.js`
- `tools/package.json`
- `tools/package-lock.json`
- `tools/diag.js`
- `tools/diag-h.js`
- `tools/diag-ovf.js`
- `tools/diag-sw.js`
- `tools/probe.js`
- `tools/crop.js`
- `tools/eval-set.js`
- `tools/explore-b.js`
- `tools/explore-c.js`
- `tools/explore-d.js`
- `tools/explore-e.js`
- `tools/explore-status.js`

## F1b

Screen sections: ust (header and hero), gece-mavisi, dogru, ekranlar, panel, durumlar, tipografi, bicim, ikonlar,
footer. Also the drawings they share and the data they draw from.

- `tools/sections/ust.js`
- `tools/sections/gece-mavisi.js`
- `tools/sections/dogru.js`
- `tools/sections/ekranlar.js`
- `tools/sections/panel.js`
- `tools/sections/durumlar.js`
- `tools/sections/tipografi.js`
- `tools/sections/bicim.js`
- `tools/sections/ikonlar.js`
- `tools/sections/footer.js`
- `tools/screens/home.js`
- `tools/screens/roster.js`
- `tools/screens/qr.js`
- `tools/screens/level.js`
- `src/css/screens.css`
- `src/js/screens.js`
- `icons.json`
- `qr.json`
- `coverage.json`
- `tools/icons.js`
- `tools/qr.js`

## Outside the two lists

- Generated by the build, owned by nobody: `tasarim.html`, `specimen.html`, `tasarim.tokens.json` (the token file in W3C
  DTCG format, the text the Tokenlar section prints) and `work/build-report.json`.
- Not part of the build: `rationale.md`, `tools/node_modules/` (installed from `tools/package.json`), `shots-*/` and
  `work/` (evidence and scratch).
- `coverage.json` is written by `tools/measure.js` (F1a's tool); F1b owns the file and runs the tool.
