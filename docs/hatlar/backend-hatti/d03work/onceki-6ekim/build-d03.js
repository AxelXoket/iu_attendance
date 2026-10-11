// Builds spec/D03.json and frag/D03.html from icerik.js, after deterministic self-checks
// against contracts.json and inv/D03.json. Exits non-zero on any failed check.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const INV = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D03.json'), 'utf8'));
const K = require('./icerik.js');
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
sameSet(K.exports_.map(e => e.name), mod.exports.map(s => s.split('(')[0].trim()), 'exports');
for (const e of K.exports_) ok(e.signature.startsWith(e.name + '('), `export signature name ${e.name}`);
// contract parameter order is kept: first params of each contract export appear in the signature in order
for (const s of mod.exports) {
  const name = s.split('(')[0].trim(); const params = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')).split(',').map(p => p.trim()).filter(Boolean);
  const sig = K.exports_.find(e => e.name === name).signature;
  const got = sig.slice(sig.indexOf('(') + 1).split(/[,)]/).map(p => p.split(/[?:]/)[0].trim());
  params.forEach((p, i) => ok(got[i] === p, `export ${name} param ${i}: contract ${p}, spec ${got[i]}`));
}
// every inventory gap resolved or opened; contradictions resolved
const resolved = new Set(K.resolved_gaps.map(g => g.gap));
const opened = new Set(K.open_points.flatMap(o => [...o.question.matchAll(/\((D03-B\d\d)\)/g)].map(m => m[1])));
for (const g of INV.gaps) ok(resolved.has(g.id) || opened.has(g.id), `gap not handled: ${g.id}`);
for (const g of resolved) ok(INV.gaps.some(x => x.id === g), `resolved unknown gap ${g}`);
for (const g of resolved) if (opened.has(g)) ok(g === 'D03-B26', `gap both resolved and open: ${g}`);
for (const g of INV.gaps.filter(g => g.needs_owner)) ok(opened.has(g.id), `needs_owner gap not an open point: ${g.id}`);
sameSet(K.contradictions_resolved.map(c => c.id), INV.contradictions.map(c => c.id), 'contradictions');
// error codes: catalog vs usage
const codes = new Set(K.HATALAR.map(h => h[0]));
const used = new Set(JSON.stringify([K.endpoints, K.exports_]).match(/LISTELER_[A-Z_]+/g).filter(c => c !== 'LISTELER_GIZLI_ALANLAR'));
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
const S = {
  id: 'D03', module: mod.name, summary: K.summary,
  tables: K.tables.map(({ kisa, ...t }) => t),
  endpoints: K.endpoints.map(e => ({ method: e.method, path: e.path, client: e.client, auth: e.auth, request: e.request, response: e.response, errors: e.errors, idempotency: e.idempotency, rate_limit: e.rate_limit, purpose: e.purpose })),
  jobs: [],
  state_machines: K.state_machines,
  invariants: K.invariants,
  exports: K.exports_,
  files: K.files,
  tests: K.tests,
  resolved_gaps: K.resolved_gaps,
  contradictions_resolved: K.contradictions_resolved,
  open_points: K.open_points
};
const specTxt = JSON.stringify(S, null, 2);
ok(!/[\u2013\u2014]/.test(specTxt), 'spec contains U+2013 or U+2014');

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
H.push(row('Sahip olduğu', `Tablolar ${c('liste_satirlari')}, ${c('sube_listeleri')}, ${c('liste_yuklemeleri')}; ${c('/v1/listeler')} altında altı uç; zamanlanmış iş yok. Kural kaynağı: ${L('plan', 'hoca-liste-yukleme', 'Liste yükleme kuralları')}, ${L('teknik', 'panel-excel', 'Excel ve PDF')}, ${L('teknik', 'kod-veri-modeli', 'Veri modeli')}.`));
H.push(row('Kod yeri', `Sunucu ${c('apps/server/src/modules/listeler/')} (dış yüz yalnız ${c('index.ts')}); şemalar, rota listesi, ${c('LISTELER_')} kodları ve denetim olay türleri ${c('packages/contracts/src/listeler.ts')}; saf kurallar (dosya okuma, ad ve numara, fark) ${c('packages/core/src/listeler/')}; göç ${c('apps/server/migrations/<UTC zaman>_listeler_<açıklama>/')} (klasör kuralı D12'nin, göç yalnız bu üç tabloya dokunur).`));
H.push(row('Çağırdığı dış yüzler', `D02 ${c('subeGetir')}, ${c('dersGetir')}, ${c('dersYetkisi')}, ${c('dersSubeleri')}, ${c('oturumlariGetir')}, ${c('kilitDurumu')}, ${c('takvimGetir')}; D06 ${c('surumAl')}, ${c('indirmeKaynagiKaydet')}; D09 ${c('denetimeYaz')}; D12 ${c('islem')}, ${c('saklamaIsleyicisiKaydet')}, ${c('kisitAdi')}; D13 ${c('rotalariKaydet')}, ${c('uygulamaHatasi')}, ${c('istekKimligi')}, ${c('hizSinifi')}.`));
H.push(row('Onu çağıranlar', `D01 (${c('numaraIleEslestir')}, ${c('ogrencininEtkinSatirlari')}, ${c('listeSatirlari')}; ESLESTIRME dinleyicisi), D04 (${c('ogrencininEtkinSatirlari')}), D05 ve D09 (${c('uyelikDenetle')}), D07 (${c('uyelikDenetle')}; KARAR dinleyicisi), D08 (${c('listeSatirlari')}, ${c('satirGetir')}, ${c('muafIsaretle')}; HESAP dinleyicisi), D06 (indirme kaynağı), D12 (saklama işleyicisi). D10 tabloları yalnız okur (${L('teknik', 'sunucu-mimari', 'Mimari')} istisnası).`));
H.push(row('Kayıt deseni', `D03 öbür alan modüllerini içe aktarmaz: liste değişikliği ${c('listeDegisikligiDinleyicisiKaydet')} ile kayıtlı dinleyicilere gider; D03 kendisi D06'ya indirme kaynağı, D12'ye saklama işleyicisi, D13'ün rota tablosuna rota listesi olarak kaydolur (${c('eklenti.ts')}).`));
H.push(row('Saat', `Kural kodunda ${c('now()')} ve ${c('Date.now()')} yok. Eklenti, bileşim kökünün verdiği saat örneğini (D04'ün ${c('infra/saat')}) yerel ${c('SaatKaynagi')} arayüzüyle parametre alır; ${c('modules/saat')} içe aktarılmaz. İşlem anı kilitler alındıktan sonra bir kez okunur.`));
H.push(row('Dışında kalan', `Dosyanın okunması panelde (kurallar bu modülün core işlevleri); muafın anlamı, ucu ve denetim olayı D08'in; kayıt eşleşmesinin sonucu ve teyit D01 ile D09'un; AKSİS'e otomatik bağlantı yok (${L('plan', 'tek-bakista', 'Tek bakışta')}).`));
H.push('</div>');

// Tablolar
H.push('<h3>Tablolar</h3>');
H.push(`<p>Üç tablo; adlar ve kısıtlar D12-B01 kuralıyla, kimlikler ${c('uuidv7()')}, anlar ${c('timestamptz')}, kod listeleri metin ve CHECK (${L('teknik', 'sunucu-mimari', 'Veritabanı erişimi')}). Türkçe ad sıralaması gerekirse yalnız sorguda ${c('COLLATE "tr-TR-x-icu"')}, dizinsiz (${L('teknik', 'veritabani-donem-alani', 'Zaman ve sıralama')}); liste uçları sırayı ${c('sira')} ile verir, ada göre sıralamayı panel yapar.</p>`);
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
H.push(`<p>Altısı da panelin, oturumlu hocanın uçlarıdır; yalnız dersin hocası görür, başka hocanın kaynağı 404 döner (D13-B02). Numara yola ve sorguya konmaz (${L('teknik', 'sunucu-ayarlar', 'Loglar ve izleme')}); yazmalar ${c('beklenenListeSurumu')} taşır.</p>`);
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
H.push(`<p>D03'ün zamanlanmış işi ve kuyruk öğesi yok. Liste uygulaması eşzamanlı, tek işlemdedir; bekleyen kayıt eşleşmesi ve karar yenileme aynı işlemde dinleyicilerle yürür, devam hesabını D08'in dinleyicisi kendi işiyle kuyruğa koyar. ${c('apps/server/src/jobs/listeler/index.ts')} iskeletin ${c('worker.ts')} toplaması için boş liste döner.</p>`);
H.push('<div class="rows">');
H.push(row('İndirme kaynağı', `D06'ya ${c("indirmeKaynagiKaydet('liste_satirlari', kaynak)")}: hocaya kapsamındaki derslerin şubelerinin bütün satırları, öğrenciye yalnız kendi numarasının satırları; ${c('degisiklik_surumu')} aralığıyla artımlı. Alanlar D03-B27'de; pasif satır ${c('pasifAni')} ile, anonim satır ${c('silindi')} true ile iner (${L('plan', 'kararlar-indirme', 'İndirme')}). Bağlam beklentisi D03-A09'da.`));
H.push(row('Saklama işleyicisi', `D12'ye ${c("saklamaIsleyicisiKaydet('liste_satirlari', isleyici)")}: D12'nin ${c('saklama_suresi_isi')} çağırınca dönemin satırlarında numara ve ad silinir, ${c('silinme_ani')} yazılır, satırların sürümü bir kez alınır, işlenen satır sayısı döner (D12-B23). İkinci çağrı 0 döner. D12 işleyiciyi ayrı işlemde çağırır, sayaç adımı işleyicinin son adımıdır. ${c('liste_yuklemeleri')} kişisel veri taşımadığından dokunulmaz.`));
H.push('</div>');

// Durumlar ve kurallar
H.push('<h3>Durumlar ve kurallar</h3>');
for (const sm of K.state_machines) {
  H.push(det(`${esc(sm.name)}: ${esc(sm.states.join(', '))}`, table(['Önce', 'Sonra', 'Yapan', 'Ne zaman'], sm.transitions.map(tr => [c(tr.from), c(tr.to), t(tr.by), t(tr.when)]))));
}
H.push('<div class="callout">');
H.push('<p><strong>Uygula işlemi adım adım</strong> (satirlar ve PATCH aynı iskeleti kullanır)</p>');
H.push(ol([
  `Kökte oturum ve rol (D01 kancası); şube ve ders D02'den; dersin hocası değilse 404.`,
  `${c('D12.islem')} içinde ${c('pg_advisory_xact_lock(3, 1)')} dışlayıcı kilidi; sonra ilgili ${c('sube_listeleri')} satırları kimlik sırasıyla ${c('FOR UPDATE')} (yoksa açılır).`,
  `İşlem anı saat arayüzünden bir kez okunur; kilit denetlenir: D02.kilitDurumu'nun kilit anı bu anla karşılaştırılır, ayrıca arşiv, pasif şube ve deneme dersi.`,
  `Şubenin satırları ve gelen numaraların aynı dersteki başka şube etkin satırları okunur; fark ${c('packages/core/src/listeler/fark.ts')} ile hesaplanır.`,
  `Fark boşsa 200 ZATEN_UYGULANMIS ve çıkış; değilse sürüm, onay ve satır sınırı denetimleri.`,
  `${c('liste_yuklemeleri')} satırı; sırayla pasif yapma (başka şubedekiler dahil), canlandırma, ekleme, ad, sıra ve kaynak; ${c('degisiklik_surumu')} işlem içinde geçici 0.`,
  `${c('sube_listeleri.liste_surumu')} tam 1 artar (şube değişiminde iki şube).`,
  `${c('D09.denetimeYaz')} olayları (numara ve ad yok).`,
  `Dinleyiciler basamak sırasıyla: ESLESTIRME (D01 bekleyen kayıtlar), KARAR (D07 yeniden değerlendirme), HESAP (D08 devam işi).`,
  `Son adım: ${c('D06.surumAl(tx)')} ve inen sütunu değişen satırlara bu sürüm; commit.`
]));
H.push(`<p>Kilit sırası her yazmada aynıdır: danışma kilidi, şube satırları, liste satırları, dinleyicilerin kilitleri ve iş kuyruğu, en son sayaç. Kilitlenme olursa D12'nin bir kez yeniden deneme kuralı (D12-B08) devreye girer; ortak sıra önerisi D03-A10'da.</p>`);
H.push('</div>');
H.push(det('Panelde okuma hattı: dosyadan önizleme isteğine (core işlevleri)', ol([
  `${c('dosya-turu.ts')}: ilk baytlar. ${c('50 4B 03 04')} XLSX; ${c('D0 CF 11 E0 A1 B1 1A E1')} XLS (parolalı .xlsx de bu kaptadır, SheetJS okuyamazsa DOSYA_PAROLALI); BOM ve boşluktan sonra ${c('<')} HTML_XML; kalanı metin. 10 MiB üstü DOSYA_COK_BUYUK, boş dosya DOSYA_BOS.`,
  `Excel ve HTML_XML: panel SheetJS ile okur (HTML tablo ${c('raw: true')} ile, hücreler metin kalır) ve çalışma kitabını hücre tablosuna çevirir: her hücre için biçimli metin, ham değer ve sayı mı bilgisi. ${c('okuma.ts')} SheetJS'i içe aktarmaz.`,
  `Metin: ${c('kodlama.ts')} BOM (UTF-8, UTF-16LE, UTF-16BE), yoksa katı UTF-8, olmazsa windows-1254 (sabit tablo); BOM'suz UTF-16 tanınmaz ve başlık bulunamaz iletisiyle biter. ${c('csv.ts')} RFC 4180 ile ayrıştırır; ayırıcı adayları noktalı virgül, virgül, sekme (D03-B07).`,
  `${c('baslik.ts')}: ilk 20 satırda numara ve ad başlığını birlikte taşıyan ilk satır, sözlük öncelik sırasıyla; ilk sayfada yoksa sonraki sayfalar; bulunamazsa elle eşleme (D03-B06).`,
  `${c('okuma.ts')}: satırları çıkarır; numara hücresinde biçimli metin yalnız rakamsa, değilse tam sayı ham değer; ${c('="..."')} soyulur; ayrı ad ve soyad bir boşlukla birleşir; tamamen boş ve dipnot satırları atlanır, 2.000'den çok dolu satır COK_FAZLA_SATIR.`,
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
H.push(`<p>Ortak (D13): 400 doğrulama, 401 girişsiz, 403 rol, 413 ${c('GOVDE_COK_BUYUK')}, 415 JSON dışı içerik, 429 hız sınırı, 503 yoğunluk.</p>`);
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
H.push('<h3>Netleştirilenler</h3>');
H.push(det(`${K.resolved_gaps.length} boşluk karara bağlandı`, `<div class="rows">\n${K.resolved_gaps.map(g => row(esc(g.gap), `${t(g.decision)}<br>${tag('mute', 'neden')} ${t(g.why)}`)).join('\n')}\n</div>`));
H.push(det(`${K.contradictions_resolved.length} çelişki çözüldü`, `<div class="rows">\n${K.contradictions_resolved.map(x => row(esc(x.id), t(x.resolution))).join('\n')}\n</div>`));

// Açık noktalar
H.push('<h3>Açık noktalar</h3>');
const sahip = K.open_points.filter(o => o.needs_owner), butun = K.open_points.filter(o => !o.needs_owner);
H.push('<div class="callout warn">');
H.push(`<p><strong>Sahibin kararı gerekenler (${sahip.length})</strong>: spec önerilen seçenekle yazıldı, karar değişirse etkilenen yer yanında yazıyor.</p>`);
H.push(`<div class="rows">\n${sahip.map(o => row(`${esc(o.id)} ${tag('warn', 'sahip')}`, `${t(o.question)}<br>${tag('mute', 'öneri')} ${t(o.recommendation)}`)).join('\n')}\n</div>`);
H.push('</div>');
H.push('<div class="callout">');
H.push(`<p><strong>Modüller arası, bütünleştiricinin kararı (${butun.length})</strong></p>`);
H.push(`<div class="rows">\n${butun.map(o => row(esc(o.id), `${t(o.question)}<br>${tag('mute', 'öneri')} ${t(o.recommendation)}`)).join('\n')}\n</div>`);
H.push('</div>');
H.push('</section>');
const html = H.join('\n') + '\n';
ok(!/[\u2013\u2014]/.test(html), 'fragment contains U+2013 or U+2014');

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
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });
fs.writeFileSync(path.join(B, 'spec', 'D03.json'), specTxt + '\n', 'utf8');
fs.writeFileSync(path.join(B, 'frag', 'D03.html'), html, 'utf8');
console.log(`built: ${S.tables.length} tables, ${S.endpoints.length} endpoints, ${S.exports.length} exports, ${S.files.length} files, ${S.tests.length} tests, ${S.resolved_gaps.length} resolved, ${S.contradictions_resolved.length} contradictions, ${S.open_points.length} open points; fragment ${html.length} bytes`);
