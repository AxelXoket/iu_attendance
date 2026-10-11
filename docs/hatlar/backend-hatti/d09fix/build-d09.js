// Builds spec/D09.json and frag/D09.html from one data source, so the two cannot drift.
// Usage: node build-d09.js
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const tables = require('./data-tables');
const endpoints = require('./data-endpoints');
const R = require('./data-rest');

// ---------- spec JSON ----------
const spec = {
  id: 'D09',
  module: 'duzeltmeler',
  summary: R.summary,
  tables: tables.map(t => ({ name: t.name, purpose: t.purpose, columns: t.columns, indexes: t.indexes, constraints: t.constraints })),
  endpoints: endpoints.map(e => ({ method: e.method, path: e.path, client: e.client, auth: e.auth, request: e.request, response: e.response, errors: e.errors, idempotency: e.idempotency, rate_limit: e.rate_limit })),
  jobs: R.jobs,
  state_machines: R.state_machines,
  invariants: R.invariants,
  exports: R.exportsList,
  files: R.files,
  tests: R.tests,
  resolved_gaps: R.resolved_gaps,
  contradictions_resolved: R.contradictions_resolved,
  open_points: R.open_points
};
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.writeFileSync(path.join(B, 'spec', 'D09.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');

// ---------- anchor titles for readable links ----------
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const titles = {};
for (const doc of ['plan', 'teknik', 'tasarim']) {
  const html = fs.readFileSync(REPO + doc + '.html', 'utf8');
  const re = /<([a-zA-Z0-9]+)([^>]*)\sid="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, tag, , id] = m;
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 4000);
    let t = '';
    if (/^h[1-6]$/.test(tag)) t = strip(after.slice(0, after.indexOf('</' + tag)));
    else if (tag === 'section') { const h = after.match(/<h2[^>]*>([\s\S]*?)<\/h2>/); t = h ? strip(h[1]) : ''; }
    else {
      const k = after.match(/^\s*<div class="k">([\s\S]*?)<\/div>/);
      const sm = after.match(/^\s*<summary[^>]*>([\s\S]*?)<\/summary>/);
      if (k) t = strip(k[1]);
      else if (sm) t = strip(sm[1]);
      else { const s = strip(after.slice(0, 300)); const c = s.indexOf(':'); t = c > 0 && c < 60 ? s.slice(0, c) : ''; }
    }
    titles[doc + '#' + id] = t.length > 0 && t.length <= 70 ? t : '';
  }
}
// Tasarım belgesinde kimlik çizim parçasında durduğundan başlık elle verilir.
Object.assign(titles, {
  'tasarim#pnl-drawer': 'Panel, oturum tablosu',
  'tasarim#sh-d': 'Sorun bildir alt sayfası',
  'tasarim#acik-sorun-nedenleri': 'Açık soru 16, sorun bildirme nedeni',
  'tasarim#scr-panel': 'Panel ekranı'
});
const DOCNAME = { plan: 'plan', teknik: 'teknik', tasarim: 'tasarım' };

// ---------- html helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rich = s => esc(s).replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (all, doc, id) => {
  const t = titles[doc + '#' + id];
  return `<a href="${doc}.html#${id}">${DOCNAME[doc]}: ${esc(t || id)}</a>`;
});
const code = s => `<code>${esc(s)}</code>`;
const tr = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
const th = cells => `<tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr>`;
const table = (head, rows) => `<table>\n${th(head)}\n${rows.map(tr).join('\n')}\n</table>`;
const details = (summary, inner, open = false) => `<details${open ? ' open' : ''}><summary>${summary}</summary>\n${inner}\n</details>`;
const ul = items => `<ul>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ul>`;
const row = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;

const out = [];
out.push('<section id="duzeltmeler">');
out.push('<h2>Düzeltme, onay ve sorun bildirimi (D09)</h2>');
out.push(`<p>${rich(R.summary)}</p>`);

// ---------- Amaç ve sınırlar ----------
out.push('<h3>Amaç ve sınırlar</h3>');
out.push('<div class="rows">');
out.push(row('Kapsam', rich("Düzeltmeler ve sebep kodları (plan.html#gun-son-durumlar, plan.html#devam), Kendi beyanı ve İncelemede kararları, işaretli oturumun toplu incelemesi (plan.html#kararlar-kafa-sayisi), ilk kayıt teyidi listesi (plan.html#kararlar-e-posta-gonderimi), sorun bildirimi ve 3 günlük süresi, gece inceleme sıralaması (plan.html#kararlar-supheli-kayit), sonradan değişenler listesi (plan.html#kararlar-gonderme-suresi), bütün modüllerin denetim kaydı (teknik.html#veritabani-donem-alani).")));
out.push(row('Kapsam dışı', rich("Kayıt kararının hesabı ve gerekçe kodları D07'nin; devam hesabı, seviye ve hak uyarısı D08'in; AKSİS anlığı ve Haksız devamsız sayısının raporu D10'un (D09 sebep kodu bayrağını ve olayları verir); teyit alanları ve hesap D01'in; kuyruk taşıma, karar teslim anı ve öğrenci durum sürümü D06'nın.")));
out.push(row('Klasörler', [code('apps/server/src/modules/duzeltmeler/'), code('apps/server/src/jobs/duzeltmeler/'), code('packages/contracts/src/duzeltmeler.ts'), code('packages/core/src/duzeltmeler/'), code('apps/server/test/features/duzeltmeler/'), code('apps/server/test/steps/duzeltmeler/'), code('apps/server/test/support/kurucular/duzeltmeler.ts')].join(', ')));
out.push(row('Sahip olduğu', esc(`${tables.length} tablo, ${endpoints.length} uç, 1 zamanlanmış iş (gece_inceleme_siralamasi), 2 kuyruk öğesi (elle_ekleme, sorun_bildirimi), 2 indirme kaynağı (duzeltmeler, sorun_bildirimleri), 3 saklama işleyicisi (duzeltmeler, sorun_bildirimleri, denetim_kayitlari).`)));
out.push(row('Kayıt deseni', rich("index.ts ve eklenti.ts yüklenirken başka modül çağırmaz; kayıtlar bileşim kökü eklentiyi kurarken yapılır: rota listesi D13.rotalariKaydet, kuyruk öğeleri (OgeIsleyici nesneleri) D06.ogeTuruKaydet, öğrenci kaynakları (OgrenciKaynagi nesneleri) D06.indirmeKaynagiKaydet, saklama işleyicileri D12.saklamaIsleyicisiKaydet, her modülün denetim olay şemaları D09.denetimOlaylariniKaydet; iş tanımı jobs/duzeltmeler/index.ts'ten D14.isTanimla ile worker.ts'e. denetimeYaz, denetimOlaylariniKaydet, duzeltmeleriGetir ve acikSorunBildirimleri yaprak.ts'te durur; D05, D08 ve D10 D09'dan yalnız yaprak.ts'i içe aktarır, dosya düzeyinde döngü kurulmaz (teknik.html#sunucu-mimari, D09-B35).")));
out.push(row('Çağırdığı dış yüzler', esc(R.invariants[R.invariants.length - 1].replace(/^D09 başka modülün tablosuna yazmaz, yalnız şu dış yüzleri çağırır: /, ''))));
out.push(row('Ölçülen sonuç', rich("Hocanın işi: ders başına en çok 2 dakika (plan.html#hedefler; onay ekranı süreleri D15'te). Haksız devamsız 0: D10 raporu D09'un sebep kodu bayrağını ve olaylarını kullanır. Kayıt kaybı oranı: beyana dayalı düzeltmeler kendi koduyla ayrı sayılır. Gece partisinin etkisi: iş her gece dünkü partiden çözülen öğe oranını ve devreden öğe sayısını loglar; oran düşerse parti boyu değiştirilir (D09-B21).")));
out.push(row('Göç', rich("apps/server/migrations/<UTC zaman>_duzeltmeler_<açıklama>/ alt klasörü (klasör D12'nin, içerik tablolar.ts'ten drizzle-kit ile üretilir); yalnız D09'un dört tablosuna dokunur. Yetki REVOKE'ları ve kolon düzeyi UPDATE yetkisi drizzle-kit generate --custom ile elle yazılan ayrı göç dosyasında. CHECK listeleri katalogdan üretildiği için katalog değişikliği yeni göç ister; CI'nın yeniden üretme denetimi kaymayı yakalar.")));
out.push('</div>');

// ---------- Tablolar ----------
out.push('<h3>Tablolar</h3>');
out.push(`<p>${rich("Adlar ASCII Türkçe snake_case, kimlikler UUIDv7 ve varsayılan uuidv7(), anlar timestamptz ve saat arayüzünden, kod listeleri metin ve CHECK (teknik.html#sunucu-mimari). Kayda başvuran her tablo (dönem, kimlik) çiftini kullanır (teknik.html#veritabani-donem-alani).")}</p>`);
const tableSummaries = {
  duzeltmeler: 'duzeltmeler: yalnız eklenen, oturum ve öğrenci başına doğrusal düzeltme zinciri',
  sorun_bildirimleri: 'sorun_bildirimleri: öğrencinin bildirimi, yalnız durum ve kapanış sütunları değişir',
  denetim_kayitlari: 'denetim_kayitlari: bütün modüllerin tek denetim tablosu, yalnız ekleme',
  gunluk_inceleme_partileri: 'gunluk_inceleme_partileri: gece işinin (gün, hoca) partisi, karar değiştirmez'
};
for (const t of tables) {
  const cols = table(['Sütun', 'Tip', 'Boş olabilir', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), esc(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', rich(c.note)]));
  const inner = [`<p>${rich(t.purpose)}</p>`, cols, '<p>Dizinler:</p>', ul(t.indexes.map(i => esc(i))), '<p>Kısıtlar ve yetki:</p>', ul(t.constraints.map(i => rich(i)))].join('\n');
  out.push(details(esc(tableSummaries[t.name] + ` (${t.columns.length} sütun)`), inner));
}

// ---------- Uç noktalar ----------
out.push('<h3>Uç noktalar</h3>');
out.push(`<p>${rich("Bütün uçlar /v1/duzeltmeler önekiyle, JSON alanları camelCase, kod değerleri BÜYÜK_HARF, anlar ISO 8601 UTC metni, 64 bitlik değerler metin. Toplu yazma uçları tek işlemde, kanonik sırayla, öğe başına SAVEPOINT ile çalışır ve 200 içinde D13'ün ogeSonuclariSemasi biçiminde ({ kimlik, sonuc, kod }) öğe başına sonuç döner (D13-B28, D09-B32); 4xx yalnız isteğin tamamı bozuksa (400 API_ISTEK_GECERSIZ, 413 yalnız gövde boyu). Sınıf boyu listeler 2000 satırı aşınca 422 API_SONUC_COK_BUYUK döner, büyüyen listeler keyset sayfalıdır (D13-B13). Kaynak yetkisi yalnız D02.dersYetkisi === 'sahip'; öbür sonuç 404 ya da öğe sonucu DUZELTMELER_BULUNAMADI. Telefonun hoca modu onay ekranlarında aynı uçları çevrimiçi çağırır; kuyruğa giren D09 yazmaları yalnız elle_ekleme ve sorun_bildirimi öğeleridir (D09-B16).")}</p>`);
out.push('<div class="rows">');
for (const e of endpoints) out.push(row(code(`${e.method} ${e.path}`), rich(e.purpose)));
out.push('</div>');
const groups = [...new Set(endpoints.map(e => e.group))];
const groupSummary = {
  'Düzeltmeler': 'Düzeltmeler: yazma, geçmiş ve geri alma (3 uç)',
  'Onay listeleri': 'Onay listeleri: özet, Kendi beyanı, teyit, İncelemede, işaretli oturum (9 uç)',
  'Sorun bildirimleri': 'Sorun bildirimleri: hocanın listesi ve kapatma (2 uç)',
  'Sonradan değişenler ve denetim': 'Sonradan değişenler ve denetim kaydı okuma (2 uç)'
};
for (const gname of groups) {
  const parts = [];
  for (const e of endpoints.filter(x => x.group === gname)) {
    parts.push(`<p><strong>${code(e.method + ' ' + e.path)}</strong> · istemci: ${esc(e.client)}</p>`);
    const rows = [];
    rows.push(['Yetki', rich(e.auth)]);
    for (const [k, v] of Object.entries(e.request)) rows.push(['İstek ' + code(k), rich(v)]);
    for (const [k, v] of Object.entries(e.response)) rows.push(['Cevap ' + code(k), rich(v)]);
    rows.push(['Hatalar', e.errors.map(x => esc(x)).join('; ')]);
    rows.push(['Tekrar', rich(e.idempotency)]);
    rows.push(['Hız sınırı', rich(e.rate_limit)]);
    parts.push(table(['Alan', 'Kural'], rows));
  }
  out.push(details(esc(groupSummary[gname]), parts.join('\n')));
}
const kuyruk = [
  [code('elle_ekleme'), rich("roller [PERSONEL], oturumGerekli true, govdeEnBuyukBayt 1024; hoca rolü D01.personelRolleri ile"), rich("{ id: UUIDv7 (satır kimliği), oturumId, listeSatiriId, sebepKodu: TELEFON_YOK_CALISMIYOR | QR_OKUTAMADI, teoriSaat: tam sayı ya da null, uygulamaSaat: tam sayı ya da null }"), rich("POST /v1/duzeltmeler ile aynı kurallar ve aynı danışma kilidi; kaynak TELEFON_KUYRUGU; hoca rolü yoksa RET DUZELTMELER_YETKI_YOK; zincirde etkin düzeltme varsa RET DUZELTMELER_DUZELTME_VAR ve duzeltmeler.elle_ekleme_reddedildi olayı; birim dönemi kilitli ve gün sonu anlığı yoksa TEKRAR_DENE DUZELTMELER_ANLIK_BEKLENIYOR, beklemeSaniye 600. ayrinti: { duzeltmeId, sonDurum } ya da { kod }.")],
  [code('sorun_bildirimi'), rich("roller [OGRENCI], oturumGerekli true, govdeEnBuyukBayt 1024"), rich("{ id: UUIDv7, oturumId, kayit: { donemId, kayitId } ya da null, kararSurumu: tam sayı (en az 1) ya da null, nedenKodu: TELEFON_YOK_CALISMIYOR | QR_OKUTAMADI | KAYIT_YANLIS_DERSTE }"), rich("Oturum başlamamışsa RET DUZELTMELER_OTURUM_BASLAMADI. Öğrenci oturuma oturum başlangıcındaki etkin liste satırıyla ya da o oturumdaki kendi kaydıyla bağlı olmalı; kayit verilmişse öğrencinin ve oturumun kaydı olmalı; değilse RET DUZELTMELER_BULUNAMADI. Açık bildirim varsa RET DUZELTMELER_ACIK_BILDIRIM_VAR; son kapanıştan sonra değişiklik yoksa RET DUZELTMELER_BILDIRIM_TEKRARI. Süre dışıysa KABUL ve ayrinti.bilgi DUZELTMELER_SURE_DISI, durum SURE_DISI. ayrinti: { bilgi, durum } ya da { kod }.")]
];
out.push(details(esc('Kuyruk öğeleri ve indirme kaynakları (POST /v1/esitleme/gonderim ve GET /v1/esitleme/degisiklikler, D06)'),
  [table(['Öğe türü', 'OgeIsleyici kaydı', 'Gövde (packages/contracts/src/duzeltmeler.ts)', 'Kural'], kuyruk),
   `<p>${rich("İşleyiciler isle(tx, oge: GelenOge, baglam: PaketBaglami) ile çağrılır; kişi ve kurulum baglam'dan gelir. Öğe sonucu D06'nın sözlüğüyle döner (KABUL, ZATEN_VAR, RET, TEKRAR_DENE). Aynı öğe kimliği ve aynı istek özeti ZATEN_VAR, farklı özet RET DUZELTMELER_KIMLIK_CAKISMASI (D09-B30); oge.onceki doluysa saklanan sonuç yeni olay yazılmadan döner. İşlem anı D04 saatSonucu ile ilk ve ikinci çapadan hesaplanan aralıktır (istemci_ani_alt, istemci_ani_ust, saat_kaynagi), çapa yoksa ulaşma anı; ulaşma anı GelenOge.ulasmaAni'dir (makbuzla gelen öğede makbuz anı). D09-B36.")}</p>`,
   `<p>${rich("Öğrenci kaynakları (D06.indirmeKaynagiKaydet, OgrenciKaynagi tipi, bolum(tx, ogrenciId, { surumden, surumeKadar }), tam: true): duzeltmeler (ogrencininDuzeltmeleri: öğrencinin hesabından numara, D03.ogrencininSatirlari ile pasifler dahil bütün liste satırları, açık dönemlerdeki bütün zincir satırları; belge numarası, yapan ve kaynak yok) ve sorun_bildirimleri (ogrencininSorunBildirimleri; kapatan yok). D06 yalnız öğrencinin durum sürümü değişince ister (contracts.json 'Öğrencinin kendi durumu' kararı, D09-B37).")}</p>`].join('\n')));

// ---------- İşler ----------
out.push('<h3>İşler</h3>');
for (const j of R.jobs) {
  const steps = j.does.split(/\s(?=\d\)\s)/).map(s => s.replace(/^\d\)\s/, ''));
  out.push('<div class="rows">');
  out.push(row(code(j.name), rich(j.schedule)));
  out.push(row('Tekrar güvenliği', rich(j.idempotency)));
  out.push(row('Yaptığı', `<ol>\n${steps.map(s => `<li>${rich(s)}</li>`).join('\n')}\n</ol>`));
  out.push('</div>');
}

// ---------- Durumlar ve kurallar ----------
out.push('<h3>Durumlar ve kurallar</h3>');
out.push(`<p>${rich("Son durum önceliği (sonDurumOnceligi, packages/core/src/duzeltmeler/son-durum.ts); kural plan.html#gun-son-durumlar ve tasarim.html#pnl-drawer ile aynı:")}</p>`);
out.push(`<ol>\n${[
  "Oturum için 'yapılmadı' denmişse son durum yok, saatler sayılmaz.",
  "Kayıt durumu D05'in sayılan kaydından gelir (her kaydı olan öğrencide tam bir sayılan vardır, Ret de olabilir): karar Var ise Var (onaysız Kendi beyanında geçici), Beklemede ya da İncelemede ise boş ve saatler açık, Ret ise ya da hiç kayıt yoksa Yok. Sayılanı sıfır ya da iki olan dolu girdi hatadır.",
  "Zincirin etkin satırı (son satır DUZELTME) varsa kapsadığı saatler kodun son durumunu alır (Görevli ve Belgeli mazeretli, Elle eklendi var, yoklamada sınıfta değil yok).",
  "Kapsanmayan saatler kodun saat sınıfına göre: Var sınıfı kodda (Elle eklendi) Yok, Mazeretli ve Yok sınıfı kodda kayıt durumuna gider. Örnek: 3 saatlik Var kayıt ve 2 saatlik Elle eklendi 2 var 1 yok (plan.html#kararlar-kafa-sayisi, Blok ders); 3 saatlik Var kayıt ve 2 saatlik Görevli 2 mazeretli 1 var.",
  "Sonuç teori ve uygulama için ayrı döner: tür son durumu o türde kapsanan saat varsa kodun son durumu, yoksa kapsanmayan saatlerin durumu (öğrenci işleri yazısında uygulama türü kayda göre kalır). Tür başına var, yok, mazeretli ve açık saatlerinin toplamı oturumun o türdeki saatine eşittir; Devamdan muaf ders düzeyinde D08 ve D10'da uygulanır.",
  "Harfler: V, Y, G, B, E (M ders düzeyinde); kod ile harf ve saat sınıfı tablosu katalogdadır."
].map(s => `<li>${rich(s)}</li>`).join('\n')}\n</ol>`);
out.push(details(esc('Sebep kodu kataloğu: her kod tek son duruma bağlı, CHECK ve Zod buradan türer'),
  table(['Kod', 'Son durum', 'Harf', 'Belge no', 'Saat türü', 'Kapsanmayan saatler (saat sınıfı)', 'Haksız devamsız sayımı', 'Kuyrukta', 'Dayanak'],
    R.sebepKodlari.map(s => [code(s.kod), code(s.sonDurum), esc(s.harf), esc(s.belge), esc(s.saat), esc(s.kalan), esc(s.haksiz), esc(s.kuyruk), rich(s.kaynak)]))));
out.push(details(esc('Sorun bildirimi neden kodları ve önerilen sebep kodu (D09-A05)'),
  table(['Kod', 'Telefondaki metin', 'Önerilen sebep kodu'], R.nedenKodlari.map(n => [code(n.kod), esc(n.metin), /^[A-Z_]+$/.test(n.oneri) ? code(n.oneri) : esc(n.oneri)]))));
out.push(`<div class="callout"><p>${rich("Sorun bildirimi süresi 72 saattir. Kayda bağlı bildirimde sunucu kaydın güncel karar sürümünü okur ve o sürümün telefona ulaştığı andan (D06.kararTeslimAni) başlatır; o sürüm hiç teslim edilmediyse ulaşma anından; istemcinin gönderdiği sürüm yalnız izdir. Kayıtsız bildirimde oturumun bitişinden başlar. Bildirim anı D04 saatSonucu aralığının alt ucudur, çapa yoksa ulaşma anı. Alt uç bitişten önceyse ACIK, değilse SURE_DISI (plan.html#kararlar-supheli-kayit, tasarim.html#sh-d, D09-B17).")}</p></div>`);
for (const sm of R.state_machines) {
  out.push(details(esc(sm.name + ': ' + sm.states.join(', ')),
    table(['Önce', 'Sonra', 'Tetik', 'Koşul'], sm.transitions.map(x => [code(x.from), code(x.to), rich(x.by), rich(x.when)]))));
}
out.push(details(esc(`Değişmezler (${R.invariants.length}): her an doğru olması gerekenler`), ul(R.invariants.map(rich))));
out.push(details(esc('Denetim olay türleri (duzeltmeler.*, packages/contracts/src/duzeltmeler.ts)'),
  table(['Olay türü', 'Ne zaman, ne taşır'], R.denetimOlaylari.map(([k, v]) => [code(k), rich(v)]))));
out.push(details(esc('Dış yüz: D09\'un başka modüllere verdiği işlevler'),
  table(['Ad', 'İmza', 'Amaç'], R.exportsList.map(x => [code(x.name), code(x.signature), rich(x.purpose)]))));

// ---------- Hata kodları ----------
out.push('<h3>Hata kodları</h3>');
out.push(`<p>${rich("Kodlar packages/contracts/src/duzeltmeler.ts içinde DUZELTMELER_ önekiyle tanımlanır, hatalar.ts birleştirir (D13). Şema hatası (400 API_ISTEK_GECERSIZ), gövde boyu (413 API_GOVDE_COK_BUYUK), büyük liste (422 API_SONUC_COK_BUYUK), 401, 403, 415, 429 ve 503 D13'ün ortak kodlarıdır; D09 bunların eşini tanımlamaz. Her kodun tek HTTP durumu vardır; toplu uçların 200 cevabında aynı kod öğe sonucu olarak da döner. Her kod en az bir senaryoda gerçekten döner.")}</p>`);
out.push(details(esc(`Hata kodu kataloğu (${R.hataKodlari.length} kod)`), table(['Kod', 'Nerede', 'Ne zaman'], R.hataKodlari.map(h => [code(h.kod), esc(h.nerede), rich(h.ne)]))));

// ---------- Testler ----------
out.push('<h3>Testler</h3>');
out.push(`<p>${rich("Davranış senaryoları Cucumber.js ve Türkçe Gherkin ile apps/server/test/features/duzeltmeler/ altında, ret beklentisiyle önce kırmızı yazılır; uygulama yayın rolleriyle bağlanır, veri kurucular sahip rolle (teknik.html#testler, D12-B35). Ortak kurallar Vitest ve fast-check ile, deneme sayısı açık yazılır (teknik.html#testler-birim). Korumalar (yetki, zincir dizini, kafa sayısı gizleme) bilerek bozulup testin kırmızıya döndüğü görülür; yokluk iddia eden her testin dolu çıktılı bir pozitif kontrolü vardır.")}</p>`);
const kindName = { behavior: 'Davranış', property: 'Özellik', contract: 'Sözleşme', load: 'Yük', mutation: 'Mutasyon' };
for (const k of ['behavior', 'property', 'contract', 'load', 'mutation']) {
  const ts = R.tests.filter(x => x.kind === k);
  out.push(details(esc(`${kindName[k]} testleri (${ts.length})`), table(['Ad', 'Doğruladığı'], ts.map(x => [esc(x.name), rich(x.asserts)]))));
}

// ---------- Netleştirilenler ----------
out.push('<h3>Netleştirilenler</h3>');
const envanterGap = R.resolved_gaps.filter(x => Number(x.gap.slice(5)) <= 29).length;
out.push(`<p>${esc(`Envanterdeki ${envanterGap} boşluğun her biri kararla kapandı; inceleme turunda ${R.resolved_gaps.length - envanterGap} karar eklendi (D09-B30 ve sonrası). Sahibin kararını gerektirenler ara kararla yürür ve Açık noktalar'da sorulur. ${R.contradictions_resolved.length} çelişki aşağıda.`)}</p>`);
out.push(details(esc(`Boşluklar (${R.resolved_gaps.length}): karar ve gerekçe`), table(['Boşluk', 'Karar', 'Neden'], R.resolved_gaps.map(x => [code(x.gap), rich(x.decision), rich(x.why)]))));
out.push(details(esc(`Çelişkiler (${R.contradictions_resolved.length}): nasıl uzlaştı`), table(['Çelişki', 'Çözüm'], R.contradictions_resolved.map(x => [code(x.id), rich(x.resolution)]))));

// ---------- Açık noktalar ----------
out.push('<h3>Açık noktalar</h3>');
out.push('<div class="callout warn">');
out.push(ul(R.open_points.map(x => `<span class="tag ${x.needs_owner ? 'warn' : 'mute'}">${x.needs_owner ? 'Sahibin kararı' : 'Modüller arası'}</span> <strong>${esc(x.id)}</strong> ${rich(x.question)}<br>Öneri: ${rich(x.recommendation)}`)));
out.push('</div>');
out.push('</section>');

const html = out.join('\n') + '\n';
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });
fs.writeFileSync(path.join(B, 'frag', 'D09.html'), html, 'utf8');
const missing = Object.entries(titles).filter(([, v]) => !v).length;
console.log('spec bytes', fs.statSync(path.join(B, 'spec', 'D09.json')).size, 'frag bytes', html.length, 'anchors without title', missing);
