# F1b token requests (variants/A2/tokens.json, owner F1a)

Written by F1b on 6 October 2026. Each request gives the path, the value it was written against, the requested value and
the reason (finding numbers are indexes in fixes/F1b.json, decisions are decisions-r1.md).

**Status at the end of F1b's round:** F1a applied every request below (R1 to R12, N1 to N7). Verified by
`node fixes/F1b-token-apply.js variants/A2/tokens.json` (dry run: every item "already applied") and by the gates listed
in F1b's report. One correction is open for F1a: N5 should be 29em, not the 30em F1b first asked for. The last section
lists the item for a fragment owner, which neither F1a nor F1b can edit.

`F1b-token-apply.js` applies R1 to R12 to any tokens.json (dry run by default, `--write` to save; it refuses a field
whose current text differs from the text the request was written against). `f1bwork/verify-requests.js` applies them to a
throwaway copy of the variant, builds it and checks the result.

## Values

R1. `type.panel[name=rakam].line`: `50` -> `52`. F1b 1, 31: the line-height rule asks at least 1,2 for the one-line key
figure; 42/50 is 1,19. Tipografi's build check printed a warning until this changed.

R2. `space.panel.kirilma` (new): the panel breakpoints that Biçim ve boşluk prints (F1b 0).

```json
"kirilma": [
  { "ad": "dar", "en": 0, "sutun": 4, "oluk": 24, "kenar": 16, "gezinme": "üst çubuk; gezinme menü düğmesinde" },
  { "ad": "orta", "en": 672, "sutun": 12, "oluk": 24, "kenar": 32, "gezinme": "üst çubuk; gezinme çubukta sekme sırası" },
  { "ad": "genis", "en": 1280, "sutun": 12, "oluk": 24, "kenar": 32, "gezinme": "kenar çubuğu, 232 px" }
]
```

1280 rather than Carbon's 1056: at 1280 the 232 px side bar, two 32 px margins and every column of the attendance table
(about 980 px with 16 px cell padding and the decision reasons) fit side by side; at 1056 the table would scroll. 672 is
Carbon's md. The panel demo's container queries use the same widths (src/css/screens.css, @order 4100).

R12. `type.panel` new style after `kod-02`: `{ "name": "kod-03", "size": 22, "line": 28, "weight": 500, "tracking": 0,
"use": "Projeksiyon sayfasındaki eşleştirme kodu (Plex Mono)" }`. F1b 49: the projector's pairing state shows its short
code next to the QR; the panel scale had no code style above 14 px.

## Text attached to tokens

R3. `type.phone[name=rakam].use` -> "Anahtar rakam: yoklamanın kalan süresi (ekran başına bir)". F1b 40: the countdown's
color is stated once, in the usage map.

R4. `accentNever[0]` -> "Sayfa zemini kırık beyaz (neutral.2); kart, liste, alt sekme çubuğu, alt sayfa ve diyalog yüzey
(neutral.1); başlık çubuğu sayfa zemininde. Seçili ve hover satır da nötr (neutral.5, neutral.4)." F1b 37: "kırık beyaz"
names only neutral.2.

R5. `accentNever[6]`: "bildirimler beyaz yüzey" -> "bildirimler yüzey (neutral.1)". F1b 37.

R6. `accentUsage[4].where`: "(40x24)" -> "(40 x 24 px)". One dimension form across the page.

R7. `accentUsage[5].where`: "(plan.html#kararlar-kafa-sayisi)" -> "(plan.html, Kafa sayısı)". F1b 57.

R8. `accentUsage[5].why`: "42 px, zeminde 11,63:1" -> "42 px, kart yüzeyinde 12,70:1": the panel draws the key figure on
its card surface (#FEFEFF); accent.11 on #FEFEFF is 12,70:1 (color.js).

R9. `accentUsage[7].why`: "yüzde birin altında" -> "%1'in altında". F1b 37.

R10. `type.rules` -> the two rules no other block states (F1b 5, 14, 44): no case transform; line height and line length.
Tipografi renders the field.

R11. `durumlar.note` deleted: Durumlar writes the warning-level sentences under Uyarı seviyeleri and the label sentence
under Kayıt etiketleri (F1b 15).

## Outside tokens.json (files owned by F1a), all applied

N1. tools/interact.js expects "Seviye 2/4,Seviye 1/4" and /QR'ı çerçevenin içine al/ (F1b 27, F1a 60).
N2. base.css comment 2.38:1 -> 2.42:1 (F1b 2).
N3. One phone size: `.device` 372 px in base.css and the page-level phone fitting in base.js (F1b 8, 17). F1b removed its
own scoped copies.
N4. covBar prints one decimal (F1b 22).
N5. base.css prose measure (F1b 12): applied as 30em, which F1b had requested; **correction, still open:** use 29em.
Measured on the whole page at 1440 px (`.sec .lead, .body, .rules-list li > p, .frag p`): 30em reaches 72 characters a
line in ozet, ilkeler, renk, tipografi, bicim, bilesenler, katmanlar, erisilebilirlik, platform and kutuphaneler; 29em
keeps every line within 70 (the Tipografi rule). Until then the screen sections carry their own 29em rule
(src/css/screens.css, @order 0600), which can go once base.css says 29em.
N6. The tokenlar code block no longer widens the page; OWNERS.md lists the new files.
N7. Panel stamp style `etiket-02` (13/16 500). Tipografi's line-height check counts every `etiket` style as a one-line
label, as the rule says.

## For the fragment owners (not F1a or F1b)

Checked against doc/sections at the end of F1b's round: the ozet, ilkeler, erisilebilirlik, kutuphaneler and platform
items F1b found have been handled by their owners. One is still open:

- acik: an open point "Aşama 2'de Yoklamamı ver kamerayı mı açar, QR okut ayrı bir düğme mi?" with a link to
  plan.html, Aşama 2 ve 3 (F1b 9, 30). The flow card in Telefon ekranları no longer decides it, and the scan caption
  marks the 1x and 2x control as the design's proposal.
