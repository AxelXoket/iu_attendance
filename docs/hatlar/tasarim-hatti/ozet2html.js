// Generates the Özet fragment of tasarim.html (doc/sections/ozet.html) from the decision list in
// variants/A2/tokens.json "sources" and the wording in doc/ozet.json. One row per decision, in the order and with the
// labels that #kaynaklar (sources2html.js) and the research file's traceability table use, so the three always agree:
// a decision added to or removed from tokens.json without a row here (or a row here without a decision) stops the build.
// Rows name tokens and link to their tables; they never retype a value (decision E1). Inline markup in ozet.json:
// `code` and [label](href), where href is #id, plan.html#id or teknik.html#id.
// Usage: node ozet2html.js [<out.html>] [--tokens <tokens.json>] [--data <ozet.json>]
//   defaults: doc/sections/ozet.html, variants/A2/tokens.json, doc/ozet.json (the overrides exist for the tests)
const fs = require('fs'), path = require('path');
const D = __dirname;
const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const OUT = (argv[0] && !argv[0].startsWith('--') ? argv[0] : null) || path.join(D, 'doc', 'sections', 'ozet.html');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const T = read(opt('--tokens') || path.join(D, 'variants', 'A2', 'tokens.json'));
const O = read(opt('--data') || path.join(D, 'doc', 'ozet.json'));
const problems = [];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const okHref = h => /^#[a-z0-9-]+$/.test(h) || /^(plan|teknik)\.html#[a-z0-9-]+$/.test(h);
const link = (label, href) => { if (!okHref(href)) problems.push('bad link target: ' + href); return `<a href="${esc(href)}">${esc(label)}</a>`; };
const inline = s => String(s ?? '').split('`').map((seg, i) => (i % 2 ? `<code>${esc(seg)}</code>` : esc(seg).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, l, h) => (okHref(h) ? `<a href="${h}">${l}</a>` : (problems.push('bad link target: ' + h), m))))).join('');
// The decision's name as tokens.json writes it, first letter capitalized by Turkish rules. sources2html.js (#kaynaklar)
// also turns dots and hyphens into spaces ("E posta", "neutral 9"); that breaks Turkish and token names, so it is not
// copied here, and g3check.js lists the rows where the two labels differ.
const label = k => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1);

const keys = Object.keys(T.sources || {});
if (!keys.length) problems.push('tokens.json has no "sources"');
for (const k of keys) if (!O.rows[k]) problems.push(`no Özet row for decision "${k}" (add it to doc/ozet.json)`);
for (const k of Object.keys(O.rows)) if (!keys.includes(k)) problems.push(`Özet row "${k}" names no decision in tokens.json sources`);

const ramp = kind => {
  const steps = kind === 'neutral' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : kind === 'accent' ? [9, 10, 11, 12] : null;
  if (!steps) { problems.push('unknown ramp ' + kind); return ''; }
  return `<span class="oz-ramp" aria-hidden="true">${steps.map(s => `<i style="background: var(--${kind}-${s})"></i>`).join('')}</span>`;
};
const rows = keys.filter(k => O.rows[k]).map(k => {
  const r = O.rows[k];
  if (!r.text || !(r.links || []).length) problems.push(`row "${k}" needs text and at least one link`);
  return `<tr role="row"><th scope="row" role="rowheader">${esc(label(k))}</th><td role="cell">${r.ramp ? ramp(r.ramp) : ''}${inline(r.text)}</td><td role="cell" class="oz-git-c"><span class="oz-git">${(r.links || []).map(([l, h]) => link(l, h)).join('')}</span></td></tr>`;
});
const elsewhere = O.elsewhere.map(([topic, ls]) => `<tr><td>${esc(topic)}</td><td>${ls.map(([l, h]) => link(l, h)).join('; ')}</td></tr>`);
const n = rows.length;

const html = `<section id="ozet" class="sec">
<div class="sec-h"><p class="sec-no">{{no}}</p><div><h2>Özet</h2><p class="lead">${esc(O.lead.replace('{n}', n))}</p><p class="lead oz-kilit">${esc(O.lock)}</p></div></div>
<style>
#ozet .oz-kilit { margin-top: 8px; color: var(--text-primary); }
#ozet .tbl-doc { font: 400 13px/20px var(--font-sans); letter-spacing: 0.16px; }
#ozet .tbl-doc th, #ozet .tbl-doc td { padding: 10px 16px 10px 0; vertical-align: top; border-bottom: 1px solid var(--border-subtle); }
#ozet .tbl-doc thead th { background: none; font: 600 12px/16px var(--font-sans); letter-spacing: 0.32px; color: var(--text-secondary); border-bottom: 1px solid var(--text-primary); white-space: nowrap; vertical-align: bottom; }
#ozet .tbl-doc tbody th { font: 600 13px/20px var(--font-sans); letter-spacing: 0.16px; color: var(--text-primary); text-align: left; white-space: normal; }
#ozet .tbl-doc tbody tr:last-child > * { border-bottom: 0; }
#ozet .tbl-doc code { font: 400 12px/20px var(--font-mono); letter-spacing: 0; padding: 1px 4px; white-space: nowrap; }
#ozet .oz-tbl thead th:nth-child(1) { width: 21%; }
#ozet .oz-tbl thead th:nth-child(2) { width: 55%; }
#ozet .oz-tbl thead th:nth-child(3) { width: 24%; }
#ozet .oz-tbl td:last-child { padding-right: 0; }
#ozet .oz-git { display: flex; flex-wrap: wrap; gap: 0 12px; }
#ozet .oz-git a { white-space: nowrap; }
#ozet .oz-ramp { display: flex; width: max-content; max-width: 100%; margin: 4px 0 8px; border: 1px solid var(--border-subtle); }
#ozet .oz-ramp i { display: block; flex: none; width: 16px; height: 12px; }
#ozet .oz-dis { margin-top: 40px; }
#ozet .oz-dis summary { font-weight: 400; }
#ozet .oz-dis summary b { font-weight: 600; }
#ozet .oz-ref thead th:nth-child(1) { width: 62%; }
@media (max-width: 860px) {
  #ozet .scroll-x > .oz-tbl { min-width: 0; }
  #ozet .oz-tbl, #ozet .oz-tbl tbody, #ozet .oz-tbl tr, #ozet .oz-tbl tbody th, #ozet .oz-tbl td { display: block; width: auto; }
  #ozet .oz-tbl thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  #ozet .oz-tbl tbody tr { padding: 16px 0; border-bottom: 1px solid var(--border-subtle); }
  #ozet .oz-tbl tbody tr:first-child { padding-top: 0; }
  #ozet .oz-tbl tbody tr:last-child { padding-bottom: 0; border-bottom: 0; }
  #ozet .oz-tbl tbody th, #ozet .oz-tbl td { padding: 0; border-bottom: 0; }
  #ozet .oz-tbl tbody th { font-size: 16px; line-height: 24px; letter-spacing: 0; }
  #ozet .oz-tbl td { margin-top: 8px; }
  #ozet .oz-git { gap: 4px 16px; }
  #ozet .oz-ref thead th:nth-child(1) { width: auto; }
}
</style>
<div class="scroll-x">
<table class="tbl-doc oz-tbl" role="table">
<caption class="vh">Tasarımın ${n} kararı: kararın özü ve ayrıntısının durduğu bölüm</caption>
<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Konu</th><th scope="col" role="columnheader">Karar</th><th scope="col" role="columnheader">Ayrıntı</th></tr></thead>
<tbody role="rowgroup">
${rows.join('\n')}
</tbody>
</table>
</div>
<details class="oz-dis">
<summary><span><b>Başka belgede karar verilenler</b> · ${O.elsewhere.length} konu burada yazılmaz, bağlantısı verilir</span></summary>
<div class="scroll-x">
<table class="tbl-doc compact oz-ref">
<caption class="vh">Plan ve teknik belgede karar verilen konular ve bağlantıları</caption>
<thead><tr><th scope="col">Konu</th><th scope="col">Karar yeri</th></tr></thead>
<tbody>
${elsewhere.join('\n')}
</tbody>
</table>
</div>
</details>
</section>
`;
if (/[\u2013\u2014]/.test(html)) problems.push('U+2013 or U+2014 in output');
if (problems.length) { console.error('ozet2html.js FAILED:\n  ' + [...new Set(problems)].join('\n  ')); process.exit(1); }
fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT}: ${n} decisions (tokens.json sources: ${keys.length}), ${O.elsewhere.length} links to plan.html and teknik.html`);
