# Critic C4: adversarial review of iu-yoklama-ozet.html (fourth revision)

Reviewer stance: competitor engineer who wants this rejected. Read-only review.
Inputs: `iu-yoklama-ozet.html` (md5 1cf818e2b2f9d956de0dfbafa28a0f73, full source incl. all Ek, text
extracted to `_c4_text.txt`), `faculty-notes.md`, `critic-C.md`, `critic-C2.md`, `critic-C3.md`,
`research/06-iu-specifics.md` and its calendar page images. Date: 2026-09-29.
Classification: BLOCKER = changes a decision in the doc or makes a stated claim false. SPEC = detail for
the protocol specification, changes no decision. Items under "Önlenemez", pilot measurements and open
questions (S1-S18, G-A..G-D) are not re-raised.

VERDICT: FAIL (4 BLOCKER, 13 SPEC)

One line: the C3 fixes are mostly in, but the iOS store fallback cannot run the protocol, the iOS boot
identifier is derived from the wall clock, the phone rejects every week-1 scan under the doc's own
rule, and the summary claims code does not drive the schedule while its own gate needs a 1 Aralık
code freeze.

Checked and NOT a finding (to save the next reviewer time): the calendar dates in Section 7
(ekle-bırak 14-18 Eylül / 25 Ocak-1 Şubat, sınıf listeleri 29 Ocak-2 Şubat, son gün 20 Aralık /
2 Mayıs, finaller 21-31 Aralık) match the general önlisans/lisans calendar image
(`research/src/c2627-yeni-p3crop.png`); the "güncel hali" PDF with ekle-bırak 5-6 Ekim is the Hukuk
Fakültesi calendar (`c2627-p1.png` header), as Ek A says. The float bug claim (39 wrong values of T in
1..199 at %80, T=15 gives 2 instead of 3) and the integer formula were re-run by script: correct.
Base45 of 31 bytes = 47 characters, V3-M alphanumeric capacity 61: correct.

---

## Part 1. Status of the 17 critic-C3 findings

| # | Status | Reason |
|---|---|---|
| C3-1 start value rejects honest records | FIXED | All reported start values accepted, start record written before first QR, unknown values clustered and asked, records alone never make an unplanned session "held". New ordering gap: SPEC-3. |
| C3-2 gate needs finished system in 9 weeks | PARTLY | Podium PC, block splitting, risk ranking, auto destruction, IDFV moved to "Sonra"; freeze date and finals in plan. But "ana özellikler" is not defined, there is no slip rule, and the summary still says code does not set the schedule (B4). |
| C3-3 same boot undefined | PARTLY | Boot id on device, two-anchor consistency, regression test adopted. The chosen iOS id (kern.boottime) moves when the clock is set, so the recipe returns on iOS (B2). |
| C3-4 sparse anchors | PARTLY | Foreground and background-task anchors, interpolation, 50 ppm per distance. The proposed maximum distance was not adopted, so one-anchor tolerance grows without limit (SPEC-2). |
| C3-5 stolen key "Önlenir" | FIXED | Moved to "İşaretlenir veya sınırlanır", per-device key with key number in QR, revocation renews that device's keys. |
| C3-6 podium PC | FIXED | Descoped: instructor mirrors own device, pairing in "Sonra" (Ek B decision). Room input question: SPEC-12. |
| C3-7 receipt screenshot | FIXED | Receipt is the signed record as a QR, verified in the panel; otherwise "beyana dayalı" code. |
| C3-8 backup cap penalises blind students | FIXED | "Yedek kod muaf" with audit row. Residuals: SPEC-4. |
| C3-9 "işaretlenir" undefined | PARTLY | Ek C flag table, "KARAR BEKLİYOR", export blocked on unanswered "yapıldı mı". Two rows still say only "Ders işaretlenir" with no effect on counting (SPEC-4). |
| C3-10 last-day window | FIXED | Day before deadline 23:59, 24 h floor, valid late records accepted into "sonradan değişenler". Generalisation: SPEC-7. |
| C3-11 device change | FIXED | "Kimlik görüldü", Kararlar says "zorlaştırır", old-key records held not rejected, signed cancel, approval via outbox. |
| C3-12 combined sections | FIXED | Group id in QR, group in scope, S18. Key and head count per group: SPEC-11. |
| C3-13 stale list reject | PARTLY | Stale list now holds. A fresh list that lacks the course still rejects, which kills week-1 and add-drop scans (B3). |
| C3-14 three caps | FIXED | One rule (2 per student per course per term, code + unresolvable combined), stated in Section 3, referenced from Ek C and S9. Ordering key: SPEC-5. |
| C3-15 median mixes clocks | FIXED | Median per start value; below 8 records the instructor device offset. |
| C3-16 raw bytes on iOS | FIXED | Base45, ~47 chars, V3-M. Space character note: SPEC-13. |
| C3-17 IDFV hash | FIXED | Dropped; one account per install, re-login is a device change; Ek D and Section 5 consistent. |

---

## Part 2. Findings on the current design (most severe first)

### B1. BLOCKER: the iOS store fallback (PWA) cannot run the protocol, so "Mağaza hesabı pilotu kaydırmaz" is false
- Section 7: "Mağaza hesabı: Pilotu kaydırmaz, olmazsa yedek yol kullanılır ... Yedek yol: iOS'ta PWA."
  The App Store account is unresolved (S17: AUZEF account, 5.1.1(ix) wants an institutional publisher).
- A web app has no boot identifier, no clock that survives page reloads (performance.now() restarts per
  load, Date.now() is the user-settable wall clock) and no background task. Ek C's time anchor
  (BOOT_COUNT / kern.boottime, expo-background-task, interval-only upload) cannot exist there.
  Consequence either way: if the PWA trusts Date.now(), "Telefonun saatini değiştirmek: Önlenir" and
  forwarding detection are false for every iOS student (set the clock back by the forwarding delay);
  if the PWA's records are treated as "zamanı belirlenemeyen", each iOS student exhausts the 2 auto
  accepts per course in week 2 and every later record goes to review, breaking "Hocanın zamanı ≤2 dk"
  and the ≤%2 unresolvable target by design.
- The doc itself (G-B) says iOS PWA storage can be evicted and camera zoom support is uncertain, while
  Ek C calls 2x zoom "zorunlu" for large halls. The PWA is also a second student client that is not in
  the 9-week scope.
- Fix: make an iOS publishing account (IU account, or TestFlight under an account IU approves) a
  15 Aralık prerequisite, with "yoksa pilot Android + elle ekleme ile yapılır ya da kayar" written out;
  or keep the PWA fallback but state its reduced guarantees (no scan-time proof, head count only) and
  exempt it from the auto-accept cap. Pick one; the current sentence promises both.

### B2. BLOCKER: kern.boottime is not a boot identifier; the C3-3 recipe works on iOS with a manual clock set
- Ek C: "Aynı açılış mı kararı ... iOS'ta kern.boottime." kern.boottime is stored as wall-clock time of
  boot and is shifted whenever the system clock is set. Apple DTS (Quinn, forum thread 125634): "The fact
  that the boot time changes when the system clock changes means that this difference is always
  meaningful." It is built to keep now - boottime stable, not boottime.
- Attack with an unmodified app: take an online anchor right after a boot (uptime e1 ~20 s), reboot, set
  the clock by hand so the new boottime equals the old one (minute picker plus timing the tap; needs
  only a tolerance-sized precision), scan a forwarded QR exactly d = (reboot time - anchor time + e1)
  after its slot, then reboot again before syncing so no same-boot after-anchor exists. The one-anchor
  path computes scan time = slot: zero delay, no flag, no cap used. "Telefonun saatini değiştirmek:
  Önlenir" is false on iOS, and the promised regression test only covers the reboot half.
- Honest side: automatic time corrections (NTP/NITZ after long offline periods) also move boottime, so
  exact comparison marks the same boot as a new one and pushes honest records into the unresolvable cap.
- Fix: on iOS compare boottime with a small tolerance only as a pre-filter, and time a record only when
  same-boot anchors exist on BOTH sides and agree in rate; one-sided iOS records are "belirlenemeyen"
  (cap applies). Android keeps BOOT_COUNT (not settable without root). Add "reboot + clock set + second
  reboot" to the regression test. Optionally test `kern.bootsessionuuid` on a device (unverified).

### B3. BLOCKER: under the doc's own rule the phone rejects every week-1 and add-drop scan
- Section 2: "QR öğrencinin derslerinden birine ait değilse ve telefondaki liste güncelse telefon
  reddeder. Liste güncel değilse kaydı bekletir." Section 7: "25 Ocak: pilot başlar. İlk haftanın
  kayıtları, sınıf listesi yüklendiğinde (29 Ocak-2 Şubat) eşleşir."
- In week 1 no roster exists, so a student who registered and synced that morning has a fresh list
  with zero courses: every scan is rejected, and the QR has rotated before any retry. The same happens
  to an add-drop student whose phone synced before the instructor re-uploaded the list. "Katılma
  isteği" is in "Sonra", so there is no other path in. The stated week-1 plan is false.
- The phone cannot verify the MAC anyway (it has no instructor key), so its rejection is UX only; the
  server already enforces "Başka bir dersin QR'ı: Önlenir" through enrolment.
- Fix: the phone never rejects on course membership. It stores the signed record and shows "Bu ders
  listende yok; liste yüklenince ya da hoca onaylayınca sayılır". Phone-side rejection only for a
  malformed or wrong-version QR. Test: empty list, fresh list, scan, later roster import attaches it.

### B4. BLOCKER: "Takvimi kod değil, bunlar belirliyor" contradicts the doc's own 1 Aralık freeze, and the freeze has no content or slip rule
- Tek bakışta: "Takvimi kod değil, bunlar belirliyor." Section 7: the security test in the 15 Aralık
  list requires "ana özellikler 1 Aralık'ta tamamlanıp dondurulmalı. Bu 9 hafta demek, tek kişi için
  sıkı bir süre." So code readiness is on the critical path, and it is the item the doc itself calls
  tight.
- "Ana özellikler" is not listed. Section 6 plus "Notlarda olmayan MVP eklemeleri" hold roughly 30
  deliverables (three roles, schedule with holidays/telafi/combined sections/blocks, roster import with
  diff and Turkish matching, offline start with per-device keys, anchor native module on two
  platforms, background task, flag table, review clusters, device-change flow with signed cancel,
  receipt QR verification, Md.35 and muaf states, reports, Excel/PDF, AKSIS page, term lock, retention,
  account deletion in app and web, accessibility). Without a named core, neither the security test
  scope nor a go/no-go on code can be judged on 15 Aralık, and there is no rule for a missed freeze.
- Fix: replace the sentence with "Takvimi ön koşullar ve 1 Aralık kod dondurması birlikte belirler".
  List the frozen core (C3-2's list is a start: register, bind, scan, sign, sync, verify, roster import,
  AKSIS page, audit log) and add to the gate: "1 Aralık'ta çekirdek dondurulmadıysa pilot Güz 2027".
  Ask BİDB for the test slot and its length in S14; two weeks includes remediation.

### SPEC-1. TestFlight build expires before the planned replacement
- Builds are testable for up to 90 days (Apple TestFlight overview); widely reported as counted from
  upload (not stated on that page). A build uploaded before 21 Aralık expires before about 21 Mart;
  the plan's new build is "~22 Mart". An expired TestFlight build cannot be opened: all iOS students
  lose scanning mid-term for one or more days.
- Fix: upload a fresh build at pilot start (about 20 Ocak) and the next one by 1 Nisan, or "her build
  60. günde yenilenir". Show the expiry date in the admin panel.

### SPEC-2. One-anchor tolerance is unbounded
- "Tek çapa varsa gecikme eşiğine, çapaya olan uzaklık başına 50 ppm eklenir." Computed: +4.3 s per
  day, +13 s at 3 days, +30 s at 7 days. A student who opens the app only offline and reboots before
  sync gets a 20-40 s forwarding window that is never flagged.
- Fix: above 24 h anchor distance the record is "belirlenemeyen" (cap applies). State the limit in Ek C.

### SPEC-3. Missing start record vs unknown start value is order dependent
- Flag table: "Başlatma kaydı gelmedi: planlı derste kayıtlar geçerlidir." Ek C: unknown start value
  goes to review. Records with value N2 are valid until the instructor outbox reports N1, then flip to
  review; with a lost instructor device they stay valid forever.
- Fix: classify start values at the end of the sync window (records stay "geçici" until then); a
  planned session with no start record at all asks the instructor once, as a cluster.

### SPEC-4. Flag effects and backup-code exemptions incomplete
- "Yedek kod oranı %5'i aştı" and "saat farkı 10 dakikayı aştı" rows state no effect on counting and
  no "KARAR BEKLİYOR" rule. A "yedek kod muaf" student in a 15-person class alone sets 6.7 %, flagging
  every session. A blind student cannot read a projected code either.
- Fix: both rows "kayıtlar sayılır, yalnız bilgi" (or not), stated. Exclude muaf students from the
  ratio. State that the instructor reads the code aloud or adds the student by hand.

### SPEC-5. Auto-accept order uses a time that does not exist
- "sıra okutma zamanına göredir" but unresolvable records have no scan time by definition; a late
  record with an earlier time also displaces an already accepted one after export.
- Fix: order by the MAC-protected QR slot; a record accepted before a provisional or final export is
  never displaced.

### SPEC-6. 3-day key horizon vs weekends
- Keys downloaded Friday may not cover a Monday class, and the one-day warning appears only while the
  panel is open, typically in the offline room.
- Fix: horizon = next 3 teaching days (or through each section's next session, max 4 days); warn at
  the last online contact before the gap.

### SPEC-7. Sync-window shortening only "son haftada"
- The deadline is per term and admin-entered; if it moves earlier, week-13 windows also overrun.
- Fix: window end = min(scan + 7 d, deadline - 1 d 23:59 Istanbul), floor 24 h, for every class.

### SPEC-8. Logout deletes the key while records are unsynced
- "çıkış yapınca anahtar silinir" (Section 3). Signed but unsent records must not be lost, and a
  same-device re-login becomes an in-person device change.
- Fix: block logout and account deletion while the outbox is non-empty (or sync first); say so.

### SPEC-9. New instructor devices get keys without approval
- Any instructor login (email code) gets K_dev for every section for 3 days. A leaked code gives a
  remote QR minter that the instructor never sees.
- Fix: device list in the panel, email on each new instructor device, cap at 3 devices.

### SPEC-10. Term lock vs accepted late records
- Valid records after the window are accepted; "Dönem sonunda kayıtlar kilitlenir." Order undefined.
- Fix: after the lock, a valid record is stored and shown to the instructor, and changes counts only
  through an audited correction.

### SPEC-11. Combined-section key and head count
- The QR carries a group id, but which daily key MACs it and whether head count is per group is not
  stated. Fix: group gets its own derived daily key; one head count per group.

### SPEC-12. Projection path in pilot rooms is unasked
- With the podium PC deferred, the method depends on the instructor's device reaching the projector
  offline (HDMI/USB-C input; wireless mirroring usually needs a network). Fix: add to S-questions or the
  first pilot week check list per room.

### SPEC-13. Base45 contains a space character
- Some scanners trim leading or trailing whitespace. Fix: fixed non-space prefix and suffix (for
  example "I1:" ... ":"), within the 61-character budget (47 + 4 = 51).

---

## Part 3. Contradictions with the fixed constraints

- Offline-first: B1 (the iOS fallback has no offline-trustworthy time). B2 weakens offline scan-time
  proof on iOS. The instructor PWA outbox syncs only when the panel is opened online (no Background
  Sync in Safari); acceptable because planned-session records do not wait on it, but SPEC-3 must fix the
  ordering. Everything else (offline start, device approval via outbox, held records) is consistent.
- No AKSIS: respected. Deadline is an admin field; roster in, AKSIS page out, both manual.
- Simplicity: B1's second branch (PWA records all unresolvable) would flood review; otherwise the flag
  table keeps the instructor's work bounded.

## What improved (for fairness)
All-start-values acceptance, durable start record, per-device keys with revocation, both-sided anchor
check, background anchors, signed receipt QR, muaf exemption, single cap rule, per-start-value
median, Base45, IDFV removed, scope cuts with reasons, flag table, KARAR BEKLİYOR.

Sources: Apple Developer Forums thread 125634 (developer.apple.com/forums/thread/125634), DTS reply on
kern.boottime; Apple TestFlight overview (developer.apple.com/help/app-store-connect/test-a-beta-version/
testflight-overview); İÜ general 2026-2027 calendar image and Hukuk calendar image in research/src;
arithmetic (float bug, Base45 length, 50 ppm growth) by script in this session. Inference, not
verified: TestFlight 90 days counted from upload; kern.bootsessionuuid availability on iOS; that
manual clock setting can hit the boottime tolerance (depends on the tolerance chosen).
