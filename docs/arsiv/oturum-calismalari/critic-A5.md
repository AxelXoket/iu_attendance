# Critic A5: fidelity of iu-yoklama-ozet.html (29.09.2026, 01:26 build) against research/01..10, mx-check.txt, src/ primary texts

VERDICT: FAIL

Reason: both critic-A4 BLOCKERs and eight of the nine MINORs are fixed. The latest edits add four new decision-relevant problems:
- a privacy regression. Md.36 disability arrangements now go through the app, which source 05 explicitly puts out of scope as health data.
- an edge-case row that the new iOS timing rule has made false.
- a false calendar claim in the S3 fallback.
- an unflagged personal-data transfer in the pilot's store distribution.

Each one needs only a one-line fix.

Method: the full text, including every `<details>` block, was extracted to `_a5_text.txt` (540 lines; 60 links, and the only link change is the new `#ek-g` anchor). It was diffed against `_a4_text.txt`, and every changed line was checked against its source. The following were computed by script: TestFlight expiry dates and weekdays. The following were re-read: `yonetmelik-2025.txt` Md.35 and Md.36, 05 L55-88 and L197-213, 03 L41-42, L72 and L143, 09 L11-19, L41-58, L103, L126-194, 08 L133-134, and 07 L109. The document contains no U+2014 or U+2013 characters.

---

## 1. Status of critic-A4 findings

| # | Status | Note |
|---|---|---|
| F1 TestFlight gap (BLOCKER) | FIXED | "~20 Ocak: pilot sürümü yüklenir" and "En geç 10 Nisan: yeni TestFlight sürümü". Script: 20 Oca 2027 + 90 = 20 Nis (Tue), and 10 Nis + 90 = 9 Tem. This covers the term (ends 30 Nis) and the last sync night (Sat 1 May). |
| O1 store account / iOS PWA gate (BLOCKER) | FIXED | The store account is now a prerequisite ("İÜ'nün kurum hesabı pilot için ön koşul"), and the iOS PWA fallback is removed. See m5 for how that reason is labelled. |
| m1 "60'tan fazla" | FIXED | "60 ve üzeri" (10 L253). |
| m2 §6 "tek izin Md.35" | FIXED, but the fix introduced B1 | The wording now matches Md.19(1). It also routes Md.36 through the app, against 05 L88. |
| m3 "son günü 2 Ekim" | FIXED | "Başvurular için hedef tarih 2 Ekim". |
| m4 Sunday-only AKSİS entry | PARTLY | The consequence is now stated (§7 L168). The added S3 fallback is arithmetically wrong (B3). |
| m5 Md.9(7) qualifier | FIXED | "kamu hukukuna tabi faaliyetlerinde". |
| m6 SheetJS "tek olgun", date | FIXED | "npm aynasına göre Temmuz 2024". The new justification matches 08 L133-134 (exceljs does not read .xls; CE cannot write styles). |
| m7 Play Integrity quota | FIXED | "bir haftaya kadar sürebiliyor" (07 L109). |
| m8 P-384 context | FIXED | "Android anahtar doğrulaması için" (03 L72). |
| m9 UBYS cause | FIXED | "Kullanıcı yorumlarına göre". |

---

## 2. New factual errors or inference stated as fact

**B1 (BLOCKER, privacy, escalate). The new text routes Md.36 disability arrangements through the app's generic status. The KVKK source rules this out.**
- Document §4 L108: "MVP'de belge numarasıyla girilen bir 'Görevli (Md.35 / ilgili mevzuat)' durumu olacak. İlgili mevzuattaki istisnalar ve engelli öğrenciler için kurul düzenlemeleri (Md.36) de bu durumla işlenir."
- Document §6 L148 says the same.
- Source 05 L88: "Engelli ogrenciler (IU reg. Art. 36) accommodations are also health data: out of scope for the app."
- Source 05 L60 and L84: the generic flag is "usable only for Art. 35 assignments".
- Source 05 L87: "if in practice the only excused students were medical cases, even a generic flag would leak health information. Restricting the flag to Art. 35 prevents this."
- The document contradicts itself as well. §5 L126 says "Tutulmayacak veriler: ... sağlık bilgisi".
- The primary text (Md.36) only gives the boards authority to make arrangements. It creates no attendance exception that the app has to carry.

Fix: keep the in-app status for Md.35 only. Handle other statutory exceptions and Md.36 outside the app (dilekçe, then the instructor's correction with a generic reason code). Alternatively, mark this as a [LEGAL] stop in S5/S16. This is a privacy decision for the owner, not the author.

**B2 (BLOCKER). The edge-case row "Okuttuktan sonra şarjı bitti" is now false on iOS.**
- Document §2 L69: "Kayıt telefonda durur. Zamanı, aynı açılıştaki zaman çapasından hesaplanır."
- New Ek C L330: "iOS'ta kayıt ancak okutmanın iki yanındaki çapalar aynı hızla uyuşursa zamanlanır. Tek yanlı iOS kaydı 'belirlenemeyen' sayılır."

If the battery dies after the scan, the phone reboots, so no post-scan anchor on the same boot can exist. On iOS the record is therefore "belirlenemeyen" and uses up one of the student's two auto-accepts per course per term (§3 L98). The row still holds for Android, where a pre-scan anchor on the same BOOT_COUNT that is at most 24 h old applies (L332).

Fix: split the row by platform. For iOS, say "belirlenemeyen, otomatik kabul kuralı (Bölüm 3)".

**B3 (BLOCKER, trivial fix). The S3 fallback claims a business day that a Friday close does not give.**
- Document S3 L206: "Hocaya bir iş günü gerekiyorsa senkron süresi Cuma 23:59'da kapatılır."
- If the window closes Friday 23:59, only Saturday and Sunday remain before the Sunday deadline (20 Ara 2026 and 2 May 2027 are Sundays, by script). Neither is an iş günü.
- For Friday sessions (18 Ara, 30 Nis), the same line's "en az 24 saat" rule pushes the close to Saturday 23:59 anyway.
- A business day would require a Thursday 23:59 close, with the minimum 24 h still holding for Friday sessions.

Fix: write "Perşembe 23:59", or replace "bir iş günü" with "bir gün daha".

**Inference stated as fact (MINOR, see m5):**
- §7 L178 "iOS'ta PWA yedek olamaz. Zaman çapası ve arka plan görevi PWA'da çalışmadığı için protokol taşınamıyor." This is the critics' engineering conclusion. It is well reasoned: there is no monotonic clock that survives a page reload, so every offline PWA scan would be "belirlenemeyen". But no research file states it, and 09 L148 judged a QR PWA "realistic" with weaker anti-fraud. Ek A attributes it to E, which is acceptable. §7 states it without attribution.
- Ek C L330 "Dürüst öğrencide bu nadir olur". This is a prediction. The Ek F target "≤%2 belirlenemeyen" is the right way to test it.

Checked and correct in the new text:
- TestFlight dates, as above. The first external build gets Beta App Review; later builds "may not" (09 L55).
- Vite 8.3.1 (24.09.2026), Workbox 7.4.1 (04.05.2026), pdfmake 0.3.11 (12.06.2026), Puppeteer 25.12.0 (23.09.2026). All match the fetched facts.
- kern.boottime shifts when the clock is set (Apple DTS thread 125634, as supplied).
- Base45 ~47 chars plus a 4-char marker gives ~51, within the 3-M alphanumeric capacity of 61.
- 29.09 to 01.12 is 9 weeks.
- Md.36 text (L979-981).
- Indiana: "confirmed misconduct with Top Hat codes texted to absent classmates" (03 L49).
- Play org account, government apps, 12x14 exemption (09 L15-16, L90).
- Default 10-minute close and device cap of 3: these are the author's design choices, not sourced claims. No finding.

---

## 3. Decision-relevant omissions

**B4 (BLOCKER, KVKK). The pilot's store distribution sends student personal data to Apple and Google, but §5 says it does not, and S15 does not ask about it.**
- Document §5 L132: "Mağazalar ve derleme hizmeti (App Store, Google Play, TestFlight, EAS) uygulamayı dağıtır. Uygulama bunlara kişisel veri göndermez."
- §7 plans a "Play kapalı testi". 09 L103: closed testing uses "email lists up to 2,000 users each or Google Groups". 09 L179 recommends a "Google Group of the department's students".
- TestFlight external testers join "by email or public link" (09 L55).
- If students are enrolled by email list or group, IU or the developer hands student accounts to Google or Apple. That is a foreign service processing personal data, which the document's own rule (Tek bakışta L24) says needs İÜ hukuk approval.
- The document also never says which Android track the pilot students use (production under the org account, or closed testing).

Fix, in one line each:
- §7: "iOS: TestFlight herkese açık bağlantı (e-posta toplanmaz). Android: kurum hesabından [production | kapalı test]."
- If a closed test is used, add "test kullanıcı listesi" to the §5 transfer list and to S15.

---

## 4. MINOR (do not fail the document)

- m1. The key horizon is inconsistent. §2 L44 says "Önümüzdeki 3 ders gününün anahtarları". §1 L31 "3 gün önceden", §3 L91 "3 gün geçerli", the edge case at L73 "3 günden uzun internetsiz kaldı | Anahtarların süresi dolar", and Ek A all say calendar days. Pick one.
- m2. The student PWA has three statuses. §1 L32 says "PWA ise açık soru (G-B)". Ek D L410 lists "Öğrenci için PWA" under "Sonraya kalanlar". §7, G-B and Ek A L252 say "elendi".
- m3. Ek B L256 "S1-S18" is stale; S19 now exists.
- m4. Ek C L332 "uzaklığın her günü için 50 ppm eklenir" is dimensionally garbled. The source is "grace = g0 + 50 ppm x sync_delay", about 4,3 sn per day (03 L42, L143). Suggested: "gecikme eşiğine uzaklığın 50 ppm'i (günde ~4,3 sn) eklenir".
- m5. §7 L178: attribute the iOS PWA conclusion ("E'nin çıkarımı", as Ek A already does). Ek C L330: "nadir olur" should read "nadir olması beklenir; Ek F ≤%2 ile ölçülür".
- m6. Ek E L440 lists the APK verification rule as unverified and states it as "2027'den itibaren küresel olarak zorunlu". Source 09 L18 marks it [CONFIRMED] as "2027 and beyond" and adds "Turkey is not in the first wave, so APK sideloading still works for the 2026-27 pilot". The document also drops that pilot-relevant clause.
- m7. §3 L98 "Sıra, QR'daki zaman aralığına göredir". Backup-code records have no QR. Suggested: "kaydın zaman aralığına göre".
- m8. §7 L177 "Apple ... hassas veri işleyen ... uygulamaları kurum hesabından istiyor". The rule text is confirmed, but 05 L204 marks its application to attendance data as [INFERENCE]. Ek E L439 lists only the Play side as inference, and the new hard prerequisite rests on both.

---

Scratch files: `_a5_text.txt`, `_a5_links.txt`, `_a5_extract.py` (this directory).
