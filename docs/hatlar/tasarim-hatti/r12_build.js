// Builds research/R12.json. Package numbers come from r12_pkgs.json (fetched by r12_pkgs.js), never retyped.
const fs = require('fs'), path = require('path');
const S = __dirname;
const d = require('./r12_pkgs.json');
const die = m => { throw new Error(m); };
const tag = (p, t = 'latest') => (d.npm[p] && d.npm[p].tags && d.npm[p].tags[t]) || die('no npm tag ' + p + ' ' + t);
const V = (p, t) => tag(p, t).v, A = (p, t) => tag(p, t).at;
const VA = (p, t) => `${V(p, t)} (${A(p, t)})`;
const peer = (p, k) => (d.npm[p].peer || {})[k] || die('no peer ' + p + ' ' + k);
const g = r => (d.gh[r] && !d.gh[r].status) ? d.gh[r] : die('gh ' + r);
const gh = r => { const x = g(r); return `GitHub: ${x.stars} yıldız, son commit ${x.lastCommit}, açık issue ve PR ${x.openIssuesAndPRs}`; };
const i30 = r => {
  const x = g(r).issues30d; if (!x) return '';
  const f = v => (typeof v === 'number' ? String(v) : 'ölçülemedi (arama API 403)');
  return `son 30 günde (${x.since} sonrası) açılan issue ${f(x.opened)}, kapanan issue ${f(x.closed)}`;
};
const B = k => d.expoSdk57.bundled[k] || die('not bundled ' + k);
const EXPO = d.expoSdk57.latest;
const EXPO_AT = d.expoSdk57.versions.find(v => v.startsWith(EXPO + '@')).split('@')[1];
const FETCH = d.fetched_at.slice(0, 10);
const D30 = g('software-mansion/react-native-reanimated').issues30d.since;

const sNpm = p => ({ url: d.npm[p].url, title: `${p} (npm registry metadata)`, publisher: 'npm', date: A(p) });
const sGh = r => ({ url: g(r).url, title: `${r} (GitHub REST API)`, publisher: 'GitHub', date: g(r).lastCommit });
const sSr = (r, k) => ({ url: `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${r} is:issue ${k}:>=${D30}`)}&per_page=1`, title: `${r} issues ${k} since ${D30} (GitHub search API)`, publisher: 'GitHub', date: FETCH });
const sB = { url: d.expoSdk57.bundledUrl, title: `bundledNativeModules.json (expo@${EXPO})`, publisher: 'Expo (unpkg)', date: EXPO_AT };
const W = (url, title, publisher, date = '') => ({ url, title, publisher, date });
const SRC = {
  sdk57: W('https://expo.dev/changelog/sdk-57.md', 'Expo SDK 57', 'Expo', '2026-06-30'),
  reaExpo: W('https://docs.expo.dev/versions/v57.0.0/sdk/reanimated.md', 'react-native-reanimated', 'Expo Documentation'),
  reaCompat: W('https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/', 'Compatibility', 'Software Mansion'),
  reaTiming: W('https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-timing-function/', 'transitionTimingFunction', 'Software Mansion'),
  reaA11y: W('https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/', 'Accessibility', 'Software Mansion'),
  reaSpring: W('https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/', 'withSpring', 'Software Mansion'),
  uni: W('https://www.unistyl.es/v3/start/introduction', 'Introduction', 'Unistyles'),
  dtcgF: W('https://www.designtokens.org/tr/2025.10/format/', 'Design Tokens Format Module 2025.10', 'Design Tokens Community Group (W3C)', '2025-10-28'),
  dtcgC: W('https://www.designtokens.org/tr/2025.10/color/', 'Design Tokens Color Module 2025.10', 'Design Tokens Community Group (W3C)', '2025-10-28'),
  sd: W('https://styledictionary.com/info/dtcg/', 'Design Tokens Community Group', 'Style Dictionary'),
  tz: W('https://terrazzo.app/docs/', 'Terrazzo', 'Terrazzo'),
  motion: W('https://motion.dev/docs/react-reduce-bundle-size', 'Reduce bundle size', 'Motion'),
  react193: W('https://react.dev/blog/2026/09/09/react-19-3', 'React 19.3', 'React', '2026-09-09'),
  vt: W('https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available', 'Same-document view transitions are now Baseline Newly available', 'web.dev', '2025-10-16'),
  baseRel: W('https://base-ui.com/react/overview/releases', 'Releases', 'Base UI'),
  shadcn: W('https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default', 'Base UI as the Default', 'shadcn/ui', '2026-07'),
  modals: W('https://docs.expo.dev/router/advanced/modals/', 'Modals', 'Expo Documentation'),
  expoUi: W('https://docs.expo.dev/versions/v57.0.0/sdk/ui.md', 'Expo UI', 'Expo Documentation'),
  font: W('https://docs.expo.dev/versions/v57.0.0/sdk/font.md', 'Font', 'Expo Documentation'),
  haptics: W('https://docs.expo.dev/versions/v57.0.0/sdk/haptics.md', 'Haptics', 'Expo Documentation'),
  tw: W('https://tailwindcss.com/docs/theme', 'Theme variables', 'Tailwind CSS'),
  webfont: W('https://web.dev/articles/font-best-practices', 'Best practices for fonts', 'web.dev'),
  vite: W('https://vite.dev/guide/features', 'Features', 'Vite'),
};
const rea = 'software-mansion/react-native-reanimated';
const reaR = i30(rea), reaX = g(rea).issues30d;
const reaHealth = reaX.closed > reaX.opened ? 'son 30 günde kapanan issue sayısı açılandan fazla' : 'son 30 günde açılan issue sayısı kapanandan az değil';

const F = [];
const f = (title, claim, evidence, implication, sources, confidence, lb) =>
  F.push({ id: 'R12-F' + String(F.length + 1).padStart(2, '0'), title, claim, evidence, implication, sources, confidence, load_bearing: !!lb });

// F01
f('Expo SDK 57 yerel kütüphane sürümlerini sabitliyor',
  'Expo SDK 57, React Native 0.86 ve React 19.2 ile geliyor; Reanimated, worklets, Gesture Handler, Skia, Lottie, react-native-screens ve @expo/ui gibi yerel paketlerin uyumlu sürümleri expo paketindeki bundledNativeModules.json dosyasında sabit.',
  `Expo SDK 57 duyurusu (30 Haziran 2026): React Native 0.85'ten 0.86'ya çıktı, React 19.2 SDK 56 ile aynı; react-native-reanimated 4.5'e, react-native-worklets 0.10'a, react-native-gesture-handler 2.32'ye yükseltildi. expo@${EXPO} (${EXPO_AT}) içindeki bundledNativeModules.json: react ${B('react')}, react-native ${B('react-native')}, react-native-reanimated ${B('react-native-reanimated')}, react-native-worklets ${B('react-native-worklets')}, react-native-gesture-handler ${B('react-native-gesture-handler')}, @shopify/react-native-skia ${B('@shopify/react-native-skia')}, lottie-react-native ${B('lottie-react-native')}, react-native-screens ${B('react-native-screens')}, expo-router ${B('expo-router')}, @expo/ui ${B('@expo/ui')}, expo-haptics ${B('expo-haptics')}, expo-font ${B('expo-font')}, react-native-svg ${B('react-native-svg')}. Expo belgesindeki kurulum komutu: npx expo install react-native-reanimated react-native-worklets; Babel eklentisi babel-preset-expo ile otomatik.`,
  'Telefondaki bütün yerel paketler npx expo install ile kurulmalı; package.json içine elle daha yeni sürüm yazmak SDK ile uyumsuzluk riski getirir. Tasarım sisteminin hareket ve bileşen katmanı bu sürümlerin API sine göre yazılmalı.',
  [SRC.sdk57, sB, SRC.reaExpo], 'yüksek', true);
// F02
f('SDK 57 ara sürümlerinde bellek ve açılış geriletmeleri kapatıldı',
  'SDK 57 nin ilk ara sürümlerinde react-native-worklets veya react-native-reanimated içe aktaran uygulamalarda bellek kullanımını çok artırabilen bir Hermes V1 geriletmesi vardı; expo@57.0.9 bunu kapattı, expo@57.0.17 ise React Native i 0.86.3 e yükseltti.',
  `Expo SDK 57 duyurusu: expo@57.0.9, react-native-worklets veya react-native-reanimated içe aktaran uygulamalarda "drastically increase memory usage" yapabilen Hermes V1 geriletmesini çözdü; expo@57.0.17 React Native i 0.86.3 e yükseltti ve geliştirme sırasındaki açılış süresi geriletmesini kapattı. npm sdk-57 etiketi şu an ${VA('expo', 'sdk-57')}.`,
  'Kullanıcıların büyük kısmı orta ve düşük segment Android telefon kullandığı için expo en az 57.0.17 olmalı. Animasyon kütüphanesinin bellek etkisi düşük segment bir Android cihazda ölçülmeli; bu ölçüm yapılmadan hareketli öğe sayısı artırılmamalı.',
  [SRC.sdk57, sNpm('expo')], 'orta', true);
// F03
f('Reanimated 4 yalnızca Yeni Mimari ile çalışıyor, sürüm eşleşmesi sıkı',
  'Reanimated 4 sadece React Native New Architecture ile çalışıyor ve her Reanimated sürümü belirli bir worklets ve React Native aralığına bağlı.',
  `Uyumluluk sayfası: "Reanimated 4 works only with the React Native New Architecture"; Paper (eski mimari) için Reanimated 3 öneriliyor ve "no longer actively maintained" deniyor. Tablo: 4.4.x için React Native 0.83-0.86 ve worklets 0.9.x, 0.10.x; 4.5.x için React Native 0.83-0.86 ve worklets 0.10-0.11.x; 4.6.x için React Native 0.83-0.87 ve worklets 0.12.x. npm de en yeni sürüm ${VA('react-native-reanimated')}, peer bağımlılıkları react-native "${peer('react-native-reanimated', 'react-native')}" ve react-native-worklets "${peer('react-native-reanimated', 'react-native-worklets')}". ${gh(rea)}; ${reaR}.`,
  `SDK 57 nin sabitlediği ${B('react-native-reanimated')} ve worklets ${B('react-native-worklets')} çifti kullanılmalı; daha yeni Reanimated sürümleri farklı bir worklets serisi istediği için SDK yükseltmesine kadar beklenmeli. Proje zaten Yeni Mimari üzerinde, engel yok. Depo bakımı aktif: ${reaHealth}.`,
  [SRC.reaCompat, sNpm('react-native-reanimated'), sGh(rea), sSr(rea, 'created'), sSr(rea, 'closed')], 'yüksek', true);
// F04
f('Reanimated CSS geçişleri cubic-bezier eğrisini doğrudan alıyor',
  'Reanimated 4 ün CSS tarzı geçiş API si web CSS teki zamanlama fonksiyonlarının karşılığını (hazır adlar, cubicBezier, linear, steps) Android, iOS ve web de destekliyor.',
  'transitionTimingFunction hazır değerleri: linear, ease (varsayılan), ease-in, ease-out, ease-in-out, step-start, step-end. Yardımcılar: cubicBezier(x1: number, y1: number, x2: number, y2: number), örnek cubicBezier(0.25, 0.1, 0.5, 2); linear(0, [0.25, \'75%\'], 1); steps(4, \'jump-end\'). Platform tablosu: Android, iOS ve Web destekleniyor. transitionProperty içindeki her özellik için ayrı bir zamanlama fonksiyonu dizisi verilebiliyor.',
  'Token dosyasındaki tek bir cubicBezier değeri panelde CSS cubic-bezier() olarak, telefonda Reanimated cubicBezier() olarak aynı eğriyi verir. Böylece iki platformda açılış, kapanış ve hover hissi aynı kalır ve eğri tek yerden değiştirilir.',
  [SRC.reaTiming], 'yüksek', true);
// F05
f('Reanimated telefondaki hareketi azalt ayarını varsayılan olarak uyguluyor',
  'Reanimated in bütün animasyonları varsayılan olarak cihazdaki hareketi azalt ayarına uyuyor; ayar açıkken animasyonlar bitiş değerine anında gidiyor, çıkış animasyonları hiç oynamıyor.',
  'Erişilebilirlik sayfası: değerler ReduceMotion.System, ReduceMotion.Always, ReduceMotion.Never; varsayılan ReduceMotion.System. Ayar açıkken withSpring ve withTiming "return the toValue immediately"; withDelay sonraki animasyonu hemen başlatıyor; entering, keyframe ve layout animasyonları bitiş noktasına anında ulaşıyor, exiting animasyonları ve shared transition lar atlanıyor. useReducedMotion kancası ayarın "when the app started" durumunu döndürüyor. Örnek: withTiming(0, { reduceMotion: ReduceMotion.System }).',
  'plan.html deki "uygulama telefon ayarlarını izler" kararıyla uyumlu: hareket azaltma için uygulama içi ayar gerekmez, varsayılan değiştirilmemeli. useReducedMotion uygulama açıkken yapılan ayar değişikliğini görmez. Çıkış animasyonu atlandığı için hiçbir bilgi yalnızca kapanış animasyonuyla anlatılmamalı.',
  [SRC.reaA11y], 'yüksek', true);
// F06
f('withSpring için iki ayrı ayar ailesi var: süre tabanlı ve fizik tabanlı',
  'Reanimated withSpring hem süre tabanlı (duration, dampingRatio) hem fizik tabanlı (stiffness, damping) ayar kabul ediyor; ikisi birlikte verilirse süre tabanlı olan geçerli oluyor.',
  'withSpring belgesi: fizik tabanlı damping varsayılan 120, stiffness varsayılan 900; süre tabanlı duration varsayılan 550, dampingRatio varsayılan 1; ortak alanlar mass 4, velocity 0, overshootClamping false, energyThreshold 6e-9, reduceMotion ReduceMotion.System, clamp undefined. Belge: stiffness ve damping, duration ve dampingRatio ile aynı anda kullanılamaz; birlikte verilirse duration ve dampingRatio öncelikli.',
  'Yay tokenları tek bir ailede tutulmalı. Süre tabanlı aile tasarımcının okuyabileceği iki sayı (süre ve sönüm oranı) olduğu için token dosyasına daha uygun. Buradaki sayılar yalnızca Reanimated varsayılanlarıdır, tasarım değeri değildir.',
  [SRC.reaSpring], 'yüksek', false);
// F07
const rngh = 'software-mansion/react-native-gesture-handler';
f('Gesture Handler ın güncel ana sürümü 3, Expo SDK 57 ise 2.x sabitliyor',
  'react-native-gesture-handler npm de 3.x serisinde, 2.x serisi legacy etiketiyle sürüyor; Expo SDK 57 ise 2.32 serisini sabitliyor.',
  `npm latest etiketi ${VA('react-native-gesture-handler')}, legacy etiketi ${VA('react-native-gesture-handler', 'legacy')}; Expo SDK 57 sabiti ${B('react-native-gesture-handler')}. ${gh(rngh)}; ${i30(rngh)}.`,
  'SDK 57 boyunca 2.32 serisi kullanılmalı; 3.x geçişi bir sonraki SDK yükseltmesiyle birlikte ele alınmalı. Sürükleyerek kapatma gibi jestler bu sürümün API sine göre yazılmalı.',
  [sNpm('react-native-gesture-handler'), sGh(rngh), sB, sSr(rngh, 'created'), sSr(rngh, 'closed')], 'yüksek', false);
// F08
f('Moti bakım almıyor',
  'Moti nin son sürümü Ocak 2025 te, son commit i Mart 2025 te; son 30 günde yeni issue bile açılmamış.',
  `npm latest ${VA('moti')}, peer react-native-reanimated "${peer('moti', 'react-native-reanimated')}". ${gh('nandorojo/moti')}; ${i30('nandorojo/moti')}.`,
  'Yeni bir projede bağımlılık olarak alınmamalı. Moti nin verdiği bildirimsel kullanımın büyük kısmını Reanimated 4 ün CSS tarzı geçişleri zaten veriyor (R12-F04).',
  [sNpm('moti'), sGh('nandorojo/moti'), sSr('nandorojo/moti', 'created')], 'yüksek', false);
// F09
f('@expo/ui menü ve sheet için yerel bileşenler veriyor',
  '@expo/ui, Jetpack Compose ve SwiftUI bileşenlerini React ten kullandırıyor; menü, bağlam menüsü ve alt sheet bileşenleri ile @gorhom/bottom-sheet ve @react-native-menu/menu ile uyumlu yedek bileşenler içeriyor.',
  `Expo UI belgesi (v57): "Expo UI is not another UI library. It brings Jetpack Compose and SwiftUI primitives to React Native"; bileşenler yerel karşılıklarıyla birebir eşleşiyor; Jetpack Compose, SwiftUI ve Android, iOS ile web de çalışan Universal grupları var. Listede Compose için DropdownMenu ve ModalBottomSheet, SwiftUI için BottomSheet, ContextMenu ve Menu var; "Drop-in replacements" bölümünde "A bottom sheet compatible with @gorhom/bottom-sheet" ve "A menu compatible with @react-native-menu/menu" yazıyor. Belgedeki örnek proje bağlantısı paketi "production-ready Expo UI package available in SDK 56 and later" diye tanımlıyor. SDK 57 sabiti ${B('@expo/ui')}, npm latest ${VA('@expo/ui')}.`,
  'Menüler ve basit sheet ler için üçüncü taraf paket gerekmeden yerel bileşen kullanılabilir. Bu bileşenler platformun kendi görünümünü (Material 3, SwiftUI) taşıdığı için köşeli tasarım diliyle örtüşmesi düşük segment bir Android cihazda prototiple denenmeli.',
  [SRC.expoUi, sB, sNpm('@expo/ui')], 'yüksek', false);
// F10
f('expo-router formSheet ile yerel alt sheet açılıyor, köşe yarıçapı ayarlanabiliyor',
  'Expo Router bir ekranı presentation: formSheet ile yerel sheet olarak açabiliyor; duraklar, başlangıç durağı, tutamak ve köşe yarıçapı seçenekle ayarlanıyor.',
  `Modals belgesi: presentation: 'formSheet'; sheetAllowedDetents ekran yüksekliğinin kesirleri, örnek [0.25, 0.5, 1], ya da 'fitToContents' ("you must provide explicit content sizing since flex: 1 is not supported"); sheetInitialDetentIndex varsayılan 0, en yüksek durak için 'last'; sheetGrabberVisible yalnız iOS; sheetCornerRadius piksel cinsinden köşe yuvarlaklığı; sheetLargestUndimmedDetentIndex. Android: "Maximum of 3 detents", native stack başlıkları ve iç içe navigator desteklenmiyor, deneysel unstable_sheetFooter var. Altyapı react-native-screens (SDK 57 sabiti ${B('react-native-screens')}).`,
  'Telefonda panel benzeri alt sayfalar yerel sheet olarak açılabilir; açılış ve kapanış hareketi platformun kendi animasyonudur, eğrisini biz belirlemeyiz. sheetCornerRadius köşe yarıçapı tokenına bağlanarak köşeli görünüm korunur. Android deki en fazla 3 durak ve başlıksız sheet sınırı ekran tasarımında baştan hesaba katılmalı.',
  [SRC.modals, sB], 'yüksek', true);
// F11
const gor = 'gorhom/react-native-bottom-sheet';
f('@gorhom/bottom-sheet Reanimated 4 ü kabul ediyor ama Mayıs 2026 dan beri commit almadı',
  '@gorhom/bottom-sheet 5 serisi peer aralığında Reanimated 4 ü kabul ediyor; son sürüm ve son commit aynı gün, Mayıs 2026.',
  `npm latest ${VA('@gorhom/bottom-sheet')}; peer react-native-reanimated "${peer('@gorhom/bottom-sheet', 'react-native-reanimated')}", react-native-gesture-handler "${peer('@gorhom/bottom-sheet', 'react-native-gesture-handler')}". ${gh(gor)}. Expo SDK 57 listesinde yok.`,
  'Eğrisi tamamen bizim tokenlarımızla çizilmesi gereken bir sheet gerekirse yedek seçenek olarak kalabilir; ilk tercih yerel sheet (R12-F10) ve @expo/ui (R12-F09) olmalı.',
  [sNpm('@gorhom/bottom-sheet'), sGh(gor), sB], 'yüksek', false);
// F12
f('zeego un son sürümü Mart 2025, üç sabit yerel pakete bağlı',
  'zeego nun son sürümü Mart 2025 te çıktı ve peer olarak üç yerel menü paketini tam sürümle sabitliyor.',
  `npm latest ${VA('zeego')}; peer @react-native-menu/menu "${peer('zeego', '@react-native-menu/menu')}", react-native-ios-context-menu "${peer('zeego', 'react-native-ios-context-menu')}", react-native-ios-utilities "${peer('zeego', 'react-native-ios-utilities')}". ${gh('nandorojo/zeego')}; ${i30('nandorojo/zeego')}.`,
  'Yerel menü için @expo/ui Menu ve ContextMenu SDK ile birlikte geldiği için zeego eklenmemeli.',
  [sNpm('zeego'), sGh('nandorojo/zeego'), sSr('nandorojo/zeego', 'closed')], 'yüksek', false);
// F13
const uni = 'jpudysz/react-native-unistyles';
f('Unistyles 3 temayı yeniden render olmadan uyguluyor, iki ek yerel bağımlılık istiyor',
  'Unistyles 3, StyleSheet API sini koruyup temaları C++ ve JSI üzerinden uyguluyor; Nitro Modules ve edge-to-edge paketlerini peer olarak istiyor.',
  `Unistyles belgesi: uygulama genelinde yeniden render olmadığını garanti ediyor, hook veya context kullanmadan yalnızca JSI bağlarıyla çalışıyor, C++ ile yazılmış platformlar arası bir ayrıştırıcı içeriyor ve altta Nitro Modules kullanıyor; StyleSheet leri tema ve platform değerlerine erişebilen hale getirdiğini söylüyor; kendi sayımı "9.5M+ downloads (1M+ every month)". npm latest ${VA('react-native-unistyles')}; peer react-native "${peer('react-native-unistyles', 'react-native')}", react-native-nitro-modules "${peer('react-native-unistyles', 'react-native-nitro-modules')}", react-native-edge-to-edge "${peer('react-native-unistyles', 'react-native-edge-to-edge')}", react-native-reanimated "${peer('react-native-unistyles', 'react-native-reanimated')}". ${gh(uni)}.`,
  'Koyu tema eklenirse temayı yeniden render olmadan değiştirmek için güçlü aday; ama şimdi tek açık tema varken iki ek yerel bağımlılık getiriyor. İlk sürümde StyleSheet ile başlamak ve tokenları ayrı modülde tutmak, StyleSheet API sini koruyan Unistyles e sonradan geçişi kolay tutar.',
  [SRC.uni, sNpm('react-native-unistyles'), sGh(uni)], 'orta', false);
// F14
f('NativeWind in kararlı sürümü hâlâ 4.x, v5 sürüm adayı aşamasında',
  'NativeWind in npm latest sürümü 4.x; Tailwind CSS v4 tabanlı v5 Ekim 2026 itibarıyla rc etiketinde.',
  `npm latest ${VA('nativewind')}, rc etiketi ${VA('nativewind', 'rc')}; latest sürümün peer bağımlılığı tailwindcss "${peer('nativewind', 'tailwindcss')}". Yardımcı paket react-native-css latest ${VA('react-native-css')}, rc ${VA('react-native-css', 'rc')}. ${gh('nativewind/nativewind')}.`,
  'Telefonda Tailwind sınıflarıyla stil, kararlı v5 çıkmadan rc yazılımına bağlanmak demek. Token kaynağı zaten DTCG olacağı için ayrıca bir sınıf diline gerek yok.',
  [sNpm('nativewind'), sNpm('react-native-css'), sGh('nativewind/nativewind')], 'yüksek', false);
// F15
f('Tamagui ana sürüm değiştiriyor, Restyle bir buçuk yıldır sürüm çıkarmadı',
  'Tamagui 2.x kararlı, 3.0 beta aşamasında; Shopify Restyle in son npm sürümü Mart 2025.',
  `tamagui npm latest ${VA('tamagui')}, beta ${VA('tamagui', 'beta')}; ${gh('tamagui/tamagui')}; ${i30('tamagui/tamagui')}. @shopify/restyle npm latest ${VA('@shopify/restyle')}; ${gh('Shopify/restyle')}.`,
  'Tamagui kendi bileşen takımı ve derleyicisiyle gelen tam bir çatı; bir yoklama uygulaması için gereğinden büyük ve önümüzde bir ana sürüm geçişi var. Restyle de commit sürse de yeni sürüm yok. İkisi de ilk tercih olmamalı.',
  [sNpm('tamagui'), sGh('tamagui/tamagui'), sSr('tamagui/tamagui', 'created'), sNpm('@shopify/restyle'), sGh('Shopify/restyle')], 'yüksek', false);
// F16
f('DTCG Format Modülü 2025.10 kararlı; süre, eğri ve geçiş tipleri var, yay tipi yok',
  'Design Tokens Format Module 2025.10, 28 Ekim 2025 te Final Community Group Report olarak yayımlandı ve kararlı kabul ediliyor; duration, cubicBezier, transition ve dimension tiplerini tanımlıyor ama yay (spring) tipi yok.',
  'Belge: "This specification is considered stable"; dosya uzantısı .tokens veya .tokens.json, ortam türü application/design-tokens+json. duration: value (sayı) ve unit, birim "ms" veya "s", örnek {"value": 100, "unit": "ms"}. cubicBezier: tam dört sayılık dizi [P1x, P1y, P2x, P2y], x değerleri [0, 1] aralığında, y değerleri herhangi bir gerçek sayı. transition bileşik tipi: duration, delay, timingFunction. dimension: value ve unit, birim "px" veya "rem". fontFamily tek dize veya dize dizisi; fontWeight 1-1000 arası sayı veya "bold" gibi hazır ad. Yay tipi tanımlı değil. $extensions için her araç üreticiye özel bir anahtar kullanmalı (önerilen biçim ters alan adı, örnek "org.example.toolname"). Takma ad sözdizimi {group.token}.',
  'Renk, süre, eğri, geçiş ve boyut tokenları standart biçimde tek dosyada tutulabilir. Yaylar standartta olmadığı için $extensions altında kendi anahtarımızla taşınmalı ve bunu yalnız telefon üreticisi okumalı.',
  [SRC.dtcgF, sGh('design-tokens/community-group')], 'yüksek', true);
// F17
f('DTCG renk modülü oklch yi destekliyor ve hex yedeği tanımlıyor',
  'Design Tokens Color Module 2025.10 renkleri renk uzayı, bileşenler, alfa ve isteğe bağlı hex yedeğiyle tanımlıyor; desteklenen 14 renk uzayından biri oklch.',
  'Desteklenen anahtarlar: "srgb", "srgb-linear", "hsl", "hwb", "lab", "lch", "oklab", "oklch", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020", "xyz-d65", "xyz-d50". oklch bileşen sırası L [0 - 1], C [0 - Infinity] (pratikte 0.5 i geçmez), H [0 - 360); her bileşen için "none" kullanılabilir. hex alanı "6 digit CSS hex color notation" biçiminde yedek değer. Örnek: {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.7016, 0.3225, 328.363], "alpha": 1, "hex": "#ff00ff"}}. Yayın tarihi 28 Ekim 2025, Final Community Group Report.',
  'Kırık beyaz, gri ve gece mavisi alt ton paleti token dosyasında OKLCH bileşenleriyle tutulabilir; hex alanı telefon ve eski tarayıcı için yedek olur. hex değerleri elle değil color.js ile hesaplanmalı.',
  [SRC.dtcgC], 'yüksek', true);
// F18
const sdr = 'style-dictionary/style-dictionary';
f('Style Dictionary 2025.10 biçimini henüz tam desteklemiyor',
  'Style Dictionary v4 ten beri DTCG biçimini destekliyor ama kendi belgesine göre 2025.10 sürümü için tam destek v5 içinde hâlâ yapım aşamasında.',
  `Style Dictionary DTCG sayfası: v4 ve sonrası "first-class support for the DTCG format" sunuyor, ancak "the latest format 2025.10 does not have full support yet in Style Dictionary. This is a work in progress in v5." npm latest ${VA('style-dictionary')}. ${gh(sdr)}; ${i30(sdr)}.`,
  'Renk tokenlarını 2025.10 renk nesnesi (colorSpace, components) biçiminde tutacağımız için Style Dictionary ile bu biçimin her ayrıntısının işlenmesi garanti değil; ilk seçenek olmamalı, en büyük topluluğa sahip ikinci seçenek olarak kalmalı.',
  [SRC.sd, sNpm('style-dictionary'), sGh(sdr), sSr(sdr, 'created'), sSr(sdr, 'closed')], 'yüksek', true);
// F19
const tzr = 'terrazzoapp/terrazzo';
f('Terrazzo DTCG odaklı, CSS ve JS/TS çıktısı ile doğrulama komutu veriyor',
  'Terrazzo DTCG token JSON undan CSS, Sass, JS/TS, Swift, Tailwind ve başka çıktılar üreten bir araç; token denetimi (lint) ve DTCG ye uygunluk kontrolü yapan bir check komutu var.',
  `Terrazzo belgesi: entegrasyonlar CSS, CSS-in-JS, Sass, JS/TS, Swift, Tailwind, Vanilla Extract ve Custom; "the full DTCG format" desteği ve "resolvers and other 2025.10 features coming in 2.0" ifadesi; check komutu bir token dosyasının DTCG spesifikasyonuna uyduğunu doğruluyor. React Native çıktısından ayrıca söz edilmiyor. npm @terrazzo/cli latest ${VA('@terrazzo/cli')} (2.0 serisi yayımlanmış). ${gh(tzr)}; ${i30(tzr)}.`,
  'Tek kaynaktan panel için CSS değişkenleri, telefon için TypeScript üretmeye uygun; check komutu commit öncesi kapıya konabilir. Topluluk küçük (yıldız sayısı Style Dictionary nin onda biri kadar), bu yüzden telefon çıktısı ilk denemede doğrulanmalı, gerekirse Custom eklentiyle tamamlanmalı.',
  [SRC.tz, sNpm('@terrazzo/cli'), sGh(tzr), sSr(tzr, 'created')], 'orta', true);
// F20
f('Tailwind v4 tokenları @theme ile CSS değişkeni yapıyor; Vite CSS Modules u kendisi destekliyor',
  'Tailwind CSS v4 te tema değişkenleri @theme yönergesiyle tanımlanan CSS değişkenleri; Vite ise .module.css ile biten her dosyayı ek paket olmadan CSS Modules olarak işliyor.',
  `Tailwind belgesi: theme variables "special CSS variables defined using the @theme directive that influence which utility classes exist in your project"; örnekte --color-mint-500 için oklch(...) değeri kullanılıyor; "Use @theme when you want a design token to map directly to a utility class, and use :root for defining regular CSS variables that shouldn't have corresponding utility classes". tailwindcss npm latest ${VA('tailwindcss')}; ${gh('tailwindlabs/tailwindcss')}. Vite belgesi: "Any CSS file ending with .module.css is considered a CSS modules file".`,
  'Panelde düz CSS değişkenleri ve CSS Modules ek bağımlılık olmadan çalışır; Tailwind seçilirse aynı tokenlar @theme altında yardımcı sınıflara dönüşür. Karar stil yazım tercihidir, token hattını değiştirmez.',
  [SRC.tw, sNpm('tailwindcss'), sGh('tailwindlabs/tailwindcss'), SRC.vite], 'yüksek', false);
// F21
f('React 19.3 ile <ViewTransition> kararlı oldu',
  'React 19.3 (9 Eylül 2026) View Transitions ve Fragment Refs i kararlı yaptı; <ViewTransition> öğelerin girişini, çıkışını, yer değiştirmesini ve boyut değişimini tarayıcının View Transition API si ile canlandırıyor.',
  `React blogu: animasyon yalnızca Transition olarak işaretlenen güncellemelerde çalışıyor (startTransition içindeki durum güncellemeleri, <Suspense> açılışları, useDeferredValue); işaretsiz güncellemeler animasyonsuz. Türler enter, exit, update, share; varsayılan davranış yumuşak çapraz geçiş (cross-fade). enter, exit, update, default propları CSS sınıf adı alıyor; addTransitionType ile nedenine göre farklı animasyon seçilebiliyor; onEnter, onExit, onShare, onUpdate olaylarıyla Web Animations API kullanılabiliyor. <ViewTransition> şu an yalnızca DOM da çalışıyor, React Native desteği üzerinde çalışılıyor. npm react latest ${VA('react')}.`,
  'Panelde sayfa geçişleri ve panel açılış kapanışları ayrı bir animasyon kütüphanesi olmadan CSS ile tanımlanabilir. Bunun için panelin React sürümü 19.3 e çıkarılmalı. Belgede reduced motion için ayrı bir not yok; prefers-reduced-motion kuralını kendi CSS imizde yazmalıyız.',
  [SRC.react193, sNpm('react')], 'yüksek', true);
// F22
f('Aynı belge içi View Transitions Ekim 2025 ten beri Baseline',
  'Firefox 144 ile aynı belge içi view transition lar üç büyük tarayıcı motorunda da çalışır hale geldi ve 14 Ekim 2025 itibarıyla Baseline Newly available oldu.',
  'web.dev (16 Ekim 2025): document.startViewTransition(updateCallback) ve view-transition-name ile aynı belge içi geçişler, view-transition-class, view-transition-name: match-element ve :active-view-transition seçicisi Firefox 144 ile Baseline Newly available; tarih 14 Ekim 2025. Geçiş türleri kullanılıyorsa transitionHelper ile kademeli iyileştirme öneriliyor.',
  'Panelin hedef tarayıcıları güncel ise ViewTransition doğrudan kullanılabilir; eski tarayıcıda geçiş olmadan ekran yine değişir, işlev kaybı olmaz. Fakültedeki tarayıcı sürümleri doğrulanmalı.',
  [SRC.vt], 'yüksek', false);
// F23
f('Motion 14 in tam bileşeni 34kb, LazyMotion ile ilk yük yaklaşık 4.6kb',
  'Motion (eski Framer Motion) React için farklı boyutlarda giriş noktaları sunuyor; tam motion bileşeni küçültülemiyor.',
  `Motion belgesi (gzip, küçültülmüş): tam motion bileşeni 34kb; m bileşeni ve LazyMotion yaklaşık 4.6kb; domAnimation özellik paketi +15kb; domMax +25kb; useAnimate mini (yalnız WAAPI) 2.3kb; useAnimate hybrid 17kb. Belge 34kb lık bileşenin bildirimsel API yüzünden tree-shake ile küçülemediğini söylüyor. npm motion latest ${VA('motion')}; ${gh('motiondivision/motion')}.`,
  'Panelin hover, basma ve aç kapa hareketleri CSS ile çözülebildiği için Motion zorunlu değil. Sürükleme gibi jest tabanlı ya da yay gerektiren bir etkileşim çıkarsa m ve LazyMotion ile eklenmeli, tam motion bileşeni kullanılmamalı.',
  [SRC.motion, sNpm('motion'), sGh('motiondivision/motion')], 'yüksek', false);
// F24
const bui = 'mui/base-ui';
f('Base UI 1.0 Aralık 2025 te kararlı oldu, shadcn/ui Temmuz 2026 da varsayılanı Base UI yaptı',
  'Base UI biçimsiz (unstyled) erişilebilir React bileşenleri sunuyor; 11 Aralık 2025 te 1.0 kararlı sürüme ulaştı, o tarihten beri düzenli sürüm çıkarıyor ve shadcn/ui yeni projelerde varsayılan olarak onu kullanıyor.',
  `Base UI sürüm notları: v1.0.0 11 Aralık 2025, "Stable", 35 unstyled UI components, yeni npm paketi @base-ui/react; son sürümler v1.8.0 (4 Eylül 2026), v1.7.0 (4 Ağustos 2026), v1.6.0 (18 Haziran 2026). Eski paket ${'@base-ui-components/react'} npm de "${d.npm['@base-ui-components/react'].deprecated}" uyarısıyla kullanımdan kaldırılmış. npm @base-ui/react latest ${VA('@base-ui/react')}. ${gh(bui)}; ${i30(bui)}. shadcn/ui Temmuz 2026: "Base UI is the default component library in shadcn/ui"; gerekçeler "It's at 1.6.0 with 6M+ weekly downloads" ve "Projects created on shadcn/create now pick Base UI over Radix 2 to 1"; Radix için "Radix is not being deprecated", Radix ile kurmak için pnpm dlx shadcn init -b radix.`,
  'Panelin menü, diyalog, açılır liste ve sekme gibi bileşenleri için stil içermeyen, köşeleri tamamen bizim çizdiğimiz bir temel gerekiyor; Base UI hem bakım hem benimsenme sinyalleriyle ilk aday. Peer listesinde date-fns ve @date-fns/tz de görünüyor; isteğe bağlı olup olmadığı kurulumda kontrol edilmeli.',
  [SRC.baseRel, sNpm('@base-ui/react'), sNpm('@base-ui-components/react'), sGh(bui), sSr(bui, 'created'), sSr(bui, 'closed'), SRC.shadcn], 'yüksek', true);
// F25
f('Radix ve React Aria Components bakımda; Radix in açık issue sayısı yüksek',
  'Radix Primitives ve React Aria Components 2026 da sürüm çıkarmaya devam ediyor; ikisi de biçimsiz bileşen veriyor.',
  `radix-ui npm latest ${VA('radix-ui')}; ${gh('radix-ui/primitives')}. react-aria-components npm latest ${VA('react-aria-components')}; ${gh('adobe/react-spectrum')} (monorepo, sayılar tüm React Spectrum için). Peer aralıkları: radix-ui react "${peer('radix-ui', 'react')}", react-aria-components react "${peer('react-aria-components', 'react')}".`,
  'React Aria Components erişilebilirlik odaklı ikinci aday olarak kalmalı. Radix desteklenmeye devam etse de yeni bir projede Base UI nin önüne geçmesi için neden yok.',
  [sNpm('radix-ui'), sGh('radix-ui/primitives'), sNpm('react-aria-components'), sGh('adobe/react-spectrum')], 'yüksek', false);
// F26
f('Başarı animasyonu için Lottie, Rive ve Skia nın durumu',
  'Lottie Expo SDK 57 listesinde sabitli ve aktif; Rive in yeni React Native çalışma zamanı 0.x sürümünde ve Expo listesinde yok; Skia listede sabitli.',
  `lottie-react-native: npm latest ${VA('lottie-react-native')}, next ${VA('lottie-react-native', 'next')}, Expo SDK 57 sabiti ${B('lottie-react-native')}; latest sürümün peer bağımlılıkları react "${peer('lottie-react-native', 'react')}", react-native "${peer('lottie-react-native', 'react-native')}"; ${gh('lottie-react-native/lottie-react-native')}. rive-react-native: npm latest ${VA('rive-react-native')}; ${gh('rive-app/rive-react-native')}. @rive-app/react-native: npm latest ${VA('@rive-app/react-native')}, peer react-native-nitro-modules "${peer('@rive-app/react-native', 'react-native-nitro-modules')}"; ${gh('rive-app/rive-nitro-react-native')}. @shopify/react-native-skia: Expo sabiti ${B('@shopify/react-native-skia')}, npm latest ${VA('@shopify/react-native-skia')}; ${gh('Shopify/react-native-skia')}. Expo listesinde rive-react-native yok; react-native-svg ${B('react-native-svg')} var.`,
  'Yoklama başarılı ekranındaki tik işareti gibi kısa bir hareket için ek çalışma zamanı gerekmiyor: react-native-svg ve Reanimated yeterli ve hareketi azalt ayarına kendiliğinden uyuyor (R12-F05). Tasarımcı elinden çıkmış karmaşık bir animasyon istenirse Lottie ikinci seçenek; Rive in yeni çalışma zamanı 0.x olduğu için şimdilik dışarıda.',
  [sNpm('lottie-react-native'), sGh('lottie-react-native/lottie-react-native'), sNpm('rive-react-native'), sGh('rive-app/rive-react-native'), sNpm('@rive-app/react-native'), sGh('rive-app/rive-nitro-react-native'), sNpm('@shopify/react-native-skia'), sGh('Shopify/react-native-skia'), sB], 'yüksek', false);
// F27
f('expo-haptics: Android de Vibrator yerine performAndroidHapticsAsync öneriliyor',
  'expo-haptics Android de Vibrator servisini, iOS ta Taptic Engine i kullanıyor; Android için belgenin önerisi Vibrator tabanlı çağrılar yerine performAndroidHapticsAsync.',
  `Haptics belgesi (v57): Android de "Vibrator system service", iOS 10+ cihazlarda Taptic Engine, web de Web Vibration API. iOS ta Low Power Mode açıksa veya kullanıcı Taptic Engine i ayarlardan kapattıysa titreşim olmuyor. Android de VIBRATE izni otomatik ekleniyor. Not: "Android's Vibrator API is not recommended for implementing haptics feedback"; performAndroidHapticsAsync "is similar to iOS haptic feedback and does not require VIBRATE permission". AndroidHaptics.Confirm = "confirm": "A haptic effect to signal the confirmation or successful completion of a user interaction". SDK 57 sabiti ${B('expo-haptics')}.`,
  'Yoklama kaydı alındığında dokunsal onay Android de AndroidHaptics.Confirm ile, iOS ta notificationAsync ile verilmeli. Titreşim kapalı olabileceği için onay her zaman ekranda da görünmeli; dokunsal geri bildirim tek başına bilgi taşımamalı.',
  [SRC.haptics, sB], 'yüksek', false);
// F28
f('Expo da fontlar config plugin ile derleme anında gömülmeli',
  'expo-font belgesi Android ve iOS için config plugin ile derleme anında gömmeyi öneriyor; useFonts ve loadAsync yalnızca plugin kullanılamıyorsa.',
  `Font belgesi (v57): iki yol var, "using the expo-font config plugin (recommended for Android and iOS)" ve çalışma anında yükleme; plugin ile gömme useFonts veya loadAsync tan daha verimli. Android de fonts dizisinde fontFamily ve fontDefinitions (path, weight; örnek weight 800) ile tek aile altında ağırlıklar tanımlanabiliyor. Android de dosya adı aile adı oluyor; iOS ta aile adı her zaman font dosyasının kendisinden alınıyor. Örnek kodda "Use useFonts only if you can't use the config plugin." notu var. SDK 57 sabiti ${B('expo-font')}.`,
  'Yazı tipi açılışta yüklenmeyi beklemez, metin ilk karede doğru fontla çizilir. Android de ağırlıkları fontDefinitions ile tek aile altında tanımlamak, stil kodunda fontWeight kullanımını iOS ile aynı tutar.',
  [SRC.font, sB], 'yüksek', false);
// F29
f('Web fontları: yalnızca WOFF2 ve bilinçli bir font-display seçimi',
  'web.dev font rehberi bugün yalnızca WOFF2 kullanılmasını ve font-display değerinin amaca göre seçilmesini öneriyor.',
  `web.dev: "Given the browser support, experts now recommend only using WOFF2"; WOFF2 Brotli ile WOFF tan "30% better" sıkıştırıyor. font-display için beş değer var; "Performance: Use font-display: optional", "Quickly display text and still use a web-font: Use font-display: swap". Kendi sunucumuzdan font vermek için Fontsource paketleri npm üzerinden sürümlü geliyor: örnek @fontsource-variable/inter ${VA('@fontsource-variable/inter')}; ${gh('fontsource/fontsource')}.`,
  'Panelde fontlar WOFF2 olarak kendi sunucumuzdan verilmeli. Projeksiyon sayfası ve panel metni hemen göstermeli, bu yüzden swap uygun; düzen kayması istenmiyorsa optional seçilebilir. Seçilen fontun Türkçe harfleri (ğ, ş, ı, İ) içeren alt kümesi mutlaka yüklenmeli.',
  [SRC.webfont, sNpm('@fontsource-variable/inter'), sGh('fontsource/fontsource')], 'yüksek', false);

const K = [];
const k = (topic, recommendation, values, reasons, alternatives, based_on) =>
  K.push({ id: 'R12-K' + String(K.length + 1).padStart(2, '0'), topic, recommendation, values, reasons, alternatives, based_on });
const v = (name, value, note = '') => ({ name, value, note });
const alt = (option, why_not) => ({ option, why_not });

k('Telefon: sürüm hattı',
  `expo en az 57.0.17 olmalı (şu an ${EXPO}); bütün yerel paketler npx expo install ile, SDK 57 nin sabitlediği sürümlerde kurulmalı.`,
  [v('expo', `>=57.0.17, şu an ${EXPO} (${EXPO_AT})`, 'bellek ve açılış geriletmeleri bu ara sürümlerde kapandı'),
   v('react-native', B('react-native')), v('react', B('react')),
   v('react-native-reanimated', B('react-native-reanimated')), v('react-native-worklets', B('react-native-worklets')),
   v('react-native-gesture-handler', B('react-native-gesture-handler'), '3.x geçişi SDK yükseltmesiyle'),
   v('react-native-screens', B('react-native-screens')), v('expo-router', B('expo-router')), v('@expo/ui', B('@expo/ui')),
   v('expo-haptics', B('expo-haptics')), v('expo-font', B('expo-font')), v('react-native-svg', B('react-native-svg')),
   v('kurulum', 'npx expo install react-native-reanimated react-native-worklets')],
  'Expo, SDK ile uyumlu sürümleri bundledNativeModules.json ile sabitliyor; Reanimated, worklets ve React Native arasındaki eşleşme sıkı. Düşük segment Android ağırlıklı kullanıcı kitlesinde bellek geriletmesi doğrudan hissedilir.',
  [alt(`npm deki en yeni sürümler (react-native-reanimated ${V('react-native-reanimated')}, react-native-gesture-handler ${V('react-native-gesture-handler')})`, `SDK 57 sabitlerinin dışında; Reanimated ${V('react-native-reanimated')} peer olarak worklets "${peer('react-native-reanimated', 'react-native-worklets')}" istiyor.`)],
  ['R12-F01', 'R12-F02', 'R12-F03', 'R12-F07']);
k('Telefon: hareket motoru',
  'Telefondaki bütün etkileşim hareketleri tek motorla, Reanimated 4 ile yazılmalı: basılma, renk ve görünürlük gibi durum değişimleri için CSS tarzı geçişler ve tokendan gelen cubicBezier eğrileri; parmağı izleyen hareketler için withTiming ve withSpring; liste ve panel giriş çıkışları için layout animasyonları. reduceMotion hiçbir yerde ReduceMotion.Never yapılmamalı.',
  [v('transitionTimingFunction', 'cubicBezier(x1, y1, x2, y2)', 'sayılar token dosyasından gelir'),
   v('reduceMotion', 'ReduceMotion.System', 'varsayılan, değiştirilmez'),
   v('useReducedMotion', 'uygulama açılışındaki durumu verir', 'uygulama açıkken yapılan ayar değişikliğini görmez')],
  'Tek motor, iki platformda aynı eğriyi (R12-F04) ve telefon ayarına otomatik uyumu (R12-F05) sağlar; ek paket ve bellek yükü getirmez.',
  [alt('Moti', `bakım yok: son sürüm ${VA('moti')}, son commit ${g('nandorojo/moti').lastCommit}.`),
   alt('Skia ile arayüz hareketi', 'Skia bir 2D çizim motoru; düğme ve panel geçişleri için gereksiz bir katman.'),
   alt('@expo/ui bileşenlerinin kendi animasyonları', 'platformun kendi eğrilerini kullanır; tokenlarımıza bağlanıp bağlanamayacağı doğrulanmadı.')],
  ['R12-F03', 'R12-F04', 'R12-F05', 'R12-F08']);
k('Token: yay (spring) değerleri',
  'DTCG de yay tipi olmadığı için yaylar $extensions altında tek bir üretici anahtarıyla ve yalnızca süre tabanlı aileyle (duration, dampingRatio) tutulmalı; stiffness ve damping ile karıştırılmamalı. Yay tokenlarını yalnız telefon üreticisi okumalı.',
  [v('$extensions anahtarı', 'ters alan adı biçiminde tek anahtar', 'spesifikasyon örneği "org.example.toolname"'),
   v('yay alanları', 'duration (ms) ve dampingRatio'),
   v('Reanimated varsayılanları', 'duration 550, dampingRatio 1, mass 4', 'yalnız başvuru içindir, tasarım değeri değildir')],
  'Reanimated iki aileyi birlikte verince süre tabanlı olanı geçerli sayıyor; tek aile kullanmak belirsizliği kaldırır. Süre ve sönüm oranı tasarımcının okuyabileceği iki sayı.',
  [alt('Fizik tabanlı aile (stiffness, damping, mass)', 'okuması zor ve duration ile birlikte verilirse yok sayılıyor.'),
   alt('Yayları panelde de kullanmak', 'panel hareketleri CSS geçişleriyle cubicBezier üzerinden çalışıyor; yay için ek kütüphane gerekir.')],
  ['R12-F06', 'R12-F16']);
k('Telefon: stil katmanı',
  'React Native StyleSheet ile DTCG kaynağından üretilen tipli bir tokens.ts modülü kullanılmalı; tokens.ts elle düzenlenmemeli. Koyu tema gündeme gelirse Unistyles 3 değerlendirilmeli.',
  [v('stil API si', 'React Native StyleSheet'), v('token modülü', 'tokens.ts (üretilmiş, as const)'),
   v('tema', 'şimdilik tek açık tema', 'koyu tema telefon ayarını izleyecekse Unistyles 3 adayı')],
  'Sıfır ek bağımlılık, Yeni Mimari ile doğal uyum ve Reanimated ile doğrudan kullanım. Unistyles StyleSheet API sini koruduğu için sonradan geçiş kolay kalır.',
  [alt(`react-native-unistyles ${V('react-native-unistyles')}`, 'ikinci seçenek: bakımı aktif, ama tek tema varken react-native-nitro-modules ve react-native-edge-to-edge bağımlılığı getiriyor.'),
   alt(`nativewind ${V('nativewind')} / ${V('nativewind', 'rc')}`, 'Tailwind v4 tabanlı v5 henüz rc; kararlı v4 tailwindcss ">3.3.0" istiyor.'),
   alt(`tamagui ${V('tamagui')}`, 'kendi bileşen takımı ve derleyicisiyle tam bir çatı; 3.0 beta aşamasında, ana sürüm geçişi önde.'),
   alt(`@shopify/restyle ${V('@shopify/restyle')}`, `son npm sürümü ${A('@shopify/restyle')}.`)],
  ['R12-F13', 'R12-F14', 'R12-F15', 'R12-F01']);
k('Telefon: sheet ve menüler',
  'Panel benzeri alt sayfalar expo-router formSheet ile yerel sheet olarak açılmalı; köşe yarıçapı tokena bağlanmalı. Menüler ve ekran içi sheet ler için @expo/ui kullanılmalı.',
  [v('presentation', "'formSheet'"), v('sheetAllowedDetents', 'en fazla 3 durak (Android sınırı)', "biçim örneği [0.25, 0.5, 1] veya 'fitToContents'"),
   v('sheetCornerRadius', 'köşe yarıçapı tokenı (piksel)', 'köşeli görünüm için küçük değer'),
   v('menü', '@expo/ui Menu ve ContextMenu (SwiftUI), DropdownMenu (Jetpack Compose)'),
   v('ekran içi sheet', '@expo/ui Universal BottomSheet')],
  'Yerel sheet ve menüler ek paket getirmez, SDK ile birlikte güncellenir ve platform jestleriyle çalışır.',
  [alt(`@gorhom/bottom-sheet ${V('@gorhom/bottom-sheet')}`, `son commit ${g(gor).lastCommit}; yalnız eğrisi tamamen bizim tokenlarımızla çizilmesi gereken bir sheet için yedek.`),
   alt(`zeego ${V('zeego')}`, `son sürüm ${A('zeego')}; üç yerel paketi tam sürümle sabitliyor.`)],
  ['R12-F09', 'R12-F10', 'R12-F11', 'R12-F12']);
k('Telefon: yoklama başarı hareketi ve dokunsal onay',
  'Yoklama alındı ekranındaki tik işareti react-native-svg ve Reanimated ile çizilmeli; dokunsal onay Android de performAndroidHapticsAsync, iOS ta notificationAsync ile verilmeli ve onay her zaman ekranda da görünmeli.',
  [v('çizim', `react-native-svg ${B('react-native-svg')} ve Reanimated`), v('Android dokunsal', 'Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)'),
   v('iOS dokunsal', 'Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)')],
  'Ek çalışma zamanı yok, hareketi azalt ayarına kendiliğinden uyar; Android için belgenin önerdiği yol VIBRATE izni istemiyor.',
  [alt(`lottie-react-native ${B('lottie-react-native')}`, 'ikinci seçenek: tasarımcı elinden çıkmış karmaşık bir animasyon istenirse.'),
   alt(`@rive-app/react-native ${V('@rive-app/react-native')}`, 'yeni çalışma zamanı 0.x ve Expo SDK 57 listesinde yok.'),
   alt(`@shopify/react-native-skia ${B('@shopify/react-native-skia')}`, 'tek bir tik için tam bir çizim motoru.')],
  ['R12-F26', 'R12-F27', 'R12-F05', 'R12-F04']);
k('Token hattı (iki platform için tek kaynak)',
  `Tokenlar depoda DTCG Format 2025.10 biçiminde tek kaynakta tutulmalı; @terrazzo/cli ${V('@terrazzo/cli')} ile panel için tokens.css (CSS değişkenleri), telefon için tokens.ts üretilmeli; check komutu commit öncesi kapıya konmalı. Renkler OKLCH bileşenleri ve color.js ile hesaplanmış hex yedeğiyle yazılmalı.`,
  [v('kaynak', 'tokens/*.tokens.json'),
   v('renk', '{"$type": "color", "$value": {"colorSpace": "oklch", "components": [L, C, H], "alpha": 1, "hex": "#rrggbb"}}', 'hex color.js ile hesaplanır'),
   v('süre', '{"$type": "duration", "$value": {"value": <sayı>, "unit": "ms"}}'),
   v('eğri', '{"$type": "cubicBezier", "$value": [P1x, P1y, P2x, P2y]}', 'x değerleri 0 ile 1 arasında'),
   v('geçiş', '{"$type": "transition", "$value": {"duration": "{...}", "delay": "{...}", "timingFunction": "{...}"}}'),
   v('boyut', '{"$type": "dimension", "$value": {"value": <sayı>, "unit": "px"}}'),
   v('yay', '$extensions altında (R12-K03)'),
   v('çıktılar', 'panel: tokens.css, telefon: tokens.ts', 'üretilen dosyalar elle düzenlenmez')],
  'DTCG 2025.10 kararlı ve oklch, duration, cubicBezier, transition tiplerini tanımlıyor. Terrazzo bu biçimi hedefliyor ve doğrulama komutu veriyor; Style Dictionary kendi belgesinde 2025.10 desteğinin tamamlanmadığını söylüyor.',
  [alt(`style-dictionary ${V('style-dictionary')}`, 'ikinci seçenek: en büyük topluluk ama 2025.10 desteği kendi belgesine göre v5 te hâlâ yapım aşamasında.'),
   alt('İki platform için elle yazılmış iki dosya', 'iki kaynak zamanla birbirinden ayrılır; tek kaynak ilkesine aykırı.'),
   alt('Tailwind @theme dosyasını kaynak yapmak', 'tokenları tek bir platformun sözdizimine bağlar; telefon tarafı okuyamaz.')],
  ['R12-F16', 'R12-F17', 'R12-F18', 'R12-F19', 'R12-F06']);
k('Panel: stil yazımı',
  'Panelde düz CSS, CSS Modules (Vite yerleşik) ve üretilmiş tokens.css içindeki CSS değişkenleri kullanılmalı.',
  [v('bileşen stilleri', '*.module.css', 'Vite ek paket olmadan işler'), v('tokenlar', ':root altında üretilmiş CSS değişkenleri (tokens.css)')],
  'Sahibinin "önce sade teknoloji" kuralına uyar, ek derleme adımı ve sınıf dili getirmez; token hattı değişmez.',
  [alt(`tailwindcss ${V('tailwindcss')}`, 'ikinci seçenek: @theme ile tokenları yardımcı sınıflara çevirir ve bakımı aktif, ama ek bir sınıf dili ve derleme bağımlılığı getirir.')],
  ['R12-F20']);
k('Panel: hareket',
  'Panelde hover, basma ve aç kapa hareketleri token değişkenlerini kullanan CSS transition ve @keyframes ile; sayfa ve panel giriş çıkışları React 19.3 <ViewTransition> ile yazılmalı. prefers-reduced-motion kuralı kendi CSS imizde tanımlanmalı.',
  [v('react', V('react'), 'ViewTransition için 19.3 gerekiyor'), v('tetikleme', 'startTransition, Suspense, useDeferredValue'),
   v('Motion (gerekirse)', `motion ${V('motion')}, m ve LazyMotion (~4.6kb) + domAnimation (+15kb)`, 'tam motion bileşeni 34kb')],
  'CSS ve ViewTransition ek kütüphane olmadan çalışıyor; aynı belge içi view transition lar Ekim 2025 ten beri üç tarayıcı motorunda var.',
  [alt('Motion tam bileşeni her yerde', '34kb ve tree-shake ile küçülmüyor; panel hareketlerinin çoğu CSS ile çözülüyor.')],
  ['R12-F21', 'R12-F22', 'R12-F23']);
k('Panel: erişilebilir başsız bileşenler',
  `Panelin menü, diyalog, açılır liste, sekme ve benzeri bileşenleri @base-ui/react ${V('@base-ui/react')} üzerine kurulmalı; görünümün tamamı (köşeler dahil) bizim CSS imizle çizilmeli.`,
  [v('@base-ui/react', V('@base-ui/react')), v('eski paket', '@base-ui-components/react kullanılmaz', 'npm de kaldırılmış')],
  'Base UI biçimsiz, 1.0 dan beri kararlı, aylık sürüm çıkarıyor ve shadcn/ui varsayılanı oldu.',
  [alt(`react-aria-components ${V('react-aria-components')}`, 'ikinci seçenek: bakımda ve erişilebilirlik odaklı; Base UI benimsenme ve bakım sinyallerinde önde.'),
   alt(`radix-ui ${V('radix-ui')}`, `desteklenmeye devam ediyor ama ${g('radix-ui/primitives').openIssuesAndPRs} açık issue ve PR var, shadcn/ui varsayılanı Base UI ya çevirdi.`)],
  ['R12-F24', 'R12-F25']);
k('Fontlar',
  'Telefonda fontlar expo-font config plugin ile derleme anında gömülmeli; panelde yalnızca WOFF2 dosyaları kendi sunucumuzdan font-display: swap ile verilmeli ve Türkçe harfleri içeren alt küme yüklenmeli.',
  [v('telefon', 'expo-font config plugin (app.json plugins)', 'Android de fontDefinitions ile ağırlıklar'),
   v('panel biçimi', 'yalnızca WOFF2'), v('font-display', 'swap', 'düzen kayması istenmezse optional'),
   v('kaynak', 'Fontsource paketleri veya depoya konmuş WOFF2 dosyaları', `örnek @fontsource-variable/inter ${V('@fontsource-variable/inter')}; font seçimi başka bir açıkta`)],
  'Gömülü font açılışta beklemez; WOFF2 en küçük dosyayı verir; swap metni hemen gösterir.',
  [alt('useFonts ile çalışma anında yükleme', 'belge yalnız config plugin kullanılamıyorsa öneriyor.'),
   alt('Google Fonts bağlantısı', 'dış sunucuya bağımlılık; kendi sunucumuzdan vermek sürüm ve önbellek kontrolünü bizde tutar.')],
  ['R12-F28', 'R12-F29']);

const out = {
  id: 'R12',
  angle: 'Tasarımın koda dökülme yolu: kütüphaneler ve token hattı',
  summary: [
    `Telefon tarafında Expo SDK 57 (30 Haziran 2026, React Native 0.86, React 19.2) yerel paket sürümlerini kendisi sabitliyor: expo@${EXPO} için Reanimated ${B('react-native-reanimated')}, worklets ${B('react-native-worklets')}, Gesture Handler ${B('react-native-gesture-handler')}, react-native-screens ${B('react-native-screens')}, @expo/ui ${B('@expo/ui')}.`,
    'Bu sürümler npx expo install ile alınmalı ve expo en az 57.0.17 olmalı, çünkü Reanimated kullanan uygulamalarda belleği artıran geriletme ile açılış süresi geriletmesi bu ara sürümlerde kapatıldı.',
    'Telefonda hareketin tek motoru Reanimated 4 olmalı: CSS tarzı geçişleri cubicBezier eğrisini doğrudan alıyor, withSpring süre tabanlı yay veriyor ve telefonun hareketi azalt ayarı varsayılan olarak uygulanıyor; Moti Mart 2025 ten beri commit almadığı için elendi.',
    'Stil için StyleSheet ile DTCG kaynağından üretilen tipli token modülü en az bağımlılıklı yol; koyu tema gelirse Unistyles 3 ikinci seçenek, NativeWind v5 henüz rc, Restyle in son sürümü Mart 2025.',
    'Sheet ve menüler için expo-router formSheet ve @expo/ui yerel çözümler sunuyor; @gorhom/bottom-sheet Mayıs 2026 dan beri commit almadı, zeego nun son sürümü Mart 2025.',
    'Token kaynağı için DTCG Format 2025.10 (28 Ekim 2025) kararlı: oklch renk, duration, cubicBezier ve transition tipleri var, yay tipi yok; Style Dictionary 2025.10 u henüz tam desteklemediğini kendisi söylediği için üretici olarak Terrazzo öne çıkıyor.',
    'Panelde düz CSS değişkenleri, Vite nin yerleşik CSS Modules desteği ve React 19.3 te kararlı olan <ViewTransition> yeterli; Motion yalnız jest tabanlı bir ihtiyaçta LazyMotion ile eklenmeli.',
    'Panelin başsız bileşenleri için Base UI (1.0 kararlı 11 Aralık 2025, şu an 1.8.0) birinci, React Aria Components ikinci seçenek; fontlar telefonda expo-font config plugin ile gömülmeli, panelde yalnız WOFF2 ve font-display ile kendi sunucumuzdan verilmeli.'
  ].join(' '),
  findings: F,
  recommendations: K,
  signals: [],
  benchmarks: [],
  open_questions: [
    'React Native 0.86 stil renklerinde oklch() dizesini kabul ediyor mu? Doğrulanmadı; doğrulanana kadar telefon çıktısı hex kullanmalı.',
    'Panelin hedef tarayıcı ve sürümleri neler (fakülte bilgisayarları, projeksiyon makineleri)? oklch() ve ViewTransition kullanımı buna göre kesinleşmeli.',
    'Panel açılışları için platformun yerel sheet animasyonu kabul mü, yoksa eğrinin tamamen bizim tokenlarımızla çizildiği özel bir sheet mi isteniyor? Sahibinin panel animasyonları için ayrıca konuşalım dediği toplantıda karar verilmeli.',
    '@expo/ui bileşenlerinin Material 3 ve SwiftUI görünümü köşeli tasarım diliyle ne kadar uyuşuyor? Düşük segment bir Android cihazda prototip gerekiyor.',
    'Terrazzo nun JS/TS çıktısı süre ve cubicBezier değerlerini React Native in doğrudan kullanabileceği sayılar olarak veriyor mu, yoksa Custom eklenti mi yazılmalı? İlk denemede doğrulanmalı.',
    'Base UI ile React Aria Components arasında bizim bileşen kümemiz için paket boyutu farkı ölçülmedi; gerçek derlemede ölçülmeli. Base UI peer listesindeki date-fns ve @date-fns/tz in isteğe bağlı olup olmadığı kontrol edilmeli.',
    `Expo SDK 58 npm de next etiketinde (${VA('expo', 'next')}); yükseltmede Gesture Handler 3 ve daha yeni Reanimated serisi gelecek, hareket kodu buna göre gözden geçirilmeli.`,
    'GitHub arama API si kimlik doğrulamasız istekte 403 döndüğü için birçok depoda son 30 günlük issue yanıt hızı ölçülemedi; kimlik doğrulamalı bir ölçümle tamamlanmalı.',
    'Reanimated in düşük segment Android cihazlarda bellek etkisi ölçülmedi; ilk prototipte ölçülmeli.'
  ]
};
fs.writeFileSync(path.join(S, 'research', 'R12.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('written', F.length, 'findings', K.length, 'recs', F.filter(x => x.load_bearing).length, 'load-bearing');
