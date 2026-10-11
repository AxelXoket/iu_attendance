# Critic A6: fidelity of iu-yoklama-ozet.html (29.09.2026, 01:40 build)

VERDICT: FAIL (2 BLOCKERs, both new; every critic-A5 BLOCKER is fixed)

Method: I extracted the full text, including every `<details>` block, to `_a6_text.txt` (565 lines, 63 links) and diffed it against `_a5_text.txt`. I checked every changed line against research 01, 05, 07, 09 and 10 and against yonetmelik-2025 Md.19 and Md.36. I also checked these primary sources on the web today:
- the ML Kit Android data disclosure page;
- `expo/expo` branch `sdk-57`, `packages/expo-camera/android/build.gradle` and `src/Camera.types.ts`;
- Apple's "Invite external testers" help page.

The document contains no U+2014 or U+2013 characters.

## 1. Status of critic-A5 findings

| # | Status | Note |
|---|---|---|
| B1 Md.36 routed through the Görevli status | FIXED | "Görevli (Md.35)" only. Md.36 and the other exceptions carry no category and use the "kurul kararı" code, as A5 proposed. The remaining risk is m1. |
| B2 iOS battery-death row | FIXED | The row is now split by platform. The iOS case is "belirlenemeyen", which falls under the auto-accept rule. |
| B3 S3 Friday close | FIXED | "Perşembe 23:59", and the last Friday session is checked by hand. |
| B4 store tester lists | FIXED | TestFlight public link plus Play open test, "test kullanıcısı listesi tutulmaz". Apple help confirms that public-link testers "display as anonymous". |
| m1 key horizon | FIXED | "3 iş günü (en fazla 5 takvim günü)" is used everywhere. The new wording creates m3 below. |
| m2 PWA status | FIXED | The student PWA is "elendi" in §1, Ek A and Ek D. G-B has been removed. |
| m3 S1-S18 | FIXED | Now S1-S19 and G-A..G-C. |
| m4 50 ppm | FIXED | "süre × 50 ppm (günde ~4,3 sn)". 86400 × 50e-6 = 4.32. |
| m5 attribution | FIXED | "(eleştirmen çıkarımı, Ek A)" and "seyrek olması bekleniyor; oranı pilotta ölçülecek". |
| m6 APK rule | PARTLY | The pilot clause is added. The rule still sits under "Çıkarım ya da doğrulanmamış", although 09 L18 marks it [CONFIRMED]. |
| m7 order key | FIXED | "kaydın zaman aralığına göredir; yedek kodda bu, kodun zaman dilimidir". |
| m8 Apple 5.1.1(ix) inference | FIXED | Now listed in the Ek E inference list. |

## 2. New factual errors, inference stated as fact, and privacy regressions

**N1 (BLOCKER, privacy, escalate). The "yedek kod muaf" flag is a per-student disability marker.**
- Ek C L349: "Hoca bir öğrenciyi 'yedek kod muaf' olarak işaretleyebilir, örneğin görme engelli bir öğrenciyi."
- §6 L164 files the flag under "Kamera ve erişilebilirlik: ... Gerekince 'yedek kod muaf' işareti".
- The flag is stored per student and per course, and Ek C L307 uses it in flag logic ("muaf öğrenciler hariç").
- 05 L87 warns that a generic flag leaks health information when its users are in practice medical cases. 05 L88 says Md.36 disability accommodations are "out of scope for the app".
- The document itself says, at §5 L128, "Tutulmayacak veriler: ... sağlık bilgisi". It removed Md.36 from Görevli for exactly this reason (Ek A L256) but kept this flag.

Fix options:
- Drop the per-student flag and the disability example. The instructor's manual add, which is already audit-logged with a generic reason, covers the case.
- Or mark the flag as a [LEGAL] stop under S5/S16.

This is the owner's decision.

**N2 (BLOCKER, decision-relevant omission). The ZXing choice has a cost the document does not state.**
- Checked against the primary source, `expo/expo` branch `sdk-57`, expo-camera 57.0.5:
  - `build.gradle` adds `com.google.mlkit:barcode-scanning:17.3.0` by default. It can only be removed with the gradle property `expo.camera.barcode-scanner-enabled=false`.
  - `Camera.types.ts` exposes no frame or frame-processor API.
- ZXing therefore cannot be fed from expo-camera. On Android, the app has to own the camera pipeline itself: CameraX preview, analyzer and zoom.
- The document puts this in "planlanan yerel modüle eklenecek ZXing" (Ek E L438), which Ek C L343 calls "tek küçük yerel modül".
- Ek C L321, zoom through expo-camera's 0 to 1 range, then no longer applies on Android.
- The cost is missing from the 1 Aralık freeze risk (§7 L177) and from the ZXing versus ML Kit trade-off in S15 and Ek A.

Fix:
- State that Android needs its own camera screen, which is extra native work inside the 9 weeks.
- Name the gradle property.
- Move "expo-camera SDK 57'de ML Kit kullanıyor" out of the unverified list in Ek E. It is confirmed.

Checked and correct in the new text:
- ML Kit disclosure. It collects device info, package name, performance metrics and per-installation identifiers, for "diagnostics and usage analytics". The document's wording "tanılama ve kullanım verisi" is accurate.
- expo-camera on iOS has no ML Kit dependency.
- TestFlight public-link anonymity, from Apple help.
- Firebase Dynamic Links shutdown on 25.08.2025 (07 L57).
- EAS free plan of 15+15 builds (01 L158).
- op-sqlite 18.2.5 works with Drizzle (01 L98).
- A faculty cannot enrol, and a student has no signing authority (09 L41, L43).
- 2-6 weeks, marked "tahmin" (09 L172).
- Version dates for Next, op-sqlite, xlsx, expo-sqlite and PostgreSQL 18.6 match the fetched facts.
- Warning example. With 3 h missed in week 1 against a 30% limit on held hours, the student is over the limit in weeks 1 to 3 (3/9 = 33%) and under it in week 4 (3/12 = 25%).
- S3 Thursday fallback.

## 3. MINOR (does not fail the document)

- m1. "kurul kararı" code (§4 L109, §6 L150). Md.35 has its own status, so this code's main users will be Md.36 cases. That recreates the 05 L87 leak at a smaller scale. Use the same neutral code as other document-backed corrections.
- m2. Ek E still lists the APK rule as unverified (see A5 m6). The expo-camera ML Kit item is now verified (N2).
- m3. "Sonraki 3 iş günü" keys. A weekend telafi dersi ("Telafi dersi dahil internetsiz başlatılabilir", §1 L32) falls outside business days. State that scheduled telafi days count.
- m4. §8 L198 says paper time is measured "Güz'ün son haftalarında, aynı derslerde". Spring pilot courses are different courses, so say "aynı hocaların derslerinde".
- m5. §3 L80 "iletilen yedek kod (dönemde en fazla 2 kez)" is missing "her derste". The cap is also shared with belirlenemeyen records.
- m6. Ek E L449 says "Bir fakülte ... kurum hesabı açamaz" next to "App Store'daki İÜ hesabı ise AUZEF'e ait" (seller "Auzef", 09 L11). Add one clause saying the AUZEF account is presumably IU's legal entity. S17 already asks.
- m7. §5 L134 says "test kanalları ... açık soru olarak S15'te", but S15 has no test-channel item. TestFlight still shows sessions and crashes for anonymous testers, and that is covered by the crash-data item.

Scratch files: `_a6_text.txt`, `_a6_links.txt`, `_a6_extract.py`.
