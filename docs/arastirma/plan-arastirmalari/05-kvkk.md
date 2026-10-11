# 05 - KVKK (Law 6698) compliance design for the IU attendance app

Researched 2026-09-28/29. Read-only desk research. Not legal advice: every item marked **[LEGAL]** must be confirmed by the Istanbul University legal office (Hukuk Musavirligi) and the university KVKK contact person before launch.

Confidence tags: **[VERIFIED]** = read in the primary text (Resmi Gazete, mevzuat, kvkk.gov.tr, vendor terms) during this session. **[SECONDARY]** = law-firm / news source only. **[INFERENCE]** = my reasoning from verified text.

Local copies of every primary text used are in `scratchpad/research/src/kvkk/` (plus `src/rg_20250928-2.txt` for the IU regulation).

---

## 0. Headline findings

1. **The university (IU legal entity) is the data controller, not the instructor and not the student developer.** The KVKK Board has twice named "the University" as veri sorumlusu in attendance cases, including one where a faculty dean's office ran the system (2024/197). A student running the system on his own account would make himself a controller with no lawful basis and no lawful way to receive rosters. **[VERIFIED + INFERENCE]**
2. **Legal basis = Art. 5(2)(ç) "hukuki yukumluluk" (attendance duty in the IU regulation, Art. 19), NOT acik riza.** Asking consent when another basis exists is treated by the Kurum as misleading, and the Board's principle decision 2026/347 (RG 24.03.2026) says: only give an aydinlatma metni, do not present a consent text. **[VERIFIED]**
3. **"Raporlu" should not exist in the app.** The current IU regulation (RG 28.09.2025, no. 33031) gives NO medical exemption from the 70%/80% attendance rule; the only carve-outs are Art. 35 (official assignment to sports/culture events) and "ilgili mevzuat". A report status is health data (Art. 6). Record the student as absent; send medical reports through the official petition channel. **[VERIFIED + INFERENCE]**
4. **Do not host on Supabase/Firebase/AWS EU.** Two independent blockers: (a) KVKK Art. 9: no adequacy decision exists for any country (Kurum page: "henuz bir belirleme yapilmamistir"); a standard contract (SS-2) must be signed verbatim and notified to the Kurum within 5 business days, and consent-based and contract-based exceptions are unavailable to public bodies for public-law activities (Art. 9(7)); (b) **Presidential Circular 2019/12 item 3: public institutions' data may not be stored in cloud storage services other than the institution's own systems or domestic providers under institutional control.** Lowest-friction host: IU's own data center (Bilgi Islem), then TUBITAK ULAKBIM cloud. **[VERIFIED]**
5. **Push (FCM/APNs) is a cross-border transfer to Google/Apple (US).** Minimise it: MVP uses on-device local notifications only; if remote push is needed, send content-free "wake" pushes and get a legal-office decision on the SS-2 route. **[VERIFIED + INFERENCE]**
6. **Retention: the YOK/Devlet Arsivleri file plan code 302.07 "Devam/Devamsizlik" and "Devam Cizelgeleri" = 10 years, then destroy (10 D)**, counted from the year after the file closes. Whether the app's data is that official record is a university decision. **[VERIFIED]**
7. **Electronic attendance can be the official record only if IU adopts a rule for it** (precedent: Dokuz Eylul University Senate directive of 05.09.2025, no. 714/09, makes its e-attendance system DEYSIS the official method and uses system logs to decide objections). Without such a rule, the app is a helper and the official status is what the instructor enters into IU's "otomasyon sistemi" (IU reg. Art. 19(3)). **[VERIFIED]**

---

## 1. Who is the data controller (veri sorumlusu)?

### Law
- Art. 3(1)(i) of 6698: veri sorumlusu = the natural or legal person who determines purposes and means and is responsible for setting up and running the data filing system. Art. 3(1)(g) veri isleyen = processes on the controller's behalf under its authority. **[VERIFIED]** https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf
- Art. 12(2): controller is jointly responsible with the processor for security measures. **[VERIFIED]**
- Art. 18(4): if a violation happens inside a public institution, the Board notifies and the responsible civil servants face disciplinary proceedings. Art. 18(2) (as amended by 7499): the Art. 9(5) standard-contract-notification fine applies to "veri sorumlusu veya veri isleyen gercek kisiler ile ozel hukuk tuzel kisileri". **[VERIFIED]** A student acting in his own name is a "gercek kisi" and can be personally fined. **[INFERENCE, LEGAL]**

### Board decisions on attendance at universities
- **2024/197 (08.02.2024), published 2026-08-10**: fingerprint attendance at a university (Law and Medicine faculties). The Board treated "Veri sorumlusu" = the University even though the Hukuk Fakultesi Dekanligi set up the system. Held: biometric attendance has no valid Art. 6 condition; even with explicit consent it breaches proportionality (Art. 4(2)(ç)); "acik rizanin asiri miktarda veri toplanmasini mesrulastirmayacagi"; ordered deletion, cessation and "yoklama islemlerinin alternatif yollarla saglanmasi". https://www.kvkk.gov.tr/Icerik/8860/2024-197 **[VERIFIED]**
- **2021/1214 (02.12.2021)**: university training centre passed a paper attendance list with names + TC kimlik no around the room. Board accepted attendance processing under "hukuki yukumluluk" (and "bir hakkin tesisi") but ordered masking of the extra identifier and a compliant aydinlatma. https://www.kvkk.gov.tr/Icerik/7270/2021-1214 **[VERIFIED]**

### Scenarios
| Scenario | Controller | Consequence |
|---|---|---|
| University protocol (Rektorluk / faculty board approval), hosted on IU infrastructure, student works as developer | **IU** (legal entity) | Clean. Student is either a staff-like "authorised person" or a veri isleyen under a written processing agreement with confidentiality. Instructors act as IU officials, not as separate controllers. |
| Faculty member adopts the app personally, no university approval | De facto IU (per 2024/197 logic) but without IU's knowledge | Instructor exports roster to an unauthorised system: likely unlawful transfer (Art. 8), disciplinary exposure under Art. 18(4). |
| Student builds and operates independently on his own cloud account | **Student** (determines purposes and means) | Student has no Art. 5(2)(ç) legal obligation of his own, so he would need consent, which is not freely given when attendance is mandatory; instructors giving him rosters = transfer without basis; Art. 9 cross-border duties fall on him personally. **Do not do this.** **[INFERENCE, LEGAL]** |

### VERBIS
- Public institutions have had to register since 01.04.2019. https://www.kvkk.gov.tr/Icerik/5404/VerbisKayit **[VERIFIED]** IU is therefore already registered; the new activity must be added to IU's processing inventory and VERBIS entry.
- Veri Sorumlulari Sicili Yonetmeligi Art. 13(1): changes to registered info must be notified "yedi gun icerisinde". Art. 11(5): in public institutions the contact person (irtibat kisisi) is a "daire baskani veya ustu yonetici". Art. 5: registrants must keep a Kisisel Veri Isleme Envanteri. https://www.kvkk.gov.tr/Icerik/5442/VERI-SORUMLULARI-SICILI-HAKKINDA-YONETMELIK **[VERIFIED]**
- Any foreign transfer (e.g. FCM) must be declared in VERBIS (6698 Art. 16(3)(d) "Yabanci ulkelere aktarimi ongorulen kisisel veriler"). **[VERIFIED]**
- For completeness: a private individual under 50 employees and under 100M TL balance sheet is exempt from VERBIS (Board decision 2023/1154), but not from the rest of the law. **[SECONDARY]**

---

## 2. Legal basis (Art. 5) and aydinlatma (Art. 10)

### Basis per data element **[INFERENCE, LEGAL to confirm]**
| Data | Basis | Note |
|---|---|---|
| Name, student number, course enrolment (roster) | 5(2)(ç) hukuki yukumluluk: IU reg. Art. 19 attendance duty, 2547 s. Kanun Art. 14/44 as delegating norm | Board accepted this basis in 2021/1214. |
| Attendance timestamps, session records | 5(2)(ç) | Core purpose. |
| University e-mail | 5(2)(ç) / account security | Use for login only. |
| Device public key / app-generated device id | 5(2)(ç) as the means to make the record reliable, alternatively 5(2)(f) | Proportionality test from 2024/197 applies: use an app-generated keypair, never IMEI/serial/advertising ID. Whether a public body may lean on 5(2)(f) is untested in KVKK; prefer (ç). |
| Push token | 5(2)(ç)/(f) if push is kept | Also a foreign transfer (section 4). |
| Audit logs | 5(2)(ç) + Art. 12 security duty; 5(2)(e) for objections | |
| Excuse flag (only Art. 35 official assignment) | 5(2)(ç) | Never a medical reason (section 3). |

### Consent is the wrong tool
- Kurum guidance and principle decision **2026/347 (18.02.2026, RG 24.03.2026)**: aydinlatma and acik riza texts must be separate; when processing rests on another condition "sadece aydinlatma yukumlulugunun yerine getirilmesi, ilgili kisilere ayrica acik riza metni sunulmamasi". https://www.kvkk.gov.tr/Icerik/8710/... (full URL in source index) **[VERIFIED]**
- Kurum "Acik Riza" guidance: basing processing on consent when another condition exists is misleading and an abuse of right (Art. 4(2)(a) good faith). **[SECONDARY summary of kvkk.gov.tr pages 2037, 5412]**
- Consent from students for a mandatory process would not be "ozgur iradeyle" (Art. 3(1)(a)). **[INFERENCE]**

### Aydinlatma metni requirements
Aydinlatma Tebligi, RG 10.03.2018 no. 30356, Art. 4 and 5 **[VERIFIED]** https://www.resmigazete.gov.tr/eskiler/2018/03/20180310-5.htm
- Minimum content (Art. 4): controller identity; purposes; recipients and purpose of transfer; collection method and **legal basis (which Art. 5/6 condition, stated explicitly, Art. 5(1)(h))**; Art. 11 rights.
- Must be given at collection, not on request (5(1)(d)); burden of proof on controller (5(1)(e)) -> log which version each user acknowledged; no vague or general purposes (5(1)(g)); plain language (5(1)(ğ)); state automated collection method (5(1)(i)); must match VERBIS entries (5(1)(ç)); new aydinlatma if purpose changes (5(1)(b)).
- **Design:** show at first login (student and instructor), link from settings, version it, store acknowledgement timestamp (acknowledgement is not consent). Students whose data enters via roster upload before they register: IU's general student aydinlatma metni should cover this activity; confirm. **[LEGAL]**
- Instructors are data subjects too (name, e-mail, audit logs): separate staff aydinlatma. **[INFERENCE]**
- Data minimisation lesson from 2021/1214: never show classmates' student numbers or names on shared screens (projected QR pages, live check-in counters show counts only).

---

## 3. "Raporlu" status and health data (Art. 6)

- Art. 6(1): health data is special category. Art. 6(3) (as amended by 7499, in force 01.06.2024): processing is prohibited unless one of (a)-(g) applies; (b) requires the processing to be "kanunlarda acikca ongorulmesi" (a statute, not a regulation). Art. 6(4): Board-determined "yeterli onlemler" are mandatory (Board decision 2018/10). **[VERIFIED]**
- Board 2020/138 treated a sick report in a personnel file as health data. **[VERIFIED, summary]** A "raporlu" label reveals that a medical condition existed, so it is health data. **[INFERENCE]**
- **IU regulation gives no medical excuse from attendance.** Art. 19(1): "35 inci maddede belirtilen durumlar ile ilgili mevzuat hukumlerinde belirtilen durumlar haric ogrenciler ilk kez aldiklari derslerin en az % 70'ine ve varsa teorik ders disindaki her turlu uygulama calismasinin en az % 80'ine devam etmek zorundadir." Art. 35 covers only official assignment to "spor karsilasmalari, kultur ve sanat faaliyetleri ve yarismalar". Health reports appear only in Art. 29(1)(a) (kayit dondurma) and indirectly in Art. 24(2)(c) (mazeret sinavi via petition to the unit board). **[VERIFIED]** Dokuz Eylul's directive (Art. 5(4)) even says students under a health report "devamsiz sayilir". **[VERIFIED]**
- **Design decision:**
  - Remove "raporlu". A student with a report is simply absent; the 30% allowance absorbs illness.
  - Keep one generic flag `counted_as_present_by_decision` (or `excused`) usable only for Art. 35 assignments, set by an authorised staff role, with a reference number to the unit board decision / EBYS document, never a free-text reason and never an uploaded document.
  - Do not let students upload reports in the app. Reports go through the official dilekce channel.
  - If the faculty still wants a health-related status, that is a [LEGAL] stop: no statute clearly provides it (6(3)(b)) and consent is not freely given.
- Residual risk: if in practice the only excused students were medical cases, even a generic flag would leak health information. Restricting the flag to Art. 35 prevents this. **[INFERENCE]**
- Engelli ogrenciler (IU reg. Art. 36) accommodations are also health data: out of scope for the app.

---

## 4. Cross-border transfer, hosting, push

### Law after 7499 (RG 12.03.2024 no. 32487; Art. 9 in force 01.06.2024; old consent route co-applied until 01.09.2024 per Gecici Madde 3) **[VERIFIED]**
- Art. 9(1)-(2): adequacy decision route. **No adequacy decision has been issued** (kvkk.gov.tr "Yurt Disina Aktarim" page: "Bu konuda Kurul tarafindan henuz bir belirleme yapilmamistir"; secondary sources confirm as of July 2026). **[VERIFIED]**
- Art. 9(4): appropriate safeguards: (a) agreement between public bodies + Board permission, (b) BCR, (c) **Board standard contract**, (ç) written undertaking + Board permission.
- Art. 9(5): standard contract notified to the Kurum within **5 business days** of signature. Fine for non-notification: Art. 18(1)(d).
- Art. 9(6): incidental (arizi) exceptions only; **Art. 9(7): exceptions (a) consent, (b) and (c) contract do not apply to public institutions' public-law activities.** Attendance is a public-law activity of IU, so consent cannot rescue a transfer. **[VERIFIED + INFERENCE]**
- Regulation on transfers abroad, RG 10.07.2024 no. 32598 (https://www.resmigazete.gov.tr/eskiler/2024/07/20240710-2.htm) **[VERIFIED]**:
  - Art. 4(1)(e): transfer includes making data "baska bir suretle erisilebilir hale getirilmesi".
  - Art. 14(3): contract text used without any change; Turkish text prevails. 14(4): signed by the parties or authorised signatories. 14(5): notified within 5 business days physically, by KEP or other Board-set method; by the exporter unless agreed otherwise. 14(6): proof of signatory authority + **notarised translation of every foreign-language document**. 14(8): re-notify on change or termination.
  - Art. 16(1): "arizi" = irregular, one-off, not in the ordinary course: a hosting or push arrangement can never be arizi.
  - Art. 16(4): same bar on consent/contract exceptions for public bodies.
- Kurum guide "Kisisel Verilerin Yurt Disina Aktarilmasi Rehberi" (KVKK Yayinlari No. 48, Ocak 2025): remote access from a third country, "yalnizca kisisel verilerin bir ekranda goruntulenmesi yoluyla gerceklesse bile", and storage in a cloud abroad count as transfers; data sent directly by the data subject to a foreign company is not a transfer by the controller but still subject to KVKK. Four standard contract modules: SS-1 controller-controller, **SS-2 controller-processor**, SS-3 processor-processor, SS-4 processor-controller; notification may be made physically, by KEP or via a "Standart Sozlesme Bildirim Modulu". https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi **[VERIFIED]**

### Public-sector overlay: Presidential Circular 2019/12 (RG 06.07.2019 no. 30823) **[VERIFIED from the scanned RG page]**
- Item 1: critical data such as "nufus, saglik ve iletisim kayit bilgileri ile genetik ve biyometrik veriler" stored securely in the country.
- **Item 3: "Kamu kurum ve kuruluslarina ait veriler, kurumlarin kendi ozel sistemleri veya kurum kontrolundeki yerli hizmet saglayicilar haric bulut depolama hizmetlerinde saklanmayacaktir."**
- Item 12: vendors of software/hardware must give a written undertaking that there is no backdoor. Item 13: software must pass security testing before use.
- Implication: IU Bilgi Islem will very likely refuse a foreign SaaS backend regardless of KVKK paperwork. **[INFERENCE]** Source: https://www.resmigazete.gov.tr/eskiler/2019/07/20190706-10.pdf

### Vendor positions (checked 2026-09-28)
| Provider | Turkish standard contract offered publicly? | Evidence |
|---|---|---|
| Google Cloud | **Yes, optional "Turkish SCCs" if billing address in Turkey; customer must notify the Kurum within 5 business days** | Cloud Data Processing Addendum, Turkey section (https://cloud.google.com/terms/data-processing-addendum) **[VERIFIED]** |
| Firebase (incl. FCM) | Not mentioned | Firebase Data Processing and Security Terms page has no Turkey reference **[VERIFIED by text search]**. Whether Google Cloud's Turkish SCCs extend to Firebase services: unknown **[LEGAL/ask Google]** |
| AWS | Not in public DPA | AWS DPA PDF has no Turkey reference **[VERIFIED by text search]** |
| Supabase | Not in public DPA | supabase.com/legal/dpa has no Turkey reference **[VERIFIED by text search]** |
| Microsoft Azure | No public confirmation found | MS Q&A thread 2025-11-10 unanswered by Microsoft **[VERIFIED]** |
| Google Cloud Turkey region (with Turkcell) | Announced; region expected 2028-2029 | news sources **[SECONDARY]**: not usable for this project |

### Hosting options, lowest friction first **[INFERENCE, LEGAL/Bilgi Islem to confirm]**
1. **IU's own servers (Bilgi Islem Daire Baskanligi).** No transfer, satisfies 2019/12 item 3 ("kendi ozel sistemleri"), no processor contract needed beyond internal rules. Cost: VM request, ops ownership, security testing under item 13.
2. **TUBITAK ULAKBIM cloud** (ULAK Bulut, OpenStack; service agreement required; ULAKFKM gives state universities 20 TB S3 free, nationwide since Nov 2025). Domestic public provider; needs a processor clause in the service agreement; check that ULAKBIM counts as "kurum kontrolundeki yerli hizmet saglayici". https://veri.ulakbim.gov.tr/hizmet/15 , https://tubitak.gov.tr/tr/haber/tubitak-ulakbimden-universitelere-buyuk-hizmet-universitelerin-bilisim-altyapilari-ulakfkm-ile-daha-guvende **[VERIFIED]**
3. **Turkish commercial cloud** (data centre and support staff in Turkey). No Art. 9 transfer if nobody accesses from abroad (check vendor's foreign support access). Needs written processor contract (veri isleyen sozlesmesi) and 2019/12 fit. [LEGAL]
4. **EU hyperscalers (Supabase EU, Firebase, AWS Frankfurt).** Art. 9 transfer + 2019/12 conflict. Needs SS-2 signed by IU's authorised signatory, verbatim, notarised translations, KEP notification in 5 business days, VERBIS update in 7 days, and vendor willingness to sign. Not recommended.

Development-time rule: **no real student data in any foreign dev/test service** (Supabase free tier, Firebase emulators backed by cloud, GitHub issues with data). Use synthetic rosters. **[INFERENCE]**

### Push notifications (FCM / APNs) **[INFERENCE, LEGAL]**
- Sending a message through FCM or APNs means IU's server gives Google/Apple (US) a device token plus payload and timing: a transfer to a foreign processor under the guide's criteria. Tokens are personal data because IU links them to a student account.
- Options:
  - A. **MVP: no remote push.** Class reminders as local notifications scheduled on the device from the timetable the app already downloads from IU's server. No transfer at all.
  - B. **Content-free wake push**: payload carries no name, course or attendance data; the app fetches details from IU's server. Still a transfer of token + timing, needs a lawful route: SS-2 with Google (Firebase coverage unclear) and some route for Apple (APNs is the only iOS remote push channel; no public Turkish SCC found). Legal office decides.
  - C. Android-only alternatives (own WebSocket, UnifiedPush) do not solve iOS.
- Same logic covers **crash reporting and analytics SDKs** (Crashlytics, Sentry SaaS, Google Analytics): each is a transfer. Ship with none, or self-host (e.g. Sentry self-hosted on IU servers).
- E-mail (OTP, notifications) must go through IU's own mail system, not SendGrid/Mailgun/Resend. Also verify where IU's own student mail is hosted if it is a foreign SaaS. [LEGAL]
- Platform integrity APIs (Play Integrity, App Attest) send device data to Google/Apple; flag for the architecture decision. [INFERENCE]

---

## 5. Retention, deletion, anonymisation

### Official retention schedule **[VERIFIED]**
YOK "Yuksekogretim Ust Kuruluslari ve Yuksekogretim Kurumlari Saklama Sureli Standart Dosya Plani V.4" (2023, prepared with Devlet Arsivleri Baskanligi): https://s3-ankara.yok.gov.tr/yokmedia/9032aaa7-f482-4e73-a23b-979120171345.pdf
- **302 Ogrenci Ozluk Isleri > 07 Devam/Devamsizlik: 10 D** (sub-items 01 Devam/Devamsizlik, 02 Devam Cizelgeleri). 10 years, then "D- Imha".
- 302 > 04 Sinavlar > 07 Mazeret: 2 D; 16 Sinav Sonuclari, Not ve Basari Cizelgeleri: 10 D.
- Retention counts "isin sonuclandigi dosyasinin/klasorunun kapatildigi bir sonraki yildan itibaren".

### KVKK deletion rules **[VERIFIED]** https://www.kvkk.gov.tr/Icerik/5441/...
- 6698 Art. 7(1): delete/destroy/anonymise when the reason for processing ends; 7(2): other statutes' retention rules prevail.
- Silme Yonetmeligi (RG 28.10.2017 no. 30224): Art. 7(3) log all deletion operations, keep the log **at least 3 years**; Art. 11(2) periodic destruction interval set in the retention policy, **never more than 6 months**; Art. 12 data subject deletion request answered **within 30 days**, may be refused with reasons if processing conditions still exist.
- Registrants (IU) must have a "kisisel veri saklama ve imha politikasi"; this activity must be added to it.

### Proposed retention table **[INFERENCE, needs IU decision]**
| Data | If app IS the official record | If app is only a helper |
|---|---|---|
| Per-session present/absent per student | 10 years from year after term closes (302.07) | Until instructor has entered status into AKSIS/OBS and the objection window after grade publication has closed; then delete |
| Raw check-in events (nonce, signature, device key id, timestamp) | Keep until objection window closes, then reduce to present/absent | Same |
| Device public keys | Until device unbound or account closed | Same |
| Push tokens | Delete on logout, unbind, token rotation or 60-90 days inactivity | Same |
| Account (email, name, number) | While enrolled + retention of linked records; after that only as part of retained attendance records | Delete at graduation/withdrawal + short grace |
| Security/audit logs | Fixed period set by IU (e.g. 2 years); deletion-operation logs at least 3 years | Same |
| Rosters uploaded from Excel | Parse, store rows, delete the uploaded file immediately | Same |
- Build a scheduled destruction job that runs at least every 6 months (Art. 11(2)) and writes a deletion log.
- Anonymisation for statistics must meet Art. 3(1)(b) (not re-identifiable even when combined). Per-course aggregates of small classes can re-identify; publish only with minimum cell sizes. [INFERENCE]

---

## 6. Security measures and breach notification

### Required standard
- 6698 Art. 12(1): all necessary technical and administrative measures; 12(2) joint responsibility with processors; 12(3) audits; 12(5) breach notification "en kisa surede". **[VERIFIED]**
- **Kisisel Veri Guvenligi Rehberi (Teknik ve Idari Tedbirler), KVKK Yayinlari No. 72, Nisan 2025** https://kvkk.gov.tr/SharedFolderServer/CMSFiles/7512d0d4-f345-41cb-bc5b-8d5cf125e3a1.pdf **[VERIFIED]**
  - Technical (Table 4.1): yetki matrisi, yetki kontrol, erisim loglari, kullanici hesap yonetimi, ag guvenligi, uygulama guvenligi, sifreleme, sizma testi, saldiri tespit ve onleme, log kayitlari, veri maskeleme, veri kaybi onleme, yedekleme, guvenlik duvarlari, anti-virus, silme/yok etme/anonimlestirme, anahtar yonetimi.
  - Administrative (Table 4.2): processing inventory, policies (access, security, retention and destruction), controller-processor contracts, confidentiality undertakings, periodic/random audits, risk analysis, discipline rules, crisis communication, training, VERBIS.
  - Processor contract (2.5): written; act only on instructions; indefinite confidentiality; notify breaches immediately; list data categories; controller may audit.
  - Cloud (3.4): encrypt at rest and in transit, separate keys per cloud service, two-factor for remote access, destroy all key copies at end of service.
  - Backups (3.6): only sysadmin access, kept off-network.
- Board decision 2018/10 (31.01.2018) "yeterli onlemler" for special category data (only relevant if health data slips in). https://www.kvkk.gov.tr/Icerik/4110/2018-10 **[VERIFIED exists]**
- KVKK "Mobil Uygulamalarda Mahremiyetin Korunmasina Yonelik Tavsiyeler" (22.12.2023, updated 2025): determine controller/processor status first, privacy by design/default, encrypt data stored on device. **[SECONDARY]**
- Circular 2019/12 items 12-13: no-backdoor undertaking, security testing before production. **[VERIFIED]**

### App-level checklist **[INFERENCE]**
Role-based access (student / instructor / department admin / IU KVKK officer); instructors see only their own courses; append-only audit log of every attendance change with actor and reason; TLS everywhere; encryption at rest; device private keys in Android Keystore / iOS Secure Enclave; no personal data in logs or push payloads; admin 2FA; pen test before go-live; backups on IU network; separation of dev and prod data; the student developer's production access limited and logged, ending when the student graduates.

### Breach notification
- Board decision **2019/10 (24.01.2019)**: notify the Board "gecikmeksizin ve en gec 72 saat icinde" from learning of the breach; notify affected persons within a reasonable time (directly, else website); keep a breach response plan; record every breach and measures; processors must tell the controller without delay. https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi **[VERIFIED]**
- Board decision 2025/2451 (25.12.2025): published breach notices stay on the Kurum site at most 60 days, removed earlier once affected persons are notified. **[SECONDARY]**
- **Design:** the processing agreement / protocol must require the developer to report any incident to IU's KVKK contact within hours, not days, so IU can meet 72 hours. [INFERENCE]

### Fines
2026 amounts (auto-revalued each 1 January): aydinlatma 85,437 to 1,709,200 TL; data security 256,357 to 17,092,242 TL. **[SECONDARY]** Inside a public institution the Art. 18(4) route is disciplinary action against officials. **[VERIFIED]**

---

## 7. App store requirements that overlap

### Apple (App Review Guidelines, last updated 08.06.2026) https://developer.apple.com/app-store/review/guidelines/ **[VERIFIED]**
- 5.1.1(i): privacy policy link in App Store Connect and inside the app; must list data collected, uses, third parties, **retention/deletion policy and how to request deletion**.
- 5.1.1(ii): consent for collection, but "Apps that collect data for a legitimate interest without consent by relying on the terms of the ... GDPR or similar statute must comply with all terms of that law": relying on KVKK legal obligation is compatible. OS permission prompts (camera for QR, Bluetooth) are separate from KVKK consent. [INFERENCE]
- 5.1.1(iii) data minimisation.
- **5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app."** Apple support page: delete the account record and associated data "that the developer isn't legally required to maintain"; deactivation alone is insufficient. https://developer.apple.com/support/offering-account-deletion-in-your-app/
- 5.1.1(ix): apps requiring sensitive user information "should be submitted by a legal entity ... not by an individual developer". Recommendation: publish under an **IU organisation developer account**, so the store seller matches the controller. [INFERENCE]
- App Privacy Details (nutrition label): must include SDK collection; relevant types: Name, Email Address, User ID, Device ID, possibly Other Diagnostic Data; all linked to the user; no tracking. https://developer.apple.com/app-store/app-privacy-details/

### Google Play **[VERIFIED]**
- Data safety form mandatory for every app on closed/open/production tracks; "collection" = transmitting off device including SDKs; service providers processing on your behalf are not "sharing"; "Device or other IDs" includes Firebase installation ID. https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion: in-app path **and** a web link where users can request deletion; may retain data "for legitimate reasons such as security, fraud prevention or regulatory compliance" if disclosed. https://support.google.com/googleplay/android-developer/answer/13327111
- Organisation developer account for IU: requires organisation verification (D-U-N-S) **[from memory, verify]**.

### Reconciling store deletion with KVKK retention **[INFERENCE]**
In-app "delete account" = delete credentials, device keys, push tokens, profile extras immediately; attendance records required under 302.07 / the IU regulation are retained and the deletion response says so (Silme Yonetmeligi Art. 12(c) allows reasoned refusal within 30 days). Put this in the privacy policy. The same flow answers Art. 11 requests.

---

## 8. IU attendance rules and whether e-attendance can be official

### Current regulation **[VERIFIED]**
- **"Istanbul Universitesi On Lisans ve Lisans Egitim ve Ogretim Yonetmeligi", RG 28.09.2025, no. 33031**, in force on publication, applies from the 2025-2026 academic year (Art. 41). It repealed the 21.09.2010 / 27706 regulation (Art. 40). Legal basis: 2547 s. Kanun Art. 14 and 44 (Art. 3). No amendment found after 28.09.2025 (Lexpera lists it as the latest). https://www.resmigazete.gov.tr/eskiler/2025/09/20250928-2.htm
  - Note: the name is "Egitim ve Ogretim Yonetmeligi", not "Egitim-Ogretim ve Sinav Yonetmeligi".
- **Art. 19 Devam zorunlulugu:**
  - (1) 70% of courses taken for the first time, 80% of every practical work other than theory, except Art. 35 cases and cases in other legislation.
  - (2) Medicine, Dentistry, Pharmacy and Nursing: clinical/practical attendance computed per department (anabilim dali).
  - (3) Students failing attendance are announced "otomasyon sistemi uzerinden" before final exams; they cannot sit the final and fail the course.
- Art. 20(5): no attendance requirement for courses repeated for reasons other than absence.
- Art. 35: time spent on official assignments (sport, culture, arts, competitions) not counted as absence.
- Art. 24(2)(c): mazeret sinavi by petition, decided by the unit board.
- Art. 29(1)(a): kayit dondurma for a documented health report.
- The regulation says nothing about how attendance is taken (no paper signature, no method) and does not name the instructor as the official record keeper.
- IU Acik ve Uzaktan Egitim Fakultesi (AUZEF) has its own regulation (RG 23.10.2018 no. 30574), Art. 17: attendance rules for its programs are set by the Faculty Board. Out of scope for the pilot. [VERIFIED]

### Is electronic attendance acceptable as the official record? **[INFERENCE, LEGAL]**
- Nothing in the IU regulation forbids electronic attendance, and nothing makes it official either. The only official artefact named is the automation-system announcement (Art. 19(3)).
- Precedent: **Dokuz Eylul University "Ders Devam Takibi Yonergesi"** (Senate 05.09.2025, 714/09), based on its education regulation: Art. 6(1) instructor responsible, attendance tracked via DEYSIS (electronic); 6(3) student's own declaration is the basis, proxy declarations trigger discipline; 6(4) paper signature fallback entered manually; 6(5) percentages computed automatically; Art. 7 objections within 3 business days decided using "sistemin gunluk log kayitlari" and wet-signed lists. https://ogrenci.deu.edu.tr/wp-content/uploads/2025/09/Ders_Devam_Takibi_Yonergesi-1.pdf
- **Recommendation:** pilot as a helper (instructor confirms and enters results into AKSIS/OBS). To make it official, IU Senate (or at least the faculty board for the pilot) adopts a directive modelled on DEU: method, fallback, instructor responsibility, objection procedure using audit logs, retention, KVKK roles. The tamper-evident audit log is what makes the record defensible in an objection.
- Equal access: students without a compatible phone need a fallback (instructor manual entry). [INFERENCE]

---

## 9. Decisions for the project (my recommendations)

1. Run only under a written IU protocol naming IU as veri sorumlusu; developer bound by a processing/confidentiality agreement.
2. Legal basis 5(2)(ç); aydinlatma metni only; no consent checkbox.
3. No "raporlu"; only an Art. 35 "counted as present" flag with a decision reference.
4. Host on IU Bilgi Islem servers (fallback ULAKBIM). No Supabase/Firebase/AWS for production data.
5. MVP without remote push, analytics or crash SaaS; e-mail via IU mail.
6. Retention per section 5 table; scheduled destruction job every <= 6 months with deletion log kept >= 3 years.
7. Device binding with app-generated keys only; no GPS, no biometrics, no hardware IDs (2024/197 proportionality).
8. Publish apps under an IU organisation developer account; in-app + web account deletion that retains legally required attendance records.
9. Pilot as helper; push for a senate directive if the university wants e-attendance to be official.

## 10. Questions for the university (legal office, KVKK contact, Bilgi Islem, faculty)

1. Will IU (Rektorluk) formally own the system as veri sorumlusu? Which unit signs the protocol, and what is the student developer's role (processor contract, confidentiality, access ending at graduation)?
2. Does IU's existing student aydinlatma metni and VERBIS inventory cover this activity, or must they be updated (7-day VERBIS change rule)? Who is IU's KVKK irtibat kisisi?
3. Confirm legal basis 5(2)(ç) for roster, attendance, device key and audit log; is 5(2)(f) acceptable for anything?
4. Confirm that no health-related excuse will be recorded, and who may set the Art. 35 flag.
5. Can Bilgi Islem host the backend (VM, DB, backups) and run the pre-production security test required by Circular 2019/12 item 13? If not, is ULAKBIM acceptable?
6. Is any foreign transfer acceptable at all (FCM/APNs push, crash reporting)? If yes, will IU sign SS-2 and notify the Kurum within 5 business days?
7. Retention: is the app's data the official "devam cizelgesi" (10 years under SSDP 302.07) or a helper record deleted after AKSIS entry and the objection window?
8. Will the faculty board or Senate adopt an attendance directive (DEU model) so that app logs count as evidence in objections?
9. Where is IU student e-mail hosted (foreign SaaS would itself be a transfer question)?
10. Can IU provide an organisation Apple/Google developer account, and who owns the source code and the store listings?
11. Breach process: who at IU receives incident reports so the 72-hour deadline can be met?

---

## Source index (all accessed 2026-09-28/29)
- 6698 s. KVKK consolidated: https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf
- Yurt disi aktarim yonetmeligi, RG 10.07.2024/32598: https://www.resmigazete.gov.tr/eskiler/2024/07/20240710-2.htm
- Yurt disi aktarim rehberi (Ocak 2025): https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi
- Yurt disi aktarim page (no adequacy decisions): https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim
- Standard contracts announcement: https://www.kvkk.gov.tr/Icerik/7938/Standart-Sozlesmeler-ve-Baglayici-Sirket-Kurallarina-Iliskin-Dokumanlar-Hakkinda-Kamuoyu-Duyurusu
- Aydinlatma Tebligi RG 10.03.2018/30356: https://www.resmigazete.gov.tr/eskiler/2018/03/20180310-5.htm
- Ilke karari 2026/347: https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu
- Board 2024/197: https://www.kvkk.gov.tr/Icerik/8860/2024-197
- Board 2021/1214: https://www.kvkk.gov.tr/Icerik/7270/2021-1214
- Board 2020/138: https://www.kvkk.gov.tr/Icerik/6887/2020-138
- Board 2019/10 breach: https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi
- Board 2018/10 special category measures: https://www.kvkk.gov.tr/Icerik/4110/2018-10
- Veri Sorumlulari Sicili Yonetmeligi: https://www.kvkk.gov.tr/Icerik/5442/VERI-SORUMLULARI-SICILI-HAKKINDA-YONETMELIK
- VERBIS for public bodies: https://www.kvkk.gov.tr/Icerik/5404/VerbisKayit
- Silme Yonetmeligi: https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK
- Veri Guvenligi Rehberi (Nisan 2025): https://kvkk.gov.tr/SharedFolderServer/CMSFiles/7512d0d4-f345-41cb-bc5b-8d5cf125e3a1.pdf
- Circular 2019/12, RG 06.07.2019/30823: https://www.resmigazete.gov.tr/eskiler/2019/07/20190706-10.pdf
- IU On Lisans ve Lisans Egitim ve Ogretim Yonetmeligi, RG 28.09.2025/33031: https://www.resmigazete.gov.tr/eskiler/2025/09/20250928-2.htm
- YOK Saklama Sureli Standart Dosya Plani V.4: https://s3-ankara.yok.gov.tr/yokmedia/9032aaa7-f482-4e73-a23b-979120171345.pdf
- DEU Ders Devam Takibi Yonergesi (05.09.2025): https://ogrenci.deu.edu.tr/wp-content/uploads/2025/09/Ders_Devam_Takibi_Yonergesi-1.pdf
- Google Cloud DPA (Turkish SCCs): https://cloud.google.com/terms/data-processing-addendum
- Firebase Data Processing Terms: https://firebase.google.com/terms/data-processing-terms
- AWS DPA: https://d1.awsstatic.com/legal/aws-dpa/aws-dpa.pdf
- Supabase DPA: https://supabase.com/legal/dpa
- ULAK Bulut: https://veri.ulakbim.gov.tr/hizmet/15 ; ULAKFKM (16.12.2025): https://tubitak.gov.tr/tr/haber/tubitak-ulakbimden-universitelere-buyuk-hizmet-universitelerin-bilisim-altyapilari-ulakfkm-ile-daha-guvende
- Apple Review Guidelines: https://developer.apple.com/app-store/review/guidelines/ ; account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/ ; privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469 ; account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Secondary: breach 60-day rule https://www.mondaq.com/turkey/data-protection/1734916/ ; 2026 fines https://www.mondaq.com/turkey/data-protection/1726256/ ; Google/Turkcell region https://www.datacenterdynamics.com/en/news/google-and-turkcell-team-up-for-cloud-region-and-data-center-in-t%C3%BCrkiye/ ; VERBIS threshold https://www.erdem-erdem.av.tr/bilgi-bankasi/verbis-kayit-yukumlulugune-iliskin-istisna-kriteri-degistirildi

## Not verified / open
- Whether Google's Turkish SCC option covers Firebase/FCM; whether Apple offers any Turkish SCC for APNs.
- Google Play D-U-N-S requirement for organisation accounts (from memory).
- Exact 2026 fine amounts (secondary only).
- IU's current student aydinlatma metni and KVKK contact (IU site not machine-readable in this session).
- Whether IU has any senate decision or directive on electronic attendance (none found by search).
