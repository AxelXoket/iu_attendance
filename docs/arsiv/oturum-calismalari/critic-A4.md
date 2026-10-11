# Critic A4: fidelity of iu-yoklama-ozet.html (29.09.2026, 01:11 build) against research/01..10, mx-check.txt, src/ primary texts

VERDICT: FAIL

Reason: every critic-A3 finding is fixed, and the calendar now matches the general OIDB calendar line for line. The document still fails on two decision-relevant points in the pilot schedule, both inside §7: (1) with the new "TestFlight beta incelemesi before 21 Aralık" and "~22 Mart yeni sürüm", the 90-day build life does not cover the gap; (2) "Mağaza hesabı: Pilotu kaydırmaz" rests on an iOS PWA fallback that the document itself calls unverified and that may not meet its own "2x yakınlaştırma zorunlu" rule. Both need only a one-line fix each.

Method: the full text, including every `<details>` appendix, was extracted to `_a4_text.txt` (520 lines, 59 links in `_a4_links.txt`). I diffed it against `iu-yoklama-ozet.r3.html`: the text was substantially rewritten, so I re-checked the whole document, not only the diff. The general calendar PDF was read with PyMuPDF (created 30.06.2026; header "(İstanbul Tıp, Diş Hekimliği, Hukuk, Eczacılık, AUZEF ve Devlet Konservatuvarı hariç)"). Hrefs were compared with `acc.json`. Regulation articles were re-read in `yonetmelik-2025.txt` (Md.9 L184, Md.19 L412, Md.20 L431, Md.35 L969, Md.36 L979). Weekdays, day spans, TestFlight expiry and the %80 float-error count were computed by script. The QR Base45 / 3-M capacity was re-checked with segno.

---

## 1. Status of critic-A3 findings

| # | Status | Note |
|---|---|---|
| N1 calendar (Hukuk vs general) | FIXED | §7: Güz 14 Eylül-18 Aralık, ekle-bırak 14-18 Eylül; Bahar 25 Ocak-30 Nisan, ekle-bırak 25 Ocak-1 Şubat, sınıf listeleri 29 Ocak-2 Şubat; AKSİS son günü 20 Aralık / 2 Mayıs. All match the general PDF p.3. Ek H labels "genel" / "Hukuk Fakültesi" point to the right files (acc.json). S3 no longer says "taslak". Ek A records the 06 error. |
| N2 auto-accept budget | FIXED | One shared rule in §3: backup code plus anchor-less, per student, per course, 2 per term. Ek C points to §3. S9 says "Her derste dönem başına 2". |
| N3 Md.35 quote | FIXED | "devamsızlık sürelerinin hesabında dikkate alınmaz" is verbatim (L973-974). |
| N4 Expo pinning rule | FIXED | "Yeni bir Expo SDK çıkınca hemen geçilmez, bir sürüm geriden izlenir; şu an kararlı sürüm 57, 58 beta." This is consistent with choosing 57. |
| N5 minutes-saved scope | FIXED (minor residue) | Ek F scopes it to "60'tan fazla öğrencisi olan hoca". The source says ">= 60" (10 L253); see MINOR m1. |
| Inf. Play gov-app rule | FIXED | "Bunun İÜ için de geçerli olduğu bir çıkarım", and listed again in Ek E. |
| Inf. AUZEF account | FIXED | "başka bir birimin bu hesabı kullanıp kullanamayacağı belirsiz (S17)". S17 and Ek E carry it. |
| Inf. AKSİS HTML .xls | FIXED | "bu bir çıkarım", and listed in Ek E. |
| Inf. Nişantaşı | FIXED | "bir şikâyet kaydına göre". |
| O-N1 pilot week 1 | FIXED | "İlk haftanın kayıtları, sınıf listesi yüklendiğinde (29 Ocak-2 Şubat) eşleşir. Ekle-bırak bitince liste yeniden yüklenir." |
| O-N2 sync window on last day | FIXED | The window ends at 23:59 on the day before the AKSİS deadline, with a minimum of 24 h. Ek F adds a separate ≥%95 for last-week sessions. Arithmetic: Fri 18 Ara session to Sat 19 Ara 23:59 is ≥ 31 h; Fri 30 Nis to Sat 1 May is the same. |
| E1 partial (Md.19(1) "ilgili mevzuat") | FIXED (minor residue) | §4: "Md.35'teki ve ilgili mevzuattaki durumlar bu şartın dışında." See MINOR m2 for the §6 row. |

---

## 2. Factual errors (new)

**F1. The TestFlight schedule leaves the pilot without a valid iOS build for part of March (BLOCKER).**

Document §7, Pilot takvimi: "Güz finallerinden önce (21 Aralık): TestFlight beta incelemesi ve Play kapalı testi." and "~22 Mart: yeni TestFlight sürümü. Sürümler 90 gün geçerli, dönem ise 95 gün."

Source 09 L55: "Builds expire after 90 days" [CONFIRMED].

Arithmetic (script): a build that passes review before 21 Aralık was uploaded on 20 Aralık at the latest, so it expires on 20 Mart 2027 (Saturday) at the latest. A build uploaded around the 1 Aralık freeze expires around 1 Mart. The replacement is planned for ~22 Mart (Monday). The document names no other upload between these dates. The r3 version said "Ocak başı: TestFlight", and 4 Ocak + 90 = 4 Nisan did cover 22 Mart. The rewrite moved the review into December but did not move the refresh date. An expired TestFlight app will not launch. Signed records not yet synced stay stuck on the phone, and the "Kayıt kaybı 0" and "senkron" metrics are exposed during pilot weeks 6-8.

Fix: add "Pilot başlamadan önce (≤ 25 Ocak) yeni bir TestFlight yapısı yüklenir" (25 Ocak + 90 = 25 Nisan). The ~22 Mart refresh then covers the term through 20 Haziran. Alternatively, state the rule "her yapı yüklendikten en geç 80 gün sonra yenilenir".

No other new factual error was found. Checked and correct:
- Calendar: all eight §7 dates and the six units with their own calendars (NOT 6). Weekdays are correct: 20 Ara 2026 and 2 May 2027 are Sundays, and finals begin Mon 21 Ara.
- 9 hafta: 29.09 to 01.12 is exactly 63 days.
- Bahar 95 days. Allowance formula. 39 float mismatches at %80 for T in 1..199, with T=15 giving 3 vs 2.
- Base45: 31 bytes is 47 chars. QR 3-M alphanumeric capacity is 61 (segno: 61 chars gives 3-M, 62 gives 4-M). The 2,32 m / 1,16 m sizing holds. The 16:9 heights are 1,25 / 1,49 / 1,87 m.
- Data volume: 8,4 M records and ~33 writes/s (02 L97).
- Regulation: RG 28.09.2025/33031, Md.9(4), Md.19(1)-(3), Md.20(2)/(5), Md.35, and "rapor" appearing only in Md.29.
- KVKK: 2021/1214, 2024/197, 2026/347, 2026/921, Md.5(2)(ç), Md.9(7), 5 iş günü, VERBİS 7 gün, 72 saat, 6 ay / 3 yıl / 30 gün, 302.07.
- PostgreSQL 18.6: 18 released 25.09.2025, EOL 14.11.2030, 19 in beta.
- Library versions:
  - Expo SDK 57 (30.06.2026, RN 0.86, React 19.2); SDK 58 beta 15.09.2026.
  - Flutter 3.47 (12.08.2026). CMP 1.12.1. Capacitor 8.5.2 and Appflow.
  - WatermelonDB, 17 months since release. expo-sqlite 57.0.3. drizzle 0.45.3.
  - Fastify 5.12.5. NestJS 12.1.1. Better Auth 1.7.6. Keycloak 26.7.0.
  - PocketBase 0.40.4 (12.09.2026). Supabase.
  - SheetJS 0.20.3 (2024-07-19 per versions3.txt). write-excel-file 4.1.1 (08.06.2026). exceljs 4.4.0 and the "Temporary" fork.
  - Typst 0.15.1 (17.07.2026). OneSignal.
- Fees and pricing: Netgsm 0,48 TL, Expo Starter 19 USD, Apple 99 USD, Google 25 USD.
- Store rules: 12x14 org exemption, API 36 (Android 16), and Apple 2.1 / 3.2 / 5.1.1(v) / 5.1.1(ix) / 5.2.1.
- Mail: MX for both IU domains points to Google (mx-check.txt).

## 3. Inference stated as fact

- **"Mağaza hesabı: Pilotu kaydırmaz, olmazsa yedek yol kullanılır."** (§7). This is a planning claim that rests on the iOS PWA fallback. The document itself marks that fallback as unresolved (G-B: "iOS'ta kayıtlar silinebilir ... kamera yakınlaştırma desteği belirsiz ... 1 günlük denemeyle kesinleşir"). See O1 for why this matters.
- **§6 Raporlu/izinli row:** "Devamsızlığı düşüren tek izin Md.35 görevlendirmesi". Md.19(1) also exempts "ilgili mevzuat hükümlerinde belirtilen durumlar" (L414), and Md.36 lets boards make arrangements for disabled students. "tek" is an inference. It is MINOR because S5 and the §4 wording already carry the caveat (m2).
- **"başvuruların son günü 2 Ekim"** (§7). This is the author's own target (it came from critic-B2's "bu hafta" → "2 Ekim"), not an IU deadline. "son günü" reads as an external deadline (m3).
- **SheetJS: "Eski xls ve HTML .xls dosyalarını okuyabilen tek olgun seçenek"** and **"O tarihten beri yeni sürüm yok"**. No source says "tek olgun". The release date comes from an npm mirror (@e965/xlsx), not from cdn.sheetjs.com. This changes no decision (m6).

## 4. Decision-relevant omissions

**O1. The 15 Aralık gate has no condition for the case where the store account is missing and the iOS PWA fallback fails (BLOCKER).**
- §7 takes the store account off the gate ("Pilotu kaydırmaz") and names "iOS'ta PWA" as the fallback.
- Ek C makes 2x zoom mandatory ("Bu yüzden 2x yakınlaştırma zorunlu") for back-row reading on 100-150" screens.
- G-B says iOS PWA zoom support is "belirsiz" and that iOS may delete stored records.
- 09 L148 adds that the PWA path trades away anti-proxy strength.

So if IU has no usable Apple account by 15 Aralık, the pilot can go ahead on a fallback that may fail a stated mandatory requirement and the "Kayıt kaybı 0" metric. The 1-day Safari test has no date. Fix: schedule the G-B Safari test before 15 Aralık, and add a gate line: "Mağaza hesabı yoksa pilot, yalnız G-B denemesi (2x yakınlaştırma, depolama) geçtiyse iOS'ta PWA ile başlar; geçmediyse iOS öğrencileri için ... (kâğıt / pilot kayar)."

(F1 above is also decision-relevant, because it fixes when the pilot build must be uploaded.)

## 5. MINOR (change no decision)

- m1. Ek F "60'tan fazla öğrencisi olan hoca" should be "60 ve üzeri" (10 L253: ">= 60 students").
- m2. The §6 "tek izin Md.35" wording is stronger than Md.19(1) + Md.36. Suggested: "Uygulamada tutulan tek izin Md.35; diğer mevzuat istisnaları hocanın elle düzeltmesiyle."
- m3. "başvuruların son günü 2 Ekim" should read "başvurular için hedef tarih 2 Ekim".
- m4. Sunday deadline: the window ends Sat 23:59, so the final (non-"geçici") export exists only on the deadline day itself, a Sunday (20 Ara / 2 May). The document states the Sunday but not what it means for when instructors have to enter data. Say it, or end the window on Friday for sessions held before Friday.
- m5. Ek E "Kamu kurumları rıza ve sözleşme istisnalarını kullanamaz (Md.9(7))" drops the qualifier "kamu hukukuna tabi faaliyetlerinde" (05 L98). The conclusion for attendance is unchanged.
- m6. SheetJS: "tek olgun seçenek" and "yeni sürüm yok" are unsourced or mirror-derived (see §3).
- m7. Play Integrity quota: "artırılması yaklaşık 1 hafta sürüyor". The source says "can take up to a week" (07 L109).
- m8. Ek C "Şubat 2026'dan beri yeni bir P-384 kök sertifikası var" lost its context. It is the Android key-attestation root (03 L72).
- m9. UBYS: "Bunun bir nedeni, iPhone Pro'larda kameranın 0,5x açılması". The cause is taken from user reviews (04 L50); "yorumlara göre" would be exact.

---

Scratch files: `_a4_text.txt`, `_a4_links.txt`, `_a4_extract.py` (this directory).
