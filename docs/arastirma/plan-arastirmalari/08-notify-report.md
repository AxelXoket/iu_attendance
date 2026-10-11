# 08: Notifications, threshold alerts, Excel/PDF export, roster import, report layout

Researched 2026-09-28. WebSearch/WebFetch only. Every claim is tagged:
**[C]** confirmed from the cited primary source, **[S]** secondary source only,
**[I]** my inference / engineering recommendation, **[V]** verified by a local script.

---

## 0. Governing rules at Istanbul University (read first, it changes the math)

- **IU Ön Lisans ve Lisans Eğitim ve Öğretim Yönetmeliği, RG 28.09.2025 / 33031, MADDE 19** [C]
  (via Lexpera consolidated text, https://www.lexpera.com.tr/mevzuat/yonetmelikler/istanbul-universitesi-on-lisans-ve-lisans-egitim-ve-ogretim-yonetmeligi-1):
  - (1) "35 inci maddede belirtilen durumlar ile ilgili mevzuat hükümlerinde belirtilen durumlar hariç öğrenciler **ilk kez aldıkları** derslerin en az % 70'ine ve varsa teorik ders dışındaki her türlü uygulama çalışmasının en az % 80'ine devam etmek zorundadır."
  - (2) Tıp, Diş Hekimliği, Eczacılık, Hemşirelik: clinical/practical attendance computed **per anabilim dalı separately**.
  - (3) "...devam şartlarının herhangi birini sağlamayan öğrenciler, akademik takvimde belirlenen yarıyıl/yıl sonu sınavlarının öncesinde **otomasyon sistemi üzerinden ilan edilir**. Devamsız öğrenciler, ilgili dersin yarıyıl/yıl sonu sınavına alınmaz ve başarısız sayılır."
- **MADDE 35 (Etkinliklerde görevlendirme)** [C]: time a student is officially assigned to sports/culture/art events "devamsızlık sürelerinin hesabında dikkate alınmaz". This is the only excuse the regulation itself names.
- The regulation has **no article that lets a sağlık raporu excuse class attendance** [C, absence of a clause; Lexpera fetch]. Comparable university rule, Dokuz Eylül Ders Devam Takibi Yönergesi (Senato 5 Eylül 2025, 714/09), MADDE 5(4): sağlık raporu periods are entered into the system and "Öğrenciler bu süreler içinde **devamsız sayılır**" [C] (https://ogrenci.deu.edu.tr/wp-content/uploads/2025/09/Ders_Devam_Takibi_Yonergesi-1.pdf). Same MADDE 5(3): görevli-izinli students "derse **devam etmiş sayılır**" [C]. Secondary sources agree that reports count inside the 30% allowance at most Turkish universities [S] (Ankara Üniv. Ziraat, https://www.agri.ankara.edu.tr/2021/12/16/ogrencilerin-saglik-raporu-alirken-dikkat-etmeleri-gereken-hususlar/).
- DEÜ MADDE 6(6) [C]: late-registered students (mazeret, ek yerleştirme, DGS) have attendance computed **from their registration date**. IU text is silent [I: make it a configurable policy, default = from enrollment date, because add/drop week exists].
- DEÜ MADDE 7 [C]: objections are judged on "sistemin günlük log kayıtları ve/veya ... ıslak imzalı yoklama listeleri", fixed by "birim yönetim kurulu kararı". This is the precedent for our audit log requirement: corrections need who/when/why and ideally a reference to a board decision or document number.
- DEÜ MADDE 8 [C]: cancelled lessons get **telafi** sessions "yapılamayan ders saati kadar". Our total must track cancellations and make-ups.

**Consequence [I]:** the app is *not* the authority. IU announces devamsız students through its own automation system (AKSİS). Every warning text must say the official status is announced by the faculty/AKSİS.

---

## 1. Push delivery and a hybrid for offline classrooms

### 1.1 Platform facts

| Fact | Source |
|---|---|
| Android 13+ requires runtime `POST_NOTIFICATIONS`; FCM SDK 23.0.6+ declares it in the manifest but the app must request it at runtime. | [C] https://firebase.google.com/docs/cloud-messaging/android/get-started ; https://developer.android.com/develop/ui/compose/notifications/notification-permission |
| FCM high priority "attempts to deliver ... immediately, allowing FCM to wake a sleeping device"; normal priority "may be delayed ... until the device exits doze". | [C] https://firebase.google.com/docs/cloud-messaging/android/message-priority |
| "If FCM detects a pattern in which messages don't result in user-facing notifications, your messages may be deprioritized to normal priority." | [C] same page |
| FCM offline: "the message is stored until a connection is established"; default/max lifespan 4 weeks (TTL 0 to 2,419,200 s); TTL 0 = "messages that can't be delivered immediately are discarded". | [C] https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan |
| APNs offline: "APNs stores **only one notification per bundle ID** ... In most cases, the latest notification is stored." `apns-expiration` up to 30 days; value 0 = try once, do not store. `apns-priority` 10 immediate, 5 power-aware, 1 never wakes; 5 and 1 "might get grouped and delivered in bursts". | [C] https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns |
| iOS provisional authorization: no prompt; notifications "only appear in the notification center's history", user later chooses Keep / Turn Off. | [C] https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications |
| iOS 15 interruption levels: passive, active, time-sensitive (breaks through Focus; separate capability, user can disable), critical (bypasses ringer; **requires Apple-approved entitlement**, meant for health/safety/public-safety). | [C] WWDC21 https://developer.apple.com/videos/play/wwdc2021/10091/ ; [S] https://documentation.onesignal.com/docs/en/ios-focus-modes-and-interruption-levels |
| Firebase Cloud Messaging is a **global** service: "could process data at any of the Google Cloud Platform locations"; no region choice. Installation IDs retained until deleted via API, then purged within 180 days. | [C] https://firebase.google.com/support/privacy |

**Critical alerts: not an option [I].** Attendance is not a safety use case; Apple will reject the entitlement request. Time-sensitive is legitimate for "yoklama kapanıyor" but users can switch it off per app.

### 1.2 Services compared

| Option | Cost (2026) | Data location | Notes |
|---|---|---|---|
| **FCM HTTP v1 + APNs direct** (FCM can also relay to APNs) | Free | Google global infra [C]; Apple US for iOS regardless of vendor | Fewest processors. You write token management and retries yourself. |
| **Expo Push Service** | "no cost" [C]; 600 notifications/s per project [C] | Expo (US). Content held "only in memory and in message queues, not in databases" [C] | Only relevant if the client is Expo/React Native. No lock-in: `getDevicePushTokenAsync` gives native tokens for direct FCM/APNs [C]. https://docs.expo.dev/push-notifications/faq/ |
| **OneSignal** | Free plan capped at **1,000 MAU** for mobile push (new customers from 2026-09-01, existing from 2026-10-01) [C pricing page + S Pushwoosh]; Growth $19/mo + **$0.012 per MAU** [C] | US by default; EU residency described as premium add-on [S Vendr] | 10,000 MAU = $19 + $120 = $139/mo [I, arithmetic]. Adds a third processor holding student device data. https://onesignal.com/pricing |
| **Novu** | MIT core, self-hostable; enterprise folder commercial [S] | Wherever you host it; still sends via FCM/APNs | An orchestration layer (workflows, digests, in-app inbox), not a delivery network. Overkill for 3 notification types [I]. |

**KVKK [C/I]:** Law 7499 amended KVKK md. 9 in force 2024-06-01; standard contracts (Kurul decision 2024/959, 04.06.2024) must be notified to the Kurum **within 5 business days** of signing; Yönetmelik RG 10.07.2024/32598 [C] (https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim , https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi). Any push provider is a cross-border transfer because APNs and FCM are foreign; you cannot avoid it for iOS [I]. Mitigation [I]: payload carries no name, no student number, no attendance figures; only a generic title plus an opaque id the app resolves after it syncs. Fewer vendors = fewer transfer instruments. **Escalate to main conversation:** whether IU's data controller (the university, not the student developer) must sign/notify the standard contract with Google; this is a legal decision.

### 1.3 How useful is a "session started" push for basement students?

- If the phone has no connectivity when the instructor opens the session, the push is **not delivered then** by either network [C]. FCM stores it up to TTL; APNs stores only the latest one per app [C].
- A "yoklama başladı" notification that arrives after the session closed is actively harmful (false urgency, and on iOS it may be the one stored message that displaces a more important one) [I].
- Therefore [I]: send "session started" with **TTL / `apns-expiration` = session close time**, `collapse_key` / `apns-collapse-id` = session id, high priority / apns-priority 10, always user-visible (to avoid FCM deprioritization). It is a best-effort bonus for connected students, never the primary signal.

### 1.4 Local scheduled notifications from the on-device timetable

Facts:
- **iOS: 64 pending local notification requests per app**; system keeps the soonest 64, a repeating trigger counts as one [C/S] (Apple forums https://developer.apple.com/forums/thread/811171 , flutter_local_notifications #2312).
- **Android 14+: `SCHEDULE_EXACT_ALARM` denied by default** for new installs targeting 13+; `USE_EXACT_ALARM` is Play-restricted to alarm clock and calendar apps [C] https://developer.android.com/about/versions/14/changes/schedule-exact-alarms . An attendance app will likely not qualify for `USE_EXACT_ALARM` [I].
- Inexact alarms on Android 12+: "the system invokes the alarm **within one hour** of the supplied trigger time, unless ... battery saver or Doze"; `setWindow` windows under 10 minutes are clipped to 10 minutes; all alarms are cancelled on reboot, reschedule on `BOOT_COMPLETED` [C] https://developer.android.com/develop/background-work/services/alarms .
- Flutter: `flutter_local_notifications` `AndroidScheduleMode.inexactAllowWhileIdle` fallback when exact permission is denied; some Android 14 crash reports without the permission [S] (issues #2248, #2185).

### 1.5 Recommended hybrid [I]

| Event | Primary channel | Backup | Wording rule |
|---|---|---|---|
| Class about to start (timetable) | **Local** notification, scheduled from the synced timetable, 10 min before slot start | none | Phrase as timetable fact: "BIL203 dersi 10:00'da, Derslik B-104. Yoklama ders sırasında açılabilir." Never claim a session is open. |
| Session opened by instructor | **Push** (FCM/APNs direct), TTL = close time, collapse per session | In-app banner on next foreground sync | "BIL203 yoklaması açıldı, 10:40'a kadar." |
| Session closing soon | Push only if server knows close time; plus **local** at scheduled slot end minus 10 min | | "Yoklama 5 dk içinde kapanıyor." Drop if student already checked in (server side) or if local state shows check-in done (client side cancels the local one). |
| Threshold warning | **Push** (normal priority, long TTL fine, it stays true) + persistent in-app card | Weekly digest local notification computed from last synced data | See section 2. |

Implementation rules [I]:
- Rolling window: schedule only the next 7 days of concrete occurrences (holiday and cancellation aware), capped at ~50 on iOS to leave headroom under 64; reschedule on every sync, app open, timezone change and `BOOT_COMPLETED`.
- Timezone: Europe/Istanbul is fixed UTC+3 (no DST since 2016) but schedule with the tz database anyway.
- Android exact alarms: ask for `SCHEDULE_EXACT_ALARM` via the system settings intent with an in-app explanation; if denied, use `setWindow` starting 15 min before class with a 10 min window. Do not declare `USE_EXACT_ALARM`.
- Permission prompts in context: request `POST_NOTIFICATIONS` / iOS authorization after the student has at least one course, with a pre-prompt explaining the three notification types. On iOS start with provisional to show value, then ask.
- Measurable outcome: log `delivered_at - sent_at` for push (client acknowledges on receipt) and `fired_at - scheduled_at` for local. Target: p95 local drift under 10 min on Android without exact permission.

---

## 2. Threshold alerts: math, wording, levels, excuses

### 2.1 Definitions [I, based on MADDE 19/35 above]

Per student, per course-section, per component (theory and practice are **separate** requirements, 70% and 80%):

- `T` = total **planned** units for the term = scheduled occurrences from the timetable minus cancelled occurrences plus telafi occurrences, counted from the student's enrollment date if late-registered (policy flag). Unit = ders saati if the faculty counts hours (a 3-hour block where the student leaves after hour 2 is 1 absent hour); unit = session otherwise. Store per-hour granularity; aggregate by policy.
- `p` = required percent as an **integer** (70 or 80).
- `maxAbs = T - ceil(T * p / 100)` computed in **integer arithmetic**: `T - ((T*p + 99) // 100)`. Mathematically equal to `floor(T*(1-p/100))`.
- `A` = absences counted so far = unexcused absences + sağlık raporu absences (default: counted, per DEÜ 5(4) and IU silence; policy flag) . Görevli (MADDE 35) units are **not** absences (treated as attended, DEÜ 5(3)).
- `remaining = maxAbs - A`.

**Do not use the float formula.** [V] Script compared `floor(T*(1-p/100))` to the integer form for T = 1..199, p in {60,70,75,80}: **39 mismatches, all at p = 80**, e.g. T=15: float gives 2, correct is 3 (`1 - 0.8 = 0.19999999999999996`). This is a real bug class; the gate test must include T=5,10,15 at 80%.

Worked values [V]: 14 sessions @70% -> 4; 42 hours @70% -> 12; 28 hours @70% -> 8; 14 @80% -> 2; 28 @80% -> 5; 15 @80% -> 3; 13 @70% -> 3.

Edge rules [I]:
- **Repeat students are exempt** ("ilk kez aldıkları derslerin") -> no threshold warnings, show "Bu ders için devam zorunluluğunuz yok (tekrar)". Requires a `first_attempt` flag in the roster.
- Medicine/dentistry/pharmacy/nursing clinical: compute per anabilim dalı rotation (MADDE 19(2)).
- Do not show "current %" (attended/held so far) as the headline; early in term one absence out of two looks like 50%. Headline is `remaining` in the student's unit; secondary is projected term percent `(T - A) / T`.
- `T` changes when sessions are cancelled or added; recompute and never send a "level up" warning caused only by a cancellation without re-checking.

### 2.2 Warning levels and wording [I; phrasing patterned on e-Okul style staged warnings, S: https://help.edupage.pro/Index.php/edupage/tr/topic/veli-mobil-devams-zl-k-bildirimi and staged 5/15/25 day e-Okul letters]

| Level | Condition | Color | Student text (TR) |
|---|---|---|---|
| Normal | `A < maxAbs/2` | neutral | "Devamsızlık: 1/4 hafta. Kalan hakkınız: 3." |
| Dikkat | `A >= ceil(maxAbs/2)` and `remaining >= 2` | amber | "BIL203: devamsızlık hakkınızın yarısını kullandınız. Kalan: 2 ders." |
| Kritik | `remaining == 1` | orange | "BIL203: yalnızca 1 devamsızlık hakkınız kaldı." |
| Son sınır | `remaining == 0` | red | "BIL203: devamsızlık hakkınız kalmadı. Bir devamsızlık daha, dersten devamsızlık nedeniyle başarısız sayılmanıza yol açabilir." |
| Aşıldı | `remaining < 0` | dark red | "BIL203: devamsızlık sınırını aştınız. Kesin durum fakülteniz tarafından AKSİS üzerinden ilan edilir. Bir hata olduğunu düşünüyorsanız öğretim elemanınızla görüşün." |

Rules: notify only on **level transitions** (idempotent, keyed by student+course+level+term); show unit (ders / saat); never say "kaldınız" as a final verdict; link to the per-course history so the student can spot a wrong mark. Instructor panel shows a list filtered by level, and a pre-exam export of `remaining < 0` students to hand to the faculty (matches MADDE 19(3) timing).

### 2.3 Absence codes to store [I]
`P` present, `A` absent, `L` late (policy: counts as present or as fraction), `R` raporlu (counts as absence by default), `G` görevli (counts as present, MADDE 35), `X` session cancelled (removed from T), `T` telafi session. Every change of a mark after the session closes writes an audit row: old, new, actor, reason, document ref, timestamp.

---

## 3. Excel and PDF export

**Where [I]: server-side.** Reasons: one implementation for Android, iOS and web; the Excel/PDF must match what the faculty receives; server has the full dataset and audit log; fonts can be pinned; exports become reproducible artifacts you can hash and log. Client-side only for small ad hoc CSV in the web panel if wanted.

### 3.1 Excel writers

| Library | Version (checked 2026-09-28) | License | Notes |
|---|---|---|---|
| exceljs (Node) | 4.4.0, last npm publish about 3 years ago | MIT [C registry] | Styles, merged cells, freeze panes, conditional formatting, streaming writer. Main repo effectively dormant; fork `@protobi/exceljs` 4.4.0-protobi.10 ("Temporary fork ... pending upstream merge") [C registry]. Does **not** read legacy .xls [I, README lists xlsx/csv only]. |
| SheetJS CE `xlsx` (Node/browser) | **0.20.3 from https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz**; npm registry stuck at 0.18.5 | Apache-2.0 [C] | npm 0.18.5 has CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) [C advisories https://advisories.gitlab.com/pkg/npm/xlsx/]. CE **cannot write cell styles** (Pro only) [S]. Best **reader** (xls BIFF2-8, xlsx, csv, html tables). https://docs.sheetjs.com/docs/getting-started/installation/nodejs |
| openpyxl (Python) | 3.1.5 (2024-06-28) | MIT [C PyPI] | Read and write xlsx. |
| XlsxWriter (Python) | 3.2.9 | BSD-2-Clause [C PyPI] | Write-only, best formatting fidelity and `constant_memory` mode. |
| excel (Dart) | 4.0.6, published about 2 years ago | MIT [C pub.dev] | xlsx only, no xls. |
| syncfusion_flutter_xlsio (Dart) | 34.2.9 | Commercial; Community License requires < $1M revenue, <= 5 devs, <= 10 employees, and **"Any government-related organization (i.e., funded by tax dollars) is not eligible"** [C https://www.syncfusion.com/products/communitylicense] | Istanbul University is a state university: if IU becomes the owner/licensee, the community license does not apply. **Escalate** (licensing risk). |

### 3.2 PDF generators

| Library | Version | License | Turkish glyphs |
|---|---|---|---|
| pdfmake | 0.3.11 (deps pdfkit ^0.19.1) | MIT [C registry] | Default Roboto via VFS; the **standard 14 fonts "support only ANSI code page (only english characters)"** [C https://pdfmake.github.io/docs/0.1/fonts/standard-14-fonts/] -> ğ ş ı İ Ğ Ş break. Always embed a TTF (Noto Sans, DejaVu Sans, Roboto full). |
| Puppeteer (HTML to PDF) | 25.12.0 | Apache-2.0 [C registry] | Uses system fonts: in Docker install fonts (fonts-noto-core or fonts-dejavu) or `@font-face` local files, else tofu [S puppeteer issues #2230, #3183]. Heavy (Chromium ~ hundreds of MB) but best for wide tables with CSS `@page size: A4 landscape` and repeating `thead`. Playwright is equivalent. |
| Typst | 0.15.1 (2026-07-17) | Apache-2.0 [C GitHub] | Single binary / Docker `ghcr.io/typst/typst`; fonts embedded; `set text(lang: "tr")` [I]. Excellent tables, deterministic output, fast. Needs a template language skill. |
| WeasyPrint | 70.0 | BSD-3 [C PyPI] | HTML/CSS paged media, needs Pango; fonts via fontconfig. |
| @react-pdf/renderer | 4.9.0 | MIT [C registry] | Register a TTF with Turkish glyphs; built-in Helvetica has the same WinAnsi problem [I]. |
| pdf (Dart) | 3.13.1 | Apache-2.0 [C pub.dev] | TTF support; only relevant for on-device PDFs. |
| jsPDF | n/a | MIT | Standard fonts ASCII-limited; needs `addFileToVFS`/`addFont` with a TTF [S]. |

**Turkish PDF rule [C/I]:** Windows-1252/WinAnsi lacks Ğ ğ İ ı Ş ş (Windows-1254 is the code page that replaces six Icelandic letters with them [S https://en.wikipedia.org/wiki/Windows-1254]). Any generator using a built-in base-14 font will lose these letters. Embed a font and add a gate test that renders "ĞÜŞİÖÇ ğüşıöç" and asserts the extracted text round-trips.

**Recommendation [I]:** Node backend -> exceljs (pin, watch the protobi fork) for styled .xlsx, SheetJS 0.20.3 from the CDN only for reading, Puppeteer or Typst for PDF (Typst if you want small containers and deterministic output; Puppeteer if the web panel already renders the same HTML table). Python backend -> XlsxWriter for export, python-calamine for import, WeasyPrint or Typst for PDF.

Export hygiene [C/I]: CSV/formula injection: cells starting with `= + - @`, tab, CR, LF must be neutralised in CSV (OWASP https://community.owasp.org/attacks/CSV_Injection). The "+"/"-" attendance marks are a direct collision in CSV; in xlsx write them as typed string cells (never formulas), and for CSV use `V`/`Y` (var/yok) or `1`/`0`. CSV for Turkish Excel: UTF-8 **with BOM** and `;` delimiter [S https://www.convertmystuff.com/resources/developer-tools/csv-encoding-and-excel/].

---

## 4. Roster import (.xls, .xlsx, .csv)

Readers [C]:
- Node: SheetJS 0.20.3 reads XLS BIFF2-8, XLSX, XLSB, CSV, HTML; options `codepage` (legacy XLS and CSV without BOM), `FS` delimiter override, `raw`, `cellDates`, `sheetRows` (preview) https://docs.sheetjs.com/docs/api/parse-options . For CSV decoding use iconv-lite (supports cp1254, ISO-8859-9, cp857) https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings ; PapaParse auto-detects delimiter from `[',', '\t', '|', ';', ...]` https://www.papaparse.com/docs .
- Python: python-calamine 0.8.2 (MIT) reads xls, xlsx, xlsb, ods; pandas `engine="calamine"` since 2.2.0 (2024-01-19) [C]. xlrd 2.0.2 reads **only .xls** [C]. openpyxl only xlsx.
- Dart: no reliable .xls reader [I]; do imports server-side.

Pipeline [I]:
1. **Sniff format by magic bytes, not extension**: `D0 CF 11 E0` = OLE2 .xls; `50 4B 03 04` = zip/xlsx; `<html`/`<table` = HTML masquerading as .xls (common for ASP.NET "Excel export" buttons; **verify against a real AKSİS export**, hypothesis); otherwise text.
2. **Text decoding**: strip UTF-8 BOM; try strict UTF-8; on failure decode as cp1254. cp1254 vs ISO-8859-9 differ only in 0x80-0x9F, so cp1254 is the safe superset. Detect cp857 (DOS) only if Turkish letters appear at 0x80-0xA7 DOS positions (e.g. 0xA7 = ğ) [I]. Show the decoded preview so a human confirms.
3. **Delimiter**: count `;` `,` `\t` on the first 20 non-empty lines, pick the one with a consistent count; Turkish Excel saves `;`.
4. **Header detection**: scan the first ~15 rows; score each row by how many cells match a synonym dictionary after Turkish-aware folding (NFC, lowercase with tr rules, map ı/İ/I -> i, ş->s, ğ->g, ü->u, ö->o, ç->c, strip punctuation): `ogrenci no|numara|ogr no|no` -> student_no; `adi soyadi|ad soyad` -> full_name; `adi` + `soyadi` -> split; `bolum|program`; `sinif`; `tekrar|alis sayisi`. Pick the highest-scoring row above a threshold; else ask the user to map columns. Note JS `toLocaleLowerCase('tr-TR')` exists; Python `str.lower()` is locale-blind (`'I'.lower()=='i'`), so fold explicitly.
5. **Cell hygiene**: read student numbers as **text** (leading zeros, Excel may store 10+ digit numbers as floats or `1,23E+09`); trim NBSP; collapse spaces; NFC normalize; reject rows with no student number. Do not import TC kimlik no even if present (KVKK data minimisation).
6. **Diff before apply** keyed by student_no: `added`, `removed` (dropped in add/drop), `changed` (name/program), `unchanged`, `duplicates in file`, `invalid rows`. Preview with counts and a per-row table; removed students are **soft-removed** (enrollment end date) so their past attendance stays in reports; apply is one transaction and writes an audit record with file hash (SHA-256), uploader, counts.
7. Late additions get `enrolled_from` = import date (feeds `T` in section 2).

---

## 5. Report layouts used in Turkish universities

Primary examples [C]:
- Karamanoğlu Mehmetbey Üniv. Ermenek MYO "ÖĞRENCİ DERS YOKLAMA LİSTESİ" (landscape A4): header block "T.C. KARAMANOĞLU MEHMETBEY ÜNİVERSİTESİ / ERMENEK MESLEK YÜKSEKOKULU", boxes PROGRAM and DERSİN ADI; columns `SIRA | ÖĞR. NO | ADI SOYADI | DERS | ..../..../2013` x15 date columns; 33 rows per page. https://dosya.kmu.edu.tr/ermenek/userfiles/file/personelbelgeler/DersYoklamaListesi.pdf
- Çukurova Üniv. Ceyhan MYO "DERS YOKLAMA TUTANAĞI": PROGRAM ADI, DERSİN ADI; `S.N. | ADI SOYADI | ÖĞRENCİ NO | 1. HAFTA ... 8. HAFTA` on page 1 and `9. HAFTA ... 16. HAFTA` on page 2; 27 rows per page. https://ceyhan.cu.edu.tr/storage/personel/Yoklama%20%C3%87izelgesi(8%20Haftal%C4%B1k).pdf
- DEÜ requires end-of-term delivery of yoklama çizelgeleri "tutanak ile Dekanlığa/Müdürlüğe" [C, MADDE 6(4)].
- Marmara EBE publishes an .xlsx form (Yoklama1.xlsx, page updated 2025-12-24) [C].

Neither paper form has total or percentage columns; that is where a digital report adds value [I].

Recommended layouts [I]:

**A. Dönem yoklama çizelgesi (per course-section, A4 landscape, the faculty deliverable)**
Header: T.C. İSTANBUL ÜNİVERSİTESİ / Fakülte / Bölüm / Akademik yıl + yarıyıl / Ders kodu, adı, şube / Öğretim elemanı / Devam şartı (%70 teori, %80 uygulama) / Toplam planlanan: 14 hafta (42 saat) / Rapor tarihi and a document id (hash).
Columns: `Sıra | Öğrenci No | Adı Soyadı | W1 .. W14 (date under week number) | Katıldı | Devamsız | Mazeretli(G) | Devam % | Kalan hak | Durum`.
Cell marks: `+` var, `-` yok, `R` raporlu, `G` görevli, `İ` iptal (greyed column), `T` telafi; legend in footer. Durum: `Devamlı` / `Sınırda` / `Devamsız`. Repeat students: `Muaf (tekrar)`.
Page break: repeat header row on every page, ~25-30 rows per page, week columns split into 1-8 / 9-16 like Çukurova if more than ~16 sessions. Footer: "Öğretim Elemanı Adı Soyadı / İmza / Tarih", page x/y, "Bu belgedeki düzeltmeler denetim kaydında tutulmaktadır".
Excel version: same grid, frozen panes at C/header row, conditional fill on Durum, one sheet per section, plus a "Düzeltmeler" sheet from the audit log for the selected date range.

**B. Öğrenci devam durumu (per student)**: one row per enrolled course: ders, planned units, attended, absent, excused, %, kalan hak, level; drill-down list of dates with marks and any corrections.

**C. Tarih aralığı raporu**: same as A but columns limited to sessions within [from, to]; totals labelled "aralık içinde" and a separate "dönem geneli" column so percentages are never computed on a partial window by mistake.

**D. Sınav öncesi devamsızlar listesi**: only `remaining < 0`, sorted by student number, for the faculty announcement before finals (MADDE 19(3)).

---

## Open items to escalate
1. KVKK: who is data controller and who signs/notifies the standard contract for FCM/APNs (legal).
2. Syncfusion community license is unavailable to tax-funded bodies; avoid Syncfusion if IU will own the app.
3. Policy flags the faculty must decide: unit (hour vs session), sağlık raporu treatment, late-enrollment denominator, "late" arrival counting.
4. Get one real AKSİS roster export to confirm file format (xls vs HTML-as-xls vs xlsx) and header names.
