// Applies the text requests of G2-token-requests.md to a tokens.json: T1 (accentNever as prohibitions), T2
// (accentUsage where and why) and T7 (the decimal comma in coverageBudget.method). T3 (the imza -> vurgu rename) runs only with --rename, because it also needs the code
// changes the request lists (tokens.css, hareket.js). Dry run by default: prints what would change and refuses a field
// whose current text differs from the text the request was written against (merge that one by hand). Writes with --write.
// Usage: node G2-token-apply.js <path/to/tokens.json> [--write] [--rename]
const fs = require('fs');
const file = process.argv[2], write = process.argv.includes('--write'), rename = process.argv.includes('--rename');
if (!file) { console.log('usage: node G2-token-apply.js <tokens.json> [--write] [--rename]'); process.exit(2); }
const raw = fs.readFileSync(file, 'utf8');
const T = JSON.parse(raw);
const log = [], conflicts = [];
// Sets obj[key] from `from` to `to`. Already `to`: nothing to do. Current text not `from`: a conflict, left alone.
function setText(id, obj, key, from, to) {
  const cur = obj[key];
  if (cur === to) return log.push(id + ' already applied');
  if (cur !== from) return conflicts.push(id + ': current text differs from the request: ' + JSON.stringify(cur).slice(0, 160));
  obj[key] = to; log.push(id + ' set');
}
// Appends `add` to obj[key] once (the request was written against `from`).
function append(id, obj, key, from, add) {
  const cur = obj[key];
  if (cur === from + add) return log.push(id + ' already applied');
  if (cur !== from) return conflicts.push(id + ': current text differs from the request: ' + JSON.stringify(cur).slice(0, 160));
  obj[key] = from + add; log.push(id + ' set');
}

/* T1. accentNever as prohibitions (findings 5, 22). */
const NEVER_FROM = [
  'Sayfa zemini kırık beyaz (neutral.2); kart, liste, alt sekme çubuğu, alt sayfa ve diyalog yüzey (neutral.1); başlık çubuğu sayfa zemininde. Seçili ve hover satır da nötr (neutral.5, neutral.4).',
  'accent.1 ile accent.8 arası adımlar: açık mavi zemin, mavi seçim, pastel ve renkli kart yok.',
  'Başlık ve gövde metni ile varsayılan ikonlar (tek istisna panelin anahtar rakamı). Kenarlık ve ayırıcı gece mavisi olmaz; istisnalar: seçim işareti, işaretli kutu, Var ve Sunucuya ulaştı damgalarının çerçevesi.',
  'İkincil, hayalet ve devre dışı düğmeler; bir ekranda ikinci bir dolu gece mavisi düğme.',
  "QR gösterme ekranı: gece mavisi dolgu ve sayı yok, yalnız odak halkası. QR'ın kendi renkleri qr.dark ve qr.light (bkz. Renk).",
  'Kamera ekranı: hedef çerçevesi ve yazılar beyaz, seçili yakınlaştırma beyaz dolgu.',
  'Çevrimdışı şeridi açık gri (neutral.3), bildirimler yüzey (neutral.1): çevrimdışı ne hata ne başarıdır.',
  'Uyarı ve hata: mor ve kırmızı mürekkep. Gece mavisi hiçbir zaman uyarı anlamı taşımaz.',
  'Var ve Sunucuya ulaştı dışında hiçbir durum gece mavisi ailesinde değildir (ton 220 ile 290, kroma 0,04 ve üstü): Görevli mor, Belgeli düzeltme nötr.',
  'Degrade, renkli gölge, süs şeridi, çizim, logo zemini.',
  "Yüksekliği 48 dp'yi aşan dolu alan: tam ekran ya da büyük gece mavisi yüzey yok."
];
const NEVER_TO = [
  'Zeminler: sayfa, kart, liste, alt sekme çubuğu, alt sayfa, diyalog, başlık çubuğu, seçili ve hover satır (hepsi nötr).',
  'Açık adımlar (accent.1 ile accent.8): açık mavi zemin, mavi seçim, pastel ya da renkli kart.',
  'Başlık ve gövde metni, varsayılan ikonlar (tek istisna panelin anahtar rakamı); kenarlık ve ayırıcılar (istisnalar: seçim işareti, işaretli kutu, Var ve Sunucuya ulaştı damgalarının çerçevesi).',
  'İkincil, hayalet ve devre dışı düğmeler; bir ekranda ikinci bir dolu düğme.',
  "QR gösterme ekranı: orada yalnız odak halkası görünür; QR'ın kendi renkleri qr.dark ve qr.light (bkz. Renk).",
  'Kamera ekranı: çerçeve, yazı ve düğmeler beyaz.',
  'Çevrimdışı şeridi ve bildirim zemini (nötr): çevrimdışı ne hata ne başarıdır.',
  'Uyarı ve hata: uyarının mürekkebi mor, hatanınki kırmızı; gece mavisi hiçbir zaman uyarı anlamı taşımaz.',
  'Var ve Sunucuya ulaştı dışındaki durumlar (ton 220 ile 290, kroma 0,04 ve üstü): Görevli mor, Belgeli düzeltme nötr.',
  'Degrade, renkli gölge, süs şeridi, çizim, logo zemini.',
  'Bir telefon düğmesinden (space.phone.dugme) yüksek dolu alan: tam ekran ya da büyük gece mavisi yüzey.'
];
if (!Array.isArray(T.accentNever) || T.accentNever.length !== NEVER_FROM.length) conflicts.push('T1: accentNever does not have ' + NEVER_FROM.length + ' items');
else NEVER_FROM.forEach((f, i) => setText('T1.' + (i + 1), T.accentNever, i, f, NEVER_TO[i]));

/* T2. accentUsage (findings 4, 13, 27, 28; E1, E9). */
const U = T.accentUsage || [];
const role = (i, name) => { if (!U[i] || U[i].role !== name) { conflicts.push('T2: accentUsage[' + i + '] is not "' + name + '"'); return null; } return U[i]; };
let u;
if ((u = role(0, 'Birincil eylem dolgusu'))) setText('T2.0 why', u, 'why', 'Ekranda yapılacak tek işi gösterir; üstünde yazı 12,70:1. Hover accent.10, basılı accent.12.', 'Ekranda yapılacak tek işi gösterir; üstündeki yazının oranı Kontrast bölümünde. Hover accent.10, basılı accent.12.');
if ((u = role(1, 'Odak halkası'))) setText('T2.1 why', u, 'why', 'Sahibin kilidi. Zeminde 6,09:1; yalnız :focus-visible ile görünür, fareyle tıklayana görünmez.', 'Kilit, 6 Ekim 2026. Ne zaman göründüğü Erişilebilirlik, Odak halkası; oranı Kontrast bölümünde.');
if ((u = role(2, 'Satır içi bağlantı'))) setText('T2.2 why', u, 'why', 'Kilitli bağlantı rengi gövde metninden yalnız 2,42:1 ayrılır; bağlantıyı alt çizgi taşır, renk yalnız destekler.', 'Kilitli bağlantı rengi gövde metninden az ayrılır (Kontrast); bağlantıyı alt çizgi taşır, renk yalnız destekler. Panelde tıklama alanı hedef boyundadır (Erişilebilirlik, Hedef boyu).');
if ((u = role(3, 'Seçim işareti'))) append('T2.3 where', u, 'where', '2 px çizgi: seçili liste, seçenek ve tablo satırının solu, etkin sekmenin altı, alt sekme çubuğunda etkin sekmenin üst kenarı, panel gezinmesinde etkin öğenin solu, kod alanında sıradaki kutunun altı', '; seçili liste ve alt sayfa satırındaki onay işareti');
if ((u = role(4, 'İşaretli kontrol'))) setText('T2.4 where', u, 'where', 'Onay kutusunun dolgusu (16 px), açık anahtarın rayı (40 x 24 px)', 'Onay kutusunun dolgusu, açık anahtarın rayı ve topuzundaki onay işareti (ölçüleri: Bileşenler, Anatomi)');
if ((u = role(5, 'Anahtar rakam'))) {
  setText('T2.5 where', u, 'where', 'Panelde ekran başına tek sayı: kafa sayısı girildikten sonra yoklama tablosundaki Var sayısı (plan.html, Kafa sayısı). Telefonda kalan süre birincil metin renginde (neutral.12).', 'Panelde ekran başına tek sayı: yoklama tablosundaki Var sayısı. Telefonda kalan süre birincil metin renginde.');
  setText('T2.5 why', u, 'why', 'Panelde gözün ilk gideceği yer; 42 px, kart yüzeyinde 12,70:1.', 'Panelde gözün ilk gideceği yer (yazı stili rakam: Tipografi; oranı Kontrast bölümünde).');
}
if ((u = role(6, 'Başarı ve Var'))) {
  append('T2.6 where', u, 'where', "Var damgası ve ikonu, 'Sunucuya ulaştı' damgası, başarı ekranındaki kare ve onay işareti, makbuz zaman çizgisinin dolu düğümleri ve çizgisi", ', kod alanında doğru girilen rakamlar, başarı bildiriminin ikonu');
  setText('T2.6 why', u, 'why', 'Sahibin kuralı: başarı gece mavisi ailesinden, yeşil yok. Anlamı onay ikonu ve sözcük taşır.', 'Kilit, 6 Ekim 2026: başarı gece mavisi ailesinden, yeşil yok. Anlamı onay ikonu ve sözcük taşır.');
}
if ((u = role(7, 'İlerleme'))) setText('T2.7 where', u, 'where', 'Yoklama penceresinin kalan süre çubuğu (4 dp), liste yükleme ilerlemesi', 'Yoklama penceresinin kalan süre çubuğu, liste yükleme ilerlemesi');

/* T7. coverageBudget.method: Turkish decimal comma (E1: the one statement of the method, printed in Gece mavisi nerede). */
if (T.coverageBudget && typeof T.coverageBudget.method === 'string') { const cur = T.coverageBudget.method; if (/C en az 0,04/.test(cur)) log.push('T7 already applied'); else if (/C en az 0.04/.test(cur)) { T.coverageBudget.method = cur.replace('C en az 0.04', 'C en az 0,04'); log.push('T7 set'); } else conflicts.push('T7: method text differs: ' + cur.slice(0, 120)); }

/* T3. imza -> vurgu (finding 23), only with --rename. */
if (rename) {
  for (const k of ['duration', 'easing', 'spring']) {
    const list = T.motion && T.motion[k];
    const e = list && list.find(x => x.name === 'imza');
    if (e) { e.name = 'vurgu'; log.push('T3 motion.' + k + ' imza -> vurgu'); }
    else if (list && list.find(x => x.name === 'vurgu')) log.push('T3 motion.' + k + ' already vurgu');
    else conflicts.push('T3: motion.' + k + ' has no imza entry');
  }
  const swap = s => s.replace(/\b(dur|ease|spring)\.imza\b/g, '$1.vurgu');
  for (const p of T.motion.patterns || []) for (const f of Object.keys(p)) if (typeof p[f] === 'string' && swap(p[f]) !== p[f]) { p[f] = swap(p[f]); log.push('T3 pattern ' + p.pattern + ' ' + f); }
  if (typeof T.motion.durationNote === 'string' && /uzun ve imza/.test(T.motion.durationNote)) { T.motion.durationNote = T.motion.durationNote.replace('uzun ve imza', 'uzun ve vurgu'); log.push('T3 durationNote'); }
}

console.log(log.join('\n'));
if (conflicts.length) console.log('CONFLICTS (merge by hand):\n' + conflicts.join('\n'));
if (write && !conflicts.length) {
  // Keep the file's own indentation and line ends.
  const indent = (raw.match(/^\{\r?\n(\s+)"/) || [, ' '])[1];
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(file, JSON.stringify(T, null, indent).replace(/\n/g, eol) + eol);
  console.log('written: ' + file);
} else if (write) { console.log('nothing written'); process.exit(1); }
