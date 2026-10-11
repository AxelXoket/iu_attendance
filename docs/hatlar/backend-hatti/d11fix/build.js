// Builds spec/D11.json and frag/D11.html from icerik-1..3.js, with deterministic checks.
// Usage: node build.js   (then: node ../spec-validate.js D11)
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const OUT = process.env.D11_OUT || B;
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const p1 = require('./icerik-1.js'), p2 = require('./icerik-2.js'), p3 = require('./icerik-3.js');
const contracts = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const mod = contracts.modules.find(m => m.id === 'D11');
const inv = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D11.json'), 'utf8'));

const S = {
  id: 'D11', module: mod.name, summary: p1.summary,
  tables: p1.tables, endpoints: p2.endpoints, jobs: p2.jobs, state_machines: p2.state_machines,
  invariants: p2.invariants, exports: p2.exports, files: p2.files, tests: p3.tests,
  resolved_gaps: p3.resolved_gaps, contradictions_resolved: p3.contradictions_resolved, open_points: p3.open_points,
};

// ---------- deterministic checks ----------
const errs = [];
const all = JSON.stringify(S);
if (/[\u2013\u2014]/.test(all)) errs.push('U+2013 or U+2014 present');
if (/KVKK/i.test(all)) errs.push('KVKK mentioned');
// constraint and index names: <table>_..._<pk|fk|uq|ck|idx>, <= 63 bytes, unique
const names = new Set();
for (const t of S.tables) {
  for (const line of [...t.indexes, ...t.constraints]) {
    const n = line.split(':')[0].trim();
    if (!n.startsWith(t.name + '_')) errs.push(`name not prefixed by table: ${n}`);
    if (!/_(pk|fk|uq|ck|idx)$/.test(n)) errs.push(`name lacks kind suffix: ${n}`);
    if (Buffer.byteLength(n) > 63) errs.push(`name over 63 bytes (${Buffer.byteLength(n)}): ${n}`);
    if (names.has(n)) errs.push(`duplicate name: ${n}`);
    names.add(n);
  }
  for (const c of t.columns) {
    if (!/^[a-z][a-z0-9_]*$/.test(c.name)) errs.push(`column name not ascii snake: ${t.name}.${c.name}`);
    if (/_ani$/.test(c.name) && c.type !== 'timestamptz') errs.push(`_ani column not timestamptz: ${t.name}.${c.name}`);
    if (c.type === 'timestamptz' && !/_ani$/.test(c.name) && c.name !== 'telefon_saati') errs.push(`timestamptz without _ani: ${t.name}.${c.name}`);
    if (/^(real|double|float|numeric)/.test(c.type)) errs.push(`floating type: ${t.name}.${c.name}`);
    if (c.name === 'id' && c.default !== 'uuidv7()' && t.name !== 'gosterim_kayitlari') errs.push(`id default not uuidv7(): ${t.name}`);
  }
}
// owned items exactly
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:]/g, '');
const ep = s => String(s).replace(/\{[^}]+\}|:[a-z_]+/gi, '{x}').replace(/\/+$/, '').toLowerCase();
const eqSet = (a, b, what) => { const A = new Set(a), Bs = new Set(b); for (const x of A) if (!Bs.has(x)) errs.push(`${what} extra: ${x}`); for (const x of Bs) if (!A.has(x)) errs.push(`${what} missing: ${x}`); };
eqSet(S.tables.map(t => norm(t.name)), mod.owns_tables.map(norm), 'table');
eqSet(S.endpoints.map(e => ep(e.method + ' ' + e.path)), mod.owns_endpoints.map(ep), 'endpoint');
eqSet(S.jobs.map(j => norm(j.name)), mod.owns_jobs.map(norm), 'job');
// contract exports present (an extra proposed one is allowed and must say so)
for (const e of mod.exports) { const n = e.split('(')[0]; if (!S.exports.some(x => x.name === n)) errs.push('contract export missing: ' + n); }
for (const x of S.exports) if (!mod.exports.some(e => e.split('(')[0] === x.name) && !/D11-A08/.test(x.name + x.purpose)) errs.push('unexplained extra export: ' + x.name);
// every inventory gap and contradiction is answered exactly once
const answered = new Map();
for (const g of S.resolved_gaps) answered.set(g.gap, (answered.get(g.gap) || 0) + 1);
for (const o of S.open_points) for (const m of (o.question.match(/D11-B\d\d/g) || [])) answered.set(m, (answered.get(m) || 0) + 1);
for (const g of inv.gaps) if (!answered.get(g.id)) errs.push('gap not answered: ' + g.id);
for (const [k, v] of answered) if (!inv.gaps.some(g => g.id === k)) errs.push('answer for unknown gap: ' + k);
for (const c of inv.contradictions) if (!S.contradictions_resolved.some(r => r.id === c.id)) errs.push('contradiction not answered: ' + c.id);
// files inside globs
const globs = contracts.file_ownership.filter(g => g.owner === 'D11').map(g => g.glob.replace(/\*+$/, ''));
for (const f of S.files) if (!globs.some(g => f.startsWith(g))) errs.push('file outside globs: ' + f);
if (new Set(S.files).size !== S.files.length) errs.push('duplicate file');
// test kinds
for (const t of S.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('bad test kind: ' + t.name);
// anchors referenced in text must exist
const ids = {};
for (const doc of ['plan', 'teknik', 'tasarim']) ids[doc] = new Set([...fs.readFileSync(REPO + doc + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const m of all.matchAll(/(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g)) if (!ids[m[1]].has(m[2])) errs.push(`unknown anchor ${m[1]}.html#${m[2]}`);
if (errs.length) { console.log('CHECK ERRORS (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }

fs.mkdirSync(path.join(OUT, 'spec'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'spec', 'D11.json'), JSON.stringify(S, null, 1) + '\n', 'utf8');

// ---------- fragment ----------
const LABEL = {
  'plan:tek-bakista': 'Tek bakışta', 'plan:kararlar-roller': 'Roller ve hoca oturumu', 'plan:kararlar-kayit-ve-makbuz': 'Kayıt ve makbuz',
  'plan:kararlar-supheli-kayit': 'Şüpheli kayıt', 'plan:kararlar-olcum': 'Ölçüm', 'plan:kararlar-inceleme-hesaplari': 'İnceleme hesapları',
  'plan:gun-ikinci-capa': 'İkinci çapa', 'plan:gun-zayif-nokta': 'Zayıf nokta', 'plan:gun-kayit-etiketleri': 'Kayıt etiketleri',
  'plan:asama23': 'Aşama 2 ve 3', 'plan:asama23-nereden-gosterilir': 'Nereden gösterilir', 'plan:asama23-degisme-ve-kabul': 'Değişme ve kabul',
  'plan:asama23-okutma': 'Okutma', 'plan:asama23-gps': 'GPS', 'plan:hile': 'Hile ve sınırlar', 'plan:hile-ikinci-profil': 'Çalınan hoca anahtarı',
  'plan:hile-otomatik-kabul-kurali': 'Otomatik kabul kuralı', 'plan:hile-rastgele-isim': 'Deneme sınırı', 'plan:hoca': 'Hoca ve yönetici',
  'plan:hedefler': 'Hedefler', 'plan:dagitim-guncelleme-ilkesi': 'Güncelleme ilkesi', 'plan:acik': 'Açık noktalar', 'plan:acik-asama1': 'Aşama 1 açık noktası',
  'plan:teknoloji-olceklenme-yolu': 'Ölçeklenme yolu', 'plan:baslangic': 'Başlangıç', 'teknik:telefon-kamera-qr': 'Kamera ve QR',
  'teknik:telefon-anahtar-imza': 'Anahtar ve imza', 'teknik:telefon-bluetooth': 'Bluetooth', 'teknik:telefon-konum': 'Konum',
  'teknik:sunucu-mimari': 'Mimari', 'teknik:sunucu-kimlik': 'Kimlik', 'teknik:sunucu-guvenlik': 'Güvenlik', 'teknik:sunucu-ayarlar': 'Ayarlar',
  'teknik:kod': 'Kod düzeni', 'teknik:kod-veri-modeli': 'Veri modeli', 'teknik:panel-cati': 'Panel çatısı', 'teknik:panel-sunulma': 'Sunulma',
  'teknik:dagitim-ayrinti-korunacak-anahtarlar': 'Korunacak anahtarlar', 'tasarim:durumlar': 'Durum metinleri', 'tasarim:scr-qr': 'Hocanın QR ekranı', 'tasarim:k-qr': 'QR değişimi',
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lnk = (doc, id, label) => `<a href="${doc}.html#${id}">${esc(label || LABEL[doc + ':' + id] || id)}</a>`;
const tx = s => esc(s).replace(/(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (m, d, id) => lnk(d, id));
const code = s => `<code>${esc(s)}</code>`;
const rows = pairs => `<div class="rows">\n${pairs.map(([k, v]) => `<div class="row"><div class="k">${esc(k)}</div><div>${v}</div></div>`).join('\n')}\n</div>`;
const table = (head, body) => `<table>\n<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>\n<tbody>\n${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}\n</tbody>\n</table>`;
const ul = items => `<ul>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ul>`;
const det = (summary, inner) => `<details>\n<summary>${summary}</summary>\n${inner}\n</details>`;
const pre = s => `<pre><code>${esc(s)}</code></pre>`;

const KIMLIK = {
  'POST /v1/projeksiyon/eslestirme-kodu': 'girişsiz; Origin panel adresi',
  'GET /v1/projeksiyon/kodlar': 'projeksiyon çerezi',
  'DELETE /v1/projeksiyon/tarayici': 'projeksiyon çerezi; Origin',
  'POST /v1/projeksiyon/onay': 'hoca, yalnız telefon',
  'GET /v1/projeksiyon/baglantilar': 'hoca (telefon ya da panel)',
  'DELETE /v1/projeksiyon/baglantilar/{id}': 'onaylayan hoca',
  'POST /v1/projeksiyon/qr-anahtarlari': 'hoca, yalnız telefon',
};
const OZET = {
  projeksiyon_tarayicilari: 'kürsü tarayıcısı; çerezdeki gizli değerin yalnız özeti',
  projeksiyon_eslestirme_kodlari: '6 rakamlık, 5 dakikalık, tek kullanımlık kod; yalnız HMAC özeti',
  projeksiyon_baglantilari: 'kürsü ile ders oturumu bağı; oturumda ve tarayıcıda tek açık bağlantı',
  eslestirme_yanlis_denemeleri: 'giriş oturumu başına 10 dakikalık kesin yanlış deneme sayacı',
  qr_anahtar_yuvalari: 'QR\'daki 1 rakamlık anahtar alanının telefon giriş oturumlarına atanması',
  qr_anahtar_indirmeleri: 'hangi (atama, gün) anahtarının hangi kid ile türetildiği',
  gosterim_kayitlari: 'hoca telefonunun gösterim aralıkları, hoca saati ve payı',
  yoklama_kanitlari: 'kaydın Aşama 2 ve 3 kanıtı ve değerlendirmesi, kayıtla 1:1',
};

const h = [];
h.push(`<section id="${mod.name}">`);
h.push(`<h2>${esc(mod.title)}</h2>`);
h.push(`<p>${tx(S.summary)}</p>`);

// Amaç ve sınırlar
h.push('<h3>Amaç ve sınırlar</h3>');
h.push(`<p>Planın ${lnk('plan', 'asama23', 'Aşama 2 ve 3')} bölümündeki QR, projeksiyon, yedek kod, Bluetooth ve konum kurallarının sunucu tarafı. Aşama 1'de bu modülün uçları kapalıdır, yalnız QR anahtar kaynağı zorunlu ayardır (${lnk('teknik', 'sunucu-ayarlar')}). Telefon (apps/mobile) ve panelin projeksiyon sayfası (apps/panel) bu haritanın dışındadır; uymaları gereken sunucu sözleşmesi aşağıda.</p>`);
h.push(rows([
  ['Sahip olduğu', `8 tablo, 7 uç, 2 iş, ${code('gosterim_kaydi')} kuyruk öğesi, ${code('packages/core/src/projeksiyon')} ortak kuralları ve ${code('packages/contracts/src/projeksiyon.ts')}.`],
  ['Yazmadığı', 'Karar, gerekçe, etiket ve 2\'lik ortak sınır (D07); kayıt satırı (D05); pencere ve saat payı (D04); oturum kısa kodu ve QR\'lı ders ayarı (D02); telefon modeli (D01); denetim kaydı (D09, denetimeYaz ile).'],
  ['Okuduğu dış yüzler', 'D01 kök kanca kimliği (oturumDogrula üzerinden); D02 oturumGetir, dersGetir, dersYetkisi; D04 simdi, pencereGetir, esitlemeSaglikliMi, saatBelgesiDogrula ve core saatSonucu; D06 ogeTuruKaydet; D09 denetimeYaz; D12 islem, kisitAdi, saklamaIsleyicisiKaydet (danışma kilidi: D12\'nin önerdiği danismaKilidi sözleşmeye girerse o, girmezse aynı anahtar biçimiyle doğrudan pg_advisory_xact_lock); D13 rotalariKaydet, uygulamaHatasi, hizSinifi; D14 isGonder, isTanimla; D15 ayarlar, gizliAnahtar, log.'],
  ['Çağıranlar', 'D05 qrKanitiniAyristir (gönderim ve makbuz okutması, aynı işlem); D07 qrSonucu ve gosterimAraliklari; D06 gosterimKaydiOgesi (kayıtla); D15 olcum_ görünümleri tabloları yalnız okur.'],
  ['Kayıtları', 'D06 ogeTuruKaydet(gosterim_kaydi); D04 oturumKapandiDinleyicisiKaydet(projeksiyon_baglanti_kapat); D12 saklamaIsleyicisiKaydet(projeksiyon.kanitlar, projeksiyon.baglantilar, projeksiyon.anahtarlar); D13 rota listesi; D14 iş tanımları; öneri: D01 kimlikOlayiDinleyicisiKaydet (D11-A07).'],
  ['Göç', `${code('apps/server/migrations/<UTC zaman>_projeksiyon_<açıklama>/')}: D12'nin tek Drizzle klasörü; göç yalnız bu modülün sekiz tablosuna dokunur, ${code('tablolar.ts')} tanımından üretilir.`],
  ['Ölçülen sonuç', `Yoklama hızı ve QR okuma hedefleri (${lnk('plan', 'hedefler')}), çapası eski QR oranı (planın ilk QR denemesinde ölçülecek oranı), model başına Bluetooth kaçırma oranı, işaretlenmeden kabul payına QR kayıtlarının katkısı. Hesap D15'in olcum_ görünümlerinde, dilimler ve sonuçlar bu modülün tablolarından; log olayları yalnız iç kimlik taşır.`],
  ['Dayanak', [lnk('plan', 'asama23-nereden-gosterilir'), lnk('plan', 'asama23-degisme-ve-kabul'), lnk('plan', 'asama23-okutma'), lnk('plan', 'asama23-gps'), lnk('plan', 'hile'), lnk('plan', 'hoca'), lnk('plan', 'hedefler'), lnk('teknik', 'telefon-kamera-qr'), lnk('teknik', 'telefon-anahtar-imza'), lnk('teknik', 'telefon-bluetooth'), lnk('teknik', 'telefon-konum'), lnk('teknik', 'sunucu-ayarlar'), lnk('tasarim', 'durumlar'), lnk('tasarim', 'scr-qr')].join(', ')],
]));

h.push('<p><strong>Akış</strong></p>');
h.push(`<ol>
<li>Kürsü sayfası açılır, ${code('POST /v1/projeksiyon/eslestirme-kodu')} ile çerezini ve 6 rakamlık kodu alır, kodu QR'ıyla gösterir.</li>
<li>Hoca kodu telefonuyla okutur, ders oturumunu seçer; ${code('POST /v1/projeksiyon/onay')} bağlantıyı açar (aynı derste eski bağlantı kapanır).</li>
<li>Sayfa ${code('GET /v1/projeksiyon/kodlar')} ile pencere açıkken 30 saniyelik dönen kodları alır ve sunucu saatine göre gösterir.</li>
<li>İnternetsiz derste hoca QR'ı telefonundan, ${code('POST /v1/projeksiyon/qr-anahtarlari')} ile önceden indirdiği gün anahtarıyla gösterir; gösterim aralığı ${code('gosterim_kaydi')} olarak kuyruğa girer.</li>
<li>Öğrencinin kaydı ortak kuyruktan gelir; D05 ${code('qrKanitiniAyristir')} ile kanıtı değerlendirtir, D07 karar verir, D05 kaydı ekleyip ${code('kaydet()')} çağırır.</li>
<li>Hoca telefonu koduyla gelen kayıt gösterim kaydını bekler; kayıt gelince aynı işlemde yeniden hesaplanır ve D07 dinleyicisi kararı yeniler.</li>
<li>Ders bitince bağlantı kapanır; gece eşleştirme verisi silinir.</li>
</ol>`);

// Tablolar
h.push('<h3>Tablolar</h3>');
h.push(`<p>Sekiz tablo, hepsi uygulama şemasında ve D12'nin ortak sütun kurallarıyla (kimlik uuidv7(), anlar timestamptz, durumlar metin ve CHECK). Kısıt adları ${code('kisitAdi')} kuralına uyar ve 63 baytı aşmaz; değerler büyük harfli kod değerleridir ve sözleşme dosyasındaki listelerden üretilir. Başka modülün tablosuna yalnız yabancı anahtarla başvurulur.</p>`);
for (const t of S.tables) {
  const inner = [`<p>${tx(t.purpose)}</p>`,
    table(['Sütun', 'Tip', 'Boş', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), esc(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', tx(c.note)])),
    '<p><strong>Dizinler</strong></p>', ul(t.indexes.map(i => { const [n, ...r] = i.split(':'); return `${code(n.trim())}: ${tx(r.join(':').trim())}`; })),
    '<p><strong>Kısıtlar</strong></p>', ul(t.constraints.map(i => { const [n, ...r] = i.split(':'); return `${code(n.trim())}: ${code(r.join(':').trim())}`; }))].join('\n');
  h.push(det(`${code(t.name)}: ${esc(OZET[t.name])}`, inner));
}

// Uç noktalar
h.push('<h3>Uç noktalar</h3>');
h.push(`<p>Rotalar ${code('packages/contracts/src/projeksiyon.ts')} içinde ${code('rotaTanimla')} ile tanımlanır, eklenti ${code('rotalariKaydet')} ile kaydeder. Kod, çerez ve anahtar hiçbir zaman adres satırına girmez (${lnk('teknik', 'sunucu-ayarlar')}). ${esc(p2.ORTAK)}</p>`);
h.push(table(['Uç', 'İstemci', 'Kimlik', 'Ne yapar'], S.endpoints.map(e => [code(e.method + ' ' + e.path), esc(e.client), esc(KIMLIK[e.method + ' ' + e.path]), esc({
  '/v1/projeksiyon/eslestirme-kodu': 'Tarayıcıyı ve 6 rakamlık kodu üretir',
  '/v1/projeksiyon/kodlar': 'Durum ve 30 saniyelik dönen kodlar',
  '/v1/projeksiyon/tarayici': 'Sayfa kendini kapatır',
  '/v1/projeksiyon/onay': 'Hoca kodu bir ders oturumu için onaylar',
  '/v1/projeksiyon/baglantilar': 'Bağlı kürsüler listesi',
  '/v1/projeksiyon/baglantilar/{id}': 'Hoca bağlantıyı keser',
  '/v1/projeksiyon/qr-anahtarlari': 'Yuva ve 5 günlük QR anahtarları',
}[e.path])])));
for (const e of S.endpoints) {
  const kv = o => ul(Object.entries(o).map(([k, v]) => `${code(k)}: ${tx(v)}`));
  h.push(det(`${code(e.method + ' ' + e.path)}: ${esc(e.client)}`, rows([
    ['Kimlik', tx(e.auth)], ['İstek', Object.keys(e.request).length ? kv(e.request) : 'gövde yok'], ['Cevap', kv(e.response)],
    ['Hatalar', ul(e.errors.map(x => /^Örtük/.test(x) ? tx(x) : code(x)))], ['Tekrar', tx(e.idempotency)], ['Hız', tx(e.rate_limit)],
  ])));
}

// İşler
h.push('<h3>İşler</h3>');
h.push(`<p>İşler ${code('apps/server/src/jobs/projeksiyon/index.ts')} içindeki ${code('isler')} dizisinde D14.isTanimla ile; kuyruk sözleşmeleri ${code('modules/projeksiyon/kuyruklar.ts')} içinde KuyrukTanimi nesnesi. İş verisi yalnız iç kimlik taşır.</p>`);
for (const j of S.jobs) h.push(det(`${code(j.name)}: ${esc(j.name === 'projeksiyon_baglanti_kapat' ? 'ders bitişinde bağlantıyı kapatır' : 'her gece bir günden eski eşleştirme verisini siler')}`, rows([['Zaman', tx(j.schedule)], ['Ne yapar', tx(j.does)], ['Tekrar', tx(j.idempotency)]])));

// Durumlar ve kurallar
h.push('<h3>Durumlar ve kurallar</h3>');
h.push(`<p>Kurallar ${code('packages/core/src/projeksiyon')} içinde saf işlevdir: Intl kullanmaz, UTC milisaniyeyle ve tam sayıyla hesaplar, HMAC ve saat dışarıdan verilir (${lnk('teknik', 'kod')}). Telefon QR'ı aynı işlevle çizer, sunucu aynı işlevle doğrular.</p>`);
h.push('<p><strong>QR biçimi</strong> (' + lnk('teknik', 'telefon-kamera-qr') + ')</p>');
h.push(pre([
  'Yoklama QR\'ı: sayısal kip, sürüm 1, L düzeyi, en çok 41 rakam, her yanda 4 kare boş kenar',
  '  1  sürüm            1',
  '  1  yuva             0 projeksiyon (sunucu), 1 ile 9 hoca telefonu',
  ' 10  oturum kısa kodu soldan sıfırla (D02 oturumlar.kisa_kod)',
  '  9  dilim            floor(Unix sn / 5); 2128 yılına kadar 9 rakam',
  ' 20  doğrulama kodu   HMAC-SHA256(anahtar, ileti) ilk 8 bayt, işaretsiz büyük uçlu, soldan sıfırla',
  '',
  'ileti (19 bayt) = amaç(1) | sürüm(1) | yuva(1) | kısa kod(8, BE) | dilim(8, BE)',
  'amaç 0x01 QR; 0x02 yedek kod = HMAC ilk 8 bayt mod 1.000.000, 6 rakam;',
  'amaç 0x03 Bluetooth = HMAC ilk 8 bayt (dilim = floor(Unix sn / 15)), servis kimliğinin ikinci yarısı',
  'Eşleştirme QR\'ı: IUY:E1:<6 rakam> (alfasayısal kip, sürüm 1); makbuz zarfı IUY1. ile başlar, çakışmaz',
].join('\n')));
h.push('<p><strong>Anahtarlar</strong> (' + lnk('teknik', 'sunucu-ayarlar') + ', ' + lnk('teknik', 'telefon-anahtar-imza') + ')</p>');
h.push(pre([
  'kaynak[kid]          = D15.gizliAnahtar(qr_anahtar_kaynagi, kid); etkin kid yeni indirmelerde',
  'gün anahtarı         = HKDF-SHA256(kaynak[kid], bilgi = iu-yoklama/qr-gun/v1 0x00 atamaId(16) gün(4, BE), 32 bayt)',
  'projeksiyon anahtarı = HKDF-SHA256(kaynak[kid], bilgi = iu-yoklama/qr-projeksiyon/v1 0x00 oturumId(16), 32 bayt)',
  'eşleştirme özeti     = HMAC-SHA256(HKDF-SHA256(kaynak[kid], iu-yoklama/eslestirme-kodu/v1, 32 bayt), 6 rakam)',
  'gün                  = floor(Unix ms / 86.400.000)  (UTC; İstanbul 03:00)',
  'telefona: bugün dahil 5 gün; aynı (atama, gün) her zaman aynı 32 bayt; anahtar veritabanında saklanmaz',
].join('\n')));
h.push('<p><strong>Projeksiyona kod verme</strong> (' + lnk('plan', 'asama23-nereden-gosterilir') + ')</p>');
h.push(pre([
  'açık bağlantı yok                 -> ESLESME_BEKLIYOR | KOD_SURESI_DOLDU | KAPANDI (son olay)',
  'ders bitti ya da oturum iptal     -> KAPANDI (yazılmamışsa da okurken hesaplanır)',
  'eşitleme bozuk                    -> SUNUCU_SAATI_BOZUK, kod yok',
  'şimdi < pencere açılışı           -> YOKLAMA_ACILMADI, kod yok',
  'şimdi >= pencere kapanışı         -> YOKLAMA_KAPANDI, kod yok (bağlantı ders bitişine kadar açık)',
  'aksi                              -> BAGLI, kodlar: d0 = floor(şimdi / 5000), d0 .. d0 + 6,',
  '                                     yalnız başlangıcı < pencere kapanışı olanlar',
].join('\n')));
h.push('<p><strong>Gecikme kuralı</strong> (' + lnk('plan', 'asama23-degisme-ve-kabul') + ', ' + lnk('plan', 'asama23-okutma') + ')</p>');
h.push(pre([
  'girdi : öğrenci tahmini an t ve payı p (D04 saatSonucu; QR\'da payı küçük çapa), dilim d,',
  '        hoca düzeltmesi h ve payı q (projeksiyonda 0 ve 0), sınırlar N (QR 10 sn, yedek kod 20 sn), R = 30 sn',
  'g = t - (d x 5000 + h);  P = p + q          (tam sayı ms)',
  '(doğrulama GECERLI değilse gecikme hesaplanmaz)',
  'yuva iptal anı <= dilim başı           -> ANAHTAR_IPTAL',
  'öğrenci saati kurulamadı (D04 durumu dogrulandi değil) -> SAAT_DOGRULANAMADI',
  '   (çapaları ayrışan kaydın İncelemede kararını D07 kendi kuralıyla verir)',
  'hoca kodu, kapsayan gösterim kaydı yok -> BEKLEMEDE',
  'hoca saati yok | çapaları ayrışıyor    -> HOCA_SAATI_YOK | HOCA_CAPALARI_AYRISIYOR',
  'g - P > R                              -> RET',
  'g + P < -tolerans (proj. 1 sn, tel. 0) -> ONCE_OKUTULMUS',
  'projeksiyon kodu bağlantı aralıklarının dışında -> GOSTERIM_DISI',
  'g + P < N                              -> NORMAL   (P = 0 iken: şimdiki ya da önceki kod)',
  'p >= N                                 -> CAPALAR_ESKI (normal imkânsız; D11-A04)',
  'aksi                                   -> INCELEMEDE',
].join('\n')));
h.push(det('Sonucun D07 kataloğuna eşlemesi: kararı D07 verir, kodlar onun listesinde', table(['Bu modülün sonucu', 'sinif', 'gerekce (D07 kataloğu)'], [
  ['dogrulama BICIM_BOZUK, SURUM_BILINMIYOR, MAC_GECERSIZ', 'RET', code('QR_MAC_GECERSIZ')],
  ['dogrulama OTURUM_UYUSMUYOR', 'RET', code('QR_OTURUM_UYUSMUYOR')],
  ['dogrulama ANAHTAR_BULUNAMADI', 'RET', code('QR_HOCA_YETKISIZ')],
  ['dogrulama YEDEK_KOD_ESLESMEDI', 'RET', code('YEDEK_KOD_YANLIS')],
  ['dogrulama YEDEK_KOD_SINIR', 'INCELEMEDE', code('YEDEK_KOD_SINIR')],
  ['dogrulama ANAHTAR_EMEKLI; gecikme ANAHTAR_IPTAL', 'INCELEMEDE', code('QR_ANAHTAR_IPTAL')],
  ['gecikme RET', 'RET', code('QR_GECIKME_ASIMI')],
  ['gecikme INCELEMEDE', 'INCELEMEDE', code('QR_GECIKME_BELIRSIZ')],
  ['gecikme ONCE_OKUTULMUS', 'INCELEMEDE', code('QR_ONCE_OKUTULMUS')],
  ['gecikme GOSTERIM_DISI', 'INCELEMEDE', code('QR_GOSTERIM_DISI')],
  ['gecikme HOCA_SAATI_YOK, HOCA_CAPALARI_AYRISIYOR', 'INCELEMEDE', code('QR_HOCA_SAATI_YOK')],
  ['gecikme CAPALAR_ESKI', 'INCELEMEDE (D11-A04 onaylanırsa ORTAK_SINIR)', code('QR_CAPALARI_ESKI')],
  ['gecikme BEKLEMEDE', 'BEKLEMEDE', code('QR_GOSTERIM_BEKLENIYOR')],
  ['gecikme SAAT_DOGRULANAMADI', 'ORTAK_SINIR', 'yok (D07 Saat doğrulanamadı etiketiyle 2\'lik sınırı uygular)'],
  ['gecikme NORMAL', 'GECERLI', 'yok (QR\'da Doğrulanmış, yedek kodda Yedek kodlu etiketi D07\'nin)'],
  ['kanitTuru YOK', 'YOK', 'yok (QR\'sız kurallar D07\'nin; qrYetenegi ile birlikte)'],
])));
h.push('<p><strong>Hoca saati</strong> (gösterim kaydından; ' + lnk('plan', 'gun-ikinci-capa') + ')</p>');
h.push(pre([
  'başlangıç olayı: ilk çapa belgeden olaya = e1,          ikinci çapa olaydan belgeye = e2 + süre',
  'bitiş olayı    : ilk çapa belgeden olaya = e1 + süre,   ikinci çapa olaydan belgeye = e2',
  'her olay için  : D04 saatSonucu(ilk, ikinci, beklenenÖzne = { personel, hoca }) -> tahmin, pay, durum',
  'durum ayrışıyor -> AYRISIYOR;  doğrulanamadı | ulaşma anını aşıyor | ele geçmiş kid -> YOK',
  'düzeltme hB = tahmin(baş) - etiket tabanı;  hS = tahmin(son) - (etiket tabanı + süre)',
  'h = floor((hB + hS) / 2);  q = max(pay(baş), pay(son)) + ceil(|hB - hS| / 2)',
].join('\n')));
h.push('<p><strong>Yedek kod eşleştirme</strong> (' + lnk('plan', 'asama23-okutma') + ', ' + lnk('plan', 'hile-rastgele-isim') + ')</p>');
h.push(pre([
  'adaylar : dersin sahibinin, kaydın günü ve komşu günü için indirmesi olan atamaları',
  'dilimler: [t - p - 30 sn - 60 sn, t + p + 60 sn]; saat doğrulanamadıysa bütün pencere',
  'sınır   : (öğrenci, oturum) 3, (öğrenci, ders, dönem) 10 yanlıştan sonra eşleştirilmez -> YEDEK_KOD_SINIR',
  'eşleşme : tek ise o; birden çoksa kayda en yakın dilim; yoksa YEDEK_KOD_ESLESMEDI',
  'sonra   : gecikme kuralı N = 20 sn ile, hoca payıyla; projeksiyon (yuva 0) için yedek kod üretilmez',
].join('\n')));
h.push('<p><strong>Yuva ataması</strong></p>');
h.push(pre([
  'kilit   : pg_advisory_xact_lock(hashtextextended(projeksiyon:yuva:<hocaId>, 0)) (D12 danismaKilidi biçimi)',
  'etkin   : giriş oturumunun iptal edilmemiş ataması varsa o',
  'yeni    : rakam = min { r in 1..9 : (hoca, r) için son_gun >= bugün olan atama yok }; yoksa PROJEKSIYON_YUVA_YOK',
  '          (hoca, r) için son_gun < bugün olan etkin atama YUVA_YENIDEN_VERILDI ile bırakılır',
  'indirme : bugün .. bugün + 4 için (atama, gün) yoksa etkin kid ile yazılır; varsa yazılı kid kullanılır',
  'doğrulama: (hoca, rakam, gün) -> tek indirme -> atama ve kid -> gün anahtarı -> doğrulama kodu',
].join('\n')));
h.push('<p><strong>Bluetooth ve konum</strong> (' + lnk('plan', 'asama23-okutma') + ', ' + lnk('plan', 'asama23-gps') + ', ' + lnk('teknik', 'telefon-bluetooth') + ', ' + lnk('teknik', 'telefon-konum') + ')</p>');
h.push(pre([
  'Bluetooth: görülen 64 bit kodlar, dersin hocasının BLUETOOTH gösterim kayıtlarının atamaları ve',
  '           |dilim başı - t| <= 15 sn + p + q olan dilimlerle karşılaştırılır -> GORULDU | GORULMEDI;',
  '           tarama yoksa BLUETOOTH_YOK; hocanın kaydı gelmediyse BEKLENIYOR',
  'Konum    : yarıçaplardan biri > 100 m ya da konum yok -> KONUM_YOK; mesafe <= r1 + r2 + 50 m -> YAKIN; aksi UZAK;',
  '           hocanın referans konumu yoksa KONUM_YOK; gelmediyse BEKLENIYOR',
  'Zayıf    : sahte konum, simülasyon, aksesuar; komşu konumlu kayıtla (mesafe - r1 - r2) / süre > 300 km/sa',
  'Etki     : karara girmez, yalnız saklanır ve ölçülür (D11-A05); Bluetooth yok ve konum yok aleyhe kullanılmaz',
].join('\n')));
h.push(det('Başlangıç değerleri: planın sayıları ayardan, biçimin sayıları sabit', rows([
  ['Sabit (biçim ya da plan)', 'Dilim 5 sn; ön alım en çok 6 dilim (30 sn); QR 41 rakam; doğrulama kodu 64 bit; telefona en çok 5 gün; yuva 0 ile 9.'],
  ['Gecikme sınırları', 'Normal 10 sn (yedek kod 20 sn), ret 30 sn, projeksiyon toleransı 1 sn; başlangıç değeri, denemeyle ayarlanır (plan.html#asama23-degisme-ve-kabul).'],
  ['Eşleştirme', 'Kod 6 rakam ve 5 dk; onay pencere açılışından 15 dk önce başlar; 10 dk\'da 5 yanlış; 10 dk\'da 5.000 yeni tarayıcı tavanı.'],
  ['Yedek kod', 'Arama payı 60 sn; oturumda 3, ders ve dönemde 10 yanlış.'],
  ['Bluetooth ve konum', 'Bluetooth dilimi 15 sn, yayın 180 sn; konum payı 50 m, yarıçap sınırı 100 m, imkânsız hız 300 km/sa.'],
  ['Sorgu aralıkları', 'Eşleşme beklerken 3 sn, bağlıyken 10 sn, kapalıyken 30 sn (cevaptaki sonrakiIstekMs).'],
].map(([k, v]) => [k, tx(v)]))));
h.push('<p><strong>Kürsü sayfasının ve hoca telefonunun uyacağı sunucu sözleşmesi</strong></p>');
h.push(ul([
  'Sayfa saat farkını her cevapta gidiş dönüşün ortasına göre günceller, gidiş dönüşü 2 saniyeyi aşan örneği atar ve kodu sunucu saatine göre şimdiki dilimden seçer; elinde o dilimin kodu yoksa eski QR yerine bağlantı bekleniyor yazar (' + lnk('plan', 'asama23-nereden-gosterilir') + ').',
  'Durum BAGLI değilse elindeki kodları atar; KAPANDI ya da KOD_SURESI_DOLDU görünce yeni eşleştirme kodu ister; bilinmeyen durumda bağlantı bekleniyor yazar.',
  'QR\'ı açık zeminde koyu karelerle, tam ekranda ve Screen Wake Lock ile gösterir (' + lnk('plan', 'hoca') + '); geçiş yoktur (' + lnk('tasarim', 'k-qr') + ').',
  'Hoca telefonu QR\'ı yalnız pencere içinde ve indirilmiş gün anahtarıyla üretir; dilimi saat belgesi ve iç sayaçla hesaplar, her gösterim aralığını kapanınca ya da yeniden başlatmadan sonra gosterim_kaydi olarak kuyruğa koyar; günü geçen anahtarı siler, yeni rakam gelirse eski rakamın anahtarlarını bırakır.',
  'Hoca telefonu eşleştirme QR\'ını IUY:E1: önekinden tanır ve yalnız 6 rakamı seçilen ders oturumuyla gönderir; o an süren ya da 15 dakika içinde başlayacak oturumu önerir.',
  'Öğrenci telefonu yoklama QR\'ındaki kısa kodu yerel oturumla karşılaştırır ve uyuşmazlıkta öğrenciyi uyarır; kayıt yine imzalanıp gönderilirse sunucu OTURUM_UYUSMUYOR verir (D11-B22).',
]));
for (const m of S.state_machines) h.push(det(`Durum makinesi: ${esc(m.name)}`, `<p>Durumlar: ${m.states.map(code).join(', ')}</p>\n` + table(['Kimden', 'Kime', 'Kim', 'Ne zaman'], m.transitions.map(t => [code(t.from), code(t.to), tx(t.by), tx(t.when)]))));
h.push('<p><strong>Değişmezler</strong></p>');
h.push(ul(S.invariants.map(tx)));
h.push('<p><strong>Dış yüz</strong></p>');
h.push(table(['Ad', 'İmza', 'Amaç'], S.exports.map(e => [code(e.name), code(e.signature), tx(e.purpose)])));

// Hata kodları
h.push('<h3>Hata kodları</h3>');
h.push(`<p>${code('hataKodlariTanimla(\'projeksiyon\', ...)')} ile ${code('packages/contracts/src/projeksiyon.ts')} içinde; hoca ve öğrenci metinleri katalogda, kişisel veri ve kod taşımaz. ${esc(p2.ORTAK)}</p>`);
h.push(table(['Kod', 'HTTP ya da öğe sonucu', 'Ne zaman'], [
  ['PROJEKSIYON_TARAYICI_YOK', '401', 'Kürsü uçlarında çerez yok, tanınmıyor ya da tarayıcı kapatılmış.'],
  ['PROJEKSIYON_BAGLI', '409', 'Açık bağlantısı olan tarayıcı yeni eşleştirme kodu istedi.'],
  ['PROJEKSIYON_YENI_TARAYICI_SINIRI', '503, Retry-After 60', 'Son 10 dakikada bağlanmamış 5.000 tarayıcı açılmış; çerezsiz istek yeni tarayıcı açamaz.'],
  ['PROJEKSIYON_KODU_GECERSIZ', '404', 'Eşleştirme kodu yok, süresi dolmuş ya da geçersiz kılınmış; yanlış deneme sayılır.'],
  ['PROJEKSIYON_KODU_KULLANILMIS', '409', 'Kod süresi içinde ikinci kez kullanıldı; bağlantı IKINCI_KULLANIM ile kapatıldı.'],
  ['PROJEKSIYON_DENEME_SINIRI', '429, beklemeSaniye', 'Giriş oturumu 10 dakikalık pencerede 5 yanlışı aştı; pencere sonuna kadar.'],
  ['PROJEKSIYON_BULUNAMADI', '404', 'Ders oturumu ya da bağlantı yok veya hocanın değil (varlık sızmaz).'],
  ['PROJEKSIYON_ZAMAN_DISI', '409', 'Onay pencere açılışından 15 dakika önce ile ders bitişi arası dışında ya da oturum iptal.'],
  ['PROJEKSIYON_YUVA_YOK', '409', 'Dokuz rakamın hepsi son günlerine kadar dolu.'],
  ['PROJEKSIYON_YALNIZ_TELEFON', '403', 'QR anahtarı ya da onay telefon dışı oturumla istendi.'],
  ['PROJEKSIYON_GOSTERIM_BICIMI', 'öğe RET', 'Gövde şemaya ya da dilim tutarlılığına uymuyor.'],
  ['PROJEKSIYON_GOSTERIM_OTURUMU', 'öğe RET', 'Oturum yok ya da gönderen hocanın dersi değil.'],
  ['PROJEKSIYON_GOSTERIM_YUVASI', 'öğe RET', 'O rakam ve gün için hocanın indirmesi yok.'],
  ['PROJEKSIYON_GOSTERIM_CAKISMASI', 'öğe RET', 'Aynı kimlik başka içerikle geldi; saklanan satır değişmez.'],
  ['PROJEKSIYON_GOSTERIM_HESABI', 'öğe TEKRAR_DENE', 'Öğedeki hoca gönderen oturumun kişisi değil; telefon o hesap yeniden girince gönderir.'],
  ['PROJEKSIYON_KAPALI', 'öğe TEKRAR_DENE', 'Aşama 2 bayrağı kapalı.'],
].map(([a, b, c]) => [code(a), esc(b), esc(c)])));

// Testler
h.push('<h3>Testler</h3>');
h.push(`<p>Davranış senaryoları ${code('apps/server/test/features/projeksiyon/')} altında Türkçe Gherkin, gerçek PostgreSQL ve Fastify inject ile; özellik testleri ${code('packages/core/src/projeksiyon/*.test.ts')} içinde Vitest ve açık deneme sayılı fast-check (${lnk('teknik', 'kod')}). Her yokluk iddiasının bir olumlu kontrolü, her kuralın bir yer kontrolü vardır; sınır testleri mutasyonla kırmızıya döndürülerek doğrulanır.</p>`);
const kinds = ['behavior', 'property', 'contract', 'load', 'mutation'];
const KIND_TR = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
h.push(det(`${S.tests.length} test: ${kinds.map(k => `${S.tests.filter(t => t.kind === k).length} ${KIND_TR[k]}`).join(', ')}`, table(['Test', 'Tür', 'Neyi gösterir'], S.tests.map(t => [esc(t.name), esc(KIND_TR[t.kind]), tx(t.asserts)]))));

// Netleştirilenler
h.push('<h3>Netleştirilenler</h3>');
h.push(`<p>Envanterin ${inv.gaps.length} boşluğundan ${S.resolved_gaps.length} tanesi burada karara bağlandı; kalanlar ürün kararı ya da sözleşme eklemesi olarak Açık noktalarda. Komşu modüllerin yayımlanmış tasarımlarıyla hizalandı: çerez adı ve hız sınıfları D13, hoca saat belgesi öznesi ve çapa işlevleri D04, gerekçe kataloğu D07, gece çizelgesi D14, olay dinleyicisi önerisi D01.</p>`);
h.push(det(`Boşluklar: ${S.resolved_gaps.length} karar ve gerekçesi`, table(['Boşluk', 'Karar', 'Neden'], S.resolved_gaps.map(g => [code(g.gap), tx(g.decision), tx(g.why)]))));
h.push(det(`Çelişkiler: ${S.contradictions_resolved.length} çözüm`, table(['Çelişki', 'Çözüm'], S.contradictions_resolved.map(c => [code(c.id), tx(c.resolution)]))));

// Açık noktalar
h.push('<h3>Açık noktalar</h3>');
h.push(`<div class="callout warn">\n<p>${S.open_points.filter(o => o.needs_owner).length} nokta sahibin ürün kararını, ${S.open_points.filter(o => !o.needs_owner).length} nokta sözleşmeye ekleme ister. Hepsinde bu modül iki seçimde de çalışacak biçimde tasarlandı; karar yalnız eşleme ya da kayıt satırını değiştirir.</p>\n</div>`);
h.push(ul(S.open_points.map(o => `<span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahibin kararı' : 'sözleşme eklemesi'}</span> ${code(o.id)} ${tx(o.question)}<br>Öneri: ${tx(o.recommendation)}`)));
h.push('</section>');

const html = h.join('\n') + '\n';
if (/[\u2013\u2014]/.test(html)) { console.log('fragment has U+2013 or U+2014'); process.exit(1); }
fs.mkdirSync(path.join(OUT, 'frag'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'frag', 'D11.html'), html, 'utf8');
console.log(`built: ${S.tables.length} tables, ${S.endpoints.length} endpoints, ${S.jobs.length} jobs, ${S.files.length} files, ${S.tests.length} tests, ${S.resolved_gaps.length} resolved, ${S.open_points.length} open; json ${fs.statSync(path.join(OUT, 'spec', 'D11.json')).size} B, html ${html.length} chars`);
