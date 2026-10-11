// Builds spec/D06.json and frag/D06.html from veri-1..4.js (one source, so the JSON and the fragment cannot drift),
// then runs D06-specific self-checks on top of spec-validate.js.
const fs = require('fs');
const path = require('path');
const { etiket } = require('./etiket.js');

const BACKEND = path.resolve(__dirname, '..');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const v1 = require('./veri-1.js'), v2 = require('./veri-2.js'), v3 = require('./veri-3.js'), v4 = require('./veri-4.js');

// ---------- spec JSON (schema keys first, integrator extras after) ----------
const spec = {
  id: v1.id, module: v1.module, summary: v1.summary,
  tables: v1.tables, endpoints: v1.endpoints, jobs: v1.jobs,
  state_machines: v2.state_machines, invariants: v2.invariants, exports: v2.exports,
  files: v2.files, goc: v2.goc, tests: v2.tests,
  resolved_gaps: v3.resolved_gaps, contradictions_resolved: v3.contradictions_resolved, open_points: v3.open_points,
  olcum: v4.olcum, dis_yuz_kullanimi: v4.dis_yuz_kullanimi, kayitlar: v4.kayitlar, beklenenler: v4.beklenenler,
  akislar: v4.akislar, kurallar: v4.kurallar, telefon_sozlesmesi: v4.telefon_sozlesmesi,
  hata_kodlari: v4.hata_kodlari, tipler: v4.tipler
};

// ---------- HTML helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TASARIM = { 'ph-success': 'makbuz ekranı', 'sh-d': 'Sorun bildir ekranı', durumlar: 'durum metinleri', 'ph-delete': 'hesap silme ekranı' };
const DOCAD = { plan: 'plan', teknik: 'teknik', tasarim: 'tasarım' };
function linkEtiketi(doc, id) {
  if (doc === 'tasarim') return TASARIM[id] || id;
  let l = etiket(doc, id) || id;
  l = l.replace(/…$/, '').split(':')[0].split(' (')[0].trim();
  return l || id;
}
const kullanilanCapalar = new Set();
function linkify(escaped) {
  return escaped.replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (m, doc, id) => {
    kullanilanCapalar.add(doc + '#' + id);
    return `<a href="${doc}.html#${id}">${esc(DOCAD[doc] + ', ' + linkEtiketi(doc, id))}</a>`;
  });
}
const t = s => linkify(esc(s));
const code = s => `<code>${esc(s)}</code>`;
const details = (ozet, ic) => `<details><summary>${t(ozet)}</summary>\n${ic}\n</details>`;
const ul = items => `<ul>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ul>`;
const ol = items => `<ol>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ol>`;
const tablo = (basliklar, satirlar) =>
  `<table>\n<thead><tr>${basliklar.map(b => `<th>${esc(b)}</th>`).join('')}</tr></thead>\n<tbody>\n` +
  satirlar.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n') + `\n</tbody>\n</table>`;
const rows = pairs => `<div class="rows">\n${pairs.map(([k, v]) => `<div class="row"><div class="k">${esc(k)}</div><div>${v}</div></div>`).join('\n')}\n</div>`;
const tag = (s, cls = '') => `<span class="tag${cls ? ' ' + cls : ''}">${esc(s)}</span>`;

// ---------- fragment ----------
const h = [];
h.push(`<section id="esitleme">`);
h.push(`<h2>Gönderme ve eşitleme (D06, esitleme)</h2>`);
h.push(`<p class="lead">${t(spec.summary)}</p>`);

// Amaç ve sınırlar
h.push(`<h3>Amaç ve sınırlar</h3>`);
h.push(rows([
  ['Yer', `${code('apps/server/src/modules/esitleme/')}, ${code('apps/server/src/jobs/esitleme/')}, ${code('apps/server/src/cli/esitleme-*')}, ${code('packages/contracts/src/esitleme.ts')}, ${code('packages/core/src/esitleme/')}, ${code('apps/server/migrations/??????????????_esitleme_*')}`],
  ['Sahip olduğu', `5 tablo (${['gonderim_defteri', 'kurulumlar', 'degisiklik_sayaci', 'ogrenci_durum_surumleri', 'karar_teslimleri'].map(code).join(', ')}), 2 uç, 1 iş (${code('sira_boslugu_raporu')}).`],
  ['İçinde', t('Telefondan sunucuya gönderim protokolü (paket, sıra, sonuç sözlüğü, yeniden deneme ve bölme kuralının sunucu tarafı), ikinci çapa paketinin imzası, kesintisiz son sıra ve yedekten dönüşte yeniden gönderim, sunucudan telefona artımlı indirme (imleç, nesil, sayfa, kapsam, baştan indir), öğrencinin kendi durumunun sürümü ve kararın telefona ulaştığı an, son temas, gönderme süresinin sonu.')],
  ['Dışında', t('Öğe gövdelerinin anlamı ve iş kuralı (öğe sahipleri), kayıt biçimi ve imzası (D05), saat belgesi ve çapa hesabı (D04), karar (D07), telefona inen tabloların kendisi (D02, D03, D04), sürüm sorgusu GET /v1/surum (D13), hata zarfı ve başlık adları (D13), telefonun yerel kuyruk kodu (apps/mobile).')],
  ['Dayandığı kararlar', t('Ortak kuyruk ve gönderme: plan.html#kararlar-kayit-ve-makbuz, plan.html#kararlar-gonderme, plan.html#kararlar-yeniden-deneme, teknik.html#telefon-gonderme-protokolu. İndirme ve nesil: plan.html#kararlar-indirme, teknik.html#kod-veri-modeli. İkinci çapa: plan.html#gun-ikinci-capa. Yedekten dönüş: plan.html#gun-kenar-durumlar, teknik.html#veritabani-yedek. Tek işlem ve kayıt kayıt doğrulama: teknik.html#sunucu-mimari, teknik.html#veritabani. Hız: plan.html#teknoloji-sunucu-yeri.')],
  ['Ölçülen sonuç', ul(spec.olcum.map(t))]
]));
h.push(details(`Dış yüz: ${spec.exports.length} işlev; öğe işleyicisi ve indirme kaynağı tipleri`,
  tablo(['İşlev', 'İmza', 'Amaç'], spec.exports.map(e => [code(e.name), code(e.signature), t(e.purpose)])) +
  `\n<pre><code>${esc(spec.tipler.join('\n'))}</code></pre>`));
h.push(details("Kullandığı dış yüzler ve kayıtları: D12, D13 ve infra içe aktarılır; D01 ve D04 işlevleri app.ts'ten seçenekle; kimlik olayları kimlikDinleyicileriniKur aboneliğiyle; işler D14 kurucusuyla",
  `<p>Kullandıkları:</p>\n${ul(spec.dis_yuz_kullanimi.map(t))}\n<p>Kayıtları:</p>\n${ul(spec.kayitlar.map(t))}`));
h.push(details(`Başka modüllerden beklenenler: ${spec.beklenenler.length} madde, uyum için bütünleştiriciye`, ul([])));
h.push(details(`Dosyalar: ${spec.files.length} dosya, hepsi D06'nın klasörlerinde`, ul(spec.files.map(code)) +
  `\n<p>${t(spec.goc)}</p>`));

// Tablolar
h.push(`<h3>Tablolar</h3>`);
h.push(`<p>${t('Beş tablo da yalnız D06 tarafından yazılır. Anlar saat arayüzünden yazılır, veritabanı varsayılanı yoktur; durum ve kod listeleri metin ve CHECK, değerler packages/contracts/src/esitleme.ts sabitlerinden üretilir. Kısıt ve dizin adları D12.kisitAdi kuralıyla.')}</p>`);
const TABLO_OZETI = {
  gonderim_defteri: 'her kuyruk öğesinin tek satırı; su seviyesi, sıra çakışması ve boşluk ölçüsünün kaynağı',
  kurulumlar: 'bir kopyada bir hesabın kuyruk izi: sıra, son temas, bekleyen öğe, sürüm',
  degisiklik_sayaci: 'telefona inen tabloların tek satırlık, kilitli sürüm sayacı',
  ogrenci_durum_surumleri: 'öğrenci başına durum sürümü ve telefonun onayladığı sürüm',
  karar_teslimleri: 'karar sürümünün telefona ulaştığı an; sorun bildirme süresinin başı'
};
for (const tb of spec.tables) {
  const kolon = tablo(['Sütun', 'Tip', 'Boş', 'Varsayılan', 'Not'], tb.columns.map(c => [code(c.name), code(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', t(c.note)]));
  if (!TABLO_OZETI[tb.name]) throw new Error('no summary for table ' + tb.name);
  h.push(details(`${tb.name}: ${TABLO_OZETI[tb.name]} (${tb.columns.length} sütun)`,
    `<p>${t(tb.purpose)}</p>\n${kolon}\n<p>Dizinler:</p>\n${ul(tb.indexes.map(t))}\n<p>Kısıtlar:</p>\n${ul(tb.constraints.map(t))}`));
}

// Uç noktalar
h.push(`<h3>Uç noktalar</h3>`);
for (const e of spec.endpoints) {
  h.push(`<div class="card">`);
  h.push(`<p>${code(e.method + ' ' + e.path)} ${tag(e.client)}</p>`);
  h.push(rows([['Kimlik', t(e.auth)], ['Tekrar', t(e.idempotency)], ['Hız sınırı', t(e.rate_limit)], ['Hatalar', e.errors.map(x => code(x)).join(' ')]]));
  h.push(details(`İstek alanları: ${Object.keys(e.request).length} alan`, tablo(['Alan', 'Tip ve kural'], Object.entries(e.request).map(([k, v]) => [code(k), t(v)]))));
  h.push(details(`Cevap alanları: ${Object.keys(e.response).length} alan`, tablo(['Alan', 'Tip'], Object.entries(e.response).map(([k, v]) => [code(k), t(v)]))));
  h.push(`</div>`);
}
h.push(details(`Gönderim akışı: tek işlemde ${spec.akislar.gonderim.length} adım, hata yolları dahil`, ol(spec.akislar.gonderim.map(t))));
h.push(details(`İndirme akışı: ${spec.akislar.indirme.length} adım, baştan indir ve öğrenci bölümü dahil`, ol(spec.akislar.indirme.map(t))));

// İşler
h.push(`<h3>İşler</h3>`);
for (const j of spec.jobs) {
  h.push(rows([['İş', code(j.name)], ['Zamanlama', t(j.schedule)], ['Tekrar', t(j.idempotency)], ['Yaptığı', t(j.does)]]));
}

// Durumlar ve kurallar
h.push(`<h3>Durumlar ve kurallar</h3>`);
for (const sm of spec.state_machines) {
  h.push(details(`${sm.name}: ${sm.states.join(', ')}`,
    tablo(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], sm.transitions.map(x => [code(x.from), code(x.to), t(x.by), t(x.when)]))));
}
h.push(`<div class="callout">\n<p><strong>Değişmezler</strong></p>\n${ol(spec.invariants.map(t))}\n</div>`);
h.push(details('Kurallar: ' + spec.kurallar.map(k => k.ad.toLocaleLowerCase('tr')).join(', '),
  rows(spec.kurallar.map(k => [k.ad, t(k.metin)]))));
h.push(details(`Telefonun uyacağı protokol: ${spec.telefon_sozlesmesi.length} kural, saf kısmı packages/core/src/esitleme/protokol.ts`, ol(spec.telefon_sozlesmesi.map(t))));

// Hata kodları
h.push(`<h3>Hata kodları</h3>`);
h.push(`<p>${t('İstek düzeyi kodlar D13 hata zarfıyla döner; öğe düzeyi kodlar 200 cevabında öğe sonucunun gerekce alanındadır. Sahiplerin öğe kodları kendi sözleşmelerindedir. Hepsi x-extensible-enum.')}</p>`);
const istekKod = spec.hata_kodlari.filter(k => k.duzey === 'istek').length;
h.push(details(`${spec.hata_kodlari.length} ESITLEME_ kodu: ${istekKod} istek düzeyi, ${spec.hata_kodlari.length - istekKod} öğe düzeyi`,
  tablo(['Kod', 'Düzey', 'HTTP ya da sonuç', 'Anlamı'], spec.hata_kodlari.map(k => [code(k.kod), esc(k.duzey), esc(k.sonuc), t(k.ne)]))));

// Testler
const kindAd = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
const say = {}; spec.tests.forEach(x => say[x.kind] = (say[x.kind] || 0) + 1);
h.push(`<h3>Testler</h3>`);
h.push(`<p>${t('Davranış senaryoları Fastify inject ile gerçek PostgreSQL üzerinde koşar (teknik.html#testler); sahte saat D04 test desteğinden, sahte öğe işleyicileri ve indirme kaynakları support/kurucular/esitleme.ts\'ten. Durum makinesi testi teknik.html#testler-kalite\'deki gibi Cucumber senaryosunda koşar. Her yokluk iddiasının pozitif kontrolü vardır.')}</p>`);
h.push(details(`${spec.tests.length} test: ` + Object.entries(say).map(([k, n]) => `${n} ${kindAd[k]}`).join(', '),
  tablo(['Test', 'Tür', 'Doğruladığı'], spec.tests.map(x => [t(x.name), tag(kindAd[x.kind], 'mute'), t(x.asserts)]))));

// Netleştirilenler
h.push(`<h3>Netleştirilenler</h3>`);
h.push(details(`${spec.resolved_gaps.length} boşluk karara bağlandı (D06-B05'in ürün tarafı açık nokta D06-A01)`,
  tablo(['Boşluk', 'Karar', 'Gerekçe'], spec.resolved_gaps.map(g => [code(g.gap), t(g.decision), t(g.why)]))));
h.push(details(`${spec.contradictions_resolved.length} çelişki çözüldü`,
  tablo(['Çelişki', 'Çözüm'], spec.contradictions_resolved.map(c => [code(c.id), t(c.resolution)]))));

// Açık noktalar
h.push(`<h3>Açık noktalar</h3>`);
for (const o of spec.open_points) {
  h.push(`<div class="callout warn">\n<p>${code(o.id)} ${o.needs_owner ? tag('sahibin kararı', 'warn') : tag('teknik', 'mute')}</p>\n<p>${t(o.question)}</p>\n<p><strong>Öneri:</strong> ${t(o.recommendation)}</p>\n</div>`);
}
h.push(`</section>`);
const html = h.join('\n') + '\n';

// ---------- write ----------
fs.mkdirSync(path.join(BACKEND, 'spec'), { recursive: true });
fs.mkdirSync(path.join(BACKEND, 'frag'), { recursive: true });
fs.writeFileSync(path.join(BACKEND, 'spec', 'D06.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(BACKEND, 'frag', 'D06.html'), html, 'utf8');

// ---------- D06 self-checks (beyond spec-validate.js) ----------
const errs = [];
const inv = JSON.parse(fs.readFileSync(path.join(BACKEND, 'inv', 'D06.json'), 'utf8'));
const gapIds = new Set(spec.resolved_gaps.map(g => g.gap));
for (const g of inv.gaps) if (!gapIds.has(g.id)) errs.push('gap not resolved: ' + g.id);
for (const g of gapIds) if (!inv.gaps.some(x => x.id === g)) errs.push('unknown gap id: ' + g);
const cIds = new Set(spec.contradictions_resolved.map(c => c.id));
for (const c of inv.contradictions) if (!cIds.has(c.id)) errs.push('contradiction not resolved: ' + c.id);
for (const g of inv.gaps.filter(g => g.needs_owner)) if (!spec.open_points.some(o => (o.question + ' ' + o.recommendation).includes(g.id))) errs.push('needs_owner gap without open point: ' + g.id);
for (const o of spec.open_points) if (!/^D06-A\d\d$/.test(o.id) || typeof o.needs_owner !== 'boolean') errs.push('bad open point: ' + o.id);
const all = JSON.stringify(spec) + html;
if (/[\u2013\u2014]/.test(all)) errs.push('en or em dash present');
if (/KVKK/i.test(all)) errs.push('KVKK mentioned');
for (const w of ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'tapestry', 'showcase', 'intricate', 'vibrant']) if (new RegExp('\\b' + w + '\\b', 'i').test(all)) errs.push('banned word: ' + w);
// every anchor mentioned anywhere in the spec text must exist
const idsOf = {};
for (const d of ['plan', 'teknik', 'tasarim']) idsOf[d] = new Set([...fs.readFileSync(REPO + d + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const m of JSON.stringify(spec).matchAll(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g)) if (!idsOf[m[1]].has(m[2])) errs.push('broken anchor in spec: ' + m[0]);
// endpoint request/response values are strings; tests kinds valid; columns complete
for (const e of spec.endpoints) for (const k of ['request', 'response']) for (const [f, v] of Object.entries(e[k])) if (typeof v !== 'string') errs.push(`${e.path} ${k}.${f} not string`);
for (const x of spec.tests) if (!kindAd[x.kind]) errs.push('bad test kind: ' + x.kind);
for (const tb of spec.tables) for (const c of tb.columns) for (const k of ['name', 'type', 'null', 'default', 'note']) if (c[k] === undefined) errs.push(`${tb.name}.${c.name} missing ${k}`);
// summary 3 to 6 sentences
const cumle = spec.summary.split(/(?<=[.!?])\s+/).filter(Boolean).length;
if (cumle < 3 || cumle > 6) errs.push('summary sentences: ' + cumle);
// every error code used in endpoints/gaps is in the catalog, and every catalog code is used somewhere else
const katalog = new Set(spec.hata_kodlari.map(k => k.kod));
// ESITLEME_ names that are not D06 error codes: D04's second-anchor reason value and D06's own contract constants.
const KOD_DEGIL = new Set(['ESITLEME_BOZUK', 'ESITLEME_DENETIM_OLAYLARI', 'ESITLEME_ROTALARI']);
const disi = JSON.stringify({ e: spec.endpoints, g: spec.resolved_gaps, s: spec.state_machines, a: spec.akislar, t: spec.tests });
for (const m of disi.matchAll(/\bESITLEME_[A-Z_]+\b/g)) if (!katalog.has(m[0]) && !KOD_DEGIL.has(m[0])) errs.push('code not in catalog: ' + m[0]);
for (const k of katalog) if (KOD_DEGIL.has(k)) errs.push('non-code name in error catalog: ' + k);
for (const k of katalog) if (!disi.includes(k)) errs.push('catalog code never used elsewhere: ' + k);

// ---------- align round guard (align/D06.json): contract exports, retired wording gone, decided wording present in spec AND fragment ----------
const C = JSON.parse(fs.readFileSync(path.join(BACKEND, 'contracts.json'), 'utf8'));
const sozlesmeAdlari = C.modules.find(m => m.id === 'D06').exports.map(e => e.match(/^[A-Za-z_][A-Za-z0-9_]*/)[0]).sort();
const specAdlari = spec.exports.map(e => e.name).sort();
if (JSON.stringify(sozlesmeAdlari) !== JSON.stringify(specAdlari)) errs.push('exports differ from contracts.json: spec ' + specAdlari.join(',') + ' / contracts ' + sozlesmeAdlari.join(','));
const specMetni = JSON.stringify(spec);
const KALKAN = ['API_SORGU_ZAMAN_ASIMI', 'esitlemeSagligi', "'paket_imzasiz'", "'esitleme_bozuk'", "'gonderilmedi'", "'sonra_yeniden_baslatma'", "'imzalanamadi'", 'YOK paket_imzasiz', 'YOK gonderilmedi', 'YOK esitleme_bozuk',
  'iki kapsam kaynağını da', 'ikisini de D02 kaydeder', 'saklama işleyicisi kaydetmez', 'esitleme.karar_teslimleri', '03:30', 'kayıt metnindeki sıra öğe sırasıyla aynıdır', 'kimlikOlayiDinleyicisiKaydet(', "kimlikOlayiDinleyicisiKaydet'", 'kimlikOlayiDinleyicisiKaydet }',
  "roller: ['ogrenci'], cihazId", '25 saniye', 'ders satırıyla inen birim son günü', 'bekleyenOgeSayisi:'];
for (const k of KALKAN) { if (specMetni.includes(k)) errs.push('retired wording in spec: ' + k); if (html.includes(esc(k))) errs.push('retired wording in fragment: ' + k); }
if (/hesapSilinmis\s*:/.test(specMetni)) errs.push('PaketBaglami must not carry hesapSilinmis');
const GEREKEN = ['surumDamgasiIste(tx: Islem, damga: (surum: bigint) => Promise<void>): void', 'D12.islemSonuKancasi', 'kurulumSonTemaslari(tx: Islem, kisiIdler: readonly KisiId[])', 'esitlemeKimlikDinleyicisi: KimlikDinleyicisi',
  'kilitAnahtarlari?(tx: Islem, ogeler: readonly GelenOge[], baglam: PaketBaglami): Promise<readonly DanismaAnahtari[]>', 'kimlik: Kimlik | null', 'ogrenci_liste_kapsami', 'esitleme.donem_verisi', 'saklamaIsleyicisiniCalistir',
  'VERITABANI_ZAMAN_ASIMI', 'kalanSureMs', 'defterYazar: true', "kimlikKaynaklari ['bearer']", 'KIMLIK_KAPSAM_SINIRLI', 'bekleme { sabit: 5 }', 'imzaliMetinSemasi', 'hesapSilindiMi', 'govdeEnBuyukBayt 49152', '02:15',
  'aynı veriyle iki kez çalışırsa', 'ESITLEME_DENETIM_OLAYLARI', 'denetimOlaylariniKaydet', 'apps/server/src/cli/esitleme-en-eski-surum.ts', '??????????????_esitleme_*', 'ON CONFLICT (id) DO NOTHING', 'BASKA_CIHAZ_GONDERDI', 'OKUTMA_YOLU',
  "D02'nin kilit genel kaynağındaki birim dönemi satırıyla inen son gün ve kilit anı", 'EklentiTemelSecenekleri', 'setNotFoundHandler', 'API_ROL_YETKISIZ', 'kimlikDinleyicileriniKur', "'esitleme:kurulum_siniri:<kisiId>'", 'export const isler'];
for (const k of GEREKEN) { if (!specMetni.includes(JSON.stringify(k).slice(1, -1))) errs.push('decided wording missing in spec: ' + k); if (!html.includes(esc(k))) errs.push('decided wording missing in fragment: ' + k); }

console.log(`written spec/D06.json (${fs.statSync(path.join(BACKEND, 'spec', 'D06.json')).size} B) and frag/D06.html (${html.length} chars); anchors linked: ${kullanilanCapalar.size}`);
if (errs.length) { console.log('SELF-CHECK ERRORS (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }
console.log('SELF-CHECK OK: gaps ' + gapIds.size + '/' + inv.gaps.length + ', contradictions ' + cIds.size + '/' + inv.contradictions.length + ', summary sentences ' + cumle);
