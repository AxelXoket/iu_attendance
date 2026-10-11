// Builds variants/A2/tasarim.html, the design document of İÜ Yoklama. This file only composes the page: it loads the
// section fragments in ../../doc/sections/ (when present; a missing fragment never breaks the build), numbers the
// sections and draws the side navigation, builds the page's own sections (tools/sections/<id>.js, one module each) and
// writes the page with its stylesheet (src/css/*.css) and script (src/js/*.js), each merged in "@order" sequence by
// tools/lib/sources.js. Shared helpers are in tools/lib/, drawings shared by screen sections in tools/screens/;
// OWNERS.md says who owns which file. Other inputs: tokens.json, tokens.css, tokens.check.json, icons.json, qr.json,
// the embedded fonts and coverage.json (when present). Besides the page it writes the token file in W3C DTCG format
// (tasarim.tokens.json, tools/lib/dtcg.js), the same text the Tokenlar section prints.
// Deterministic: the same inputs give the same page. Output uses CRLF line endings. Run: node tools/build.js
const fs = require('fs'), path = require('path');
const { A, rd, QR, COV } = require('./lib/inputs');
const { I, sprite, iconCount } = require('./lib/icons');
const { brand, dialog, toasts } = require('./lib/page');
const { setNav, secHead } = require('./lib/section');
const { xrayCss, rmCss, tokenCss } = require('./lib/gencss');
const dtcg = require('./lib/dtcg');
const { pageCss: assembleCss, pageJs: assembleJs } = require('./lib/sources');
const ust = require('./sections/ust'), footer = require('./sections/footer');
// The page's own sections by id; each module exports its builder with the navigation title as .title.
const SECTIONS = {
  'gece-mavisi': require('./sections/gece-mavisi'),
  dogru: require('./sections/dogru'),
  ekranlar: require('./sections/ekranlar'),
  panel: require('./sections/panel'),
  renk: require('./sections/renk'),
  kontrast: require('./sections/kontrast'),
  durumlar: require('./sections/durumlar'),
  tipografi: require('./sections/tipografi'),
  bicim: require('./sections/bicim'),
  ikonlar: require('./sections/ikonlar'),
  bilesenler: require('./sections/bilesenler'),
  katmanlar: require('./sections/katmanlar'),
  hareket: require('./sections/hareket'),
  etkilesim: require('./sections/etkilesim'),
  platform: require('./sections/platform'),
  tokenlar: require('./sections/tokenlar')
};
const argv = process.argv.slice(2);
const optArg = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
// --frag-dir <dir> reads fragments from another folder (an empty one proves the fallback); --out <file> writes elsewhere.
const FRAG_DIR = optArg('--frag-dir') ? path.resolve(optArg('--frag-dir')) : path.join(A, '..', '..', 'doc', 'sections');
const OUT = optArg('--out') ? path.resolve(optArg('--out')) : path.join(A, 'tasarim.html');
const REPORT = { fragDir: FRAG_DIR, fragments: [], warnings: [] };

/* ---------- navigation, fragments and section numbers ---------- */
// Fragments written by other agents into ../../doc/sections/. A missing (or unusable) fragment leaves this page's own
// section in place, or nothing, so the build never breaks. "{{no}}" in a fragment becomes its number in the navigation.
const FRAGS = {
  ozet: { file: 'ozet.html', title: 'Özet' },
  ilkeler: { file: 'ilkeler.html', title: 'İlkeler' },
  erisilebilirlik: { file: 'erisilebilirlik.html', title: 'Erişilebilirlik' },
  platform: { file: 'platform.html', title: 'Platform' },
  kutuphaneler: { file: 'kutuphaneler.html', title: 'Kütüphaneler' },
  acik: { file: 'acik.html', title: 'Açık noktalar' }
};
// Kaynaklar is a line of the footer (id kaynaklar, G3 #21): the decision to research table lives in the research file.
const OWN = Object.fromEntries(Object.entries(SECTIONS).map(([id, s]) => [id, s.title]));
const ORDER = ['ozet', 'ilkeler', 'gece-mavisi', 'dogru', 'ekranlar', 'panel', 'renk', 'kontrast', 'durumlar', 'tipografi', 'bicim', 'ikonlar', 'bilesenler', 'katmanlar', 'erisilebilirlik', 'hareket', 'etkilesim', 'platform', 'kutuphaneler', 'tokenlar', 'acik'];
const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function loadFragment(id) {
  const f = FRAGS[id];
  const p = path.join(FRAG_DIR, f.file);
  if (!fs.existsSync(p)) { REPORT.fragments.push({ id, file: f.file, used: false, why: 'yok' }); return null; }
  let h = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').trim();
  // Include markers a fragment may carry: <!--@lib-tables--> (the generated library tables, doc/kutuphaneler.html)
  // and <!--@include path--> (path relative to doc/, as in assemble.js). A missing target leaves the marker and is reported.
  const DOC_DIR = path.join(FRAG_DIR, '..');
  h = h.replace(/<!--@lib-tables-->/g, '<!--@include kutuphaneler.html-->').replace(/<!--@include ([^>]+?)-->/g, (m, rel) => {
    const t = path.join(DOC_DIR, rel.trim());
    if (!fs.existsSync(t)) { REPORT.warnings.push(f.file + ': içe alınacak dosya yok: ' + rel.trim()); return m; }
    const inc = fs.readFileSync(t, 'utf8').replace(/^\uFEFF/, '').trim();
    REPORT.fragments.push({ id: id + ' > ' + rel.trim(), file: rel.trim(), used: true, bytes: inc.length, included: true });
    return inc;
  });
  const why = [];
  if (/[\u2013\u2014]/.test(h)) why.push('U+2013 ya da U+2014 içeriyor');
  if (!h) why.push('boş');
  if (why.length) { REPORT.fragments.push({ id, file: f.file, used: false, why: why.join('; ') }); REPORT.warnings.push(f.file + ' kullanılmadı: ' + why.join('; ')); return null; }
  const h2 = h.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const title = h2 ? stripTags(h2[1]) || f.title : f.title;
  REPORT.fragments.push({ id, file: f.file, used: true, bytes: h.length, title });
  return { title, html: h };
}
const FRAG_HTML = {};
const NAV = [];
for (const id of ORDER) {
  const fr = FRAGS[id] ? loadFragment(id) : null;
  if (fr) { FRAG_HTML[id] = fr.html; NAV.push({ id, title: fr.title, frag: true }); }
  else if (OWN[id]) NAV.push({ id, title: OWN[id], frag: false });
}
const NO = Object.fromEntries(NAV.map((n, i) => [n.id, String(i + 1).padStart(2, '0')]));
setNav(NO, OWN);
function fragSection(id) {
  let h = FRAG_HTML[id].split('{{no}}').join(NO[id]);
  const m = h.match(/^<section\b([^>]*)>/);
  if (m) {
    const attrs = m[1];
    if (!new RegExp('\\sid="' + id + '"').test(attrs)) REPORT.warnings.push(FRAGS[id].file + ': kök section kimliği "' + id + '" değil');
    const withCls = /\sclass="/.test(attrs) ? attrs.replace(/\sclass="([^"]*)"/, (x, c) => ' class="' + c + (/\bsec\b/.test(c) ? '' : ' sec') + ' frag"') : attrs + ' class="sec frag"';
    return h.replace(/^<section\b[^>]*>/, '<section' + withCls + '>');
  }
  return '<section id="' + id + '" class="sec frag">' + secHead(id, NAV.find(n => n.id === id).title, '') + h + '</section>';
}

/* ---------- composition ---------- */
// Own sections are built in navigation order, which is also the order their icons enter the sprite. A section that
// also has a fragment (platform) is a fallback, built only when its fragment is missing.
const header = ust();
const BUILT = {};
for (const id of ORDER) if (SECTIONS[id] && !FRAGS[id]) BUILT[id] = SECTIONS[id]();
const body = NAV.map(n => (n.frag ? fragSection(n.id) : FRAGS[n.id] ? SECTIONS[n.id]() : BUILT[n.id])).join('\n');
const dlg = dialog();

const side = '<aside class="side"><a class="brand" href="#ust">' + brand() + '<span><span class="brand-t">İÜ Yoklama</span><br><span class="brand-s">Tasarım</span></span></a><nav class="side-nav" aria-label="Bölümler">' +
  NAV.map(n => '<a href="#' + n.id + '"><span class="n">' + NO[n.id] + '</span>' + n.title + '</a>').join('') +
  '<span class="side-sep" aria-hidden="true"></span><a class="ext" href="plan.html">' + I('description', 16) + 'Plan</a><a class="ext" href="teknik.html">' + I('description', 16) + 'Teknik</a>' +
  '</nav></aside>';

/* ---------- output ---------- */
const pageCss = assembleCss();
// Fragments may carry their own <style>; their reduced-motion rules are copied under html.rm as well.
const fragCss = Object.values(FRAG_HTML).map(h => [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n')).join('\n');
// Inline code keeps a name whole (base.css: code never breaks); code of 40 characters or more may break anywhere, so it is
// marked .wrap here, in this page's sections and in the fragments alike. Code inside <pre> is left alone.
const decode = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const markLongCode = h => h.split(/(<pre[\s\S]*?<\/pre>)/).map((part, i) => (i % 2 ? part : part.replace(/<code(\s[^>]*)?>([\s\S]*?)<\/code>/g, (m, attrs = '', inner) => {
  if (decode(inner).length < 40) return m;
  const a = /\sclass="/.test(attrs) ? attrs.replace(/\sclass="([^"]*)"/, (x, c) => ' class="' + (/\bwrap\b/.test(c) ? c : c + ' wrap') + '"') : attrs + ' class="wrap"';
  return '<code' + a + '>' + inner + '</code>';
}))).join('');
const bodyHtml = markLongCode('<a class="skip" href="#ana">İçeriğe geç</a><div class="shell">' + side + '<main id="ana"><div class="wrap">' + header + body +
  footer() + '</div></main></div>' +
  dlg + toasts);
// decisions-r2 E9: the document never says "sahip" or "sahibin"; any such word is reported with its section.
{
  const words = [...bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').matchAll(/<section id="([^"]+)"|\b([Ss]ahi[pb]\w*)/g)];
  let sec = 'üst', hits = [];
  for (const m of words) { if (m[1]) sec = m[1]; else hits.push(sec + ': ' + m[2]); }
  if (hits.length) REPORT.warnings.push('"sahip" geçiyor (decisions-r2 E9): ' + hits.join(', '));
}

const html = '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>İÜ Yoklama · Tasarım</title>\n' +
  '<meta name="description" content="İÜ Yoklama tasarım belgesi: kırık beyaz ve gri zemin, gece mavisi alt ton; renk, yazı, biçim, hareket ve bileşenler.">\n<style>\n' + rd('fonts/plex-sans.css') + rd('fonts/plex-mono.css') + '\n' + rd('tokens.css') + '\n' + tokenCss() + pageCss + '\n' + xrayCss() + rmCss(tokenCss() + pageCss + '\n' + fragCss) + '</style>\n</head>\n<body>\n' +
  sprite() + '\n' + bodyHtml + '\n<script>window.QR_CODES = ' + JSON.stringify(QR.map(q => q.d)) + ';</script>\n<script>\n' + assembleJs() + '\n</script>\n</body>\n</html>\n';
if (/[\u2013\u2014]/.test(html)) throw new Error('dash found in output');
if (html.includes('{{no}}')) throw new Error('unreplaced {{no}} in output');
// Fragment health, reported (never edited): internal links that point nowhere and ids that collide with this page.
{
  const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const idList = [...strip(html).matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const pageIds = new Set(idList);
  const dup = [...new Set(idList.filter((x, i) => idList.indexOf(x) !== i))];
  if (dup.length) REPORT.warnings.push('yinelenen kimlik: ' + dup.join(', '));
  for (const id of Object.keys(FRAG_HTML)) {
    const missing = [...new Set([...strip(FRAG_HTML[id]).matchAll(/href="#([^"]*)"/g)].map(m => m[1]).filter(x => !pageIds.has(x)))];
    if (missing.length) REPORT.warnings.push(FRAGS[id].file + ': hedefi olmayan iç bağlantı ' + missing.map(x => '#' + x).join(', '));
  }
}
const crlf = s => s.replace(/\r?\n/g, '\r\n');
fs.writeFileSync(OUT, crlf(html));
if (OUT === path.join(A, 'tasarim.html')) fs.writeFileSync(path.join(A, 'tasarim.tokens.json'), dtcg.text());
if (OUT === path.join(A, 'tasarim.html')) fs.writeFileSync(path.join(A, 'specimen.html'), crlf('<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<title>İÜ Yoklama · Tasarım</title>\n<meta http-equiv="refresh" content="0; url=tasarim.html">\n</head>\n<body>\n<p>Bu sayfa tasarim.html adını aldı: <a href="tasarim.html">tasarim.html</a></p>\n</body>\n</html>\n'));
fs.mkdirSync(path.join(A, 'work'), { recursive: true });
fs.writeFileSync(path.join(A, 'work', 'build-report.json'), JSON.stringify({ ...REPORT, out: OUT, nav: NAV.map(n => ({ no: NO[n.id], id: n.id, title: n.title, frag: n.frag })) }, null, 1));
console.log(path.basename(OUT), Math.round(html.length / 1024) + ' KB', iconCount() + ' icon symbols', COV ? 'with coverage' : 'without coverage');
console.log('sections: ' + NAV.map(n => NO[n.id] + ' ' + n.id + (n.frag ? ' (parça)' : '')).join(', '));
for (const f of REPORT.fragments) console.log('fragment ' + (f.included ? f.id + ' (doc/' + f.file + ')' : f.file) + ': ' + (f.included ? 'içe alındı' : f.used ? 'eklendi' : 'yok' + (f.why && f.why !== 'yok' ? ' (' + f.why + ')' : '')));
for (const w of REPORT.warnings) console.log('warning: ' + w);
