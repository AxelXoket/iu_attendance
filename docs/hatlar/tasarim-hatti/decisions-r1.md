# Cross-cutting decisions for fix round 1 (main session arbitration, 6 October 2026)

Five cold critics found 222 issues (37 HIGH). These decisions settle every issue that spans more than one section. Every fixer applies them in its own files, word for word where a string is given. Where a finding conflicts with a decision here, the decision wins.

D1. Phone bottom sheet: TrueSheet (native UISheetPresentationController on iOS, Material bottom sheet on Android) with corner radius 0. Its open and close motion is the system's own and follows the system's reduced-motion setting; our duration, curve and spring tokens do not drive it. Every section says exactly this. The web panel's side panel and dialogs use our tokens. The rule "exit shorter than enter" applies to the animations we draw.

D2. Phone motion drivers, one per pattern, stated in a "Telefon" column of the Etkileşim tablosu: color, opacity and press feedback use Reanimated's CSS-style transitions with a duration token and a cubic-bezier token; position and size changes we draw (tab indicator, toast, list item move, success scale) use withSpring with a named spring preset. No "ya da" anywhere. Press: scale 0.97 in 100 ms (mikro) with the standard curve, release with the same; hover (pointer devices only): 120 ms enter, 100 ms exit.

D3. Focus: the focus ring appears with a 100 ms (mikro) transition of outline-color and outline-offset; it is never delayed and under reduced motion it appears instantly. Panel sorting and filtering: the table body cross-fades in 120 ms; under reduced motion it changes instantly. Every interactive pattern has a duration, a curve or spring, and a reduced-motion rule (owner: "paneller butonlar her şey için").

D4. No circular controls drawn by us. Choice lists (for example the Sorun bildir reasons) are rows: the selected row shows a check mark and the 2 px selection bar (accent role "Seçim işareti"); no radio circles. Prefer sharp icons without circles where Material Symbols Sharp offers one (check instead of check_circle, close instead of cancel).

D5. No <meter> element anywhere: browsers paint it green and yellow. Rates and levels are drawn as plain bars (a div with role="meter", aria-valuenow, aria-valuemin, aria-valuemax and an aria-label) in neutral and ink colors.

D6. Terminology follows plan.html: "seviye" (not "düzey"), for example "Seviye 2/4", "Uyarı seviyeleri". Status, label and message strings exactly as brief.md section 4.

D7. Panel date input: the native <input type="date"> stays (teknik.html#panel-cati), and the chosen date is echoed right under it in Turkish ("6 Ekim 2026 Salı", Intl tr-TR), because the native control shows the browser's own format. The conflict between the native control and plan.html#hoca's Turkish format is an open point with this recommendation.

D8. The instructor never sees the record count before entering the head count (plan.html#kararlar-kafa-sayisi, plan.html#hoca): no live Var count on the instructor phone or on the panel during the lesson; counts appear after the head count is entered.

D9. Tokens: the document gets a "Tokenlar" section that prints the complete token file in W3C DTCG format (generated from tokens.json by a script: colors with OKLCH and hex, dimensions, durations, cubic-bezier curves, springs as a group of damping, stiffness, mass). The hero line says the page's values come from that file. Where the file will live in the repository is an open point for the implementation phase (teknik.html#kod has no place for it yet). Every color token, including danger hover and pressed and every status ink, shows OKLCH and hex.

D10. Libraries: the owner asked on 6 October 2026 that the design document name the libraries that build the design; tasarim.html holds the interface libraries (motion, gestures, sheets, styling, tokens, icons, fonts) and the main session will add a pointer to tasarim.html in plan.html and teknik.html. The Kütüphaneler section becomes compact: for each category the pick, the version to use, one sentence of reason, the second choice, and three measured numbers (last release date, weekly downloads, stars). The rejected candidates and their reasons move to the research file (L ids); the section says so in one sentence.

D11. Fonts: IBM Plex Sans and IBM Plex Mono everywhere. Panel: @fontsource-variable/ibm-plex-sans and @fontsource/ibm-plex-mono (static 400, 500, 600, 700). Phone: static TTF files of the IBM Plex release through the expo-font config plugin, with the exact file list, subset to Latin and Latin Extended with ligatures off. No Inter anywhere.

D12. Destructive actions must exist in the plan: there is no record deletion (raw records are evidence). Use "Hesabımı sil" or "Oturumu kapat" in demos instead of "Kaydı sil".

D13. Status meanings come from plan.html#gun-kayit-etiketleri and plan.html#kararlar-kayit-ve-makbuz; link, do not paraphrase loosely. Ret means the record reached the server, so the receipt QR does not retry it; the receipt path is for records that never arrived. Kendi beyanı exists only when no window duration is set. The offline success screen shows the exact string "Telefonda kayıtlı, gönderilmedi". "Bağlantı bekleniyor" is what the projector page shows instead of an old QR when no new code arrives (plan.html#asama23-nereden-gosterilir).

D14. QR rules are decided in plan.html#asama23: link them; keep only design detail (frame, label placement, motion) in tasarim.html.

D15. Icon Composer is macOS only and the plan has no Mac (plan.html#dagitim-hesap): the iOS icon is a single-layer 1024 px image through Expo's config; a layered icon is an open point for when a Mac is available.

D16. Length: each fact in one place. Remove repeated statements, filler and restated plan or teknik decisions; link instead. Keep every decision and every value.

D17. Language: plain Turkish, no U+2013 or U+2014, no hyphen between times ("10:00 ile 11:50"), "15 kelimeden kısa" for quotes, sentence case labels ("Ad soyad").
