# Critic C3: adversarial review of iu-yoklama-ozet.html (third protocol revision)

Reviewer stance: competitor engineer who wants this rejected. Read-only review.
Inputs: `iu-yoklama-ozet.html` (full source, all sections and Ek A-H), `faculty-notes.md`,
`critic-C.md`, `critic-C2.md`, `research/06-iu-specifics.md` (dates). Date: 2026-09-29.
Items the doc lists under "Önlenemez" or as pilot measurements are not re-raised.

VERDICT: FAIL

One line: the revision adopted almost every C2 fix, but the new nonce rule hard-rejects honest
records whenever an instructor device dies or two devices start the same class, the same-boot rule
is unspecified in a way that lets an unmodified app forge scan time, the security test in the
15 Aralık gate needs a finished system by about 1 Aralık, and two "Önlenir" claims are still false.

---

## Part 1. Status of the 13 critic-C2 findings

| # | Status | Reason |
|---|---|---|
| C2-1 reboot bucket | FIXED | Anchors at online contacts, nearest same-boot anchor before or after, 2 auto-accepts, review only when the outcome flips. New gaps in the fix itself: C3-3, C3-4. |
| C2-2 stolen seed | PARTLY | Start value, 3-day horizon and outbox check added. The start value is printed in clear in every QR, so one accomplice defeats it, and revoking a lost device does not rotate the course-section keys (C3-5). |
| C2-3 no ad hoc session | PARTLY | course_section_id in payload, daily per-section keys, offline telafi, unknown session held. Phone still hard-rejects a course that is not in its possibly stale list (C3-13). |
| C2-4 izinli / Md.35 | FIXED | "Görevli (Md.35)" with document number, counted as present (Ek A), metric in Ek F. |
| C2-5 window vs deadline | FIXED as proposed | min(7 d, deadline - 2 d), reminders, near-threshold list, provisional export. The formula leaves 9 h or less for last-day classes (C3-10). |
| C2-6 backup code | PARTLY | 6+1 Damm digits, cap, 5 % course flag in Ek C. Section 3 states a different cap than Ek C (C3-14); cap has no exemption for students who cannot scan (C3-8). |
| C2-7 drift / instructor clock | PARTLY | Session median removes the instructor clock. Phone drift is not bounded: anchors are only taken when the app runs, so the nearest anchor can be days away (C3-4). |
| C2-8 kern.boottime | FIXED | Same-boot decided on device, only intervals sent, 35F9.1 named. Privacy-manifest declaration and the actual boot-identity method are still unstated (C3-3). |
| C2-9 device change | PARTLY | In-person bind code, revoked at request time, new-key records held. No identity check at the in-person step, Kararlar still says "engeller", revoke-at-request creates a self-lockout (C3-11). |
| C2-10 store account | FIXED | In the 15 Aralık list, PWA named as iOS fallback. |
| C2-11 held / block | FIXED | Definition, one-tap prompt, block default. Default when the prompt is never answered is missing (C3-9). |
| C2-12 podium PC | PARTLY | Policy allowed. Mechanism unspecified: what key the PC gets and how an offline phone approves (C3-6). |
| C2-13 spec gaps | FIXED | slot = floor(unix_utc/5), UTC checks, crash metric from sync data, lost-record metric from appeals. |

---

## Part 2. Findings on the current protocol (most severe first)

### C3-1. The start-value rule rejects honest records and lets a fake session become "held" (HIGH)
- Ek C: "farklı başlatma değeri taşıyan kayıtlar reddedilir". Honest cases that produce two values
  for one class: laptop battery dies and the instructor restarts on the phone (the doc's own edge
  case "başka bir cihazdan devam eder"), browser crash before the value was written to IndexedDB,
  co-instructor starts on a second device, lost device whose outbox never syncs. Students who scanned
  the first QR carry value N1; the only outbox that arrives reports N2; their records are rejected,
  not flagged, and the phone's one-record-per-session rule stops a rescan.
- Reverse case: "Yapıldı" = "en az bir geçerli yoklama kaydı". A MAC-valid record from a session no
  outbox ever reported (stolen key, see C3-5) makes an unplanned Saturday session "held" and gives
  every other student an absence.
- Fix: write the start record durably before the first QR frame; server accepts the set of values
  reported for that section and time. Unknown value with valid MAC goes to a held cluster shown as
  one line ("10:03, tanınmayan başlatma, 37 kayıt: kabul / ret"). Records alone never make an
  unplanned session "held"; it needs an outbox start or instructor confirmation. Add tests for all
  four honest cases.

### C3-2. The 15 Aralık gate includes a security test, which needs a finished system in about 9 weeks (HIGH)
- Section 7 puts "İÜ sunucusu, SMTP rölesi ve güvenlik testi" in the list due 15 Aralık, and Ek E says
  Genelge 2019/12 wants the test before go-live. A test of the pilot build needs feature freeze near
  1 Aralık: 9 weeks from today for one student who is also studying. "Ocak başı: TestFlight" then
  lands in Güz finals, 21-31 Aralık 2026 (draft calendar, research/06), and depends on store access
  that arrives 15 Aralık at best.
- This revision added scope, not removed it: offline ad hoc sessions, podium-PC pairing, Md.35 status,
  held prompts with block splitting, head-count risk ranking, device-bind approval flow, retention
  and destruction jobs, plus three roles.
- Fix: split the gate. By 15 Aralık: approvals plus a security test of a frozen core (register, bind,
  scan, sign, sync, verify, roster import, AKSIS page, audit log). Move to "Sonra": podium-PC pairing
  (instructor mirrors own device), block splitting (default only), head-count risk ranking (plain
  list), automated destruction (manual procedure for a one-term pilot), IDFV hashing (C3-17). Put the
  finals weeks into the plan explicitly.

### C3-3. "Same boot" is not defined; a naive rule lets an unmodified app forge the scan time (HIGH)
- The doc says only that the phone decides. If the implementation uses "elapsed did not go down",
  a reboot is missed whenever new uptime exceeds the anchor's. Recipe: anchor at 08:00 with uptime
  1000 s; get a forwarded QR of the 10:00 slot; reboot; scan when uptime reaches 8200 s; stay offline
  for 3 h so the before-anchor is nearest. Computed scan time equals the slot exactly: no delay flag,
  no cap used. No root or modified app needed, so it is not covered by "Önlenemez".
- Fix: same boot = equal boot identifier (Android `Settings.Global.BOOT_COUNT`; iOS `kern.boottime`
  compared on device only, declared under 35F9.1 in PrivacyInfo.xcprivacy). When both a before and an
  after anchor exist in the same boot, both must agree within tolerance or the record is
  unresolvable. Add the recipe as a regression test.

### C3-4. Anchors are sparse, so honest phones drift past the 8-10 s threshold (MEDIUM-HIGH)
- "Telefon her internete bağlandığında" is not true for an Expo app: it runs code only when opened or
  when the OS grants a background task. Students open the app in class (offline) and at sync. The
  nearest same-boot anchor can be days away. At 20 ppm the clock error reaches 8 s after 4.6 days,
  at 50 ppm after 1.9 days (the doc's earlier planning figure). Honest late syncers get flagged as
  forwarders and are not counted until approved.
- Fix: when anchors exist on both sides in the same boot, interpolate with the measured rate
  (removes constant drift, so syncing late gains a cheater nothing). With one anchor, tolerance =
  threshold + 50 ppm x distance, and above a set distance the record is unresolvable. Take an anchor
  on every app foreground and in an `expo-background-task` job; keep the lowest-RTT sample.

### C3-5. "Çalınan hoca anahtarıyla sahte QR üretmek: Önlenir" is false, and device revocation does not revoke keys (MEDIUM)
- Ek C puts the start value in the QR in clear. A thief with a daily key needs one accomplice to scan
  once and send the value; then every remote student gets locally generated QRs at the right slot,
  zero delay, invisible to the median check. Keys are per course-section, shared by all of the
  instructor's devices, so "Kayıp cihaz web üzerinden iptal edilir" leaves up to 3 days of valid keys
  in the lost device and cannot tell which device leaked.
- Fix: move the claim to "Sınırlanır (en fazla 3 gün, sınıfta bir yardımcı gerekir)". Derive
  K_dev = HMAC(K_day, device_id) and put the device key id in the QR; revocation invalidates that
  device's keys from the revocation time. Optional stronger mode: keep the start value out of the QR
  and MAC with K_sess = HMAC(K_dev, value), accepting that a lost outbox then means paper.

### C3-6. Podium-PC key and approval are unspecified and need internet where there is none (MEDIUM)
- The MAC uses the daily course-section key. If the PC receives that key, it can mint QRs for every
  session of that section for the day, and "oturum kapanınca geçersiz olur" cannot be enforced.
  Approval "hocanın telefonundan" needs the phone online, but the large halls are the basement rooms
  the owner says have no signal.
- Fix: PC receives only K_sess = HMAC(K_dev, value || closes_at) with a server-chosen value.
  Approval works offline: PC shows a challenge, the phone PWA shows an 8-digit code =
  trunc(HMAC(K_dev, challenge)), the instructor types it on the PC, the wired PC sends it to the
  server, which checks it with its copy of the key.

### C3-7. A receipt screenshot is enough to get a manual correction (MEDIUM)
- Edge case table: "Makbuzunu gösterirse hoca düzeltir". The receipt is plain text ("Alındı: ders,
  şube"); an edited screenshot is indistinguishable. If the phone still has the record it can simply
  sync, so the screenshot path is used mainly by people who have no record. On paper the sheet stays
  with the instructor, so this path is weaker than paper.
- Fix: corrections based on a receipt need the signed record itself: "Kaydı dışa aktar" produces a
  file or QR that the panel verifies (device signature + QR MAC). Without that, the correction uses
  a reason code "beyana dayalı" and is counted in the audit report.

### C3-8. The backup-code cap penalises students who cannot scan (MEDIUM)
- Ek F promises "Ekran okuyucuyla yoklamaya katılım: Başarılı". A blind student cannot aim at a
  projected QR, so every attendance is a backup code; the same applies to phones whose camera cannot
  read the back of the hall. After 2 per course, every record is flagged and not counted until
  approved: about 12 flags per course per term for one student, against "Haksız yere finalden men 0".
- Fix: instructor can mark a student "yedek kod muaf" (audit row, reason code); that student's code
  records skip the cap but keep the delay check. Add a test with a screen-reader student.

### C3-9. "Ders işaretlenir" has no defined effect, and the AKSIS page can print DEVAMSIZ over open flags (MEDIUM)
- "İşaretlenir" is used for: missing outbox, head count exceeded, backup code over 5 %, large clock
  skew. Only the head-count case says counted records stay. The others say nothing. "Hoca yalnız
  sonucu değiştirecek kayıtlarda devreye girer" only works if the AKSIS page refuses to show DEVAMSIZ
  while an outcome-flipping flag is open. A planned session whose "Ders yapıldı mı?" prompt is never
  answered has no default, and it changes T.
- Fix: one table in Ek C: each flag, its effect on counting, who clears it. AKSIS page shows
  "KARAR BEKLİYOR" instead of DEVAMSIZ while any open item can flip the result, and blocks final
  export while any past planned session is unclassified. Regression tests for both.

### C3-10. Last-day classes get a 9-hour or negative sync window (MEDIUM)
- Deadlines 20 Aralık 2026 and 2 Mayıs 2027 are Sundays; minus 2 days = Friday 18 Aralık and Friday
  30 Nisan, the last class days. A 15:00 Friday class gets a window of 9 h if the end is 23:59, or
  -15 h if the end is 00:00 (computed by script). Honest students in basement classes sync on
  Saturday and land in the review queue during the export weekend.
- Fix: define the end as 23:59 Europe/Istanbul with a 24 h floor. A late record that passes every
  other check (key, MAC, start value, anchor, delay) is accepted and shown in the "sonradan değişen"
  list instead of review; lateness alone is not a fraud signal once C3-4 interpolation exists.

### C3-11. Device change: no identity check, self-lockout on request, claim still overstated (MEDIUM)
- The instructor types the bind code "yüz yüze" but nothing says the instructor checks who is
  standing there; in a 150-seat course they cannot. A friend with the OTP brings a bind code for the
  absent student's account. Kararlar still says "Başkasının hesabını kendi telefonuna taşımayı
  engeller".
- Revoke at request time: a student who logs in on a tablet "to look" instantly invalidates their
  phone; every later scan on it is rejected until they find an instructor in person.
- Fix: panel shows name and number and requires "öğrenci kimlik kartı görüldü". Kararlar wording to
  "zorlaştırır". Warn before the request; old-key records after the request are held, not rejected,
  and the old device can cancel the request with a signed message. Approval travels in the outbox,
  so it works offline.

### C3-12. Combined sections in one room cannot take one attendance (MEDIUM, inference)
- The QR carries one course_section_id and the phone rejects any other section. When two şube are
  taught together in one hall (common for large first-year courses; not verified for the pilot
  department), students of the second section are rejected.
- Fix: "birlikte işlenen şubeler" group in the panel; the QR carries the group id and the phone list
  includes groups. Otherwise state that combined sections need two Başlat runs.

### C3-13. Phone rejects a course that is missing from a stale list (LOW-MEDIUM)
- Section 2: "QR başka bir derse aitse telefon reddeder". An add-drop student added yesterday, or a
  student whose name match is still waiting for instructor approval, has a list without that course
  and is rejected in class; week 1 of the pilot is when this peaks.
- Fix: reject only if the list is fresh (< 24 h) and there is no pending match; otherwise store and
  show "Alındı, doğrulama bekliyor". The server rejects if the student is not enrolled.

### C3-14. Three different auto-accept caps (LOW)
- Section 3: code OR unresolvable, 2 per student per term combined. Ek C: unresolvable 2 per student
  per term, plus code 2 per student per course per term. S9: "Otomatik kabul dönemde 2". With six
  courses the gap is 2 versus 14 free accepts. Also undefined: which records consume the cap when
  they arrive out of order.
- Fix: pick one rule, state it once in Ek C, reference it elsewhere; consume in QR-slot order.

### C3-15. Median per merged session mixes two clocks; small classes invert it (LOW)
- Two devices for one class (C3-1) are merged, so delays are bimodal and one device's students fall
  outside the median. In a 6-student section, 4 forwarders set the median.
- Fix: compute the median per start value; below 8 records use the instructor device's own anchor
  offset sent in the outbox.

### C3-16. Raw-byte QR payload is not reliable on iOS (LOW)
- ~31 bytes of binary MAC and ids will contain 0x00; expo issue #4817 reports iOS truncating scanned
  data at null characters. 
- Fix: encode as Base45 in QR alphanumeric mode: 47 characters, within version 3-M alphanumeric
  capacity (61), so the size claim holds. Freeze this before the geometry test.

### C3-17. The IDFV / ANDROID_ID hash is not needed (LOW, simplicity and KVKK)
- With one active device per account, the second-account case can be closed without any device id:
  the app holds one account, logout deletes its key, a fresh install wipes the Keychain, and any
  re-login is a device change needing the in-person code. Keeping the hash adds a pending legal
  question (Section 5) and code.
- Fix: drop the hash from MVP; move "Aynı cihazda ikinci hesap" to "Önlenir (hesap değiştirmek
  yüz yüze onay ister)".

---

## Part 3. Contradictions with the fixed constraints

- Offline-first: the podium PC path needs both the PC and the phone online (C3-6); device-change
  approval is not stated to work through the outbox (C3-11). The phone's "internete bağlanınca"
  behaviour needs a background task or it is really "uygulama açılınca" (C3-4). Hard rejection by
  start value makes correctness depend on an instructor outbox arriving (C3-1).
- No AKSIS: respected. The only AKSIS dependency is the deadline date, which the current calendar
  does not contain; make it an admin field per term with default "finallerden önceki gün".
- Simplicity: the "2 dakika" promise still carries per-session head count plus a review queue of up to
  six flag types without a single table saying which ones the instructor must act on (C3-9).

## What improved (for fairness)
Per-section daily keys with offline telafi, start value, 3-day horizon, anchors with on-device
same-boot decision, interval-only upload, session median, capped auto-accept, Md.35 status, deadline
aware window, in-person bind code with request-time revocation, "held" definition, store account in
the gate. The remaining problems are mostly specification gaps that would become bugs.

Sources: expo issue #4817 (iOS truncation at null bytes, github.com/expo/expo/issues/4817);
Apple 35F9.1 wording as cited in critic-C2; dates from research/06-iu-specifics.md (draft calendar:
deadline 20 Aralık / 2 Mayıs, finals 21-31 Aralık / 3-14 Mayıs); weekday and window arithmetic by
script. Inference, not verified: combined sections in the pilot department (C3-12), 20-50 ppm sleep
clock drift (C3-4).
