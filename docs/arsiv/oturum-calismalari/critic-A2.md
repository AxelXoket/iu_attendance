# Critic A2: fidelity of iu-yoklama-ozet.html against research/01..10, mx-check.txt, src/ primary texts

VERDICT: FAIL

Reason: 2 high-severity decision-relevant gaps (Md.35 students defaulted to absent; 7-day sync window collides with the AKSIS deadline), 5 factual errors against primary text or sources, several inferences stated as fact. 36 of 38 critic-A findings fixed.

Method: full text of the HTML extracted (all 6 `<details>` blocks included, 48 links listed). Every number re-checked against the research file or primary text. Deterministic re-checks done by script: float vs integer allowance (39 mismatches, T=15 at 80% -> 2 vs 3: document correct); Bahar 25 Jan to 30 Apr 2027 = 95 days (correct); 16:9 screen heights 1.25/1.49/1.87 m (correct); QR version for the document's own payload (see E6); guess odds with a check digit (see E5). Regulation articles read in `research/src/yonetmelik-2025.txt`.

---

## 1. Status of critic-A's 38 findings

| # | Status | Note |
|---|---|---|
| 1 NFC reason | FIXED | HCE rejected; NFC tag kept for labs. |
| 2 anabilim dalı | FIXED | |
| 3 Genelge 2019/12 domestic provider | FIXED | "İÜ kontrolünde ... veri işleyen sözleşmesiyle"; rented VM excluded. |
| 4 Md.35 scope | FIXED, then over-corrected | Now "Yalnız ..."; primary text says "gibi" (see E1). |
| 5 Kurum vs Kurul | FIXED | |
| 6 exceljs fork | FIXED | |
| 7 Expo cost | FIXED | "gerekebilir", 1K MAU named. |
| 8 email username | FIXED | "güvenilir biçimde içermiyor". |
| 9 raporlu as settled | FIXED | Now S5; but the new default has its own problem (O2, O3). |
| 10 2024/197 precedent | FIXED | |
| 11 last-time cause | FIXED | S1 says no source. |
| 12 QR caveats | FIXED | Ek C: 2x zoom, planning numbers, measure in hall. |
| 13 offline check-in claim | FIXED | "duyurmuyor". |
| 14 device mechanism | FIXED | IDFV/ANDROID_ID salted hash, flag not block. |
| 15 Play org exemption | FIXED | Marked unverified (sources conflict: 09 L15 and 10 F9 say confirmed, 09 L98 reported; document took the cautious side, acceptable). |
| 16 Google-hosted mailboxes | FIXED | KVKK bullet + S15. |
| 17 opt-in mailbox | FIXED | S12, pilot note. |
| 18 helper retention branch | FIXED | |
| 19 never-sync / after-deadline | FIXED | Server-issued keys (Ek A row 1); late records to instructor review (Ek A). |
| 20 unpreventable list | FIXED | |
| 21 pilot metrics | FIXED | |
| 22 Apple 5.1.1(ix) | FIXED | |
| 23 AKSIS deadline | FIXED as a fact, but its consequence is missing (O1). |
| 24 accessibility, AUDITOR | PARTLY | Accessibility in MVP; AUDITOR moved to "Sonra" with no Ek A row. |
| 25 load row | NOT FIXED | Still only the 1/week row (8.4M / 4.2 GB), not labelled as an estimate; 2/week row (16.8M / 8.4 GB, 02 L95) absent. Low. |
| 26 flagged records | FIXED | Ek A. |
| 27 PDF | FIXED | Ek A. |
| 28 TA role | FIXED | Ek A. |
| 29 reminders | FIXED | Ek A. |
| 30 rebind parameters | FIXED | Ek A. |
| 31 personal email | FIXED | Ek A. |
| 32 QR rotation | FIXED | Ek A. |
| 33 session secret | FIXED | Ek A (new design, stated). |
| 34 speed target | FIXED | Ek A. |
| 35 primary sign-in | FIXED | Ek A. |
| 36 key algorithm | FIXED | Ek A. |
| 37 rebind notice push | FIXED | Moot: pilot rebind is instructor-approved. |
| 38 pg-boss | FIXED | Removed. |

---

## 2. New factual errors

**E1. Md.35 is narrower in the document than in the regulation (MEDIUM).**
Document §4: "Md.35: Yalnız spor, kültür, sanat ve yarışma görevlendirmeleri devamsızlık sayılmaz." and "Maddeler birincil metinden kontrol edildi."
Primary (`yonetmelik-2025.txt` L970-974): "Spor karşılaşmaları, kültür ve sanat faaliyetleri ve yarışmalar **gibi** etkinliklerde görevlendirilen öğrencilerin, bu etkinliklere **ve bunların hazırlık çalışmalarına** katılmak zorunda olmaları nedeniyle ...". The list is illustrative ("gibi") and covers preparation time. Md.19(1) also excepts "ilgili mevzuat hükümlerinde belirtilen durumlar". "Yalnız" is wrong.
Fix: "Md.35: spor, kültür, sanat, yarışma gibi etkinliklere (hazırlık dahil) görevlendirme süresi devamsızlıktan sayılmaz; Md.19(1) ayrıca başka mevzuattaki istisnaları saklı tutar."

**E2. S5 says "izinli" has no exemption (HIGH, see O1 for the consequence).**
Document S5: "Raporlu ve izinli nasıl işlenecek? | Yönetmelikte bir muafiyeti yok ... | 'Mazeretli' olarak işaretlenir ama devamsız sayılır." Same in §6 row "Raporlu / izinli".
Primary Md.35 is exactly an exemption for officially assigned (görevli) students. The document's own §4 says so. The S5 default applies "devamsız sayılır" to them.

**E3. Md.24 does not mention a health report (LOW).**
Document §4: "Md.24 ve 29'da rapor yalnız mazeret sınavı ve kayıt dondurma için geçiyor".
Primary Md.24(2)(c) (L647-651): mazeret sınavı for "geçerli bir nedenle", by petition, unit board decides. "sağlık"/"rapor" occurs only at L810 and L832 (both Md.29). Contradicts the "birincil metinden kontrol edildi" claim.

**E4. The calendar link points to the superseded draft, which contradicts the dates given (MEDIUM).**
Ek E link "İÜ 2026-2027 akademik takvim" -> `yeni-2026-2027-egitim-ogretim-yili-onlisans-ve-lisans-akademik-takvimi.pdf`.
06 L210-225: that file is the 30.06.2026 draft (ekle-bırak 14-18 Eylül / 25 Ocak-1 Şubat). The current file is `2026-2027-akademik-takvimi-guncel-hali-(1).pdf` (04.08.2026), which is where the document's "Ekle-bırak 5-6 Ekim ... 8-9 Şubat" comes from. A reader who clicks the only calendar source sees different add-drop dates. Link both, labelled "güncel" and "taslak (AKSİS son günü için)".

**E5. Backup code arithmetic is inconsistent (LOW-MEDIUM).**
§1: "Yedek: kontrol haneli, dönen 6 haneli kod." Ek C: "tahminle tutturma olasılığı 1/1.000.000."
03 L50: 1e-6 is for 6 secret digits. critic-C L150 added a Damm check digit. If the check digit is one of the 6, only 5 are secret and p = 1/100.000 (computed). Either say "6 hane + 1 kontrol hanesi (7 karakter)" or change the odds.

**E6. QR version "2-3" no longer holds for the document's own payload (LOW).**
Ek C: "{oturum_id, anahtar_id, zaman_dilimi, kapanış} + 96 bitlik MAC ... QR sürüm 2-3 olur."
03's version-2 figure is for a 25-byte payload without key id and close time. Recomputed with segno (`pylib`): 1+8+key_id+4+4+12 bytes = 31-37 B -> version 3 at ECC M in every case (29 modules, 2.32 m at 20 m, 1.16 m with 2x); version 4 (2.64 m / 1.32 m) with base32 text and an 8-byte key id. Version 2 is reachable only at ECC L with a 2-byte key id. The "~2,0-2,3 m" range should read "~2,3 m (2x ile ~1,16 m)".

**E7. ESTÜ is not a QR system in the source (LOW).**
§6: "Rakipler (Fırat, Hacettepe, Düzce, ÇOMÜ, BUÜ, ESTÜ) QR ile yoklama alıyor". 04 L56: ESTÜ method "App check-in", network-only; QR not stated.

**E8. CSV injection list is incomplete (LOW, but it is a security spec).**
Ek C: '"+", "-" ve "=" ile başlayan hücreler ... kaçışlanır.' 08 L156: "= + - @", tab, CR, LF (OWASP). 08 also recommends V/Y or 1/0 in CSV instead of "+"/"-" marks.

**E9. Login rejections misstated (LOW).**
§1 Giriş: "Elenen: SMS, passkey." 07 L58-59: SMS = "optional recovery factor"; passkey = "Add later for login", rejected only for device binding. Ek C states the device-binding reason correctly; the decision row does not.

**E10. "push servisleri kullanılamaz" contradicts the document's own KVKK row (LOW).**
Tek bakışta: "Gerçek veri için Firebase, Supabase Cloud ve push servisleri kullanılamaz." §1 row: "Sonra: İÜ onaylarsa içeriksiz push." 05 L134: push is a transfer needing SS-2 and a legal-office decision, not barred. Genelge 2019/12 item 3 bars foreign cloud storage, not push. Write "İÜ hukuk onayı olmadan kullanılmaz."

**E11. Ek B says "aynen" but drops the 01-framework escalation (LOW).**
escalations.md "## 01-framework": "Next action: ask the owner whether the student developer already knows Dart or React, and whether a Mac is available, before locking in the stack." Ek B lists 02, 10, 08, 07, 03, 09, 04, 06, 05 and the design critic; 01 is missing (S-A covers the substance, but the owner's rule is verbatim delivery).

**E12. iOS pilot channel is contradictory (LOW).**
§7: "iOS'ta Unlisted dağıtım kullanılacak." next line: "TestFlight sürümleri 90 gün geçerli ... 8. haftasında yeni sürüm yüklenmeli." Unlisted is App Store distribution (no expiry, full App Review, declined for beta builds, 09 L78); TestFlight is the 09 pilot path. State which one the Bahar 2027 pilot uses. 09 also rates guideline 3.2 (limited audience) HIGH risk for a store release; not mentioned.

---

## 3. Inference or unverified items stated as fact

- **"Senato yönerge çıkarmadıkça uygulama yalnız yardımcıdır."** (§4) 05 §8 L233: [INFERENCE, LEGAL]. 05 L236 also names the faculty board as a sufficient route for the pilot; the document names only the Senate.
- **Clock sources** (Ek C: "Android: elapsedRealtime + boot count; iOS: CLOCK_MONOTONIC + kern.boottime"). 03 L41 "[I, verify in implementation]"; 03 escalation 4 asks exactly this ("which iOS monotonic clock keeps counting through sleep ... whether Android BOOT_COUNT is available"). The design rests on it; mark "uygulamada doğrulanacak".
- **"CameraX'in varsayılan 640x480 akışı bu mesafede okuyamıyor."** Only source is critic-C's script (68 degree FOV assumed, 1.4 m QR); not measured, and whether expo-camera uses the CameraX default is not established. Mark as estimate.
- **"iOS 26 / iPhone 17'de arka planda BLE taraması duruyor (FB20381425)."** 03 L54: forum report, unresolved. Write "raporlanıyor".
- **"Android'de Güvenli Klasör veya ikinci profil"** (unpreventable) and the rationale "Güvenli Klasör zaten engeli aşıyor" (Ek A). Source is critic-C only, no research file; plausible (per-profile ANDROID_ID and Keystore), but unsourced.
- **"eski Cerrahpaşa hesapları da var"** (Ek C). 06 L116-118: [UNVERIFIED].
- **"Ana ekrana kurulan PWA, Safari'nin 7 günde veri silme kuralından muaf."** 09 L142: home-screen apps "keep their own usage counter", not "exempt". Low, but the instructor device holds 14 days of session keys, so storage loss matters.

---

## 4. Decision-relevant omissions

**O1. Md.35 students have no product status and default to absent (HIGH).**
05 L84 (flag `counted_as_present_by_decision`, staff-set, with document number), 08 L121 (`G` görevli counts as present), 10 L121 (EXEMPT_ACTIVITY removed from numerator and denominator) all model it. The document has no such status; S5 and §6 lump "izinli" into "mazeretli, devamsız sayılır". Result: an officially assigned student can be pushed over the limit and barred (FD), against the document's own metric "Haksız yere finalden men 0". Also unflagged: 08 and 10 disagree (count as present vs remove from denominator), which gives different percentages; that belongs in Ek A or S5.
Fix: add an MVP row "Md.35 görevli: yetkili rol işaretler, belge no zorunlu, devamsızlıktan sayılmaz"; split S5 into raporlu (open) and görevli (settled by Md.35).

**O2. 7-day sync window collides with the AKSIS entry deadline (HIGH).**
10 L32 (rank 1): "what happens if the instructor already exported to AKSIS" and "changed since last export" tracking (10 L204, MVP). Missing from the document. With the document's own numbers: Güz classes end Fri 18 Aralık, draft AKSIS deadline 20 Aralık; Bahar ends Fri 30 Nisan, deadline 2 Mayıs. Records from the last week may legitimately arrive up to 7 days after the session, i.e. after the deadline, and the day-7 headcount check fires after it too. Either the instructor enters AKSIS with incomplete data (wrongful DEVAMSIZ) or misses the deadline.
Fix: "Son hafta için senkron süresi AKSİS son gününe kısalır; dışa aktarmadan sonra gelen kayıt 'son dışa aktarmadan beri değişenler' listesinde görünür."

**O3. A generic "mazeretli" label leaks health data (MEDIUM).**
05 L87: "if in practice the only excused students were medical cases, even a generic flag would leak health information. Restricting the flag to Art. 35 prevents this." Once görevli is handled separately (O1), "mazeretli, devamsız sayılır" can only mean illness. The KVKK section says only "'Raporlu' sağlık verisi sayılabilir (S5)". 05's recommendation (no label; report via petition) should be stated as the alternative in S5, and the proposed default flagged as carrying the same Art. 6 risk.

**O4. Critical path omits store account and name/logo permission (MEDIUM).**
§7 lists four prerequisites (protocol, server + SMTP, aydınlatma, security test). The document itself concludes the real pilot must publish from an IU account (5.1.1(ix)). 09 L171-172: institutional approval "weeks to months"; enrolling from scratch adds 2-6 weeks; D-U-N-S branches not accepted (09 L41). IU account access + name/logo permission (S17) and the VERBIS update (7 days) belong on the 15 Aralık go/no-go list.

**O5. Crash reporting dropped, crash metric kept (MEDIUM-LOW).**
10 L241: "Crash reporting | MVP | Needed for the crash-free metric." 05 L136: self-hosted Sentry on IU servers is compliant. The document bans crash SDKs and keeps "Çökmesiz oturum en az %99,5" with no measurement method, and there is no Ek A row. Either state the proxy (critic-C: started vs completed sessions from sync data) or add self-hosted Sentry.

**O6. Other silent departures from 10's MVP (LOW).** English UI, dark mode (system theme), AUDITOR role are MVP in 10 (L228-230, L81), "Sonra" in the document, no Ek A row. "S-C: MVP buna göre kısaltıldı" is a blanket note, not a record of which items moved.

**O7. Email matching rejected without saying the sources disagree (LOW).** 07 L85 auto-links when the roster email equals the verified email and 07 escalation 4 says it "would raise the auto-link rate a lot". The document lists "Elenen: e-postayla eşleşme" yet asks in S2 whether the roster has email. Add an Ek A row or drop the S2 sub-question.

**O8. Deferred attestation is also a foreign transfer (LOW).** 05 L138: Play Integrity and App Attest send device data to Google/Apple. The "Sonra" list names them with no KVKK gate.

**O9. Smaller omissions (LOW).** Instructors are data subjects and need a staff aydınlatma (05 L72). Six units run their own calendars (ITF, Diş, Hukuk, AUZEF, Eczacılık, Konservatuvar; 06 L147, L240); S11's default "Resmi İÜ takvimi" is wrong if the pilot department is one of them. Md.20(5) exception: clinical courses failed twice keep the attendance duty (primary L456-459). The backup target of "pg_dump sunucu dışına" must itself be domestic and under IU control (Genelge 2019/12 item 3); unstated.

---

## 5. What passed re-check

Versions and dates (Expo SDK 57 30.06.2026 / RN 0.86, Flutter 3.47 12.08.2026, CMP 1.12.1, WatermelonDB 07.04.2025, PocketBase v0.40.4 12.09.2026, write-excel-file 4.1.1 08.06.2026, SheetJS 0.20.3 and both CVEs, Better Auth 1.7, Fastify 5); RG 28.09.2025/33031; Md.19(1)-(3), 19(2) anabilim dalı, 20(2), 20(5), 9(4), 29(1)(a); 302.07 10 years; 2026/347, 2024/197, 2021/1214, 2019/12 items 3/12/13; 72 h, 5 business days, 7-day VERBIS, 6-month destruction, 3-year logs, 30-day requests; Kuruma/Kurul usage; allowance formula and 39 mismatches; warning levels; calendar dates (from the updated PDF); 20 Aralık / 2 Mayıs draft deadline; 90-day TestFlight vs 95-day Bahar; API 36; 99 USD / ~650 TL reported / 25 USD / Expo 1K MAU ~19 USD; 8.4M rows / 4.2 GB (1/week row); Play Integrity 10k/day, P-384 root Feb 2026; iOS 64 pending notifications, Android 14 exact alarms; Netgsm 0.48 TL; LinkedIn 561/180; Top Hat 35 USD; Hacettepe TC-6 default; headcount rule max(3, 5%); grace 8-10 s; 50 ppm about 4 s/day; screen heights.
