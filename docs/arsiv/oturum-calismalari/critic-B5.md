# Critic B5: rubric, traceability, readability

Document: iu-yoklama-ozet.html (90,993 bytes, 29.09.2026 01:26). Rubric: rubric.md (frozen). Input: faculty-notes.md. Prior: critic-B.md, B2, B3, B4.
Read-only. New scratchpad files only: critic_b5_dump.py (copy of critic_b4_dump.py), critic_b5_check.py, critic_b5_len.py, _b5_body.txt, _b5_app.txt.

Measured (deterministic, critic_b5_check.py):
- Main body outside `<details>`: 2,919 words (B4: 2,714, so +205). Appendices: 4,458. Sections: ozet 117, kararlar 380, akis 308, hile 221, mevzuat 236, kvkk 191, kapsam 448, takvim 306, olcut 77, sorular 599. "Tek bakista": 115.
- U+2014: 0. U+2013: 0. English banned vocabulary: 0. Internal anchors: 17, 0 broken.
- Main-body cells over 20 words: 8 (B4: 4).
- Integer allowance formula exact for T=0..1999, p=0..100; float form 39 mismatches at p=80, T=15 gives 2. Document claim TRUE.
- TestFlight: 20.01.2027 + 90 = 20.04.2027; 10.04.2027 + 90 = 09.07.2027. Covers Bahar (25.01 to 30.04) plus sync to 2 Mayis. Correct.
- 20.12.2026 and 02.05.2027 are Sundays; 01.12.2026 is exactly 9.0 weeks from today. Correct.

## VERDICT: FAIL

Rubric: 7 PASS (3, 4, 5, 6, 7, 8, 10), 3 FAIL (1, 2, 9), each narrow and fixable in one or two cells. No traceability gap. All five B4 BLOCKERs are fixed. The three new failures were present in earlier rounds and not caught.

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL (narrow) | Ek D row "expo-sqlite + drizzle-orm ... Seçildi" is its own decision with a rejected option (WatermelonDB) but no 2nd choice, and expo-sqlite 57.0.3 carries no date. research/01 L98 has the obvious 2nd: `@op-engineering/op-sqlite` 18.2.5, 20.09.2026, Drizzle-supported. The same standard B4 applied to Excel read/write applies here. Weaker: Better Auth (winner) and Keycloak (2nd) have no named rejected option; research/07 L166 rejects Firebase Auth (cross-border; e-mail link change 25.08.2025). The Firebase backend row can be read as covering it, but it does not say so. Everything else passes: pdfmake 0.3.11 (12.06.2026), Puppeteer 25.12.0 (23.09.2026), Typst dated; read "2. seçenek yok" with reason; write 2nd SheetJS; Vite 8.3.1 and Workbox 7.4.1 dated in Ek C. Minor: xlsx 0.18.5 undated; Next.js (research/01 L148) not named as rejected for the panel. |
| 2 | FAIL (narrow) | Kenar durumlar "Okuttuktan sonra şarjı bitti: Kayıt telefonda durur. Zamanı, aynı açılıştaki zaman çapasından hesaplanır." That holds on Android only. Ek C: "iOS'ta açılış kimliği yok ... iOS'ta kayıt ancak okutmanın iki yanındaki çapalar aynı hızla uyuşursa zamanlanır. Tek yanlı iOS kaydı 'belirlenemeyen' sayılır." After the battery dies the iPhone reboots, so no post-scan anchor exists in the same boot: the record is "belirlenemeyen" and falls into the 2-per-course auto-accept cap, then review. The rubric asks what happens "exactly"; for about half the students the document states the wrong outcome. All other cases pass: late sync (7 gün, late-but-valid accepted), never sync (QR receipt), battery before class / no phone (elle ekler), instructor device missing or offline over 3 days, instructor clock (median, 10 dk), student clock (Önlenir), forwarded QR (İşaretlenir, unmodified app). |
| 3 | PASS | Bar chip, three lists, "(değiştirilmemiş uygulamada)" on QR relay, heading now "Önlenemez". Minor: the lead sentence "Bu sistemde hile için ya telefonu derse getirmek ya da canlı aktarım yapmak gerekiyor" is contradicted by the document's own lists: a forwarded backup code gets up to 2 auto-accepts per course, and a modified app needs neither. |
| 4 | PASS | No AKSIS/SSO dependency. Import: known headers, encoding, file-type sniffing, student number as text (Ek C). Export: list order, teori and uygulama in separate columns with toplam, yüzde, DEVAMLI/DEVAMSIZ (B4 minor fixed). S2/S3 open for real files. |
| 5 | PASS | Every faculty bullet maps to a section 6 line with status and reason (section 3 below). |
| 6 | PASS | Separate "Notlarda olmayan MVP eklemeleri" list: web panel, roles incl. ortak hoca, dönem/tatil/iptal/telafi, şube/blok/birleşik şube, muaf, Md.35, cihaz bağlama, hesap kurtarma, kafa sayısı, makbuz, dönem kilidi, saklama/imha, hesap silme, aydınlatma, erişilebilirlik. |
| 7 | PASS | Controller İÜ, basis KVKK Md.5(2)(ç) with the yardımcı-kayıt caveat, retention for both cases, hosting in Turkey, cross-border list. Minor, and a privacy call for the main session: section 5 says store-console crash data "S15'te soruluyor", but S15 asks only about push and Google-hosted mailboxes. Ek A row "Çökme izleme" and Ek F "Kararlılık" use store consoles in the MVP. |
| 8 | PASS | Account type (İÜ kurum hesabı; AUZEF App Store account and edu.istanbul.mobile marked unverified in Ek E), cost (99 USD/yıl, 25 USD, Expo ~19 USD/ay at scale), review risk (2.1 demo, 5.2.1 logo, 5.1.1(v), 3.2 Unlisted, API 36), timeline (21 Aralık review, ~20 Ocak build, en geç 10 Nisan rebuild; arithmetic verified). PWA no longer claimed as fallback. Minor: research/09 L41-43, L172 (CONFIRMED rules) says a faculty cannot enroll on its own (branches not accepted), the enrolling person needs legal signing authority (a student cannot), and enrolling from scratch adds 2 to 6 weeks (D-U-N-S up to 7 business days plus org verification). None of this is in the document, and it bears on S17 (AUZEF account) and the 2 Ekim target. |
| 9 | FAIL (narrow) | Section 8 still says "Tüm özellikler için tam liste Ek F'de". The three B4 rows are added (Giriş, Ders tanımlama, Birleşik şube). Still missing: "Listeyle eşleşme", an MVP decision in section 1 with a known risk (S2: e-mail does not carry the student number). An unmatched student shows as absent, which is the "haksız men 0" outcome. Hesap kurtarma is covered only by combining the Giriş and Cihaz bağlama rows (acceptable). |
| 10 | PASS | S1-S19 and G-A..G-D, each with why and default. S1 reason and S17 fee default fixed. Minor: Ek B still says "S1-S18"; S9 default "Her derste dönem başına 2 otomatik kabul" drops "her öğrenci için" and reads as 2 per course in total. |

## 2. critic-B4 findings

| # | Status | Note |
|---|---|---|
| 1 BLOCKER R8a TestFlight | FIXED | "~20 Ocak: pilot sürümü yüklenir" and "En geç 10 Nisan: yeni TestFlight sürümü". 20.04 and 09.07 expiry verified. |
| 2 BLOCKER R9 Ek F rows | FIXED | Giriş, Ders tanımlama, Birleşik şube rows added. New gap: eşleşme (rubric 9). |
| 3 BLOCKER izinli | FIXED | Section 6 and section 4 both say "Md.35 görevlendirmesi ve ilgili mevzuattaki durumlar", "Görevli (Md.35 / ilgili mevzuat)", belge numarası. |
| 4 BLOCKER R8b PWA fallback | FIXED | "iOS'ta PWA yedek olamaz"; store account is a precondition. Residue: section 1 "PWA ise açık soru (G-B)" and Ek D "Sonraya kalanlar: Öğrenci için PWA" vs G-B and Ek A "elendi" (finding 7 below). |
| 5 BLOCKER R1 dates / 2nd | FIXED | pdfmake, Puppeteer, Typst dated; read "2. seçenek yok" with reason; write 2nd SheetJS. New R1 gap on local DB (rubric 1). |
| 6 length | NOT FIXED | 2,714 to 2,919 (+205). Of B4's eight moves, QR/PIN examples and the Apple/Play bullets moved; Güz line, Maliyet block, KVKK karar numbers, Kayıt kaybı / Benimseme, "çıkış yapınca" clause stayed. |
| 7 R7 crash data | PARTLY | Section 5 paragraph added and "Tek bakışta" narrowed to "Kişisel veri işleyen". S15 does not contain the crash-data question the paragraph points to. |
| 8 auto-close | FIXED | "Yoklama seçilen süre dolunca kendiliğinden kapanır. Süre varsayılan 10 dakikadır ... elle de kapatabilir." |
| 9 "2 Ekim" | FIXED | "Başvurular için hedef tarih 2 Ekim." |
| 10 QR relay / Önlenemez | FIXED | Both edits made. Lead sentence overclaim remains (finding 9). |
| 11 APK / Play account | FIXED | Both in Ek E's "Çıkarım ya da doğrulanmamış bilgiler". |
| 12 teori/uygulama columns | FIXED | Section 6 AKSİS row. |
| 13 panel tooling | FIXED | Vite 8.3.1, Workbox 7.4.1, WebCrypto non-extractable keys in IndexedDB, storage.persist(). |
| 14 readability | PARTLY | Fixed: KVKK prefix on Md., "Devam nota katılabilir; ... S10", S13 wording, Ek G linked ("Terimler Ek G'de"), OTA gone, APK/npm/RG glossed. Not fixed: section 8 paper-time measurement; cells over 20 words rose from 4 to 8. |
| 15 R10 S1 / S17 | FIXED | S1 "Aynı hata tekrarlanmasın diye soruluyor"; S17 "Apple'dan yanıt gelene kadar 99 USD ödenir". |

## 3. Traceability

| Faculty / owner bullet | Doc line | OK? |
|---|---|---|
| AKSİS-free; hoca kendi tanımlasın; öğrenci kendi girsin | chip; 1 Giriş; 6 row 1 | OK |
| Verdiği dersleri görme; oluşturma/düzenleme; gün, saat, sınıf | 6 row 2 MVP | OK |
| Ders silme | 6 Arşiv, reason given | OK |
| Kayıtlı öğrenciler; liste bazlı ekle/sil; CSV/Excel | 6 row 4 MVP, preview + pasif with reason | OK |
| Başlatma; süre boyunca açık; mobil katılım; tarih-saat; tek katılım | 6 row 5 MVP | OK |
| Süre dolunca otomatik kapanma; elle kapatma | 2 "kendiliğinden kapanır ... varsayılan 10 dakika ... elle de kapatabilir" | OK (B4 weak point fixed) |
| Basit tutulsun; yerine imza | 6 "Büyük ölçüde"; 3 bar | OK |
| QR; PIN; konum; QR+konum; farklı yöntem | MVP; Yedek; Elendi; Elendi; Sonra, each with reason | OK |
| Yıl/dönem; öğrencinin dersleri; hoca listesi; toplam | 6 MVP | OK |
| Elle düzeltme; kim, ne zaman | 6 MVP, sebep kodu, belge no | OK |
| Raporlu | Soru (S5), reason | OK |
| İzinli | Görevli, Md.35 and ilgili mevzuat, consistent with section 4 | OK (B4 gap fixed) |
| Ders / öğrenci / tarih aralığı rapor; Excel/PDF | 6 MVP | OK |
| Başladı / kapanmadan bildirim | Sonra, reason | OK |
| Eşik bildirimi (%70) | MVP, four levels | OK |
| AKSİS'ten indir, yükle; registration; dönem sonu AKSİS'e | MVP; MVP; Elle with reason | OK |
| Owner: konum zor; bodrumda internet yok; geç bağlanan; AKSİS entegrasyonu yok | Elendi; core design; senkron 7 gün; chip | OK |

No traceability gap.

## 4. Readability and length

Length. 2,919 words. Most of it is the decisions table (380), scope table (448) and questions table (599), which are decision content and belong in the body. "Tek bakışta" (115 words) plus section anchors make the document usable at a glance. Length is MINOR. Passages that are not decision-relevant or duplicate an appendix (critic_b5_len.py):
- 7 "Güz dönemi: 14 Eylül-18 Aralık 2026. Ekle-bırak 14-18 Eylül." (9). Pilot is Bahar; Ek A already has both ekle-bırak ranges.
- 7 Maliyet block, 6 lines (29) to one line "Maliyet: Apple 99 USD/yıl, Google 25 USD bir kez, Expo pilotta ücretsiz, sunucu İÜ." (saves 16).
- 7 "Hukuk, İstanbul Tıp, ... Konservatuvar'ın ayrı takvimi var." (12) to "Bazı fakültelerin ayrı takvimi var (Ek A)." (saves 7).
- 5 "KVKK Kurulu'nun 2021/1214 ve 2024/197 sayılı kararları bu yönde." (9) to Ek E.
- 8 "Kayıt kaybı" and "Benimseme" lines (16), duplicates of Ek F.
- 3 "çıkış yapınca anahtar silinir, yeniden giriş cihaz değişimi sayılır" (9), duplicate of Ek A.
- 3 "Sıra, QR'daki zaman aralığına göredir. Dışa aktarılmış bir kayıt sonradan yerinden edilmez." (12) and "Görme engelli öğrenci için hoca kodu sesli okur ... denetim kaydına geçer." (18) to Ek C.
Total about 96 words: body goes from 2,919 to about 2,823. Further cuts would remove decision content; the length is what "no clear information missing" costs.

Contradictions:
- Kenar durumlar dead-battery row vs Ek C iOS anchor rule (rubric 2).
- Student PWA has three statuses: section 1 "PWA ise açık soru (G-B)", G-B and Ek A "elendi", Ek D "Sonraya kalanlar: Öğrenci için PWA".
- Section 5 "S15'te soruluyor" vs S15 text (no crash-data question).
- Section 3 lead sentence vs its own "İşaretlenir veya sınırlanır" and "Önlenemez" lists.
- Key lifetime: section 2 "Önümüzdeki 3 ders gününün anahtarlarını" vs section 1 "3 gün önceden indirilir", section 3 "3 gün geçerli" and Kenar "3 günden uzun internetsiz kaldı". "Ders günü" and calendar day differ over a weekend or for a weekly course.
- "Çekirdek" (Tek bakışta, section 7 list) vs "ana özellikler" (section 7 pilot takvimi) for the same 1 Aralık freeze.
- Ek B "S1-S18" while S19 exists.

Unclear Turkish:
- Section 8 "Kâğıt imzanın süresi ilk iki haftada kronometreyle ölçülecek": the pilot uses the app from week 1. Say where: "pilot dışı bir derste" or "ilk iki hafta kâğıtla paralel".
- Section 3 "Dışa aktarılmış bir kayıt sonradan yerinden edilmez": "yerinden edilmez" is opaque. Write "AKSİS'e aktarılmış bir otomatik kabul, daha erken tarihli bir kayıt gelse de geri alınmaz."
- S9 default drops "her öğrenci için".
- "zaman aralığı" (QR 5-second slot) is not in Ek G and reads as "time range".

## 5. Style

U+2014 0, U+2013 0, English banned vocabulary 0, no filler sentence found. PASS.

## 6. Findings, most severe first

1. BLOCKER (R2). Dead battery after scan: correct for Android only; on iOS the record is "belirlenemeyen" by Ek C's own rule. Fix the Kenar row: "Android: zamanı okutmadan önceki çapadan hesaplanır (çapa 24 saatten yeniyse). iOS: zamanı belirlenemeyen sayılır, otomatik kabul kuralına girer (Bölüm 3)."
2. BLOCKER (R1). Local DB has no 2nd choice and expo-sqlite is undated. Fix Ek D: add row "op-sqlite | 18.2.5, 20.09.2026 | 2. seçenek. Daha hızlı, drizzle destekliyor; Expo'nun kendi modülü tercih edildi." and "57.0.3 (11.09.2026)". Add "Firebase Auth | Elendi, yurtdışı" or write "kimlik dahil" in the Firebase row.
3. BLOCKER (R9). Ek F has no row for "Listeyle eşleşme" although section 8 says "tam liste". Fix: "Listeyle eşleşme | Hocanın elle onayına düşen kayıt; yanlış eşleşme | ≤%5; 0".
4. MINOR (R8, clear info missing). Store account rules from research/09 (CONFIRMED): a faculty cannot enroll alone, the enroller needs signing authority, a new org account adds 2 to 6 weeks. Fix section 7: "Hesap sıfırdan açılırsa D-U-N-S ve kurum doğrulaması 2-6 hafta; başvuruyu İÜ adına imza yetkisi olan biri yapar."
5. MINOR (R7, privacy, escalate). Section 5 points to S15 for store-console crash data; S15 does not ask it. Fix S15: add "Mağaza konsollarının çökme verisi kabul edilebilir mi?" with default "Evet, uygulama SDK eklemiyor." The privacy call belongs to the main session.
6. MINOR (length). 2,919 words, +205 since B4. Move the seven passages in section 4 (about 96 words, to about 2,823).
7. MINOR (contradiction). Student PWA: "açık soru" / "elendi" / "sonraya". Fix section 1: "PWA elendi (G-B)"; move it from Ek D "Sonraya kalanlar" to the eliminated list.
8. MINOR (contradiction). "3 ders günü" vs "3 gün". Pick one unit and use it in sections 1, 2, 3 and Kenar durumlar.
9. MINOR (R3). Lead sentence overclaims. Fix: add "İstisnalar: yedek kodu iletmek (dönemde en fazla 2 otomatik kabul) ve değiştirilmiş uygulama."
10. MINOR (readability). Section 8 paper-time measurement location; "yerinden edilmez"; S9 "her öğrenci için"; "zaman aralığı" unglossed; "çekirdek" vs "ana özellikler"; Ek B "S1-S18" to "S1-S19".
11. MINOR (R1). xlsx 0.18.5 undated; Next.js not named as rejected for the panel.
12. MINOR (layout). 8 body cells over 20 words (S14 26, S17 27, AKSİS row 27, izinli 26, S3 24, Oturum anahtarı 24, Cihaz 22, liste 21).
