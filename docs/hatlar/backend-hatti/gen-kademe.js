// Splits the backend design into stage files a coding session can work through one by one.
// Each build phase (schedule.json, at most 15 independent packages) becomes one or two stages of medium load
// (kademe 5A and 5B): packages ordered by module, cut where the two halves weigh closest (S=1, M=2, L=3).
// Writes into <out>: index.html, acik-noktalar.html, kademe-NN[a|b].html, moduller/<modül>.html, ilerleme.json,
// ilerleme-notlari.md, BENIOKU.md. Usage: node gen-kademe.js <out dir>
const fs = require('fs'), path = require('path');
const D = __dirname;
const OUT = path.resolve(process.argv[2] || path.join(D, 'out', 'backend'));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:.]/g, '');
const epKey = s => String(s).replace(/\{[^}]+\}|:[a-z_]+/gi, '{x}').replace(/\/+$/, '').toLowerCase().replace(/\s+/g, ' ');
const C = read(path.join(D, 'contracts.json'));
const S = read(path.join(D, 'schedule.json'));
const IDS = C.modules.map(m => m.id);
const mod = Object.fromEntries(C.modules.map(m => [m.id, m]));
const spec = Object.fromEntries(IDS.map(id => [id, read(path.join(D, 'spec', id + '.json'))]));
const pkg = new Map(S.packages.map(p => [p.id, p]));
const W = { S: 1, M: 2, L: 3 }, BOY = { S: 'küçük', M: 'orta', L: 'büyük' };
const wt = ids => ids.reduce((n, id) => n + W[pkg.get(id).size], 0);
const PLAN = [path.join(D, '..', '..', 'belgeler', 'plan.html'), 'C:/Users/USER/Desktop/iu_attendance_arastirma/belgeler/plan.html', 'C:/Users/USER/Desktop/iu_attendance/plan.html'].find(f => fs.existsSync(f));
const style = fs.readFileSync(PLAN, 'utf8').match(/<style>[\s\S]*?<\/style>/)[0].replace(/\r\n/g, '\n');
const EXTRA = '<style>.wrap,code{overflow-wrap:anywhere}.row>div{min-width:0}.paket{border-top:1px solid var(--border);margin-top:28px;padding-top:6px}</style>';
const page = (title, depth, body) => {
  const up = '../'.repeat(depth);
  return `<!DOCTYPE html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n${style}\n${EXTRA}\n</head>\n<body>\n<div class="wrap">\n${body.replace(/href="(plan|teknik|tasarim)\.html/g, `href="${up}$1.html`)}\n</div>\n</body>\n</html>\n`.replace(/\n/g, '\r\n');
};
const box = inner => `<div style="overflow-x:auto">${inner}</div>`;

// ---------- stages: split each phase into one or two medium stages ----------
const stages = [];
S.phases.forEach((ph, i) => {
  const n = i + 1;
  const sorted = [...ph].sort((a, b) => a.localeCompare(b));
  if (sorted.length <= 8) { stages.push({ ad: String(n), dosya: `kademe-${String(n).padStart(2, '0')}.html`, asama: n, paketler: sorted }); return; }
  let best = null;
  for (let k = Math.max(1, sorted.length - 9); k <= Math.min(sorted.length - 1, 9); k++) {
    const d = Math.abs(wt(sorted.slice(0, k)) - wt(sorted.slice(k)));
    if (!best || d < best.d || (d === best.d && Math.abs(k - sorted.length / 2) < Math.abs(best.k - sorted.length / 2))) best = { k, d };
  }
  for (const [half, list] of [['A', sorted.slice(0, best.k)], ['B', sorted.slice(best.k)]])
    stages.push({ ad: n + half, dosya: `kademe-${String(n).padStart(2, '0')}${half.toLowerCase()}.html`, asama: n, paketler: list });
});
const stageOf = new Map(); for (const s of stages) for (const id of s.paketler) stageOf.set(id, s);
const ozet = n => { const f = path.join(D, 'ozet', `asama-${String(n).padStart(2, '0')}.json`); return fs.existsSync(f) ? read(f) : null; };

// ---------- lookups into the specs ----------
const find = {
  table: (id, t) => (spec[id].tables || []).find(x => norm(x.name) === norm(t)),
  endpoint: (id, e) => (spec[id].endpoints || []).find(x => epKey(x.method + ' ' + x.path) === epKey(e)),
  job: (id, j) => (spec[id].jobs || []).find(x => norm(x.name) === norm(j)),
  export: (id, x) => (spec[id].exports || []).find(e => e.name === x),
  test: (id, t) => (spec[id].tests || []).find(x => x.name === t),
};
const missing = [];
const need = (kind, id, key) => { const v = find[kind](id, key); if (!v) missing.push(`${kind} ${id} ${key}`); return v; };
const txt = v => typeof v === 'string' ? esc(v) : esc(JSON.stringify(v));
const row = (k, v) => v === undefined || v === '' || (Array.isArray(v) && !v.length) ? '' : `<div class="row"><div class="k">${esc(k)}</div><div>${Array.isArray(v) ? v.map(txt).join('<br>') : txt(v)}</div></div>`;

const renderTable = t => `<h4><code>${esc(t.name)}</code></h4><p>${esc(t.purpose)}</p>` + box(`<table><tr><th>Sütun</th><th>Tür</th><th>Boş</th><th>Varsayılan</th><th>Not</th></tr>${(t.columns || []).map(c => `<tr><td><code>${esc(c.name)}</code></td><td><code>${esc(c.type)}</code></td><td>${c.null ? 'evet' : 'hayır'}</td><td>${c.default ? '<code>' + esc(c.default) + '</code>' : ''}</td><td>${esc(c.note)}</td></tr>`).join('')}</table>`) +
  `<div class="rows">${row('İndeksler', t.indexes)}${row('Kısıtlar', t.constraints)}</div>`;
const renderEndpoint = e => `<h4><code>${esc(e.method)} ${esc(e.path)}</code></h4><div class="rows">${row('Amaç', e.purpose)}${row('İstemci', e.client)}${row('Yetki', e.auth)}${row('İstek', e.request)}${row('Cevap', e.response)}${row('Hatalar', e.errors)}${row('Tekrar güvenliği', e.idempotency)}${row('Hız sınırı', e.rate_limit)}</div>`;
const renderJob = j => `<h4><code>${esc(j.name)}</code></h4><div class="rows">${row('Ne zaman', j.schedule)}${row('Ne yapar', j.does)}${row('Tekrar güvenliği', j.idempotency)}</div>`;
const renderExport = (x, from) => `<div class="row"><div class="k"><code>${esc(from ? from + '.' : '')}${esc(x.name)}</code></div><div><code>${esc(x.signature)}</code><br>${esc(x.purpose)}${x.note ? ' ' + esc(x.note) : ''}${x.not ? ' ' + esc(x.not) : ''}${x.yer ? ' Yer: ' + esc(x.yer) : ''}</div></div>`;

// ---------- module reference pages: purpose, rules, states, error codes, open points ----------
const KEEP = ['Amaç ve sınırlar', 'Durumlar ve kurallar', 'Hata kodları', 'Açık noktalar'];
const modPages = {};
for (const id of IDS) {
  const m = mod[id];
  const h = fs.readFileSync(path.join(D, 'frag', id + '.html'), 'utf8').replace(/\r\n/g, '\n');
  const body = h.replace(/^[\s\S]*?<section[^>]*>/, '').replace(/<\/section>\s*$/, '');
  const head = body.slice(0, body.search(/<h3\b/));
  const parts = body.slice(body.search(/<h3\b/)).split(/(?=<h3\b)/);
  const kept = parts.filter(p => KEEP.some(k => p.replace(/<[^>]+>/g, '').trim().startsWith(k)));
  modPages[id] = { head: head.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, ''), kept };
}
const ids = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'moduller'), { recursive: true });
const header = (h1, lead, depth) => `<header>\n  <h1>${esc(h1)}</h1>\n  <p class="lead">${lead}</p>\n  <p class="meta"><a href="${'../'.repeat(depth)}backend/index.html">Backend</a> · <a href="plan.html">Plan</a> · <a href="teknik.html">Teknik</a> · <a href="tasarim.html">Tasarım</a></p>\n</header>\n`;
const modPageHtml = {};
for (const id of IDS) {
  const m = mod[id], P = modPages[id];
  const pk = S.packages.filter(p => p.module === id);
  const body = header(`${m.title}`, `Modül ${esc(id)} · <code>${esc(m.path)}</code>. Bu sayfa modülün amacını, kurallarını, durumlarını, hata kodlarını ve açık noktalarını tutar; tablo, uç nokta, iş, dış yüz ve test ayrıntısı paketiyle birlikte kademe dosyasındadır.`, 2).replace('href="../../backend/index.html"', 'href="../index.html"') +
    `<section id="${esc(m.name)}">\n${P.head}\n${P.kept.join('\n')}\n<h3 id="${esc(m.name)}-paketler">Paketleri</h3>\n<div class="rows">\n${pk.map(p => `<div class="row"><div class="k"><a href="../${stageOf.get(p.id).dosya}#${p.id}">${p.id}</a></div><div>${esc(p.title)} (Kademe ${stageOf.get(p.id).ad})</div></div>`).join('\n')}\n</div>\n</section>`;
  modPageHtml[id] = body;
}
// fix in-page links: a target that left with the dropped sections points to the module page that holds it, or is unwrapped
const allIds = Object.fromEntries(IDS.map(id => [id, ids(modPageHtml[id])]));
const byName = Object.fromEntries(IDS.map(id => [mod[id].name, id]));
let unwrapped = 0;
for (const id of IDS) {
  modPageHtml[id] = modPageHtml[id].replace(/<a href="#([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (all, a, rest, inner) => {
    if (allIds[id].has(a)) return all;
    const other = IDS.find(o => allIds[o].has(a));
    if (other) return `<a href="${mod[other].name}.html#${a}"${rest}>${inner}</a>`;
    if (byName[a]) return `<a href="${a}.html"${rest}>${inner}</a>`;
    unwrapped++; return inner;
  });
  fs.writeFileSync(path.join(OUT, 'moduller', mod[id].name + '.html'), page(`${mod[id].title} · İÜ Yoklama Backend`, 2, modPageHtml[id]));
}
// stage pages
for (const [si, st] of stages.entries()) {
  const o = ozet(st.asama);
  const mods = [...new Set(st.paketler.map(id => pkg.get(id).module))];
  const before = [...new Set(st.paketler.flatMap(id => pkg.get(id).after).map(d => stageOf.get(d)).filter(s => s !== st))].sort((a, b) => stages.indexOf(a) - stages.indexOf(b));
  const sibling = stages.filter(s => s.asama === st.asama && s !== st);
  const prev = stages[si - 1], next = stages[si + 1];
  let b = header(`Kademe ${st.ad}`, `${o ? esc(o.baslik) + '. ' : ''}${st.paketler.length} paket, yük ${wt(st.paketler)} (küçük 1, orta 2, büyük 3) · ${mods.map(id => `<a href="moduller/${mod[id].name}.html">${esc(mod[id].title)}</a>`).join(', ')}`, 1).replace('href="../backend/index.html"', 'href="index.html"');
  b += `<nav aria-label="Kademeler">${prev ? `<a href="${prev.dosya}">Önceki: Kademe ${prev.ad}</a>` : ''}<a href="index.html#kademeler">Bütün kademeler</a>${next ? `<a href="${next.dosya}">Sonraki: Kademe ${next.ad}</a>` : ''}</nav>\n`;
  b += `<section id="ozet">\n<h2>Bu kademede ne kurulur</h2>\n`;
  if (o) b += `<p class="meta">Aşama ${st.asama} özeti${sibling.length ? ` (Kademe ${stages.filter(s => s.asama === st.asama).map(s => s.ad).join(' ve ')} birlikte; ikisi birbirine dokunmaz, aynı anda ya da art arda yapılabilir)` : ''}</p>\n${o.paragraflar.map(p => `<p>${esc(p)}</p>`).join('\n')}\n`;
  b += `<h3>Başlamadan</h3>\n<ul>\n<li>Önce bitmiş olmalı: ${before.length ? before.map(s => `<a href="${s.dosya}">Kademe ${s.ad}</a>`).join(', ') : 'yok'}. Durum <code>ilerleme.json</code> dosyasındadır.</li>\n<li>Bu sayfanın özeti başlamadan önce okunur; değişecek bir şey varsa paketler o anda değiştirilir.</li>\n<li>Her paket ayrı bir ajana verilir: paketin dosyaları dışında dosya açılmaz, tablosu, uç noktası, işi ve testleri bu sayfadadır, kuralları modül sayfasındadır.</li>\n</ul>\n<h3>Bitti sayılır</h3>\n<ul>\n<li>Her paketin listelenen testleri yazılmış ve geçiyor; tür denetimi ve biçim denetimi temiz.</li>\n<li>Paketin dışında dosya değişmedi; başka modülün tablosuna yazılmadı.</li>\n<li><code>ilerleme.json</code>'da paketler <code>bitti</code>, <code>ilerleme-notlari.md</code>'ye kısa not yazıldı.</li>\n</ul>\n<div class="rows">\n${st.paketler.map(id => `<div class="row"><div class="k"><a href="#${id}">${id}</a></div><div>${esc(pkg.get(id).title)} (${esc(mod[pkg.get(id).module].title)}, ${BOY[pkg.get(id).size]})</div></div>`).join('\n')}\n</div>\n</section>\n`;
  for (const id of st.paketler) {
    const p = pkg.get(id), m = p.module;
    b += `<section id="${id}" class="paket">\n<h2>${id} · ${esc(p.title)}</h2>\n<p class="meta"><a href="moduller/${mod[m].name}.html">${esc(mod[m].title)}</a> · ${BOY[p.size]} · ${p.files.length} dosya · ${p.tests.length} test</p>\n`;
    if (p.notes) b += `<p>${esc(p.notes)}</p>\n`;
    const deps = p.after.map(d => `<a href="${stageOf.get(d) === st ? '' : stageOf.get(d).dosya}#${d}">${d}</a> (Kademe ${stageOf.get(d).ad})`);
    b += `<div class="rows">${deps.length ? `<div class="row"><div class="k">Bekler</div><div>${deps.join(', ')}</div></div>` : ''}<div class="row"><div class="k">Dosyalar</div><div>${p.files.map(f => `<code>${esc(f)}</code>`).join('<br>')}</div></div></div>\n`;
    if ((p.tables || []).length) b += `<h3>Tablolar</h3>\n${p.tables.map(t => { const x = need('table', m, t); return x ? renderTable(x) : `<p><code>${esc(t)}</code></p>`; }).join('\n')}\n`;
    if ((p.endpoints || []).length) b += `<h3>Uç noktalar</h3>\n${p.endpoints.map(e => { const x = need('endpoint', m, e); return x ? renderEndpoint(x) : `<p><code>${esc(e)}</code></p>`; }).join('\n')}\n`;
    if ((p.jobs || []).length) b += `<h3>Arka plan işleri</h3>\n${p.jobs.map(j => { const x = need('job', m, j); return x ? renderJob(x) : `<p><code>${esc(j)}</code></p>`; }).join('\n')}\n`;
    if ((p.exports || []).length) b += `<h3>Dışa açtıkları</h3>\n<div class="rows">${p.exports.map(x => { const e = need('export', m, x); return e ? renderExport(e) : row(x, ''); }).join('')}</div>\n`;
    if ((p.needs || []).length) b += `<h3>Kullandıkları</h3>\n<div class="rows">${p.needs.map(n => { const [o, x] = n.split('.'); const e = need('export', o, x); const prov = S.packages.find(q => q.module === o && (q.exports || []).includes(x)); return e ? renderExport({ ...e, note: (e.note || '') + (prov ? ` Gelir: ${prov.id}, Kademe ${stageOf.get(prov.id).ad}.` : '') }, o) : row(n, ''); }).join('')}</div>\n`;
    b += `<h3>Testler</h3>\n<div class="rows">${p.tests.map(t => { const x = find.test(m, t); return `<div class="row"><div class="k">${esc(x ? x.kind : 'paket testi')}</div><div><strong>${esc(t)}</strong>${x ? '. ' + esc(x.asserts) : ''}</div></div>`; }).join('')}</div>\n</section>\n`;
  }
  b += `<nav aria-label="Kademeler">${prev ? `<a href="${prev.dosya}">Önceki: Kademe ${prev.ad}</a>` : ''}<a href="index.html#kademeler">Bütün kademeler</a>${next ? `<a href="${next.dosya}">Sonraki: Kademe ${next.ad}</a>` : ''}</nav>\n`;
  fs.writeFileSync(path.join(OUT, st.dosya), page(`Kademe ${st.ad} · İÜ Yoklama Backend`, 1, b));
}
// index
const opens = IDS.flatMap(id => (spec[id].open_points || []).filter(o => o.needs_owner !== false).map(o => ({ ...o, mod: id })));
let ix = header('İÜ Yoklama · Backend', 'Sunucunun tasarımı kademe kademe: her kademe, bir oturumda yapılacak orta büyüklükte bir iş dosyasıdır.', 1).replace('href="../backend/index.html"', 'href="index.html"');
ix += `<section id="tek-bakista">\n<h2>Tek bakışta</h2>\n<ul>\n<li><strong>Yapı:</strong> tek sunucu uygulaması (apps/server), on beş modül: on biri alan modülü, dördü ortak altyapı. Her tablo, uç nokta, iş ve dosya tek modülündür; modüller birbirine yalnız dışa açtıkları işlevlerle dokunur.</li>\n<li><strong>Kapsam:</strong> ${C.modules.reduce((n, m) => n + m.owns_tables.length, 0)} tablo, ${C.modules.reduce((n, m) => n + m.owns_endpoints.length, 0)} uç nokta, ${C.modules.reduce((n, m) => n + m.owns_jobs.length, 0)} arka plan işi, ${S.packages.length} paket, ${stages.length} kademe.</li>\n<li><strong>Kademe:</strong> bir aşamanın paketleri birbirine dokunmaz; on beş paketlik aşamalar ikiye bölündü (5A, 5B), böylece her kademe 5 ile 9 paket arasında orta bir yük taşır. Aynı aşamanın A ve B kademesi aynı anda ya da art arda yapılabilir.</li>\n<li><strong>İlerleme:</strong> <code>ilerleme.json</code> her paketin durumunu tutar, <code>ilerleme-notlari.md</code> her oturumun notunu; çalışma düzeni <code>BENIOKU.md</code>'dedir.</li>\n<li><strong>Onay bekleyenler:</strong> ${opens.length} karar, her biri önerili: <a href="acik-noktalar.html">Açık noktalar</a>.</li>\n</ul>\n</section>\n`;
ix += `<section id="kademeler">\n<h2>Kademeler</h2>\n` + box(`<table><tr><th>Kademe</th><th>Ne kurulur</th><th>Paket</th><th>Yük</th><th>Modüller</th></tr>${stages.map(s => { const o = ozet(s.asama); return `<tr><td><a href="${s.dosya}">${s.ad}</a></td><td>${esc(o ? o.baslik : '')}</td><td>${s.paketler.length}</td><td>${wt(s.paketler)}</td><td>${[...new Set(s.paketler.map(id => pkg.get(id).module))].map(id => esc(mod[id].title)).join(', ')}</td></tr>`; }).join('')}</table>`) + `\n</section>\n`;
ix += `<section id="moduller">\n<h2>Modüller</h2>\n<div class="rows">\n${C.modules.map(m => `<div class="row"><div class="k"><a href="moduller/${m.name}.html">${esc(m.title)}</a></div><div><code>${esc(m.path)}</code>: ${m.owns_tables.length} tablo, ${m.owns_endpoints.length} uç nokta, ${m.owns_jobs.length} iş. ${esc(spec[m.id].summary || '')}</div></div>`).join('\n')}\n</div>\n<h3 id="ortak-kurallar">Ortak kurallar</h3>\n<ul>\n${(C.shared_rules || []).map(r => `<li>${esc(r)}</li>`).join('\n')}\n</ul>\n<details>\n<summary>Modül sınırı kararları (${(C.decisions || []).length})</summary>\n<ul>\n${(C.decisions || []).map(d => `<li><strong>${esc(d.topic)}:</strong> ${esc(d.decision)} <em>${esc(d.why)}</em></li>`).join('\n')}\n</ul>\n</details>\n</section>\n`;
fs.writeFileSync(path.join(OUT, 'index.html'), page('İÜ Yoklama · Backend', 1, ix));
let ac = header('Açık noktalar', `Onay bekleyen ${opens.length} karar. Sunucu her birinde önerilen değerle tasarlandı; onay farklı çıkarsa yalnız o modül değişir.`, 1).replace('href="../backend/index.html"', 'href="index.html"');
ac += IDS.map(id => { const l = opens.filter(o => o.mod === id); return l.length ? `<h2 id="acik-${mod[id].name}"><a href="moduller/${mod[id].name}.html">${esc(mod[id].title)}</a> (${l.length})</h2>\n<div class="rows">\n${l.map(o => `<div class="row"><div class="k">${esc(o.id)}</div><div>${esc(o.question)} <strong>Öneri:</strong> ${esc(o.recommendation)}</div></div>`).join('\n')}\n</div>` : ''; }).filter(Boolean).join('\n');
fs.writeFileSync(path.join(OUT, 'acik-noktalar.html'), page('Açık noktalar · İÜ Yoklama Backend', 1, ac));
// progress files
fs.writeFileSync(path.join(OUT, 'ilerleme.json'), JSON.stringify({
  aciklama: 'Her paketin durumu. Yalnız durum, tarih ve commit alanları değişir; paket eklenmez, silinmez, yeniden adlandırılmaz. durum: bekliyor | yapiliyor | bitti.',
  kademeler: stages.map(s => ({ kademe: s.ad, dosya: s.dosya, asama: s.asama, paketler: s.paketler.map(id => ({ id, baslik: pkg.get(id).title, durum: 'bekliyor', tarih: null, commit: null })) })),
}, null, 1) + '\n');
fs.writeFileSync(path.join(OUT, 'ilerleme-notlari.md'), '# İlerleme notları\n\nHer oturumun sonunda en üste bir not eklenir: tarih, kademe, bitenler, kalanlar, engeller, sonraki oturumun ilk işi.\n');
fs.writeFileSync(path.join(OUT, 'BENIOKU.md'), `# Backend kademeleri: çalışma düzeni

Bu klasör sunucunun yapım planıdır. Kod reponun kökünde (apps/, packages/) yazılır; docs/ yalnız okunur, bu klasördeki ilerleme dosyaları dışında değişmez.

## Dosyalar
- index.html: tek bakışta, ${stages.length} kademenin listesi, modüller, ortak kurallar.
- kademe-NN[a|b].html: bir kademenin iş dosyası. Özet, önce bitmesi gereken kademeler, bitti ölçütü ve her paketin dosyaları, tabloları (sütunlarıyla), uç noktaları, işleri, dışa açtıkları, kullandıkları (imzalarıyla) ve testleri.
- moduller/<modül>.html: modülün amacı, kuralları, durumları, hata kodları, açık noktaları.
- acik-noktalar.html: onay bekleyen kararlar ve önerileri.
- ilerleme.json: her paketin durumu (bekliyor, yapiliyor, bitti).
- ilerleme-notlari.md: oturum notları, en yeni en üstte.

## Bir oturum
1. ilerleme-notlari.md'nin en üstünü, ilerleme.json'u ve dev reposunun git geçmişini oku.
2. Sıradaki kademeyi seç: önce bitmesi gerekenlerin hepsi bitti olmalı. Aynı aşamanın A ve B kademesi birbirine dokunmaz.
3. Kademenin özetini proje sahibine göster, değişiklik isterse önce onu uygula.
4. Her paketi ayrı bir ajana ver: kademe sayfasındaki paket bölümü ve modül sayfası yeter. Paket kendi testleriyle biter.
5. Testler geçince ilerleme.json'da paketi bitti yap, tarihi ve commit'i yaz, ilerleme-notlari.md'ye not ekle.

## Kaynak
Bu sayfalar docs/hatlar/backend-hatti klasöründeki JSON şartnamelerden betikle üretilir (gen-kademe.js). Elle düzeltilmez; değişiklik şartnamede yapılır, sonra yeniden üretilir.
`);
console.log(`wrote ${OUT}: ${stages.length} stages (${stages.map(s => s.ad + ':' + s.paketler.length + '/' + wt(s.paketler)).join(' ')}); ${IDS.length} module pages; ${opens.length} open points; unwrapped links ${unwrapped}; missing lookups ${missing.length}${missing.length ? '\n' + missing.slice(0, 20).join('\n') : ''}`);
if (missing.length) process.exit(1);
