// Section 'Durumlar' (#durumlar): final states, server decisions and the receipt, record tags, warning levels, status
// texts, the AKSİS summary and the color-blindness check. Owner: F1b.
const { T, CHK, QR, C } = require('../lib/inputs');
const { esc, tr, resolve, doc, PLAN } = require('../lib/format');
const { I } = require('../lib/icons');
const { stamp, ind, att, dec } = require('../lib/marks');
const { section, sub, ref } = require('../lib/section');
const { lvl } = require('../screens/level');
const { qrSvg } = require('../screens/qr');

const cvdPairs = CHK.cvd.filter(x => x.part === 'fg');
const chromatic = T.color.attendance.filter(a => C.hexToOklch(resolve(a.fg)).C >= 0.04).map(a => a.key);
const cvdChrom = cvdPairs.filter(x => chromatic.includes(x.a) || chromatic.includes(x.b));
const cvdMin = cvdChrom.reduce((m, x) => (x.min < m.min ? x : m), cvdChrom[0]);
const LBL = Object.fromEntries(T.color.attendance.map(a => [a.key, a.label]));
const MEAN = {
  var: 'Sunucu kararı Var olan kayıt.', yok: "Kayıt yok ya da sebep kodu 'yoklamada sınıfta değil'.",
  gorevli: 'Sebep kodu görevlendirme; belge numarası zorunlu.', belgeli: 'Öğrenci işlerinin yazısı ya da kurul kararı; belge numarası zorunlu.',
  elle: "Beyana dayalı: 'telefonu yok ya da çalışmıyor', 'QR okutamadı'.", muaf: 'Ders düzeyinde. Muaf öğrenciye hak uyarısı gitmez.'
};

function durumlar() {
  const STATE_TEXTS = [
    { k: 'Bağlantı bekleniyor', where: 'P12 · projeksiyon sayfası', d: 'Eşleştirme QR\'ı okutulup ders onaylanana kadar. Sayfa hareketsizdir; bekleme göstergesi dönmez.',
      demo: '<div class="st-proj"><div class="st-proj-qr">' + qrSvg(QR[1]) + '</div><div><p class="st-proj-t">' + I('link', 20) + 'Bağlantı bekleniyor</p><p class="st-proj-s">Bu kodu hocanın telefonundaki uygulamayla okut.</p></div></div>' },
    { k: 'Kayıtların bir kısmı henüz gelmemiş olabilir', where: 'Panel · yoklama tablosu', d: 'İnternetsiz telefonların kayıtları bağlantı gelince düşer; not tablonun üstünde, kapatılamaz, renksizdir.',
      demo: '<p class="st-note">' + I('info', 20) + '<span>Kayıtların bir kısmı henüz gelmemiş olabilir.</span></p>' },
    { k: 'Onay bekliyor', where: 'H1, P1 · hoca hesabı', d: 'E-postadaki kod doğrulandıktan sonra, yönetici onaylayana kadar hesabın durumu.',
      demo: '<div class="st-acct"><span class="av">SA</span><div><p class="t">S. Aksoy</p><p class="s">s.aksoy@istanbul.edu.tr</p></div>' + stamp('tel', 'Onay bekliyor', 'hourglass_top') + '</div>' },
    { k: 'Bluetooth yok', where: 'Ö15 · Aşama 3', d: 'Tarama başlamadan önce; düğme Bluetooth açma isteğini gösterir.',
      demo: '<div class="st-ble">' + I('bluetooth_disabled', 24) + '<div><p class="t">Bluetooth yok</p><p class="s">Yoklama için Bluetooth\'u aç.</p></div><button class="btn btn-secondary btn-sm" type="button">Aç</button></div>' },
    { k: 'Konum yok', where: 'Ö15 · Aşama 3', d: 'Konum izni ya da konum kapalıysa; iPhone\'da geçici kesin konum istenir.',
      demo: '<div class="st-ble">' + I('location_off', 24) + '<div><p class="t">Konum yok</p><p class="s">Yoklama için konumu aç.</p></div><button class="btn btn-secondary btn-sm" type="button">Aç</button></div>' },
    { k: 'Sen değilsen Oturumlarım ekranından kapat', where: 'D1 · giriş bildirimi e-postası', d: 'Her girişte giden bildirim e-postasında; altında her e-postadaki sabit uyarı cümlesi durur. E-postada bağlantı yok, yalnız yazı (' + doc(PLAN, 'kararlar-e-posta-gonderimi', 'plan.html#kararlar-e-posta-gonderimi') + ').',
      demo: '<div class="st-mail"><p class="h">' + I('mail', 16) + 'İÜ Yoklama · Giriş bildirimi</p><p>Hesabına 6 Ekim 2026 Salı, 09:58\'de giriş yapıldı.</p><p class="b">Sen değilsen Oturumlarım ekranından kapat.</p><p class="f">Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.</p></div>' }
  ];
  return section('durumlar', 'Her durum önce ikonun biçimi ve sözcükle, sonra mürekkebin rengiyle okunur. Zemin yalnız yoğun tabloda ve yalnız Yok ile Ret için renklenir. Adlar ' + doc(PLAN, 'gun-son-durumlar', 'plan.html#gun-son-durumlar') + ' ile aynı.',
    sub('Son durumlar', 'rapor harfleri V, Y, G, B, E, M', '<div class="st-grid">' + T.color.attendance.map(a => '<div class="st-cell">' + att(a.key) + '<p class="desc">' + MEAN[a.key] + '</p><p class="meta"><span class="letter">' + a.letter + '</span><span>' + a.icon + '</span><span>' + resolve(a.fg) + (a.borderStyle === 'dashed' ? ' · kesik çerçeve' : '') + '</span></p></div>').join('') + '</div>' +
      '<p class="help" style="margin-top:12px">Damga: 1 px durum renginde çerçeve (Devamdan muafta kesik), 16 px ikon, 13 px yazı. Tabloda çerçevesiz biçim (ikon ve sözcük) kullanılır; Yok ve Ret orada gül zemin alır.</p>') +
    sub('Sunucu kararları ve makbuz', doc(PLAN, 'gun-kayit-etiketleri', 'plan.html#gun-kayit-etiketleri'), '<div class="st-grid">' +
      '<div class="st-cell">' + dec('var') + '<p class="desc">Kayıt sayıma girer.</p></div>' +
      '<div class="st-cell">' + dec('beklemede') + '<p class="desc">Karar henüz verilmedi; renk grafit, alarm değil.</p></div>' +
      '<div class="st-cell">' + dec('incelemede') + '<p class="desc">2\'lik ortak sınırı aşan kayıt; hocanın onay ekranına düşer.</p></div>' +
      '<div class="st-cell">' + dec('ret') + '<p class="desc">Gerekçe koduyla. Makbuz QR\'ı ile yeniden denenebilir.</p></div>' +
      '<div class="st-cell">' + stamp('tel', 'Telefonda kayıtlı, gönderilmedi', 'smartphone') + '<p class="desc">Kayıt imzalandı, telefonda duruyor. Kırmızı değil: çevrimdışı olağan durum.</p></div>' +
      '<div class="st-cell">' + stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + '<p class="desc">Sunucu aldı; karar ayrıca gösterilir.</p></div>' +
      '<div class="st-cell"><div class="exc-demo">' + ind('yok', 'Yok', 'close', 'exc') + ind('ret', 'Ret', 'block', 'exc') + ind('var', 'Var', 'check') + '</div><p class="desc">Yoğun tabloda istisna önce: yalnız Yok ve Ret gül zemin (' + resolve('#FCECEB') + ') alır, Var beyaz kalır.</p></div>' +
      '</div>') +
    sub('Kayıt etiketleri', 'renksiz', '<div class="live-row">' + T.durumlar.etiketler.map(e => '<span class="tagx">' + esc(e) + '</span>').join('') + '</div><p class="help" style="margin-top:12px">' + esc(T.durumlar.note) + '</p>') +
    sub('Uyarı düzeyleri', doc(PLAN, 'devam-uyari-seviyeleri', 'plan.html#devam-uyari-seviyeleri'), '<div class="warn-list">' + T.durumlar.uyari.map(u => {
      const cls = u.level === 1 ? 'st-info' : u.level === 2 ? 'st-warn' : 'st-danger';
      return '<div class="warn-row ' + cls + (u.banner ? ' banner' : '') + '"><p class="lv">Düzey ' + u.level + '</p><div class="wi">' + I(u.icon, 20) + '</div><div><p class="tx">' + esc(u.text) + '</p>' + (u.variant ? '<p class="why">Kalan hak sonraki oturumun saatinden azsa: "' + esc(u.variant) + '"</p>' : '') + '</div><div>' + lvl(u.level, u.banner ? 'on-solid' : cls) + '</div></div>';
    }).join('') + '</div><p class="help" style="margin-top:12px">Düzey 1 grafit, 2 mor, 3 kırmızı mürekkep; düzey 4 tek dolu kırmızı şerit, yazısı neutral.1 (' + tr(C.wcagRatio(resolve('neutral.1'), resolve(T.color.status.danger.solid)), 2) + ':1). Gece mavisi uyarı anlamı taşımaz.</p>') +
    sub('Durum metinleri', 'bileşen düzeyinde, aynen', '<p class="body" style="margin-bottom:16px">Ürün özetinde adı geçen ama ekranı çizilmemiş durumların metni ve biçimi. Sözcükler plan.html\'deki gibi; hiçbiri gece mavisi taşımaz.</p><div class="stt">' + STATE_TEXTS.map(s => '<div class="plate stt-c"><p class="plate-cap"><b>' + s.k + '</b><span>' + s.where + '</span></p><div class="plate-body"><div class="stt-demo">' + s.demo + '</div><p class="help">' + s.d + '</p></div></div>').join('') + '</div>') +
    sub('AKSİS özeti', 'büyük harf metinde hazırlanır (tr-TR)', '<div class="aksis">' + T.durumlar.aksis.map(a => '<span>' + esc(a) + '</span>').join('') + '<span>geçici</span></div><p class="help" style="margin-top:12px">Yüzde aşağı yuvarlanır, tek ondalık: %69,5 (' + doc(PLAN, 'devam', 'plan.html#devam') + '). "KARAR BEKLİYOR" içindeki İ, toLocaleUpperCase(\'tr-TR\') ile doğru büyür; canlı örnek ' + ref('tipografi', 'Tipografi') + ' bölümünde.</p>') +
    sub('Renk körlüğü denetimi', 'tcheck.js · Machado 2009', '<div><div class="cvd-row"><p class="k">renkli</p><div class="chips">' + T.color.attendance.map(a => att(a.key)).join('') + '</div></div>' +
      '<div class="cvd-row"><p class="k">renksiz</p><div class="chips" style="filter:grayscale(1)">' + T.color.attendance.map(a => att(a.key)).join('') + '</div></div></div>' +
      '<p class="body" style="margin-top:16px">Renk tamamen kalksa da altı durum ikonun biçimi ve sözcükle ayrılır; Devamdan muaf ayrıca kesik çerçeveyle. Protan, deutan ve tritan benzetimi sayıyla yapıldı (sayfada benzetim görüntüsü yok: kırmızının benzetimi sarıya kayar, sahibin kilidi belgede de sarı istemiyor). Renkli üç mürekkebin (' + chromatic.map(k => LBL[k]).join(', ') + ') en yakın çifti ' + LBL[cvdMin.a] + ' ile ' + LBL[cvdMin.b] + ', OKLab uzaklığı ' + tr(cvdMin.min, 3) + ' (eşik 0,02). Nötr üç durum bilerek renksizdir: Belgeli düzeltme ile Devamdan muaf aynı mürekkebi (neutral.11) taşır, onları ikon, sözcük ve kesik çerçeve ayırır; tcheck bunu uyarı olarak yazar. Zeminler de bilerek aynıdır.</p>' +
      '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc"><thead><tr><th>Çift</th><th class="r">normal</th><th class="r">protan</th><th class="r">deutan</th><th class="r">tritan</th><th class="r">en az</th></tr></thead><tbody>' +
      cvdPairs.map(x => '<tr><td>' + LBL[x.a] + ' · ' + LBL[x.b] + '</td><td class="r mono">' + tr(x.normal, 3) + '</td><td class="r mono">' + tr(x.protan, 3) + '</td><td class="r mono">' + tr(x.deutan, 3) + '</td><td class="r mono">' + tr(x.tritan, 3) + '</td><td class="r mono">' + tr(x.min, 3) + '</td></tr>').join('') + '</tbody></table></div>'));
}
durumlar.title = 'Durumlar';
module.exports = durumlar;
