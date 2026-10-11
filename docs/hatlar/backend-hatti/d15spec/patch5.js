// Fragment polish: readable link texts from the documents' own headings, error codes in <details>,
// open points as a warning callout list (same pattern as D04, D12, D13, D14 fragments).
'use strict';
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'build.js');
let t = fs.readFileSync(p, 'utf8');
let bad = 0;
function rep(a, b) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.log(`MATCH ${n}: ${a.slice(0, 80)}`); bad++; return; }
  t = t.replace(a, () => b);
}

rep("const linkify = (html) => html.replace(/\\b(plan|teknik|tasarim)\\.html#([a-z0-9-]+)/g, (m, d, a) => `<a href=\"${d}.html#${a}\">${d}.html#${a}</a>`);",
  "const DOCS = {};\n" +
  "for (const d of ['plan', 'teknik', 'tasarim']) DOCS[d] = fs.readFileSync(REPO + d + '.html', 'utf8');\n" +
  "const ELLE = { 'tasarim#tipografi': 'Tipografi' };\n" +
  "const ONEK = { plan: 'plan', teknik: 'teknik', tasarim: 'tasarım' };\n" +
  "function baslik(d, id) {\n" +
  "  if (ELLE[d + '#' + id]) return ELLE[d + '#' + id];\n" +
  "  const s = DOCS[d];\n" +
  "  const i = s.indexOf('id=\"' + id + '\"');\n" +
  "  if (i < 0) return id;\n" +
  "  const rest = s.slice(i);\n" +
  "  const parca = rest.slice(rest.indexOf('>') + 1, rest.indexOf('>') + 800).replace(/<[^>]+>/g, '|').split('|').map((x) => x.trim()).filter(Boolean)[0] || id;\n" +
  "  return parca.split(':')[0].replace(/\\s*\\([^)]*\\)\\s*$/, '').replace(/[.]$/, '').trim();\n" +
  "}\n" +
  "const linkify = (html) => html.replace(/\\b(plan|teknik|tasarim)\\.html#([a-z0-9-]+)/g, (m, d, a) => `<a href=\"${d}.html#${a}\">${ONEK[d]}, ${esc(baslik(d, a))}</a>`);");

rep("out.push(table(['Kod', 'HTTP ya da tür', 'Nerede', 'Anlam'], spec.hata_kodlari.map((h) => [C(h.kod), esc(h.http), T(h.nerede), T(h.anlam)])));",
  "const kodSay = (f) => spec.hata_kodlari.filter(f).length;\n" +
  "out.push(details(`${spec.hata_kodlari.length - 1} ISLETIM_ kodu: ${kodSay((h) => /^\\d+$/.test(h.http))} HTTP, ${kodSay((h) => h.http === 'öğe RET')} öğe RET gerekçesi, ${kodSay((h) => h.http === 'süreç')} süreç kodu; D13 kök kodları her rotada örtük`,\n" +
  "  table(['Kod', 'HTTP ya da tür', 'Nerede', 'Anlam'], spec.hata_kodlari.map((h) => [C(h.kod), esc(h.http), T(h.nerede), T(h.anlam)]))));");

rep("out.push(table(['Kimlik', 'Soru', 'Öneri', 'Karar'], spec.open_points.map((o) => [\n  esc(o.id), T(o.question), T(o.recommendation), o.needs_owner ? '<span class=\"tag warn\">sahip</span>' : '<span class=\"tag mute\">mimari</span>',\n])));",
  "out.push('<div class=\"callout warn\">\\n' + ul(spec.open_points.map((o) =>\n" +
  "  `<strong>${esc(o.id)}</strong> ${o.needs_owner ? '<span class=\"tag warn\">sahip</span>' : '<span class=\"tag mute\">mimari</span>'} ${T(o.question)} <em>Öneri:</em> ${T(o.recommendation)}`)) + '\\n</div>');");

if (bad) { console.log(bad + ' failed'); process.exit(1); }
fs.writeFileSync(p, t);
console.log('patch5 ok');
