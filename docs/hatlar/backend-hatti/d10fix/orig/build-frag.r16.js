// Renders frag/D10.html from spec/D10.json. Deterministic: same JSON, same HTML.
// Run: node build-frag.js
const fs = require('fs'), path = require('path');
const S = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spec', 'D10.json'), 'utf8'));
const OUT = path.join(__dirname, '..', 'frag', 'D10.html');

const LABEL = {
  'plan.html#tek-bakista': 'plan: Tek bakışta',
  'plan.html#gun-kayit-etiketleri': 'plan: Kayıt etiketleri',
  'plan.html#gun-son-durumlar': 'plan: Son durumlar',
  'plan.html#devam': 'plan: Devamsızlık hesabı',
  'plan.html#devam-donem-sonu': 'plan: Dönem sonu',
  'plan.html#devam-uyari-seviyeleri': 'plan: Uyarı seviyeleri',
  'plan.html#hedefler': 'plan: Hedefler',
  'plan.html#hoca': 'plan: Hoca ve yönetici',
  'plan.html#hoca-liste-yukleme': 'plan: Liste yükleme kuralları',
  'plan.html#acik-sayim-tabani': 'plan: Açık noktalar, sayım tabanı',
  'plan.html#acik-aksis': 'plan: Açık noktalar, AKSİS',
  'plan.html#acik-saklama-suresi': 'plan: Açık noktalar, saklama süresi',
  'plan.html#kararlar-gonderme-suresi': 'plan: Gönderme süresi',
  'plan.html#kararlar-kafa-sayisi': 'plan: Kafa sayısı',
  'plan.html#kararlar-hesap-silme': 'plan: Hesap silme',
  'plan.html#kararlar-olcum': 'plan: Ölçüm',
  'plan.html#baslangic': 'plan: Başlangıç',
  'plan.html#sozluk': 'plan: Sözlük',
  'plan.html#teknoloji-sunucu-yeri': 'plan: Sunucu yeri',
  'teknik.html#sunucu-mimari': 'teknik: Mimari',
  'teknik.html#panel-excel': 'teknik: Excel ve PDF',
  'teknik.html#panel-cati': 'teknik: Panel çatısı',
  'teknik.html#testler-birim': 'teknik: Birim ve özellik testleri',
  'teknik.html#temel-yedek-paketler': 'teknik: Yedek paketler',
  'teknik.html#sunucu-ayarlar': 'teknik: Ayarlar',
  'teknik.html#veritabani-donem-alani': 'teknik: Dönem alanı',
  'teknik.html#testler-veritabani-sifirlama': 'teknik: Veritabanı sıfırlama',
  'teknik.html#kod-veri-modeli': 'teknik: Veri modeli',
  'tasarim.html#panel': 'tasarım: Panel ekranı',
  'tasarim.html#tipografi': 'tasarım: Tipografi',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Rich text: escape, wrap identifiers in <code>, turn doc anchors into links (placeholders keep them out of the code pass).
function rich(s) {
  const links = [], spans = [];
  const SPAN = '\u0001', LINK = '\u0002';
  let t = String(s).replace(/`([^`]+)`/g, (m, x) => { spans.push(x); return SPAN + (spans.length - 1) + SPAN; });
  t = t.replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (m) => { links.push(m); return LINK + (links.length - 1) + LINK; });
  t = esc(t);
  t = t.replace(/\b(?:apps|packages|d10spec)\/[A-Za-z0-9_./&;*-]+/g, m => '<code>' + m + '</code>');
  t = t.replace(/(^|[^\w/>])([a-z][a-z0-9]*(?:_[a-z0-9]+)+)(?![\w<])/g, (m, p, x) => p + '<code>' + x + '</code>');
  t = t.replace(/(^|[^\w/>])([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?![\w<])/g, (m, p, x) => p + '<code>' + x + '</code>');
  t = t.replace(/(^|[^\w/>.-])([A-Za-z][\w-]*\.(?:ts|js|json|feature))(?![\w<])/g, (m, p, x) => p + '<code>' + x + '</code>');
  t = t.replace(new RegExp(SPAN + '([0-9]+)' + SPAN, 'g'), (m, i) => '<code>' + esc(spans[+i]) + '</code>');
  t = t.replace(new RegExp(LINK + '([0-9]+)' + LINK, 'g'), (m, i) => { const href = links[+i]; return '<a href="' + href + '">' + esc(LABEL[href] || href) + '</a>'; });
  if (/[\u0000-\u0008]/.test(t)) throw new Error('placeholder left in: ' + t.slice(0, 80));
  return t;
}
const code = s => `<code>${esc(s)}</code>`;
const row = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;
const table = (head, rows) => `<table><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const details = (summary, body) => `<details><summary>${summary}</summary>${body}</details>`;
const ul = items => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;

const parts = [];
parts.push(`<section id="${S.module}">`);
parts.push(`<h2>Raporlar ve AKSİS özeti</h2>`);
parts.push(`<p>${rich(S.summary)}</p>`);

// ---------- Amaç ve sınırlar ----------
parts.push(`<h3>Amaç ve sınırlar</h3>`);
parts.push(`<div class="rows">${[
  row('Amaç', rich('Hocanın panelindeki Raporlar ve AKSİS özeti sayfalarını besler (plan.html#hoca, tasarim.html#panel): ders raporu, öğrenci raporu, şube başına AKSİS özeti, AKSİS özeti çıktısının kaydı ve yöneticinin dönem sonu raporu. Ekran, Excel ve baskı aynı JSON cevaptan çizilir. Oturum tablosundaki "Excel olarak indir" düğmesi ders raporunu o ders ve günle (baslangic = bitis) açar (tasarim.html#panel).')),
  row('Yazdığı', rich('Yalnız aksis_ozet_anliklari ve aksis_ozet_anligi_satirlari (contracts.json AKSİS anlığı kararı). teknik.html#sunucu-mimari içindeki "tabloları yalnız okur" istisnası başka modüllerin tablolarına erişimi anlatır; D10 başka modülün tablosuna hiç yazmaz. Göç D12\'nin tek klasöründe, `apps/server/migrations/<UTC zaman>_raporlar_<açıklama>/` altında, yalnız bu iki tabloya dokunur; tablo tanımı `modules/raporlar/tablolar.ts` içinde.')),
  row('Okuduğu', rich('Rapor ve AKSİS özeti için başka modüllerin tablolarını yalnız okur (teknik.html#sunucu-mimari istisnası); okumaların hepsi okunan-tablolar.ts dosyasında, sahiplerin tablolar.ts tanımlarıyla tipli, rapor uçlarında READ ONLY işlemde. Değer hesaplamaz: sayılar ve kararlar D08\'den gelir.')),
  row('Üretmediği', rich('Dosya ve AKSİS bağlantısı yok: .xlsx ve baskıyı panel SheetJS ve tarayıcıyla üretir (teknik.html#panel-excel), sunucu PDF ya da Excel üretmez; değerleri AKSİS\'e hoca elle girer (plan.html#tek-bakista). CSV indirme yok.')),
  row('Ölçülen sonuç', rich('Haksız devamsız 0 ve özetin elle hesapla uyuşmazlığı 0 (plan.html#hedefler): dönem sonu raporu birincisini birim ve dönem için sayar, altın tablo ve toplam eşitliği testleri ikincisini kanıtlar. Her rapor isteği rota kalıbı, süre, satır ve oturum sayısıyla loglanır; gece işi alınan ve bekleyen şube sayısını yazar.')),
  row('Saat ve tarih', rich('Tek "şimdi" bileşim kökünün verdiği saat arayüzünden gelir; SQL now() yok (teknik.html#testler-veritabani-sifirlama). Tarihler YYYY-AA-GG İstanbul günü, anlar UTC ISO; İstanbul günü SQL\'de AT TIME ZONE \'Europe/Istanbul\' ile bulunur. Ekranda ve dosyada İstanbul saati ve Türkçe biçim (plan.html#hoca).')),
  row('Dış yüz', S.exports.map(e => `${code(e.signature)}<br>${rich(e.purpose)}`).join('<br><br>')),
].join('')}</div>`);
parts.push(details(`Kullandığı dış yüzler ve okuduğu tablolar: ${S.consumes.length} kaynak, yalnız contracts.json listesindeki dış yüzler`,
  table(['Kaynak', 'Ne için'], S.consumes.map(c => [rich(c.module), rich(c.uses)]))));
parts.push(details(`Dosyalar: ${S.files.length} dosya, hepsi D10 klasörlerinde (modül, iş, sözleşme, ortak paket, test)`, ul(S.files.map(f => code(f)))));

// ---------- Tablolar ----------
parts.push(`<h3>Tablolar</h3>`);
parts.push(`<p>${rich('İki tablo da yalnız eklenir ve okunur; uygulama rollerinin UPDATE, DELETE ve TRUNCATE yetkisi göçte kaldırılır. Satırlar saklama süresi dolunca D12\'nin saklama işinde, D10\'un kaydettiği işleyiciyle silinir. Veri sınıfı aksis_ozet_anliklari kendi adıyla kaydolur, varsayılan süresi yoklama kayıtlarınınkiyle aynıdır (plan.html#acik-saklama-suresi); hesap silinince anlık kalır, itirazda kanıttır (plan.html#kararlar-hesap-silme).')}</p>`);
for (const t of S.tables) {
  const cols = table(['Sütun', 'Tip', 'Boş olabilir', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), code(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', rich(c.note)]));
  const body = `<p>${rich(t.purpose)}</p>${cols}<p><strong>Dizinler</strong></p>${ul(t.indexes.map(rich))}<p><strong>Kısıtlar ve yetki</strong></p>${ul(t.constraints.map(rich))}`;
  parts.push(details(`${code(t.name)}: ${t.columns.length} sütun, ${esc(t.name === 'aksis_ozet_anliklari' ? 'anlığın başlığı, kaynak GUN_SONU ya da HOCA_CIKTISI' : 'anlıktaki öğrenci satırları, liste satırına bağlı')}`, body));
}

// ---------- Uç noktalar ----------
parts.push(`<h3>Uç noktalar</h3>`);
const short = {
  'GET /v1/raporlar/dersler/{dersId}': 'Ders raporu: satır öğrenci, sütun oturum, hücre tür başına son durum ve saat.',
  'GET /v1/raporlar/ogrenciler/{ogrenciId}': 'Öğrenci raporu: hocanın aynı dönemdeki derslerinde öğrencinin oturumları.',
  'GET /v1/raporlar/subeler/{subeId}/aksis-ozeti': 'AKSİS özeti: liste sırasıyla tür başına saat, yüzde, karar, Sonuç, KARAR BEKLİYOR, işaretler, çıktı durumu ve ozetOzeti.',
  'POST /v1/raporlar/subeler/{subeId}/aksis-ozeti/ciktilar': 'Excel ya da baskı öncesi çıktı kaydı: engel ve özet denetimi, dönem sonu penceresinde HOCA_CIKTISI anlığı.',
  'GET /v1/raporlar/donem-sonu': 'Dönem sonu raporu: birim ve dönem için Haksız devamsız ve mazeretli dönüş, isimsiz.',
};
parts.push(`<div class="rows">${S.endpoints.map(e => row(code(`${e.method} ${e.path}`), rich(short[`${e.method} ${e.path}`] || ''))).join('')}</div>`);
for (const e of S.endpoints) {
  const req = table(['Alan', 'Tip ve kural'], Object.entries(e.request).map(([k, v]) => [code(k), rich(v)]));
  const res = table(['Alan', 'Tip'], Object.entries(e.response).map(([k, v]) => [code(k), rich(v)]));
  const body = `<div class="rows">${[
    row('İstemci', esc(e.client)),
    row('Kim çağırır', rich(e.auth)),
    row('Hatalar', e.errors.map(rich).join(', ')),
    row('Tekrar', rich(e.idempotency)),
    row('Hız sınırı', rich(e.rate_limit)),
  ].join('')}</div><p><strong>İstek</strong></p>${req}<p><strong>Cevap</strong></p>${res}`;
  parts.push(details(`${code(`${e.method} ${e.path}`)}: ${rich(short[`${e.method} ${e.path}`] || '')}`, body));
}

// ---------- İşler ----------
parts.push(`<h3>İşler</h3>`);
for (const j of S.jobs) {
  parts.push(`<div class="rows">${[
    row('Ad', code(j.name)),
    row('Zamanlama', rich(j.schedule)),
    row('Tekrar', rich(j.idempotency)),
    row('Ne yapar', rich(j.does)),
  ].join('')}</div>`);
}

// ---------- Durumlar ve kurallar ----------
parts.push(`<h3>Durumlar ve kurallar</h3>`);
parts.push(details(`Hücre kodları: altı harf planın, dört ek durumun işareti açık nokta D10-A01`,
  `<p>${rich('Hücre önceliği: oturum düzeyi (YAPILMADI, CEVAP_BEKLIYOR), sonra D08 satırı yoksa KAPSAM_DISI, sonra muaf öğrencide MUAF, sonra D08 son durumu. Harfler ve açıklama tek tablodan, packages/core/src/raporlar/harfler.ts (plan.html#gun-son-durumlar).')}</p>` +
  table(['Kod', 'Harf', 'Ne zaman'], S.cell_codes.map(c => [code(c.kod), rich(c.harf), rich(c.ne)]))));
parts.push(details(`Geçici nedenleri: altı kod, ikisi planın koşulu, dördü öneri (D10-A03); kilit uygulanınca hiçbiri`,
  table(['Kod', 'Ne zaman', 'Dayanak'], S.provisional_reasons.map(r => [code(r.kod), rich(r.ne), rich(r.kaynak)]))));
for (const sm of S.state_machines) {
  parts.push(details(`${esc(sm.name)}: ${sm.states.map(esc).join(', ')}`,
    table(['Önce', 'Sonra', 'Kim', 'Ne zaman'], sm.transitions.map(t => [code(t.from), code(t.to), rich(t.by), rich(t.when)]))));
}
parts.push(details(`Değişmezler: ${S.invariants.length} kural, her biri bir testle korunur`, ul(S.invariants.map(rich))));

// ---------- Hata kodları ----------
parts.push(`<h3>Hata kodları</h3>`);
parts.push(details(`${S.error_codes.length} RAPORLAR_ kodu; başka hocanın kaynağı 404 ile gizlenir, 409 yalnız panel işlemlerinde`,
  `<p>${rich('Kodlar packages/contracts/src/raporlar.ts içinde RAPORLAR_ önekiyle, hata zarfı ve ortak kodlar D13\'ün. Hata cevabı numara, isim ya da gelen değer taşımaz.')}</p>` +
  table(['Kod', 'HTTP', 'Ne zaman'], S.error_codes.map(e => [code(e.kod), String(e.http), rich(e.ne)]))));

// ---------- Testler ----------
parts.push(`<h3>Testler</h3>`);
const kinds = ['behavior', 'contract', 'property', 'load', 'mutation'];
const kindTr = { behavior: 'davranış', contract: 'sözleşme', property: 'özellik', load: 'yük', mutation: 'mutasyon' };
const count = kinds.map(k => `${S.tests.filter(t => t.kind === k).length} ${kindTr[k]}`).join(', ');
parts.push(`<p>${rich('Davranış senaryoları Türkçe Gherkin ile apps/server/test/features/raporlar/ altında, gerçek PostgreSQL ve sahte saatle; ortak paket testleri Vitest ve fast-check ile, Intl bilerek hata atarken de. Bir şeyin olmadığını doğrulayan her testin olumlu kontrolü vardır; koruma iddia eden her test bir kez bilerek bozulup kırmızıya döndüğü görülür.')}</p>`);
parts.push(details(`${S.tests.length} test: ${count}`, table(['Ad', 'Tür', 'Doğruladığı'], S.tests.map(t => [rich(t.name), esc(kindTr[t.kind]), rich(t.asserts)]))));

// ---------- Netleştirilenler ----------
parts.push(`<h3>Netleştirilenler</h3>`);
parts.push(details(`${S.resolved_gaps.length} boşluk karara bağlandı; sahibe soru gerektirenler Açık noktalarda`,
  table(['Boşluk', 'Karar', 'Neden'], S.resolved_gaps.map(g => [code(g.gap), rich(g.decision), rich(g.why)]))));
parts.push(details(`${S.contradictions_resolved.length} çelişki çözüldü; plan ve teknik metniyle sessizce çelişen karar yok`,
  table(['Çelişki', 'Çözüm'], S.contradictions_resolved.map(c => [code(c.id), rich(c.resolution)]))));

// ---------- Açık noktalar ----------
parts.push(`<h3>Açık noktalar</h3>`);
const ownerN = S.open_points.filter(o => o.needs_owner).length;
parts.push(`<p>${esc(`${S.open_points.length} açık nokta: ${ownerN} sahibin kararı, ${S.open_points.length - ownerN} modüller arası arayüz. Her birinde sunucu önerilen varsayılanla kurulur; karar değişirse sözleşme yalnız ekleyerek büyür.`)}</p>`);
parts.push(`<div class="rows">${S.open_points.map(o => row(`${esc(o.id)} <span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahip' : 'modüller arası'}</span>`, `${rich(o.question)}<br><strong>Öneri:</strong> ${rich(o.recommendation)}`)).join('')}</div>`);

parts.push(`</section>`);
const html = parts.join('\n') + '\n';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('wrote', OUT, html.length, 'bytes');
