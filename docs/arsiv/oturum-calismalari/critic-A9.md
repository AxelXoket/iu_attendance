# Critic A9: fidelity of iu-yoklama-ozet.html (29.09.2026)

VERDICT: FAIL (1 new BLOCKER; both A8 BLOCKERs are fixed)

## Method

- Extracted the full text, including all `<details>` blocks, to `_a9_text.txt` (617 lines) and diffed it against `_a8_text.txt`. There are 20 changed hunks.
- Checked the new content against these sources:
  - mx-check.txt;
  - research 05 and 07;
  - the npm registry for zxing-wasm (latest 3.1.4, published 2026-09-10T15:01Z, MIT);
  - the zxing-wasm README, section "Serving via Web or CDN".
- Recomputed the dates: 21.12.2026 + 80 days = 11.03.2027, 20.01.2027 + 80 days = 10.04.2027, and 29.09 to 01.12 = 63 days (9 weeks).
- The document contains no U+2014 or U+2013 characters.

## 1. Status of critic-A8 findings

| # | Status | Note |
|---|---|---|
| N1 S15 legal inference as fact | FIXED | L222 is now labeled "(çıkarım, hukuk birimi teyit etmeli)". The new fallback sentence has its own problem, see B1. |
| N2 third native module / estimate | FIXED | Native crash detail was moved to a later phase (§5 L135, Ek A L249, the later-phase list L437, the glossary). The clean-exit flag needs no native code, so the "iki yer" statement at L348 is true again. |
| m1 revoked-device summaries | FIXED | L92 and L308 now carry the "başlatma kaydı iptalden önce ulaşmamışsa" qualifier. |
| m2 "anahtarları yenilenir" | FIXED | L74 now says "numarası bir daha kullanılmaz", which matches Ek C. |
| m3 ApplicationExitInfo API 30+ | FIXED (moot) | That API is no longer used in the MVP. |
| m4 expo-camera import on Android | FIXED | Ek E L457 now says "*.ios.tsx". |
| m5 "Bunun için 9 hafta" | FIXED | L468 now reads "1 Aralık'a 9 hafta var". |
| m6 10 Nisan / 11 Mart | FIXED | L190 has the Aralık-build variant. The arithmetic is verified. |

## 2. BLOCKER

### B1. The S15 fallback "girişte yerli bir SMS sağlayıcısı" would not resolve the question it answers, and it drops identity proof without saying so

- L222 says: "Aksi görüş çıkarsa girişte yerli bir SMS sağlayıcısı kullanılır."
- The fallback only covers the login code. Other mail flows still go to the same mailboxes:
  - mx-check shows that istanbul.edu.tr (staff) is also on Google (aspmx.l.google.com), not only ogr.iu.edu.tr;
  - the device-added e-mail to hocas (Ek C L333, "Her yeni cihaz için e-posta gider") still lands in Google mailboxes;
  - so do the hoca login codes (L38).
- An e-mail code proves "is an IU student" (07 L56). An SMS code to a phone number the user types in proves nothing about IU membership. With it, list matching on number and name (L39) would bind an impersonator's device automatically.
- Phone numbers would be a new personal-data item. §5 (L128-136) does not list them, and no source for them is named.
- Fix, either option:
  - label the fallback as unresearched and scope the S15 question to all app mail (staff included);
  - or state the identity check, the phone-number source and the §5 entry the fallback needs.

## 3. MINOR (does not fail the document)

- m1. The makbuz "kısa kod" (L358, Ek D L423) is undefined. A short hand-typed code cannot carry a P-256 signature. At best it is a server-checked token for the QR time slice, which can be relayed like the yedek kod. State its length, what it proves, and whether it counts toward the 2'lik sınır.
- m2. zxing-wasm fetches its .wasm from fastly.jsdelivr.net by default (README, "Serving via Web or CDN"). That sends the hoca's IP to a foreign CDN, which conflicts with the rule in L26. Note that the .wasm is self-hosted via `prepareZXingModule` with `locateFile`.
- m3. Ek C L329 says "İptal edilen cihazın kendi senkronu reddedilir" and then "Cihaz bulunursa, kuyruğundaki ... hocaya onay için gösterilir". Say that the rejected payload is kept in quarantine, not discarded. Otherwise the two sentences contradict each other.
- m4. The clean-exit flag (§5 L135, Ek F L516) misses crashes before JS starts and crashes in the background. It also counts a phone that runs out of battery in the foreground as a crash. The ≥%99 gate is approximate; say so next to the gate.
- m5. §3 L90 says "Telefon arada yeniden başlatıldıysa kayıt belirlenemeyen olur". This is now too broad on Android. Per L343 and L346, a reboot before the scan followed by a same-boot sync is determinable. Say "okutma ile senkron arasında".

## Checked and correct in the new text

- zxing-wasm 3.1.4 (10.09.2026).
- The desktop browsers lacking a built-in QR decoder claim (09 L141: no BarcodeDetector on Safari; Chrome on Windows and Linux also lacks it).
- The Ek D expo-camera row.
- The AAB and APK check.
- The "Planlı ders" rule at L364.
- The post-scan same-boot anchor rule and its two Android regression tests.
- The new glossary entries, including "Google Workspace" (both domains' MX records point to Google).
- The 9-week and 80-day arithmetic.

Scratch: `_a9_text.txt`, `_a9_links.txt`, `_a9_extract.py`.
