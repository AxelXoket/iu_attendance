// Builds spec/D07.json and frag/D07.html from one source so the two cannot drift.
// Markup inside strings: [[plan#anchor|text]] or [[teknik#anchor|text]] -> link; {{x}} -> <code>x</code>.
// Fails if any link anchor is missing in plan.html/teknik.html or if U+2013/U+2014 appears.
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const ids = {};
for (const d of ['plan', 'teknik']) ids[d] = new Set([...fs.readFileSync(REPO + d + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

const C = require('./icerik.js');

// ---------- text helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkErr = [];
function html(s) {
  let t = esc(s);
  t = t.replace(/\[\[(plan|teknik)#([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, d, a, txt) => {
    if (!ids[d].has(a)) linkErr.push(d + '#' + a);
    return `<a href="${d}.html#${a}">${txt}</a>`;
  });
  t = t.replace(/\{\{([^}]+)\}\}/g, (m, x) => `<code>${x}</code>`);
  return t;
}
function plain(s) {
  return String(s)
    .replace(/\[\[(plan|teknik)#([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, d, a, txt) => { if (!ids[d].has(a)) linkErr.push(d + '#' + a); return `${txt} (${d}.html#${a})`; })
    .replace(/\{\{([^}]+)\}\}/g, '$1');
}
const deep = v => typeof v === 'string' ? plain(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v;

// ---------- spec ----------
const spec = deep({
  id: 'D07',
  module: 'dogrulama',
  summary: C.ozet,
  tables: C.tablolar.map(t => ({ name: t.ad, purpose: t.amac, columns: t.sutunlar.map(([name, type, nul, def, note]) => ({ name, type, null: nul, default: def, note })), indexes: t.dizinler, constraints: t.kisitlar })),
  endpoints: C.uclar.map(u => ({ method: u.yontem, path: u.yol, client: u.istemci, auth: u.yetki, request: u.istek, response: u.cevap, errors: u.hatalar, idempotency: u.tekrar, rate_limit: u.sinir })),
  jobs: C.isler.map(j => ({ name: j.ad, schedule: j.zaman, idempotency: j.tekrar, does: j.yapar })),
  state_machines: C.durumMakineleri.map(s => ({ name: s.ad, states: s.durumlar, transitions: s.gecisler.map(([from, to, by, when]) => ({ from, to, by, when })) })),
  invariants: C.degismezler,
  exports: C.disYuz.map(([name, signature, purpose]) => ({ name, signature, purpose })),
  files: C.dosyalar,
  tests: C.testler.map(([name, kind, asserts]) => ({ name, kind, asserts })),
  resolved_gaps: C.netlesenler.map(([gap, decision, why]) => ({ gap, decision, why })),
  contradictions_resolved: C.celiskiler.map(([id, resolution]) => ({ id, resolution })),
  open_points: C.acikNoktalar.map(([id, question, recommendation, needs_owner]) => ({ id, question, recommendation, needs_owner })),
});

// ---------- fragment ----------
const o = [];
const p = s => o.push(s);
const row = (k, v) => p(`<div class="row"><div class="k">${html(k)}</div><div>${html(v)}</div></div>`);
// A cell or list item is either markup text or { kod } rendered as escaped <code> (kod may contain braces).
const cell = c => (c && typeof c === 'object') ? `<code>${esc(c.kod)}</code>` : html(c);
function table(head, rows) {
  p('<div class="tablo"><table>');
  p('<tr>' + head.map(h => `<th>${html(h)}</th>`).join('') + '</tr>');
  for (const r of rows) p('<tr>' + r.map(c => `<td>${cell(c)}</td>`).join('') + '</tr>');
  p('</table></div>');
}
const det = (summary, fn) => { p(`<details><summary>${html(summary)}</summary>`); fn(); p('</details>'); };
const ul = items => { p('<ul>'); for (const i of items) p(`<li>${cell(i)}</li>`); p('</ul>'); };

p(`<section id="dogrulama">`);
p(`<h2>${html(C.baslik)}</h2>`);
p(`<p class="meta">${html('D07 · {{apps/server/src/modules/dogrulama/}} · sözleşme {{packages/contracts/src/dogrulama.ts}} · kurallar {{packages/core/src/dogrulama/}} · işler {{apps/server/src/jobs/dogrulama/}} · göçler {{apps/server/migrations/<14 haneli UTC>_dogrulama_<açıklama>/}}')}</p>`);

p('<h3>Amaç ve sınırlar</h3>');
p(`<p>${html(C.ozet)}</p>`);
p('<div class="rows">');
for (const [k, v] of C.sinirlar) row(k, v);
p('</div>');
p('<div class="callout"><p><strong>Kesin ilkeler</strong></p>');
ul(C.ilkeler);
p('</div>');

p('<h3>Tablolar</h3>');
p(`<p>${html(C.tabloGiris)}</p>`);
p('<div class="rows">');
for (const t of C.tablolar) row(t.ad, t.amac);
p('</div>');
for (const t of C.tablolar) det(`${t.ad}: ${t.ozet}`, () => {
  table(['Sütun', 'Tip', 'Boş olabilir', 'Varsayılan', 'Not'], t.sutunlar.map(([n, ty, nu, d, no]) => [{ kod: n }, ty, nu ? 'evet' : 'hayır', d === '' ? '' : { kod: d }, no]));
  p('<p><strong>Dizinler</strong></p>'); ul(t.dizinler.map(x => x));
  p('<p><strong>Kısıtlar</strong></p>'); ul(t.kisitlar.map(x => x));
});

p('<h3>Uç noktalar</h3>');
p(`<p>${html(C.ucGiris)}</p>`);
p('<div class="rows">');
for (const u of C.uclar) row(`${u.yontem} ${u.yol}`, u.ozet);
row('Kuyruk öğesi kafa_sayisi', C.kuyrukOgesi.ozet);
p('</div>');
for (const u of C.uclar) det(`${u.yontem} ${u.yol}: ${u.ozet}`, () => {
  p('<div class="rows det">');
  row('İstemci', u.istemci); row('Yetki', u.yetki); row('Tekrar', u.tekrar); row('Sınır', u.sinir);
  row('Hatalar', u.hatalar.join(', '));
  p('</div>');
  p('<p><strong>İstek</strong></p>'); table(['Alan', 'Tip ve kural'], Object.entries(u.istek));
  p('<p><strong>Cevap</strong></p>'); table(['Alan', 'Tip'], Object.entries(u.cevap));
  if (u.ayrinti) ul(u.ayrinti);
});
det(`Kuyruk öğesi kafa_sayisi: ${C.kuyrukOgesi.ozet}`, () => {
  table(['Alan', 'Tip ve kural'], Object.entries(C.kuyrukOgesi.govde));
  ul(C.kuyrukOgesi.ayrinti);
});

p('<h3>İşler</h3>');
p('<div class="rows">');
for (const j of C.isler) row(j.ad, `${j.zaman} ${j.yapar} Tekrar: ${j.tekrar}`);
p('</div>');
det('Dinleyici ve kayıt bağları: D07 ortak listeleri düzenlemez, dogrulamaEklentisi içinde kaydolur', () => {
  table(['Nereye', 'Ne kaydolur', 'Ne yapar'], C.kayitlar);
});

p('<h3>Durumlar ve kurallar</h3>');
p('<div class="callout">'); p(`<p>${html(C.oncelik)}</p>`); p('</div>');
det(`Gerekçe kataloğu: ${C.gerekceler.length} kod, her biri tek karara bağlı; sınıf içindeki sıra önceliktir`, () => {
  table(['Kod', 'Karar', 'Kaynak', 'Aşama', 'Açık işaret', 'Ne zaman'], C.gerekceler.map(g => [{ kod: g[0] }, g[1], g[2], String(g[3]), g[4] ? 'evet' : 'hayır', g[5]]));
  p(`<p>${html(C.katalogNot)}</p>`);
});
det(`QR sonuç eşlemesi (Aşama 2): D11.qrSonucu'nun ${C.qrEslemesi.length} satırı karara bağlanır, tek sahibi packages/core/src/dogrulama/karar.ts`, () => {
  table(['D11 sonucu', 'Karar', 'Gerekçe ya da kural'], C.qrEslemesi.map(r => [r[0], r[1], /^[A-Z_]+$/.test(r[2]) ? { kod: r[2] } : r[2]]));
});
det('Etiketler: yedi ayrı evet/hayır sütunu, kayıt geldiğinde bir kez hesaplanır', () => {
  table(['Etiket', 'Sütun (D05 tablosu)', 'Ne zaman konur'], C.etiketler.map(e => [e[0], { kod: e[1] }, e[2]]));
});
det('Yeniden değerlendirme: olay yalnız kendi kapsamındaki otomatik kararları baştan hesaplatır, hoca kararına dokunmaz', () => {
  table(['Olay', 'Çağıran', 'Kapsam'], C.olaylar);
  ul(C.yenidenKurallar);
});
det('Cihaz kanıtı: bağlama imzası tutmazsa ya da uygulama bizim değilse reddedildi, bütün ölçütler tutarsa dogrulandi, öbür her durumda dogrulanamadi', () => {
  table(['Kod', 'Sonuç', 'Ne zaman'], C.kanitGerekceleri.map(k => [{ kod: k[0] }, k[1], k[2]]));
  ul(C.kanitNotlari);
});
for (const s of C.durumMakineleri) det(`Durum makinesi ${s.ad}: ${s.ozet}`, () => {
  p(`<p>Durumlar: ${s.durumlar.map(x => `<code>${esc(x)}</code>`).join(', ')}</p>`);
  table(['Kimden', 'Kime', 'Kim', 'Ne zaman'], s.gecisler);
});
det(`Değişmezler: ${C.degismezler.length} kural her zaman doğrudur; Testler bölümündeki senaryo ve özellik testleri bunları korur`, () => ul(C.degismezler));
det(`Dış yüz: ${C.disYuz.length} giriş, contracts.json listesiyle birebir: index.ts işlevleri ve dogrulamaEklentisi, packages/contracts'taki üç saf anahtar işlevi; saf kurallar packages/core içinde`, () => {
  table(['Ad', 'İmza', 'Amaç'], C.disYuz.map(([a, s, m]) => [{ kod: a }, { kod: s }, m]));
  ul(C.disYuzNotlari);
});
det('Denetim olayları: D07 kendi uçlarının ve işlerinin olaylarını D09.denetimeYaz ile yazar, onay olaylarını D09 yazar', () => ul(C.denetimOlaylari));

p('<h3>Hata kodları</h3>');
det(`DOGRULAMA_ önekli ${C.hataKodlari.length} kod: başkasının oturumu 404, durum çatışması 409, kuyruk öğesinde ret, dış yüzde sonuç`, () => {
  table(['Kod', 'Nerede', 'HTTP ya da sonuç', 'Ne zaman'], C.hataKodlari.map(h => [{ kod: h[0] }, h[1], h[2], h[3]]));
  p(`<p>${html(C.hataNot)}</p>`);
});

p('<h3>Testler</h3>');
p(`<p>${html(C.testGiris)}</p>`);
det(`${C.testler.length} test: kurallar özellik testiyle, uçlar ve işler davranış senaryosuyla, bütçe ve mutasyon eşikli`, () => {
  table(['Test', 'Tür', 'Neyi gösterir'], C.testler);
});
det('Dosyalar: modülün yazacağı her dosya (göçler Drizzle ile üretilir)', () => {
  ul(C.dosyalar.map(f => ({ kod: f })));
  p(`<p>${html(C.gocNotu)}</p>`);
});

p('<h3>Netleştirilenler</h3>');
det(`Netleşenler: ${C.netlesenler.length} karar; D07-A04 ile D07-A11 mimarın kararlarıyla kapandı, D07-S01 ile D07-S03 mimar onaylı sapmalardır, D07-G01 göç yeridir; D07-B11 ve D07-B25 sahibe soruldu (D07-A01, D07-A02)`, () => {
  table(['Boşluk', 'Karar', 'Neden'], C.netlesenler);
});
det(`Çelişkiler: ${C.celiskiler.length} çelişkinin hepsi çözüldü; D07-C01'in bağlama kısmı sahibin kararına bağlı`, () => {
  table(['Çelişki', 'Çözüm'], C.celiskiler);
});

p('<h3>Açık noktalar</h3>');
p('<div class="rows">');
for (const [id, q, r, own] of C.acikNoktalar) {
  p(`<div class="row"><div class="k">${html(id)} <span class="tag ${own ? 'warn' : 'mute'}">${own ? 'sahibin kararı' : 'modül hizalaması'}</span></div><div><p>${html(q)}</p><p>Öneri: ${html(r)}</p></div></div>`);
}
p('</div>');
p('</section>');

const frag = o.join('\n') + '\n';
const all = JSON.stringify(spec) + frag;
const bad = [];
if (/[\u2013\u2014]/.test(all)) bad.push('U+2013/U+2014 found');
if (linkErr.length) bad.push('missing anchors: ' + [...new Set(linkErr)].join(', '));
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });
fs.writeFileSync(path.join(B, 'spec', 'D07.json'), JSON.stringify(spec, null, 2) + '\n');
fs.writeFileSync(path.join(B, 'frag', 'D07.html'), frag);
console.log('written: spec', JSON.stringify(spec).length, 'bytes; frag', frag.length, 'bytes');
