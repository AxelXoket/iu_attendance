# Critic B10: regression review r9 -> current

Document: iu-yoklama-ozet.html (108,921 bytes). Previous: iu-yoklama-ozet.r9.html (FAIL in critic-B9.md, rubric item 1 only). Rubric: rubric.md (frozen). Input: faculty-notes.md.
Read-only. New scratchpad files only: critic_b10_diff.py, critic_b10_check.py (copy of B9 check), _b10_diff.txt, _b10_all.txt, _b10_bcd.json.

## Method

- critic_b10_diff.py: style/script blocks identical; flattened-text unified diff, 14 hunks (_b10_diff.txt).
- critic_b10_check.py: U+2014 0, U+2013 0, English banned vocabulary 0, broken internal anchors 0. Body 3,325 words (B9 3,274), short read 1,708 (B9 1,684), S15 default cell 70 words (B9 47).
- npm registry (live): jsqr 1.4.0 published 2021-04-24, still latest (matches Ek D). zxing-wasm 3.1.4 2026-09-10. expo-camera 57.0.0 2026-06-25 (matches).
- zxing-wasm README: WASM path "automatically assigned a jsDelivr CDN URL", override via prepareZXingModule + locateFile. Matches Ek D.
- @mdn/browser-compat-data: BarcodeDetector in Chrome/Edge desktop "ChromeOS and macOS only", Firefox no, Safari 17 only behind the "Shape Detection API" flag. Ek D claim holds (Safari: off by default).
- Arithmetic: 86,400 s x 50 ppm = 4.32 s/day; 2 s + 48 h x 50 ppm = 10.64 s. Both match.

## VERDICT: PASS

All 10 rubric items pass, no traceability gap, no new contradiction. Only MINOR findings remain.

## 1. What changed (14 hunks)

Ek D: zxing-wasm row now says WASM is self-hosted (locateFile, Workbox) instead of jsDelivr; new rows jsQR 1.4.0 (24.04.2021) 2. seçenek and BarcodeDetector Elendi; expo-camera (Android) dated. Makbuz short code removed, replaced by "beyana dayalı". Crash flag semantics defined (set on foreground, cleared on background, reboot excluded); Kararlılık marked "yaklaşık ölçüm". Anchor wording: "çapa ile okutma arasındaki süre"; section 3 and Ek C tests reworded to "okutmayla aynı açılışta hiç çapa yok", plus a positive-control test (fresh pre-scan anchor, then dead battery). Revoked device: "karantinada tutulur", hoca "kabul eder ya da reddeder". "cihaz numarası" in body; "Cihaz numarası (anahtar numarası olarak)" in Ek C. S15 fallback: SMS replaced by one-time registration code with hoca approval. "Kâğıt imzada bunların karşılıkları da önlenemiyor", "Dönem sonu tahmini değişti diye". Two glossary lines.

Contradiction checks:
- iOS anchors: section 3 "iOS'ta çapaların okutmanın iki yanında olması gerekir" = Ek C iOS rule (both-side anchors, 48 h) = section 2 dead-battery row (iOS belirlenemeyen). Consistent.
- Android: section 2 "çapa 24 saatten yeniyse" = Ek C "Bu süre 24 saati aşarsa". Consistent.
- Revocation: body section 3, Ek B "Başlatma kaydı gelmedi" and Ek C (karantina, regression test "kayıt reddedilmez") agree.
- S15 fallback no longer conflicts with Ek D "SMS yalnız hesap kurtarmada, Sonra"; needs no phone numbers.
- Removing the makbuz short code leaves no dangling reference (makbuz lines 51, 162, 202, 240, 358, 505 checked).

## 2. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | PASS | zxing-wasm now has winner (3.1.4, 10.09.2026), 2nd jsQR (1.4.0, 24.04.2021, verified) and rejected BarcodeDetector (undated, but same "-" standard accepted for Firebase Auth, Konum, Wi-Fi etc.; claim verified in MDN BCD). expo-camera (Android) dated. |
| 2 | PASS | Seven cases intact; clock wording now matches Ek C; positive and negative Android tests. |
| 3 | PASS | Bar and lists unchanged. Makbuz verification without camera now falls back to declared correction (F2). |
| 4 | PASS | Import/export untouched. |
| 5 | PASS | No kapsam row changed or removed. |
| 6 | PASS | Additions list untouched. |
| 7 | PASS | New: zxing-wasm WASM self-hosted to avoid a jsDelivr transfer. S15 default present, fallback labelled. |
| 8 | PASS | Untouched. |
| 9 | PASS | Kararlılık now measurable with defined flag; honest "yaklaşık ölçüm" caveat. |
| 10 | PASS | S1-S19 intact, each with why and default. |

## 3. critic-B9 findings

| # | Status | Note |
|---|---|---|
| 1 BLOCKER zxing-wasm 2nd / rejected | FIXED | jsQR 2nd, BarcodeDetector Elendi, verified. |
| 2 Makbuz short code | FIXED | Short code removed; residue: duplicated sentence (F1). |
| 3 S15 SMS fallback | FIXED | Registration code with hoca approval, calendar risk stated; residue F3. |
| 4 Crash flag semantics | FIXED | "ön plana gelince koyar, arka plana geçince kaldırır", reboot excluded; residue F4. |
| 5 Anchor wording | FIXED | "çapa ile okutma arasındaki süre", "Bu süre 24 saati aşarsa". |
| 6 expo-camera date | FIXED | 57.0.0 (25.06.2026), verified. |
| 7 onay twice / cihaz vs anahtar numarası | FIXED | "hoca bunları kabul eder ya da reddeder"; "Cihaz numarası (anahtar numarası olarak)". |
| 8 Carried B8 items | PARTLY | "Google kod tarayıcısı" glossed; "Kâğıt imza" reworded; body "Tahmin" fixed but Ek C line "Tahmin değişince" unchanged; guess-odds derivation unchanged; length worse. |

## 4. Traceability

Diff touches no kapsam, Sonraya kalanlar or Ek A line. Every faculty and owner bullet still maps as in critic-B7 section 3. No gap.

## 5. Findings

1. MINOR (redundant Turkish). Ek C Makbuz: "Kamera yoksa düzeltme "beyana dayalı" koduyla yapılır. Doğrulanamayan bir düzeltme "beyana dayalı" sebep koduyla yapılır." says the same thing twice with two names ("kod" / "sebep kodu"). Merge: "Kamera yoksa ya da doğrulanamazsa düzeltme "beyana dayalı" sebep koduyla yapılır."
2. MINOR (R3 residue). Without a laptop camera the signed makbuz cannot be verified at all. The panel is an installable PWA; say "panel telefonda açılıp okutulur" before falling back to beyana dayalı.
3. MINOR (unclear Turkish, conditional). S15 "hocanın ilk derste verdiği tek kullanımlık kayıt kodu": one code for the class cannot be single-use; say "öğrenci başına tek kullanımlık" or "derse özel, hoca onaylı". S15 default cell is now 70 words.
4. MINOR (R9 measurement). Crash flag excludes reboots, but Ek C says iOS has no boot id and kern.boottime shifts with clock changes; how iOS detects "arada yeniden başlatıldı" is unstated (dead battery could count as a crash). Bias is conservative; one clause fixes it.
5. MINOR (R1 precision). BarcodeDetector row: Safari 17 has it behind a flag (MDN BCD), so "Safari'de yok" is "varsayılan olarak kapalı"; row has no date or link. jsQR "daha yavaş" is unsourced.
6. MINOR (jargon). "WASM", "CDN", "locateFile" unglossed (Ek D zxing-wasm and jsQR rows).
7. MINOR (carried). Ek C "Tahmin değişince seviye geri gitmez" (body now says "Dönem sonu tahmini"); guess-odds derivation (B8 #7); length 3,325 body words, short read 1,708, still growing.
