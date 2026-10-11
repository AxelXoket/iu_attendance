// Section 'Durumlar' (#durumlar): final states, server decisions and the receipt, record tags, warning levels, status
// texts, the AKSİS summary and the color-blindness check. Names and meanings belong to plan.html (Son durumlar, Kayıt
// etiketleri, Kayıt ve makbuz, Uyarı seviyeleri); this section draws how each one looks and links the meaning, never
// restates it. Every ink, icon and letter is read from tokens.json. Owner: F1b.
const { T, CHK, QR, C } = require('../lib/inputs');
const { esc, tr, resolve, doc, PLAN } = require('../lib/format');
const { I } = require('../lib/icons');
const { stamp, att, dec } = require('../lib/marks');
const { section, sub, ref, table } = require('../lib/section');
const { lvl } = require('../screens/level');
const { qrSvg } = require('../screens/qr');

const P = (id, name) => doc(PLAN, id, 'plan.html, ' + name);
const LBL = Object.fromEntries(T.color.attendance.map(a => [a.key, a.label]));
// Where each final status is defined: the five recorded statuses in Son durumlar, Devamdan muaf (course level) in the
// attendance rule Md.20/5.
const MEANING = { muaf: P('devam', 'Devamsızlık hesabı, Md.20/5') };
const meta = parts => '<p class="meta">' + parts.join('') + '</p>';

// Color-blindness check from tcheck.js (Machado 2009): the chromatic inks are those with OKLCH chroma 0.04 and up.
const cvdPairs = CHK.cvd.filter(x => x.part === 'fg');
const chromatic = T.color.attendance.filter(a => C.hexToOklch(resolve(a.fg)).C >= 0.04).map(a => a.key);
const byMin = (a, b) => a.min - b.min;
const sameInk = cvdPairs.filter(x => resolve(T.color.attendance.find(a => a.key === x.a).fg) === resolve(T.color.attendance.find(a => a.key === x.b).fg));
const distinct = cvdPairs.filter(x => !sameInk.includes(x)).sort(byMin);
const chromPairs = distinct.filter(x => chromatic.includes(x.a) && chromatic.includes(x.b));
const closestChrom = chromPairs[0], closestAll = distinct[0];
const tiedAll = distinct.filter(x => x.min.toFixed(3) === closestAll.min.toFixed(3));
const nameList = ks => (ks.length < 2 ? ks.join('') : ks.slice(0, -1).join(', ') + ' ve ' + ks[ks.length - 1]);
const WORDS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
const pairName = x => LBL[x.a] + ' · ' + LBL[x.b];

function cvdBlock() {
  const shown = distinct.slice(0, 3), rest = distinct.slice(3);
  const tiedNames = (() => {
    const common = tiedAll.map(x => [x.a, x.b]).reduce((acc, p) => acc.filter(k => p.includes(k)));
    if (tiedAll.length > 1 && common.length === 1) {
      const others = tiedAll.map(x => (x.a === common[0] ? x.b : x.a));
      const neutral = others.every(k => !chromatic.includes(k));
      return LBL[common[0]] + ' ile ' + WORDS[others.length] + (neutral ? ' nötr' : '') + ' durum (' + nameList(others.map(k => LBL[k])) + ')';
    }
    return pairName(closestAll);
  })();
  return '<div><div class="cvd-row"><p class="k">renkli</p><div class="chips">' + T.color.attendance.map(a => att(a.key)).join('') + '</div></div>' +
    '<div class="cvd-row"><p class="k">renksiz</p><div class="chips" style="filter:grayscale(1)">' + T.color.attendance.map(a => att(a.key)).join('') + '</div></div></div>' +
    '<details class="cvd-det"><summary>Renk tamamen kalksa da altı durum ikon ve sözcükle ayrılır; renkli çiftlerin en yakını ' + LBL[closestChrom.a] + ' ile ' + LBL[closestChrom.b] + ' (' + tr(closestChrom.min, 3) + ')</summary><div>' +
    '<p class="body">Devamdan muaf ayrıca kesik çerçeveyle ayrılır. Protan, deutan ve tritan benzetimi sayıyla yapıldı; sayfada benzetim görüntüsü yok, çünkü kırmızının benzetimi sarıya kayar ve kilitli renk kuralı belgede de sarı istemez. ' +
    'Renkli ' + WORDS[chromatic.length] + ' mürekkebin (' + nameList(chromatic.map(k => LBL[k])) + ') en yakın çifti ' + LBL[closestChrom.a] + ' ile ' + LBL[closestChrom.b] + ' (OKLab uzaklığı ' + tr(closestChrom.min, 3) + '); farklı mürekkepli çiftlerde en küçük uzaklık ' + tiedNames + ' arasında (' + tr(closestAll.min, 3) + ', eşik 0,02). ' +
    nameList(sameInk.map(x => LBL[x.a] + ' ile ' + LBL[x.b] + ' (' + T.color.attendance.find(a => a.key === x.a).fg + ')')) + ' bilerek aynı mürekkebi taşır; onları ikon, sözcük ve kesik çerçeve ayırır.</p>' +
    '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc compact cvd-tbl"><thead><tr><th>Çift</th><th class="r">en küçük uzaklık (normal, protan, deutan, tritan)</th></tr></thead><tbody>' +
    sameInk.map(x => '<tr><td>' + pairName(x) + '</td><td class="r mono">' + tr(x.min, 3) + ' (aynı mürekkep)</td></tr>').join('') +
    shown.map(x => '<tr><td>' + pairName(x) + '</td><td class="r mono">' + tr(x.min, 3) + '</td></tr>').join('') +
    (rest.length ? '<tr><td>öbür ' + rest.length + ' çift</td><td class="r mono">' + tr(rest[0].min, 3) + ' ve üstü</td></tr>' : '') + '</tbody></table></div></div></details>';
}

// Status texts: states the plan names but no screen of this page draws, as components. "plan" lists the strings quoted
// from plan.html (shown in quotes under the card); every other line of a demo is proposed copy (öneri metni).
// Quoted plan strings as one sentence: the closing period is left out when the last string already ends a sentence.
const quoted = list => { const q = list.map(x => '"' + x + '"').join(', '); return q + (/[.!?]"$/.test(q) ? '' : '.'); };
function stateTexts() {
  const pair = QR.find(q => q.kind === 'eslestirme');
  const card = s => '<div class="plate stt-c"><div class="stt-h"><p class="stt-k">' + s.k + '</p><p class="stt-w">' + s.where + '</p></div><div class="plate-body"><div class="stt-demo">' + s.demo + '</div><p class="help">' + s.d + '</p>' +
    '<p class="stt-src">' + (s.plan.length ? 'Plan metni: ' + quoted(s.plan) + (s.own ? ' Öbür satırlar öneri metni.' : '') : 'Bütün satırlar öneri metni.') + '</p></div></div>';
  const prompt = (icon, t, s) => '<div class="st-ble">' + I(icon, 24) + '<div><p class="t">' + t + '</p><p class="s">' + s + '</p></div><button class="btn btn-secondary btn-sm" type="button">Aç</button></div>';
  return [
    { k: 'Eşleştirme', where: 'Projeksiyon sayfası · ' + P('asama23-nereden-gosterilir', 'Nereden gösterilir'), d: 'Kısa kod Plex Mono ile QR\'ın yanında; sayfa hareketsizdir, bekleme göstergesi dönmez.', plan: [], own: true,
      demo: '<div class="st-proj"><div class="st-proj-qr">' + qrSvg(pair) + '</div><div><p class="st-proj-k">Eşleştirme kodu</p><p class="st-proj-c">' + esc(pair.code) + '</p><p class="st-proj-s">Hoca bu QR\'ı kendi telefonundaki uygulamayla okutup dersi onaylar.</p></div></div>' },
    { k: 'Bağlantı bekleniyor', where: 'Projeksiyon sayfası · ' + P('asama23-nereden-gosterilir', 'Nereden gösterilir'), d: 'Eski QR\'ın yerinde yalnız bu satır durur; sayfa hareketsizdir.', plan: ['bağlantı bekleniyor'], own: false,
      demo: '<div class="st-proj off"><p class="st-proj-t">' + I('link', 20) + 'Bağlantı bekleniyor</p></div>' },
    { k: 'Kayıtların bir kısmı henüz gelmemiş olabilir', where: 'Panel, yoklama tablosu · ' + P('kararlar-kafa-sayisi', 'Kafa sayısı'), d: 'Tablonun üstünde, kapatılamaz, renksiz; gönderme süresi bitince kalkar (' + P('kararlar-gonderme-suresi', 'Gönderme süresi') + ').', plan: ['kayıtların bir kısmı henüz gelmemiş olabilir'], own: false,
      demo: '<p class="st-note">' + I('info', 20) + '<span>Kayıtların bir kısmı henüz gelmemiş olabilir.</span></p>' },
    { k: 'Onay bekliyor', where: 'Hoca hesabı · ' + P('kararlar', 'Kararlar, Hoca kaydı'), d: 'Hesap satırında damga olarak durur, mürekkebi birincil metin rengi; alarm değildir.', plan: ['onay bekliyor'], own: true,
      demo: '<div class="st-acct"><span class="av">SA</span><div><p class="t">S. Aksoy</p><p class="s">s.aksoy@istanbul.edu.tr</p></div>' + stamp('tel', 'Onay bekliyor', 'hourglass_top') + '</div>' },
    { k: 'Bluetooth yok, konum yok', where: 'Aşama 3 · ' + P('asama23', 'Aşama 2 ve 3') + ' · ' + P('asama23-gps', 'GPS'), d: 'Tarama öncesi istek: ikon, başlık, tek cümle ve Aç düğmesi; kırmızı yok.', plan: ['Bluetooth yok', 'konum yok'], own: true,
      demo: prompt('bluetooth_disabled', 'Bluetooth kapalı', 'Açmazsan kaydın "Bluetooth yok" diye alınır ve aleyhine kullanılmaz.') + prompt('location_off', 'Konum kapalı', 'Açmazsan kaydın "konum yok" diye alınır ve aleyhine sayılmaz.') },
    { k: 'Sen değilsen Oturumlarım ekranından kapat', where: 'Giriş bildirimi e-postası · ' + P('kararlar', 'Kararlar, Hoca oturumu'), d: 'Düz yazı: uyarı satırı kalın, e-postaların sabit satırı en altta küçük (' + P('kararlar-e-posta-gonderimi', 'E-posta gönderimi') + ').', plan: ['Sen değilsen Oturumlarım ekranından kapat', 'Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.'], own: true,
      demo: '<div class="st-mail"><p class="h">' + I('mail', 16) + 'Giriş bildirimi</p><p>Hesabına 6 Ekim 2026 Salı, 09:58\'de giriş yapıldı.</p><p>Tarayıcı: Edge, Windows.</p><p>Bu girişle en eski oturumun kapandı: Chrome, Windows.</p><p class="b">Sen değilsen Oturumlarım ekranından kapat.</p><p class="f">Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.</p></div>' }
  ].map(card).join('');
}

// Warning levels: the four sample texts as component content, then one row per level: ink token, icon, meter fill.
function warnBlock() {
  const L = lvl.LEVELS;
  const rows = L.map(u => '<div class="warn-row' + (u.banner ? ' banner' : '') + '"' + (u.banner ? '' : ' style="' + lvl.ink(u.level) + '"') + '><p class="lv">Seviye ' + u.level + '</p><div class="wi">' + I(u.icon, 20) + '</div><p class="tx">' + esc(u.text) + '</p><div>' + lvl(u.level) + '</div></div>').join('');
  const S = T.color.status.danger;
  const spec = table(['Seviye', 'Mürekkep', 'İkon', 'Ölçek'], L.map(u => {
    const inkCell = u.banner
      ? 'şerit <code>status.danger.solid</code> ' + resolve(S.solid) + ', yazı <code>status.danger.onSolid</code> ' + resolve(S.onSolid)
      : '<code>' + lvl.inkToken(u.level) + '</code> ' + resolve(u.fg);
    const fill = u.level === L.length ? 'dört bölme de dolu, yazı renginde' : u.level + ' bölme mürekkeple dolu, ' + (L.length - u.level) + ' bölme <code>neutral.6</code>';
    return ['Seviye ' + u.level + '/' + L.length, inkCell, '<code>' + u.icon + '</code>', fill];
  }), 'compact lv-tbl');
  return '<div class="warn-list">' + rows + '</div>' + '<div style="margin-top:16px">' + spec + '</div>' +
    '<p class="help" style="margin-top:12px">Seviye yazıyla verilir ("Seviye 2/4"); yanındaki dört bölmeli ölçek kalan hakkı değil seviyeyi gösterir. Ölçek &lt;meter&gt; değil, role="meter" taşıyan düz çubuktur. Seviye 4 tek dolu kırmızı şerittir.</p>';
}

function durumlar() {
  const decMeta = (list, key) => { const d = T.durumlar[list].find(x => x.key === key); return meta(['<span>' + d.icon + '</span>', '<span>' + resolve(d.fg) + '</span>']); };
  return section('durumlar', 'Her durum önce ikonun biçimi ve sözcükle, sonra mürekkebin rengiyle okunur. Adlar ve anlamlar plan.html\'de; burada her durumun görünüşü ve anlamının bağlantısı var.',
    sub('Son durumlar', 'rapor harfleri ' + T.color.attendance.map(a => a.letter).join(', ') + ' · ' + P('gun-son-durumlar', 'Son durumlar'), '<div class="st-grid">' + T.color.attendance.map(a => '<div class="st-cell">' + att(a.key) +
      meta(['<span class="letter">' + a.letter + '</span>', '<span>' + a.icon + '</span>', '<span>' + resolve(a.fg) + (a.borderStyle === 'dashed' ? ' · kesik çerçeve' : '') + '</span>']) + (MEANING[a.key] ? '<p class="st-link">Anlamı: ' + MEANING[a.key] + '</p>' : '') + '</div>').join('') + '</div>' +
      '<p class="help" style="margin-top:12px">Damga zeminsizdir; ölçüleri ' + ref('bilesenler', 'Bileşenler') + ', Anatomi, Damga. Tabloda çerçevesiz biçim (ikon ve sözcük) kullanılır.</p>') +
    sub('Sunucu kararları ve makbuz', P('gun-kayit-etiketleri', 'Kayıt etiketleri') + ' · ' + P('kararlar-kayit-ve-makbuz', 'Kayıt ve makbuz'), '<div class="st-grid">' +
      ['var', 'beklemede', 'incelemede', 'ret'].map(k => '<div class="st-cell">' + dec(k) + decMeta('sunucu', k) + '</div>').join('') +
      '<div class="st-cell">' + stamp('tel', 'Telefonda kayıtlı, gönderilmedi', 'smartphone') + decMeta('makbuz', 'telefonda') + '</div>' +
      '<div class="st-cell">' + stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + decMeta('makbuz', 'ulasti') + '</div>' +
      '</div><p class="help" style="margin-top:12px">Yoğun tabloda Yok ve Ret\'in zemini: ' + ref('renk', 'Renk') + ', Durum renkleri.</p>') +
    sub('Kayıt etiketleri', 'gri, durum rengi yok · ' + P('gun-kayit-etiketleri', 'Kayıt etiketleri'), '<div class="live-row">' + T.durumlar.etiketler.map(e => '<span class="tagx">' + esc(e) + '</span>').join('') + '</div><p class="help" style="margin-top:12px">Gri zeminli, çerçevesiz; durum rengi taşımaz.</p>') +
    sub('Uyarı seviyeleri', P('devam-uyari-seviyeleri', 'Uyarı seviyeleri'), warnBlock()) +
    sub('Durum metinleri', 'bileşen olarak', '<p class="body" style="margin-bottom:16px">plan.html\'de adı geçen ama ekranı çizilmemiş durumların biçimi. Tırnak içindeki sözcükler plan.html\'den, öbür satırlar öneri metni; hiçbiri gece mavisi taşımaz.</p><div class="stt">' + stateTexts() + '</div>') +
    sub('AKSİS özeti', P('devam', 'Devamsızlık hesabı'), '<div class="aksis">' + T.durumlar.aksis.map(a => '<span>' + esc(a) + '</span>').join('') + '<span>geçici</span></div><p class="help" style="margin-top:12px">Sonuçlar metin olarak büyük harfle hazırlanır; kuralı ve yüzdenin biçimi: ' + ref('tipografi', 'Tipografi') + '.</p>') +
    sub('Renk körlüğü denetimi', 'Machado 2009 benzetimi', cvdBlock()));
}
durumlar.title = 'Durumlar';
module.exports = durumlar;
