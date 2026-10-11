# Critic C9: adversarial review of iu-yoklama-ozet.html (ninth revision)

Stance: competitor engineer who wants this rejected. Read-only, no browser automation.
Inputs: `iu-yoklama-ozet.html` (md5 91b6ba9de97b308bf0f58b92b2c981e5, 9 `<details>`, 0 em/en dashes),
text via `_c9_extract.py` to `_c9_text.txt` (md5 66aea67a94284a53b703bb0e282fcd2c, identical to `_a9_text.txt`),
line diff against `_c8_text.txt` (r8), `faculty-notes.md`, `critic-C8.md`. Date 2026-09-29.
BLOCKER = changes a decision or makes a stated claim false. SPEC = protocol-spec detail.
Not re-raised: "Önlenemez" items, Ek F measurements, open questions, 9-week freeze ("yüksek risk", slip to Güz 2027).

Verified today: npm `zxing-wasm` latest 3.1.4 published 2026-09-10T15:01Z (Ek D row correct); zxing-wasm README
"Serving via Web or CDN": the `.wasm` binary is fetched from a jsDelivr URL (fastly.jsdelivr.net) by default unless
`prepareZXingModule({ overrides: { locateFile } })` is set. Date math (script): 21 Ara + 80 = 11 Mart 2027,
20 Oca + 80 = 10 Nisan 2027, 20 Ara 2026 and 2 May 2027 are Sundays, 29 Eyl to 1 Ara = 9.0 weeks.

VERDICT: FAIL (1 BLOCKER, 4 SPEC)

## Part 1. Status of critic-C8 findings

| # | C8 item | Status | One line |
|---|---|---|---|
| B1 | Crash log needs a third native module | FIXED | JS global handler + next-launch marker, "yerel kod gerekmez"; ApplicationExitInfo/MetricKit moved to Ek D Sonraya, Ek A, Ek F, Ek G updated; native count stays two. Marker semantics: SPEC-1. |
| SPEC-1 | Wrong-time Başlat counts a held session | FIXED | Ek C "Yapıldı": unscheduled start counts only after hoca confirms and enters hours. |
| SPEC-2 | Revocation wording, found device queue | FIXED | Bölüm 3 and Ek C table scoped to "iptalden önce sunucuya ulaşmamışsa"; edge row "numarası bir daha kullanılmaz"; found queue shown for approval. |
| SPEC-3 | Android reboot regression ordering | PARTLY | Post-scan same-boot anchor now defined, but the "okut, yeniden başlat, senkronla" case was labelled Android (C8 said iOS) and now contradicts the edge table: B1. |
| SPEC-4 | S15 settles KVKK question as fact | FIXED | Marked "çıkarım, hukuk birimi teyit etmeli", fallback named. Fallback identity gap: SPEC-4. |
| SPEC-5 | Panel QR decoding library | FIXED | Ek D zxing-wasm 3.1.4 (date verified). Typed fallback and CDN default: SPEC-2, SPEC-3. |

## Part 2. Findings

### B1. BLOCKER: the new Android regression test pins the opposite of the Kenar durumlar claim
- Ek C test: `Android, "okut, yeniden başlat, sonra senkronla": kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.`
- Kenar durumlar "Okuttuktan sonra şarjı bitti" (the same sequence: scan, phone dies/reboots, sync later):
  "Android'de zamanı okutmadan önceki çapadan hesaplanır (çapa 24 saatten yeniyse)". Ek C Zaman çapası says the
  same (single same-boot anchor + 50 ppm). Bölüm 2 says an anchor is taken on every app open, so a fresh pre-scan
  anchor is the normal case. A correct implementation fails the test; an implementation that passes it pushes every
  honest battery-dead Android student into the 2-record auto-accept quota and makes the edge row false (C7 B1 class).
- Bölüm 3 "Telefon arada yeniden başlatıldıysa kayıt belirlenemeyen olur" is also unscoped and false on Android.
- Fix: test becomes `Android, "yeniden başlat, internetsiz okut, yeniden başlat, senkronla" (okutmayla aynı açılışta
  çapa yok): belirlenemeyen`; add `Android, "okut (24 saatten yeni çapa var), yeniden başlat, senkronla": zaman
  önceki çapadan belirlenir`; Bölüm 3: "iOS'ta, Android'de ise okutmayla aynı açılışta çapa yoksa".

### SPEC-1. "Düzgün kapanıp kapanmadığı" marker counts battery death and reboots as crashes
- Mobile apps are not closed cleanly; the OS kills them in background. The marker must be set on foreground and
  cleared on `AppState` background, or every OS kill is a crash. Even then, a phone that dies with the app open
  (a named edge case, basement, low battery) or reboots is counted, contaminating Ek F Kararlılık ≥%99.
- Fix: "İşaret ön plana gelişte konur, arka plana geçişte silinir; araya yeniden başlatma girdiyse (Android
  BOOT_COUNT, iOS'ta açılıştan beri geçen süre azalmışsa) çökme sayılmaz." Uses the existing clock module.

### SPEC-2. The typed "kısa kod" cannot verify a P-256 signed receipt
- An ECDSA P-256 signature is 64 bytes and cannot be truncated; the QR payload part is identical for every student
  in the same 5 s slot, so a short code built from it is forwardable. As written, the fallback is either
  unverifiable (then it is "beyana dayalı") or needs an unstated server-known per-device secret.
- Fix: "Kısa kod, cihaz bağlanırken sunucuyla paylaşılan ayrı bir anahtarla üretilen, ders, oturum ve zaman
  aralığına bağlı ≥40 bitlik bir koddur" or drop it and say "kamera yoksa düzeltme beyana dayalı yapılır".

### SPEC-3. zxing-wasm fetches its WASM from jsDelivr by default
- Breaks the offline panel unless precached, and sends the hoca's IP to a foreign CDN, against Bölüm 5 / "Veri"
  line ("Kişisel veri işleyen hiçbir yurtdışı servis ... onay olmadan kullanılmaz").
- Fix (Ek D zxing-wasm row): "WASM dosyası panelle birlikte İÜ sunucusundan sunulur ve Workbox ile önbelleğe
  alınır (`prepareZXingModule`, `locateFile`); CDN kullanılmaz."

### SPEC-4. S15 SMS fallback drops proof of student identity
- The e-mail code proves control of the institutional mailbox; an SMS code proves only a phone number. With
  "Uymazsa hoca onaylar", anyone typing a classmate's number and name auto-matches. Ek D also says "SMS yalnız
  hesap kurtarmada", and phone numbers are new personal data for the aydınlatma metni.
- Fix: "SMS yedeğinde her öğrenci eşleşmesi hocanın onayına düşer; telefon numarası aydınlatma metnine eklenir";
  align the Ek D Passkey ve SMS row.

## Part 3. Fixed constraints

- Offline-first: holds, except SPEC-3 (default CDN WASM fetch in the panel). Unscheduled-start confirmation and
  found-device approvals are later panel actions, not needed in class.
- No AKSIS: respected (file import, manual AKSİS sayfası, deadline as admin field).
- Simplicity: improved. Crash detail moved out of MVP; native code back to two places. No new moving parts
  beyond one browser library.

Sources: registry.npmjs.org/zxing-wasm (3.1.4, 2026-09-10); github.com/Sec-ant/zxing-wasm README "Serving via Web or
CDN". Inference (not verified): whether iOS gives the JS background handler enough time to persist the marker;
expected to, since iOS allows a few seconds after backgrounding.
