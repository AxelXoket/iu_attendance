# Verbatim sub-agent escalations (to be shown to the owner unedited)

## 02-backend
1. "Legal: confirm with IU's KVKK contact that Genelge 2019/12 applies and that no cloud outside Türkiye may hold real student data (pilot included). This decides 'self-host from day one' vs 'Frankfurt for the pilot'."
2. "Privacy: FCM/APNs device tokens and push payload content necessarily leave Türkiye; payload content policy needs sign-off."
3. "Hosting owner: whether BIDB will host a VM (and back it up) or the department rents a domestic VM. Handover plan depends on this answer."

## 10-scope-model
1. "Privacy/legal: the university is the data controller. Needs written sign-off, a privacy notice (aydınlatma metni), and a hosting choice. Foreign cloud and FCM/APNs require KVKK Art. 9 safeguards."
2. "Policy: do medical excuses remove an absence?"
3. "Policy: is the rate over held hours or planned hours, and per hour or per session? This decides who is barred from finals."
4. "Identity: Workspace OAuth approval and the student email format. Fallback is an email code sent to the institutional address, about one week more work."
5. "Distribution: permission to use the İÜ name and logo, and whether a personal or university developer account publishes the apps."

## 08-notify-report
- "(a) Who at IU is the data controller that must sign the KVKK standard contract for FCM/APNs and notify it within 5 business days."
- "(b) Whether to avoid Syncfusion because of the license."
- "(c) Policy choices for the faculty: hours or sessions, how health reports count, how late arrivals count."
- "(d) Get one real AKSİS roster export to confirm its format."

## 07-auth
1. "Who is the KVKK data controller, IU or the app operator. This sets the retention period (the 10-year plan applies only if IU treats our data as the official record) and whether a foreign email or SMS provider is allowed, which needs notice to KVKK within 5 business days under the 2024 Art. 9 change."
2. "Whether to allow the unverified personal-email fallback."
3. "The cost of biometric-bound keys: every fingerprint or Face ID change forces a rebind."
4. "Questions for IU IT (BIDB): current mail provider, allowlisting our sender, and whether the AKSIS roster export includes student email."

## 03-verification
1. "KVKK: decide whether a local OS biometric unlock counts as the university processing biometrics, plus the privacy notice and retention. This is a privacy call for you."
2. "Policy calls: the sync deadline, whether flagged records count as present by default, and how long a device rebind cooldown lasts."
3. "The grace window and back-row readability are inferences until a pilot measures legitimate scan lag, WhatsApp relay lag, QR reading at the back of a real 150-seat hall and BLE detection in a full hall."
4. "Check during implementation: which iOS monotonic clock keeps counting through sleep, App Attest counter semantics, and whether Android `BOOT_COUNT` is available."

## 09-distribution
- "Who owns the app and acts as KVKK data controller: the student or IU."
- "Whether anti-fraud requires device attestation (App Attest / Play Integrity). This decides whether a PWA can be the student client at all."
- "Apple fee-waiver eligibility for a Turkish university needs to be asked through Apple's contact form."

## 04-competitors
- "Was \"last time\" the İstanbul Tıp QR system or another pilot, and which failure dominated: login, server load, or no signal?"
- "Must results also be typed into AKSIS by hand before the Md.19 announcement deadline, or is an Excel export enough?"

## 01-framework
- "Next action: ask the owner whether the student developer already knows Dart or React, and whether a Mac is available, before locking in the stack."

## 06-iu-specifics ("Only the faculty or university can answer")
1. "A real AKSIS class-list export file."
2. "A screenshot of the AKSIS attendance screen: per week, total hours, or one flag?"
3. "How to identify repeat students who have no attendance obligation."
4. "Policy on medical-report absences, counting hours vs sessions, and the theory/lab split."
5. "Whether attendance is graded, and its weight."
6. "Whether the IT office (BİDB) will allow Google sign-in for `@ogr.iu.edu.tr`."
7. "Permission for the IU name and logo, who publishes, hosting or subdomain, and who is the data controller under the Turkish data protection law (KVKK)."
8. "Unit-specific calendar, holidays and midterm weeks."
9. "What went wrong with the earlier AKSIS-login attempt."

## 05-kvkk ("Questions for the university")
1. "Will IU formally own the system, who signs, and what role does the student have?"
2. "Does IU's student aydinlatma metni or VERBIS entry already cover this? Who is the KVKK contact person?"
3. "Can Bilgi Islem host the app and run the security test?"
4. "Is any transfer abroad acceptable, for example push notifications?"
5. "Is the app's record the official devam cizelgesi (10-year retention) or a helper record?"
6. "Will the Senate or faculty board adopt an attendance directive?"
7. "Where is student email hosted?"
8. "Who owns the developer accounts and the source code?"
9. "Who receives breach reports so the 72-hour deadline can be met?"
