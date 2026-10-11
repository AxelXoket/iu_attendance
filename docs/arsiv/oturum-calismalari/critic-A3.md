# Critic A3: fidelity of iu-yoklama-ozet.html (29.09.2026 build) against research/01..10, mx-check.txt, src/ primary texts

VERDICT: FAIL

Reason: one HIGH factual error that reaches the primary source level (the "güncel İÜ takvimi" is the Hukuk Fakültesi calendar; the real general IU calendar is the file the document calls "taslak"). It changes the add-drop dates, the AKSIS deadline status, the Ek H labels and the Bahar 2027 pilot start. It also invalidates critic-A2's E4 premise and A2's "calendar dates passed" line. Everything else from A2 is fixed or nearly fixed; the remaining items are LOW.

Method: full text extracted from the HTML including all `<details>` appendices (478 lines, 54 links; scratch copies `_a3_text.txt`, `_a3_links.txt`). Regulation articles re-read in `research/src/yonetmelik-2025.txt`. Calendar PDFs opened with PyMuPDF (metadata + page 1 text) and the rendered PNGs; the OIDB accordion JSON (`research/src/acc.json`) read for how IU itself labels each file. QR version recomputed with segno; weekdays and TestFlight expiry computed by script; Md.35 "count as present vs remove from denominator" checked algebraically.

---

## 1. Status of critic-A2 findings

| # | Status | Note |
|---|---|---|
| E1 Md.35 "yalnız" | PARTLY | "gibi" and "hazırlık dahil" fixed (§4). Md.19(1)'s second exception ("ilgili mevzuat hükümlerinde belirtilen durumlar hariç", primary L413-414) is still not mentioned; §4 states "Sağlık raporu: Devamsızlığı düşürmüyor" flatly. LOW. |
| E2 izinli / S5 | FIXED | Görevli is MVP; S5 is raporlu only. |
| E3 Md.24 | FIXED | "Rapor yalnız Md.29'da" matches primary (L810, L832 only). |
| E4 calendar link | FIXED as asked, but premise wrong | Both links present, labelled "güncel" and "taslak". The labels are inverted: see N1. |
| E5 backup code odds | FIXED | "6 gizli hane ve 1 kontrol hanesi (Damm)", 1/1.000.000 consistent. |
| E6 QR version | FIXED | v3 at ECC M, ~2,3 m / ~1,2 m. See N7 (new Başlat field). |
| E7 ESTÜ | FIXED | "ESTÜ ise yalnız kampüs ağında çalışıyor" matches 04 L56. |
| E8 CSV injection | FIXED | =, +, -, @, tab, CR, LF; V/Y. |
| E9 SMS / passkey | FIXED | Ek D "Sonra" with correct reasons. |
| E10 push | FIXED | "İÜ hukuk biriminin onayı olmadan kullanılmaz". |
| E11 Ek B 01 | FIXED | Ek B matches escalations.md for all 10 sources plus the design critic. |
| E12 iOS channel | FIXED | Pilot = TestFlight; Unlisted only at scale, with 3.2 risk. |
| Inf. Senate directive | FIXED | "Bu bir çıkarım", faculty board named. |
| Inf. clock sources | FIXED | "uygulamada doğrulanacak". |
| Inf. CameraX 640x480 | FIXED | "bu bir tahmin". |
| Inf. iOS 26 BLE | FIXED | "raporlanıyor". |
| Inf. Güvenli Klasör | FIXED | Ek A "(E'nin çıkarımı)", Ek E unverified list. |
| Inf. Cerrahpaşa | FIXED | Ek E unverified list. |
| Inf. PWA Safari counter | FIXED | Ek E, "kendi sayacı var". |
| O1 Md.35 status | FIXED | MVP status with belge no; Ek A records 08 vs 10; "paydadan çıkarmak daha sert" is algebraically correct (g(T-a-g) >= 0). |
| O2 sync vs AKSIS | FIXED | Window shortened; "geçici" export; changed-since list. Residual edge case in N5. |
| O3 health leak | FIXED | S5 default: not stored, handled by petition. |
| O4 critical path | FIXED | Store account, name/logo, VERBIS on the 15 Aralık list. |
| O5 crash reporting | FIXED | Ek A row; store consoles + sync data. |
| O6 silent MVP cuts | FIXED | Ek A "MVP'den çıkarılanlar". |
| O7 email matching | FIXED | Ek A row. |
| O8 attestation transfer | FIXED | "(KVKK onayı gerekir)" and §5 list. |
| O9 smaller | FIXED | Staff aydınlatma, S11 lists six units, Md.20(5), backup "İÜ kontrolünde". |
| #24 AUDITOR | FIXED | Ek A "denetçi ve asistan rolleri". |
| #25 load row | FIXED | "(tahmin)", 2/week doubles. |

---

## 2. New factual errors

**N1. The "güncel İÜ takvimi" is the Hukuk Fakültesi calendar; the "taslak" is the current general IU calendar (HIGH).**

Document §7: "Güz dönemi: 14 Eylül-18 Aralık 2026. Ekle-bırak 5-6 Ekim." / "Bahar dönemi: 25 Ocak-30 Nisan 2027. Ekle-bırak 8-9 Şubat." / "AKSİS'e devamsızlık girişi için son gün, taslak takvimde 20 Aralık ve 2 Mayıs. Güncel takvimde bu tarih yok."
Ek H: "İÜ 2026-2027 akademik takvim (güncel, 04.08.2026)" -> `2026-2027-akademik-takvimi-guncel-hali-(1).pdf`; "İÜ 2026-2027 takvim taslağı (AKSİS son günü için)" -> `yeni-2026-2027-egitim-ogretim-yili-onlisans-ve-lisans-akademik-takvimi.pdf`.

Primary evidence:
- `research/src/c2627-2026-2027-akademik-takvimi-guncel-hali-(1).pdf`, page 1 header (PyMuPDF text and `c2627-p1.png`): "İSTANBUL ÜNİVERSİTESİ / **HUKUK FAKÜLTESİ** 2026-2027 EĞİTİM-ÖĞRETİM YILI / ÖNLİSANS VE LİSANS AKADEMİK TAKVİMİ".
- OIDB accordion (`research/src/acc.json`), IU's own labels: "2026-2027 Eğitim-Öğretim Yılı Önlisans-Lisans Akademik Takvimi için" -> `yeni-2026-2027-...pdf`; "2026-2027 Eğitim-Öğretim Yılı **Hukuk Fakültesi** Akademik Takvimi için" -> `2026-2027-akademik-takvimi-guncel-hali-(1).pdf`.
- General calendar (`c2627-yeni-p3crop.png`): ekle-bırak 14-18 Eylül 2026 / 25 Ocak-1 Şubat 2027; sınıf listeleri 14-18 Eylül / 29 Ocak-2 Şubat; "Öğrenci Devamsızlıklarının Öğrenci Otomasyon Sistemine İşlenmesi ve İlan Edilmesi İçin Son Gün" 20 Aralık 2026 / 2 Mayıs 2027; finals 21-31 Aralık / 3-14 Mayıs.

Root cause: 06 L197-213 labels the Hukuk file "UPDATED version" and the general file "superseded"; the document inherits it. Hukuk is one of the six units the document itself (S11) says run their own calendar.

Consequences in the document:
1. Both add-drop dates are wrong for every unit except Hukuk (5-6 Ekim / 8-9 Şubat should be 14-18 Eylül / 25 Ocak-1 Şubat).
2. "Güncel takvimde bu tarih yok" is false; the AKSIS deadline is in the current official calendar. "taslak" in §7, S3 ("Son tarih taslak takvimdeki gün") and Ek H is wrong.
3. Ek H labels are inverted: a reader who clicks "güncel" gets the Law Faculty calendar.
4. Pilot plan: "25 Ocak: pilot başlar". In the general calendar, 25 Ocak is the first day of add-drop and class lists are generated 29 Ocak-2 Şubat. Week 1 of the pilot has no final AKSIS roster to import (see O-N1).
5. The teaching dates (14 Eylül-18 Aralık, 25 Ocak-30 Nisan) happen to match in both files and stay correct.

Fix: swap the labels ("İÜ 2026-2027 akademik takvim (OİDB, 30.06.2026)" and "Hukuk Fakültesi takvimi (örnek birim takvimi)"); correct the add-drop dates; state the AKSIS deadline as official (20 Aralık / 2 Mayıs); in S3 drop "taslak".

**N2. Backup-code and anchor-less auto-accept limits contradict each other (LOW-MEDIUM; a fraud/fairness parameter).**
§3: "Yedek kodla ya da zamanı belirlenemeyen kayıtla katılmak: öğrenci başına dönemde en fazla 2 kez otomatik kabul edilir." (one shared budget, per student).
Ek C, Zaman çapası: "Çapası olmayan kayıt, öğrenci başına dönemde 2 kez" (per student). Ek C, Yedek kod: "Öğrenci başına, **ders başına** dönemde 2 kez" (per student per course, separate budget).
With 6 courses, Ek C allows up to 12 + 2 automatic accepts per student; §3 allows 2. S9 ("Otomatik kabul dönemde 2") does not settle which. Pick one and use it everywhere.

**N3. Ek A quotes the regulation inaccurately (LOW).**
Ek A Md.35 row: 'Yönetmelik bu süreleri "devamsızlık hesabında dikkate almıyor".' Primary L973-974: "devamsızlık sürelerinin hesabında dikkate alınmaz". The conclusion (08 over 10) still follows; the quotation marks should carry the exact text.

**N4. Expo pinning rule contradicts the chosen SDK (LOW).**
Ek C İlkeler: "Expo'da en yeni SDK'nın bir önceki sürümü kullanılır." Ek D picks Expo SDK 57, which is the latest stable (SDK 58 is only beta, 15.09.2026; 01 L37). 01 L206: "stay one SDK behind latest". Either the rule means "one behind once 58 is stable" (say so) or the pick should be 56.

**N5. Pilot "minutes saved" target lost its scope (LOW).**
§8 and Ek F: "Kâğıda göre haftada en az 10 dk kazanç" for every instructor. 10 L253: ">= 10 min/week per instructor **with >= 60 students**". A small-section instructor cannot reach 10 minutes; the metric will read as failed for the wrong reason.

---

## 3. Inference stated as fact

- **"Play ise kamu adına yapılan uygulamayı kurum hesabından istiyor"** (§7, as a reason İÜ's account is required). 09 L16: "[CONFIRMED rule; INFERENCE on applicability to IU]"; 09 L91: "Whether a public university counts is not stated." Say "Play'in 'devlet uygulaması' kuralının üniversiteye uygulanıp uygulanmadığı belirsiz"; Apple 5.1.1(ix) alone carries the conclusion.
- **"İÜ'nün hesapları zaten var: ... App Store'da AUZEF."** 09 L11: the App Store seller is "Auzef" (a faculty), "IU (or at least a unit of it)", and publishing under it is "[INFERENCE]". Whether the AUZEF account can publish another department's app is unknown and it is on the 15 Aralık critical path. Add "AUZEF hesabının başka birim için kullanılıp kullanılamayacağı sorulmalı (S17)".
- **"AKSİS .xls adıyla HTML verebiliyor"** (Ek C). 06 L44-47: file type "could not be confirmed", HTML-disguised xls is "[INFERRED] ... common for ASP.NET grid". Harmless as a design rule; mark "olabilir (tahmin)".
- **"Nişantaşı'nda kayıtlar kaybolmuştu"** (§6). Source is one şikayetvar complaint (04 L59). Ek H labels it "şikâyet", so tolerable; "bir şikâyette kayıtların kaybolduğu bildirildi" would be exact.

---

## 4. Decision-relevant omissions

**O-N1. Pilot week 1 coincides with add-drop and precedes class-list generation (MEDIUM, follows from N1).**
General calendar: Bahar add-drop 25 Ocak-1 Şubat, class lists 29 Ocak-2 Şubat 2027. The plan starts the pilot on 25 Ocak and measures adoption at week 3 ("3. haftada öğrencilerin en az %90'ı kayıtlı"). In week 1 rosters are provisional and change; the importer's diff-and-deactivate flow (§6) and S6 (late-added students) will fire on every pilot course in week 2. Either start the pilot in week 2 (1 Şubat) or state that week 1 runs on a provisional roster and is excluded from the metrics.

**O-N2. The shortened sync window is zero on the last teaching day (LOW-MEDIUM).**
Ek C: "Senkron süresi: 7 gün ile AKSİS son gününden 2 gün öncesinden hangisi önce gelirse." AKSIS deadlines are Sunday 20 Aralık 2026 and Sunday 2 Mayıs 2027 (computed); minus 2 days = Friday 18 Aralık and Friday 30 Nisan, which are the last teaching days. Sessions on those days have a window of hours; Thursday sessions one day. All late records go to instructor review, and the "%99,5 senkron süresi dolmadan" metric is structurally unreachable for those sessions. State the rule for sessions on or after deadline minus 2 (for example: window ends at the AKSIS deadline itself for those sessions, with an in-class "sync now" prompt).

---

## 5. What passed re-check (new or changed text)

Regulation: Md.19(1)-(3) (theory 70 / practice 80, clinical per anabilim dalı, "otomasyon sistemi" announcement), Md.20(2) grade contribution, Md.20(5) repeat exemption and clinical twice-failed exception, Md.9(4) late-registration absence, Md.35 wording, "rapor" only in Md.29. Allowance formula and 39 mismatches (A2). Md.35 "paydadan çıkarmak daha sert" (algebra). KVKK: 2021/1214, 2024/197 (University as controller), 2026/347 (18.02.2026), 2026/921 (29.04.2026, labelled "aynı yönde", tolerable), Md.5(2)(ç), Md.9(7), notarised translation, 5 business days, VERBIS 7 days, 72 h, 6 months / 3 years / 30 days, 302.07 10 years, Veri Güvenliği Rehberi Nisan 2025. Versions: Expo SDK 57 30.06.2026 / SDK 58 beta 15.09.2026, 15+15 EAS builds, Flutter 3.47, CMP 1.12.1 22.09.2026, Capacitor 8.5.2 11.09.2026, Appflow Feb 2025 / 31.12.2027, WatermelonDB 0.28.0 07.04.2025 (17 months), expo-sqlite 57.0.3, drizzle 0.45.3 21.09.2026, Fastify 5.12.5 16.09.2026, NestJS 12.1.1 28.09.2026, Supabase self-host 13 services / 2 emails per hour / Aug 2026 tooling, Google-Turkcell 2028, PocketBase 0.40.4, Better Auth 1.7.6 24.09.2026, Keycloak 26.7.0 09.07.2026, SheetJS 0.20.3, xlsx 0.18.5 + both CVEs, write-excel-file 4.1.1, exceljs 4.4.0, Syncfusion tax-funded exclusion, pdfmake 0.3.11 / Typst 0.15.1 / Puppeteer 25.12, OneSignal 1K MAU from Sep/Oct 2026, Nearby audio 2021 / Messages 2023 / Feb 2026 study, IMEI Android 10, BLE hub ~7 links / 5-7.5 min, iOS HCE not in Turkey, Wi-Fi SSID needs location. Distribution: 12x14 gate and org exemption (09 L15 CONFIRMED), API 36 since 31.08.2026, Apple 2.1 / 3.2 / 5.1.1(v) / 5.1.1(ix) / 5.2.1, TestFlight 90 days (4 Jan + 90 = 4 Apr, 22 Mar build covers to 20 Jun), Bahar 95 days. QR: v3 at ECC M holds for binary payloads up to 42 bytes (segno); "~31 bayt" is plausible only with small ids and a short Başlat value, but the version conclusion survives up to 42 bytes. Retirees on @istanbul.edu.tr (e-posta talimatı L29). Roster headers (06 L35-39). Rotation 10-15 s at other universities (Fırat 10, Hacettepe 15). Ek B verbatim against escalations.md.
