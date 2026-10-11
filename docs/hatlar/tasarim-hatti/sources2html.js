// Builds the "Kaynaklar" fragment of tasarim.html and trace.json for the research file
// from the final tokens' "sources" map (decision -> research ids). Links come from the research JSON, not retyped.
// Usage: node sources2html.js <tokens.json> <out fragment.html> <out trace.json>
const fs = require('fs'), path = require('path');
const D = __dirname;
const [tokFile, outHtml, outTrace] = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(tokFile, 'utf8'));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const idx = {};
for (const f of fs.readdirSync(path.join(D, 'research')).filter(f => /^R\d\d\.json$/.test(f))) {
  const r = read(path.join(D, 'research', f));
  const F = Object.fromEntries(r.findings.map(x => [x.id, x]));
  for (const x of r.findings) idx[x.id] = { title: x.title, urls: x.sources.map(s => ({ url: s.url, title: s.title, pub: s.publisher })) };
  for (const k of r.recommendations || []) idx[k.id] = { title: k.topic || k.recommendation.slice(0, 80), urls: (k.based_on || []).flatMap(b => (F[b] ? F[b].sources : []).map(s => ({ url: s.url, title: s.title, pub: s.publisher }))) };
}
for (const f of fs.readdirSync(path.join(D, 'lib')).filter(f => /^L\d+\.json$/.test(f))) {
  const l = read(path.join(D, 'lib', f));
  for (const c of l.candidates) idx[c.id] = { title: `${c.category}: ${c.package}`, urls: (c.sources || []).map(s => ({ url: s.url, title: s.title, pub: s.publisher })) };
}
const label = k => k.replace(/[._-]+/g, ' ').replace(/^./, c => c.toUpperCase());
const rows = [], trace = [], unknown = [];
for (const [decision, ids] of Object.entries(T.sources || {})) {
  const list = (Array.isArray(ids) ? ids : [ids]).map(String);
  const urls = new Map();
  for (const id of list) { const e = idx[id]; if (!e) { unknown.push(id); continue; } for (const u of e.urls) if (!urls.has(u.url)) urls.set(u.url, u); }
  const links = [...urls.values()].slice(0, 6).map(u => `<a href="${esc(u.url)}" rel="noopener">${esc(u.pub || host(u.url))}</a>`).join(', ');
  rows.push(`<tr><th scope="row">${esc(label(decision))}</th><td><span class="src-ids">${list.map(esc).join(', ')}</span></td><td>${links || 'yalnız araştırma kaydı'}</td></tr>`);
  trace.push({ decision: label(decision), ids: list });
}
const html = `<section id="kaynaklar" class="sec"><div class="sec-h"><p class="sec-no">{{no}}</p><div><h2>Kaynaklar</h2><p class="lead">Her kararın dayandığı araştırma kayıtları ve o kayıtların açılıp kontrol edilmiş dış kaynakları. R ve L kimlikleri depo dışındaki tasarım araştırmasına aittir; bağlantılar doğrudan kaynağa gider.</p></div></div>
<div class="table-wrap"><table class="src-table"><thead><tr><th scope="col">Karar</th><th scope="col">Araştırma kaydı</th><th scope="col">Dış kaynak</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table></div>
</section>
`;
if (/[–—]/.test(html)) console.log('WARNING: dash characters');
fs.writeFileSync(outHtml, html);
fs.writeFileSync(outTrace, JSON.stringify(trace, null, 1));
console.log(`wrote ${outHtml}: ${rows.length} decisions; unknown ids: ${[...new Set(unknown)].join(', ') || 'none'}`);
