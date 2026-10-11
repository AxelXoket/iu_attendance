// Renders the research file (tasarim-arastirmasi.html) from research/, verify/ and lib/ JSON, void.json, the token
// file (variants/A2/tokens.json and its check output), trace.json, the design document and two hand-written parts:
// the intro (research-intro.html) and the editorial layer NOTES below.
// Usage: node research2html.js <out.html> [--intro intro.html] [--trace trace.json] [--design tasarim.html]
//          [--tokens tokens.json] [--check tokens.check.json] [--repo <dir with plan.html, teknik.html>] [--css extra.css]
//        node research2html.js --test   (runs the built-in checks of the text rules and helpers, then exits)
//
// One source per value (decision E1, fix round 2): this file never retypes a design value or a count. Counts in the
// intro and the header are computed here ({{n:...}} placeholders); design values come from the token file
// ({{contrast:...}}, {{budget:...}}, {{cvd:...}}, ...); the traceability table is exactly the "sources" list of the
// token file (decision E11). NOTES holds the editorial layer only: display corrections, lock notes, departures, open
// question states. The research data itself is never changed; every correction names the exact text it replaces.
//
// The build fails (exit 1) on: a banned yellow or green color named by a live recommendation, a finding or
// recommendation that names a banned color without a lock decision, a correction whose text is gone, an open question
// without a state, a forum quote of 15 or more words, a signal without a date, a store review without its saved copy,
// a verifier note that is neither shown nor counted, a short verifier note that drops a fact, a stale trace.json, an
// unresolved placeholder, a dash character, a banned word or a broken internal link.
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const D = __dirname;
const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const has = f => !!f && fs.existsSync(f);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const fold = s => String(s).replace(/[İI]/g, 'i').replace(/ı/g, 'i').toLowerCase().replace(/[._\-:,]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => String(s || '').trim().split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
const num = n => Number(n).toLocaleString('tr-TR');
const dec = (x, d = 2) => Number(x).toFixed(d).replace('.', ',');
const sha = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trDate = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} ${AYLAR[+m[2] - 1]} ${m[1]}` : String(d || ''); };
const errors = [], warnings = [];
const fail = m => errors.push(m);
const warn = m => warnings.push(m);

// ---------------------------------------------------------------------------------------------------------------
// Quoted spans ('...', "...", “...”). A single quote opens after whitespace or ([:;,/ and closes before whitespace,
// punctuation or a Turkish case suffix, so apostrophes inside English text (it's, don't) stay inside the quote.
const SUF = "(?:ı|i|u|ü|a|e|y[ıiuüae]|n[ıiuüae]|s[ıiuü]|d[ae]|t[ae]|d[ae]n|t[ae]n|n[ıiuü]n|[ıiuü]n|l[ae]r|l[ae]r[ıi]|y?l[ae]|d[ıiuü]r|t[ıiuü]r|d[ae]ki|t[ae]ki|nd[ae]n?|[ıiuü]n[ıiuüae]|[ıiuü]nd[ae]n?)";
const CLOSE = new RegExp("^'(?:" + SUF + ")?(?=$|[\\s.,;:)!?\\]/])", 'u');
function quotesIn(t) {
  const out = [];
  for (const m of t.matchAll(/"([^"]+)"|“([^”]+)”/g)) out.push({ start: m.index, end: m.index + m[0].length, words: words(m[1] || m[2]) });
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== "'" || !/[\s(\[:;,/]/.test(i ? t[i - 1] : ' ') || !/\S/.test(t[i + 1] || '')) continue;
    let j = i + 1;
    for (; j < t.length; j++) if (t[j] === "'" && /\S/.test(t[j - 1]) && CLOSE.test(t.slice(j))) break;
    if (j >= t.length) continue;
    out.push({ start: i, end: j + 1, words: words(t.slice(i + 1, j)) });
    i = j;
  }
  // A quote inside another quote ('he said "x"') belongs to the outer one; overlapping spans would corrupt the
  // index arithmetic of the callers, so only outermost, non-overlapping spans are returned.
  const kept = [];
  for (const q of out.sort((a, b) => a.start - b.start || b.end - a.end)) if (!kept.length || q.start >= kept[kept.length - 1].end) kept.push(q);
  return kept;
}
// Runs fn on the text outside quotes, `code` and links; the held parts come back unchanged.
function outside(input, fn) {
  let s = String(input ?? '');
  const keep = [];
  const hold = m => `\u0001${keep.push(m) - 1}\u0002`;
  for (const q of quotesIn(s).reverse()) s = s.slice(0, q.start) + hold(s.slice(q.start, q.end)) + s.slice(q.end);
  s = s.replace(/`[^`]*`/g, hold).replace(/https?:\/\/[^\s)]+/g, hold);
  s = fn(s);
  return s.replace(/\u0001(\d+)\u0002/g, (_, i) => keep[+i]).replace(/\u0001(\d+)\u0002/g, (_, i) => keep[+i]);
}

// Turkish number style for prose (finding 2 of fix round 1, finding 19 of round 2): decimal comma where the number is
// plainly a decimal (contrast ratio, percentage, measured value after a known marker, value with a unit, value below
// 1), thousands with a dot (English '18,000+' and '876,576 bayt' become '18.000+' and '876.576 bayt'), 'milyon' for
// an English 'M', and 'X ile Y' for year, time and unit ranges. Quotes, code, links, CSS functions, color notations
// and versions stay untouched. Font and design system names are left out on purpose: in this data a decimal after
// them is a measurement (Geist 0.086, Inter 0.5459), except Inter 4.x, which the version rule below holds by itself.
const VERSION_WORDS = 'React Native|RN|React|WCAG|iOS|iPadOS|macOS|watchOS|visionOS|tvOS|Android|Chrome|Edge|Firefox|Safari|Opera|Expo|SDK|DTCG|Format|Apache|Tailwind|Node|Vite|Dictionary|Terrazzo|Reanimated|reanimated|worklets|gesture-handler|sürüm|sürümü|sürümünde|sürümüne|v|ICU|CLDR|Unicode|API|One UI|Lottie|Rive|motion|Motion|Storybook|NativeWind|Unistyles|TypeScript|Swift|Kotlin|Xcode|HTML|CSS|ES|Baseline|Lighthouse|axe-core|Vitest|Playwright|Maestro|HyperOS|MIUI|EMUI|ColorOS|Windows|Ubuntu';
const VER = "\\d+(?:\\.\\d+)+(?:\\+|'[a-zçğıöşü]+)?";
const MARKERS = '(?:b\\*|a\\*|\\bLc|\\bL|\\bC|\\bH|\\bY|\\bkontrast\\S*|\\bkroma\\S*|\\bKroma\\S*|\\bton|\\btonu|\\btonda|\\btonunu|\\buzaklı\\S*|\\boran\\S*|\\bsönüm\\S*|\\başma\\S*|\\byüksekliği|\\bdeutan\\S*|\\bprotan\\S*|\\btritan\\S*|\\bdöteranopi\\S*|\\bprotanopi\\S*|\\btritanopi\\S*|\\bgörüşte|\\beşi\\S*|\\bortalama|\\byaklaşık|\\byüzde|\\beksi|\\bartı)';
function trNumbers(input) {
  let s = String(input ?? '');
  if (!/\d/.test(s)) return s;
  const keep = [];
  const hold = m => `\u0001${keep.push(m) - 1}\u0002`;
  for (const q of quotesIn(s).reverse()) s = s.slice(0, q.start) + hold(s.slice(q.start, q.end)) + s.slice(q.end);
  s = s.replace(/`[^`]*`/g, hold)
    .replace(/https?:\/\/[^\s)]+/g, hold)
    .replace(/[\w@./-]+\.(?:com|org|io|dev|net|ms|app|design|tr)\b[^\s)]*/g, hold)
    // English thousands ('4,153,392 bayt', '18,000+') and millions ('845.3M'); the result is held so the decimal
    // rules below never read its dot as a decimal point.
    .replace(/(?<![\d.,])([1-9]\d{0,2})((?:,\d{3})+)(?![\d])(?!,\d)/g, m => hold(m.replace(/,/g, '.')))
    .replace(/\b(\d+)\.(\d)M\b/g, (m, a, b) => hold(`${a},${b} milyon`))
    .replace(/\b[a-zA-Z][\w-]*\([^()]*\)/g, hold)
    .replace(/\b(?:oklch|oklab|lab|lch)\s+-?\d[\d.\s/-]*/gi, hold)
    .replace(/\b\d+(?:\.\d+){2,}(?:\.x)?\b/g, hold)
    .replace(/\b\d+\.\d+\.x\b/g, hold)
    .replace(new RegExp(`(?:React Native|RN|React)(?:'[a-zçğıöşü]+)?\\s?${VER}(?:(?:\\s(?:ile|ve|ya da|veya)\\s|,\\s|\\s?-\\s?|\\s)${VER})*`, 'g'), hold)
    .replace(new RegExp(`(?:${VERSION_WORDS})\\s?${VER}(?:(?:\\s(?:ile|ve|ya da|veya)\\s|,\\s|\\s?-\\s?)${VER})*(?![\\d.]*:\\d)`, 'g'), hold)
    .replace(new RegExp(`sürüm[a-zçğıöşü]*\\s(?:olan\\s)?${VER}`, 'g'), hold)
    .replace(/\b\d+(?:\.\d+)+-(?:stable|rc|beta|alpha|canary|next)\b/g, hold)
    .replace(/\bInter\s4(?:\.\d+)+/g, hold)
    .replace(/(?:Native|RN)\s[a-zçğıöşü]+\s\(\d+(?:\.\d+)+\)/g, hold)
    .replace(/\b\d*\.?\d+m?s\s(?:ease|linear|cubic|step)\S*/g, hold)
    .replace(/[@\w-]+@\d+(?:\.\d+)*/g, hold)
    .replace(/(?:[<>~^]=?|==)\s?\d+(?:\.\d+)+/g, hold)
    .replace(/\b(?:Double|Float|CGFloat|TimeInterval|Int)\s?=\s?-?\d+(?:\.\d+)?/g, hold)
    .replace(/\{[^{}]*\}/g, hold)
    .replace(/[([]\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)+\s*[)\]]/g, hold)
    // A list of contrast ratios ('15.15, 12.31, 17.39:1') is converted as a whole before lists are held.
    .replace(/(?:\d+\.\d+,\s)+\d+\.\d+(?=:1\b)/g, m => hold(m.replace(/(\d)\.(\d)/g, '$1,$2')))
    .replace(/-?\d+(?:\.\d+)?(?:,\s?-?\d+(?:\.\d+)?){2,}/g, hold);
  s = s.replace(/\b((?:19|20)\d\d)-((?:19|20)\d\d)\b/g, '$1 ile $2')
    .replace(/\b(\d{1,2}:\d\d)-(\d{1,2}:\d\d)\b/g, '$1 ile $2')
    .replace(/\b(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?=\s?(?:ms|sn|saniye|dakika|px|dp|pt|%|yaş|gün|kez|kat)(?![A-Za-z]))/g, '$1 ile $2');
  s = s.replace(/(\d)\.(\d+)(?=:1\b)/g, '$1,$2')
    .replace(/%(-?\d+)\.(\d+)/g, '%$1,$2')
    .replace(new RegExp(`(${MARKERS}\\s\\(?-?\\d+)\\.(\\d+)(?!\\d|\\.\\d)`, 'g'), '$1,$2')
    .replace(/(\d)\.(\d{1,4})(?=\s?(?:ms|sn|px|dp|pt|mm|cm|kB|KB|x|kat|yıldız|puan|derece|b\*)(?![A-Za-z]))/g, '$1,$2')
    .replace(/(^|[\s(\[;:=~/])(-?0)\.(\d+)(?!\d|\.\d|\.x|f\b)/g, '$1$2,$3');
  // A number paired with an already converted one takes the same style, in both orders ('108.3 ve 168,4 derece',
  // 'b* -6,8 ile -12.68').
  for (let k = 0; k < 3; k++) s = s.replace(/(?<![\d.])(-?\d+)\.(\d{1,4})(?=(?:\s(?:ve|ile|ya da|veya)\s|,\s|\/)-?\d+,\d)/g, '$1,$2')
    .replace(/(\d,\d+(?:\s(?:ve|ile|ya da|veya)\s|\/)-?)(\d+)\.(\d{1,4})(?![\d]|\.\d)/g, '$1$2,$3');
  return s.replace(/\u0001(\d+)\u0002/g, (_, i) => keep[+i]).replace(/\u0001(\d+)\u0002/g, (_, i) => keep[+i]);
}

// Apostrophe before a Turkish case suffix (finding 19 of round 2): one research angle wrote 'Vite nin', '2026 dan',
// 'iOS ta'. A suffix that stands as its own word after a number or a known product name gets its apostrophe back.
// 'da' and 'de' are left alone ('SDK 57 de' can be the conjunction), and so is 'ya da'.
const AP_NAMES = 'iOS|iPadOS|Vite|Skia|Firefox|Restyle|zeego|Terrazzo|Moti|QR|React Native|Chrome|Safari|Expo|Reanimated|Unistyles|NativeWind|Sonner|Tailwind|Storybook|Figma|Lottie|Rive|GitHub|npm|API|SDK|Base UI|Motion|commit|transition';
const AP_SUF = '(?:ten|tan|den|dan|nin|nın|nun|nün|te|ta|ye|ya|yi|yı|e|a|ı|i|u|ü|ın|in|un|ün|nda|nde|ndan|nden|si|sı|sini|sını|leri|ları|ler|lar)';
const AP_RE = new RegExp(`(?<=(?:\\d|\\b(?:${AP_NAMES})))\\s(${AP_SUF})(?=[\\s,.;:)!?]|$)(?!\\sda\\b)`, 'gu');
const trApostrophe = s => outside(s, t => t.replace(AP_RE, "'$1"));

// The spoken last word of a number decides its Turkish case suffix: 14'ü, 97'de, 106'da, 172'sinin.
const LAST_WORD = n => {
  n = Math.abs(Math.trunc(n));
  const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'], tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  if (n === 0) return 'sıfır'; if (n % 10) return ones[n % 10]; if (n % 100) return tens[(n % 100) / 10];
  if (n % 1000) return 'yüz'; if (n % 1e6) return 'bin'; if (n % 1e9) return 'milyon'; return 'milyar';
};
function ek(n, kind) {
  const w = LAST_WORD(n), vow = [...w].filter(c => 'aeıioöuü'.includes(c)), v = vow[vow.length - 1], last = w[w.length - 1];
  const front = 'eiöü'.includes(v), round = 'oöuü'.includes(v), vowelEnd = 'aeıioöuü'.includes(last), hard = 'fstkçşhp'.includes(last);
  const I = front ? (round ? 'ü' : 'i') : (round ? 'u' : 'ı'), E = front ? 'e' : 'a', d = hard ? 't' : 'd';
  const poss = vowelEnd ? `s${I}` : I;
  const forms = { de: `${d}${E}`, den: `${d}${E}n`, e: vowelEnd ? `y${E}` : E, i: poss, in: vowelEnd ? `n${I}n` : `${I}n`, inin: `${poss}n${I}n`, inde: `${poss}nd${E}` };
  if (!forms[kind]) throw new Error(`unknown suffix ${kind}`);
  return "'" + forms[kind];
}
const count = (n, suf) => num(n) + (suf ? ek(n, suf) : '');

// Short verifier note for a 'doğrulandı' verdict (finding 12 of round 2): the note keeps only sentences that add a
// fact the record above does not already show (a number or a hex value it lacks) or that say what the source does not
// support. Dates, years and long ids (review numbers, HN items) are metadata, not facts. Quotes alone add nothing: a
// confirmed record already says the same in Turkish.
const MONTHS = [...AYLAR, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DATE_RE = new RegExp(`\\b\\d{1,2}\\s+(?:${MONTHS.join('|')})\\s+\\d{4}\\b|\\b(?:${MONTHS.join('|')})\\s+\\d{4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b`, 'giu');
// Facts are compared as tokens cut by one tokenizer from both texts, so '.5x', '14..32' and '3,0,0,1' read the same
// on both sides.
function factsOf(s) {
  const f = new Set();
  for (const m of String(s).matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) f.add(m[0].toLowerCase());
  const t = String(s).replace(/https?:\/\/\S+/g, ' ').replace(/#[0-9a-fA-F]{3,6}\b/g, ' ').replace(DATE_RE, ' ');
  for (const m of t.matchAll(/\d+(?:[.,]\d+)*/g)) { const n = m[0].replace(/,(?=\d)/g, '.'); if (/^(19|20)\d\d$/.test(n) || /^\d{6,}$/.test(n)) continue; f.add('n:' + n); }
  return [...f];
}
const CAVEAT = /(?<![\p{L}])(ama|ancak|fakat|yalnız|yalnızca|sadece|değil|yok|eksik|farklı|fark|eski|güncel|hâlâ|artık|oysa|aslında|yanlış|hata|düzelt|iddia|görülmedi|bulunamadı|açılamadı|tutmuyor|uyuşmuyor)/iu;
const sentencesOf = s => String(s || '').split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ'"“(\d])/u).filter(x => x.trim());
function shortNote(note, recText) {
  const known = new Set(factsOf(recText)), ek = [];
  for (const s of sentencesOf(note)) {
    const novel = factsOf(s).filter(f => !known.has(f));
    if (novel.length || (CAVEAT.test(s) && !/zaten/.test(s))) ek.push(s);
  }
  // Zero fact loss: every fact of the full note is in the record or in a kept sentence.
  const kept = new Set(ek.flatMap(factsOf));
  const lost = factsOf(note).filter(f => !known.has(f) && !kept.has(f));
  return { ek, lost };
}

if (argv[0] === '--test') {
  const cases = [
    ['kontrast 1.09:1 ve 4.5:1', 'kontrast 1,09:1 ve 4,5:1'],
    ['ortalama 2.05 yıldız', 'ortalama 2,05 yıldız'],
    ['0.002 ile 0.007 arası', '0,002 ile 0,007 arası'],
    ['b* -2.15, tonu 264.5', 'b* -2,15, tonu 264,5'],
    ['yüzde 1.5 sapma, %9.48 aşma', 'yüzde 1,5 sapma, %9,48 aşma'],
    ['1.5 katı, 2.49 px, 0.5x', '1,5 katı, 2,49 px, 0,5x'],
    ['2024-2026 arası, 10:00-11:50, 100-500 ms', '2024 ile 2026 arası, 10:00 ile 11:50, 100 ile 500 ms'],
    ['React Native 0.86 ve iOS 26.1, WCAG 2.2', 'React Native 0.86 ve iOS 26.1, WCAG 2.2'],
    ['react-native-worklets 0.10.1, Expo SDK 57.0.26', 'react-native-worklets 0.10.1, Expo SDK 57.0.26'],
    ['haftalık 842.955 indirme, 845.3M', 'haftalık 842.955 indirme, 845,3 milyon'],
    ["'a range of 100-400 ms' ve 'ratio 4.5:1'", "'a range of 100-400 ms' ve 'ratio 4.5:1'"],
    ['cubic-bezier(0.2, 0, 0.38, 0.9) ve oklch(0.97 0.006 260)', 'cubic-bezier(0.2, 0, 0.38, 0.9) ve oklch(0.97 0.006 260)'],
    ['oklch 0.9668 0.0058 264.5', 'oklch 0.9668 0.0058 264.5'],
    ['`opacity 0.7s` ve https://x.org/a/0.5', '`opacity 0.7s` ve https://x.org/a/0.5'],
    ['saat 17.30\'da, DTCG 2025.10', 'saat 17.30\'da, DTCG 2025.10'],
    ['FastSpatial 0.9f ve 0.9.x', 'FastSpatial 0.9f ve 0.9.x'],
    ['@carbon/themes@11.82.0 ve Safari 16.4+', '@carbon/themes@11.82.0 ve Safari 16.4+'],
    ['ton farkları (108.3 ve 168.4 derece)', 'ton farkları (108,3 ve 168,4 derece)'],
    ['b* eksi (-2.15), en yakına 4.06 b* uzakta', 'b* eksi (-2,15), en yakına 4,06 b* uzakta'],
    ['Reanimated 4.3 ile 4.5 arası', 'Reanimated 4.3 ile 4.5 arası'],
    ['expressive (0.4, 0.14, 0.3, 1) ve [0.25, 0.52]', 'expressive (0.4, 0.14, 0.3, 1) ve [0.25, 0.52]'],
    ['StandardAccelerate 0.3,0,1,1; beyaz metin 15.15, 12.31, 17.39:1', 'StandardAccelerate 0.3,0,1,1; beyaz metin 15,15, 12,31, 17,39:1'],
    ['react-native >=0.81, extraBounce: Double = 0.0;', 'react-native >=0.81, extraBounce: Double = 0.0;'],
    ['ayar = { DURATION: 0.5, EASE: x } ve kroma (0.0058)', 'ayar = { DURATION: 0.5, EASE: x } ve kroma (0,0058)'],
    ['React Native 0.81 ile 0.86 (Expo SDK 54), örnek 0.125s ease-out', 'React Native 0.81 ile 0.86 (Expo SDK 54), örnek 0.125s ease-out'],
    ["React Native'i 0.85'ten 0.86'ya, RN 0.85'ten 0.86'ya; sürümü olan 0.86-stable; RN sürümünü 0.81'e", "React Native'i 0.85'ten 0.86'ya, RN 0.85'ten 0.86'ya; sürümü olan 0.86-stable; RN sürümünü 0.81'e"],
    ["yavaşlama oranı iOS'ta 0.998, Android'de 0.985", "yavaşlama oranı iOS'ta 0,998, Android'de 0,985"],
    ['Geist 0.086/0.163; Manrope 0.042/0.042. Inter 4.0 ve Inter 0.5459', 'Geist 0,086/0,163; Manrope 0,042/0,042. Inter 4.0 ve Inter 0,5459'],
    ['dik 876,576 bayt, figtree 62,712, publicsans 103,316', 'dik 876.576 bayt, figtree 62.712, publicsans 103.316'],
    ['4,153,392 bayt ve 18,000+ katılımcı, 1,000 ms', '4.153.392 bayt ve 18.000+ katılımcı, 1.000 ms'],
    ['b* -6,8 ile -12.68 arasına', 'b* -6,8 ile -12,68 arasına'],
    ['en düşük ikon kontrastı 3.14', 'en düşük ikon kontrastı 3,14'],
    ['#DCE0E5 / #F0F4F9 = 1.20:1, ^1.2.3 ve >=0.81', '#DCE0E5 / #F0F4F9 = 1,20:1, ^1.2.3 ve >=0.81'],
    ['WCAG 21.00:1 ve WCAG 2.2', 'WCAG 21,00:1 ve WCAG 2.2'],
  ];
  let bad = 0;
  for (const [a, b] of cases) { const got = trNumbers(a); if (got !== b) { bad++; console.log(`FAIL trNumbers(${JSON.stringify(a)}) = ${JSON.stringify(got)}, want ${JSON.stringify(b)}`); } }
  const q = quotesIn("Apple: 'Let people cancel motion. As much as possible' ve Carbon'un 'it's fine' notu");
  if (q.length !== 2 || q[0].words !== 8 || q[1].words !== 2) { bad++; console.log('FAIL quotesIn', JSON.stringify(q)); }
  const nested = quotesIn("not: 'X dedi \"iç alıntı 0.5\" ve çıktı' sonra 0.25 kat");
  if (nested.length !== 1 || trNumbers("not: 'X dedi \"iç alıntı 0.5\" ve çıktı' sonra 0.25 kat") !== "not: 'X dedi \"iç alıntı 0.5\" ve çıktı' sonra 0,25 kat") { bad++; console.log('FAIL nested quotes', JSON.stringify(nested)); }
  const apos = [
    ['Mayıs 2026 dan beri, zeego nun son sürümü, Vite nin desteği', "Mayıs 2026'dan beri, zeego'nun son sürümü, Vite'nin desteği"],
    ['React 19.3 te kararlı, iOS ta çalışmaz, API sini koruyan', "React 19.3'te kararlı, iOS'ta çalışmaz, API'sini koruyan"],
    ['200 ya da 250 ms, SDK 57 de Android, Apple da', '200 ya da 250 ms, SDK 57 de Android, Apple da'],
    ["'About 1 in 12 men' ve 4.5 e, `x 2 in`", "'About 1 in 12 men' ve 4.5'e, `x 2 in`"],
  ];
  for (const [a, b] of apos) { const got = trApostrophe(a); if (got !== b) { bad++; console.log(`FAIL trApostrophe(${JSON.stringify(a)}) = ${JSON.stringify(got)}, want ${JSON.stringify(b)}`); } }
  const eks = [[172, 'inin', "'sinin"], [14, 'i', "'ü"], [97, 'de', "'de"], [106, 'de', "'da"], [66, 'i', "'sı"], [10, 'i', "'u"], [3, 'de', "'te"], [40, 'de', "'ta"], [2, 'in', "'nin"], [1000, 'i', "'i"], [100, 'i', "'ü"], [6, 'e', "'ya"], [5, 'e', "'e"], [0, 'i', "'ı"], [53, 'den', "'ten"], [15, 'inde', "'inde"], [26, 'inde', "'sında"], [4, 'inde', "'ünde"]];
  for (const [n, k, want] of eks) { const got = ek(n, k); if (got !== want) { bad++; console.log(`FAIL ek(${n}, ${k}) = ${got}, want ${want}`); } }
  const rec = 'Kaynak 4.5:1 ister; #1A2030 ölçüldü, 12 ms.';
  const sn = shortNote("Sayfada 'ratio 4.5:1' birebir. Ek olarak 42 ms görüldü. Kaynakta sayı yok. 12 Mart 2025 tarihli, 45140619 numaralı yorum.", rec);
  if (sn.ek.length !== 2 || !/42 ms/.test(sn.ek[0]) || !/sayı yok/.test(sn.ek[1]) || sn.lost.length) { bad++; console.log('FAIL shortNote', JSON.stringify(sn)); }
  const sn2 = shortNote('Değerler #1a2030 ve 0,089 aynen.', 'Bulgu #1A2030 ve 0.089 diyor.');
  if (sn2.ek.length || sn2.lost.length) { bad++; console.log('FAIL shortNote normalization', JSON.stringify(sn2)); }
  const total = cases.length + 2 + apos.length + eks.length + 2;
  console.log(bad ? `${bad} of ${total} text rule checks failed` : `${total} text rule checks passed`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------------------------------------------------------
// Editorial layer (fix rounds 1 and 2, 6 October 2026). Every entry points at a record that must exist and every
// correction names the exact text it replaces, so a note can never silently fall off or land on changed text.
// Inline markup: [[#anchor|text]] links inside this file; tasarim.html#id becomes a link to the design document;
// plan.html#id and teknik.html#id are shown as code (checked against the repository copy when it is found).
// Placeholders ({{...}}) take design values from the token file.
const NOTES = {
  // Display corrections: '<record or angle id>.<field>' or '<angle id>.oq.<index>' -> [old, new] pairs. An old text
  // of the form '*sha1:<12 hex>' replaces the whole field and holds only while the field still has that hash.
  fix: {
    'R01.summary': [
      ['(Cream 21.83, Linen 6.02, Bone white 4.19)', '(b*: Cream 21,83, Linen 6,02, Bone white 4,19)'],
      ['Apple (#F2F2F7), IBM Carbon (Cool Gray 10, #f2f4f8), GitHub Primer (#f6f8fa) ve Tailwind slate ile gray açık yüzeylerde 0.002 ile 0.007 arası küçük bir mavi kroma kullanıyor;', "Apple (#F2F2F7), GitHub Primer (#f6f8fa) ve Tailwind slate ile gray açık yüzeylerde 0,002 ile 0,007 arası küçük bir mavi kroma kullanıyor; #F2F4F8 IBM'in paletinde Cool Gray 10 olarak var, Carbon temaları onu zemin yapmaz;"],
      ["CSS midnightblue'nun tonu da 272.8", "CSS midnightblue'nun tonu da 272,8"],
      ["yani IBM Carbon Cool Gray 10'un birebir aynısı.", 'IBM paletindeki Cool Gray 10 ile aynı değer.'],
      ["tek gösterge olan form kenarlıkları için #7D8497 tüm açık zeminlerde 3:1'i geçiyor.", "tek gösterge olan form kenarlıkları için #7D8497 en açık üç zeminde 3:1'i geçiyor, hover ve seçili zeminde geçmiyor (R01-K04)."],
    ],
    'R01-K02.reasons': [["Değer IBM Carbon Cool Gray 10 ile aynı ve Apple'ın #F2F2F7'sine çok yakın açıklıkta (L 0.9668 ile 0.9626), yani sahada denenmiş bir bölgede.", "Değer büyük bir sistemin paletinde yer alıyor (IBM Cool Gray 10; Carbon temaları onu zemin yapmaz); sahada denenmişliğin dayanağı Apple'ın #F2F2F7'sine yakınlığı (L 0,9668 ile 0,9626)."]],
    'R02.summary': [
      [", İÜ yeşilini vurgu yapmak ise 'geldi' ve başarı yeşiliyle karışırdı.", "; İÜ'nün sarısı ve yeşili kilit gereği arayüze hiç girmez."],
      [', seçili zemin 3. adım; tüm oranlar', '; seçili zemin rolü sonradan kalktı (R02-K05); tüm oranlar'],
      ['Bağlantı rengi gövde metninden yalnızca 2.38:1 ayrıldığı için', 'Bağlantı rengi kilitli gövde metninden (text.primary) yalnızca {{contrast:text.link:text.primary}} ayrıldığı için'],
      ['Başarı, uyarı, hata ve bilgi için katı, metin, hafif zemin ve kenar değerleri hesaplandı; altı yoklama durumunun renkleri 9216 aday küme içinden protan, deutan ve tritan simülasyonlarında en iyi ayrılan küme olarak bir betikle seçildi (en küçük OKLab uzaklığı 0.077).', "Başarı, uyarı, hata ve bilgi değerleri ile altı yoklama durumunun betikle seçilen renk kümesi yeşil ve kehribar içerdiği, durum adları da tahmin olduğu için 6 Ekim 2026 kilidiyle kalktı (R02-K08, R02-K09); gerçek durumların ölçümü tasarim.html#durumlar bölümünde."],
      ['Üç alternatif alt ton (Oxford mürekkebi, Prusya laciverti, gece indigosu) aynı kurallarla ölçüldü ve sahibin yan yana görüp seçmesine hazır.', 'Üç alternatif alt ton da ölçüldü; palet kilitlendiği için gösterilmez (R02-K07).'],
    ],
    'R02-K10.recommendation': [[' Kurumla görsel bağ istenirse Prusya laciverti alternatifi seçilebilir.', '']],
    'R02-F07.evidence': [['#0F62FE bizim zemin #F3F5F9 üzerinde', '#0F62FE o günkü aday zemin #F3F5F9 üzerinde']],
    'R02-F20.evidence': [
      ['En iyi küme: geldi #399D57 oklch(0.62 0.14 150), gelmedi #9E000E oklch(0.44 0.18 27), geç kaldı #AB5E00 oklch(0.56 0.15 60), izinli #004981 oklch(0.40 0.13 250), gönderilmeyi bekliyor #5A5E65 oklch(0.48 0.012 262), kendi beyanı #9468C2 oklch(0.60 0.14 305).', 'En iyi kümenin altı değeri kilit gereği gösterilmez (R02-K09).'],
      ['gelmedi #811E1B ile geç kaldı #6B3900 deutanda 0.014', 'gelmedi ile geç kaldı deutanda 0.014'],
    ],
    'R02-F20.note': [['İlk kümede geldi #218041 ile gelmedi #C22826 deutan 0.046, bekliyor #6D727B ile kendi beyanı #008287 deutan 0.023.', 'İlk kümede geldi ile gelmedi deutan 0.046, bekliyor ile kendi beyanı deutan 0.023 (değerleri kilit gereği gösterilmez).']],
    'R02-K04.reasons': [['yalnızca 2.38:1 ayrılıyor;', 'yalnızca 2.38:1 ayrılıyor (kilitli gövde metniyle {{contrast:text.link:text.primary}});']],
    'R03.summary': [["hesabımıza göre CSS 'ease' eğrisi Material standard yaylarını 150, 200 ve 300 ms'de yaklaşık yüzde 1.5 sapmayla taklit ediyor, böylece telefon ve panel aynı hareket dilini konuşuyor.", "hesabımıza göre CSS 'ease' eğrisi Material standard yaylarını yaklaşık yüzde 1,5 sapmayla ancak en uygun sürelerde (143, 202 ve 308 ms) taklit ediyor; 150, 200 ve 300 ms'de sapma yüzde 3,11, 1,75 ve 2,81."]],
    'R04.summary': [['Web tarafında @starting-style (Baseline 2024) ve belge içi View Transitions (Baseline 2025) kullanılabilir; belgeler arası geçiş ve height auto animasyonu ise tüm tarayıcılarda yok, ilerleyen iyileştirme olarak kalmalı.', 'Web tarafında @starting-style (Baseline 2024) ve belge içi View Transitions (Baseline 2025) panelin alt sınır tarayıcılarında (teknik.html#panel-cati) yok; bunlar, belgeler arası geçiş ve height auto animasyonu yalnız ilerleyici iyileştirme olarak kalmalı.']],
    'R05.summary': [['Önerim tüm kutu ve kontrollerde 0 köşe, yalnızca radyo düğmesi, durum noktası ve yükleniyor halkasında tam daire; 2 px kullanılmamalı, çünkü aynı değer 1x masaüstünde köşegende 0.83 px, 3x telefonda 2.49 px içeri girer ve iki platformda farklı görünür.', "Önerim tüm kutu ve kontrollerde 0 köşe. 2 px'i reddeden piksel hesabı doğrulamada düştü (fiziksel içe girme telefonda masaüstünden küçük: 0,13 mm ile 0,22 mm); 0 köşe kararı brife ve tutarlılığa dayanır. Tam daireli radyo düğmesi, durum noktası ve yükleniyor halkası da tasarımda yok: seçim onay işareti ve seçim çizgisiyle, yükleniyor üç kareyle gösterilir (tasarim.html#k-loading)."]],
    'R06.summary': [
      ['Ana aile olarak Inter 4 öneriliyor:', "Bu açı ana aile olarak Inter 4'ü önerdi; tasarım bunun yerine IBM Plex Sans ve Plex Mono'yu seçti (R06-K01). Inter'in gerekçesi:"],
      ["SDK 57'de Inter 400, 500 ve 600 statik dosyaları config plugin ile gömülmeli.", "SDK 57'de statik dosyalar config plugin ile gömülür."],
      ["React Native fontVariant yalnız rakam biçimlerini açabildiği için Inter'in I/l ve sıfır ayırma seçenekleri uygulamada kullanılamıyor; bu yüzden harf ve rakam karışık yedek kodlar sıfırı varsayılan olarak işaretli Geist Mono ile, öğrenci numarası ve yüzdeler Inter'in eşit genişlikli rakamlarıyla yazılmalı.", 'React Native fontVariant yalnız rakam biçimlerini açabildiği için ailenin I/l ve sıfır ayırma seçenekleri uygulamada kullanılamıyor; tasarımda kodlar Plex Mono ile, öğrenci numarası ve yüzdeler eşit genişlikli rakamlarla yazılır.'],
      ['satır oranı Türkçe aksanlar için 1.152 altına inmiyor', 'satır oranı Türkçe aksanlar için 1,152 altına inmiyor'],
      ['IBM Plex Sans köşeli havasıyla brife uyuyor ama f+i bağı Türkçe dil sistemi olmadan açık geliyor; Geist ve Atkinson Hyperlegible Next güçlü alternatifler.', 'IBM Plex Sans köşeli havasıyla brife uyuyor ama f+i bağı Türkçe dil sistemi olmadan açık geliyor; tasarım bu yüzden bağları kapatır.'],
    ],
    'R07.summary': [['üç girdiden üretilen gece mavisi alt tonlu bir tema', 'kilitli paletle gece mavisi alt tonlu bir tema (R07-K01 geçersiz)']],
    'R10.summary': [
      ['(mimari karar, sahibin onayı gerekir)', '(mimari karar, açık nokta: tasarim.html#acik-sekme)'],
      ['Web panelinde aynı belge View Transitions, @starting-style, transition-behavior, popover, dialog ve linear() dört tarayıcıda kullanılabilir;', 'Web panelinde aynı belge View Transitions, @starting-style, transition-behavior, popover, dialog ve linear() dört tarayıcının güncel sürümünde var, ama dialog dışındakiler panelin alt sınır tarayıcılarının (teknik.html#panel-cati) en az birinde yok; tasarımda yalnız ilerleyici iyileştirme;'],
    ],
    'R12.summary': [
      ['@gorhom/bottom-sheet Mayıs 2026 dan beri commit almadı, zeego nun son sürümü Mart 2025.', "@gorhom/bottom-sheet Mayıs 2026'dan beri commit almadı, zeego'nun son sürümü Mart 2025; son kararda alt sayfa TrueSheet, menü eylem listesi olarak alt sayfada."],
      ['Style Dictionary 2025.10 u henüz tam desteklemediğini kendisi söylediği için üretici olarak Terrazzo öne çıkıyor.', "Style Dictionary 2025.10'u henüz tam desteklemediğini kendisi söylüyor; bu açı bu yüzden Terrazzo'yu önerdi, son karar style-dictionary 5.6.0, Terrazzo ikinci."],
      ['Panelde düz CSS değişkenleri, Vite nin yerleşik CSS Modules desteği ve React 19.3 te kararlı olan <ViewTransition> yeterli;', "Panelde düz CSS değişkenleri ve Vite'nin yerleşik CSS Modules desteği yeterli; React 19.3'te kararlı olan <ViewTransition> ilk sürümde kullanılmaz, sayfa içi geçiş CSS @keyframes ile;"],
      ['Panelin başsız bileşenleri için Base UI (1.0 kararlı 11 Aralık 2025, şu an 1.8.0) birinci, React Aria Components ikinci seçenek;', 'Panel başsız bileşen kütüphanesi kullanmaz, tarayıcının kendi öğeleriyle kurulur (teknik.html#panel-cati); yerel öğenin yapamadığı bir parça çıkarsa ikinci seçenek Base UI (1.0 kararlı 11 Aralık 2025, şu an 1.8.0);'],
    ],
    'R12.oq.5': [['@date-fns/tz in isteğe', "@date-fns/tz'in isteğe"]],
    'R12.oq.6': [['npm de next', "npm'de next"]],
    'R14.oq.1': [['uyarı düzeylerinin', 'uyarı seviyelerinin'], ['bu düzeylerle', 'bu seviyelerle']],
    'L1.summary': [
      ['Listelerde saf TypeScript olan Legend List 3, Reanimated itemLayoutAnimation desteğiyle ekleme ve silmeyi yumuşak gösteriyor; FlashList v2 ikinci seçenek.', "Listelerde son karar Reanimated'in Animated.FlatList'i: liste boyutları küçük ve itemLayoutAnimation tek sütunlu listede çalışıyor; saf TypeScript olan Legend List 3 ikinci seçenek, FlashList değil."],
      ["Kısa bildirimde sonner-native, menüde Expo UI'nin yerel menüsü, haptikte expo-haptics seçildi; sonner-native ekran okuyucuya duyuru yapmadığı için duyuruyu kendi sarmalayıcımız yapacak, iOS kamera açıkken haptik çalmadığı için başarı titreşimi kamera kapandıktan sonra tetiklenecek.", "Kısa bildirim için son karar kendi bileşenimiz (sonner-native ekran okuyucuya duyuru yapmadığı için ikinci), menü eylem listesi olarak köşeli alt sayfada (Expo UI'nin yerel menüsü ikinci), haptikte expo-haptics seçildi; iOS kamera açıkken haptik çalmadığı için başarı titreşimi kamera kapandıktan sonra tetiklenecek."],
      ['Yoklama başarı animasyonu için ek kütüphane gerekmiyor: Reanimated ve düz View ile çizilen köşeli onay işareti yeterli;', 'Yoklama başarı animasyonu için ek kütüphane gerekmiyor: kare ve onay react-native-svg Path ile çizilir, çizgi strokeDashoffset ile canlanır, ölçek withSpring ile gelir (tasarim.html#k-success);'],
    ],
    'L2.summary': [
      ["ve telefonun açık/koyu ayarını izleyen küçük bir useTheme yardımcısı yeterli;", 'yeterli (ilk sürüm yalnız açık görünüm, tasarim.html#acik-koyu-tema);'],
      ["@material-symbols/svg-400 paketindeki SVG'ler react-native-svg-transformer ile bileşene çevrilir ve react-native-svg ile çizilir;", "son kararda Google'ın resmî Material Symbols Sharp SVG dosyaları depoya kopyalanır, bir derleme betiği tipli path haritası üretir ve react-native-svg ile çizilir (@material-symbols/svg-400 ve react-native-svg-transformer ikinci);"],
      ['Raster görseller için expo-image, güvenli alan için react-native-safe-area-context seçildi.', "Raster görseller için React Native'in Image bileşeni (expo-image ikinci), güvenli alan için react-native-safe-area-context seçildi."],
    ],
    'L3.summary': [['*sha1:0a78e20f5b47', "Panelin stil katmanı için bu araştırma Tailwind CSS 4.3'ü seçmişti; son kararda panel düz CSS, CSS Modules ve üretilmiş tokens.css ile yazılır, çünkü Tailwind 4'ün tarayıcı alt sınırı panelin hedefinin üstünde (tasarim.html#acik-firefox); Tailwind ikinci seçenek. Önerilen davranış katmanı React Aria Components da son kararda yok: panel tarayıcının kendi öğeleriyle (dialog, details, select, input type=date, table) kurulur (teknik.html#panel-cati); yerel öğenin yapamadığı bir parça çıkarsa ikinci seçenek Base UI, her eklemede onayla. shadcn iskeleti ve tailwind-variants alınmaz. Veri tablosu, uzun liste ve form da yerel öğelerle yazılır (TanStack Table, Virtual ve Form ikinci); şemalar sözleşme paketindeki Zod 4. Tarih seçici tarayıcının tarih kutusudur, seçilen tarih altında Türkçe yazılır (tasarim.html#acik-yerel-oge; React Aria DatePicker ikinci); bildirim tarayıcının canlı bölgesiyle (tasarim.html#acik-bildirim). İkonlar telefonla aynı Material Symbols Sharp SVG'leri, yazı tipi Fontsource paketleriyle kendi sunucumuzdan, CSS küçültme Vite 8'in varsayılanı Lightning CSS. Grafik kütüphanesi gerekmez: oranlar role=\"meter\" taşıyan düz çubukla çizilir, meter öğesi kullanılmaz (tasarim.html#durumlar; Recharts 3 ikinci). Planın 'son 12 ayda sürüm yoksa bakımsız' kuralı cmdk, @phosphor-icons/react, @observablehq/plot, class-variance-authority ve tw-animate-css'i eler."]],
    'L4.summary': [['*sha1:cb75a2b46105', "Web panelindeki hareketin çoğu kütüphane istemiyor: hover, basma ve odak geçişleri CSS transition ile yazılır. Bu açının önerdiği @starting-style, linear() ve başsız kütüphanenin durum öznitelikleri son kararda ana yol değil: yeni öğenin girişi @keyframes ile her hedef tarayıcıda oynar, dialog ve açılır katmanların kapanışını küçük bir kapanış yardımcısı yönetir; @starting-style, transition-behavior, View Transitions, linear() ve interpolate-size yalnız ilerleyici iyileştirme (tasarim.html#platform-web). Sayfa geçişleri için TanStack Router'ın defaultViewTransition seçeneği yeterli: View Transitions API Ekim 2025'ten, geçiş türleri Ocak 2026'dan beri üç motorda da var, desteklemeyen tarayıcıda gezinme anında olur. React 19.3'ün (9 Eylül 2026) kararlı ViewTransition bileşeni ilk sürümde kullanılmaz; sayfa içi durum geçişi CSS @keyframes ile (tasarim.html#acik-panel-hareket). Bu açının önerdiği tek JS kütüphanesi Motion (14.0.0) de son kararda ikinci seçenek: kesilebilir liste hareketi gerekirse yalnız o ekranda LazyMotion ile eklenir; sıralamada hareket yok, satır çıkışı ilerleyici görünüm geçişiyle. Hareket azaltma tek yerden yönetilir: CSS'te prefers-reduced-motion. GSAP, anime.js, react-transition-group, react-flip-toolkit ve Lenis bu panel için ya aşırı, ya eski, ya da kullanıcı kaydırmasını bozduğu için elendi; react-spring bu açıda ikinciydi. Yükseklik açma kapamada interpolate-size yalnız Chromium'da olduğundan grid-template-rows yöntemi kullanılır."]],
    'L5.summary': [
      ["Dosyayı Terrazzo 2.7.1 okur: panele @terrazzo/plugin-css ile CSS değişkenleri (legacyHex ile hex), telefona kısa bir yerel eklentiyle hex dizeleri ve sayılar taşıyan tokens.native.ts üretir; React Native 0.86 oklch() dizesini kabul etmediği için telefona yalnız hex gider.", "Bu açı dosyayı Terrazzo 2.7.1 ile okumayı önerdi; son karar style-dictionary 5.6.0, Terrazzo ikinci ([[#cozum-1|Çözülen çelişkiler, a]]): panele css/variables biçimiyle CSS değişkenleri, telefona ikinci platform olarak tokens.ts üretir; React Native 0.86 oklch() dizesini kabul etmediği için telefona yalnız hex gider."],
      ['Style Dictionary 5.6 daha yaygın ama kendi belgesine göre 2025.10 desteği bitmedi (süre ve hareket türleri yapımda), bu yüzden ikinci sırada.', 'Style Dictionary 5.6 kendi belgesine göre 2025.10 desteğini bitirmedi (süre ve hareket türleri yapımda); kaynakta her rengin hex yedeği hazır olduğu için eksik önemsiz kaldı ve bakım ölçütlerinde önde olduğu için birinci oldu.'],
      ["Terrazzo'nun yerleşik kuralları derlemede kontrastı (a11y/min-contrast, AA), sRGB sınırını (core/max-gamut) ve biçimi denetler, kural kırılırsa derleme durur. Zaten seçili Vitest 5'teki testler ikinci ve bağımsız kapıdır: iki çıktının aynı hex değerlerini taşıdığını, her kontrast çiftini ve kırık beyaz kuralını Terrazzo'nun da içte kullandığı colorjs.io ile ölçer.", "Terrazzo'nun derlemedeki kontrast ve sRGB denetiminin karşılığı zaten seçili Vitest 5 testleridir: iki çıktının aynı hex değerlerini taşıdığını, her kontrast çiftini ve kırık beyaz kuralını colorjs.io ile ölçer, kural kırılırsa kapı kapanır."],
    ],
  },
  // Angles whose data another agent may rewrite at the same time (R07 benchmarks): a correction that no longer finds
  // its text, or a question state that no longer finds its question, is a warning there, not a failure.
  soft: ['R07'],
  // One change line over the summary of an angle (finding 9 of round 2): the summary itself is corrected above.
  changed: {
    R01: "Carbon'un zemin rengi iddiası ve kontrol kenarının 3:1 sınırı; R01-K04.",
    R02: 'durum renk seti, alternatif alt tonlar ve seçili zemin rolü 6 Ekim 2026 kilidiyle kalktı (R02-K07, R02-K08, R02-K09, R02-K05); bağlantı oranı kilitli gövde metniyle yeniden ölçüldü.',
    R03: 'ease eğrisinin yay taklidi sapması düzeldi; tasarımın süre ve eğrileri bu açının ölçeğinden ayrıldı, R03-K01.',
    R04: 'panelde @starting-style ve View Transitions yalnız ilerleyici iyileştirme; panel bildirimi Sonner değil, R04-K14.',
    R05: "2 px'i reddeden piksel hesabı düştü; tam daireli kontroller tasarımda yok, R05-K01.",
    R06: 'ana aile Inter değil IBM Plex Sans ve Plex Mono, bağlar kapalı; R06-K01.',
    R07: 'temayı üç girdiden üretme önerisi 6 Ekim 2026 kilidiyle kalktı, R07-K01.',
    R10: 'panel teknikleri alt sınır tarayıcılarında yalnız ilerleyici iyileştirme; teknik.html#panel-cati.',
    R12: 'token aracı, panelin bileşen temeli, ViewTransition ve alt sayfa son kararla değişti; R12-K07, R12-K09, R12-K10.',
  },
  // Findings that recommended a banned color (decision E11): a lock note, and the 'Bizim için' line rewritten to the
  // lock. The measured yellow and green values stay only as a measurement record.
  lock: {
    'R02-F06': { implication: "Alt tonu kurum renginden türetmek gerekmiyor; gece mavisi İÜ'nün sarısı ve yeşiliyle ton akrabası değil ama çatışmıyor. Kilit gereği İÜ renkleri arayüze girmez, alternatif alt ton da gösterilmez." },
    'R02-F11': { implication: 'Durum rengi ile birincil buton rengi ayrı tutulmalı: birincil buton gece mavisi, durumlar ikon ve sözcükle ayrılır. Orta tonlu dolgularda hover koyulaşıyor; çok koyu lacivertte koyulaşacak alan az olduğu için hover açılmalı.' },
    'R02-F20': { implication: 'Durum damgasında ayrımı ikon şekli ve sözcük taşır, renk destekler; açıklık sırası renk körlüğünde ayrımı sağlayan ana etken. Bu kümenin durum adları tahmindi; gerçek durumlar ve ölçümleri tasarim.html#durumlar bölümünde.' },
    'R02-F21': { implication: 'Anlamsal bildirimler hiçbir zaman yalnızca renge dayanmamalı; her bildirimde ikon ve başlık şart. Başarı gece mavisi ailesinden gelir; hata dolgusu tasarımda danger.fill (tasarim.html#renk).' },
    'R09-F05': { implication: 'Her durum renk, ikon ve kısa metinle birlikte verilmeli; renk ile sayı aynı veri kaynağından beslenmeli. Sarı ve turuncu kilit gereği hiç kullanılmaz.' },
    'R11-F10': { implication: "Durumlar yalnız renkle ayrılamaz; her biri farklı biçimli simge ve metin etiketi taşır (gerçek durum adları tasarim.html#durumlar bölümünde). Panel raporlarında ve devamsızlık uyarı seviyelerinde de aynı kural geçerlidir." },
    'R11-F11': { implication: "Durum renkleri örnek değerlerle kontrastı geçer ama döteranopide başarı ve hata neredeyse aynı görünür; bu, R11-F10'daki simge ve metin kuralını hesapla doğrular. Uyarı kırmızı ailesinde düşük vurguyla ya da morla; ayrımı ikon ve sözcük taşır." },
    'R14-F08': { implication: 'Durum renkleri hazır bir sistemden olduğu gibi alınmaz, kırık beyaz zemine göre ölçülür; kilitli durum mürekkepleri ve ölçümleri tasarim.html#kontrast bölümünde.' },
    'R14-F09': { implication: 'Uyarı seviyeleri (plan.html#devam-uyari-seviyeleri) renkle değil, farklı şekilli simge ve yazıyla ayrılmalı; renk yalnız destek olmalı. Lacivert vurgu renk körlüğünde de ayrışıyor.' },
  },
  // Records that name yellow or green only to describe something (an axis, another system's color, a complaint, a
  // rejected option, a measurement): no recommendation, so no lock note. The lock gate needs each one listed.
  lockInfo: {
    R01: 'b* ekseni ve sıcak beyazların tarifi', 'R01-F01': 'krem okunan sıcak beyazlar, karşı örnek', 'R01-F02': 'sarımsı çamaşır, karşı örnek', 'R01-F08': 'renk adlarının tarifi',
    'R01-F12': 'Night Shift sarıya çeker, tarif', 'R01-F13': 'gece ayarı, tarif', 'R01-F18': 'sıcak beyaz örneği', 'R01-F20': 'gece ayarı, tarif', 'R01-F23': 'ton ekseni, tarif',
    'R01-K02': 'krem karşı örneği ve eksenin tarifi', 'R02': 'İÜ kurum renklerinin tarifi', 'R02-F03': 'teal, Wikipedia değerinin tarifi', 'R02-F04': 'İÜ kurum renkleri, bilgi',
    'R02-F05': 'İÜ logosu, bilgi', 'R02-F10': 'Geist ölçek adları', 'R02-F12': 'LCH açıklık örneği', 'R02-F17': 'Wise marka renkleri, tarif', 'R02-K10': 'İÜ renkleri yalnız bilgi',
    'R07-F08': 'LCH açıklık örneği', 'R08': 'sarıya kayan forum zeminleri, karşı örnek', 'R08-F09': 'sarıya kayan zeminler, karşı örnek', 'R08-F22': 'Tufte zemini, ölçüm',
    'R08-K07': 'kaçınılacak sarımsı örnekler', 'R09-F07': 'doğrulayıcının notu: bir forum temasının rengi, tarif', 'R09-K02': 'sarı ve turuncu yasak örnek', 'R11': 'renk körlüğü ölçümü', 'R11-K12': 'reddedilen seçenek',
    'R12-F20': 'doğrulayıcının notu: Tailwind belgesindeki örnek renk, tarif', 'R14': 'renk körlüğü ölçümü',
    'R14-F11': 'Carbon uyarı renkleri, tarif', 'R14-K06': 'reddedilen seçenek', 'R14-K07': 'Carbon uyarı renklerinin ölçümü',
  },
  // The design departed from these recommendations; shown on the card and in the traceability table.
  departed: {
    'R03-K01': 'Tasarımın süreleri (tasarim.html#hareket): {{durations}}. {{durationNote}} R03-K01 ölçeğinden farkı: {{r03k01diff}}.',
    'R03-K02': "Tasarımın eğrileri bu önerinin reddettiği Carbon iş eğrileri (R13-K02; tasarim.html#hareket).",
    'R03-K03': 'Tasarımın yayları (tasarim.html#hareket): {{springs}}. {{r03k03match}}',
    'R04-K04': 'Tasarımda basılan düğme {{pressScale}} ölçeğe iner ve dolgusu bir adım koyulaşır (tasarim.html#k-press).',
    'R04-K10': "Tasarım alt sayfada TrueSheet'i seçti: açılış ve kapanış sistemin kendi hareketi, tokenlarımız onu sürmez (tasarim.html#k-sheet); @gorhom/bottom-sheet kullanılmaz.",
    'R04-K14': 'Panelde bildirim Sonner varsayılanlarıyla (400 ms geçiş) çizilmez: tarayıcının canlı bölgesi (aria-live), süreler tasarımın hareket ölçeğinden.',
    'R04-K16': 'Tasarımda panelin sayfa geçişi yönlendiricinin görünüm geçişiyle ve süre tokenıyla; View Transitions panelin alt sınır tarayıcılarında yok, orada sayfa anında değişir (tasarim.html#k-page).',
    'R06-K01': 'Tasarım IBM Plex Sans ve Plex Mono ailesini seçti, bağlar kapalı; gerekçe R06-F06 ve R06-F16.',
    'R12-K07': 'Son kararda token aracı style-dictionary 5.6.0, @terrazzo/cli 2.7.1 ikinci ([[#cozum-1|Çözülen çelişkiler, a]]).',
    'R12-K09': 'Son kararda React ViewTransition ilk sürümde kullanılmaz: sayfa geçişini yönlendiricinin defaultViewTransition seçeneği, sayfa içi geçişi CSS @keyframes yapar (tasarim.html#acik-panel-hareket).',
    'R12-K10': 'Son kararda panel başsız bileşen kütüphanesi kullanmaz, tarayıcının kendi öğeleriyle kurulur (teknik.html#panel-cati); Base UI yalnız yerel öğenin yapamadığı bir parça için ikinci seçenek.',
    'R13-K06': 'Durum adları tahmindi; gerçek makbuz adımları {{labels:makbuz}}, sonra sunucu kararı ({{labels:sunucu}}); plan.html#kararlar-kayit-ve-makbuz.',
    'R14-K10': 'Durum adları tahmindi; gerçek adlar {{labels:makbuz}} ve sunucu kararı ({{labels:sunucu}}). Çevrimdışı mesajı gönderimin ne zaman olacağını dürüstçe söyler, arka planda gönderim garanti değil (teknik.html#telefon-arka-plan).',
    'L1-C31': 'Kare ve onay react-native-svg Path ile çizilir, çizgi strokeDashoffset ile canlanır, ölçek withSpring ile gelir (tasarim.html#k-success); düz View çubukları kullanılmaz.',
    'L3-C38': '[[#kilit|6 Ekim 2026 kilidi]]: meter öğesi kullanılmaz, çünkü tarayıcılar onu yeşil ve sarıya boyar; oranlar role="meter" taşıyan düz çubukla çizilir (tasarim.html#durumlar).',
    'L3-C44': 'Tasarım IBM Plex Sans ve Plex Mono ailesini seçti, bağlar kapalı; gerekçe R06-F06 ve R06-F16.',
  },
  // Partly superseded recommendations: the note sits at the top of the card.
  partial: {
    'R01-K01': "n-9'un kenarlık olarak her açık zeminde 3:1'i geçtiği doğru değil; düzeltme R01-K04'te.",
    'R02-K01': '2 ile 5. adımların zemin rolleri 6 Ekim 2026 açıklamasıyla kalktı: seçim accent.mark işaretiyle, seçili zemin nötr bg.selected (tasarim.html#gece-mavisi).',
    'R02-K05': 'Seçili satır ve sekme zemini (3. adım) rolü 6 Ekim 2026 açıklamasıyla kalktı: seçim accent.mark işaretiyle, seçili zemin nötr bg.selected (tasarim.html#gece-mavisi).',
    'R02-K06': 'Ton kuralı ve örnek nötrler kilitli ölçekle değişti (tasarim.html#renk).',
    'R02-K10': 'Son cümlesi (alternatif alt ton) 6 Ekim 2026 kilidiyle kalktı ve gösterilmez; İÜ renkleri yalnız bilgi için listede.',
    'R11-K01': 'Örnek değerler kilitli paletten değil (örnek zemin #F0F2F4); kilitli renklerle ölçülen oranlar tasarim.html#kontrast bölümünde.',
    'R11-K02': 'Örnek değerler kilitli paletten değil (örnek zemin #F0F2F4); kilitli renklerle ölçülen oranlar tasarim.html#kontrast bölümünde.',
    'R11-K03': 'Örnek değerler kilitli paletten değil (örnek zemin #F0F2F4); kilitli renklerle ölçülen oranlar tasarim.html#kontrast bölümünde.',
    'R11-K08': 'Örnek değerler kilitli paletten değil (örnek zemin #F0F2F4); artırılmış kontrast değerleri tasarim.html#erisilebilirlik-artirilmis bölümünde.',
    'R11-K13': 'Örnek değerler kilitli paletten değil (örnek zemin #F0F2F4); QR kuralları planda (plan.html#asama23).',
    'R11-K16': 'Örnek değerler kilitli paletten değil (örnek zemin #F0F2F4); kilitli renklerle ölçülen oranlar tasarim.html#kontrast bölümünde.',
    'R14-K02': "Satır hover'ı nötr bg.hover, mavi zemin yok; tasarımda zebra da yok, satırları ince çizgi ayırır (tasarim.html#bicim).",
    'R14-K06': 'Örnek renkler kilitli ölçekte yok: çubuğun dolgusu accent.progress, ray nötr, meter öğesi yok (tasarim.html#durumlar). Aralık adları tahmindi; gerçek uyarı seviyeleri plan.html#devam-uyari-seviyeleri bölümünde.',
    'R14-K07': 'Aday lacivert kilitli ölçekte yok; grafik ve çubuklar yalnız mürekkep ve nötr adımlarla çizilir (tasarim.html#renk).',
  },
  // Row notes inside a recommendation's values table.
  rowNote: { 'R01-K01': { 'n-9': 'Düzeltme: R01-K04.' } },
  // Banned colors that a live recommendation names only as the thing to avoid; shown with this mark.
  counter: {
    'R01-K02': { '#FFFDD0': 'karşı örnek: krem okunan sıcak beyaz' },
    'R09-K02': { '#FFFF00': 'yasak örnek', '#FFA500': 'yasak örnek' },
    'R02-K10': { '#FFD528': 'yalnız bilgi: arayüze girmez', '#00733D': 'yalnız bilgi: arayüze girmez' },
  },
  // Open question states (finding 16 of round 2): [start of the question, state, note]. a = still open (the note
  // names where it is tracked), k = closed by the design or the plan, x = no longer applies.
  oq: {
    R01: [
      ['Projedeki metinlerde en az', 'a', 'Açık nokta: tasarim.html#acik-devre-disi.'],
      ['Night Shift, True Tone', 'a', 'Açık nokta: tasarim.html#acik-gece.'],
      ['Sahip A, B ve C', 'k', 'A ölçeği kilitlendi (tasarim.html#renk).'],
      ['Telefon karanlık moddayken', 'k', 'İlk sürüm açık görünümde kalır (tasarim.html#platform); koyu tema açık nokta: tasarim.html#acik-koyu-tema.'],
      ['Vurgu rengi (gece mavisi) seçildiğinde', 'k', 'Vurgu ve nötr ölçek kilitlendi (tasarim.html#renk).'],
      ['Güneş altında kırık beyaz', 'a', ''],
    ],
    R02: [
      ["İÜ'nün güncel kurumsal kimlik", 'x', 'Kilit gereği İÜ renkleri arayüze girmez.'],
      ["Revolut, Monzo ve Notion'un", 'x', 'Gece mavisinin kullanım yerleri kararlaştı (tasarim.html#gece-mavisi); bu örnekler kararı değiştirmez.'],
      ['Renk körlüğü ayrımı için kullanılan', 'x', 'Bu durum seti kilitle geçersiz (R02-K09); gerçek durumların ölçümü tasarim.html#durumlar bölümünde.'],
      ['Koyu tema değerleri bu çalışmada', 'a', 'Açık nokta: tasarim.html#acik-koyu-tema.'],
      ['Basılı durumda koyulaşma', 'k', 'Basılı dolgu bir adım koyu, accent.12 (tasarim.html#k-press).'],
      ['İzinli durumunun mavisi', 'x', 'Bu durum seti geçersiz; gerçek durumlar tasarim.html#durumlar bölümünde.'],
      ['Petrol ya da camgöbeği alt ton', 'x', 'Camgöbeği yasak ton aralığında; alt ton gece mavisi.'],
      ['Projektör sayfasında (tam ekran QR)', 'x', 'Projeksiyon sayfası yalnız QR gösterir; durum ve vurgu rengi yok (plan.html#asama23-nereden-gosterilir).'],
    ],
    R03: [
      ['Öğretmenin QR ekranında kod yenilenirken', 'k', 'Kod anında değişir, çapraz geçiş yok (tasarim.html#k-qr).'],
      ['Yan panel, alt sayfa ve diyalog animasyonları', 'a', 'Açık nokta: tasarim.html#acik-panel-hareket.'],
      ['Reanimated ReduceMotion.System', 'a', 'Açık nokta: tasarim.html#acik-hareket-azalt.'],
      ['Orta ve alt segment Android telefonlarda yay', 'a', 'Açık nokta: tasarim.html#acik-akicilik.'],
      ["Sahibin 'her şey animasyonlu' isteği", 'k', 'Her etkileşimin süresi, eğrisi ve hareketi azalt karşılığı Etkileşim tablosunda; hover girişi ve çıkışı ayrı süre tokenıyla (tasarim.html#k-hover).'],
      ['Projeksiyon sayfasında (yalnız QR)', 'k', 'QR anında değişir, sayfada hareket yok (tasarim.html#k-qr).'],
      ['İlk tooltip için gecikme süresi', 'k', 'İpucu bekleme süresi time.ipucu tokenı (tasarim.html#hareket).'],
    ],
    R04: [
      ['Başarı ekranının ve onay işaretinin', 'k', 'Başarı ekranı kullanıcı kapatana kadar kalır (tasarim.html#k-success).'],
      ['Hata sarsması (shake)', 'k', 'Sarsma yok; hatalı alanda kırmızı kenar ve ikonlu ileti (tasarim.html#k-error).'],
      ['iPadOS imleç efektlerinin', 'k', 'İmleçli cihazda hover aynı renk geçişiyle; özel imleç efekti yok (tasarim.html#k-hover).'],
      ["Expo belgesindeki 'kamera etkinken", 'a', 'Açık nokta: tasarim.html#acik-titresim.'],
      ['Android CONFIRM, REJECT, TOGGLE_ON', 'a', 'Açık nokta: tasarim.html#acik-titresim.'],
      ['interpolate-size ve calc-size()', 'k', 'interpolate-size yalnız ilerleyici iyileştirme; yükseklik kuralı Etkileşim tablosunda (tasarim.html#platform-web).'],
      ["TanStack Router 1'in View Transitions", 'k', "Yönlendiricinin defaultViewTransition seçeneği kullanılır (tasarim.html#kutuphaneler-panel)."],
      ['Apple haptiğin kapatılabilir', 'k', 'Uygulamada ayrı ayar yok, telefonun titreşim ayarı izlenir (tasarim.html#platform-titresim).'],
      ['Telefonda yığın gezinmesinin', 'k', 'Telefonda sistemin kendi ekran geçişi kullanılır (tasarim.html#k-page).'],
    ],
    R05: [
      ['Material 3 Expressive şekil', 'x', 'Köşe kararı verildi (tasarim.html#bicim); şekil kütüphanesi kullanılmaz.'],
      ["Apple ve Material'in telefon kenar", 'k', 'Kenar boşluğu ve satır boyları boşluk ve bileşen tokenlarında (tasarim.html#bicim).'],
      ['Panel içerik alanı için azami', 'k', 'Kırılma noktaları ve ızgara tasarim.html#bicim bölümünde.'],
      ["Carbon'un $shadow renginin", 'x', 'Gölge rengi ve ikon seti tasarımda kararlaştı (tasarim.html#renk, tasarim.html#ikonlar).'],
      ['SF Symbols lisans metni', 'x', 'İkon seti Material Symbols Sharp (tasarim.html#ikonlar).'],
      ["React Native 0.86 New Architecture'da çok katmanlı", 'a', 'Açık nokta: tasarim.html#acik-akicilik.'],
      ['Material Symbols Sharp için ağırlık', 'k', 'İkon ağırlığı tasarim.html#ikonlar bölümünde.'],
      ['Gölge rengi olarak siyah yerine', 'k', 'Gölge rengi neutral.12 (tasarim.html#renk).'],
      ["Geist ve Linear CSS'indeki açık ve koyu", 'a', 'Açık nokta: tasarim.html#acik-koyu-tema.'],
      ['Dikdörtgen anahtar (switch)', 'a', 'Açık nokta: tasarim.html#acik-anahtar.'],
    ],
    R06: [
      ['@expo-google-fonts/inter statik', 'x', 'Inter kullanılmıyor; aile IBM Plex (tasarim.html#tipografi).'],
      ['Statik Inter 400, 500, 600', 'x', 'Inter ve Geist Mono kullanılmıyor (tasarim.html#tipografi).'],
      ["React Native'in Android (Minikin)", 'x', 'Bağlar kapalı olduğu için Türkçe dil sistemine gerek kalmadı (tasarim.html#tipografi).'],
      ["Hermes'te toLocaleUpperCase('tr-TR')", 'a', ''],
      ['f+i bağı olan ailelerde', 'x', 'Bağlar kapalı (tasarim.html#tipografi).'],
      ['Yedek kodların harf içerip içermediği', 'k', 'Yedek kodun biçimi planda (plan.html#asama23).'],
      ["İpucusuz Inter'in fakülte", 'x', 'Inter kullanılmıyor.'],
      ['React Native lineHeight değerinin', 'a', 'Açık nokta: tasarim.html#acik-yazi.'],
      ["Geist'in l biçiminin", 'x', 'Geist kullanılmıyor.'],
      ["SDK 58'e geçişte değişken font", 'a', ''],
    ],
    R07: [
      ['~Revolut', 'x', 'Palet ve biçim kararları kilitli; bu uygulamaların değerleri kararı değiştirmez.'],
      ['~Papara', 'x', 'Palet ve biçim kararları kilitli; bu uygulamaların değerleri kararı değiştirmez.'],
      ['~Google Play 2025', 'x', 'Kararlar bu listeye bağlı değil.'],
      ['~Sensor Tower', 'x', 'Kararlar bu sıralamaya bağlı değil.'],
      ['~iClicker', 'x', 'Kararlar bu kaynaklara bağlı değil.'],
      ['~Perplexity', 'x', 'Palet ve biçim kararları kilitli; bu değerler kararı değiştirmez.'],
      ['~Liquid Glass', 'k', 'Sistem parçası ile kendi içerik katmanımızın ayrımı tasarim.html#platform-ios bölümünde.'],
      ['~#1A2B56', 'x', 'Palet kilitli; örnek renkler kullanılmaz (R07-K01).'],
    ],
    R08: [
      ['Gece mavisi alt tonunun kroması', 'k', 'Nötr ölçek kilitlendi (tasarim.html#renk).'],
      ['Köşe yarıçapı tamamen 0', 'k', 'Bileşenler köşesiz (tasarim.html#bicim).'],
      ['Expo ve React Native Reanimated tarafında', 'a', 'Açık nokta: tasarim.html#acik-hareket-azalt.'],
      ['Karanlık tema ilk sürümde', 'k', 'İlk sürüm yalnız açık görünüm (tasarim.html#platform); koyu tema açık nokta: tasarim.html#acik-koyu-tema.'],
      ['QR okutma onayında titreşim', 'k', 'Yoklama kaydedilince başarı titreşimi çalar (tasarim.html#platform-titresim).'],
      ['Animasyon ve takılma testleri', 'a', 'Açık nokta: tasarim.html#acik-akicilik.'],
      ['Bu açı uluslararası forumları', 'k', "Türk kullanıcıların görüşleri [[#r09|R09]] açısında."],
      ['Yay (spring) parametreleri', 'k', 'Yaylar ve eğriler tasarim.html#hareket bölümünde.'],
    ],
    R09: [
      ['Reddit (r/Turkey, r/CodingTR)', 'x', 'Kararlar öbür kaynakların sinyalleriyle verildi.'],
      ['Technopat konu sayfaları', 'x', 'Kararlar öbür kaynakların sinyalleriyle verildi.'],
      ["İÜ'nün resmi uygulamasında yorum", 'a', ''],
      ['Koyu temada öğrencinin tarama', 'k', "QR her zaman açık zeminde koyu karelerle çizilir, koyu tema QR'a uygulanmaz (plan.html#asama23)."],
      ['Öğretim üyelerinin sesi', 'a', ''],
      ['Hangi animasyonların orta ve alt sınıf', 'a', 'Açık nokta: tasarim.html#acik-akicilik.'],
    ],
    R10: [
      ['Karanlık tema olacak mı?', 'k', "İlk sürüm açık görünüm (tasarim.html#platform); Android 17'nin zorla koyu modu tasarim.html#acik-koyu-tema maddesinde denenir."],
      ['Alt sekme çubuğu ve başlık JS ile', 'a', 'Açık nokta: tasarim.html#acik-sekme.'],
      ["react-native-screens'in 2026 sürümlerinde", 'k', 'Öngörülü geri kapalı (tasarim.html#platform-android).'],
      ["Expo SDK 57'nin Android targetSdk", 'x', "Tasarımın konusu değil; teknik.html'in işi."],
      ["Expo SDK 58'in Xcode 27", 'x', 'Tasarım UIDesignRequiresCompatibility anahtarına dayanmıyor (tasarim.html#platform-ios).'],
      ["iOS'ta sistem uyarıları, tarih seçici", 'a', 'Cihazda denenecek (tasarim.html#platform-ios).'],
      ['Expo UI Jetpack Compose bileşenleri', 'x', '@expo/ui kullanılmıyor; menü eylem listesi olarak alt sayfada.'],
      ['Android 3 tuşlu gezinme perdesinin', 'k', 'Gezinme çubuğunu ve perdesini sistem çizer (tasarim.html#platform-android).'],
      ["Türkiye'de Samsung ve diğer üreticilerin", 'k', 'Deneme telefonu yorumlarda anılan modellerden seçildi (tasarim.html#acik-yazi).'],
    ],
    R11: [
      ['Uygulama telefonun koyu temasını', 'k', 'İlk sürüm açık görünüm (tasarim.html#platform); koyu tema açık nokta: tasarim.html#acik-koyu-tema.'],
      ["Android'in kontrast düzeyi", 'k', 'Artırılmış kontrastın yolu tasarim.html#erisilebilirlik-artirilmis bölümünde.'],
      ['İÜ dersliklerinde perdeye en uzak', 'a', 'Planın açık noktası (plan.html#acik).'],
      ["Öğrenci makbuz QR'ını gösterirken", 'a', ''],
      ["Android'de Animasyonları kaldır", 'a', 'Açık nokta: tasarim.html#acik-hareket-azalt.'],
      ["Özel yazı tipi seçilirse Android'in", 'a', 'Açık nokta: tasarim.html#acik-yazi.'],
      ["Projeksiyon QR'ının içerik uzunluğu", 'x', 'Tasarımın konusu değil; QR kararları planda (plan.html#asama23).'],
    ],
    R12: [
      ['React Native 0.86 stil renklerinde', 'k', 'Telefona yalnız hex gider (tasarim.html#kutuphaneler-ortak).'],
      ['Panelin hedef tarayıcı ve sürümleri', 'k', 'Hedefler teknik.html#panel-cati kararında; kürsü sorusu tasarim.html#acik-kursu.'],
      ['Panel açılışları için platformun yerel', 'k', 'Telefonda alt sayfa sistemin hareketiyle (tasarim.html#k-sheet); panel hareketi açık nokta: tasarim.html#acik-panel-hareket.'],
      ['@expo/ui bileşenlerinin Material 3', 'x', '@expo/ui kullanılmıyor.'],
      ['Terrazzo nun JS/TS çıktısı', 'x', 'Token aracı style-dictionary, Terrazzo ikinci.'],
      ['Base UI ile React Aria Components', 'x', 'İlk sürümde başsız bileşen kütüphanesi yok.'],
      ['Expo SDK 58 npm de next', 'a', ''],
      ['GitHub arama API si kimlik', 'k', 'Ölçüm ecosyste.ms üzerinden yapıldı ([[#kutuphaneler|Kütüphaneler]]).'],
      ['Reanimated in düşük segment Android', 'a', 'Açık nokta: tasarim.html#acik-akicilik.'],
    ],
    R13: [
      ["m3.material.io üzerindeki", 'x', 'Kararlar bu yazıya bağlı değil.'],
      ['Compose yay değerleri', 'k', 'Yaylar withSpring ile, adı konmuş tokenla (tasarim.html#hareket); kare hızı tasarim.html#acik-akicilik maddesinde.'],
      ['iOS tarafında CONFIRM ve REJECT', 'k', 'iOS ve Android karşılıkları tasarim.html#platform-titresim bölümünde.'],
      ["Sahibin 'her şey animasyonlu olsun'", 'k', 'Sık işlemde yalnız renk ve basma ölçeği; kalıp kalıp Etkileşim tablosunda (tasarim.html#etkilesim).'],
      ['Bento düzeninin kullanılabilirliğine', 'x', 'Tasarım bento düzeni kullanmıyor.'],
      ["Android'de iOS büyük başlığının", 'a', 'Açık nokta: tasarim.html#acik-sekme.'],
      ['Gece mavisi alt tonun nötrlerdeki', 'k', 'Palet kilitlendi (tasarim.html#renk).'],
    ],
    R14: [
      ["Öğrencilerin 'siz' ve 'sen'", 'a', 'Açık nokta: tasarim.html#acik-hitap.'],
      ["plan.html'deki devamsızlık uyarı", 'k', 'Seviye adları ve eşikleri plan.html#devam-uyari-seviyeleri bölümünde.'],
      ['Saat ayırıcısı: TDK örnekleri', 'k', 'Saat Intl tr-TR biçimiyle, iki noktayla (tasarim.html#tipografi).'],
      ["iOS'ta textContentType='oneTimeCode'", 'a', ''],
      ['Material, Atlassian, Stripe ve Linear', 'x', 'Tablo yoğunluğu kararlaştı (tasarim.html#bicim).'],
      ["Google'ın Material metin alanı", 'x', 'Bulgu kullanılmadı.'],
      ['Kırık beyaz zemin ve lacivert vurgu', 'k', 'Renkler kilitlendi ve ölçüldü (tasarim.html#kontrast).'],
    ],
  },
  // Corrections applied to the data after the verifier read it; shown next to the verifier's note.
  fixed: {
    'R08-S12': 'Düzeltildi: alıntı artık kaynağın sözcükleri.',
    'R08-S34': "Düzeltildi: özetten yanıltıcı 'color.js 4.50:1' çıkarıldı; yorumcunun 4,49:1 değeri doğru.",
    'R09-S38': 'Düzeltildi: özet yalnız bu yorumu anlatır; not tutma şikayeti ayrı bir yorumdu (2026-03-12).',
    'R09-S83': "Düzeltildi: özete 'saman' seçeneği eklendi.",
    'R08-F16': 'Düzeltildi: kanıttaki alıntı artık kaynağın sözcükleri.',
  },
  // Links that failed in the 6 October 2026 sweep and are not shown (the row keeps its other sources).
  deadLinks: { 'https://uithings.com/framer-motion': 'HTTP 503, 6 Ekim 2026' },
  // Rows that final.overturned entries replace are found by category and package (see CHANGED below); this list
  // is the expected result on 6 October 2026, checked on every build so a silent change in matching shows up.
  overturnedExpect: ['L1-C11', 'L1-C19', 'L1-C23', 'L2-C16', 'L2-C20', 'L2-C09', 'L3-C34', 'L3-C01', 'L3-C06', 'L3-C11', 'L3-C13', 'L3-C15', 'L3-C18', 'L3-C20', 'L3-C25', 'L3-C28', 'L4-C03', 'L4-C11', 'L4-C08', 'L4-C12', 'L4-C17', 'L5-C03', 'L5-C09', 'L5-C12'],
  // Short names for the navigation.
  short: { R01: 'Nötr renkler', R02: 'Gece mavisi', R03: 'Hareket temeli', R04: 'Etkileşim', R05: 'Biçim', R06: 'Yazı', R07: 'Örnek uygulamalar', R08: 'Yabancı forumlar', R09: 'Türk kullanıcılar', R10: 'Platformlar', R11: 'Erişilebilirlik', R12: 'Koda dökülme', R13: 'Eğilimler', R14: 'Veri ve dil' },
};

// ---------------------------------------------------------------------------------------------------------------
// Inputs.
const out = argv[0];
if (!out || out.startsWith('--')) { console.error('usage: node research2html.js <out.html> [--intro f] [--trace f] [--design f] [--tokens f] [--check f] [--repo dir] [--css f]'); process.exit(2); }
const R = fs.readdirSync(path.join(D, 'research')).filter(f => /^R\d\d\.json$/.test(f)).sort().map(f => {
  const r = read(path.join(D, 'research', f));
  const vf = path.join(D, 'verify', f);
  r.verify = has(vf) ? read(vf) : { checked: [], signals_checked: [], benchmarks_checked: [], recommendation_issues: [] };
  return r;
});
const LIB = fs.readdirSync(path.join(D, 'lib')).filter(f => /^L\d+\.json$/.test(f)).sort().map(f => read(path.join(D, 'lib', f)));
const stats = has(path.join(D, 'lib', 'stats.json')) ? read(path.join(D, 'lib', 'stats.json')) : {};
const FINAL = has(path.join(D, 'lib', 'final.json')) ? read(path.join(D, 'lib', 'final.json')) : null;
const VOID = has(path.join(D, 'void.json')) ? read(path.join(D, 'void.json')) : {};
const traceFile = opt('--trace');
const traceJson = has(traceFile) ? read(traceFile) : null;
const intro = has(opt('--intro')) ? fs.readFileSync(opt('--intro'), 'utf8') : '';
const extraCss = has(opt('--css')) ? fs.readFileSync(opt('--css'), 'utf8') : '';
const designFile = opt('--design') || path.join(D, 'out', 'tasarim.html');
const design = has(designFile) ? fs.readFileSync(designFile, 'utf8') : '';
if (!design) warn(`WARNING: design document not found (${designFile}); fonts fall back to the variant files and design links are not checked`);
const tokFile = opt('--tokens') || path.join(D, 'variants', 'A2', 'tokens.json');
const chkFile = opt('--check') || path.join(D, 'variants', 'A2', 'tokens.check.json');
if (!has(tokFile)) { console.log(`FAIL: token file not found (${tokFile})`); process.exit(1); }
const T = read(tokFile);
const K = has(chkFile) ? read(chkFile) : null;
if (!K) warn(`WARNING: token check output not found (${chkFile}); {{cvd:...}} placeholders cannot resolve`);
const repoDir = opt('--repo') || path.join(os.homedir(), 'Desktop', 'iu_attendance');
const repoIds = {};
for (const doc of ['plan', 'teknik']) { const p = path.join(repoDir, doc + '.html'); if (has(p)) repoIds[doc] = new Set([...fs.readFileSync(p, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1])); }
if (!repoIds.plan || !repoIds.teknik) warn(`WARNING: plan.html and teknik.html not found in ${repoDir}; their anchors are not checked`);
const C = require(path.join(D, 'color.js'));
const SOFT = new Set(NOTES.soft);
const softOr = (angle, msg) => SOFT.has(angle) ? warn('WARNING: ' + msg) : fail(msg);

// Index of every record that gets an anchor.
const REC = {}, FIN = {}, SIG = {}, ROW = {};
for (const r of R) {
  r.findings.forEach(x => FIN[x.id] = { x, r });
  (r.recommendations || []).forEach(k => REC[k.id] = { k, r });
  (r.signals || []).forEach(s => SIG[s.id] = { s, r });
}
for (const l of LIB) l.candidates.forEach(c => ROW[c.id] = { c, l });
const KNOWN = new Set([...Object.keys(REC), ...Object.keys(FIN), ...Object.keys(SIG), ...Object.keys(ROW), ...R.map(r => r.id), ...LIB.map(l => l.id)]);
const anchor = id => id.toLowerCase();
const angleOf = id => String(id).split(/[-.]/)[0];

// ---------------------------------------------------------------------------------------------------------------
// Token values for placeholders (decision E1: generated, never retyped).
const stepHex = ref => { const m = String(ref).match(/^(neutral|accent)\.(\d+)$/); if (m) { const s = T.color[m[1]].find(x => x.step === +m[2]); return s && s.hex; } return /^#[0-9a-fA-F]{6}$/.test(ref) ? ref.toUpperCase() : null; };
const roleHex = role => { const ref = (T.color.roles || {})[role]; const hex = ref ? stepHex(ref) : stepHex(role); if (!hex) fail(`token role ${role} has no color`); return hex; };
const ratio = (a, b) => `${dec(Math.round(C.wcagRatio(roleHex(a), roleHex(b)) * 100) / 100)}:1`;
const DUR = Object.fromEntries((T.motion.duration || []).map(d => [d.name, d]));
const SPRING = Object.fromEntries((T.motion.spring || []).map(s => [s.name, s]));
const attLabel = key => ((T.color.attendance || []).find(a => a.key === key) || {}).label || key;
function cvd(kind) {
  if (!K) return null;
  const fg = (K.cvd || []).filter(p => p.part === 'fg');
  if (kind === 'closest') { const p = fg.filter(x => x.min > 0).sort((a, b) => a.min - b.min)[0]; return p ? `${dec(p.min, 3)} (${attLabel(p.a)} ile ${attLabel(p.b)})` : null; }
  if (kind === 'same') { const p = fg.filter(x => x.min === 0); return p.length ? p.map(x => `${attLabel(x.a)} ile ${attLabel(x.b)}`).join('; ') : null; }
  return null;
}
const r03k01 = () => { const k = (REC['R03-K01'] || {}).k; return k ? [...new Set((k.values || []).map(v => (String(v.value).match(/^(\d+)ms$/) || [])[1]).filter(Boolean).map(Number))] : []; };
function generated(key, arg) {
  switch (key) {
    case 'durations': return T.motion.duration.map(d => `dur.${d.name} ${d.ms} ms`).join(', ');
    case 'durationNote': return T.motion.durationNote || null;
    case 'r03k01diff': {
      const ours = new Set(T.motion.duration.map(d => d.ms)), theirs = new Set(r03k01());
      const added = [...ours].filter(x => !theirs.has(x)).sort((a, b) => a - b), dropped = [...theirs].filter(x => !ours.has(x)).sort((a, b) => a - b);
      return [added.length ? `${added.join(', ')} ms eklendi` : '', dropped.length ? `${dropped.join(', ')} ms çıktı` : ''].filter(Boolean).join(', ') || 'yok';
    }
    case 'springs': return T.motion.spring.map(s => `spring.${s.name} (stiffness ${s.stiffness}, damping ${String(s.damping).replace('.', ',')}, mass ${s.mass})`).join(', ');
    case 'r03k03match': {
      const k = (REC['R03-K03'] || {}).k; if (!k) return null;
      const theirs = (k.values || []).map(v => { const m = String(v.value).match(/stiffness:\s*([\d.]+),\s*damping:\s*([\d.]+)/); return m && { name: v.name, st: +m[1], dm: +m[2] }; }).filter(Boolean);
      const same = T.motion.spring.map(s => { const t = theirs.find(x => x.st === s.stiffness && x.dm === s.damping); return t && `spring.${s.name}, bu önerinin ${t.name} değeriyle aynı`; }).filter(Boolean);
      return same.length ? `Ortak olan tek değer: ${same.join('; ')}; öbür yaylar tasarımda ayarlandı, araştırmada karşılığı yok.` : 'Hiçbiri bu önerinin değerleriyle aynı değil; tasarımda ayarlandı.';
    }
    case 'pressScale': { const p = (T.motion.patterns || []).find(x => /^press/.test(x.pattern)); const e = String((p && p.enter) || ''); const m = e.match(/scale\(([\d,.]+)\)/); if (m) return m[1].replace('.', ','); const r = e.match(/\{scale\.([\w-]+)\}/); const t = r && (T.scale || (T.motion && T.motion.scale) || []).find(x => x.name === r[1]); return t ? String(t.value).replace('.', ',') : null; }
    case 'over300': {
      const d = T.motion.duration.filter(x => x.ms > 300).map(x => `dur.${x.name} (${x.ms} ms)`);
      const s = T.motion.spring.filter(x => x.settleMs > 300).map(x => `spring.${x.name} (${x.settleMs} ms'de oturur)`);
      return [...s, ...d].join(', ') || 'hiçbir değer';
    }
    case 'labels': { const list = ((T.durumlar || {})[arg] || []).map(x => x.label || x.text).filter(Boolean); return list.length ? list.map(x => `“${x}”`).join(', ') : null; }
    case 'budget': { const b = (T.coverageBudget || {})[arg]; return b != null ? `%${b}` : null; }
    case 'contrast': { const [a, b] = String(arg).split(':'); return ratio(a, b); }
    case 'cvd': return cvd(arg);
  }
  return undefined;
}
// Counts known only after the page is rendered (links) are filled in a second pass.
const COUNTS = {};
const VERDICT_WORDS = { 'doğrulandı': 'aynen', 'kısmen': 'kısmen doğrulandı', 'eskimiş': 'eskimiş çıktı', 'desteklenmiyor': 'desteklenmedi', 'açılamadı': 'açılamadı' };
const verdictLine = (list, unit, okWord) => Object.keys(VERDICT_WORDS).map(v => [v, list.filter(c => c.verdict === v).length]).filter(([, n]) => n).map(([v, n]) => [num(n), unit, v === 'doğrulandı' ? okWord : VERDICT_WORDS[v]].filter(Boolean).join(' ')).join(', ');
const VERDICTS = {};
function fill(s, where) {
  return String(s).replace(/\{\{([a-zA-Z0-9]+)(?::([^}|]+))?(?:\|([a-z]+))?\}\}/g, (m, key, arg, suf) => {
    let v;
    if (key === 'n') v = COUNTS[arg] != null ? count(COUNTS[arg], suf) : undefined;
    else if (key === 'verdicts') v = VERDICTS[arg];
    else if (key === 'apiClause' || key === 'apiHosts') v = COUNTS['_' + key];
    else v = generated(key, arg);
    if (v == null) { fail(`unresolved placeholder ${m} in ${where}`); return m; }
    return v;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Text pipeline: correction, placeholders, apostrophes, Turkish numbers, escaping, `code`, links to research ids,
// design references and the [[#anchor|text]] markup.
const fixKeyCheck = new Set();
function fixed(key, text) {
  let t = String(text ?? '');
  for (const [old, nu] of NOTES.fix[key] || []) {
    fixKeyCheck.add(key);
    if (old.startsWith('*sha1:')) { if (sha(t) === old.slice(6)) t = nu; else softOr(angleOf(key), `NOTES.fix ${key}: the field changed (hash ${sha(t)}, expected ${old.slice(6)}); rewrite the correction`); continue; }
    if (!t.includes(old)) { softOr(angleOf(key), `NOTES.fix ${key}: text not found: ${old.slice(0, 70)}`); continue; }
    t = t.split(old).join(nu);
  }
  return t;
}
const linkIds = html => html.replace(/\b([RL]\d{1,2}-[KFSC]\d{2,3})\b/g, (m, id) => KNOWN.has(id) ? `<a href="#${anchor(id)}">${id}</a>` : m);
const designIds = new Set([...design.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const designSections = new Set([...design.matchAll(/<section id="([^"]+)"/g)].map(m => m[1]));
const refWarned = new Set();
function designTarget(id) {
  if (!design || designIds.has(id)) return id;
  const sec = /^k-/.test(id) ? 'etkilesim' : id.split('-')[0];
  if (!refWarned.has(id)) { refWarned.add(id); warn(`WARNING: tasarim.html#${id} is gone; the link falls back to #${designSections.has(sec) ? sec : 'ozet'}`); }
  return designSections.has(sec) ? sec : 'ozet';
}
const designRef = id => `<a href="tasarim.html#${designTarget(id)}"><code>tasarim.html#${id}</code></a>`;
const refs = h => h
  .replace(/\[\[#([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, a, t) => `<a href="#${a}">${t}</a>`)
  .replace(/(?<![\w"'#/.=-])(tasarim|plan|teknik)\.html#([a-z0-9][\w-]*)/g, (m, doc, id) => {
    if (doc === 'tasarim') return designRef(id);
    if (repoIds[doc] && !repoIds[doc].has(id)) fail(`${doc}.html#${id} does not exist in ${repoDir}`);
    return `<code>${doc}.html#${id}</code>`;
  });
// Quotes must stay under 15 words (decision D17). The research and verify data were paraphrased at the source; a
// longer quoted span left in data this generator does not own (lib/*.json) loses its quote marks here, because it is
// then a paraphrase, not a quotation. Each case is listed in the build output.
const unquoted = [];
const unquoteLong = s => { let t = String(s ?? ''); for (const q of quotesIn(t).reverse()) if (q.words >= 15) { unquoted.push(t.slice(q.start, q.start + 50)); t = t.slice(0, q.start) + t.slice(q.start + 1, q.end - 1) + t.slice(q.end); } return t; };
const prose = (s, where = 'text') => refs(linkIds(esc(trNumbers(trApostrophe(unquoteLong(fill(s, where))))).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((#[\w-]+)\)/g, '$1 (tasarim.html$2)').replace(/\[([^\]]+)\]\(((?:plan|teknik)\.html#[\w-]+)\)/g, '$1 ($2)')));
const plain = s => refs(esc(trNumbers(trApostrophe(s))));
// A record field as displayed: its corrections applied.
const show = (id, field, v) => fixed(`${id}.${field}`, v);

// Notes must point at existing records.
for (const [id, note] of Object.entries(VOID)) if (!REC[id]) softOr(angleOf(id), `void.json names a missing recommendation ${id}`); else if (!String(note).trim()) fail(`void.json note for ${id} is empty`);
for (const group of ['departed', 'partial', 'rowNote', 'counter', 'fixed', 'lock']) for (const id of Object.keys(NOTES[group])) if (!REC[id] && !FIN[id] && !SIG[id] && !ROW[id]) softOr(angleOf(id), `NOTES.${group} names a missing record ${id}`);
for (const id of Object.keys(NOTES.changed)) if (!R.some(r => r.id === id)) fail(`NOTES.changed names a missing angle ${id}`);
for (const key of Object.keys(NOTES.fix)) { const [id] = key.split('.'); if (!KNOWN.has(id)) softOr(angleOf(id), `NOTES.fix names a missing record ${key}`); }
for (const id of Object.keys(NOTES.lock)) if (VOID[id]) fail(`NOTES.lock ${id} is also void; keep one`);

// ---------------------------------------------------------------------------------------------------------------
// Owner lock gates (6 October 2026). 1) A live recommendation must not carry a yellow or green color value, except
// the ones it names only to avoid (NOTES.counter). 2) Every finding, recommendation and summary that names a banned
// color (hex, oklch, rgb, or the words yeşil, sarı, kehribar, amber, turuncu) as displayed must have a lock decision:
// void (void.json), a lock note (NOTES.lock) or a recorded description (NOTES.lockInfo).
const colorsIn = s => {
  const outC = [];
  for (const m of s.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/g)) outC.push({ raw: m[0].toUpperCase(), hex: '#' + (m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]) });
  for (const m of s.matchAll(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/g)) outC.push({ raw: m[0], hex: C.oklchToHex(m[2] ? +m[1] / 100 : +m[1], +m[3], +m[4]).hex });
  for (const m of s.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)) outC.push({ raw: m[0], hex: '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') });
  return outC;
};
const bannedColor = hex => { const o = C.hexToOklch(hex); return o.C > 0.02 && o.H > 35 && o.H < 220 ? o : null; };
// 'sarıl...' is the verb to wrap ('sarılan'), not yellow.
const BANNED_WORD = /(?<![\p{L}])(yeşil|sarı(?!l)|kehribar|amber|turuncu)[\p{L}]*/giu;
const strings = o => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [];
const lockScan = {};
for (const [id, { k }] of Object.entries(REC)) {
  if (VOID[id]) continue;
  const allowed = NOTES.counter[id] || {};
  for (const c of strings(k).flatMap(colorsIn)) {
    const o = bannedColor(c.hex); if (!o) continue;
    if (allowed[c.raw.toUpperCase()]) { (lockScan[id] = lockScan[id] || new Set()).add(c.raw.toUpperCase()); continue; }
    fail(`LOCK: live recommendation ${id} names ${c.raw} (oklch ${o.L} ${o.C} ${o.H}); void it or mark it as a counter example`);
  }
}
for (const [id, map] of Object.entries(NOTES.counter)) for (const hex of Object.keys(map)) if (!(lockScan[id] && lockScan[id].has(hex))) fail(`NOTES.counter ${id} ${hex} no longer appears; remove the entry`);
const lockTerms = s => [...new Set([...String(s).matchAll(BANNED_WORD)].map(m => m[0].toLowerCase()).concat(colorsIn(String(s)).filter(c => bannedColor(c.hex)).map(c => c.raw)))];
// A finding is displayed with its verifier note: in full for any verdict but 'doğrulandı', otherwise only the
// sentences the short note keeps.
const recTextOf = x => [x.title, x.claim, x.evidence, x.implication].join(' ');
const shownNote = (x, c) => !c ? '' : c.verdict === 'doğrulandı' ? shortNote(show(x.id, 'note', c.note), recTextOf(x)).ek.join(' ') : show(x.id, 'note', c.note);
const displayed = {};
for (const r of R) {
  const vm = Object.fromEntries((r.verify.checked || []).map(c => [c.finding, c]));
  displayed[r.id] = show(r.id, 'summary', r.summary);
  for (const x of r.findings) displayed[x.id] = [show(x.id, 'title', x.title), show(x.id, 'claim', x.claim), show(x.id, 'evidence', x.evidence), NOTES.lock[x.id] ? NOTES.lock[x.id].implication : show(x.id, 'implication', x.implication), shownNote(x, vm[x.id])].join(' ');
  for (const k of r.recommendations || []) displayed[k.id] = [...strings({ ...k, recommendation: show(k.id, 'recommendation', k.recommendation), reasons: show(k.id, 'reasons', k.reasons) }), ...(VOID[k.id] ? [] : (r.verify.recommendation_issues || []).filter(i => i.recommendation === k.id).map(i => i.issue))].join(' ');
}
// Coverage is checked on the text as displayed (a correction may have withheld a value); staleness on the raw data.
const lockHits = {}, rawHits = {};
for (const [id, text] of Object.entries(displayed)) { const t = lockTerms(text); if (t.length) lockHits[id] = t; }
for (const r of R) {
  const vm = Object.fromEntries((r.verify.checked || []).map(c => [c.finding, c]));
  if (lockTerms(r.summary).length) rawHits[r.id] = 1;
  for (const x of [...r.findings, ...(r.recommendations || [])]) if (lockTerms(strings(x).join(' ') + ' ' + ((vm[x.id] || {}).note || '') + ' ' + (r.verify.recommendation_issues || []).filter(i => i.recommendation === x.id).map(i => i.issue).join(' ')).length) rawHits[x.id] = 1;
}
for (const [id, t] of Object.entries(lockHits)) if (!VOID[id] && !NOTES.lock[id] && !NOTES.lockInfo[id]) softOr(angleOf(id), `LOCK: ${id} names ${t.join(', ')} with no lock decision; add a lock note (NOTES.lock) or record it as a description (NOTES.lockInfo)`);
for (const id of [...Object.keys(NOTES.lock), ...Object.keys(NOTES.lockInfo)]) if (!rawHits[id]) softOr(angleOf(id), `NOTES.lock/lockInfo ${id} never named a banned color; remove the entry`);
for (const [id, l] of Object.entries(NOTES.lock)) { const t = lockTerms(l.implication || ''); if (t.length && !/kilit/i.test(l.implication)) fail(`NOTES.lock ${id}: the rewritten line itself recommends ${t.join(', ')}`); }
// A benchmark's lesson line is a recommendation too (the observations only describe other apps); R07 is written by
// another agent, so a banned color there is a warning for that agent's data.
for (const r of R) for (const b of r.benchmarks || []) { const t = lockTerms(b.lessons || ''); if (t.length) softOr(r.id, `LOCK: ${r.id} benchmark "${b.app}" lesson names ${t.join(', ')}`); }

// Forum rules: every signal has a date and a quote of fewer than 15 words (rubric R3, decision D17).
for (const { s } of Object.values(SIG)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date || '')) fail(`signal ${s.id} has no date`);
  if (s.quote && words(s.quote) >= 15) fail(`signal ${s.id} quotes ${words(s.quote)} words (must be under 15)`);
}

// Store reviews (finding 11 of round 2): an App Store review feed is paged by recency and a Play link opens only the
// app page, so each row links the readable app page and names the saved copy that holds the review.
// An App Store review feed URL becomes its readable app page plus the saved copy of that feed page.
const FEED_RE = /itunes\.apple\.com\/(\w\w)\/rss\/customerreviews\/page=(\d+)\/id=(\d+)\//;
const feedCopies = m => [`r09/raw/${m[1]}-${m[3]}-p${m[2]}.json`, `verify/R09_src/itunes/${m[1]}_${m[3]}_p${m[2]}.json`];
function feedOf(url) {
  const m = String(url).match(FEED_RE); if (!m) return null;
  const copy = feedCopies(m).find(f => has(path.join(D, f)));
  if (!copy) fail(`App Store feed without a saved copy: ${url}`);
  return { page: `https://apps.apple.com/${m[1]}/app/id${m[3]}`, copy };
}
const storeCopy = {};
for (const { s } of Object.values(SIG)) {
  const m = String(s.url).match(FEED_RE);
  const play = /play\.google\.com\/store\/apps\/details/.test(s.url) ? new URL(s.url).searchParams.get('id') : null;
  if (!m && !play) continue;
  const cands = m ? feedCopies(m) : [`r09/play_reviews.json`, `verify/R09_src/play/${play}.json`, `verify/R09_src/play/${play}.html`, `r09/play.json`];
  const needle = m ? (s.review_title || s.quote) : s.review_id;
  const copy = cands.find(f => has(path.join(D, f)) && needle && fs.readFileSync(path.join(D, f), 'utf8').includes(needle));
  if (!copy) { fail(`store review ${s.id}: no saved copy holds it (${cands.join(', ')})`); continue; }
  storeCopy[s.id] = { page: m ? `https://apps.apple.com/${m[1]}/app/id${m[3]}` : s.url, copy, store: m ? 'App Store' : 'Google Play' };
}

// ---------------------------------------------------------------------------------------------------------------
// Open question states (finding 16 of round 2).
const OQ = {};
for (const r of R) {
  const qs = r.open_questions || [], spec = NOTES.oq[r.id] || [];
  // A key matches the start of its question; a key that begins with '~' matches anywhere in it (for data another
  // agent may reword).
  const matches = (q, key) => key.startsWith('~') ? q.includes(key.slice(1)) : q.startsWith(key);
  OQ[r.id] = qs.map(q => {
    const hit = spec.find(([key]) => matches(q, key));
    if (!hit) { softOr(r.id, `open question of ${r.id} has no state: ${q.slice(0, 60)}`); return { q, s: 'a', t: '' }; }
    return { q, s: hit[1], t: hit[2] };
  });
  for (const [key] of spec) if (!qs.some(q => matches(q, key))) softOr(r.id, `NOTES.oq ${r.id}: no open question matches "${key}"`);
  for (const st of OQ[r.id]) if (!['a', 'k', 'x'].includes(st.s)) fail(`NOTES.oq ${r.id}: unknown state ${st.s}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Traceability (decision E11): the table lists exactly the decisions of the token file's "sources" (through
// trace.json, the same list tasarim.html#kaynaklar counts), and under it the ids each design section cites now.
const designText = design.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
const textOf = s => s.replace(/<\/?(?:code|a|span|strong|em|b|i|abbr|kbd|q|small|sup|sub|mark|s)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/\s+([.,;:)])/g, '$1').trim();
const ID_RE = /\b([RL]\d{1,2}-[KFSC]\d{2,3})\b/g;
const idsIn = s => [...new Set([...s.matchAll(ID_RE)].map(m => m[1]))];
const dSecs = [...designText.matchAll(/<section id="([^"]+)"/g)].map(m => ({ id: m[1], i: m.index }));
const dBody = {}, dTitle = {};
dSecs.forEach((s, k) => { dBody[s.id] = designText.slice(s.i, k + 1 < dSecs.length ? dSecs[k + 1].i : designText.length); const h2 = dBody[s.id].match(/<h2[^>]*>([\s\S]*?)<\/h2>/); dTitle[s.id] = h2 ? textOf(h2[1]) : s.id; });
const traceLabel = k => k.replace(/[._-]+/g, ' ').replace(/^./, c => c.toUpperCase()); // as sources2html.js writes it
if (!traceJson) fail('trace.json is missing (--trace); regenerate it with sources2html.js');
const decisions = (traceJson || []).map(t => ({ label: t.decision, ids: [...t.ids] }));
{
  const want = Object.entries(T.sources || {}).map(([k, ids]) => ({ decision: traceLabel(k), ids: [].concat(ids).map(String) }));
  if (!want.length) fail('tokens.json has no "sources"');
  if (traceJson && JSON.stringify(want) !== JSON.stringify(traceJson)) fail('trace.json differs from tokens.json "sources"; regenerate it with sources2html.js');
}
// Where the design document states the same count (its Kaynaklar section today; the sentence may move to the footer),
// the summary says so; a different number is reported, never printed.
const designCount = (() => {
  const where = dBody.kaynaklar ? textOf(dBody.kaynaklar) : textOf(designText);
  const m = where.match(/İzlenebilirlik[^.]{0,240}?(\d+) karar/) || (dBody.kaynaklar ? where.match(/(\d+) karar/) : null);
  return m ? { n: +m[1], anchor: dBody.kaynaklar ? 'kaynaklar' : null } : null;
})();
if (design && designCount && designCount.n !== decisions.length) warn(`WARNING: tasarim.html says ${designCount.n} decisions, the token file has ${decisions.length}; the design document is older than tokens.json`);
const designCountLine = designCount && designCount.n === decisions.length ? (designCount.anchor ? `, ${designRef(designCount.anchor)} aynı ${decisions.length} kararı sayar` : `, tasarım belgesi aynı ${decisions.length} kararı sayar`) : '';
const sectionIds = {};
for (const [sec, body] of Object.entries(dBody)) if (sec !== 'kaynaklar') { const l = idsIn(body); if (l.length) sectionIds[sec] = l; }
const traced = new Set([...decisions.flatMap(d => d.ids), ...Object.values(sectionIds).flat()]);
for (const x of idsIn(designText)) if (!traced.has(x)) fail(`trace: ${x} is cited by the design but in no row`);
for (const x of traced) if (!KNOWN.has(x)) warn(`WARNING: trace: ${x} is cited but is not a research record`);
// Reverse map for the 'Tasarımda' line under each record.
const ascii = s => s.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[âî]/g, m => m === 'â' ? 'a' : 'i');
const decId = d => 'iz-' + ascii(fold(d.label)).replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-');
const REVERSE = {};
for (const d of decisions) for (const x of d.ids) (REVERSE[x] = REVERSE[x] || []).push({ label: d.label, href: '#' + decId(d) });
for (const [sec, list] of Object.entries(sectionIds)) for (const x of list) (REVERSE[x] = REVERSE[x] || []).push({ label: (dTitle[sec] || sec) + ' bölümü', href: '#iz-bolum-' + sec });
const usedLine = id => REVERSE[id] ? `<p class="used">Tasarımda: ${REVERSE[id].map(u => `<a href="${u.href}">${esc(u.label)}</a>`).join(', ')}</p>` : '';

// ---------------------------------------------------------------------------------------------------------------
// Library: which rows the final stack changed, and what replaced them.
const finalBy = {};
if (FINAL) for (const side of ['phone', 'panel', 'shared']) for (const e of FINAL[side] || []) finalBy[side + ':' + fold(e.category.replace(/\s*\(.*$/, ''))] = e;
const sideOf = id => ({ L1: ['phone', 'shared'], L2: ['phone', 'shared'], L3: ['panel', 'shared'], L4: ['panel', 'shared'], L5: ['shared', 'phone', 'panel'] })[id.split('-')[0]];
const finalFor = (rowId, category) => { for (const s of sideOf(rowId) || []) { const e = finalBy[s + ':' + fold(category.replace(/\s*\(.*$/, ''))]; if (e) return e; } return null; };
// A row is replaced by an overturned entry when it was its area's choice (seçildi or gerekmez), names a package or
// platform feature that the entry's 'old' text names, and sits in the entry's category (or, for an entry whose
// category no row has, is a chosen row whose package the entry names).
const STOP = new Set(['platform', 'yok', 'npm', 'paketi', 'değil', 'bileşen', 'kütüphanesi', 'durum', 'yerel', 'cli']);
const catOf = s => fold(String(s).replace(/^(Telefon|Panel|Ortak):\s*/, '').replace(/\s*\(.*$/, ''));
const pkgTokens = p => String(p).replace(/^(platform|yok):\s*/i, '').split(/[\s(),+]+/).map(t => t.toLowerCase()).filter(t => t.length >= 3 && !STOP.has(t));
const CHANGED = {};
if (FINAL) for (const o of FINAL.overturned || []) {
  const old = String(o.old).toLowerCase(), cat = catOf(o.category);
  const chosen = Object.values(ROW).filter(({ c }) => ['seçildi', 'gerekmez'].includes(c.verdict) && pkgTokens(c.package).some(t => old.includes(t)));
  let hits = chosen.filter(({ c }) => { const rc = catOf(c.category); return rc.includes(cat) || cat.includes(rc); });
  if (!hits.length) hits = chosen.filter(({ c }) => c.verdict === 'seçildi');
  if (!hits.length) { warn(`WARNING: final.json overturned "${o.category}" (${o.old}) matches no library row`); continue; }
  for (const { c } of hits) {
    const e = finalFor(c.id, c.category);
    CHANGED[c.id] = { now: e ? e.pick : o.new, second: e ? e.second : '', why: o.why };
  }
}
if (FINAL) { const got = Object.keys(CHANGED).sort().join(' '), want = [...NOTES.overturnedExpect].sort().join(' '); if (got !== want) warn(`WARNING: rows marked as changed differ from the 6 October set: got ${got}; expected ${want}`); }

// ---------------------------------------------------------------------------------------------------------------
// Renderers.
const VERD = { 'doğrulandı': 'ok', 'kısmen': 'part', 'desteklenmiyor': 'bad', 'eskimiş': 'old', 'açılamadı': 'na' };
const badge = c => `<span class="v v-${VERD[c.verdict] || 'na'}">${esc(c.verdict)}</span>`;
const shortUrl = u => { try { const x = new URL(u); const p = (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/$/, ''); return p.length > 64 ? p.slice(0, 61) + '...' : p; } catch { return u; } };
let notesShort = 0, wordsFull = 0, wordsShort = 0;
// A confirmed note shrinks to 'birebir' plus what the source adds (finding 12 of round 2); any other verdict is shown
// in full under the record.
function okNote(c, recText, extra, id) {
  const { ek, lost } = shortNote(id ? show(id, 'note', c.note) : c.note, recText);
  if (lost.length) fail(`short note of ${c.finding || c.signal || c.app} drops ${lost.join(', ')}`);
  // A checked App Store feed or lookup address is shown as the readable app page (and the saved feed copy).
  const u = c.url_checked, f = u && feedOf(u), look = u && String(u).match(/itunes\.apple\.com\/lookup\?id=(\d+)(?:&(?:amp;)?country=(\w\w))?/);
  const checkedLink = !u ? '' : f ? `<a href="${esc(f.page)}" rel="noopener">${esc(shortUrl(f.page))}</a> (alınan yorum akışı: <code class="rvid">${esc(f.copy)}</code>)` : look ? `<a href="https://apps.apple.com/${look[2] || 'tr'}/app/id${look[1]}" rel="noopener">apps.apple.com/${look[2] || 'tr'}/app/id${look[1]}</a>` : `<a href="${esc(u)}" rel="noopener">${esc(shortUrl(u))}</a>`;
  const head = `birebir${checkedLink ? ` · denetlenen: ${checkedLink}` : ''}`;
  const body = head + (ek.length ? ` · Ek: ${ek.map(s => prose(s)).join(' ')}` : '') + (extra ? ` <strong>${esc(extra)}</strong>` : '');
  notesShort++; wordsFull += words(c.note); wordsShort += words(body.replace(/<[^>]+>/g, ' '));
  return `<details class="vdet"><summary>${badge(c)}<span class="vh"> doğrulama notu</span></summary><p>${body}</p></details>`;
}
const liveLink = s => !NOTES.deadLinks[s.url];
const srcLink = s => { const f = feedOf(s.url); return f ? `<a href="${esc(f.page)}" rel="noopener">${esc(s.title || host(s.url))}</a><span class="src-meta"> App Store uygulama sayfası · alınan yorum akışı: <code class="rvid">${esc(f.copy)}</code></span>` : `<a href="${esc(s.url)}" rel="noopener">${esc(s.title || host(s.url))}</a><span class="src-meta"> ${esc([s.publisher, s.date && trDate(s.date)].filter(Boolean).join(', '))}</span>`; };
const box = (title, body) => `<div class="box box-fix"><p><strong>${esc(title)}</strong> ${body}</p></div>`;
const issuesOf = r => { const m = {}; for (const i of r.verify.recommendation_issues || []) (m[i.recommendation] = m[i.recommendation] || []).push(i.issue); return m; };
const LOCK_LINK = '<a href="#kilit">6 Ekim 2026 kilidi</a>';
let issuesShown = 0, issuesHeld = 0, lockNotesShown = 0;

function renderRec(k, issues) {
  const isVoid = !!VOID[k.id], dep = NOTES.departed[k.id], part = NOTES.partial[k.id];
  const tags = (isVoid ? '<span class="tag tag-void">Geçersiz</span>' : '') + (dep ? '<span class="tag tag-dep">Tasarım ayrıldı</span>' : '') + (part ? '<span class="tag tag-note">Düzeltme notu</span>' : '');
  let h = `<article class="rec${isVoid ? ' is-void' : ''}" id="${anchor(k.id)}"><header class="rec-h"><span class="rid">${k.id}</span> <span class="rec-t">${plain(k.topic || '')}</span>${tags}</header>`;
  const based = (k.based_on || []).length ? `<p class="based">Dayanak: ${k.based_on.map(b => `<a href="#${anchor(b)}">${b}</a>`).join(', ')}</p>` : '';
  const iss = issues[k.id] || [];
  if (isVoid) {
    issuesHeld += iss.length;
    h += `<p class="note note-void"><strong>Geçersiz:</strong> ${LOCK_LINK}. ${prose(VOID[k.id], k.id)}</p>${based}`;
    if (iss.length) h += `<p class="held">Doğrulayıcının bu öneriye ait ${iss.length} notu öneriyle birlikte kalktı; değerleri kilit gereği gösterilmez.</p>`;
    return h + usedLine(k.id) + `</article>\n`;
  }
  if (dep) h += `<p class="note note-dep"><strong>Tasarım ayrıldı:</strong> ${prose(dep, k.id)}</p>`;
  if (part) h += `<p class="note note-part"><strong>Düzeltme:</strong> ${prose(part, k.id)}</p>`;
  h += `<p>${prose(show(k.id, 'recommendation', k.recommendation))}</p>`;
  const vals = k.values || [], rowNotes = NOTES.rowNote[k.id] || {}, counter = NOTES.counter[k.id] || {};
  if (vals.length) {
    const rowNote = v => Object.entries(rowNotes).find(([pre]) => String(v.name).startsWith(pre));
    const withNote = vals.some(v => (v.note || '').trim() || rowNote(v));
    h += `<div class="tw tw-vals"><table class="vals"><tbody>${vals.map(v => {
      const marks = Object.entries(counter).filter(([hex]) => strings(v).some(s => s.toUpperCase().includes(hex))).map(([, why]) => `<span class="mark">${esc(why)}</span>`).join('');
      const rn = rowNote(v);
      return `<tr><th scope="row">${plain(v.name)}</th><td><code>${esc(v.value)}</code>${marks}</td>${withNote ? `<td>${prose(v.note || '')}${rn ? `<p class="rownote">${prose(rn[1])}</p>` : ''}</td>` : ''}</tr>`;
    }).join('')}</tbody></table></div>`;
    for (const pre of Object.keys(rowNotes)) if (!vals.some(v => String(v.name).startsWith(pre))) fail(`NOTES.rowNote ${k.id}: no value row starts with "${pre}"`);
  }
  if (k.reasons) h += `<p class="why"><strong>Gerekçe:</strong> ${prose(show(k.id, 'reasons', k.reasons))}</p>`;
  if ((k.alternatives || []).length) h += `<ul class="alts">${k.alternatives.map(a => `<li><strong>${plain(a.option)}</strong>: ${prose(a.why_not)}</li>`).join('')}</ul>`;
  h += based;
  for (const t of iss) { h += `<p class="issue"><strong>Doğrulayıcının notu:</strong> ${prose(t)}</p>`; issuesShown++; }
  return h + usedLine(k.id) + `</article>\n`;
}

function renderFinding(x, c) {
  const lock = NOTES.lock[x.id];
  let h = `<li id="${anchor(x.id)}"><div class="f-h"><span class="rid">${x.id}</span> <strong>${plain(show(x.id, 'title', x.title))}</strong>${x.load_bearing ? ' <span class="lb">karar dayanağı</span>' : ''}${lock ? ' <span class="tag tag-lock">Kilit notu</span>' : ''}${c && c.verdict !== 'doğrulandı' ? ' ' + badge(c) : ''} <span class="conf">güven: ${esc(x.confidence)}</span></div>`;
  if (lock) { h += `<p class="note note-lock"><strong>Kilit:</strong> ${LOCK_LINK}; buradaki yeşil ve kehribar değerler yalnız ölçüm kaydıdır, “Bizim için” satırı kilide göre yeniden yazıldı.</p>`; lockNotesShown++; }
  h += `<p>${prose(show(x.id, 'claim', x.claim))}</p><p class="ev">${prose(show(x.id, 'evidence', x.evidence))}</p><p class="imp"><strong>Bizim için:</strong> ${prose(lock ? lock.implication : show(x.id, 'implication', x.implication), x.id)}</p>`;
  if (c && c.verdict !== 'doğrulandı') h += `<p class="vnote"><strong>Doğrulama (${esc(c.verdict)}):</strong> ${prose(show(x.id, 'note', c.note))}${NOTES.fixed[x.id] ? ` <strong>${esc(NOTES.fixed[x.id])}</strong>` : ''}</p>`;
  else if (c) h += okNote(c, recTextOf(x), NOTES.fixed[x.id], x.id);
  const sigsOf = url => Object.values(SIG).filter(g => g.r.id === x.id.slice(0, 3) && g.s.url === url).map(g => g.s.id);
  h += `<p class="srcs">${x.sources.filter(liveLink).map(s => { const sg = sigsOf(s.url); return srcLink(s) + (sg.length ? ` <span class="src-meta">(yorumlar: ${sg.map(id => `<a href="#${anchor(id)}">${id}</a>`).join(', ')})</span>` : ''); }).join(' · ')}</p>`;
  return h + usedLine(x.id) + `</li>\n`;
}

function renderSignals(r) {
  const sm = Object.fromEntries((r.verify.signals_checked || []).map(c => [c.signal, c]));
  const sigs = r.signals;
  const groups = {};
  for (const s of sigs) { const g = s.platform.replace(/^Reddit .*/, 'Reddit').split(/[,(]/)[0].trim(); groups[g] = (groups[g] || 0) + 1; }
  const design = sigs.filter(s => /^Reddit r\/(UXDesign|UI_Design|web_design)$/.test(s.platform)).length;
  const old = sigs.filter(s => s.date < '2024-01-01'), years = sigs.map(s => +s.date.slice(0, 4));
  const stores = sigs.filter(s => storeCopy[s.id]).length;
  let h = `<h3>Forum ve yorum sinyalleri (${sigs.length})</h3>\n<p class="mix">Kaynak dağılımı: ${Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${esc(g)} ${n}`).join(', ')}${design ? ` (Reddit'tekilerin ${count(design, 'i')} r/UXDesign, r/UI_Design ve r/web_design tasarım topluluklarından)` : ''}. Tarih: ${Math.min(...years)} ile ${Math.max(...years)} arası${old.length ? `; ${old.length} sinyal 2024 öncesi, tabloda işaretli` : ''}.${stores ? ` ${count(stores, 'i')} mağaza yorumu: kalıcı bağlantıları olmadığı için uygulama sayfasına bağlanır, yorum başlık ve tarihle bulunur, alınan kopyanın yolu satırda.` : ''}</p>\n`;
  h += `<div class="tw"><table class="sig"><thead><tr><th scope="col">No</th><th scope="col">Yer</th><th scope="col">Tarih</th><th scope="col">Konu</th><th scope="col">Özet</th><th scope="col">Alıntı</th><th scope="col">Yön</th><th scope="col">Kontrol</th></tr></thead><tbody>\n`;
  for (const s of sigs) {
    const c = sm[s.id], st = storeCopy[s.id];
    const review = [s.rating != null ? `${s.rating}/5 yıldız` : '', s.review_id ? `yorum kimliği <code class="rvid">${esc(s.review_id)}</code>` : '', s.review_title ? `başlık: “${esc(s.review_title)}”` : '', st ? `alınan kopya: <code class="rvid">${esc(st.copy)}</code>` : ''].filter(Boolean).join(' · ');
    const rec = [s.platform, s.theme, s.paraphrase, s.quote, s.date, s.review_title].join(' ');
    h += `<tr id="${anchor(s.id)}"><td class="nw" data-label="No">${s.id}</td><td data-label="Yer"><a href="${esc(st ? st.page : s.url)}" rel="noopener">${esc(s.platform)}</a>${review ? `<br><span class="src-meta">${review}</span>` : ''}</td><td class="nw" data-label="Tarih">${esc(s.date)}${s.date < '2024-01-01' ? '<br><span class="old">2024 öncesi</span>' : ''}</td><td data-label="Konu">${plain(s.theme)}</td><td data-label="Özet">${prose(s.paraphrase)}</td><td data-label="Alıntı">${s.quote ? '<q>' + esc(s.quote) + '</q>' : ''}</td><td data-label="Yön">${esc(s.sentiment)}</td><td data-label="Kontrol">${c ? (c.verdict === 'doğrulandı' ? okNote(c, rec, NOTES.fixed[s.id], s.id) : badge(c)) : '<span class="v v-na">denetlenmedi</span>'}</td></tr>\n`;
    if (c && c.verdict !== 'doğrulandı') h += `<tr class="rownote-tr"><td></td><td colspan="7"><strong>Doğrulama (${esc(c.verdict)}):</strong> ${prose(show(s.id, 'note', c.note))}${NOTES.fixed[s.id] ? ` <strong>${esc(NOTES.fixed[s.id])}</strong>` : ''}</td></tr>\n`;
  }
  return h + `</tbody></table></div>\n`;
}

// The benchmark table renders whatever the data holds: a column appears when at least one row has an observation in
// it, and a cell that only says the source had nothing is shown as such (another agent may refill these rows).
const BENCH_COLS = [['why', 'Neden'], ['observed', 'Gözlenen'], ['palette', 'Renk'], ['radius', 'Köşe'], ['type', 'Yazı'], ['motion', 'Hareket'], ['navigation', 'Gezinme'], ['lessons', 'Ders']];
const BENCH_SKIP = new Set(['app', 'category', 'sources', 'id', 'url', 'urls', 'screenshots', 'checked']);
const EMPTY_CELL = /^(açılan\s+)?kaynak(lar)?(ta|da)\s+(tasarım bilgisi\s+|değer\s+)?yok|^değer yok|^açılan kaynak(lar)?da\b.*\byok\b|^-$|^yok\.?$/i;
const isEmptyCell = v => v == null || (typeof v === 'string' && (!v.trim() || EMPTY_CELL.test(v.trim())));
function renderBench(r) {
  const B = r.benchmarks;
  const bm = Object.fromEntries((r.verify.benchmarks_checked || []).map(c => [c.app, c]));
  const checked = B.filter(b => bm[b.app]);
  const tally = v => checked.filter(b => bm[b.app].verdict === v).length;
  const extra = [...new Set(B.flatMap(b => Object.keys(b)))].filter(k => !BENCH_SKIP.has(k) && !BENCH_COLS.some(([c]) => c === k) && B.some(b => typeof b[k] === 'string' && !isEmptyCell(b[k])));
  const cols = [...BENCH_COLS.filter(([k]) => B.some(b => typeof b[k] === 'string' && !isEmptyCell(b[k]))), ...extra.map(k => [k, k])];
  const obsCols = cols.filter(([k]) => k !== 'why' && k !== 'lessons');
  const observed = B.filter(b => obsCols.some(([k]) => !isEmptyCell(b[k]))).length;
  const links = b => [...(b.sources || []).filter(liveLink).map(s => s.url), ...[].concat(b.screenshots || [], b.urls || []).map(x => typeof x === 'string' ? x : x && x.url).filter(Boolean)];
  const seen = observed === B.length ? `${B.length} uygulamanın hepsinde` : `${B.length} uygulamanın ${count(observed, 'inde')}`;
  // The verifier read an earlier text of these rows when the data file was rewritten after the verify file.
  const stale = (() => { try { return fs.statSync(path.join(D, 'research', r.id + '.json')).mtimeMs - fs.statSync(path.join(D, 'verify', r.id + '.json')).mtimeMs > 60000; } catch { return false; } })();
  const gone = (r.verify.benchmarks_checked || []).filter(c => !B.some(b => b.app === c.app)).map(c => c.app);
  if (gone.length) warn(`WARNING: verify/${r.id}.json checks apps that are no longer in the table: ${gone.join(', ')}`);
  let h = `<h3>Uygulama gözlemleri (${B.length})</h3>\n<p class="mix">${seen} kaynaktan alınmış en az bir arayüz gözlemi var${observed < B.length ? `; ${B.length - observed} uygulama yalnız seçilme nedenini taşır` : ''}. ${count(checked.length, 'i')} denetlendi (${tally('doğrulandı')} aynen, ${tally('kısmen')} kısmen); öbür ${B.length - checked.length} uygulama “denetlenmedi” işaretli.${stale ? ' Denetim bu satırların önceki metnine yapıldı; satırlar sonradan yeniden yazıldığı için rozetler yeni gözlemleri kapsamaz.' : ''}</p>\n`;
  // Paragraph-long observations read as one card per app (label and value pairs), not as a nine-column table.
  const slugs = new Set();
  h += `<div class="bench-list">\n`;
  for (const b of B) {
    const c = bm[b.app];
    const rec = strings(b).join(' ');
    let slug = 'r07-' + ascii(fold(b.app)).replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-').slice(0, 40); while (slugs.has(slug)) slug += '-2'; slugs.add(slug);
    h += `<article class="bench-card" id="${slug}"><header class="bench-h"><strong>${esc(b.app)}</strong> <span class="src-meta">${esc(b.category || '')}</span> ${c ? (c.verdict === 'doğrulandı' ? okNote(c, rec) : badge(c)) : '<span class="v v-na">denetlenmedi</span>'}</header>`;
    h += `<dl class="bench-dl">${cols.map(([k, t]) => `<dt>${esc(t)}</dt><dd>${isEmptyCell(b[k]) ? '<span class="src-meta">kaynakta yok</span>' : prose(b[k])}</dd>`).join('')}</dl>`;
    if (c && c.verdict !== 'doğrulandı') h += `<p class="vnote"><strong>Doğrulama (${esc(c.verdict)}):</strong> ${prose(c.note)}</p>`;
    const ls = links(b);
    if (ls.length) h += `<p class="srcs">${ls.map(u => `<a href="${esc(u)}" rel="noopener">${esc(shortUrl(u))}</a>`).join(' · ')}</p>`;
    h += `</article>\n`;
  }
  return h + `</div>\n`;
}

function renderQuestions(r) {
  const st = OQ[r.id] || [];
  if (!st.length) return '';
  const open = st.filter(x => x.s === 'a'), done = st.filter(x => x.s !== 'a');
  const q = (x, i) => prose(show(r.id, `oq.${(r.open_questions || []).indexOf(x.q)}`, x.q), r.id);
  let h = `<h3 id="${anchor(r.id)}-oq">Açık sorular (${open.length} açık, ${done.length} kapandı ya da konusuz)</h3>\n`;
  if (open.length) h += `<ul class="oq">${open.map(x => `<li>${q(x)}${x.t ? ` <span class="oq-ref">${prose(x.t, r.id)}</span>` : ''}</li>`).join('')}</ul>\n`;
  if (done.length) h += `<details class="oqd"><summary>Kapanan ve konusuz kalan sorular (${done.length})</summary><ul class="oq">${done.map(x => `<li class="is-closed"><span class="tag ${x.s === 'k' ? 'tag-note' : 'tag-moot'}">${x.s === 'k' ? 'Kapandı' : 'Konusuz kaldı'}</span> ${q(x)} <span class="oq-ref">${prose(x.t, r.id)}</span></li>`).join('')}</ul></details>\n`;
  return h;
}

const sec = [];
for (const r of R) {
  const vm = Object.fromEntries(r.verify.checked.map(c => [c.finding, c]));
  const issues = issuesOf(r);
  for (const id of Object.keys(issues)) if (!REC[id]) fail(`verify/${r.id}.json has an issue for missing recommendation ${id}`);
  let h = `<section id="${anchor(r.id)}" class="angle">\n<h2><span class="rid">${r.id}</span> ${plain(r.angle)}</h2>\n`;
  if (NOTES.changed[r.id]) h += box('Değişti:', prose(NOTES.changed[r.id], r.id));
  h += `<p class="summary">${prose(show(r.id, 'summary', r.summary), r.id)}</p>\n`;
  h += `<h3>Öneriler</h3>\n<div class="recs">\n${(r.recommendations || []).map(k => renderRec(k, issues)).join('')}</div>\n`;
  h += `<h3>Bulgular</h3>\n<ol class="findings">\n${r.findings.map(x => renderFinding(x, vm[x.id])).join('')}</ol>\n`;
  if ((r.signals || []).length) h += renderSignals(r);
  if ((r.benchmarks || []).length) h += renderBench(r);
  h += renderQuestions(r);
  sec.push(h + `</section>\n`);
}
const totalIssues = R.reduce((n, r) => n + (r.verify.recommendation_issues || []).length, 0);
if (issuesShown + issuesHeld !== totalIssues) fail(`verifier issues: ${issuesShown} shown + ${issuesHeld} held != ${totalIssues} in verify/*.json`);
if (lockNotesShown !== Object.keys(NOTES.lock).filter(id => FIN[id]).length) fail(`lock notes shown ${lockNotesShown} != ${Object.keys(NOTES.lock).length} in NOTES.lock`);

// Library section (finding 13 of round 2): full rows for the picks; second choices, rejected rows and picks the final
// decision replaced are one line each.
const sentencesWhy = s => String(s || '').replace(/^(Reddedildi|Seçildi|İkinci|Gerekmez)\s*:\s*/i, '').split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9'"“(])/u).filter(Boolean);
function oneReason(c) {
  const ss = sentencesWhy(c.why);
  let s = (c.verdict === 'ikinci' && (ss.find(x => /^Birinci olmadı/.test(x)) || ss.find(x => /^Ama\b/.test(x)))) || ss[0] || '';
  s = s.replace(/^Birinci olmadı,?\s*(çünkü\s*)?/i, '').replace(/^Ama\s+/, '');
  if (words(s) > 28) { const i = s.indexOf(';'); if (i > 20) s = s.slice(0, i); }
  s = s.replace(/[\s.;,:]+$/, '');
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}
// lib/final.json writes a choice without a package as 'yok: <what is used>'.
const pickText = s => /^yok$/i.test(String(s).trim()) ? 'paket yok' : String(s).replace(/^yok:\s*(.*)$/i, '$1 (paket yok)');
const pkgLink = c =>(stats[c.package] || {}).version ? `<a href="https://www.npmjs.com/package/${esc(c.package)}" rel="noopener">npm</a>` : ((c.sources || []).filter(liveLink)[0] ? `<a href="${esc(c.sources.filter(liveLink)[0].url)}" rel="noopener">${esc(host(c.sources.filter(liveLink)[0].url))}</a>` : '');
const usedInline = id => REVERSE[id] ? ` · Tasarımda: ${REVERSE[id].map(u => `<a href="${u.href}">${esc(u.label)}</a>`).join(', ')}` : '';
const compact = (c, extraHtml) => `<li id="${anchor(c.id)}"><span class="rid">${c.id}</span> <code>${esc(c.package)}</code> <span class="src-meta">${plain(c.category)}</span>${extraHtml}${NOTES.departed[c.id] ? ` <span class="rownote-inline"><strong>Tasarım ayrıldı:</strong> ${prose(NOTES.departed[c.id], c.id)}</span>` : ''} · ${pkgLink(c)}${usedInline(c.id)}</li>`;
let libFull = 0, libCompact = 0;
if (LIB.length) {
  const rows = LIB.flatMap(l => l.candidates);
  const measuredRows = rows.filter(c => (stats[c.package] || {}).version);
  const notPkg = c => /^(platform|yok)\b|^\(|npm paketi değil/i.test(c.package) || /\s/.test(c.package.replace(/\s*\(.*\)$/, ''));
  const pkgs = new Set(measuredRows.map(c => c.package));
  COUNTS.libRows = rows.length; COUNTS.libMeasured = measuredRows.length; COUNTS.libPkgs = pkgs.size;
  let h = `<section id="kutuphaneler" class="angle">\n<h2>Kütüphaneler</h2>\n<p class="summary">Beş alanda ${rows.length} aday satırı karşılaştırıldı. npm paketi olan ${count(measuredRows.length, 'in')} arkasında ${pkgs.size} ayrı npm paketi var (aynı paket birden çok alanda aday); sürüm ve tarih npm kayıt servisinden, haftalık indirme npm sayaçlarından, yıldız ve issue verisi ecosyste.ms üzerinden GitHub'dan betikle ölçüldü (libstats.js), ajan beyanı değildir. Paket olmayan ${rows.filter(c => !(stats[c.package] || {}).version && notPkg(c)).length} satır (platform özelliği ya da npm dışı araç) 'paket değil' yazar. Tam satır ve ölçüm yalnız seçilenlerde; ikinci seçenekler, elenenler ve son kararla değişen seçimler birer satır (tam ölçüm lib/stats.json'da).</p>\n`;
  if (FINAL) h += box('Son karar:', `lib/final.json bu alanlardaki ${Object.keys(CHANGED).length} seçimi değiştirdi; her alanda “Son kararla değişenler” altında. Çelişkilerin nasıl çözüldüğü bölümün sonunda (<a href="#kutuphaneler-cozumler">Çözülen çelişkiler</a>).`);
  for (const l of LIB) {
    const full = l.candidates.filter(c => ['seçildi', 'gerekmez'].includes(c.verdict) && !CHANGED[c.id]);
    const changedHere = l.candidates.filter(c => CHANGED[c.id]);
    const second = l.candidates.filter(c => c.verdict === 'ikinci' && !CHANGED[c.id]);
    const rejected = l.candidates.filter(c => !['seçildi', 'gerekmez', 'ikinci'].includes(c.verdict) && !CHANGED[c.id]);
    h += `<h3 id="${anchor(l.id)}"><span class="rid">${l.id}</span> ${plain(l.area)}</h3>\n`;
    if (changedHere.length) h += box('Değişti:', `bu alanda ${changedHere.length} seçim son kararla değişti (${changedHere.map(c => `<a href="#${anchor(c.id)}">${c.id}</a>`).join(', ')}); yenileri tablonun altında, “Son kararla değişenler” başlığında.`);
    h += `<p class="summary">${prose(show(l.id, 'summary', l.summary), l.id)}</p>\n<ul class="needs">${(l.needs || []).map(n => `<li>${prose(n)}</li>`).join('')}</ul>\n`;
    h += `<div class="tw"><table class="lib"><thead><tr><th scope="col">Konu</th><th scope="col">Paket</th><th scope="col">Karar</th><th scope="col">Ölçülen</th><th scope="col">Ne işe yarar</th><th scope="col">Gerekçe</th><th scope="col">Uyum</th></tr></thead><tbody>\n`;
    for (const c of full) {
      const s = stats[c.package] || {};
      const m = s.version ? `${esc(s.version)} (${esc(trDate(s.released))})<br>${s.weeklyDownloads != null ? num(s.weeklyDownloads) + ' indirme/hafta' : ''}<br>${s.stars != null ? num(s.stars) + ' yıldız' : ''}<br>son kod ${esc(trDate(s.pushedAt) || '?')}${s.pastYearAvgDaysToCloseIssue != null ? '<br>issue ort. ' + num(s.pastYearAvgDaysToCloseIssue) + ' günde kapanıyor' : ''}${s.archived ? '<br><strong>arşivlenmiş</strong>' : ''}${s.deprecated ? '<br><strong>kullanımdan kalkmış</strong>' : ''}` : (notPkg(c) ? 'paket değil' : 'ölçülemedi');
      const cls = c.verdict === 'seçildi' ? 'pick' : 'none';
      h += `<tr id="${anchor(c.id)}" class="lv-${cls}"><td data-label="Konu"><span class="rid">${c.id}</span><br>${plain(c.category)}</td><td data-label="Paket"><code>${esc(c.package)}</code>${c.repo ? `<br><a href="https://github.com/${esc(c.repo)}" rel="noopener">${esc(c.repo)}</a>` : ''}</td><td data-label="Karar">${esc(c.verdict)}</td><td class="m" data-label="Ölçülen">${m}</td><td data-label="Ne işe yarar">${prose(c.role)}</td><td data-label="Gerekçe">${prose(c.why)}${c.risks ? '<br><em>Risk:</em> ' + prose(c.risks) : ''}<br>${(c.sources || []).filter(liveLink).map(x => `<a href="${esc(x.url)}" rel="noopener">${esc(host(x.url))}</a>`).join(' ')}${usedLine(c.id)}</td><td data-label="Uyum">${prose(c.compat)}</td></tr>\n`;
      if (NOTES.departed[c.id]) h += `<tr class="rownote-tr"><td></td><td colspan="6"><strong>Tasarım ayrıldı (${c.id}):</strong> ${prose(NOTES.departed[c.id], c.id)}</td></tr>\n`;
      libFull++;
    }
    h += `</tbody></table></div>\n`;
    if (changedHere.length) { h += `<h4>Son kararla değişenler (${changedHere.length})</h4>\n<ul class="lib-compact">${changedHere.map(c => compact(c, ` · bu alanın seçimiydi; son karar: ${prose(pickText(CHANGED[c.id].now))}${CHANGED[c.id].second ? `, ikinci seçenek ${prose(CHANGED[c.id].second)}` : ''}. ${prose(CHANGED[c.id].why)}`)).join('\n')}</ul>\n`; libCompact += changedHere.length; }
    if (second.length) { h += `<h4>İkinci seçenekler (${second.length})</h4>\n<ul class="lib-compact">${second.map(c => compact(c, ` · ${prose(oneReason(c))}`)).join('\n')}</ul>\n`; libCompact += second.length; }
    if (rejected.length) { h += `<h4>Elenenler (${rejected.length})</h4>\n<ul class="lib-compact">${rejected.map(c => compact(c, ` · neden: ${prose(oneReason(c))}`)).join('\n')}</ul>\n`; libCompact += rejected.length; }
  }
  if (libFull + libCompact !== rows.length) fail(`library rows: ${libFull} full + ${libCompact} one-line != ${rows.length}`);
  if (FINAL && (FINAL.conflicts || []).length) {
    h += `<h3 id="kutuphaneler-cozumler">Çözülen çelişkiler</h3>\n<p class="summary">Kütüphane araştırmalarının çeliştiği yerlerde lib/final.json'un verdiği son karar, verildiği sırayla.</p>\n<ol class="conf">\n`;
    FINAL.conflicts.forEach((c, i) => { h += `<li id="cozum-${i + 1}"><strong>${plain(c.topic)}</strong> ${prose(c.decision)} <span class="why">${prose(c.why)}</span></li>\n`; });
    h += `</ol>\n`;
  }
  sec.push(h + `</section>\n`);
}

// Traceability section.
{
  const flag = id => {
    const f = [];
    if (VOID[id]) f.push(['void', 'geçersiz']);
    if (NOTES.lock[id]) f.push(['void', 'kilit notu']);
    if (NOTES.departed[id]) f.push(['dep', 'ayrıldı']);
    if (CHANGED[id]) f.push(['dep', 'değişti']);
    if (NOTES.partial[id] || NOTES.rowNote[id]) f.push(['note', 'düzeltme notu']);
    if (!KNOWN.has(id)) f.push(['void', 'kayıt yok']);
    return f;
  };
  const rank = id => flag(id).some(([k]) => k === 'void') ? 2 : flag(id).length ? 1 : 0;
  const idList = ids => `<span class="idl">${[...ids].map((id, i) => [id, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([id]) => `${KNOWN.has(id) ? `<a href="#${anchor(id)}">${id}</a>` : `<span>${id}</span>`}${flag(id).map(([k, t]) => `<span class="fl fl-${k}">${t}</span>`).join('')}`).join(' ')}</span>`;
  const sourcesOf = id => {
    if (FIN[id]) return FIN[id].x.sources;
    if (REC[id]) return (REC[id].k.based_on || []).flatMap(b => FIN[b] ? FIN[b].x.sources : []);
    if (ROW[id]) return ROW[id].c.sources || [];
    return [];
  };
  // One link per publisher (its first source), at most six, so a row never reads 'Wikipedia, Wikipedia, Wikipedia'.
  const extLinks = ids => { const m = new Map(); for (const s of ids.flatMap(sourcesOf).filter(liveLink)) { const f = feedOf(s.url), label = f ? 'App Store yorumları' : (s.publisher || host(s.url)); if (!m.has(label)) m.set(label, f ? { url: f.page } : s); } return [...m.entries()].slice(0, 6).map(([label, s]) => `<a href="${esc(s.url)}" rel="noopener">${esc(label)}</a>`).join(', '); };
  const nDecIds = new Set(decisions.flatMap(d => d.ids)).size, nSecIds = new Set(Object.values(sectionIds).flat()).size;
  const flagged = [...traced].filter(id => flag(id).length);
  let h = `<section id="izlenebilirlik" class="angle">\n<h2>İzlenebilirlik</h2>\n<p class="summary">tasarim.html'deki ${decisions.length} karar ve dayandıkları ${nDecIds} kayıt; liste token dosyasının “sources” bölümüdür${designCountLine}. Altta tasarımın bölümlerinde bugün anılan ${nSecIds} kimlik. İki tabloda ${traced.size} ayrı kimlik var; ${count(flagged.length, 'i')} işaretli: <span class="fl fl-void">geçersiz</span> kilitle kalktı, <span class="fl fl-void">kilit notu</span> bulgunun yeşil ya da kehribar önerisi kilide göre yeniden yazıldı, <span class="fl fl-dep">ayrıldı</span> tasarım öneriden ayrıldı, <span class="fl fl-dep">değişti</span> kütüphane seçimi son kararla değişti, <span class="fl fl-note">düzeltme notu</span> kaydın üstünde düzeltme var. İşaretli kimlikler satırın sonunda durur. Her kaydın altındaki “Tasarımda” satırı aynı bağı tersinden verir.</p>\n`;
  h += `<div class="tw"><table class="trace"><thead><tr><th scope="col">Karar</th><th scope="col">Dayanak</th><th scope="col">Dış kaynak</th></tr></thead><tbody>\n`;
  for (const d of decisions) h += `<tr id="${decId(d)}"><th scope="row" data-label="Karar">${esc(d.label)}</th><td data-label="Dayanak">${idList(d.ids)}</td><td data-label="Dış kaynak">${extLinks(d.ids) || '<span class="src-meta">yalnız araştırma kaydı</span>'}</td></tr>\n`;
  h += `</tbody></table></div>\n`;
  h += `<h3>Bölümlerde anılan kayıtlar</h3>\n<div class="tw"><table class="trace trace-sec"><thead><tr><th scope="col">Bölüm</th><th scope="col">Kayıtlar</th></tr></thead><tbody>\n`;
  for (const s of dSecs.map(x => x.id).filter(x => sectionIds[x])) h += `<tr id="iz-bolum-${esc(s)}"><th scope="row" data-label="Bölüm">${esc(dTitle[s] || s)}<br><a href="tasarim.html#${esc(s)}"><code>tasarim.html#${esc(s)}</code></a></th><td data-label="Kayıtlar">${idList(sectionIds[s])}</td></tr>\n`;
  h += `</tbody></table></div>\n`;
  COUNTS.traceDecisions = decisions.length; COUNTS.traceIds = traced.size;
  sec.push(h + `</section>\n`);
}

// ---------------------------------------------------------------------------------------------------------------
// Counts for the intro and the header (decision E1: computed, never typed).
{
  // Benchmark checks count only for apps still in the table.
  const checkedF = R.flatMap(r => r.verify.checked || []), checkedS = R.flatMap(r => r.verify.signals_checked || []), checkedB = R.flatMap(r => (r.verify.benchmarks_checked || []).filter(c => (r.benchmarks || []).some(b => b.app === c.app)));
  const r08 = (R.find(r => r.id === 'R08') || {}).signals || [], r09 = (R.find(r => r.id === 'R09') || {}).signals || [];
  Object.assign(COUNTS, {
    angles: R.length, findings: R.reduce((n, r) => n + r.findings.length, 0), recs: R.reduce((n, r) => n + (r.recommendations || []).length, 0),
    signals: R.reduce((n, r) => n + (r.signals || []).length, 0), sigR08: r08.length, sigR09: r09.length,
    hnR08: r08.filter(s => /Hacker News/i.test(s.platform)).length, redditDesignR08: r08.filter(s => /^Reddit r\/(UXDesign|UI_Design|web_design)$/.test(s.platform)).length,
    bench: R.reduce((n, r) => n + (r.benchmarks || []).length, 0), benchChecked: checkedB.length,
    oqTotal: Object.values(OQ).flat().length, oqOpen: Object.values(OQ).flat().filter(x => x.s === 'a').length,
    oqClosed: Object.values(OQ).flat().filter(x => x.s === 'k').length, oqMoot: Object.values(OQ).flat().filter(x => x.s === 'x').length,
  });
  VERDICTS.findings = verdictLine(checkedF, 'bulgu', 'aynen');
  VERDICTS.signals = verdictLine(checkedS, 'sinyal', 'birebir');
  VERDICTS.bench = verdictLine(checkedB, '', 'aynen');
}
// Generated lists for the intro.
const LISTS = {
  void: () => `<ul>${Object.keys(VOID).filter(id => REC[id]).map(id => `<li><a href="#${anchor(id)}">${id}</a> ${plain(REC[id].k.topic || '')}</li>`).join('')}</ul>`,
  lock: () => `<ul>${Object.keys(NOTES.lock).filter(id => FIN[id]).map(id => `<li><a href="#${anchor(id)}">${id}</a> ${plain(FIN[id].x.title)}</li>`).join('')}</ul>`,
  partial: () => Object.keys(NOTES.partial).filter(id => REC[id]).map(id => `<a href="#${anchor(id)}">${id}</a>`).join(', ') + '.',
  open: () => {
    // Open questions grouped by where they are tracked: the design document, the plan, or nowhere yet.
    const groups = { tasarim: {}, plan: {} }, counts = { tasarim: 0, plan: 0 }, loose = [];
    for (const r of R) for (const x of OQ[r.id] || []) if (x.s === 'a') {
      const m = x.t.match(/(tasarim|plan)\.html#([\w-]+)/);
      if (m) { (groups[m[1]][m[2]] = groups[m[1]][m[2]] || new Set()).add(r.id); counts[m[1]]++; } else loose.push({ r, x });
    }
    const where = (doc, a) => doc === 'tasarim' ? designRef(a) : `<code>plan.html#${a}</code>`;
    const line = (doc, lead) => counts[doc] ? `<li>${count(counts[doc], 'i')} ${lead}: ${Object.entries(groups[doc]).map(([a, set]) => `${where(doc, a)} (${[...set].map(id => `<a href="#${anchor(id)}-oq">${id}</a>`).join(', ')})`).join('; ')}.</li>` : '';
    const rest = loose.map(({ r, x }) => `<li><a href="#${anchor(r.id)}-oq">${r.id}</a>: ${prose(show(r.id, `oq.${(r.open_questions || []).indexOf(x.q)}`, x.q), r.id)}</li>`);
    return `<ul class="oq-sum">${line('tasarim', 'tasarımda izleniyor, çoğu Açık noktalar bölümünde')}${line('plan', 'planın açık noktalarında izleniyor')}${rest.length ? `<li>${count(rest.length, 'i')} henüz hiçbir yerde izlenmiyor:<ul>${rest.join('')}</ul></li>` : ''}</ul>`;
  },
};

// Fonts: the design document's own embedded IBM Plex faces, so both files read as one system.
let fontCss = [...design.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m => m[0]).join('\n');
if (!fontCss) for (const f of ['plex-sans.css', 'plex-mono.css']) { const p = path.join(D, 'variants', 'A', 'fonts', f); if (has(p)) fontCss += fs.readFileSync(p, 'utf8') + '\n'; }
if (!/IBM Plex Sans/.test(fontCss)) warn('WARNING: no IBM Plex font faces found; the page falls back to system fonts');
// Colors and motion of this page come from the token file too (decision E1); research.css only names them.
const ease = n => { const e = (T.motion.easing || []).find(x => x.name === n); if (!e) fail(`easing ${n} missing in tokens.json`); return e ? `cubic-bezier(${e.bezier.join(', ')})` : 'ease'; };
const ms = n => { const d = DUR[n]; if (!d) fail(`duration ${n} missing in tokens.json`); return `${d ? d.ms : 0}ms`; };
const status = (k, f) => stepHex(((T.color.status || {})[k] || {})[f] || '');
const tokenCss = `:root {
  --bg: ${roleHex('bg.page')}; --surface: ${roleHex('bg.surface')}; --sunk: ${roleHex('bg.sunken')}; --hover: ${roleHex('bg.hover')};
  --line: ${roleHex('border.subtle')}; --line-strong: ${roleHex('border.strong')}; --text: ${roleHex('text.primary')}; --muted: ${roleHex('text.secondary')};
  --ink: ${roleHex('accent.fill')}; --link: ${roleHex('text.link')}; --link-hover: ${roleHex('text.linkHover')}; --focus: ${roleHex('focus.ring')};
  --danger: ${status('danger', 'text')}; --danger-subtle: ${status('danger', 'subtle')}; --violet: ${status('warning', 'text')};
  --mikro: ${ms('mikro')}; --hover-in: ${ms('hover')}; --kisa: ${ms('kisa')};
  --ease: ${ease('standart')}; --ease-in: ${ease('giris')}; --ease-hover: ${ease('mikro')};
}`;

// Header and navigation.
const nav = `<a href="#one-cikanlar">Öne çıkanlar</a>` + R.map(r => `<a href="#${anchor(r.id)}"><span class="rid">${r.id}</span> ${esc(NOTES.short[r.id] || r.id)}</a>`).join('') + (LIB.length ? '<a href="#kutuphaneler">Kütüphaneler</a>' : '') + '<a href="#izlenebilirlik">İzlenebilirlik</a>';
const toc = R.map(r => `<li><a href="#${anchor(r.id)}"><span class="rid">${r.id}</span> ${plain(r.angle)}</a> <span class="src-meta">${r.findings.length} bulgu, ${(r.recommendations || []).length} öneri${(r.signals || []).length ? ', ' + r.signals.length + ' sinyal' : ''}${(r.benchmarks || []).length ? ', ' + r.benchmarks.length + ' uygulama' : ''}</span></li>`).join('\n') + LIB.map(l => `<li><a href="#${anchor(l.id)}"><span class="rid">${l.id}</span> ${plain(l.area)}</a> <span class="src-meta">${l.candidates.length} aday</span></li>`).join('\n');
const cssFile = path.join(D, 'research.css');

// External links on the page, counted from the rendered sections (the intro has none).
const API_HOSTS = ['api.github.com', 'issues.ecosyste.ms', 'repos.ecosyste.ms'];
{
  const body = sec.join('\n');
  const ext = [...new Set([...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
  const api = ext.filter(u => API_HOSTS.includes(host(u)));
  COUNTS.sources = ext.length - api.length; COUNTS.apiUrls = api.length;
  const hostsUsed = API_HOSTS.filter(h => api.some(u => host(u) === h));
  COUNTS._apiHosts = hostsUsed.join(', ');
  COUNTS._apiClause = api.length ? `; ölçüm için çağrılan ${num(api.length)} API adresi (${hostsUsed.join(', ')}) bu sayıya katılmadı` : '';
}
const introHtml = refs(fill(intro, 'research-intro.html')).replace(/<!--@list:(\w+)-->/g, (m, k) => LISTS[k] ? LISTS[k]() : (fail(`unknown list ${m} in the intro`), m));
if (intro && !/id="kilit"/.test(introHtml)) fail('the intro has no #kilit section; the lock notes link to it');
for (const key of Object.keys(NOTES.fix)) if (!fixKeyCheck.has(key) && KNOWN.has(key.split('.')[0])) softOr(angleOf(key), `NOTES.fix ${key} was never applied (no such field is rendered)`);

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>İÜ Yoklama · Tasarım araştırması</title>
<style>
${fontCss}
${tokenCss}
${has(cssFile) ? fs.readFileSync(cssFile, 'utf8') : ''}
${extraCss}
</style>
</head>
<body>
<a class="skip" href="#ana">İçeriğe geç</a>
<header class="top">
<h1>İÜ Yoklama · Tasarım araştırması</h1>
<p class="lead">tasarim.html'deki kararların dayandığı araştırma: kaynaklar, forum yorumları, uygulama gözlemleri, kütüphane karşılaştırmaları ve doğrulama sonuçları.</p>
<p class="meta">6 Ekim 2026 · ${num(COUNTS.sources)} ayrı kaynak bağlantısı · sayılar ve doğrulama yöntemi <a href="#one-cikanlar">Öne çıkanlar</a> bölümünün Yöntem kısmında.</p>
<p class="meta">Bu dosya depoda değildir; depodaki tasarim.html kararları taşır, bu dosya onların dayanağını.</p>
</header>
<nav class="nav" aria-label="Bölümler">${nav}</nav>
<main id="ana">
<section id="okuma">
<h2>Nasıl okunur</h2>
<ul>
<li>Her açının başında özet, sonra öneriler (değerleriyle), sonra bulgular gelir. Öneriler dayandıkları bulgulara, kayıtlar ve kütüphane satırları da tasarımdaki yerlerine (“Tasarımda” satırı) bağlanır. Özet bugünkü duruma göre yazılmıştır; üstündeki “Değişti” satırı neyin değiştiğini ve düzeltmenin hangi kayıtta olduğunu söyler.</li>
<li>Doğrulama rozetleri: <span class="v v-ok">doğrulandı</span> kaynak aynen söylüyor (rozete basınca kısa not açılır: denetlenen adres, kaynakta bulunan ek bilgi varsa “Ek” ile); <span class="v v-part">kısmen</span> kaynak iddianın bir kısmını söylüyor; <span class="v v-bad">desteklenmiyor</span> kaynak söylemiyor ya da sayı farklı; <span class="v v-old">eskimiş</span> yeni sürümle değişti; <span class="v v-na">açılamadı</span> ya da <span class="v v-na">denetlenmedi</span> kaynağa bakılamadı ya da bakılmadı. Doğrulandı dışındaki her notun doğrusu kaydın altında açıkça yazar.</li>
<li>İşaretler: <span class="tag tag-void">Geçersiz</span> 6 Ekim 2026 kilidiyle kalkan öneri, yalnız başlığı, dayanağı ve neden kalktığı durur; <span class="tag tag-lock">Kilit notu</span> yeşil ya da kehribar öneren bulgu, “Bizim için” satırı kilide göre yeniden yazıldı; <span class="tag tag-dep">Tasarım ayrıldı</span> ve <span class="tag tag-dep">değişti</span> tasarımın ya da son kütüphane kararının öneriden ayrıldığı yer; <span class="tag tag-note">Düzeltme notu</span> kaydın bir kısmını düzelten not; <span class="old">2024 öncesi</span> eski tarihli yorum.</li>
<li>Forum alıntıları 15 kelimeden kısadır; kaynak alıntıları da kısa tutuldu, gerisi Türkçe özetlendi. App Store ve Play yorumlarının kalıcı bağlantısı yok: uygulamanın sayfası bağlıdır, yorum başlık ve tarihle bulunur, alınan kopyanın yolu satırda yazar. Öbür yorumların kendisi bağlantıdadır.</li>
<li>Açık sorular her açının sonunda: açık olanlar önde, kapananlar ve konusuz kalanlar işaretleriyle altta; özeti <a href="#one-cikanlar">Öne çıkanlar</a> bölümünde.</li>
</ul>
<ol class="toc">${toc}</ol>
</section>
${introHtml}
${sec.join('\n')}
</main>
</body>
</html>
`;

// Output gates.
if (/[–—]/.test(html)) fail('dash character (U+2013 or U+2014) in the output');
{
  const bodyHtml = html.replace(/<style[\s\S]*?<\/style>/g, '');
  const idsOut = new Set([...bodyHtml.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const dup = [...bodyHtml.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).filter((x, i, a) => a.indexOf(x) !== i);
  if (dup.length) fail(`duplicate ids: ${[...new Set(dup)].slice(0, 10).join(', ')}`);
  const broken = [...new Set([...bodyHtml.matchAll(/href="#([^"]*)"/g)].map(m => m[1]).filter(x => x && !idsOut.has(x)))];
  if (broken.length) fail(`broken internal links: ${broken.slice(0, 10).join(', ')}`);
  if (design) { const bad = [...new Set([...bodyHtml.matchAll(/href="tasarim\.html#([^"]+)"/g)].map(m => m[1]).filter(x => !designIds.has(x)))]; if (bad.length) fail(`links to missing tasarim.html ids: ${bad.join(', ')}`); }
  const longQ = [...bodyHtml.matchAll(/<q>([\s\S]*?)<\/q>/g)].filter(m => words(m[1]) >= 15);
  if (longQ.length) fail(`${longQ.length} rendered quotes of 15 or more words`);
  const issueCount = (bodyHtml.match(/<p class="issue">/g) || []).length;
  if (issueCount !== issuesShown) fail(`issue paragraphs ${issueCount} != ${issuesShown}`);
  if (/\{\{[a-zA-Z]/.test(bodyHtml) || /<!--@list:/.test(bodyHtml)) fail('an unresolved placeholder reached the page');
  const textOnly = bodyHtml.replace(/<[^>]+>/g, ' ');
  if (/\brepo(da|daki|su|ya|dan|nun)?\b/.test(textOnly.replace(/https?:\S+/g, ''))) fail("the word 'repo' in Turkish text (use 'depo')");
  // The owner's banned words, derived forms included (significantly, robustness).
  for (const w of ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay'])
    for (const m of textOnly.matchAll(new RegExp(`\\b${w}[a-z]*`, 'gi'))) fail(`banned word "${m[0]}": ${textOnly.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\s+/g, ' ')}`);
}
warnings.forEach(w => console.log(w));
if (unquoted.length) console.log(`note: ${unquoted.length} quoted span(s) of 15+ words shown without quote marks: ${[...new Set(unquoted)].map(u => JSON.stringify(u)).join('; ')}`);
if (errors.length) { console.log(`FAIL (${errors.length}):\n- ` + errors.slice(0, 80).join('\n- ')); process.exit(1); }
fs.writeFileSync(out, html);
const nF = COUNTS.findings, nS = COUNTS.signals, nB = COUNTS.bench, nL = LIB.reduce((n, l) => n + l.candidates.length, 0);
console.log(`wrote ${out} ${Math.round(html.length / 1024)} KB, ${words(html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '))} words: ${nF} findings, ${nS} signals, ${nB} benchmarks, ${nL} libraries (${libFull} full, ${libCompact} one-line), ${COUNTS.sources} sources + ${COUNTS.apiUrls} API; verifier issues ${issuesShown} shown + ${issuesHeld} with void recommendations = ${totalIssues}; short notes ${notesShort} (${wordsFull} -> ${wordsShort} words); lock notes ${lockNotesShown}; open questions ${COUNTS.oqOpen} open, ${COUNTS.oqClosed} closed, ${COUNTS.oqMoot} moot; trace ${decisions.length} decisions, ${traced.size} ids`);
