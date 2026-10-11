// Applies the requests of F1b-token-requests.md (R1 to R12) to a tokens.json. Dry run by default: prints what would change
// and refuses a field whose current value differs from the one the request was written against (merge it by hand).
// Usage: node F1b-token-apply.js <path/to/tokens.json> [--write]
const fs = require('fs');
const file = process.argv[2], write = process.argv.includes('--write');
if (!file) { console.log('usage: node F1b-token-apply.js <tokens.json> [--write]'); process.exit(2); }
const T = JSON.parse(fs.readFileSync(file, 'utf8'));
const log = [], conflicts = [];
const byName = (list, name) => list.find(s => s.name === name);
const setStr = (id, obj, key, from, to) => {
  const cur = obj[key];
  if (cur === to || (typeof cur === 'string' && typeof to === 'string' && cur.includes(to))) return log.push(id + ' already applied');
  if (typeof from === 'string' && cur !== from && !(typeof cur === 'string' && cur.includes(from))) return conflicts.push(id + ': current value differs: ' + JSON.stringify(cur).slice(0, 120));
  obj[key] = typeof from === 'string' && cur !== from ? cur.replace(from, to) : to;
  log.push(id + ' set');
};
// R1 panel key figure 42/52
setStr('R1', byName(T.type.panel, 'rakam'), 'line', null, 52);
// R2 panel breakpoints
if (!T.space.panel.kirilma) { T.space.panel.kirilma = [
  { ad: 'dar', en: 0, sutun: 4, oluk: 24, kenar: 16, gezinme: 'üst çubuk; gezinme menü düğmesinde' },
  { ad: 'orta', en: 672, sutun: 12, oluk: 24, kenar: 32, gezinme: 'üst çubuk; gezinme çubukta sekme sırası' },
  { ad: 'genis', en: 1280, sutun: 12, oluk: 24, kenar: 32, gezinme: 'kenar çubuğu, 232 px' }]; log.push('R2 set'); } else log.push('R2 already present');
// R12 panel code style
if (!byName(T.type.panel, 'kod-03')) { const i = T.type.panel.findIndex(s => s.name === 'kod-02'); T.type.panel.splice(i + 1, 0, { name: 'kod-03', size: 22, line: 28, weight: 500, tracking: 0, use: 'Projeksiyon sayfasındaki eşleştirme kodu (Plex Mono)' }); log.push('R12 set'); } else log.push('R12 already present');
// R3 to R9 text
setStr('R3', byName(T.type.phone, 'rakam'), 'use', 'Anahtar rakam: yoklamanın kalan süresi, birincil metin renginde (ekran başına bir)', 'Anahtar rakam: yoklamanın kalan süresi (ekran başına bir)');
setStr('R4', T.accentNever, 0, 'Sayfa, kart, liste, başlık çubuğu, alt sekme çubuğu, alt sayfa ve diyalog zeminleri: hepsi kırık beyaz ya da gri. Seçili ve hover satır da nötr (neutral.5, neutral.4).', 'Sayfa zemini kırık beyaz (neutral.2); kart, liste, alt sekme çubuğu, alt sayfa ve diyalog yüzey (neutral.1); başlık çubuğu sayfa zemininde. Seçili ve hover satır da nötr (neutral.5, neutral.4).');
setStr('R5', T.accentNever, 6, 'bildirimler beyaz yüzey', 'bildirimler yüzey (neutral.1)');
setStr('R6', T.accentUsage[4], 'where', '(40x24)', '(40 x 24 px)');
setStr('R7', T.accentUsage[5], 'where', '(plan.html#kararlar-kafa-sayisi)', '(plan.html, Kafa sayısı)');
setStr('R8', T.accentUsage[5], 'why', '42 px, zeminde 11,63:1', '42 px, kart yüzeyinde 12,70:1');
setStr('R9', T.accentUsage[7], 'why', 'yüzde birin altında', "%1'in altında");
// R10, R11: prose no section reads
const RULES = [
  "Büyük harf dönüşümü yok: düğme, sekme ve etiketler cümle düzeninde. AKSİS sonuçları (DEVAMLI, DEVAMSIZ, KARAR BEKLİYOR) metin olarak toLocaleUpperCase('tr-TR') ile hazırlanır; telefonda textTransform kullanılmaz, webde lang=\"tr\" zorunlu.",
  'Satır oranı kayabilen metinde en az 1,25 (Ğ şapkası ve ş, ç kuyrukları komşu satıra değmez); tek satırda duran etiket ve anahtar rakamda en az 1,2. Paragraf satırı en çok 70 karakter.'
];
if (JSON.stringify(T.type.rules) === JSON.stringify(RULES)) log.push('R10 already applied'); else { T.type.rules = RULES; log.push('R10 set'); }
if ('note' in T.durumlar) { delete T.durumlar.note; log.push('R11 note deleted'); }
console.log(log.join('\n'));
if (conflicts.length) { console.log('CONFLICTS (merge by hand):\n' + conflicts.join('\n')); }
if (write && !conflicts.length) { fs.writeFileSync(file, JSON.stringify(T, null, 1) + '\n'); console.log('written: ' + file); }
else if (write) { console.log('nothing written'); process.exit(1); }
