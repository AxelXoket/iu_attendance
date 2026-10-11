// Builds spec/D11.json and frag/D11.html from icerik-1..3.js, with deterministic checks.
// Usage: node build.js   (then: node ../spec-validate.js D11). D11_OUT=<dir> writes elsewhere.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const OUT = process.env.D11_OUT || B;
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const O = require('./ortak.js');
const p1 = require('./icerik-1.js'), p2 = require('./icerik-2.js'), p3 = require('./icerik-3.js');
const contracts = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const mod = contracts.modules.find(m => m.id === 'D11');
const inv = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D11.json'), 'utf8'));
const komsu = id => fs.readFileSync(path.join(B, 'spec', id + '.json'), 'utf8');

const sahip = p3.open_points.filter(o => o.needs_owner).length, sozlesme = p3.open_points.length - sahip;
const SAYI = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
const summary = p1.summary.replace(/Ürün kararı isteyen \S+ nokta ile \S+ sözleşme eklemesi/, `Ürün kararı isteyen ${SAYI[sahip]} nokta ile ${SAYI[sozlesme]} sözleşme eklemesi`);

const S = {
  id: 'D11', module: mod.name, summary,
  tables: p1.tables, endpoints: p2.endpoints, jobs: p2.jobs, state_machines: p2.state_machines,
  invariants: p2.invariants, exports: p2.exports, error_codes: p2.error_codes, audit_events: p2.audit_events,
  files: p2.files, tests: p3.tests,
  resolved_gaps: p3.resolved_gaps, contradictions_resolved: p3.contradictions_resolved, open_points: p3.open_points,
};

// ---------- deterministic checks ----------
const errs = [];
const all = JSON.stringify(S);
if (/[\u2013\u2014]/.test(all)) errs.push('U+2013 or U+2014 present');
if (/KVKK/i.test(all)) errs.push('KVKK mentioned');
// stale text from the previous design must be gone
for (const [re, why] of [[/atamaId/, 'atamaId derivation'], [/\{1,16\}/, 'kid pattern 1..16'], [/sonuc-eslemesi/, 'sonuc-eslemesi file'], [/PROJEKSIYON_GOSTERIM_HESABI|PROJEKSIYON_GOSTERIM_YUVASI/, 'removed error code'], [/D11-A09/, 'closed open point D11-A09'], [/öğe başına SAVEPOINT'te/, 'per-item savepoint claim'], [/anahtar_kid/, 'bağlantı kid column'], [/QrGerekce|gerekce: Qr/, 'gerekce in QrSonucu'], [/qr-gun\/v1/, 'old day-key label']])
  if (re.test(all)) errs.push('stale text: ' + why);
if (!/qr-gun\/v2/.test(all)) errs.push('day key v2 label missing');
// constraint and index names: exactly kisitAdi output (built in icerik-1), prefix, suffix, <= 63 bytes, unique
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
    if (c.name === 'id' && c.default !== 'uuidv7()' && !/@istemci-kimligi/.test(c.note)) errs.push(`id default not uuidv7() and not @istemci-kimligi: ${t.name}`);
  }
  // every column named in a constraint or index definition exists
  const cols = new Set(t.columns.map(c => c.name));
  for (const line of [...t.indexes, ...t.constraints]) {
    const def = line.slice(line.indexOf(':') + 1).split(';')[0];
    for (const w of def.replace(/'[^']*'/g, '').replace(/REFERENCES \w+ \([^)]*\)/g, '').match(/\b[a-z][a-z0-9_]*\b/g) || [])
      if (/_/.test(w) && !cols.has(w) && !['uuid_extract_version', 'octet_length', 'jsonb_typeof', 'jsonb_array_length', 'yoklama_kayitlari', 'projeksiyon_tarayicilari', 'projeksiyon_baglantilari', 'qr_anahtar_yuvalari', 'gosterim_kayitlari'].includes(w)) errs.push(`unknown column ${w} in ${t.name}: ${line.slice(0, 60)}`);
  }
}
// kid pattern equals D15's, value lists equal D04 and D06
if (!komsu('D15').includes('^[a-z0-9-]{1,8}$')) errs.push('D15 kid pattern changed');
for (const t of S.tables) for (const k of t.constraints) if (/kid ~/.test(k) && !k.includes("'^[a-z0-9-]{1,8}$'")) errs.push('kid check differs from D15: ' + k);
const d04 = komsu('D04'), d06 = komsu('D06');
if (!d04.includes('IlkCapaDurumu: ' + O.D04_ILK_CAPA_DURUMU.join(', '))) errs.push('D04 IlkCapaDurumu list differs');
if (!d04.includes('IkinciCapaDurumu: ' + O.D04_IKINCI_CAPA_DURUMU.join(', '))) errs.push('D04 IkinciCapaDurumu list differs');
if (!d04.includes("telefonBildirimi: " + O.D04_ILK_CAPA_BILDIRIMI.map(v => `'${v}'`).join(' | '))) errs.push('D04 telefonBildirimi list differs');
if (!d06.includes("yokNedeni: " + O.D06_IKINCI_CAPA_YOK.map(v => `'${v}'`).join(' | '))) errs.push('D06 IkinciCapaBaglami yokNedeni list differs');
if (!/isleToplu\(tx: Islem, ogeler: readonly GelenOge<T>\[\], baglam: PaketBaglami\)/.test(d06) || !/ilkCapaVar: boolean/.test(d06)) errs.push('D06 OgeIsleyici signature changed');
{ const f6 = fs.readFileSync(path.join(B, 'frag', 'D06.html'), 'utf8');
  if (!/ilkCapa: IlkCapaAlanlari \| null; ulasmaAni: Date; ikinciCapa: IkinciCapaBaglami;/.test(f6)) errs.push('D06 GelenOge shape changed');
  if (!/oturum: \{ girisOturumuId: GirisOturumuId;/.test(f6)) errs.push('D06 PaketBaglami.oturum shape changed'); }
if (!/kimlikDinleyicileriniKur\(aboneler: \{ projeksiyon: KimlikDinleyicisi;/.test(komsu('D01'))) errs.push('D01 kimlikDinleyicileriniKur changed');
if (!/işlem başına tek çağrı/.test(komsu('D12'))) errs.push('D12 single-call lock rule changed');
// D12 kisitAdi and danismaKilidi still as assumed
if (!/kisitAdi\(tablo: string, sutunlar: readonly string\[\], tur:/.test(komsu('D12'))) errs.push('D12 kisitAdi signature changed');
// the kürsü state machine is complete and every state reachable
{ const m = S.state_machines.find(x => /Kürsü/.test(x.name)); const reach = new Set(O.kursuGirdileri().map(O.kursuDurumu));
  for (const s of m.states) if (!reach.has(s)) errs.push('kürsü state unreachable: ' + s);
  for (const s of m.states) if (!m.transitions.some(t => t.from === s) || !m.transitions.some(t => t.to === s)) errs.push('kürsü state without in or out transition: ' + s);
  if (JSON.stringify(m.states.slice().sort()) !== JSON.stringify(O.KURSU_DURUMLARI.slice().sort())) errs.push('kürsü states differ from function'); }
// every error code is exercised by at least one test scenario, and every endpoint error appears in the catalog
for (const e of S.error_codes) if (!S.tests.some(t => t.asserts.includes(e.kod))) errs.push('error code not in any test: ' + e.kod);
for (const ep of S.endpoints) for (const x of ep.errors) { const k = x.split(' ')[0]; if (/^PROJEKSIYON_/.test(k) && !S.error_codes.some(e => e.kod === k)) errs.push('endpoint error not in catalog: ' + k); }
for (const m of all.matchAll(/\bPROJEKSIYON_[A-Z_]+\b/g)) if (!S.error_codes.some(e => e.kod === m[0]) && !['PROJEKSIYON_BAGLANTI_KAPAT', 'PROJEKSIYON_ESLESTIRME_TEMIZLE'].includes(m[0])) errs.push('unknown error code mentioned: ' + m[0]);
// dictionary values appear in the type and in the CHECKs
for (const v of [...O.DOGRULAMA, ...O.GECIKME]) if (!S.exports.find(e => e.name === 'qrSonucu').signature.includes(`'${v}'`)) errs.push('qrSonucu type misses ' + v);
// owned items exactly
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:]/g, '');
const ep = s => String(s).replace(/\{[^}]+\}|:[a-z_]+/gi, '{x}').replace(/\/+$/, '').toLowerCase();
const eqSet = (a, b, what) => { const A = new Set(a), Bs = new Set(b); for (const x of A) if (!Bs.has(x)) errs.push(`${what} extra: ${x}`); for (const x of Bs) if (!A.has(x)) errs.push(`${what} missing: ${x}`); };
eqSet(S.tables.map(t => norm(t.name)), mod.owns_tables.map(norm), 'table');
eqSet(S.endpoints.map(e => ep(e.method + ' ' + e.path)), mod.owns_endpoints.map(ep), 'endpoint');
eqSet(S.jobs.map(j => norm(j.name)), mod.owns_jobs.map(norm), 'job');
// contract exports present; an extra one must say it is an addition
for (const e of mod.exports) { const n = e.split('(')[0]; if (!S.exports.some(x => x.name === n)) errs.push('contract export missing: ' + n); }
for (const x of S.exports) if (!mod.exports.some(e => e.split('(')[0] === x.name) && !/D11-A08|\(ek/.test(x.name + x.purpose)) errs.push('unexplained extra export: ' + x.name);
// every inventory gap and contradiction is answered
const answered = new Map();
for (const g of S.resolved_gaps) answered.set(g.gap, (answered.get(g.gap) || 0) + 1);
for (const o of S.open_points) for (const m of (o.question.match(/D11-B\d\d/g) || [])) answered.set(m, (answered.get(m) || 0) + 1);
for (const g of inv.gaps) if (!answered.get(g.id)) errs.push('gap not answered: ' + g.id);
for (const [k] of answered) if (!inv.gaps.some(g => g.id === k)) errs.push('answer for unknown gap: ' + k);
for (const c of inv.contradictions) if (!S.contradictions_resolved.some(r => r.id === c.id)) errs.push('contradiction not answered: ' + c.id);
// every D11-Axx referenced exists
const ids = new Set(S.open_points.map(o => o.id));
for (const m of all.matchAll(/D11-A\d\d/g)) if (!ids.has(m[0])) errs.push('reference to missing open point ' + m[0]);
if (new Set(S.open_points.map(o => o.id)).size !== S.open_points.length) errs.push('duplicate open point id');
// files inside globs
const globs = contracts.file_ownership.filter(g => g.owner === 'D11').map(g => g.glob.replace(/\*+$/, ''));
for (const f of S.files) if (!globs.some(g => f.startsWith(g))) errs.push('file outside globs: ' + f);
if (new Set(S.files).size !== S.files.length) errs.push('duplicate file');
for (const t of S.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('bad test kind: ' + t.name);
if (new Set(S.tests.map(t => t.name)).size !== S.tests.length) errs.push('duplicate test name');
// anchors referenced in text must exist
const anchors = {};
for (const doc of ['plan', 'teknik', 'tasarim']) anchors[doc] = new Set([...fs.readFileSync(REPO + doc + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const m of all.matchAll(/(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g)) if (!anchors[m[1]].has(m[2])) errs.push(`unknown anchor ${m[1]}.html#${m[2]}`);
if (errs.length) { console.log('CHECK ERRORS (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }

fs.mkdirSync(path.join(OUT, 'spec'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'spec', 'D11.json'), JSON.stringify(S, null, 1) + '\n', 'utf8');

// ---------- fragment ----------
const LABEL = {
  'plan:tek-bakista': 'Tek bakışta', 'plan:kararlar-roller': 'Roller ve hoca oturumu', 'plan:kararlar-kayit-ve-makbuz': 'Kayıt ve makbuz',
  'plan:kararlar-supheli-kayit': 'Şüpheli kayıt', 'plan:kararlar-olcum': 'Ölçüm', 'plan:kararlar-inceleme-hesaplari': 'İnceleme hesapları',
  'plan:gun-ikinci-capa': 'İkinci çapa', 'plan:gun-zayif-nokta': 'Zayıf nokta', 'plan:gun-kayit-etiketleri': 'Kayıt etiketleri', 'plan:gun-kenar-durumlar': 'Kenar durumlar',
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
  'POST /v1/projeksiyon/eslestirme-kodu': 'girişsiz ya da projeksiyon çerezi; Origin panel adresi zorunlu',
  'GET /v1/projeksiyon/kodlar': 'projeksiyon çerezi',
  'DELETE /v1/projeksiyon/tarayici': 'projeksiyon çerezi; Origin',
  'POST /v1/projeksiyon/onay': 'hoca, yalnız telefon',
  'GET /v1/projeksiyon/baglantilar': 'hoca (telefon ya da panel)',
  'DELETE /v1/projeksiyon/baglantilar/{id}': 'onaylayan hoca',
  'POST /v1/projeksiyon/qr-anahtarlari': 'hoca, yalnız telefon',
};
const OZET = {
  projeksiyon_tarayicilari: 'kürsü tarayıcısı; çerezdeki gizli değerin yalnız özeti, onaydan sonra bir kez yenilenir',
  projeksiyon_eslestirme_kodlari: '6 rakamlık, 5 dakikalık, tek kullanımlık kod; yalnız HMAC özeti',
  projeksiyon_baglantilari: 'kürsü ile ders oturumu bağı; oturumda ve tarayıcıda tek açık bağlantı',
  eslestirme_yanlis_denemeleri: 'giriş oturumu başına 10 dakikalık kesin yanlış deneme sayacı',
  qr_anahtar_yuvalari: 'QR\'daki 1 rakamlık anahtar alanının telefon giriş oturumlarına atanması',
  qr_anahtar_indirmeleri: 'hangi (hoca, rakam, gün) anahtarının hangi kid ile indirildiği; doğrulama ona muhtaç değil',
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
  ['Sahip olduğu', `8 tablo, 7 uç, 2 iş, ${code('gosterim_kaydi')} kuyruk öğesi, ${code('packages/core/src/projeksiyon')} ortak kuralları ve ${code('packages/contracts/src/projeksiyon.ts')} (sonuç sözlüğü, gövde şemaları, hata kodları, denetim olay türleri, ayar şeması).`],
  ['Yazmadığı', 'Karar, sınıf ve gerekçe eşlemesi, etiket ve 2\'lik ortak sınır (D07); kayıt satırı (D05); pencere ve saat payı (D04); oturum kısa kodu, QR\'lı ders ayarı ve sahiplik geçmişi (D02); telefon modeli (D01); denetim kaydı (D09, denetimeYaz ile).'],
  ['Okuduğu dış yüzler', 'D01 kök kanca kimliği (oturumDogrula üzerinden), kisiGetir (incelemeHesabi), KimlikDinleyicisi ve KimlikOlayi tipleri; D02 oturumGetir (kısa kod, değişiklik geçmişi), dersGetir (sahip ve önceki sahipler; sahiplik geçmişi D11-A14), dersYetkisi, kilitliBirimDonemleri; D04 simdi, pencereGetir, esitlemeSaglikliMi, saatBelgesiDogrula ve core saatSonucu; D06 ogeTuruKaydet ve esitleme.ts tipleri (GelenOge, PaketBaglami, OgeSonucu); D09 denetimeYaz; D12 islem, kisitAdi, danismaKilidi (işlem başına tek çağrı; paylaşımlı kip ve geriYuklemePencereleri D11-A11), saklamaIsleyicisiKaydet; D13 rotalariKaydet, uygulamaHatasi, hizSinifi; D14 isGonder, isTanimla; D15 ayarlar, gizliAnahtar, gizliAnahtarSeti, log. D05 ve D07 okunmaz.'],
  ['Çağıranlar', 'D05 qrKanitiniAyristir (gönderim ve makbuz okutması, aynı işlem); D07 qrSonucu, gosterimAraliklari ve gosterimKaydiDinleyicisiKaydet (D11-A08); D06 gosterimKaydiOgesi (kayıtla); D15 olcum_ görünümleri tabloları yalnız okur.'],
  ['Kayıtları', 'D06 ogeTuruKaydet(gosterim_kaydi, isleToplu); D04 oturumKapandiDinleyicisiKaydet(projeksiyon_baglanti_kapat); D12 saklamaIsleyicisiKaydet(projeksiyon.donem_verisi); D13 rota listesi; D14 iş tanımları (jobs/projeksiyon isler); D01 kimlikDinleyicileriniKur aboneliği: bileşim kökleri projeksiyonKimlikDinleyicisi\'ni verir (D11-A07).'],
  ['Göç', `${code('apps/server/migrations/<UTC zaman>_projeksiyon_<açıklama>/')}: D12'nin tek Drizzle klasörü; göç yalnız bu modülün sekiz tablosuna dokunur, ${code('tablolar.ts')} tanımından üretilir; kısıt ve dizin adları ${code('kisitAdi(tablo, bütün sütunlar, tür)')} çıktısıdır.`],
  ['Ölçülen sonuç', `Yoklama hızı ve QR okuma hedefleri (${lnk('plan', 'hedefler')}), çapası eski QR oranı (planın ilk QR denemesinde ölçülecek oranı), QR ile doğrulanmış kayıtlarda Bluetooth kodunu görmeyenlerin telefon modeline göre oranı (projeksiyonlu dersler dahil, bekleyen Bluetooth satırları gösterim kaydı gelince tamamlandığı için), işaretlenmeden kabul payına QR kayıtlarının katkısı, ele geçmiş kid\'le gelen ve indirme kaydı olmadan doğrulanan kayıt sayısı. Hesap D15'in olcum_ görünümlerinde, dilimler ve sonuçlar bu modülün tablolarından; log olayları yalnız iç kimlik taşır.`],
  ['Dayanak', [lnk('plan', 'asama23-nereden-gosterilir'), lnk('plan', 'asama23-degisme-ve-kabul'), lnk('plan', 'asama23-okutma'), lnk('plan', 'asama23-gps'), lnk('plan', 'hile'), lnk('plan', 'hoca'), lnk('plan', 'hedefler'), lnk('plan', 'gun-kenar-durumlar'), lnk('plan', 'kararlar-supheli-kayit'), lnk('teknik', 'telefon-kamera-qr'), lnk('teknik', 'telefon-anahtar-imza'), lnk('teknik', 'telefon-bluetooth'), lnk('teknik', 'telefon-konum'), lnk('teknik', 'sunucu-ayarlar'), lnk('tasarim', 'durumlar'), lnk('tasarim', 'scr-qr')].join(', ')],
]));

h.push('<p><strong>Akış</strong></p>');
h.push(`<ol>
<li>Kürsü sayfası açılır, ${code('POST /v1/projeksiyon/eslestirme-kodu')} ile çerezini ve 6 rakamlık kodu alır, kodu QR'ıyla gösterir.</li>
<li>Hoca kodu telefonuyla okutur, ders oturumunu seçer; ${code('POST /v1/projeksiyon/onay')} bağlantıyı açar (aynı derste eski bağlantı kapanır).</li>
<li>Sayfa bağlantıyı ilk gördüğünde gizli değerini bir kez yeniler; sonra ${code('GET /v1/projeksiyon/kodlar')} ile pencere açıkken 30 saniyelik dönen kodları alır ve sunucu saatine göre gösterir.</li>
<li>İnternetsiz derste hoca QR'ı telefonundan, ${code('POST /v1/projeksiyon/qr-anahtarlari')} ile önceden indirdiği gün anahtarıyla gösterir; gösterim aralığı ${code('gosterim_kaydi')} olarak kuyruğa girer.</li>
<li>Öğrencinin kaydı ortak kuyruktan gelir; D05 ${code('qrKanitiniAyristir')} ile kanıtı değerlendirtir, D07 karar verir, D05 kaydı ekleyip ${code('kaydet()')} çağırır.</li>
<li>Hoca telefonu koduyla gelen kayıt gösterim kaydını bekler; kayıt gelince oturumun gösterim anahtarı tutulurken yeniden hesaplanır ve D07 dinleyicisi kararı aynı işlemde yeniler.</li>
<li>Ders bitince bağlantı kapanır; gece eşleştirme verisi silinir ve bekleyen kalmış satır varsa güvenlik ağı tamamlar.</li>
</ol>`);

// Tablolar
h.push('<h3>Tablolar</h3>');
h.push(`<p>Sekiz tablo, hepsi uygulama şemasında ve D12'nin ortak sütun kurallarıyla (sunucunun kimlikleri uuidv7(), telefonun ürettiği kimlik ${code('@istemci-kimligi')} yorumlu; anlar timestamptz, durumlar metin ve CHECK). Kısıt ve dizin adları ${code('kisitAdi(tablo, bütün sütunlar, tür)')} çıktısıdır, 63 baytı aşan ad özetle kısalır; değerler büyük harfli kod değerleridir ve sözleşme dosyasındaki listelerden, D04 ve D06 değerleri ASCII büyük harfe çevrilerek üretilir. Dizini olmayan yabancı anahtar sütunu ${code('@dizinsiz-kabul')} yorumu ve gerekçesi taşır. Başka modülün tablosuna yalnız yabancı anahtarla başvurulur.</p>`);
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
  '/v1/projeksiyon/eslestirme-kodu': 'Tarayıcıyı ve 6 rakamlık kodu üretir; gizliYenile ile çerezi yeniler',
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
for (const j of S.jobs) h.push(det(`${code(j.name)}: ${esc(j.name === 'projeksiyon_baglanti_kapat' ? 'ders bitişinde bağlantıyı kapatır' : 'her gece eşleştirme verisini siler, bekleyen kanıtları tamamlar')}`, rows([['Zaman', tx(j.schedule)], ['Ne yapar', tx(j.does)], ['Tekrar', tx(j.idempotency)]])));

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
  'QR\'da kid yok: sunucu setteki her kid\'i dener',
  'Eşleştirme QR\'ı: IUY:E1:<6 rakam> (alfasayısal kip, sürüm 1); makbuz zarfı IUY1. ile başlar, çakışmaz',
].join('\n')));
h.push('<p><strong>Anahtarlar</strong> (' + lnk('teknik', 'sunucu-ayarlar') + ', ' + lnk('teknik', 'telefon-anahtar-imza') + ', ' + lnk('plan', 'gun-kenar-durumlar') + ')</p>');
h.push(pre([
  'kaynak[kid]          = D15.gizliAnahtarSeti(qr_anahtar_kaynagi): ETKIN, YALNIZ_DOGRULAMA, ELE_GECIRILDI (en çok 4)',
  'gün anahtarı         = HKDF-SHA256(kaynak[kid], bilgi = iu-yoklama/qr-gun/v2 0x00 hocaId(16) yuva(1) gün(4, BE), 32 bayt)',
  'projeksiyon anahtarı = HKDF-SHA256(kaynak[kid], bilgi = iu-yoklama/qr-projeksiyon/v1 0x00 oturumId(16), 32 bayt)',
  'eşleştirme özeti     = HMAC-SHA256(HKDF-SHA256(kaynak[kid], iu-yoklama/eslestirme-kodu/v1, 32 bayt), 6 rakam)',
  'gün                  = floor(Unix ms / 86.400.000)  (UTC; İstanbul 03:00)',
  'türetme sunucu satırı kullanmaz: yedekten dönüşte kaybolan yuva ve indirme satırı anahtarı değiştirmez',
  'yeni indirme ve projeksiyon kodu etkin kid\'le; aynı gün yeniden indirme satırdaki kid\'le (o kid ELE_GECIRILDI',
  '  ya da silinmişse etkin kid\'le, satır güncellenir); ELE_GECIRILDI kid\'le hiçbir şey türetilmez',
  'telefona: bugün dahil 5 gün; anahtar veritabanında saklanmaz',
].join('\n')));
h.push('<p><strong>Doğrulama</strong> (sonuç ' + code('yoklama_kanitlari.dogrulama') + ')</p>');
h.push(pre([
  '41 rakam değil                         -> BICIM_BOZUK;  sürüm 1 değil -> SURUM_BILINMIYOR',
  'kısa kod kaydın oturumunun değil       -> OTURUM_UYUSMUYOR',
  'yuva 0  : her kid k için projeksiyon anahtarı(k, oturumId) ile MAC',
  'yuva 1-9: adaylar A = dersin sahibi + sahiplik süresi dilim başını kapsayan önceki sahipler (D11-B22);',
  '          her (a, k) için gün anahtarı(k, a, rakam, gün(dilim)) ile MAC',
  'tutan k ELE_GECIRILDI                  -> ANAHTAR_ELE_GECIRILDI (İncelemede, sayılır)',
  'tutan var, yuva 0                      -> GECERLI',
  'tutan var, (a, rakam, gün) indirmesi var -> GECERLI (iptal denetimi gecikmede)',
  'tutan var, indirme yok, gün kayıp pencerede -> GECERLI (yuva_id boş)',
  'tutan var, indirme yok, pencere dışında    -> INDIRME_KAYDI_YOK (İncelemede, işletim uyarısı; D11-A16)',
  'tutan yok, indirmenin kid\'i setten silinmiş -> ANAHTAR_EMEKLI (İncelemede)',
  'tutan yok, yuva 0 ya da adayın (rakam, gün) indirmesi var -> MAC_GECERSIZ',
  'tutan yok, indirme yok                 -> ANAHTAR_BULUNAMADI',
  'kayıp pencere günleri: [gün(hedefAni), gün(kayipPencereSonu) + 4], D12.geriYuklemePencereleri\'nden (D11-A11)',
].join('\n')));
h.push('<p><strong>Projeksiyona kod verme</strong> (' + lnk('plan', 'asama23-nereden-gosterilir') + '; ' + code('kursuDurumu') + ' saf işlevi, öncelik sırasıyla)</p>');
h.push(pre([
  'açık bağlantı yok                 -> ESLESME_BEKLIYOR | KOD_SURESI_DOLDU | KAPANDI (son olay)',
  'ders bitti ya da oturum iptal     -> KAPANDI (yazılmamışsa da okurken hesaplanır)',
  'eşitleme bozuk                    -> SUNUCU_SAATI_BOZUK, kod yok',
  'şimdi < pencere açılışı           -> YOKLAMA_ACILMADI, kod yok',
  'şimdi >= pencere kapanışı         -> YOKLAMA_KAPANDI, kod yok (bağlantı ders bitişine kadar açık)',
  'aksi                              -> BAGLI, kodlar: d0 = floor(şimdi / 5000), d0 .. d0 + 6,',
  '                                     yalnız başlangıcı < pencere kapanışı olanlar, etkin kid\'le',
  'bağlantı son dilimi               = min(dilim(bitis_ani) + 6, dilim(son pencere kapanışı - 1 ms))',
].join('\n')));
h.push('<p><strong>Gecikme kuralı</strong> (' + lnk('plan', 'asama23-degisme-ve-kabul') + ', ' + lnk('plan', 'asama23-okutma') + ')</p>');
h.push(pre([
  'girdi : öğrenci tahmini an t ve payı p (D04 saatSonucu; QR\'da payı küçük çapa), dilim d,',
  '        hoca düzeltmesi h ve payı q (projeksiyonda 0 ve 0), sınırlar N (QR 10 sn, yedek kod 20 sn), R = 30 sn',
  'g = t - (d x 5000 + h);  P = p + q          (tam sayı ms)',
  '(doğrulama GECERLI değilse gecikme hesaplanmaz)',
  'yuva iptal anı <= dilim başı ya da önceki sahip eşleşmesi, sahiplik geçmişi yok -> ANAHTAR_IPTAL',
  'öğrenci saati kurulamadı (D04 saatSonucu.durum DOGRULANDI değil) -> SAAT_DOGRULANAMADI',
  'hoca kodu, kapsayan gösterim kaydı yok -> BEKLEMEDE',
  'hoca saati yok | çapaları ayrışıyor    -> HOCA_SAATI_YOK | HOCA_CAPALARI_AYRISIYOR',
  'g - P > R                              -> RET',
  'g + P < -tolerans (proj. 1 sn, tel. 0) -> ONCE_OKUTULMUS',
  'projeksiyon kodu bağlantı aralıklarının dışında (kayıp pencere hariç) -> GOSTERIM_DISI',
  'g + P < N                              -> NORMAL   (P = 0 iken: -tolerans <= g < N)',
  'p >= N                                 -> CAPALAR_ESKI (normal imkânsız; D11-A04)',
  'aksi                                   -> INCELEMEDE',
  'kapsama: QR kodu QR aralığıyla; yedek kod YEDEK_KOD ya da QR aralığıyla (yedek kod QR ekranından açılır,',
  '         tasarim.html#scr-qr); Bluetooth kodu BLUETOOTH aralığıyla; hepsinde aralığın hocası tutan aday',
].join('\n')));
h.push(det('D07\'ye önerilen eşleme: sahibi D07 (karar.ts, D07-A02, D11-A15), bu modül yalnız sol sütunu verir', table(['Bu modülün sonucu', 'önerilen sınıf', 'önerilen gerekçe (D07 kataloğu)'], [
  ['dogrulama BICIM_BOZUK, SURUM_BILINMIYOR, MAC_GECERSIZ', 'RET', code('QR_MAC_GECERSIZ')],
  ['dogrulama OTURUM_UYUSMUYOR', 'RET', code('QR_OTURUM_UYUSMUYOR')],
  ['dogrulama ANAHTAR_BULUNAMADI', 'RET', code('QR_HOCA_YETKISIZ')],
  ['dogrulama YEDEK_KOD_ESLESMEDI', 'RET', code('YEDEK_KOD_YANLIS')],
  ['dogrulama YEDEK_KOD_SINIR', 'INCELEMEDE', code('YEDEK_KOD_SINIR')],
  ['dogrulama ANAHTAR_EMEKLI; gecikme ANAHTAR_IPTAL', 'INCELEMEDE', code('QR_ANAHTAR_IPTAL')],
  ['dogrulama ANAHTAR_ELE_GECIRILDI', 'INCELEMEDE', code('QR_ANAHTAR_ELE_GECIRILDI') + ' (yeni; olmazsa ' + code('QR_ANAHTAR_IPTAL') + ')'],
  ['dogrulama INDIRME_KAYDI_YOK', 'INCELEMEDE (D11-A16)', code('QR_ANAHTAR_IPTAL')],
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
h.push('<p><strong>Kilit düzeni</strong> (' + lnk('plan', 'kararlar-supheli-kayit') + ': kararlar ilgili olayın işleminde verilir)</p>');
h.push(pre([
  'kural (D12) : her işlem bütün danışma anahtarlarını tek danismaKilidi çağrısında, ilk yazımdan önce alır;',
  '              anahtarlar sıralandığı için danışma kilitleri arasında döngü oluşmaz',
  'öğrenci yolu: D05 parçanın tek çağrısına (oturum, öğrenci) anahtarlarıyla birlikte qrKilitAnahtarlari çıktısını katar',
  '              projeksiyon:gosterim:<oturumId>  kayıt gösterim bekleyebiliyorsa (QR yuva 1-9 ya da yedek kod)',
  '              projeksiyon:ogrenci:<ogrenciId>  yedek kod ya da konum varsa (sayım ve komşu işareti)',
  '              qrKanitiniAyristir kilit almaz; gösterim kayıtlarını anahtar tutulurken okur',
  'hoca yolu   : gosterimKaydiOgesi grubun tek çağrısını yapar (D06 toplama kancası gelince ona verir, D11-A17)',
  '              projeksiyon:gosterim:<oturumId> her öğenin oturumu için',
  '              + dinleyicilerin anahtarlar çıktısı (D07: kararı gösterim bekleyen kayıtların D05 çift anahtarları, D11-A08)',
  '              sonra kanıt satırları FOR UPDATE SKIP LOCKED; dinleyicinin calistir aşaması kilit almaz;',
  '              hoca işlemi anahtarlarını aldıktan sonra hiçbir kilidi beklemez; atlanan satır',
  '              yeniden_hesap_bekliyor olur, öğrencinin sonraki kaydı ya da 02:35 güvenlik ağı tamamlar (D11-A13)',
  'gece ağı    : oturum başına işlem, hoca yoluyla aynı anahtarlar',
  'onay        : kod satırı kilitsiz bulunur; projeksiyon:onay:<oturumId> ve projeksiyon:tarayici:<tarayiciId>;',
  '              sonra kod satırı FOR UPDATE (danışma anahtarları her uçta satır kilidinden önce)',
  'kod üretimi : projeksiyon:eslestirme-uretimi (bilinen tarayıcıda projeksiyon:tarayici:<tarayiciId> da)',
  'yuva        : projeksiyon:yuva:<hocaId>',
  'kimlik olayı: D01\'in işleminde çalışır, danışma kilidi almaz, yalnız atama satırını günceller',
  'kip         : D12 bugün yalnız özel kip verir; hoca telefonu dersinde aynı oturumun gösterim bekleyebilecek',
  '              öğrenci kayıtları anahtarda sıraya girer (yük testinde ölçülür); paylaşımlı kip gelirse',
  '              öğrenci yolu onu kullanır (D11-A11)',
].join('\n')));
h.push('<p><strong>Hoca saati</strong> (gösterim kaydından; ' + lnk('plan', 'gun-ikinci-capa') + ')</p>');
h.push(pre([
  'ilk çapa GelenOge.ilkCapa, ikinci çapa GelenOge.ikinciCapa (D06); gövdede çapa yok',
  'başlangıç olayı: ilk çapa belgeden olaya = e1,          ikinci çapa olaydan belgeye = e2 + süre',
  'bitiş olayı    : ilk çapa belgeden olaya = e1 + süre,   ikinci çapa olaydan belgeye = e2',
  'her olay için  : D04 saatSonucu(ilk, ikinci, beklenenÖzne = { personel, hoca }) -> tahmin, pay, durum',
  'durum CAPALAR_AYRISIYOR -> AYRISIYOR;  DOGRULANAMADI ya da ulaşma anını aşıyor -> YOK',
  '(ele geçirilmiş kid\'le doğrulanan belge D04\'te ANAHTAR_ELE_GECIRILDI çapa durumuyla zaten geçersizdir)',
  'düzeltme hB = tahmin(baş) - etiket tabanı;  hS = tahmin(son) - (etiket tabanı + süre)',
  'h = floor((hB + hS) / 2);  q = max(pay(baş), pay(son)) + ceil(|hB - hS| / 2)',
].join('\n')));
h.push('<p><strong>Yedek kod eşleştirme</strong> (' + lnk('plan', 'asama23-okutma') + ', ' + lnk('plan', 'hile-rastgele-isim') + ')</p>');
h.push(pre([
  'adaylar : aday hocaların (QR ile aynı küme) kaydın günü ve komşu günü için indirme satırlarındaki',
  '          (rakam, kid); kayıp penceredeki günde indirme yoksa 1 ile 9 ve setteki her kid',
  'dilimler: [t - p - 30 sn - 60 sn, t + p + 60 sn]; saat doğrulanamadıysa bütün pencere',
  'sınır   : (öğrenci, oturum) 3, (öğrenci, ders, dönem) 10 yanlıştan sonra eşleştirilmez -> YEDEK_KOD_SINIR',
  '          (sayım projeksiyon:ogrenci:<ogrenciId> anahtarı tutulurken)',
  'eşleşme : tek ise o; birden çoksa kayda en yakın dilim; yoksa YEDEK_KOD_ESLESMEDI',
  'sonra   : gecikme kuralı N = 20 sn ile, hoca payıyla; projeksiyon (yuva 0) için yedek kod üretilmez',
].join('\n')));
h.push('<p><strong>Yuva ataması</strong></p>');
h.push(pre([
  'kilit   : danismaKilidi(tx, [projeksiyon:yuva:<hocaId>])',
  'etkin   : giriş oturumunun iptal edilmemiş ataması varsa o',
  'yeni    : rakam = min { r in 1..9 : (hoca, r) için son_gun >= bugün olan atama yok }; yoksa PROJEKSIYON_YUVA_YOK',
  '          (hoca, r) için son_gun < bugün olan etkin atama YUVA_YENIDEN_VERILDI ile bırakılır',
  'inceleme: D01.kisiGetir.incelemeHesabi ise dokuz rakam doluyken en eski atamanın rakamı hemen verilir;',
  '          indirme satırları yeni atamaya geçer, baytlar aynıdır (anahtar hoca, rakam, gün\'den)',
  'indirme : bugün .. bugün + 4 için (hoca, rakam, gün) yoksa etkin kid ile yazılır; varsa yazılı kid',
  '          (ELE_GECIRILDI ya da silinmişse etkin kid, satır güncellenir)',
].join('\n')));
h.push('<p><strong>Bluetooth ve konum</strong> (' + lnk('plan', 'asama23-okutma') + ', ' + lnk('plan', 'asama23-gps') + ', ' + lnk('teknik', 'telefon-bluetooth') + ', ' + lnk('teknik', 'telefon-konum') + ')</p>');
h.push(pre([
  'Bluetooth: görülen 64 bit kodlar, aday hocaların BLUETOOTH gösterim kayıtlarının rakamları ve',
  '           |dilim başı - t| <= 15 sn + p + q olan dilimlerle karşılaştırılır -> GORULDU | GORULMEDI;',
  '           tarama yoksa BLUETOOTH_YOK; kaydın anını kapsayan BLUETOOTH gösterimi yoksa BEKLENIYOR',
  'Konum    : yarıçaplardan biri > 100 m ya da konum yok -> KONUM_YOK; mesafe <= r1 + r2 + 50 m -> YAKIN; aksi UZAK;',
  '           referans: gösterim kaydının ya da onay isteğinin (bağlantı) hoca konumu, kayda en yakını;',
  '           referans yoksa BEKLENIYOR',
  'Yeniden  : gösterim kaydı ya da referanslı onay gelince oturumun gecikme BEKLEMEDE, Bluetooth ya da',
  '           konum BEKLENIYOR satırları (projeksiyon kodlu olanlar dahil) aynı işlemde yeniden hesaplanır',
  'Zayıf    : sahte konum, simülasyon, aksesuar; komşu konumlu kayıtla (mesafe - r1 - r2) / süre > 300 km/sa',
  'Etki     : karara girmez, yalnız saklanır ve ölçülür (D11-A05); Bluetooth yok ve konum yok aleyhe kullanılmaz',
].join('\n')));
h.push(det('Başlangıç değerleri: planın sayıları ayardan, biçimin sayıları sabit', rows([
  ['Sabit (biçim ya da plan)', 'Dilim 5 sn; ön alım en çok 6 dilim (30 sn); QR 41 rakam; doğrulama kodu 64 bit; telefona en çok 5 gün; yuva 0 ile 9.'],
  ['Gecikme sınırları', 'Normal 10 sn (yedek kod 20 sn), ret 30 sn, projeksiyon toleransı 1 sn; başlangıç değeri, denemeyle ayarlanır (plan.html#asama23-degisme-ve-kabul).'],
  ['Eşleştirme', 'Kod 6 rakam ve 5 dk; onay pencere açılışından 15 dk önce başlar; 10 dk\'da 5 yanlış; yeni tarayıcı adres başına 10 dk\'da 100; depolama tavanı 200.000 bağlanmamış tarayıcı; yenilenen çerezin eski değeri 60 sn.'],
  ['Yedek kod', 'Arama payı 60 sn; oturumda 3, ders ve dönemde 10 yanlış.'],
  ['Bluetooth ve konum', 'Bluetooth dilimi 15 sn, yayın 180 sn; konum payı 50 m, yarıçap sınırı 100 m, imkânsız hız 300 km/sa.'],
  ['Sorgu aralıkları', 'Eşleşme beklerken 3 sn, bağlıyken 10 sn, kapalıyken 30 sn (cevaptaki sonrakiIstekMs).'],
].map(([k, v]) => [k, tx(v)]))));
h.push('<p><strong>Kürsü sayfasının ve hoca telefonunun uyacağı sunucu sözleşmesi</strong></p>');
h.push(ul([
  'Sayfa saat farkını her cevapta gidiş dönüşün ortasına göre günceller, gidiş dönüşü 2 saniyeyi aşan örneği atar ve kodu sunucu saatine göre şimdiki dilimden seçer; elinde o dilimin kodu yoksa eski QR yerine bağlantı bekleniyor yazar (' + lnk('plan', 'asama23-nereden-gosterilir') + ').',
  'Durum BAGLI değilse elindeki kodları atar; KAPANDI ya da KOD_SURESI_DOLDU görünce yeni eşleştirme kodu ister; bilinmeyen durumda bağlantı bekleniyor yazar. gizliYenilenmeli true görünce hemen POST eslestirme-kodu { gizliYenile: true } çağırır; 401 alırsa bağlantı bekleniyor yazar ve yeni kod ister.',
  'QR\'ı açık zeminde koyu karelerle, tam ekranda ve Screen Wake Lock ile gösterir (' + lnk('plan', 'hoca') + '); geçiş yoktur (' + lnk('tasarim', 'k-qr') + ').',
  'Hoca telefonu QR\'ı yalnız pencere içinde ve indirilmiş gün anahtarıyla üretir; dilimi saat belgesi ve iç sayaçla hesaplar, her gösterim aralığını kapanınca ya da yeniden başlatmadan sonra GosterimKaydiGovdesi gövdesiyle gosterim_kaydi olarak kuyruğa koyar (ilk çapa öğe zarfının ilkCapa alanında); günü geçen anahtarı siler, yeni rakam ya da yeni baytlar gelirse eskisini bırakır.',
  'Hoca telefonu eşleştirme QR\'ını IUY:E1: önekinden tanır ve yalnız 6 rakamı seçilen ders oturumuyla gönderir; o an süren ya da 15 dakika içinde başlayacak oturumu önerir; Aşama 3\'te onayla birlikte tek seferlik konumunu referans olarak gönderir.',
  'Öğrenci telefonu yoklama QR\'ındaki kısa kodu yerel oturumla karşılaştırır ve uyuşmazlıkta öğrenciyi uyarır; kayıt yine imzalanıp gönderilirse sunucu OTURUM_UYUSMUYOR verir (D11-B22). Kayıt metnindeki Aşama 2 ve 3 alanları KayitKanitAlanlari şemasındadır.',
]));
for (const m of S.state_machines) h.push(det(`Durum makinesi: ${esc(m.name)}`, `<p>Durumlar: ${m.states.map(code).join(', ')}</p>\n` + table(['Kimden', 'Kime', 'Kim', 'Ne zaman'], m.transitions.map(t => [code(t.from), code(t.to), tx(t.by), tx(t.when)]))));
h.push('<p><strong>Değişmezler</strong></p>');
h.push(ul(S.invariants.map(tx)));
h.push('<p><strong>Dış yüz</strong></p>');
h.push(table(['Ad', 'İmza', 'Amaç'], S.exports.map(e => [code(e.name), code(e.signature), tx(e.purpose)])));
h.push('<p><strong>Denetim olayları</strong> (' + code('packages/contracts/src/projeksiyon.ts') + '; D09.denetimeYaz ile çağıranın işleminde; ayrıntı yalnız iç kimlik ve kod değeri taşır, yasak alan adı kullanmaz)</p>');
h.push(table(['Tür', 'Ayrıntı', 'Yazan'], S.audit_events.map(a => [code(a.tur), code(a.ayrinti), esc(a.yazan)])));

// Hata kodları
h.push('<h3>Hata kodları</h3>');
h.push(`<p>${code('hataKodlariTanimla(\'projeksiyon\', ...)')} ile ${code('packages/contracts/src/projeksiyon.ts')} içinde; hoca ve öğrenci metinleri katalogda, kişisel veri ve kod taşımaz. Her kod Testler bölümünde en az bir senaryoda döner. ${esc(p2.ORTAK)}</p>`);
h.push(table(['Kod', 'HTTP ya da öğe sonucu', 'Ne zaman'], S.error_codes.map(e => [code(e.kod), esc(e.http), esc(e.ne)])));

// Testler
h.push('<h3>Testler</h3>');
h.push(`<p>Davranış senaryoları ${code('apps/server/test/features/projeksiyon/')} altında Türkçe Gherkin, gerçek PostgreSQL ve Fastify inject ile; eşzamanlılık senaryoları iki bağlantı ve engel noktalarıyla; özellik testleri ${code('packages/core/src/projeksiyon/*.test.ts')} içinde Vitest ve açık deneme sayılı fast-check (${lnk('teknik', 'kod')}). Her yokluk iddiasının bir olumlu kontrolü, her kuralın bir yer kontrolü vardır; sınır ve kilit testleri mutasyonla kırmızıya döndürülerek doğrulanır.</p>`);
const kinds = ['behavior', 'property', 'contract', 'load', 'mutation'];
const KIND_TR = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
h.push(det(`${S.tests.length} test: ${kinds.map(k => `${S.tests.filter(t => t.kind === k).length} ${KIND_TR[k]}`).join(', ')}`, table(['Test', 'Tür', 'Neyi gösterir'], S.tests.map(t => [esc(t.name), esc(KIND_TR[t.kind]), tx(t.asserts)]))));

// Netleştirilenler
h.push('<h3>Netleştirilenler</h3>');
h.push(`<p>Envanterin ${inv.gaps.length} boşluğundan ${S.resolved_gaps.length} tanesi burada karara bağlandı; kalanlar ürün kararı ya da sözleşme eklemesi olarak Açık noktalarda. Komşu modüllerin yayımlanmış tasarımlarıyla hizalandı: çerez adı, rota kimliği ve hız sınıfları D13, hoca saat belgesi öznesi, çapa işlevleri ve çapa değerleri D04, öğe işleyicisi, öğe zarfı ve paket bağlamı D06, sınıf ve gerekçe eşlemesi D07, danışma kilidi, kısıt adları ve saklama D12, kid deseni ve gizli anahtar durumları D15, gece çizelgesi D14, olay dinleyicisi D01.</p>`);
h.push(det(`Boşluklar: ${S.resolved_gaps.length} karar ve gerekçesi`, table(['Boşluk', 'Karar', 'Neden'], S.resolved_gaps.map(g => [code(g.gap), tx(g.decision), tx(g.why)]))));
h.push(det(`Çelişkiler: ${S.contradictions_resolved.length} çözüm`, table(['Çelişki', 'Çözüm'], S.contradictions_resolved.map(c => [code(c.id), tx(c.resolution)]))));

// Açık noktalar
h.push('<h3>Açık noktalar</h3>');
h.push(`<div class="callout warn">\n<p>${sahip} nokta sahibin ürün kararını, ${sozlesme} nokta sözleşmeye ekleme ister. Hepsinde bu modül iki seçimde de çalışacak biçimde tasarlandı; karar yalnız eşleme ya da kayıt satırını değiştirir, eklenmeyen sözleşmede yazılı geçici davranış geçerlidir.</p>\n</div>`);
h.push(ul(S.open_points.map(o => `<span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahibin kararı' : 'sözleşme eklemesi'}</span> ${code(o.id)} ${tx(o.question)}<br>Öneri: ${tx(o.recommendation)}`)));
h.push('</section>');

const html = h.join('\n') + '\n';
if (/[\u2013\u2014]/.test(html)) { console.log('fragment has U+2013 or U+2014'); process.exit(1); }
// frag-only text gets the same reference checks as the spec
{ const ferr = [];
  for (const m of html.matchAll(/D11-A\d\d/g)) if (!ids.has(m[0])) ferr.push('fragment references missing open point ' + m[0]);
  for (const m of html.matchAll(/\bPROJEKSIYON_[A-Z_]+\b/g)) if (!S.error_codes.some(e => e.kod === m[0]) && !['PROJEKSIYON_BAGLANTI_KAPAT', 'PROJEKSIYON_ESLESTIRME_TEMIZLE'].includes(m[0])) ferr.push('fragment mentions unknown error code ' + m[0]);
  for (const [re, why] of [[/04:50|04:45/, 'old job time'], [/kimlikOlayiDinleyicisiKaydet/, 'old D01 listener'], [/oturum\.oturumId/, 'old PaketBaglami field'], [/kilitle a\u015fama/, 'old listener phase'], [/projeksiyon\.(kanitlar|baglantilar|anahtarlar)|oncekiSiniflar/, 'old retention classes']]) if (re.test(html + all)) ferr.push('stale text: ' + why);
  if (ferr.length) { console.log('FRAGMENT CHECK ERRORS (' + ferr.length + '):\n' + ferr.join('\n')); process.exit(1); } }
fs.mkdirSync(path.join(OUT, 'frag'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'frag', 'D11.html'), html, 'utf8');
console.log(`built: ${S.tables.length} tables, ${S.endpoints.length} endpoints, ${S.jobs.length} jobs, ${S.files.length} files, ${S.tests.length} tests, ${S.resolved_gaps.length} resolved, ${S.open_points.length} open (${sahip} owner, ${sozlesme} contract), ${S.error_codes.length} error codes; json ${fs.statSync(path.join(OUT, 'spec', 'D11.json')).size} B, html ${html.length} chars`);
