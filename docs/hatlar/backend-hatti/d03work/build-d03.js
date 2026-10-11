// Builds spec/D03.json and frag/D03.html from icerik.js, after deterministic self-checks
// against contracts.json and inv/D03.json. Exits non-zero on any failed check.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
// Default output is spec/D03.json and frag/D03.html. CONTRACTS overrides the contracts file and
// OUT_SPEC / OUT_FRAG override the output folders (used only for reproduction checks).
const C = JSON.parse(fs.readFileSync(process.env.CONTRACTS ? path.resolve(process.env.CONTRACTS) : path.join(B, 'contracts.json'), 'utf8'));
const INV = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D03.json'), 'utf8'));
const K = require('./icerik.js');
const OUT_SPEC = process.env.OUT_SPEC ? path.resolve(process.env.OUT_SPEC) : path.join(B, 'spec');
const OUT_FRAG = process.env.OUT_FRAG ? path.resolve(process.env.OUT_FRAG) : path.join(B, 'frag');
const mod = C.modules.find(m => m.id === 'D03');
const errs = [];
const ok = (cond, msg) => { if (!cond) errs.push(msg); };

// ---------- self-checks ----------
const sameSet = (a, b, what) => {
  const A = new Set(a), Bs = new Set(b);
  for (const x of A) ok(Bs.has(x), `${what}: extra ${x}`);
  for (const x of Bs) ok(A.has(x), `${what}: missing ${x}`);
};
sameSet(K.tables.map(t => t.name), mod.owns_tables, 'tables');
sameSet(K.endpoints.map(e => `${e.method} ${e.path}`), mod.owns_endpoints, 'endpoints');
// contract export names: the part before '(' or ':' (a plain name like 'listelerEklentisi' has neither)
const contractName = s => s.split(/[(:]/)[0].trim();
{ const have = new Set(K.exports_.map(e => e.name)); const want = mod.exports.map(contractName);
  for (const n of want) ok(have.has(n), `exports: missing ${n}`);
  for (const e of K.exports_) if (!want.includes(e.name)) ok(/^Sözleşme eki \(/.test(e.purpose), `exports: extra ${e.name} not marked 'Sözleşme eki'`); }
for (const e of K.exports_) ok(/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.name), `export name not one plain identifier: ${e.name}`);
ok(new Set(K.exports_.map(e => e.name)).size === K.exports_.length, 'export listed twice');
for (const e of K.exports_) ok(e.signature.startsWith(e.name + '(') || e.signature.startsWith(e.name + ':'), `export signature name ${e.name}`);
// contract parameter order is kept: params of each contract export appear in the signature in order ('s?' and 's' are the same param)
for (const s of mod.exports) {
  const name = contractName(s); if (!/^[^(:]+\(/.test(s)) continue;
  const params = s.slice(s.indexOf('(') + 1, s.indexOf(')')).split(',').map(p => p.split(/[?:]/)[0].trim()).filter(Boolean);
  const ex = K.exports_.find(e => e.name === name); if (!ex) continue; // reported above as 'exports: missing'
  const sig = ex.signature;
  const got = sig.slice(sig.indexOf('(') + 1).split(/[,)]/).map(p => p.split(/[?:]/)[0].trim());
  params.forEach((p, i) => ok(got[i] === p, `export ${name} param ${i}: contract ${p}, spec ${got[i]}`));
}
// every inventory gap resolved or opened; contradictions resolved; closed open points (D03-Axx) recorded as resolved
const resolved = new Set(K.resolved_gaps.map(g => g.gap));
const opened = new Set(K.open_points.flatMap(o => [...o.question.matchAll(/\((D03-B\d\d)\)/g)].map(m => m[1])));
const openIds = new Set(K.open_points.map(o => o.id));
for (const g of INV.gaps) ok(resolved.has(g.id) || opened.has(g.id), `gap not handled: ${g.id}`);
for (const g of resolved) ok(INV.gaps.some(x => x.id === g) || (/^D03-A\d\d$/.test(g) && !openIds.has(g)), `resolved unknown gap ${g}`);
// alignment round (align/D03.json): every open point left awaits approval; decided points are closed
for (const o of K.open_points) ok(o.needs_owner === true, `open point ${o.id} has needs_owner false`);
for (const id of ['D03-A07', 'D03-A08', 'D03-A09', 'D03-A10', 'D03-A11']) ok(resolved.has(id) && !openIds.has(id), `decided point ${id} not closed`);
for (const g of resolved) if (opened.has(g)) ok(g === 'D03-B26', `gap both resolved and open: ${g}`);
for (const g of INV.gaps.filter(g => g.needs_owner)) ok(opened.has(g.id), `needs_owner gap not an open point: ${g.id}`);
sameSet(K.contradictions_resolved.map(c => c.id), INV.contradictions.map(c => c.id), 'contradictions');
// error codes: catalog vs usage
const codes = new Set(K.HATALAR.map(h => h[0]));
const SABITLER = new Set(['LISTELER_GIZLI_ALANLAR', 'LISTELER_DENETIM_OLAYLARI', 'LISTELER_ROTALARI']); // contract constants, not error codes
const used = new Set(JSON.stringify([K.endpoints, K.exports_]).match(/LISTELER_[A-Z_]+/g).filter(c => !SABITLER.has(c)));
for (const c of used) ok(codes.has(c), `error code used but not in catalog: ${c}`);
for (const c of codes) ok(used.has(c), `catalog code never used by an endpoint or export: ${c}`);
// files inside globs
const globs = C.file_ownership.filter(g => g.owner === 'D03').map(g => g.glob.replace(/\*+$/, ''));
for (const f of K.files) ok(globs.some(g => f.startsWith(g)), `file outside globs: ${f}`);
ok(new Set(K.files).size === K.files.length, 'duplicate file');
// tests
for (const t of K.tests) ok(['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind), `test kind ${t.kind}`);
ok(new Set(K.tests.map(t => t.name)).size === K.tests.length, 'duplicate test name');
// every LISTELER_ code has a behavior test that names it
for (const c of codes) ok(K.tests.some(t => t.kind === 'behavior' && t.asserts.includes(c)), `no behavior test asserts ${c}`);
// open point ids sequential
K.open_points.forEach((o, i) => ok(o.id === 'D03-A' + String(i + 1).padStart(2, '0'), `open point id ${o.id}`));
// state machine transitions reference declared states
for (const sm of K.state_machines) for (const tr of sm.transitions) ok(sm.states.includes(tr.from) && sm.states.includes(tr.to), `state ${sm.name} ${tr.from}->${tr.to}`);

// ---------- spec ----------
// resolved entries: inventory gaps first (by id), then the open points the integrator closed (by id)
const byGap = (a, b) => (a.gap.startsWith('D03-A') - b.gap.startsWith('D03-A')) || a.gap.localeCompare(b.gap);
const S = {
  id: 'D03', module: mod.name, summary: K.summary,
  migration_dir: mod.migration_dir,
  migration_note: K.GOC,
  tables: K.tables.map(({ kisa, ...t }) => t),
  endpoints: K.endpoints.map(e => ({ method: e.method, path: e.path, client: e.client, auth: e.auth, request: e.request, response: e.response, errors: e.errors, idempotency: e.idempotency, rate_limit: e.rate_limit, purpose: e.purpose })),
  jobs: [],
  state_machines: K.state_machines,
  invariants: K.invariants,
  exports: K.exports_,
  kayitlar: K.kayitlar,
  files: K.files,
  tests: K.tests,
  resolved_gaps: [...K.resolved_gaps].sort(byGap),
  contradictions_resolved: K.contradictions_resolved,
  open_points: K.open_points
};
const specTxt = JSON.stringify(S, null, 2);
ok(!/[\u2013\u2014]/.test(specTxt), 'spec contains U+2013 or U+2014');
// alignment regressions: wording the architect replaced must not come back (resolved entries may name the removed mechanism)
{ const canli = JSON.stringify({ ...S, resolved_gaps: S.resolved_gaps.filter(g => !g.gap.startsWith('D03-A')) });
  ok(!/D03-A(07|08|09|10|11)\b/.test(canli), 'reference to a closed open point (D03-A07..A11) outside its resolved entry');
  ok(!/pg_advisory_xact_lock_shared|pg_advisory_xact_lock\((?!3, kova\) kalkt\u0131)/.test(canli), 'raw pg_advisory_xact_lock call in spec');
  ok(!/listeler\.liste_satirlari/.test(canli), "retention class must be 'listeler.donem_verisi'");
  ok(!/karar ve devam i\u015f kuyru\u011fuyla/.test(canli), "summary must say 'karar ayn\u0131 i\u015flemde, devam i\u015f kuyru\u011fuyla'");
  ok(!/\u00f6neri: kayd\u0131n hesaplanan saati/.test(canli), 'uyelikDenetle instant is a contract, not a suggestion');
  ok(!/LISTELER_(SUBE|SATIR)_BULUNAMADI/.test(canli), 'resource-level 404 is LISTELER_BULUNAMADI');
  ok(!/<UTC zaman>/.test(canli), 'migration folder uses the 14 digit UTC prefix');
  ok(!/S\u00f6zle\u015fme eki \(D03-A07\)|D02\.denemeDersi'/.test(canli), 'stale contract-addition wording'); }
ok(S.migration_dir.includes('<14 haneli UTC>_listeler_'), 'migration_dir differs from contracts.json');

// ---------- fragment ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = s => esc(s).replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, '<a href="$1.html#$2">$1.html#$2</a>');
const c = s => `<code>${esc(s)}</code>`;
const L = (doc, id, txt) => `<a href="${doc}.html#${id}">${esc(txt)}</a>`;
const tag = (cls, txt) => `<span class="tag${cls ? ' ' + cls : ''}">${esc(txt)}</span>`;
const row = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;
const table = (head, rows) => `<table>\n<tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>\n${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('\n')}\n</table>`;
const ul = items => `<ul>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ul>`;
const ol = items => `<ol>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ol>`;
const det = (summary, body) => `<details>\n<summary>${summary}</summary>\n${body}\n</details>`;

const H = [];
H.push(`<section id="${mod.name}">`);
H.push(`<h2>Öğrenci listesi ${tag('mute', 'D03 · listeler')}</h2>`);
H.push(`<p>${t(K.summary)}</p>`);

// Amaç ve sınırlar
H.push('<h3>Amaç ve sınırlar</h3>');
H.push('<div class="rows">');
H.push(row('Sorumlu olduğu', `Tablolar ${c('liste_satirlari')}, ${c('sube_listeleri')}, ${c('liste_yuklemeleri')}; ${c('/v1/listeler')} altında altı uç; zamanlanmış iş yok. Kural kaynağı: ${L('plan', 'hoca-liste-yukleme', 'Liste yükleme kuralları')}, ${L('teknik', 'panel-excel', 'Excel ve PDF')}, ${L('teknik', 'kod-veri-modeli', 'Veri modeli')}.`));
H.push(row('Kod yeri', `Sunucu ${c('apps/server/src/modules/listeler/')} (dış yüz yalnız ${c('index.ts')}: listelerEklentisi ve dış yüz işlevleri); şemalar, rota listesi, ${c('LISTELER_')} kodları ve LISTELER_DENETIM_OLAYLARI ${c('packages/contracts/src/listeler.ts')}; saf kurallar (dosya okuma, ad ve numara, fark, kova anahtarı) ${c('packages/core/src/listeler/')}.`));
H.push(row('Göç', `${c(mod.migration_dir.split(' (')[0])} (contracts.json migration_dir). ${t(K.GOC)}`));
H.push(row('Çağırdığı dış yüzler', `D02 ${c('subeGetir')} ve ${c('dersGetir')} (yazmada ve muafIsaretle'de ${c("{ kilitle: 'paylasimli' }")}), ${c('dersYetkisi(tx, kimlik, dersId)')}, ${c('dersSubeleri')}, ${c('oturumlariGetir')} (OTURUM_DURUMLARI, OTURUM_TURLERI ve IPTAL_NEDENLERI sabitleri içe aktarılır), ${c('kilitDurumu')}, ${c('takvimGetir')}, ${c('listeKaynagiKaydet')}, ${c('kilitAdimiKaydet')}; D06 ${c('surumAl')}, ${c('indirmeKaynagiKaydet')}; D09 ${c('denetimeYaz')}, ${c('denetimOlaylariniKaydet')}; D12 ${c('islem')}, ${c('danismaKilidi')}, ${c('danismaKilidiDene')}, ${c('saklamaIsleyicisiKaydet')}, ${c('kisitAdi')}; D13 ${c('rotalariKaydet')}, ${c('uygulamaHatasi')}, ${c('istekKimligi')}, ${c('hizSinifi')}, ortak şemalar (${c('kimlikSemasi')}, ${c('ogrenciNoSemasi')}, ${c('sayfaSorgusuSemasi')}). D07'nin saf ${c('dogrulamaListeAnahtari')} işlevi ${c('packages/contracts/src/dogrulama.ts')}'ten gelir; D07 modülü içe aktarılmaz.`));
H.push(row('Onu çağıranlar', `D01 (${c('numaraIleEslestir')}, ${c('ogrencininEtkinSatirlari')}, ${c('denemeListesiniKur')}, ${c('listeKovaAnahtari')}; ESLESTIRME dinleyicisi), D02 (kayıtlı liste kaynağı: yalnız ${c('etkinSatirlar')}; kayıtlı kilit adımı), D04 (${c('ogrencininEtkinSatirlari')}), D06 (indirme ve öğrenci kapsam kaynağı), D07 (${c('uyelikDenetle')}, ${c('satirGetir')}, ${c('listeKovaAnahtari')}; KARAR dinleyicisi), D08 (${c('listeSatirlari')}, ${c('satirGetir')}, ${c('muafIsaretle')}; HESAP dinleyicisi), D09 (${c('listeSatirlari')}, ${c('satirGetir')}, ${c('ogrencininEtkinSatirlari')}, ${c('ogrencininSatirlari')}; denetim olay türleri), D12 (saklama işleyicisi), D15 (${c('LISTELER_GIZLI_ALANLAR')}, log biçimlendiricisi). D05 D03'ü çağırmaz. D10 tabloları yalnız okur (${L('teknik', 'sunucu-mimari', 'Mimari')} istisnası).`));
H.push(row('Kayıt deseni', `D03 öbür alan modüllerini içe aktarmaz: liste değişikliği ${c('listeDegisikligiDinleyicisiKaydet')} ile kayıtlı dinleyicilere gider (uyarlayıcılar karşı modüllerin eklentilerinde). D03 kendisi ${c('listelerEklentisi')} içinde (${c('eklenti.ts')}) her süreçte şunlara kaydolur (ayrıntılar İşler bölümünde):` + ul(K.KAYIT_KISA.map(t))));
H.push(row('Birleşim', `${c('index.ts')} ${c('listelerEklentisi')} Fastify eklentisini ve EklentiTemelSecenekleri'ni (${c('{ surec }')}) genişleten ${c('ListelerEklentisiSecenekleri')} tipini verir (ortak kural 'Birleşim'). Eklenti altyapıyı (${c('islem')}, ${c('saat')}) seçenekten alır, kayıt sırasında veritabanına dokunmaz, zamanlayıcısı yoktur, dinleyici kayıtlarını api, isci ve belge süreçlerinin hepsinde yapar; rotalar yalnız ${c('rotalariKaydet')} ile, ${c('setErrorHandler')} ve ${c('setNotFoundHandler')} yok. Kaynak düzeyi ret 404 ${c('LISTELER_BULUNAMADI')}, rota düzeyi rol reddi 403 ${c('API_ROL_YETKISIZ')}.`));
H.push(row('Saat', `Kural kodunda ${c('now()')} ve ${c('Date.now()')} yok. Eklenti, bileşim kökünün verdiği saat örneğini (D04'ün ${c('infra/saat')}, Saat tipi) yerel ${c('SaatKaynagi')} arayüzüyle parametre alır; ${c('modules/saat')} içe aktarılmaz. İşlem anı kilitler alındıktan sonra bir kez okunur.`));
H.push(row('Dışında kalan', `Dosyanın okunması panelde (kurallar bu modülün core işlevleri); muafın anlamı, ucu (${c('PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf')}) ve denetim olayı D08'in; kararın kendisi D07'nin; kayıt eşleşmesinin sonucu ve teyit D01 ile D09'un; AKSİS'e otomatik bağlantı yok (${L('plan', 'tek-bakista', 'Tek bakışta')}).`));
H.push('</div>');

// Tablolar
H.push('<h3>Tablolar</h3>');
H.push(`<p>Üç tablo; kısıt ve dizin adlarının hepsi ${c('kisitAdi(tablo, gerçek sütun listesi, tür)')} çıktısıdır (D12-B01; çok sütunlu CHECK'te bütün sütunlar adda, hepsi 63 baytın altında); dizinsiz yabancı anahtarlar ${c('@dizinsiz-kabul')} yorumlu (D12-B15); kimlikler ${c('uuidv7()')}, anlar ${c('timestamptz')}, kod listeleri metin ve CHECK (${L('teknik', 'sunucu-mimari', 'Veritabanı erişimi')}). Türkçe ad sıralaması gerekirse yalnız sorguda ${c('COLLATE "tr-TR-x-icu"')}, dizinsiz (${L('teknik', 'veritabani-donem-alani', 'Zaman ve sıralama')}); liste uçları sırayı ${c('sira')} ile verir, ada göre sıralamayı panel yapar.</p>`);
for (const tb of K.tables) {
  const body = [
    `<p>${t(tb.purpose)}</p>`,
    table(['Sütun', 'Tür', 'Boş', 'Varsayılan', 'Not'], tb.columns.map(cl => [c(cl.name), c(cl.type), cl.null ? 'evet' : 'hayır', cl.default ? c(cl.default) : '', t(cl.note)])),
    '<p><strong>Dizinler</strong></p>', ul(tb.indexes.map(t)),
    '<p><strong>Kısıtlar</strong></p>', ul(tb.constraints.map(x => c(x)))
  ].join('\n');
  H.push(det(`${esc(tb.name)}: ${esc(tb.kisa)} (${tb.columns.length} sütun)`, body));
}

// Uç noktalar
H.push('<h3>Uç noktalar</h3>');
H.push(`<p>Altısı da panelin, oturumlu hocanın uçlarıdır; yalnız dersin hocası görür (D02.dersYetkisi sonucu dersin hocası), başka hocanın ve yöneticinin isteği 404 ${c('LISTELER_BULUNAMADI')} alır (D13-B02, D03-A05). Numara yola ve sorguya konmaz (${L('teknik', 'sunucu-ayarlar', 'Loglar ve izleme')}); ${c('satirlar')} ve PATCH ${c('beklenenListeSurumu')}, uygula önizlemenin ${c('farkOzeti')} değerini taşır; PATCH gövdesinde muaf yoktur; hata sırası her yazma ucunun açıklamasında.</p>`);
H.push('<div class="rows">');
for (const e of K.endpoints) H.push(row(c(`${e.method} ${e.path}`), `${t(e.purpose)}<br>${tag('mute', 'tekrar')} ${t(e.idempotency)}<br>${tag('mute', 'sınır')} ${t(e.rate_limit)}`));
H.push('</div>');
const kv = o => table(['Alan', 'Tür ve kural'], Object.entries(o).map(([k, v]) => [c(k), t(v)]));
H.push(det('İstek, cevap ve hata alanları: altı ucun tamamı', K.endpoints.map(e => [
  `<p><strong>${esc(e.method + ' ' + e.path)}</strong>: ${t(e.auth)}</p>`,
  '<p>İstek</p>', kv(e.request), '<p>Cevap</p>', kv(e.response),
  `<p>Hatalar: ${e.errors.map(esc).join(', ')}</p>`
].join('\n')).join('\n')));

// İşler
H.push('<h3>İşler</h3>');
H.push(`<p>D03'ün zamanlanmış işi ve kuyruk öğesi yok. Liste uygulaması eşzamanlı, tek işlemdedir; bekleyen kayıt eşleşmesi (D01) ve karar (D07) aynı işlemde dinleyiciyle yürür, devam hesabını D08'in dinleyicisi aynı işlemde iş kuyruğuna koyar: karar aynı işlemde, devam iş kuyruğuyla. ${c('apps/server/src/jobs/listeler/index.ts')} iskeletin ${c('worker.ts')} toplaması için boş liste döner. D03'ün kayıtları:</p>`);
H.push('<div class="rows">');
H.push(row('İndirme kaynağı', `${t(K.KAYIT.indirme)} (${L('plan', 'kararlar-indirme', 'İndirme')})`));
H.push(row('Öğrenci kapsam kaynağı', t(K.KAYIT.kapsam)));
H.push(row('Liste kaynağı (D02)', t(K.KAYIT.listeKaynagi)));
H.push(row('Kilit adımı (D02)', t(K.KAYIT.kilitAdimi)));
H.push(row('Saklama işleyicisi (D12)', t(K.KAYIT.saklama)));
H.push(row('Denetim olay türleri (D09)', t(K.KAYIT.denetim)));
H.push('</div>');

// Durumlar ve kurallar
H.push('<h3>Durumlar ve kurallar</h3>');
for (const sm of K.state_machines) {
  H.push(det(`${esc(sm.name)}: ${esc(sm.states.join(', '))}`, table(['Önce', 'Sonra', 'Yapan', 'Ne zaman'], sm.transitions.map(tr => [c(tr.from), c(tr.to), t(tr.by), t(tr.when)]))));
}
H.push('<div class="callout">');
H.push('<p><strong>Uygula işlemi adım adım</strong> (satirlar, PATCH ve denemeListesiniKur aynı iskeleti kullanır)</p>');
H.push(ol([
  `Kökte şema (400), oturum ve rol (D01 kancası; rol reddi 403 API_ROL_YETKISIZ); şube ve ders D02'den; D02.dersYetkisi(tx, kimlik, dersId) sonucu dersin hocası değilse 404 LISTELER_BULUNAMADI. Satır denetimi core ${c('satir-denetimi.ts')} ile kilit almadan: HATA varsa 400 LISTELER_HATALI_SATIR. Kilitsiz ön okumayla yazmanın satır değiştireceği şubeler bulunur (hedef şube, gelen numaraların aynı dersteki öbür satırlarının şubeleri, kırpılacak satırların şubeleri).`,
  `${c('D12.islem')} içinde ${c("SET LOCAL lock_timeout = '3s'")}; (1) bu şubelerin ${c("'dogrulama:liste:<subeId>'")} anahtarları (D07'nin saf ${c('dogrulamaListeAnahtari(subeId)')} işleviyle, katman 1, dışlayıcı) tek ${c('D12.danismaKilidi')} çağrısında.`,
  `(2) Dersin bütün şubelerinin ${c('sube_listeleri')} satırları kimlik sırasıyla açılır (${c('INSERT ... ON CONFLICT DO NOTHING')}) ve ${c('FOR UPDATE')} kilitlenir: aynı dersin yazanları burada sıraya girer.`,
  `(3) Şube ve ders satırları D02'den ${c("subeGetir/dersGetir(..., { kilitle: 'paylasimli' })")} ile FOR SHARE okunur; işlem anı saat arayüzünden bir kez okunur.`,
  `Şubenin satırları ve gelen numaraların aynı dersteki öbür satırları tek deyimle okunur; fark ${c('fark.ts')}, kırpılacaklar ${c('aralik.ts')}, özet ${c('fark-ozeti.ts')} ile hesaplanır. Fark ön okumadaki kümede olmayan bir şubeyi değiştiriyorsa o şubenin anahtarı ${c('D12.danismaKilidiDene')} ile alınır; alınamazsa işlem geri alınır, 503 LISTELER_MESGUL.`,
  `Fark boşsa 200 ZATEN_UYGULANMIS ve çıkış (kilitli dönemde de). Değilse sırayla: kilit (dönem kilidi, arşiv, pasif şube, deneme dersi) 409 LISTELER_KILITLI; özet beklenenFarkOzeti'nden farklıysa 409 LISTELER_SURUM_DEGISTI; onaylar (UYARI, büyük değişiklik, şube değişikliği) 409 LISTELER_ONAY_GEREKLI; etkin satır sınırı 409 LISTELER_SATIR_SINIRI.`,
  `(4) Üyeliği ya da adı değişecek numaraların kova anahtarları ${c("listeKovaAnahtari(kovaNo) = 'listeler:kova:<kovaNo>'")} (katman 2, dışlayıcı) tek ${c('D12.danismaKilidi')} çağrısında; en çok 256 anahtar. Yalnız seçim değişiyorsa bu adım yoktur.`,
  `(5) ${c('liste_yuklemeleri')} satırı; sırayla pasif yapma (başka şubedekiler dahil), canlandırma, kırpma, ekleme (muaf ve seçim dersin öbür satırlarından), ad, sıra ve kaynak; ${c('degisiklik_surumu')} ve ${c('uyelik_surumu')} işlem içinde geçici 0. Yazılan her şubenin ${c('sube_listeleri.liste_surumu')} değeri tam 1 artar (şube değişiminde iki şube). ${c('D09.denetimeYaz')} olayları geçiş başına, birimId ile (D03-B20; numara ve ad yok).`,
  `(6) Dinleyiciler basamak sırasıyla: ESLESTIRME (D01, ayrık her subeId için yalnız değişikliğin numaralarıyla), KARAR (D07, kararı aynı işlemde ${c("yenidenDegerlendir(tx, { dersId, subeIdleri, ogrenciNolari }, 'LISTE_DEGISTI')")} ile verir), HESAP (D08, ${c("devamHesaplaIsiKoy(tx, dersId, null, 'LISTE', { tur: 'LISTE_SATIRI', id: satirId, donemId })")} ile devam işini kuyruğa koyar).`,
  `(7) Son adım: ${c('D06.surumAl(tx)')}, işlemde bir kez; inen sütunu değişen satırlara ${c('degisiklik_surumu')}, üyeliği değişenlere ayrıca ${c('uyelik_surumu')} bu değerle; commit. Bekleme lock_timeout'u aşarsa (55P03) işlem geri alınır, 503 LISTELER_MESGUL.`
]));
H.push(`<p>Sıra ortak kural 'Danışma kilidi katmanları'na uyar: tek genel sıra önce katman, sonra anahtar metnidir; bir işlem birden çok kez çağırabilir ama yeni her anahtar tuttuklarının hepsinden sonra gelir, tutulan anahtarı yeniden istemek işlemsizdir, sırada geride kalan yeni anahtar yalnız ${c('danismaKilidiDene')} ile alınır. Elle ${c('pg_advisory_xact_lock')} yazılmaz; iki tam sayılı eski kova kilidi kalktı. Öğrenci kaydı (numaraIleEslestir) ve gönderimin ret yolu (uyelikDenetle) yalnız kendi numarasının kova anahtarını ${c("{ anahtar, kip: 'paylasimli' }")} ile ister, çağıran tutuyorsa istek işlemsizdir; bir D03 yazmasının içinde kova kümesi dışındaki numarayla numaraIleEslestir iç hata atar. muafIsaretle D02 satırlarını okuduktan sonra liste satırlarını kilitler, danışma anahtarı almaz. Kilitlenme olursa D12'nin bir kez yeniden deneme kuralı (D12-B08) yalnız son güvencedir.</p>`);
H.push('</div>');
H.push(det('Panelde okuma hattı: dosyadan önizleme isteğine (core işlevleri)', ol([
  `${c('dosya-turu.ts')}: ilk baytlar. ${c('50 4B 03 04')} XLSX; ${c('D0 CF 11 E0 A1 B1 1A E1')} XLS (parolalı .xlsx de bu kaptadır, SheetJS okuyamazsa DOSYA_PAROLALI); BOM ve boşluktan sonra ${c('<')} HTML_XML; kalanı metin. 10 MiB üstü DOSYA_COK_BUYUK, boş dosya DOSYA_BOS.`,
  `Excel ve HTML_XML: panel SheetJS ile okur (HTML tablo ${c('raw: true')} ile, hücreler metin kalır) ve çalışma kitabını hücre tablosuna çevirir: her hücre için biçimli metin, ham değer ve sayı mı bilgisi. ${c('okuma.ts')} SheetJS'i içe aktarmaz.`,
  `Metin: ${c('kodlama.ts')} BOM (UTF-8, UTF-16LE, UTF-16BE), yoksa katı UTF-8, olmazsa windows-1254 (sabit tablo); BOM'suz UTF-16 tanınmaz ve başlık bulunamaz iletisiyle biter. ${c('csv.ts')} RFC 4180 ile ayrıştırır; ayırıcı adayları noktalı virgül, virgül, sekme (D03-B07).`,
  `${c('baslik.ts')}: ilk 20 satırda numara ve ad başlığını birlikte taşıyan ilk satır, sözlük öncelik sırasıyla; ilk sayfada yoksa sonraki sayfalar; bulunamazsa elle eşleme (D03-B06).`,
  `${c('okuma.ts')}: satırları çıkarır; numara hücresinde biçimli metin yalnız rakamsa, değilse tam sayı ham değer; ${c('="..."')} soyulur; ayrı ad ve soyad bir boşlukla birleşir; tamamen boş ve dipnot satırları atlanır; şube sütunu varsa satırlar core ${c('sube.ts')} anahtarıyla seçilen şubeye göre süzülür, dışarıda kalanlar ayrı gösterilir (D03-B15); süzmeden sonra 2.000'den çok dolu satır COK_FAZLA_SATIR.`,
  `Panel ${c('satir-denetimi.ts')} ile bulguları kendisi de gösterir ve ${c('POST .../onizleme')} gönderir; sunucu aynı işlevle yeniden denetler, farkı ${c('fark.ts')} ile hesaplar. Önizlemeyi React çizer, SheetJS'in HTML çıktısı kullanılmaz (${L('teknik', 'panel-excel', 'Excel ve PDF')}); ilerleme çubuğu yalnız bu okumayı gösterir (${L('tasarim', 'anat-progress', 'İlerleme')}).`
])));
H.push(det(`Değişmezler: ${K.invariants.length} kural`, ul(K.invariants.map(t))));
H.push(det('Dış yüz imzaları ve tipler', [
  '<pre><code>' + esc(K.exports_.map(e => e.signature).join('\n')) + '</code></pre>',
  '<div class="rows">', ...K.exports_.map(e => row(c(e.name), t(e.purpose))), '</div>'
].join('\n')));

// Hata kodları
H.push('<h3>Hata kodları</h3>');
H.push(`<p>Zarf, istek kimliği ve metin tablosu D13'ün (hata zarfı, ${c('alanlar')} yalnız yol). Modül kodları ${c('packages/contracts/src/listeler.ts')} içinde, cevapta x-extensible-enum.</p>`);
H.push(table(['Kod', 'HTTP', 'Ne zaman'], K.HATALAR.map(([k, h, w]) => [c(k), String(h), t(w)])));
H.push(`<p>Ortak (D13): 400 doğrulama, 401 girişsiz, 403 ${c('API_ROL_YETKISIZ')} (rota düzeyi rol reddi), 413 ${c('GOVDE_COK_BUYUK')}, 415 JSON dışı içerik, 429 hız sınırı, 503 yoğunluk. Kaynak düzeyi ret tek kodla 404 ${c('LISTELER_BULUNAMADI')} (ortak kural 'Birleşim').</p>`);
H.push(det('Önizleme bulguları ve panelin okuma sonuçları', [
  '<p>Bulgular (önizleme cevabı, satır başına)</p>',
  table(['Kod', 'Düzey', 'Anlamı'], K.BULGULAR.map(([k, d, w]) => [c(k), tag(d === 'HATA' ? 'bad' : d === 'UYARI' ? 'warn' : 'mute', d), t(w)])),
  `<p>Panelin okuma sonuçları (core ${c('okuma.ts')}, HTTP değil; her biri ayrı metin alır, D03-C02)</p>`,
  table(['Kod', 'Anlamı'], K.OKUMA.map(([k, w]) => [c(k), t(w)]))
].join('\n')));

// Testler
H.push('<h3>Testler</h3>');
const kinds = ['behavior', 'property', 'contract', 'load', 'mutation'];
const kindTr = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
H.push(`<p>Davranış senaryoları Türkçe Gherkin ile, gerçek PostgreSQL'e (${L('teknik', 'testler', 'Testler')}); saf kurallar Vitest ve fast-check ile, deneme sayısı açık (${L('teknik', 'testler-birim', 'Birim ve özellik testleri')}); mutasyon D15'in haftalık Stryker işinde (${L('teknik', 'testler-kalite', 'Kalite kapıları')}). Her ret senaryosu kırmızı yazılır, her yokluk iddiasının pozitif kontrolü vardır (${L('plan', 'baslangic', 'Başlangıç')}).</p>`);
H.push(det(`${K.tests.length} test: ${kinds.map(k => `${K.tests.filter(x => x.kind === k).length} ${kindTr[k]}`).join(', ')}`, table(['Ad', 'Tür', 'Denetler'], K.tests.map(x => [t(x.name), kindTr[x.kind], t(x.asserts)]))));

// Netleştirilenler
const NETLESTIRILENLER = H.length; // regression checks below skip the resolved and open-point sections, which may name removed mechanisms
H.push('<h3>Netleştirilenler</h3>');
const bosluklar = S.resolved_gaps.filter(g => !g.gap.startsWith('D03-A')), kapanan = S.resolved_gaps.filter(g => g.gap.startsWith('D03-A'));
H.push(det(`${bosluklar.length} boşluk karara bağlandı`, `<div class="rows">\n${bosluklar.map(g => row(esc(g.gap), `${t(g.decision)}<br>${tag('mute', 'neden')} ${t(g.why)}`)).join('\n')}\n</div>`));
H.push(det(`${kapanan.length} modüller arası açık nokta bütünleştiricinin kararıyla kapandı`, `<div class="rows">\n${kapanan.map(g => row(`${esc(g.gap)} ${tag('mute', 'kapandı')}`, `${t(g.decision)}<br>${tag('mute', 'dayanak')} ${t(g.why)}`)).join('\n')}\n</div>`));
H.push(det(`${K.contradictions_resolved.length} çelişki çözüldü`, `<div class="rows">\n${K.contradictions_resolved.map(x => row(esc(x.id), t(x.resolution))).join('\n')}\n</div>`));

// Açık noktalar
H.push('<h3>Açık noktalar</h3>');
const bekleyen = K.open_points.filter(o => o.needs_owner);
H.push('<div class="callout warn">');
H.push(`<p><strong>Onay bekleyenler (${bekleyen.length})</strong>: spec önerilen seçenekle yazıldı ve karar verilene kadar önerilen değer geçerlidir; karar değişirse etkilenen yer yanında yazıyor.</p>`);
H.push(`<div class="rows">\n${bekleyen.map(o => row(`${esc(o.id)} ${tag('warn', 'onay bekliyor')}`, `${t(o.question)}<br>${tag('mute', 'öneri')} ${t(o.recommendation)}`)).join('\n')}\n</div>`);
H.push('</div>');
H.push(`<p>Modüller arası açık nokta kalmadı: D03-A07 ile D03-A11 bütünleştiricinin kararıyla kapandı (Netleştirilenler).</p>`);
H.push('</section>');
const html = H.join('\n') + '\n';
ok(!/[\u2013\u2014]/.test(html), 'fragment contains U+2013 or U+2014');
{ const canliHtml = H.slice(0, NETLESTIRILENLER).join('\n');
  ok(!/D03-A(07|08|09|10|11)\b/.test(canliHtml), 'fragment names a closed open point outside Netleştirilenler');
  ok(!/pg_advisory_xact_lock_shared|pg_advisory_xact_lock\(/.test(canliHtml), 'raw pg_advisory_xact_lock call in fragment');
  ok(!/listeler\.liste_satirlari|LISTELER_(SUBE|SATIR)_BULUNAMADI|pasiflesenSatirlar \}|&lt;UTC zaman&gt;|kilitliBirimDonemleri/.test(canliHtml), 'stale wording in fragment');
  ok(canliHtml.includes('karar aynı işlemde, devam iş kuyruğuyla'), "fragment must say 'karar aynı işlemde, devam iş kuyruğuyla'"); }

// anchors exist (same rule as the validator, applied to spec texts too)
for (const doc of ['plan', 'teknik', 'tasarim']) {
  const ids = new Set([...fs.readFileSync(REPO + doc + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const m of (specTxt + html).matchAll(new RegExp(`${doc}\\.html#([a-z0-9-]+)`, 'g'))) ok(ids.has(m[1]), `broken anchor ${doc}.html#${m[1]}`);
}
// balanced tags (validator list plus a few more)
for (const tg of ['section', 'div', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'details', 'summary', 'p', 'h2', 'h3', 'code', 'a', 'pre', 'strong', 'span']) {
  const o = (html.match(new RegExp(`<${tg}(\\s[^>]*)?>`, 'g')) || []).length, cl = (html.match(new RegExp(`</${tg}>`, 'g')) || []).length;
  ok(o === cl, `<${tg}> open ${o} close ${cl}`);
}

if (errs.length) { console.log('BUILD CHECKS FAILED (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }
fs.mkdirSync(OUT_SPEC, { recursive: true });
fs.mkdirSync(OUT_FRAG, { recursive: true });
fs.writeFileSync(path.join(OUT_SPEC, 'D03.json'), specTxt + '\n', 'utf8');
fs.writeFileSync(path.join(OUT_FRAG, 'D03.html'), html, 'utf8');
console.log(`built: ${S.tables.length} tables, ${S.endpoints.length} endpoints, ${S.exports.length} exports, ${S.files.length} files, ${S.tests.length} tests, ${S.resolved_gaps.length} resolved, ${S.contradictions_resolved.length} contradictions, ${S.open_points.length} open points; fragment ${html.length} bytes`);
