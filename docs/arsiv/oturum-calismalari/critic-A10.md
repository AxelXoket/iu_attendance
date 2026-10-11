# Critic A10: fidelity of iu-yoklama-ozet.html (29.09.2026)

VERDICT: PASS (0 BLOCKER, 6 MINOR)

## Method

- Full text including every `<details>` block extracted with `_a10_extract.py` to `_a10_text.txt` (r9 to `_a10r9_text.txt`, identical to `_a9_text.txt`). Diff in `_a10_diff.txt`, 11 hunks. Link list unchanged (`_a10_links.txt`).
- npm registry, 29.09.2026: jsqr latest 1.4.0 (2021-04-24T03:17Z); zxing-wasm latest 3.1.4 (2026-09-10T15:01Z); expo-camera dist-tags latest = sdk-57 = 57.0.5 (2026-09-11), 57.0.0 = 2026-06-25, next = 58.0.4; expo latest 57.0.25, next 58.0.0-preview.8.
- zxing-wasm README "Serving via Web or CDN": default .wasm path is jsDelivr (fastly.jsdelivr.net), override via `prepareZXingModule` + `overrides.locateFile`. Confirmed.
- MDN browser-compat-data `api/BarcodeDetector.json`: Chrome desktop only macOS/ChromeOS, Edge/Opera macOS only, Firefox none, Safari 17+ only behind the "Shape Detection API" flag. Doc L426 is correct.
- No U+2014 / U+2013 in the text.

## 1. Status of critic-A9 findings

| # | Status | Note |
|---|---|---|
| B1 S15 SMS fallback | FIXED | SMS removed. L222 now: legal re-decides the method; option = one-time registration code from the hoca, each match needs hoca approval, schedule may slip. No phone numbers, so no new §5 item. Residual staff-mail scope: m1. |
| m1 makbuz "kısa kod" | FIXED | Removed from L359 and Ek D L424. L359 now has two near-duplicate "beyana dayalı" sentences (cosmetic). |
| m2 zxing-wasm CDN | FIXED | L424: served from İÜ server via locateFile, cached by Workbox. Matches README. |
| m3 revoked-device quarantine | FIXED | L329: "sayıma katılmaz, karantinada tutulur ... hoca kabul eder ya da reddeder". |
| m4 clean-exit flag approximate | FIXED | L135 sets flag on foreground, clears on background, excludes reboots (covers battery death). L519 labels the gate "yaklaşık ölçüm", pre-JS crashes invisible. Background crashes still unstated (trivial). New inconsistency: m3. |
| m5 §3 reboot wording | FIXED | L90 "Okutmayla aynı açılışta hiç çapa yoksa"; L343 now uses anchor-to-scan interval; new regression test L346. Consistent with L71. |

## 2. New factual errors or inference-as-fact

None at BLOCKER level. MINOR:

- m2. Ek D L429 "expo-camera (Android) | 57.0.0 (25.06.2026)". L386 says versions were taken from npm on 28-29.09.2026, and other rows give the current release (expo-sqlite 57.0.3 11.09.2026, zxing-wasm 3.1.4). Current SDK 57 expo-camera is 57.0.5 (11.09.2026). The date is true for 57.0.0 but reads as the current version. Use 57.0.5 (11.09.2026) or label "SDK 57 ilk sürümü".
- m3. Ek A L249 still says "Bunun için yerel kod gerekmez", but L135 now requires "telefon arada yeniden başlatılmamışsa". On Android that is BOOT_COUNT (L340), which JS cannot read without the native clock module. L341 says iOS has no boot ID, and the doc gives no iOS reboot test (e.g. uptime vs elapsed wall time). Say "ek yerel modül gerekmez; yeniden başlatma bilgisi saat modülünden gelir" and name the iOS method.
- m4. L425 jsQR "daha yavaş" has no source in research 01..10 or Ek H. Also, Ek H lists no source for the zxing-wasm jsDelivr default or for BarcodeDetector support. Both claims are true (README, MDN BCD), but they are unsourced in the doc.

## 3. Decision-relevant omissions

None at BLOCKER level. MINOR:

- m1. S15 L222 still asks only about "Öğrenci e-posta kutuları". Per mx-check, istanbul.edu.tr (staff) is also on Google. The hoca login code (L38), the device-added mail (L333) and account recovery (L162) go there too. The "İÜ'nün kendi tercihi" reasoning applies equally, so the risk is low. Still, the question to legal should say "öğrenci ve personel". The "Neden önemli" cell should also list the login method.
- m5. The L222 fallback "tek kullanımlık kayıt kodu" does not say whether the code is per student or per class. It also omits the hoca workload of approving about 100 matches per class, which bears on the ≤2 dk / ≤2 iş günü targets in Ek F. It is labeled "Bir seçenek", so this is not a blocker.
- m6. L359: if the hoca's panel has no camera, every makbuz becomes "beyana dayalı", even though the hoca's own registered phone could open the panel and scan it. Mention that route. Also say whether "beyana dayalı" corrections are limited.

## Checked and correct in the new text

- zxing-wasm 3.1.4 (10.09.2026).
- jsQR 1.4.0 (24.04.2021), with no newer release.
- The BarcodeDetector platform list.
- The zxing-wasm CDN default and the locateFile fix.
- Glossary entries "Google kod tarayıcısı" and "jsQR / BarcodeDetector".
- The quarantine wording.
- The anchor-to-scan 50 ppm rule (86400 s × 50e-6 = 4.32 s) and the 24 h cutoff, consistent across L71, L90, L343 and L345-347.
- The "Kâğıt imzada bunların karşılıkları" rewording.
- "Cihaz numarası (anahtar numarası olarak)", consistent with L74 and L330.
- "Dönem sonu tahmini" wording, consistent with Ek C L369.

Scratch: `_a10_text.txt`, `_a10r9_text.txt`, `_a10_diff.txt`, `_a10_links.txt`, `_a10_extract.py`, `_a10r9_extract.py`.
