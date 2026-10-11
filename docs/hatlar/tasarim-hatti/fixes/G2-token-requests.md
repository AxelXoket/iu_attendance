# G2 requests to other owners (round 2)

Written by G2 (owner of the F1b files) on 6 October 2026. Finding numbers are the 1-based indexes in fixes/G2.json;
decisions are decisions-r1.md (D) and decisions-r2.md (E). Each request says what to change, where, and why. G2 never
edited any of these files.

`G2-token-apply.js` applies the text requests T1 to T3 and T7 to a tokens.json (dry run by default, `--write` to save; it
refuses a field whose current text differs from the text the request was written against, so a hand edit is never
overwritten). The structural requests (T4 to T6) leave the shape to G1, who is restructuring the component tokens for E1.

How the page behaves until a request lands: every G2 section builds and passes with the current files. The usage map,
the never list and the token names come from tokens.json, so T1 to T3 change the page only when applied. The success
animation reads `var(--x-vurgu, var(--x-imza))` and the hero reads the `vurgu` step or the `imza` step, so T3 can land
at any time without breaking the build.

## For G1: tokens.json (text attached to tokens)

**T1. accentNever as prohibitions** (findings 5 and 22; E1 for item 11). Gece mavisi nerede now opens the list with
"Gece mavisi şuralarda hiç yoktur:", so every item must name a place, never state what is used there. Items 1, 6 and 7
read today as affirmative statements ("Sayfa zemini kırık beyaz", "yazılar beyaz", "açık gri"), which under that heading
say the opposite of what is meant. Proposed list (same order, same count):

1. `Zeminler: sayfa, kart, liste, alt sekme çubuğu, alt sayfa, diyalog, başlık çubuğu, seçili ve hover satır (hepsi nötr).`
2. `Açık adımlar (accent.1 ile accent.8): açık mavi zemin, mavi seçim, pastel ya da renkli kart.`
3. `Başlık ve gövde metni, varsayılan ikonlar (tek istisna panelin anahtar rakamı); kenarlık ve ayırıcılar (istisnalar: seçim işareti, işaretli kutu, Var ve Sunucuya ulaştı damgalarının çerçevesi).`
4. `İkincil, hayalet ve devre dışı düğmeler; bir ekranda ikinci bir dolu düğme.`
5. `QR gösterme ekranı: orada yalnız odak halkası görünür; QR'ın kendi renkleri qr.dark ve qr.light (bkz. Renk).`
6. `Kamera ekranı: çerçeve, yazı ve düğmeler beyaz.`
7. `Çevrimdışı şeridi ve bildirim zemini (nötr): çevrimdışı ne hata ne başarıdır.`
8. `Uyarı ve hata: uyarının mürekkebi mor, hatanınki kırmızı; gece mavisi hiçbir zaman uyarı anlamı taşımaz.`
9. `Var ve Sunucuya ulaştı dışındaki durumlar (ton 220 ile 290, kroma 0,04 ve üstü): Görevli mor, Belgeli düzeltme nötr.`
10. `Degrade, renkli gölge, süs şeridi, çizim, logo zemini.`
11. `Bir telefon düğmesinden (space.phone.dugme) yüksek dolu alan: tam ekran ya da büyük gece mavisi yüzey.`

Item 6 also drops "seçili yakınlaştırma beyaz dolgu": the scan mock no longer draws a 1x and 2x control (finding 26).

**T2. accentUsage** (findings 4, 13, 27, 28; E1, E9). Field by field:

- `[0].why`: "Ekranda yapılacak tek işi gösterir; üstünde yazı 12,70:1. Hover accent.10, basılı accent.12." ->
  "Ekranda yapılacak tek işi gösterir; üstündeki yazının oranı Kontrast bölümünde. Hover accent.10, basılı accent.12."
  (E1: the ratio is computed in #kontrast, the prose copy can drift.)
- `[1].why`: "Sahibin kilidi. Zeminde 6,09:1; yalnız :focus-visible ile görünür, fareyle tıklayana görünmez." ->
  "Kilit, 6 Ekim 2026. Ne zaman göründüğü Erişilebilirlik, Odak halkası; oranı Kontrast bölümünde." (E9; finding 27:
  the focus-visible rule has one home, #erisilebilirlik; E1 for the ratio.)
- `[2].why`: "Kilitli bağlantı rengi gövde metninden yalnız 2,42:1 ayrılır; ..." -> "Kilitli bağlantı rengi gövde
  metninden az ayrılır (Kontrast); bağlantıyı alt çizgi taşır, renk yalnız destekler. Panelde tıklama alanı hedef
  boyundadır (Erişilebilirlik, Hedef boyu)." (E1; E8 24 px inline link targets, drawn in Panel ekranı.)
- `[3].where`: append "; seçili liste ve alt sayfa satırındaki onay işareti" (finding 4). This list stays the one home of
  the selection-mark places (finding 13, see G1-B below).
- `[4].where`: "Onay kutusunun dolgusu (16 px), açık anahtarın rayı (40 x 24 px)" -> "Onay kutusunun dolgusu, açık
  anahtarın rayı ve topuzundaki onay işareti (ölçüleri: Bileşenler, Anatomi)" (finding 4; E1).
- `[5].where`: "... kafa sayısı girildikten sonra yoklama tablosundaki Var sayısı (plan.html, Kafa sayısı). Telefonda
  kalan süre birincil metin renginde (neutral.12)." -> "Panelde ekran başına tek sayı: yoklama tablosundaki Var sayısı.
  Telefonda kalan süre birincil metin renginde." (finding 28: the head-count timing is said once, in Panel ekranı with
  its plan link.) `[5].why`: "...; 42 px, kart yüzeyinde 12,70:1." -> "Panelde gözün ilk gideceği yer (yazı stili rakam:
  Tipografi; oranı Kontrast bölümünde)." (E1.)
- `[6].where`: append ", kod alanında doğru girilen rakamlar, başarı bildiriminin ikonu" (finding 4). `[6].why`:
  "Sahibin kuralı: ..." -> "Kilit, 6 Ekim 2026: başarı gece mavisi ailesinden, yeşil yok. Anlamı onay ikonu ve sözcük
  taşır." (E9.)
- `[7].where`: "Yoklama penceresinin kalan süre çubuğu (4 dp), liste yükleme ilerlemesi" -> drop "(4 dp)" (E1).

**T3. imza -> vurgu** (finding 23). `motion.duration`, `motion.easing` and `motion.spring` entries named `imza` become
`vurgu` (CSS: `--dur-vurgu`, `--ease-vurgu`, `--spring-vurgu`, `--spring-vurgu-dur`), and the prose that names them:
`motion.patterns[success].curve` and `.phone` ("ease.imza", "spring.imza"), `motion.durationNote` ("... uzun ve imza
..."). Other references G1 owns: tokens.css (the four variables), tools/sections/hareket.js (`imza: durOf('imza')` in
`curveDur`, and the lead's "Tek vurgu anı" stays the one home of the term, finding 27). G2's files already accept both
names; once the rename lands, the `imza` fallbacks in src/css/screens.css @order 3900 and tools/sections/ust.js can go.

**T7. coverageBudget.method** (E1): Gece mavisi nerede now prints this string as the one statement of the measuring
method (the share chart that repeated it is gone, finding 14). Write the decimal with a comma: "C en az 0.04" -> "C en az
0,04".

## For G1: structural token requests (shape left to G1)

**T4. Camera screen** (finding 2). The page now dims the camera with the existing scrim token (`--scrim-a`,
`alpha.scrim` 0.48) instead of base.css `--cam-scrim` (0.5), which no G2 rule reads any more (gencss.js still sets it
under .xray; both can go). Still typed in G2's CSS and needing a token and an anatomy row: frame 236 x 236, corner arms
28, corner line 3 (no line token is 3 px: add `shape.line.kamera` = 3, neutral.1, or move the corners to 2). The inverse
button and the camera icon buttons (base.css `.btn-inv`, `.dark .icon-btn`; G2's screens.css @order 3500 repeats the
pressed value) use white overlays 0.10 (hover) and 0.16 (pressed): proposed `alpha.onCameraHover` 0.10 and
`alpha.onCameraPressed` 0.16, read by both files. The status bar style 'light' on the camera screen is now stated in the
QR okut caption.

**T5. Warning meter** (finding 3). Durumlar now has the four-row table (level, ink token, icon, meter fill), generated
from `durumlar.uyari` and the status tokens. Still typed in screens.css @order 1300 and needing a component token and an
anatomy row: four segments 10 x 8, gap 2, empty segments neutral.6. The 40 percent white overlay is gone: level 4 fills
all four segments, so that rule never painted anything and was deleted; no overlay token is needed.

**T6. Scan pattern** (finding 9). The demo now moves each corner onto the QR's measured edges (4 px outside them) instead
of scaling the frame to 0.86. Proposed `motion.patterns[scan]`: properties "Çerçeve köşelerinin transform: translate;
yazının opacity"; enter "Köşeler QR'ın ölçülen kenarlarına oturur; çerçeve ve örtüsü yerinde kalır"; origin "QR'ın
kenarları"; phone "Köşelerin konumu withSpring(spring.hizli); yazı CSS geçişi dur.hizli"; reduced "Köşeler kaymaz,
yalnız yazı değişir". The page plays spring.hizli through `linear()` and falls back to dur.hizli with ease.standart.

## For G1: files other than tokens.json

- **G1-A. hareket.js, Süreler** (finding 1): label the Kullanım column "panel ve bu sayfa" and mark the patterns a spring
  drives on the phone "(telefonda yay)": Anahtar, sekme göstergesi, satır yer değişimi, QR köşeleri. Telefon ekranları now
  says "köşeler QR'ın kenarlarına spring.hizli ile oturur".
- **G1-B. bicim.js, Çizgiler, işaret row** (finding 13): "2 px accent.mark; yerleri Gece mavisi nerede, rol 4" instead of
  the copied place list.
- **G1-C. tools/lib/page.js, dialog dlg-del** (finding 31, E8): the plan wants what is deleted, what stays, why and for
  how long, per role. Telefon ekranları now draws the app screen "Hesabımı sil" with both roles; its lines are exported
  as `require('../sections/ekranlar').DELETION` (`{ ogrenci, hoca }`, fields silinir, kalir, neden, sure, sonra, sira).
  The panel dialog should print the same four lines for the instructor from that object (one source), with the queue
  line. Today it says only what is deleted and what stays.
- **G1-D. katmanlar.js, #scr-records** (findings 30, 38): the strip's "İnternet gelince kendiliğinden gönderilir.
  Uygulamayı kapatabilirsin." contradicts teknik.html#telefon-arka-plan and #telefon-gonderme-protokolu. Use the one
  string `require('../sections/ekranlar').OFFLINE_SEND` ("İnternet gelince, uygulamayı açtığında gönderilir."), delete
  "Uygulamayı kapatabilirsin.", keep "2 kayıt telefonda bekliyor". Draw the no-internet status bar on that screen:
  icons `signal_cellular_nodata` and `wifi_off` are now in icons.json.
- **G1-E. tools/measure.js and tools/interact.js** (new screen, removed toggle, new copy):
  - measure.js `SEL`: add `#scr-delete` (the account deletion screen). Measured by G2 with shot.js: 0 percent midnight
    blue at 390 and 1440 px, 0 banned, red 2,7 percent (the danger button), no overflow.
  - interact.js 168, 170 and 448: the 1x and 2x control is gone (finding 26: not a plan decision). Replace with: the
    corners move onto the QR's bounding box on "Okutmayı dene"; under reduced motion they stay and only the hint changes.
  - interact.js 113 and 214: the offline copy is now `OFFLINE_SEND` above.
  - interact.js 297 (`bars.length === 6`) becomes 7 once measure.js measures `#scr-delete`; the Röntgen SEL lists can add
    it with no pins.
  - interact.js 284 (`on.all >= 7`): still 7 (the usage-map phone is gone, the deletion screen is new).
  - interact.js 247: `/^53 öğrenci:/` becomes `new RegExp('^' + all + ' öğrenci:')` (finding 36: 17 rows, one per state
    plus two plain Var rows).
  - interact.js 258: a pending row's Son durum cell now carries the hidden text "son durum henüz yok" (the
    Erişilebilirlik rule for empty cells; G1 finding 9), so the empty marker to accept is that text, not ''.
  - interact.js 266 and 407 measure in viewport pixels, but the panel is now drawn at 1280 px and zoomed to its column
    (finding 8) and the phones sit three to a row at 1440 px, zoomed to 95 percent: divide by the zoom of the drawing
    (`el.getBoundingClientRect().width / el.offsetWidth` of the screen) before comparing with 16, 24 and 8.
    Round the result to one decimal: zoomed layout snaps to device pixels (8 px at 95 percent reads 7,99).
  - All of these, as a patch against the current interact.js: fixes/G2-interact.patch. Applied in a throwaway copy of the
    variant (g2work/verify, never the shared tree) the suite runs 128 checks, 128 pass (g2work/interact-patched2.log);
    with only the zoom and copy lines changed, 124 of 128 (g2work/interact-patched.log).
- **G1-F. renk.js and system.css, Anlam rolleri** (finding 17): the role groups stand in columns of 8, 10, 2 and 4 cards;
  flow them as one list. **Renk** (finding 11): define "mürekkep" once there, as the status foreground (att.<durum>.fg);
  the hero tile is now "Gece mavisi", and G2's sections use "mürekkep" only for status inks, apart from the name of the
  principle "Kâğıt ve mürekkep" (İlkeler, G3), which the hero and Gece mavisi nerede quote.
- **G1-G. base.js, Röntgen** (finding 7): G2's script moves the caption out of the screens of Telefon ekranları and Panel
  ekranı into their captions, and corrects pin offsets on zoomed screens (the panel, phones in a narrow column). The
  records screen in Katmanlar still gets the caption over its header; doing the move in base.js would cover every screen.

- **G1-H. ikonlar.js, ICON_LIST** (consequence of findings 20 and 44): "Kullanılan ikonlar" lists `more_vert`,
  `filter_list` and `flashlight_on`, which no screen draws any more (the row buttons, the dead "Süz" button and the torch
  are gone); `arrow_back` (the deletion screen's top bar) is drawn but not listed. Measured on the built page by comparing
  the grid with every `<use>` outside it (status bar icons and the page's own controls, such as `visibility` and
  `replay`, are not product icons).

## For G3: fragments

- **G3-A. ilkeler.html, #ilke-guven "Uygulamada"** (finding 30): replace "İnternet gelince kendiliğinden gönderilir.
  Uygulamayı kapatabilirsin." with "İnternet gelince, uygulamayı açtığında gönderilir."
- **G3-B. acik.html, new items** (findings 26, 32; E9 heading): `acik-giris-dugmesi` "Aşama 2'de Yoklamamı ver kamerayı
  mı açar?" (the flow card in Telefon ekranları links it automatically once the id exists); `acik-yakinlastirma`
  "Tarama ekranında elle 1x ve 2x seçimi olsun mu?" (R09-S23; the mock no longer draws it); `acik-ble-etiket`
  "Bluetooth yok ve konum yok hocanın listesinde etiket mi?" (a label is a column, teknik.html#kod-veri-modeli; the
  Durumlar card no longer shows them in the list); `acik-sorun-nedenleri` "Sorun bildir nedenleri neler?" (Katmanlar).
- **G3-C. acik.html item 18** (finding 16): cut "Türkiye'de telefonların çoğu Android"; Telefon ekranları keeps it.
- **G3-D. platform.html**: the camera screen uses expo-status-bar style 'light' (finding 2); "İÜ Yoklama QR'ı değilse" ->
  "yoklama QR'ı değilse" (finding 39); link label "Açık noktalar, Açılır parçalar" -> "Açık noktalar, Tarih kutusu"
  (finding 29).
- **G3-E. kutuphaneler.html** (findings 28, 33): CSS derleme row "teknik.html#panel-cati'deki hedef listesi"; the lead's
  restated Sürdürülebilirlik ilkeleri and the "Sayı geçişi" head-count timing become links.
- **G3-F. erisilebilirlik.html** (finding 29): the panel table has no "Diğer" row buttons any more; an accessible-name
  example can use the row checkbox "Seç: Ayşe Yıldız".
