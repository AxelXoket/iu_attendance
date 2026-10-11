# Critic B9: regression review r8 -> current

Document: iu-yoklama-ozet.html (108,434 bytes on disk). Previous: iu-yoklama-ozet.r8.html (PASS in critic-B8.md). Rubric: rubric.md (frozen). Input: faculty-notes.md.
Read-only. New scratchpad files only: critic_b9_diff.py, critic_b9_check.py (copy of B8 check), _b9_diff.txt, _b9_all.txt.

## Method

- critic_b9_diff.py: compares style/script blocks (identical), flattens both versions to text lines, unified diff (_b9_diff.txt, 20 hunks).
- critic_b9_check.py: U+2014 0, U+2013 0, English banned vocabulary 0, broken internal anchors 0.
- Body outside `<details>` 3,274 words (B8 3,227). Short read 1,684 (B8 1,668). Body cells over 20 words: 14 (B8 14); S15 default grew 31 -> 47 words.
- Verified on npm registry: zxing-wasm 3.1.4 published 2026-09-10 (matches Ek D); expo-camera 57.0.0 2026-06-25, 57.0.5 2026-09-11 (Ek D row gives no date). 29 Eylül -> 1 Aralık = 63 days = 9 weeks (script). 21 Aralık + 80 gün = 11 Mart, 20 Ocak + 80 = 10 Nisan.

## VERDICT: FAIL

One BLOCKER: the new zxing-wasm decision breaks rubric item 1 (winner with no second choice and no named rejected option). All other rubric items still pass, no traceability gap.

## 1. What changed (20 hunks)

Crash log reworked (JS error handler + unclean-exit flag; ApplicationExitInfo/MetricKit moved to later phase, added to Sonraya kalanlar, Ek A reason "üçüncü yerel modül"); Kararlılık metric source updated; device revocation wording (body, section 3, Ek B, Ek C: "başlatma kaydı iptalden önce sunucuya ulaşmamışsa"; found device queue shown to hoca); Android post-scan same-boot anchor + two Android regression tests; makbuz verified with zxing-wasm or hand-typed short code; unscheduled start not counted until hoca confirms; TestFlight ~11 Mart branch; S15 default marked as inference with SMS fallback; Ek D zxing-wasm row, expo-camera (Android) Elendi row, AAB and APK; iOS-only import of expo-camera; "1 Aralık'a 9 hafta var"; 8 glossary lines.

Checked for new contradictions:
- Crash log: body line "kendi hata ve çökme kaydı" (section 1), section 5, Ek A, Kararlılık, Sonraya kalanlar and glossary all agree on the flag and the deferral. Consistent.
- Post-scan anchor vs section 3 "Telefon arada yeniden başlatıldıysa belirlenemeyen": "arada" = between scan and anchor, matches test "okut, yeniden başlat, sonra senkronla". Battery case (section 2) still pre-scan anchor only, correct since a dead battery forces a reboot. Consistent.
- Unscheduled start: matches Ek C "Öğrenci kayıtları tek başına planlanmamış dersi yapıldı saydırmaz" and Ek B "Ders yapıldı mı? cevapsız -> dışa aktarma engellenir". Consistent.
- "anahtarları yenilenir" removed: per-device HKDF keys plus a retired device number make renewal unnecessary; section 3 and Ek C agree. Consistent.
- SMS: S15 fallback "girişte yerli bir SMS sağlayıcısı" vs Ek D "SMS yalnız hesap kurtarmada, Sonra": conditional, not active in the default branch (F3).

## 2. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL | New Ek D decision "zxing-wasm, Seçildi" has no 2nd choice and no named, dated rejected option (F1). expo-camera (Android) Elendi row added but undated (F6). |
| 2 | PASS | All seven cases intact; clock handling sharpened (post-scan anchor, two Android tests). |
| 3 | PASS | Bar and lists unchanged; revocation wording now matches Ek C. Short-code makbuz verification undefined (F2). |
| 4 | PASS | Import/export untouched. |
| 5 | PASS | No kapsam row removed. |
| 6 | PASS | Additions list untouched. |
| 7 | PASS | Crash log contents, 90 gün, domestic hosting unchanged; S15 default now labelled inference. |
| 8 | PASS | TestFlight dates recomputed and correct. |
| 9 | PASS | Kararlılık still measurable; flag semantics unspecified (F4). |
| 10 | PASS | S1-S19 intact, each with why and default. |

## 3. critic-B8 MINOR findings

| # | Status | Note |
|---|---|---|
| 1 Revocation wording | FIXED | Section 3 and Ek B now carry the "iptalden önce ulaşmamışsa" condition. |
| 2 ApplicationExitInfo Android 11+ | FIXED | Superseded: unclean-exit flag works on every OS version; detail deferred. |
| 3 Length / long cells | NOT FIXED | Worse: 3,274 words, short read 1,684, S15 default 47 words, S17 36, Oturum anahtarı 35. |
| 4 Explicit Elendi row | FIXED | "expo-camera (Android) Elendi" row (undated, F6). |
| 5 Jargon | PARTLY | 7 terms glossed; "Google kod tarayıcısı" still unglossed; "Kâğıt imza da bunları önleyemiyor" unchanged. |
| 6 Unclear Turkish | PARTLY | "1 Aralık'a 9 hafta var" fixed and correct; "Tahmin değişti diye" (section 4, Ek C) unchanged. |
| 7 Guess odds derivation | NOT FIXED | Ek C line unchanged. |
| 8 AAB | FIXED | "çıktıda (AAB ve APK)". |

## 4. Traceability

Diff removes no scope line. Every faculty and owner bullet still maps as in critic-B7 section 3. New deferral (Yerel çökme ayrıntısı) is listed in Sonraya kalanlar with its reason in Ek A. No gap.

## 5. Findings

1. BLOCKER (R1). Ek D "zxing-wasm | 3.1.4 (10.09.2026) | Seçildi" has no 2nd choice and no named rejected option; the short code is a fallback, not a decoder. Same standard as B5 #2 / B6 #1. Fix: add a dated 2nd (e.g. jsQR or qr-scanner) and an Elendi row (BarcodeDetector API: not in Windows Chrome/Firefox), with dates.
2. MINOR (R3/R2 spec gap). Ek C "Kamera yoksa makbuzdaki kısa kod elle yazılır": a hand-typed short code cannot carry a P-256 signature, and "kısa kod" already means the yedek kod (Kapsam "PIN / kısa kod"). State its content, length, what the server checks, attempt limit, and rename it (e.g. "makbuz kodu").
3. MINOR (consistency, conditional). S15 fallback "girişte yerli bir SMS sağlayıcısı" conflicts with Ek D "SMS yalnız hesap kurtarmada, Sonra"; it needs every student's phone number (not in roster or KVKK data list) and has no slot in the 1 Aralık plan. Say what the fallback costs, or make the fallback "pilot ertelenir".
4. MINOR (R9, inference). Unclean-exit flag: unspecified when it is set/cleared. If cleared only on clean exit, every OS background kill counts as a crash and Kararlılık ≥%99 is meaningless. Fix: "ön plana gelişte kurulur, arka plana geçişte silinir".
5. MINOR (unclear Turkish). Ek C "Okutmadan sonra aynı açılışta alınan çapa da kullanılır" is followed by "çapadan bu yana geçen süre" and "Çapa 24 saatten eskiyse", which only fit a pre-scan anchor; say "çapa ile okutma arasındaki süre" / "okutmadan 24 saatten uzaksa".
6. MINOR (R1 dates). "expo-camera (Android) | SDK 57" undated; npm: 57.0.0 on 25.06.2026, 57.0.5 on 11.09.2026.
7. MINOR (wording). Ek C "kafa sayısı, düzeltme ve onaylar hocaya onay için gösterilir" (onay twice; "onaylar" = cihaz değişimi onayları?). Body section 2 "numarası bir daha kullanılmaz": device number not introduced in the body; Ek C mixes "anahtar numarası" and "cihaz numarası".
8. MINOR (carried). B8 #3 length (worse), #5 "Google kod tarayıcısı" and "Kâğıt imza da", #6 "Tahmin değişti diye", #7 guess-odds derivation remain.
