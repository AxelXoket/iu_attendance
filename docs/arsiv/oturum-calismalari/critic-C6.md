# Critic C6: adversarial review of iu-yoklama-ozet.html (sixth revision)

Stance: competitor engineer who wants this rejected. Read-only, no browser automation.
Inputs: `iu-yoklama-ozet.html` (md5 6ebc7f79703c778e9c2d2eb6f9afe673, full source incl. all 9 `<details>`;
text via `_c6_extract.py` to `_c6_text.txt`, byte-identical to `_a6_text.txt`; the only script is the
theme/print toggle), `faculty-notes.md`, `critic-C.md`..`critic-C5.md`. Date 2026-09-29.
BLOCKER = changes a decision or makes a stated claim false. SPEC = protocol-spec detail.
Not re-raised: "Önlenemez" items, Ek F measurements, open questions, the 9-week freeze risk (labelled
"yüksek risk" with slip rule to Güz 2027).

VERDICT: FAIL (3 BLOCKER, 8 SPEC)

Checked, not a finding (script this session): 29 Eylül to 1 Aralık = 9.0 weeks; 1 Aralık Tue, 15 Aralık
Tue, 21 Aralık Mon, 20 Ocak Wed, 25 Ocak Mon, 30 Nisan Fri, 1 Mayıs Sat, 2 Mayıs Sun; 20 Ocak + 90 d =
20 Nisan (10 Nisan refresh OK); S3 default now handles the Sunday deadline; Play 12x14 rule does not
apply to organisation accounts.

## Part 1. Status of critic-C5 findings

| # | C5 item | Status | One line |
|---|---|---|---|
| B1 | Security test covers only core | FIXED | Whole MVP frozen 1 Aralık, Ek E scope lists review, roles, device change, calendar, Md.35; ~20 Ocak retest. Date nit: SPEC-4, retest slot: SPEC-2. |
| B2 | ML Kit sends data to Google | PARTLY | ZXing chosen, but "planlanan yerel modüle eklenecek" is not buildable as stated: new B1. |
| B3 | No-start-record rows contradict | PARTLY | Row now "geçici, hocaya bir kez sorulur, iptal edilen cihaz incelemeye"; "geçici" counting and post-revocation rejection unstated: SPEC-3. |
| B4 | iOS dead battery claim | FIXED | Edge row split Android/iOS; Ek F reports platforms separately. |
| B5 | Student PWA three statuses | FIXED | Bölüm 1, Ek A, Ek D all say "elendi"; G-B now a different question. |
| SPEC-1 | Week-1 false warnings | FIXED | Projection on held + remaining planned, levels never go back, regression test. |
| SPEC-2 | Pilot track / store gate | PARTLY | Open testing, no tester list, no Android-only pilot. S17 default still contradicts Ek E: SPEC-5. |
| SPEC-3 | "3 ders günü" vs "3 gün" | FIXED | "3 iş günü, en fazla 5 takvim günü" everywhere. Weekend gap: SPEC-7. |
| SPEC-4 | Median shift | FIXED | Reference is measured instructor offset. |
| SPEC-5 | expo-camera zoom | FIXED (iOS) | Android no longer uses expo-camera for decoding, so the Ek C zoom line is moot there (B1). |
| SPEC-6 | EAS Update | FIXED | Not used, updates via stores; Ek D row added. |
| SPEC-7 | iOS rate tolerance | FIXED, overcorrected | 2 s absolute + 48 h cap; contradicts the doc's own 50 ppm: SPEC-1. |
| SPEC-8 | Friday / Sunday deadline | FIXED | S3 default: Sunday entry, else Thursday close + manual Friday check. |
| SPEC-9 | Backup-code ordering slot | FIXED | "yedek kodda bu, kodun zaman dilimidir". |

## Part 2. Findings

### B1. BLOCKER: Android ZXing cannot be "added to the planned local module"; the camera stack decision changes
- Ek E: "Android'de QR, planlanan yerel modüle eklenecek ZXing (zxing-cpp) ile çözülecek"; the planned
  module is "tek küçük yerel modül" for clock sources (Ek C). expo-camera exposes no frames to JS or other
  native modules (Expo docs) and its Android build links `com.google.mlkit:barcode-scanning:17.3.0` and
  `camera-mlkit-vision`; `barcodeScannerEnabled: false` "only takes effect when expo-camera builds from
  source. Prebuilt modules already include the barcode scanning libraries." VisionCamera's scanner is ML Kit too.
- So Android needs its own camera view (CameraX ImageAnalysis + `io.github.zxing-cpp:android`) with its
  own zoom/lens/1080p logic, a new native UI module inside the 9-week freeze. Fallback "ML Kit S15'te
  onaya sunulur" meets the S15 default "İzin yok": Android students then have no scanner.
- Fix: Bölüm 1/Ek C: "Android'de expo-camera kullanılmaz; CameraX + zxing-cpp ile yerel kamera görünümü
  (Expo modülü), yakınlaştırma bu modülde. expo-camera yalnız iOS." Add it to the MVP list; S15 default for ML Kit stated.

### B2. BLOCKER: Ek C puts the daily key on the device, which falsifies "anahtar cihaza özel" and lost-device attribution
- Ek C: "günlük anahtar üretilir. Hocanın her cihazı kendi anahtarını bundan türetir". Bölüm 1 and Ek A:
  "hocanın her cihazına ayrı türetilir ... önceden indirilir" (server-side). If the device holds K_day,
  a stolen device mints QRs under the other devices' key numbers, "Cihaz iptal edilince o cihazın
  anahtarları yenilenir" does not stop it, and "kayıp diye iptal edilen cihazın kayıtları" cannot be found by key number.
- Fix: Ek C: "Sunucu K_dev = HKDF(K_gün, cihaz_no) türetir; cihaza yalnız K_dev iner, K_gün sunucudan
  çıkmaz. İptalden sonraki anahtar numarası reddedilir; iptal edilen cihazın son senkrondan sonraki kayıtları incelemeye düşer."

### B3. BLOCKER: "eski bir QR fotoğrafını okutmak: Önlenir" and "İki istisna var" are false for an unmodified app
- Recipe: friend sends a QR photo; Android: reboot, stay offline, scan, reboot again before sync (no
  same-boot anchor); iOS: reboot between anchors (rate mismatch). Both give "belirlenemeyen", which Bölüm 3
  auto-accepts up to 2 per student per course per term. Any photo, any delay, no flag.
- The bound (2, shared with the backup code) is the doc's accepted cap, so only the claims are wrong.
- Fix: move "eski QR fotoğrafı / iletilen QR" to "Sınırlanır: yeniden başlatılan telefonda belirlenemeyen
  olur, yedek kodla aynı 2'lik sınıra girer"; say "istisna: dönemde en fazla 2 kayıt (yedek kod ya da
  belirlenemeyen) ve değiştirilmiş uygulama". Regression test asserts belirlenemeyen + cap, not rejection.

### SPEC-1. iOS 2 s absolute tolerance contradicts the doc's own 50 ppm and rejects honest late syncers
- Ek C Android: "× 50 ppm (günde ~4,3 sn)". At 50 ppm 2 s is used up after 11.1 h (20 ppm: 27.8 h), so
  the "48 saat" cap is unreachable and ordinary next-day syncs land in the 2-cap; anchor RTT adds error.
- Fix: tolerance = 2 s + 50 ppm x interval (max ~10.6 s at 48 h), still far below any reboot gap
  (boot time plus old uptime); keep the lowest-RTT anchor sample.

### SPEC-2. ~20 Ocak retest has 3 working days before 25 Ocak and no failure rule
- 20 Ocak is Wednesday; retest, fixes and store propagation by Monday. If it fails, the Genelge bars
  going live and the doc has no fallback; the tested Aralık build expires 21 Mart (21 Aralık + 90).
- Fix: retest by 13 Ocak, or "geçmezse pilot Aralık'ta test edilmiş sürümle başlar, yeni sürüm en geç 11 Mart".

### SPEC-3. "Başlatma kaydı gelmedi: Kayıtlar geçici kalır" does not say whether they count, or what if unanswered
- Row 1 says unknown values "onaylanana kadar sayılmaz"; "geçici" elsewhere means counted-but-provisional.
- Fix: "Cevaplanana kadar sayılmaz; cevapsızsa AKSİS sayfasında KARAR BEKLİYOR."

### SPEC-4. Server date: prerequisite list "Hepsi 15 Aralık'a kadar" includes the İÜ server; text says 1 Aralık
- Fix: split the line: "İÜ sunucusu ve SMTP: 1 Aralık; güvenlik testi: 15 Aralık".

### SPEC-5. S17 default "sahibi bir öğretim üyesi" vs Ek E "başvuruyu imza yetkisi olan biri yapar"
- Apple requires the Account Holder to bind the organisation. Fix: "rektörlükçe yazılı yetkilendirilmiş öğretim üyesi".

### SPEC-6. Backup code has no course binding and its 1/1.000.000 is per slot, not per record
- In week 1 the phone has no course list, so a typed code cannot name the course. For a belirlenemeyen
  record the server must try every slot of a 10-min session (~24) x up to 3 devices: about 1/14.000.
- Fix: course picker from department list (or course digits in the code), one backup entry per session, restate the odds.

### SPEC-7. "3 iş günü" leaves weekend telafi without keys, against "Telafi dersi dahil internetsiz başlatılabilir"
- Fix: keys for every calendar day inside the window (max 5), including Saturday and Sunday.

### SPEC-8. S15 default "İzin yok" vs store-console crash data used in Ek A and Ek F ("Kararlılık ≥%99")
- Fix: give console crash data its own S15 default; if denied, Kararlılık uses sync data only.

## Part 3. Fixed constraints

- Offline-first: holds. SPEC-1 penalises honest offline iOS users; SPEC-6 week-1 backup code needs a course list.
- No AKSIS: respected (file in, page out by hand, deadline as admin field).
- Simplicity: B1 adds a native camera view to a solo 9-week build; B2 and B3 are wording fixes.

Sources: docs.expo.dev/versions/latest/sdk/camera/ (barcodeScannerEnabled, "Google code scanner");
github.com/expo/expo packages/expo-camera/android/build.gradle (ML Kit deps); visioncamera.margelo.com
code-scanning guide (MLKit); github.com/zxing-cpp/zxing-cpp wrappers/android (Maven artifact, ImageProxy).
Inference: iPhone monotonic-clock drift magnitude (doc's own 50 ppm used); whether linked-but-unused ML Kit transmits.
