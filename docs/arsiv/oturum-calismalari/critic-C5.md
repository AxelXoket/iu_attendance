# Critic C5: adversarial review of iu-yoklama-ozet.html (fifth revision)

Reviewer stance: competitor engineer who wants this rejected. Read-only review, no browser automation.
Inputs: `iu-yoklama-ozet.html` (md5 25fc42bfb52d0428fdb9318c77afdb88, full source incl. every `<details>`,
text extracted by `_c5_extract.py` to `_c5_text.txt`, identical to `_a5_text.txt`), `faculty-notes.md`,
`critic-C.md` .. `critic-C4.md`, `research/01-framework.md`, `research/09-distribution.md`. Date: 2026-09-29.
Classification: BLOCKER = changes a decision or makes a stated claim false. SPEC = detail for the protocol
spec. Not re-raised: "Önlenemez" items, pilot measurements (Ek F), open questions S1-S19 and G-A..G-D
(except where a stated default contradicts another section).

VERDICT: FAIL (5 BLOCKER, 9 SPEC)

One line: the C4 fixes are in, but the security test only covers a core that cannot run the pilot, the
chosen Android scanner sends usage data to Google against the doc's own KVKK rule, two flag-table rows
give opposite outcomes for the same session, and two stated claims (iOS dead battery, student PWA
status) are false or contradictory.

Checked and NOT a finding: weekdays (20 Aralık 2026 and 2 Mayıs 2027 are Sunday, 1 Mayıs 2027 Saturday,
30 Nisan Friday, 25 Ocak Monday), 29 Eylül to 1 Aralık = 9.0 weeks, TestFlight 90 days (Apple overview:
"You can test a build for up to 90 days"): 20 Ocak + 90 = 20 Nisan, refresh by 10 Nisan leaves 10 days,
10 Nisan + 90 = 9 Temmuz covers the 1 Mayıs sync end. Base45 47 + 4 = 51 <= 61 (V3-M). iOS two-sided
rule defeats the C4 reboot + clock-set recipe (a reboot between anchors makes u2 - u1 differ from
t2 - t1 by at least the old uptime plus boot time), subject to SPEC-7. Android BOOT_COUNT + 24 h cap
closes C4 SPEC-2. Phone-side non-rejection closes C4 B3. All by script or reasoning in this session.

---

## Part 1. Status of the 17 critic-C4 findings

| # | C4 item | Status | Reason |
|---|---|---|---|
| 1 | B1 iOS PWA fallback | FIXED | PWA dropped, İÜ store account is a gate item (Bölüm 7, Ek A). Stale "açık soru" text left in Bölüm 1: new B5. |
| 2 | B2 kern.boottime | FIXED | iOS timed only with same-rate anchors on both sides, one-sided iOS = belirlenemeyen, clock-shift regression test. Side effects: new B4 (edge row now false), SPEC-7 (rate tolerance). |
| 3 | B3 week-1 rejection | FIXED | "Telefon ders üyeliğine bakarak reddetmez", stores and says "Listende yok". |
| 4 | B4 code drives schedule | PARTLY | Sentence replaced, core listed, slip rule "pilot Güz 2027'ye kalır" added, S14 asks test length. But the core cannot run the pilot and the rest has no test slot: new B1. "1 Aralık: ana özellikler" still differs from "çekirdek". |
| 5 | SPEC-1 TestFlight expiry | FIXED | ~20 Ocak upload, 90-day note, new build by 10 Nisan. |
| 6 | SPEC-2 one-anchor unbounded | FIXED | Android: anchor older than 24 h = belirlenemeyen. |
| 7 | SPEC-3 start value order | PARTLY | Classification at sync-window end adopted. "No start record at all" still contradicts "unknown value = review": new B3. |
| 8 | SPEC-4 flag effects, muaf | FIXED | Both rows say "Kayıtlar sayılmaya devam eder", muaf excluded from 5 %, code read aloud or manual add. |
| 9 | SPEC-5 auto-accept order | FIXED | Order by QR slot, exported record never displaced. Backup-code slot nit: SPEC-9. |
| 10 | SPEC-6 key horizon | PARTLY | "Önümüzdeki 3 ders günü" adopted, but four other places still say "3 gün geçerli": SPEC-3. |
| 11 | SPEC-7 window vs deadline | FIXED | min(7 d, deadline - 1 d 23:59 Istanbul), floor 24 h, every class (Ek C). |
| 12 | SPEC-8 logout with outbox | FIXED | "Gönderilmemiş kayıt varken çıkış yapılamaz ve hesap silinemez." |
| 13 | SPEC-9 new instructor device | FIXED | Device list, email per new device, max 3. |
| 14 | SPEC-10 term lock | FIXED | Flag row: stored, shown, counted only via audited correction. |
| 15 | SPEC-11 combined sections | FIXED | Own group key, one head count (Ek C, S18). |
| 16 | SPEC-12 projection path | FIXED | S19 added. |
| 17 | SPEC-13 Base45 space | FIXED | Non-space prefix and suffix, ~51 chars. |

---

## Part 2. Findings (most severe first)

### B1. BLOCKER: the security test covers only a core that cannot run the pilot; the rest ships untested
- Bölüm 7: "Güvenlik testine yetişmek için çekirdek özellikler 1 Aralık'ta dondurulmalı. Çekirdek: kayıt
  ve giriş, ders tanımı ve liste içe aktarma, Başlat-QR-okutma-senkron, sunucu doğrulaması, devam hesabı,
  AKSİS sayfası ve hesap silme." Ek E: Genelge 2019/12 wants "canlıya almadan önce güvenlik testi".
- Missing from the core but required on 25 Ocak by the doc's own flows: review queue and approve
  (flagged records "onaylanana kadar sayılmaz", so without it they never count), elle düzeltme with audit
  and roles (faculty requirement, edge rows "Hoca öğrenciyi elle ekler"), cihaz değişimi and signed cancel,
  instructor device list, revocation and key renewal, bölüm yöneticisi approval of instructors, receipt
  QR verification, head count, calendar (tatil, iptal, telafi, "yapıldı mı"), Md.35 / muaf, term lock,
  Excel export. Most of these are the authorisation-sensitive endpoints a security test exists for.
- No slot is given for building them (1 Aralık to ~20 Ocak includes the student developer's own finals
  21-31 Aralık) and no retest before the ~20 Ocak pilot build. So either the tested system is not the
  live one (Genelge claim false) or the pilot starts without half its MVP.
- Also: the test needs the İÜ server running by 1 Aralık, not 15 Aralık as the gate list implies.
- Fix: move review/approve, elle düzeltme + roles, cihaz değişimi, device revocation and instructor
  approval into the frozen core; state "1 Aralık-20 Ocak: yalnız çekirdek dışı ve düşük riskli ekler,
  20 Ocak sürümü için BİDB'den kısa yeniden test" and add that retest to the gate. Change "İÜ sunucusu"
  deadline to 1 Aralık. Replace "ana özellikler" with "çekirdek".

### B2. BLOCKER: the Android scanner (expo-camera, ML Kit) sends usage data to Google, against the doc's own rule
- Doc: "Kişisel veri işleyen hiçbir yurtdışı servis ... İÜ hukuk biriminin onayı olmadan kullanılmaz",
  "Üçüncü parti analitik ya da çökme SDK'sı yok", "Uygulama bunlara kişisel veri göndermez", and Bölüm 5
  lists "Çökme raporu ve analitik" as yurtdışı aktarım.
- expo-camera on Android scans through Google ML Kit / Play services code scanner (Expo docs: "On
  Android, we will use the Google code scanner"; expo-camera build.gradle pulls
  com.google.mlkit:barcode-scanning). Google's ML Kit data disclosure: bundled APIs send device
  information (manufacturer, model, OS version, build), performance metrics and per-installation
  identifiers "for diagnostics and usage analytics". Google has not documented a supported opt-out
  (googlesamples/mlkit issue 1076). That is exactly the analytics transfer the doc bans without approval.
- Fix (pick one, it is a stack decision): (a) Android QR decode with ZXing / zxing-cpp inside the
  already-planned local native module (no network, Apache-2.0), or (b) keep ML Kit and add "ML Kit
  kullanım verisi" to the Bölüm 5 transfer list and S15. iOS (AVFoundation) is not affected.

### B3. BLOCKER: two flag-table rows give opposite outcomes when no start record arrives; the stolen-device path passes unflagged
- Ek C: "Kayıt incelemede (... bilinmeyen başlatma değeri): Onaylanana kadar sayılmaz" and "Başlatma
  değerleri senkron süresinin sonunda sınıflanır. Bilinmeyen ... hocaya ... sorulur." Same table:
  "Başlatma kaydı gelmedi: Planlı derste kayıtlar geçerlidir." With no start record every value is
  unknown, so one row says "not counted", the other "counted".
- Attack under the second reading: instructor loses the only device, holds class on paper ("Hiç cihaz
  yoksa yoklama kâğıtla alınır"), finder starts the planned session on the lost device before it is
  revoked and shows the QR to friends outside the room at the real slot time (zero delay). No start
  record, no head count, planned session: records count, no flag. Bölüm 3's "Çalınan hoca anahtarı ...
  Bilinmeyen başlatma değerleri hocaya sorulur" is false on this path.
- Fix: "Başlatma kaydı gelmedi" = records provisional; at window end the instructor answers once per
  session "Bu dersi uygulamayla aldınız mı?" (cluster, one tap). Records from a device later revoked as
  lost, dated after its last sync, go to review. State that post-revocation key numbers are rejected.

### B4. BLOCKER: the "şarjı bitti" edge case is false on iOS
- Bölüm 2 edge row: "Okuttuktan sonra şarjı bitti: Kayıt telefonda durur. Zamanı, aynı açılıştaki zaman
  çapasından hesaplanır." Ek C: "iOS'ta açılış kimliği yok ... Tek yanlı iOS kaydı 'belirlenemeyen'
  sayılır." After a dead battery there is no same-boot anchor after the scan, so every such iOS record is
  belirlenemeyen and uses one of the student's 2 auto-accepts; the third one goes to review. The same
  holds for iOS overnight update reboots. The row promises the opposite for every iPhone user.
- Fix: edge row "Android: aynı açılıştaki çapadan hesaplanır (çapa 24 saatten yeni ise). iOS:
  belirlenemeyen, otomatik kabul kuralı uygulanır." Count iOS one-sided records separately in the Ek F
  "Zaman çapası" metric so the pilot sees the platform split.

### B5. BLOCKER: the student PWA has three different statuses in one document
- Bölüm 1 Kararlar, Öğrenci uygulaması row, 2. seçenek: "PWA ise açık soru (G-B)." G-B default and
  Ek A: "Öğrenci için PWA elendi." Ek D lists it under "Sonraya kalanlar", not "Elendi". The go/no-go
  gate treats the İÜ store account as hard only because the PWA is eliminated ("iOS'ta PWA yedek
  olamaz"); the decision table tells a reader the fallback is still open.
- Fix: Bölüm 1 cell "Flutter 3.47. Öğrenci PWA'sı elendi (Bölüm 7)"; move the PWA to Ek D's eliminated
  table with the reason; reword G-B as closed (or drop it from open questions).

### SPEC-1. Mid-term threshold warnings with T = held hours fire "Hakkını aştın" for a single week-1 absence
- Bölüm 4: "hak = T - (T x p + 99) div 100, T yapılan ders saatlerinin toplamı", warning on level change.
  Script: a 3 h/week course, one missed 3 h class: week 1 hak 0, week 2 hak 1, week 3 hak 2, all
  "Hakkını aştın. Kesin durum AKSİS'te ilan edilir"; only from week 5 (hak 4) does it clear, and levels
  then move backwards. Every week-1 add-drop student is hit.
- Fix: warnings use T_proj = held + remaining planned hours; the final decision uses held hours (S4).
  Levels only move forward within a term. Add the week-2 case to the regression test.

### SPEC-2. Android pilot track and store gate details are unstated
- "Play kapalı testi" needs tester Google account emails (list or Google Group): an operational load and a
  transfer of student personal data to Google. The İÜ org account can publish to production or open
  testing without a list. Also state whether an Android-only pilot is allowed when only the Play account
  is ready, and note that Apple requires the enrolling Account Holder to have legal binding authority
  for İÜ (S17 default "sahibi bir öğretim üyesi" needs a written İÜ authorisation).

### SPEC-3. Key lifetime: "3 ders günü" vs "3 gün geçerli"
- Bölüm 2 says download "önümüzdeki 3 ders günü"; Bölüm 1, Bölüm 2 edge row, Bölüm 3 and Ek A say "3 gün".
  If "ders günü" is the instructor's own teaching days, a Monday-only instructor holds 3 weeks of keys,
  so the stolen-key bound is false. Fix: "takvimdeki önümüzdeki 3 iş günü, anahtar ömrü en çok 5 takvim
  günü" everywhere.

### SPEC-4. The per-start-value median can be shifted by a majority of forwarded records
- Delay is measured against the median of records with the same start value, and the instructor clock
  may drift 10 minutes before a flag. If most records of a start value are forwarded (small class, or
  a second start value used only for forwarding) their delay becomes the baseline. Head count still flags
  the session, but not the records. Fix: use the measured instructor device offset as the reference and
  flag when the median differs from it by more than the delay threshold.

### SPEC-5. "Kamera 2x yakınlaştırmayla açılır" is not an API value in expo-camera
- expo-camera `zoom` is "a value between 0 and 1 being a percentage of device's max zoom"; max zoom and
  default lens differ per device (UBYS 0.5x complaint). Fix: compute zoom from the device's reported max
  factor and select `builtInWideAngleCamera` via `selectedLens`; test on an iPhone Pro and two Androids.

### SPEC-6. The Expo cost line implies EAS Update, which is a foreign transfer
- "kampüs genelinde ayda ~19 USD" only scales with users if it is the OTA update MAU tier
  (research/01-framework.md: free tier OTA to 1K MAU, Starter 19 USD). EAS Update fetches go from
  every phone to Expo's servers. Fix: state "EAS Update kullanılmaz, güncelleme mağaza/TestFlight ile"
  (or self-host expo-updates on İÜ) and correct the cost line.

### SPEC-7. iOS two-sided rate tolerance has no interval cap
- If the rate check tolerance is 50 ppm of the anchor interval, a reboot shortly after an anchor
  (discrepancy ~50 s) passes once anchors are about 12 days apart (50 ppm x 12 d = 52 s), and the scan
  is timed about 50 s early. Needs the phone offline for that long, but Android has a 24 h cap and iOS
  none. Fix: absolute tolerance (for example 2 s) or max anchor interval 48 h, else belirlenemeyen.

### SPEC-8. S3 default "senkron Cuma 23:59" does not give a working day
- In both terms the last teaching day is Friday (18 Aralık, 30 Nisan) and the window floor is 24 h, so
  Friday classes still close on Saturday; the next working day is after the Sunday deadline. Fix: either
  accept Sunday entry or close non-Friday classes Thursday 23:59 and give Friday classes a manual path.

### SPEC-9. Backup-code records have no "QR zaman aralığı" to order by
- Auto-accept order is "QR'daki zaman aralığı". Fix: for backup codes use the code's rotation slot.

---

## Part 3. Contradictions with the fixed constraints

- Offline-first: consistent. Start, scan, device approval and held records all work offline. ML Kit
  (B2) transmits only when online, so it is a KVKK problem, not an offline one. iOS one-sided records
  (B4) make honest offline students with a dead battery pay from the auto-accept cap.
- No AKSIS: respected. Roster in by file, AKSIS page out by hand, deadline is an admin field.
- Simplicity: B3's "ask once per session" keeps instructor work bounded; B1's fix moves work earlier,
  not later. SPEC-1 false warnings would generate avoidable student complaints to instructors in week 2.

## What improved (for fairness)
Store gate made explicit and the PWA removed from the protocol path, iOS boot handling honest, phone no
longer rejects on membership, named core with slip rule, TestFlight refresh, 24 h anchor cap, start values
classified at window end, logout guard, instructor device list and cap, term-lock row, group key.

Sources: Apple TestFlight overview (developer.apple.com/help/app-store-connect/test-a-beta-version/
testflight-overview); Apple D-U-N-S page (developer.apple.com/support/D-U-N-S/); Expo Camera docs
(docs.expo.dev/versions/latest/sdk/camera/); Google ML Kit Android data disclosure
(developers.google.com/ml-kit/android-data-disclosure); googlesamples/mlkit issue 1076; expo/expo issue
39449 (ML Kit dependency in expo-camera). Arithmetic (weekdays, 90-day dates, warning table) by script
in this session. Inference, not verified: that expo-camera SDK 57 still links ML Kit by default on
Android (true for recent SDKs per build.gradle and issue 39449); that the İÜ security test would treat
the post-freeze features as in scope.
