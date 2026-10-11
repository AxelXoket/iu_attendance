# 04 Competitors and prior art: class attendance apps

Research date: 2026-09-28. Method: WebSearch + WebFetch only, read-only.
Legend: **[C]** confirmed from the cited page; **[S]** only from a search-engine
snippet (page not fetchable); **[I]** my inference, not a sourced fact.

Access limits that shaped this report: eksisozluk.com, moodle.org, docs.moodle.org,
t24.com.tr and umich.edu returned HTTP 403. istanbul.edu.tr faculty sites are
JS-rendered and WebFetch saw only the page title. Google Play pages came back
truncated. So there are no eksisozluk quotes here. Complaint evidence comes from
App Store reviews, sikayetvar, news and vendor/university KB pages.

---

## 1. Istanbul University (the question that matters most)

| Finding | Status | Source |
|---|---|---|
| İstanbul Tıp Fakültesi student portal has a news item titled "QR Kod ile Yoklama Sistemi". Body text could not be retrieved (JS-rendered). Date, vendor and login method unknown. | [C] title only | https://ogrenci-istanbultip.istanbul.edu.tr/en/haber/qr-kod-ile-yoklama-sistemi-760065006A004A00620043004100520064005F006E0039007900700046006200610041004F003200370077003200 |
| No university-wide IU attendance app or AKSIS attendance module was found in any public source. The official IU app (edu.istanbul.mobile) lists schedule, digital student ID, food menu and announcements. Attendance is not mentioned. | [S] | https://play.google.com/store/apps/details?id=edu.istanbul.mobile |
| AKSIS load failures are well documented at peak periods (the likeliest meaning of "geçen sefer çok sorun yaşandı" with AKSIS login): "E-Devlet ile giriş yap kısmına geldiğimde sistem sürekli dönüyor", "ERR_Connection_timed_OUT" at the registration deadline, mobile access down for about 10 days. Years are not shown on the listing page. | [C] | https://www.sikayetvar.com/istanbul-universitesi/aksis |
| AUZEF mobile app (same IU identity stack): "sistemdeki yoğunluk sebebiyle işleminizi gerçekleştiremiyoruz" (19 Sep 2025), wrong-password loop, password reset broken for about a month (28 Sep 2025). | [C] | https://www.sikayetvar.com/istanbul-universitesi/auzef-mobil-uygulamasina-giris-yapilamiyor-sifre-yenileme-calismiyor |
| Rule the app must serve: IU Önlisans/Lisans Yönetmeliği Md.19 requires at least 70% attendance for theory and 80% for practice on first-time courses. Students who fail it are announced "otomasyon sistemi üzerinden" before finals. Md.20(5): no attendance requirement on courses repeated for a reason other than absence. | [C] | https://www.lexpera.com.tr/mevzuat/yonetmelikler/istanbul-universitesi-on-lisans-ve-lisans-egitim-ve-ogretim-yonetmeligi-1 |

**Not found:** any public post-mortem of a previous IU attendance attempt. The
faculty's "last time" story is **unverified**. Ask the faculty directly which
system it was (İstanbul Tıp QR? a department pilot?) and what failed: login,
load, or connectivity. [I] The AKSIS/AUZEF evidence fits the failure pattern
"everyone authenticates against the central SSO in the same 2 minutes at 09:00".
That is the reason to authenticate once at install, keep a long-lived device
session, and never need a live SSO round-trip during check-in.

Related: github.com/fatihc07/yok ("Kampüs Yoklama" MVP, 20 s rotating QR, "OİS"
write-back in test mode, SSO/MFA/WebAuthn). It is Turkish, but nothing links it
to IU. [C] https://github.com/fatihc07/yok

---

## 2. Turkish universities

The trend is clear. 2024 to 2026 saw a wave of QR attendance rollouts, mostly as a
module of the SIS vendor's app (UBYS, Proliz) or a small in-house web app.
**None of them advertises offline student check-in. Several explicitly require
campus network or internet.**

| University / product | Method | Anti-fraud | Offline | Instructor flow | Export | Date / source |
|---|---|---|---|---|---|---|
| **Bursa Uludağ (BUÜ)** "Akıllı Yoklama", web only (yoklama.uludag.edu.tr), no app | QR shown by instructor; student scans with institutional account | "yenilenen karekodlar" (rotating QR), role-based access, SMS 2FA for staff/admin | Not mentioned (web means online) [I] | Show QR; live monitoring | Excel | Launch 28 Sep 2026, article 24 Sep 2026 [C] https://www.aksiyon.com.tr/karekoderle-ders-takibi-basliyor-buu-de-akilli-yoklama-donemi-360898 |
| **ÇOMÜ** via **UBYS Mobil** | QR scan **or type the verification code shown on screen** | "konum ve zaman damgası" | Students told to arrive 5 to 10 min early and **make sure the internet connection works**; manual backup procedure defined | Project QR, **set validity period**, keep manual fallback | UBYS | [C] https://www.habergo.com.tr/haber/comu-sosyal-bilimler-myo-da-qr-kodlu-yoklama-uygulamasi-basladi |
| **UBYS MOBİL** app (developer: Katip Çelebi Üni. TTO A.Ş., multi-university) | QR / code | as above | No | n/a | n/a | **2.1/5 (15 ratings)**. Reviews: iPhone Pro camera defaults to **0.5x, no zoom: "70 kişilik amfide" cannot read the QR even from the front row**; "Beni hatırla" does nothing, **re-login every time**; grade conflict blocks attendance. Recent update added "multiple class attendance". [C] https://apps.apple.com/tr/app/ubys-mobi-l/id6761981691?l=tr |
| **Hacettepe** E-Yoklama (vendor **Cevizsoft / Ceviz Yazılım**, multi-tenant "select institution" app) | Instructor picks the method: **CBN** (proximity, needs location permission, presence while in the room), **Şifre** (6-digit code with countdown), **QR** generated from web | Timer; location permission for CBN | Not stated | Choose method, open session | Weekly status grid per student | Guide (undated, screenshots 2020/2021) [C] http://bby.hacettepe.edu.tr/E-yoklama_Kullanim_Kilavuzu_Ogrenci_Mobile.pdf. Login = student no + **first 6 digits of TC kimlik no** (weak default). App store: v1.42, 21 Oct 2025, lists QR, CBN, Bluetooth, location; too few ratings. [C] https://apps.apple.com/cl/app/e-yoklama/id1587179943 |
| **Hacettepe + Üsküdar** QR (news) | QR **regenerated every 15 s** | rotation | n/a | n/a | n/a | Apr 2025. Became politically loaded ("QR kodla fişleme") after the March 2025 protests. Students **without smartphones or with weak cameras** risk absence. [C] https://www.sozcu.com.tr/amp/universite-ogrencileri-qr-kodla-fislenecek-p164076 |
| **Fırat** qr.firat.edu.tr | Projected QR, **auto-refresh every 10 s** | rotation | n/a | Dashboard > course (auto-pulled from OBS) > start > big projector QR; live count | Excel, filters | [C] https://qr.firat.edu.tr/ |
| **Anadolu** | QR from the university mobile app (switched from ID cards) | Time window: opens when instructor starts, **auto-closes at lesson end** | Runs "üniversitenin internet ağı üzerinden" | Generate QR at start | n/a | Spring 2025-26 [C] https://www.anadolu.edu.tr/duyurular/qr-kodlu-yoklama-sistemine-gecilmistir-1770989551 |
| **Düzce** (DÜ Mobil) | QR generated in OBS, projected | n/a | n/a | OBS > attendance > projector | n/a | Spring 2025-26 [C] https://bilgiislem.duzce.edu.tr/duyuru/8fff/qr-kodlu-yoklama-sistemi-hak |
| **ESTÜ** (Eskişehir Teknik) ESTÜ MOBİL | App check-in | **Works only on the university's wired/wireless network (on campus)** | Explicitly **no** | n/a | n/a | 2025-26 [C] https://oidb.eskisehir.edu.tr/tr/Duyuru/Detay/mobil-yoklama-uygulamasi |
| **SDU** Güvenli E-Yoklama (Proliz) | **Turnstile card swipe at building entrance** + mobile QR + instructor manual "+" | Physical turnstile presence | n/a | Instructor must **compare headcount vs recorded**, press "end attendance"; off-campus practicals = wet signature then manual entry the same week | Syncs to Proliz OBS | Mandatory from 14 Oct 2024 [C] https://bidb.sdu.edu.tr/tr/haber/guvenli-e-yoklama-sistemine-yonelik-bilgilendirme-48487h.html |
| **İstanbul Ticaret** "Ticaretliyiz" | QR attendance + turnstile access | n/a | n/a | PDF guide (not readable) | n/a | [C] https://ticaret.edu.tr/qr-yoklama-kullanim-kilavuzu/ |
| **Nişantaşı** (private) | QR | n/a | n/a | n/a | n/a | **Records lost**: "4 yoklamadan sadece 2'si görünüyor", 25 to 30 students in one class affected, fear of failing on attendance. 5 Jan 2024 [C] https://www.sikayetvar.com/nisantasi-universitesi/nisantasi-universitesi-qr-devamsizlik-sorunu |
| **YTÜ** | Solidus campus card planned for attendance; E-Kampüs QR is **payments**, not attendance | n/a | n/a | n/a | n/a | [S] https://www.ytukampus.com/konu/yildiz-teknik-universitesinde-kampus-karta-mi-geciliyor/. Note: the "QR'dan nefret ediyorum" YTÜ post (14 May 2026) is about **cafeteria QR payments**: "internet gitti 10 dakika bekleyin", 15 to 20 s per person, 50-person queues. It is the same connectivity failure class. [C] https://www.ytuitirafediyor.com/qrdan-nefret-ediyorum-61831 |
| **Girin** (commercial TR vendor) | Per-session dynamic QR + timer | Location, device binding, optional face recognition | n/a | n/a | Analytics | [C] https://gir-in.com/universitelere-ozel-qr-kod-ile-yoklama-sistemi |

Not found despite searching: ODTÜ, Boğaziçi, İTÜ, Gazi, Marmara, Erciyes.
Sakarya has an "E-Yoklama" poster announcement, but its content could not be
retrieved. [C] https://shmyo.sakarya.edu.tr/tr/duyuru/goster/76125/e-yoklama-tanitim-afisleri-hk

**Privacy debate (Turkey):** Cumhuriyet, 10 Jan 2026. An expert flagged that
one QR app's Play listing says "no data collected" while its privacy policy
allows sharing "statistical data" with third parties, and the app embeds Google
trackers (device model, IP, approximate location). [C]
https://www.cumhuriyet.com.tr/turkiye/universitelerde-imza-yerine-qr-kodlu-yoklama-uygulamasi-yeni-bir-tartismayi-baslatti-dijital-mahremiyet-2468711
Sözcü framed it as "fişleme" (Apr 2025). **KVKK and trust are a real adoption
risk in Turkey. No third-party analytics SDKs, and honest store privacy labels,
are the minimum.** [I]

---

## 3. International products

| Product | Verification | Offline | Anti-fraud | Instructor workflow | Reporting / export | Pricing | Notable evidence |
|---|---|---|---|---|---|---|---|
| **Top Hat** | Random **4-digit code** on screen. "Secure Attendance" adds geolocation (within 500 m) plus Bluetooth proximity to other students | No (cloud) | Geo + BLE proximity; correct code but failed location = **marked absent** | Present > Take Attendance > code shows > Finish (about 3 clicks) | Gradebook; manual Attended/Absent/Excused + comments | Student pays: **$35/term, $58/yr, $96/4 yr**; institution by quote | **Class location = location of the first 3 students who submit**. Deep rooms fail students at the back (PSU ITLD, 10 Oct 2021). IU Bloomington: allow **at least 2 min** on screen, no SMS, run a practice session first. Sources: https://kb.wisc.edu/luwmad/121311 (upd. 10 Apr 2025), https://tophat.com/pricing/, https://itld.psu.edu/2021/10/10/itlds-top-5-top-hat-troubles-and-how-to-solve-them/, https://citl.indiana.edu/teaching-resources/academic-integrity/tophat-attendance/index.html |
| **iClicker (Macmillan)** | Student app / web check-in; **GPS radius** (100 to 500 ft, 150 ft suggested); Bluetooth proximity (Small/Medium/Large Hall), app 8.2+ | No | Geofence; BLE toggle the instructor can disable mid-class for students with issues | **Auto-run on schedule** ("set it and forget it"): students get a push notification, no instructor action. Pin must be set physically in the room | CSV export; per-student %; institutional attendance analytics; follow-up survey on why students miss | Institutional packages (quote) | Auto-run fires on holidays, so sessions must be deleted by hand. **GPS drift puts present students outside the radius; spoofing is easy.** Public userscript to spoof instructor location: https://github.com/1vke/iclicker-exploit-poc. Sources: https://help.ithaca.edu/TDClient/34/Portal/KB/Article/1672/Using-iClicker-for-Attendance, https://www.iclicker.com/institutions/attendance/ |
| **Qwickly** (Blackboard/Canvas/D2L) | Classic: **4-digit PIN + countdown**, ID card reader. Plus: **QR check-in**, location confirmation, session scheduling, seating chart. Pro: NFC, SIS-wide scheduling | No | PIN timer, geolocation (Plus/Pro) | One click inside LMS | Classic: CSV + **custom absence emails**. Plus: **threshold-based alerts**, institution-wide reports. Pro: API. Retention 2/4/7 yr | Enterprise, by FTE, quote only | https://www.goqwickly.com/attendance/features/, https://www.goqwickly.com/attendance-classic/ |
| **Canvas Roll Call** | **Instructor-only** roll call (Present/Late/Absent/Unmarked), no student self check-in | n/a | none | Tap names | Export (session-per-row layout criticized as hard to use); gradebook sync | Included with Canvas | No absence-threshold rules. https://community.instructure.com/en/kb/articles/662770-what-is-the-roll-call-attendance-tool, https://it.fscj.edu/it-blog/canvas-roll-call-attendance |
| **Moodle Attendance (mod_attendance)** | Student self-mark; **QR**; password; **rotating QR/password** (site-level interval + expiry margin); IP subnet restriction; automark | No | "**Prevent students sharing IP address**" (one device per session; breaks on eduroam/NAT, where everyone shares an IP); open session early | Create sessions in bulk, then show QR | Statuses (P/L/E/A, configurable), warnings/notifications, export | Free (GPL). 89 stars, 120 open issues | Bugs: rotating-QR scans returning "wrong password" when expiry records interleave; a scan before session start then fails (issue #746, 9 Apr 2024, open). https://github.com/danmarsden/moodle-mod_attendance, https://github.com/danmarsden/moodle-mod_attendance/issues/746 |
| **Poll Everywhere** Attendance Management (launched 24 Jan 2024) | **Geofenced** check-in before joining a presentation | No | Geofence; location not stored | Set location once per room | Export; LMS sync (Canvas, Moodle, Brightspace, Blackboard, Sakai); credit for check-in and/or participation | Engage/Teams/Enterprise/Individual Instructor plans | https://blog.polleverywhere.com/introducing-attendance-management-poll-everywhere-automated-attendance-feature |
| **Attendance Radar** (Codific, BE) | **Instructor phone emits BLE, students tap once**. Fallback: **6-digit code read aloud** | Not stated (BLE is local; sync is presumably online) [I] | "A single device can only be used to mark attendance for a particular session once" (device binding); timestamps; geofencing "experimenting" | Tap to emit; scan window 1 to 30 min (premium) | **Excel import and export**; university version: SSO/API | Free (2,000 BLE attendances); App Store IAP **$15/mo, $99/yr** (a search snippet said $9/$69, so prices changed) | App Store **3.7/5 (12 ratings)**: "students still like to argue they are here when they are not". Claims 300-seat halls work. https://apps.apple.com/us/app/attendance-radar/id1641847583, https://attendanceradar.com/student-attendance-software-frequently-asked-questions/, https://attendanceradar.com/how-to-take-attendance-in-large-university-lectures/ |
| **SpotterEDU** (ceiling BLE beacons) | Fixed beacons ping the student app; automated emails for absence or arriving over 2 min late | n/a | Hardware beacons | Zero-touch | Advisor alerts | Institutional | About 40 US schools. **Major surveillance backlash** (Washington Post, 24 Dec 2019): false positives, tracking outside class. https://www.washingtonpost.com/technology/2019/12/24/colleges-are-turning-students-phones-into-surveillance-machines-tracking-locations-hundreds-thousands/ |
| **SpeedyAttendance** | Not found. No meaningful web presence | n/a | n/a | n/a | n/a | n/a | n/a |
| **Omlet Yoklama** (TR K-12) | Teacher-side roll call, syncs to server; SMS to parents | n/a | n/a | "Seconds" | Daily/weekly/term reports | Free | Last update 18 Aug 2022. https://apps.apple.com/us/app/omlet-yoklama/id1333078749 |

**Offline support, overall:** no major product (Top Hat, iClicker, Qwickly,
Moodle, Poll Everywhere, UBYS, BUÜ, Fırat) documents offline **student**
check-in. ESTÜ and Anadolu explicitly depend on the campus network, and ÇOMÜ tells
students to check their internet first. Offline-first with signed local proofs
and deferred sync appears only in hobby/GitHub projects (e.g. AttendX:
https://github.com/sakshamshinde10/AttendX-Attendance-System) and small
vendors (QR Student). **This is the clearest gap our app can own.** [I]

**BLE permission cost (Android):** Android 11 and below require ACCESS_FINE_LOCATION
for any BLE scan. Android 12+ uses BLUETOOTH_SCAN/ADVERTISE, and location
can be avoided with `neverForLocation`, but "some BLE beacons are filtered from the
scan results" with that flag. [C]
https://developer.android.com/develop/connectivity/bluetooth/bt-permissions
Top Hat and IU CITL both report that students not enabling Bluetooth/location is the
#1 failure.

---

## 4. Synthesis

### 4a. Features competitors treat as standard that the faculty notes may have missed
(Checked against the brief as given: course creation, Excel roster import,
student self-registration, offline check-in, simplicity.)

1. **Attendance statuses beyond present/absent**: Late, Excused (izinli/raporlu),
   plus instructor manual override with a comment (Top Hat, Canvas, Moodle, SDU "+").
2. **Threshold tracking against the 70%/80% rule** (IU Md.19): a per-student
   running %, an "at risk" flag, and optional alerts (Qwickly Plus threshold alerts,
   Moodle warnings, iClicker reports). Handle Md.20(5) repeat-course exemptions.
3. **Student-visible history**: a per-week grid of their own attendance (Cevizsoft,
   UBYS). This cuts disputes and "I was there" emails.
4. **Code fallback for camera or BLE failure**: type the 4 to 6 digit code shown or
   spoken (ÇOMÜ, Cevizsoft "Şifre", Attendance Radar, Top Hat, Qwickly PIN).
5. **Manual fallback for students without a working phone**: the instructor marks them
   (Anadolu, SDU, ÇOMÜ all define one).
6. **Time window controls**: open early, set validity, auto-close at lesson end
   (Anadolu, ÇOMÜ, Moodle "open session early").
7. **Headcount reconciliation**: show the instructor "recorded N" so they can compare
   to the room (SDU makes this an explicit instructor duty).
8. **Scheduled/recurring sessions** from a weekly timetable, so starting class is
   one tap or zero (iClicker auto-run, Qwickly Plus scheduling). Needs a holiday
   calendar (iClicker's auto-run fires on holidays).
9. **Export in the format the faculty office accepts**: Excel per course with
   sessions as **columns** (the Canvas session-per-row export is a known complaint),
   plus a signed/PDF summary for official records.
10. **Multi-instructor / TA per course** and lab sections (Fırat "lab course setup").
11. **Data retention policy** (Qwickly sells 2/4/7 years) and a KVKK aydınlatma metni.
12. **Practice session** before the first real one (IU Bloomington advice).

### 4b. UX patterns worth copying
- **Big, projector-friendly rotating QR** with a live counter (Fırat: 10 s
  rotation, live participant count). Also show a short numeric code next to it for
  manual entry.
- **Instructor start in 1 to 3 taps** (Top Hat: Present, Take Attendance, Finish).
- **Instructor-selectable method per session** (Cevizsoft: QR / code / proximity).
- **"Disable proximity check now" toggle** during class for students with issues
  (iClicker BLE toggle), instead of failing them silently.
- **Clear success screen** ("Yoklamanız Alındı") plus a visible entry in the student's
  own history, so the student has proof.
- **Scanner with zoom/tele-lens selection and tap-to-focus**, tested in a 70+ seat
  amphitheatre on an iPhone Pro (the 0.5x default is a documented UBYS failure).
- **Persistent login**: authenticate once, stay signed in (UBYS "beni hatırla"
  broken is a top complaint).

### 4c. Known failure modes to avoid
1. **Central login at peak.** AKSIS/AUZEF "yoğunluk" and timeouts. Never put SSO
   or a server round-trip on the check-in critical path. [C evidence, I design]
2. **Connectivity required in the room.** ÇOMÜ, ESTÜ and Anadolu all assume network
   access. Basements break them. (The YTÜ cafeteria QR shows the same class of
   failure: "internet gitti 10 dakika bekleyin".)
3. **Lost or unsynced records** (Nişantaşı: 2 of 4 sessions missing for 25 to 30
   students). You need durable local queues, idempotent sync, a receipt to the
   student, and an instructor-side reconciliation view.
4. **Camera and optics.** iPhone Pro 0.5x default, weak cameras, the back rows of
   large halls (UBYS reviews; Sözcü).
5. **Geolocation is unreliable indoors and trivially spoofed** (iClicker GPS drift,
   public spoof script, Top Hat "first 3 students" anchor failing back rows).
   Do not make GPS a hard gate.
6. **Static QR / screenshot sharing** in WhatsApp groups. Rotation of 10 to 20 s is
   the market norm (Fırat 10 s, Hacettepe 15 s, BUÜ rotating). Rotation does not
   stop a live video relay, or one student holding two phones. So pair it with
   **device binding** (one device per student, one check-in per device per session,
   as in Attendance Radar and Moodle), not IP (Moodle's IP check breaks on eduroam/NAT).
7. **Rotation implementation bugs** (Moodle: overlapping expiry windows reject
   legit scans; a scan before start fails). Use a deterministic time-step code
   (TOTP-like) with a grace window. Do not keep a DB table of pre-generated codes. [I]
8. **Weak default credentials** (Cevizsoft/Hacettepe: first 6 TC digits as password).
9. **Surveillance perception** (SpotterEDU backlash; "QR ile fişleme" in TR press;
   Cumhuriyet on hidden trackers). Keep the minimum data, no location history,
   no third-party analytics, a plain KVKK notice, and collect only during the
   session window.
10. **BLE permission friction** (location permission on Android 11 and below; Bluetooth
    off). If BLE is used, it must be optional, with a code fallback.
11. **Time cost** (Top Hat secure mode needs at least 2 minutes). Budget for it or
    let check-in run in the background while teaching starts.

### Open questions for the faculty (NEEDS_CONTEXT)
- What exactly was "last time": the İstanbul Tıp QR system, or another pilot?
  Which failure dominated: login, load, or no signal?
- Is an Excel export enough for official records, or must results be keyed into AKSIS
  by hand before the Md.19 announcement deadline?
