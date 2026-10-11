# Critic B4: rubric, traceability, readability

Document: iu-yoklama-ozet.html (86,292 bytes, 29.09.2026 01:11). Rubric: rubric.md (frozen). Input: faculty-notes.md. Prior: critic-B.md, critic-B2.md, critic-B3.md.
Read-only. New scratchpad files only: critic_b4_dump.py, _b4_body.txt, _b4_app.txt (text dumps). critic_b3_check.py re-run unchanged.

Measured (deterministic):
- Main body outside `<details>`: 2,714 words (B3: 2,527, so +187). Sections: ozet 108, kararlar 356, akis 283, hile 199, mevzuat 216, kvkk 160, kapsam 433, takvim 293, olcut 76, sorular 554.
- U+2014: 0. U+2013: 0. English banned vocabulary: 0. Internal anchors: 0 broken.
- Main-body cells over 20 words: 4 (24 Oturum anahtari, 22 Cihaz, 21 S14, 27 S17). B3 had 2.
- Integer allowance formula exact for T=0..1999, p=0..100; float form 39 mismatches at p=80. Claim TRUE.
- TestFlight: 18.12.2026 + 90 = 18.03.2027; 21.12.2026 + 90 = 21.03.2027. Bahar 25.01 to 30.04 = 95 days; to 2 Mayis = 97.
- npm registry (queried today): pdfmake 0.3.11 published 2026-06-12; puppeteer 25.12.0 published 2026-09-23. The document says "son ikisinin tarihi kaynakta yok".
- "2 Ekim": the only 2 Ekim in research is "Katki payi 7 Eylul - 2 Ekim" (research/06 L215). The document's "basvurularin son gunu 2 Ekim" is B2's editorial rewrite of "bu hafta" (critic-B2 L129), not an external deadline.

## VERDICT: FAIL

Rubric: 7 PASS (2, 3, 4, 5, 6, 7, 10), 3 FAIL (1, 8, 9), all narrow and cheap. One traceability gap (izinli). Everything else is MINOR.

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL (narrow) | Body row "Excel / PDF" names pdfmake as the 2nd choice; Ek D gives it no date ("tarihi kaynakta yok") although npm shows 12.06.2026 (Puppeteer 25.12.0: 23.09.2026). Excel reading (SheetJS) and Excel writing (write-excel-file) name no 2nd choice anywhere: Ek D only says "tek olgun secenek" for reading and rejects exceljs for writing. Minor: the hoca panel's build and offline tooling (research/01 L148 leaves "Vite + React, or Next.js" open; service worker, key storage in the browser) is undecided though the offline "Baslat" depends on it. Everything else now has winner, 2nd, rejected and dates (Expo row carries React 19.2 and 30.06.2026; PostgreSQL 18.6 with 25.09.2025 and 14.11.2030; SheetJS "Temmuz 2024"). |
| 2 | PASS | Late sync (2 Sonra, 7 gun, late-but-valid accepted), never sync, battery after scan, battery before class / no phone / unregistered, lost phone, instructor device missing, instructor offline over 3 days, instructor clock (median, 10 dk), student clock (Onlenir via zaman capasi), forwarded QR (Isaretlenir), live relay (Onlenemez). |
| 3 | PASS | Bar sentence, three lists, backup-code relay now honestly "gecikmeyle yakalanamiyor", limited by the per-course 2 cap and %5 flag. Minor: "Onlenir" and "Isaretlenir" hold only for an unmodified app; a modified app can claim any scan time for a forwarded QR. The list says modified apps are unstoppable, but the QR-relay line does not say it depends on that. |
| 4 | PASS | No AKSIS/SSO dependency. Import headers column-level (Ek C). Export: liste sirasi, toplam, yuzde, DEVAMLI/DEVAMSIZ, with S2/S3 open for a real file. Minor: Md.19 computes teori and uygulama separately, yet the export names one "toplam, yuzde"; say "teori ve uygulama ayri sutun". |
| 5 | PASS | Every faculty bullet maps to a section 6 line (section 3 table). |
| 6 | PASS | Additions list is separate and names web panel, roles incl. ortak hoca, donem/tatil/iptal/telafi, sube/blok/birlesik sube, muaf, Md.35, cihaz baglama, hesap kurtarma (now named), kafa sayisi, makbuz, donem kilidi, saklama/imha, hesap silme, erisilebilirlik. |
| 7 | PASS | Controller IU, basis KVKK Md.5(2)(ç) with the yardimci-kayit caveat, retention for both cases, hosting in Turkey, cross-border list plus S15. Escalation (privacy, not decided here): Ek A and Ek F rely on "magaza konsollari" for crash data while section 5 says crash reports are a cross-border transfer used only with approval; and "Tek bakista" says "hicbir yurtdisi servis" while TestFlight, EAS Build and the stores are foreign services. One clause is needed on why these are not transfers of the app's personal data, or they go into S15. |
| 8 | FAIL (narrow) | (a) Timeline arithmetic: the only builds in the plan are the one that passes beta review before 21 Aralik and a "~22 Mart" rebuild. A build uploaded on or before 21.12.2026 expires on or before 21.03.2027, so iOS pilot users are locked out before the rebuild (earlier upload, longer gap). This was correct in B3 (build ~5 Ocak) and broke when the fix moved beta review to December. (b) "Magaza hesabi: Pilotu kaydirmaz, olmazsa yedek yol: iOS'ta PWA" is unconditional, but G-B says iOS PWA may lose records, has no scheduled notifications and its camera zoom is unknown, and Ek C says 2x zoom is mandatory ("Bu yuzden 2x yakinlastirma zorunlu"). The fallback may not work, so the claim that the store account does not shift the pilot is unproven. Minor: APK fallback is a "dying path" (research/09 L18: Android developer verification global "2027 and beyond"); "IU'nun Play hesabi var (edu.istanbul.mobile)" states as fact what research/09 L11 marks as INFERENCE (a listing exists). |
| 9 | FAIL (narrow) | Section 8 says "Tum ozellikler icin tam liste Ek F'de", but Ek F has no row for: Giris (e-posta kodu; S1 names login as one of three suspected causes of the last failure), ders ve oturum tanimlama (faculty bullets 2-3; "Oturumlar ders programindan otomatik uretilir"), sube / blok ders / birlikte islenen subeler (S18 risk: other section's phones reject the QR). Saklama/imha and makbuz rows added (B3 fixed). |
| 10 | PASS | S1-S18 and G-A..G-D each have why and default. Minor: S1 "Neden onemli: Bu konuda hicbir kaynak yok" is not a reason; S17 fee-waiver default "Apple'a basvurulur" is an action, not the fallback (write "yanit gelene kadar 99 USD odenir"). |

## 2. critic-B3 findings 1-15

| # | Status | Note |
|---|---|---|
| 1 | PARTLY | React (via Expo row), SheetJS (Temmuz 2024), PostgreSQL (18.6, dated) fixed. pdfmake and Puppeteer still undated though npm has both dates. |
| 2 | FIXED | Ek F rows "Saklama ve imha" and "Makbuz" added. New gaps listed under rubric 9. |
| 3 | FIXED | One rule: per student, per course, per semester, backup code and undeterminable time share it; section 3, S9, Ek A, Ek C all point to it. |
| 4 | PARTLY | Arsiv reason, CSV preview/pasif reason, "Buyuk olcude" all fixed. Izinli reason contradicts section 4 (section 3 below). |
| 5 | PARTLY | Slip vs PWA contradiction resolved by "pilotu kaydirmaz"; Android fallback added. New contradiction with G-B and Ek C (rubric 8 b). |
| 6 | FIXED | "Yedek kodu iletmek: gecikmeyle yakalanamiyor ... otomatik kabul siniri ve %5 kurali". |
| 7 | PARTLY | Klinik, veri hacmi, UBYS/Nisantasi, Flutter footnote, Unlisted and repeated rapor sentence moved; section 8 cut to 6 lines. Net body still grew 2,527 to 2,714. |
| 8 | FIXED | "Senato (pilotta fakulte kurulu) bir yonerge cikarmadikca ... yardimci kayit sayilir. Bu bir cikarim". |
| 9 | FIXED | Kursu PC removed from "Hocanin isi"; Ek A puts pairing in a later phase. |
| 10 | FIXED | "Hesap kurtarma: e-posta koduyla yeniden giris ..., telefon degistiyse yuz yuze onay". |
| 11 | FIXED | Ek B labelled "Ingilizce, yalniz gelistirici icin" with a pointer to S1-S18. |
| 12 | FIXED | "Pilot karari, 15 Aralik 2026: On kosullar tamamsa Bahar 2027 ..., degilse Guz 2027". |
| 13 | FIXED, regression | Beta review now before 21 Aralik, which breaks the "~22 Mart" rebuild (rubric 8 a). |
| 14 | FIXED | All named terms in Ek G; "risk sirasi" gone from body. Residual minor: Ek G not linked from body; APK, npm, RG unglossed; OTA glossed but never used. |
| 15 | PARTLY | Battery before class, 10 dk clock threshold, "1 ders saati", biometric unlock, 28 hafta all fixed. S17 fee default still an action. |

## 3. Traceability

| Faculty / owner bullet | Doc line | OK? |
|---|---|---|
| AKSIS-free; hoca kendi tanimlasin; ogrenci kendi girsin | chip; 1 Giris; 6 row 1 (approval by bolum yoneticisi, reason given) | OK |
| Verdigi dersleri gorme; olusturma/duzenleme; gun, saat, sinif | 6 row 2 MVP | OK |
| Ders silme | 6 "Arsiv", reason: saklama yukumlulugu | OK |
| Kayitli ogrencileri gorme; liste bazli ekle/sil; CSV/Excel otomatik | 6 row 4, preview + pasif with reason | OK |
| Baslatma; sure boyunca acik; mobil katilim; tarih-saat; tek katilim | 6 row 5 MVP | OK |
| Sure dolunca otomatik kapanma; elle kapatma | 6 row 5 "kapatma" | WEAK (MINOR): section 2 shows only "Hoca ... yoklamayi kapatir"; no duration setting, default or auto-close appears outside Ek C's "kapanis zamani" |
| Basit tutulsun; yerine imza | "Buyuk olcude" with new duties named; section 3 bar | OK |
| QR; PIN; konum; QR+konum; farkli yontem | MVP; Yedek; Elendi; Elendi; Sonra, each with reason | OK |
| Yil/donem; ogrencinin dersleri; hoca listesi; toplam | 6 MVP | OK |
| Elle duzeltme; kim, ne zaman | 6 MVP, sebep kodu | OK |
| Raporlu | Soru (S5), reason: saglik verisi, rapor devamsizligi dusurmuyor | OK |
| Izinli | "Gorevli (Md.35)", reason: "Devamsizligi dusuren tek izin Md.35 gorevlendirmesi" | GAP: section 4 itself says "Md.35'teki ve ilgili mevzuattaki durumlar bu sartin disinda" (Md.19(1): "... ilgili mevzuat hukumlerinde belirtilen durumlar haric"; research/05 L15, L81). The stated reason is wrong by the document's own text, and an exemption under "ilgili mevzuat" has no status to enter, which would miscount a student Ek F promises to protect ("haksiz men 0"). |
| Ders / ogrenci / tarih araligi rapor; Excel/PDF | 6 MVP | OK |
| Basladi / kapanmadan bildirim | Sonra, reason (push, bodrum, IU onayi) | OK |
| Esik bildirimi (%70) | MVP, four levels, local | OK |
| AKSIS'ten indir, yukle; registration; donem sonu AKSIS'e | MVP; MVP; Elle with reason | OK |
| Owner: konum zor; bodrumda internet yok; gec baglanan; AKSIS entegrasyonu yok | Elendi; core design; senkron 7 gun; chip | OK |

## 4. Readability and length

Length. 2,714 words, up from 2,527. The B3 moves were mostly made, but fixes added more. Main-body text that is not decision-relevant and can go to an appendix without loss (about 130 words after keeping a one-line cost summary):
- 7 "Guz donemi: 14 Eylul-18 Aralik 2026. Ekle-birak 14-18 Eylul." (9). The pilot is Bahar; the Guz deadline sits in the next line.
- 7 Apple / Play rule bullets (37) to Ek E; keep "Kurum hesabi gerekir (Ek E)".
- 7 Maliyet block (36) to one line: "Maliyet: Apple 99 USD/yil, Google 25 USD bir kez, Expo pilotta ucretsiz, sunucu IU'nun." (saves about 20).
- 4 "Burada T ... 39 durumda ... Bu yuzden regresyon testi zorunlu." (23) to Ek C; keep the formula with "T: yapilan ders saati".
- 5 "KVKK Kurulu'nun 2021/1214 ve 2024/197 sayili kararlari bu yonde." (9) to Ek E.
- 6 QR row "Diger universitelerde bu sure 10-15 saniye." and PIN row "Indiana Universitesi'nde Top Hat ile bu yasandi." (13), both already in Ek A / Ek D.
- 8 "Kayit kaybi" and "Benimseme" lines (16), duplicates of Ek F.
- 3 "cikis yapinca anahtar silinir, yeniden giris cihaz degisimi sayilir" (9), duplicate of Ek A.

Contradictions and ambiguities:
- 6 izinli vs 4 "ilgili mevzuat" (traceability gap above).
- 7 "Magaza hesabi: Pilotu kaydirmaz" vs G-B and Ek C (rubric 8 b). It also sits under the heading "Pilotu kaydiran on kosullar", which contradicts its own text.
- 7 TestFlight 21 Aralik vs ~22 Mart (rubric 8 a).
- 8 "Tum ozellikler icin tam liste Ek F'de" vs missing rows (rubric 9).
- 3 heading "Onlenemez (kagit da onleyemiyor)" lists "Degistirilmis uygulama, emulator, root'lu telefon", which has no paper analogue (B3 raised it; not fixed).
- 4 "Md.20: ... Devam nota katilabilir." reads as a decision; S10 default is "Hayir". Write "Yonetmelik izin veriyor; karar S10".
- "Md." means the IU Yonetmelik in section 4 and KVKK in section 5 / Ek E (Md.9(4) geç kayit vs Md.9(7) KVKK). Prefix "KVKK" in section 5.

Unclear Turkish:
- 7 "basvurularin son gunu 2 Ekim" reads as an external deadline; it is our own target. Write "Basvurular 2 Ekim'e kadar yapilmali (kendi hedefimiz; IU onaylari haftalar suruyor)".
- 8 "Kagit imzanin suresi ilk iki haftada olculecek": the pilot uses the app from week 1; say how (for example "pilot disi bir derste" or "ilk iki hafta paralel").
- S13 "Veri sorumlusu ... kim?" after section 5 decided "Veri sorumlusu: IU": write "IU adina yetkili birim".
- Ek G is never linked from the body; add "Terimler: Ek G" under the title.

## 5. Style

U+2014 0, U+2013 0, banned English vocabulary 0, no filler sentence found. PASS.

## 6. Findings, most severe first

1. BLOCKER (R8 a). TestFlight arithmetic: a build reviewed before 21.12.2026 expires by 21.03.2027, before the "~22 Mart" rebuild. Fix: add "Ocak ortasi: pilot surumu yuklenir" (Jan 15 + 90 = Apr 15, and the 22 Mart build covers to 20 Haziran), or move the rebuild to "en gec 15 Mart".
2. BLOCKER (R9). Ek F lacks Giris, ders/oturum tanimlama, sube/birlesik sube while section 8 says "tam liste". Fix: rows "Giris | kodun 1 dk icinde ulasma orani; ilk denemede giris | >=%98; >=%95", "Ders tanimlama | bir dersin kurulma suresi; programdan uretilen yanlis oturum | <=10 dk; 0", "Birlesik sube | yanlis sube diye reddedilen gecerli kayit | 0".
3. BLOCKER (traceability). Izinli reason "tek izin Md.35" contradicts section 4 "Md.35'teki ve ilgili mevzuattaki durumlar". Fix: status "Gorevli (Md.35 / ilgili mevzuat, belge no ile)" and reason "Yonetmelik yalniz Md.35 ve ilgili mevzuattaki durumlari sayimdan cikariyor; diger izinler sayimi degistirmiyor".
4. BLOCKER (R8 b). "Magaza hesabi pilotu kaydirmaz" relies on iOS PWA, which G-B and Ek C say may lose records and may lack the mandatory 2x zoom. Fix: "Yedek yol, G-B denemesi (iOS Safari'de 2x yakinlastirma ve kayit kaliciligi) gecerse gecerli; gecmezse magaza hesabi da on kosuldur."
5. BLOCKER (R1). pdfmake (named 2nd) and Puppeteer undated; Excel read and write have no 2nd. Fix: Ek D "0.3.11 (12.06.2026) / 25.12.0 (23.09.2026)"; body "Okuma: 2. secenek yok (xlsx npm CVE'li, exceljs .xls okumuyor). Yazma: 2. secenek SheetJS'in kendi yazicisi."
6. MINOR (length). 2,714 words, +187 since B3. Move the eight blocks in section 4 (about 130 words net).
7. MINOR (R7, escalate). Store-console crash data and "hicbir yurtdisi servis" vs section 5's cross-border list. Privacy call for the main session: one clause or an S15 entry.
8. MINOR (faculty auto-close). Section 2 flow shows only manual close. Fix: "Hoca sureyi secer (varsayilan N dk); sure dolunca QR kendiliginden kapanir, hoca daha once de kapatabilir."
9. MINOR. "2 Ekim" presented as an external deadline (section 4 wording fix above).
10. MINOR (R3). QR-relay "Isaretlenir" holds only for an unmodified app; "Onlenemez (kagit da onleyemiyor)" includes modified apps. Fix: "(degistirilmemis uygulamada)" on the relay line; heading "Onlenemez".
11. MINOR (R8). APK fallback: Android developer verification goes global "2027 and beyond" (research/09 L18); "IU'nun Play hesabi var" is an inference. Add both to Ek E's unverified list.
12. MINOR (R4). Export does not say teori and uygulama are separate columns though Md.19 computes them separately.
13. MINOR (R1). Hoca panel build and offline tooling (Vite vs Next.js, service worker, key storage) not decided; research/01 L148 left it open.
14. MINOR (readability). "Md." ambiguity KVKK vs Yonetmelik; "Devam nota katilabilir" vs S10; S13 "Veri sorumlusu" after it was decided; section 8 paper-time measurement; Ek G not linked; OTA orphan; APK, npm, RG unglossed; 4 cells over 20 words.
15. MINOR (R10). S1 "Neden onemli" gives no reason; S17 fee default is an action ("yanit gelene kadar 99 USD odenir").
