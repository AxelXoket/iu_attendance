// Builds spec/D02.json and frag/D02.html from the four data parts, after self-checks.
// Deterministic: same data, same output. Run: node build.js
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..', '..');
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const INV = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D02.json'), 'utf8'));
const mod = C.modules.find(m => m.id === 'D02');
const tables = require('./p1-tablolar.js');
const endpoints = require('./p2-uclar.js');
const P3 = require('./p3-isler.js');
const P4 = require('./p4-netlik.js');

const spec = {
  id: 'D02',
  module: mod.name,
  summary: "D02 (dersler) birimi, bölümü, genel dönemi, birim takvimini, birim ve dönem kilidini, dersi, şubeyi ve haftalık programı tutar; oturumları programdan dönemin tamamı için önceden üretir ve her değişiklikte yalnız başlamamış oturumları saf bir plan fonksiyonuyla yeniden hesaplayıp farkı yazar. Oturum bir program saatinin tek buluşmasıdır ve hiç silinmez: iptal, taşıma, telafi, tek oturum düzenlemesi ve \"Ders yapıldı mı?\" cevabı oturum satırında ve değişiklik geçmişinde iz bırakır, sayımı D08 ve D10 oturum durumundan okur. Yerel program saati UTC ana PostgreSQL'in saat dilimi verisiyle (AT TIME ZONE 'Europe/Istanbul') çevrilir; kilit dahil kural taşıyan her an bileşim kökünün verdiği saat arayüzünden gelir, kilit anı son günün ertesi 00:00 İstanbul'dur. Pencere hesabı (D04) üretim dinleyicisi, kilit kapanışı (D07) kilit adımı olarak D02'ye kaydolur; telefona inen beş tablo D06'nın tek sürümüyle damgalanır ve D02'nin indirme kaynağıyla kullanıcının kapsamına göre iner. Ürün kararı isteyen 11 soru önerilen varsayılanla açık noktada bekliyor; 3 sözleşme eki (liste kaynağı, deneme dersi kurulumu, dönem arası) contracts.json'a işlenmeli.",
  tables,
  endpoints,
  jobs: P3.jobs,
  state_machines: P3.state_machines,
  invariants: P3.invariants,
  exports: P3.exports,
  files: P3.files,
  tests: P4.tests,
  resolved_gaps: P4.resolved_gaps,
  contradictions_resolved: P4.contradictions_resolved,
  open_points: P4.open_points,
};

// ---------- self-checks ----------
const errs = [];
const eq = (a, b, what) => { const A = [...a].sort(), Bs = [...b].sort(); const miss = Bs.filter(x => !A.includes(x)), extra = A.filter(x => !Bs.includes(x)); if (miss.length || extra.length) errs.push(`${what}: eksik ${JSON.stringify(miss)} fazla ${JSON.stringify(extra)}`); };
eq(tables.map(t => t.name), mod.owns_tables, 'tablolar');
eq(endpoints.map(e => `${e.method} ${e.path}`), mod.owns_endpoints, 'uçlar');
eq(P3.jobs.map(j => j.name), mod.owns_jobs, 'işler');
const exportNames = spec.exports.map(x => x.name);
for (const ex of mod.exports) { const n = ex.split('(')[0].trim(); if (!exportNames.includes(n)) errs.push('sözleşme dış yüzü eksik: ' + n); }
// every gap exactly once
const gapIds = INV.gaps.map(g => g.id);
const seen = {};
for (const r of spec.resolved_gaps) seen[r.gap] = (seen[r.gap] || 0) + 1;
for (const o of spec.open_points) { const m = o.question.match(/^(D02-B\d\d):/); if (m) seen[m[1]] = (seen[m[1]] || 0) + 1; }
for (const id of gapIds) if (seen[id] !== 1) errs.push(`boşluk ${id} ${seen[id] || 0} kez ele alındı (1 olmalı)`);
for (const id of Object.keys(seen)) if (!gapIds.includes(id)) errs.push('bilinmeyen boşluk ' + id);
// gaps the inventory marked needs_owner must be open points with needs_owner true
for (const g of INV.gaps.filter(g => g.needs_owner)) { const o = spec.open_points.find(o => o.question.startsWith(g.id + ':')); if (!o || !o.needs_owner) errs.push(`sahip kararı isteyen ${g.id} açık noktada değil`); }
eq(spec.contradictions_resolved.map(c => c.id), INV.contradictions.map(c => c.id), 'çelişkiler');
// error codes
const katalog = new Map(P4.hata_katalogu.map(h => [h.kod, h]));
if (katalog.size !== P4.hata_katalogu.length) errs.push('hata kataloğunda tekrar eden kod');
const kullanilan = new Set();
for (const e of endpoints) for (const k of e.errors) { kullanilan.add(k); if (!katalog.has(k)) errs.push(`${e.method} ${e.path}: katalogda olmayan kod ${k}`); if (!k.startsWith('DERSLER_')) errs.push('önek dışı kod ' + k); }
for (const k of katalog.keys()) if (!kullanilan.has(k)) errs.push('hiçbir uçta kullanılmayan kod ' + k);
// files inside globs
const globs = C.file_ownership.filter(g => g.owner === 'D02').map(g => g.glob.replace(/\*+$/, ''));
for (const f of spec.files) if (!globs.some(g => f.startsWith(g))) errs.push('glob dışı dosya ' + f);
if (new Set(spec.files).size !== spec.files.length) errs.push('tekrar eden dosya');
// open point ids sequential
spec.open_points.forEach((o, i) => { const want = 'D02-A' + String(i + 1).padStart(2, '0'); if (o.id !== want) errs.push(`açık nokta kimliği ${o.id}, beklenen ${want}`); });
// banned characters and words
const all = JSON.stringify(spec) + JSON.stringify(P4.hata_katalogu);
if (/[–—]/.test(all)) errs.push('U+2013 ya da U+2014 var');
for (const w of ['KVKK', 'sponsor']) if (all.includes(w)) errs.push('yasak sözcük ' + w);
// every endpoint carries the required keys
for (const e of endpoints) for (const k of ['client', 'auth', 'request', 'response', 'errors', 'idempotency', 'rate_limit']) if (e[k] === undefined) errs.push(`${e.path} ${k} yok`);
for (const e of endpoints) if (!['telefon', 'panel', 'kürsü', 'sunucu'].includes(e.client)) errs.push('istemci değeri ' + e.client);
for (const t of spec.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('test türü ' + t.kind);
if (errs.length) { console.log('ÖZ DENETİM HATASI (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }

fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.writeFileSync(path.join(B, 'spec', 'D02.json'), JSON.stringify(spec, null, 1) + '\n', 'utf8');

// ---------- HTML fragment ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lnk = s => esc(s).replace(/\b(plan|teknik|tasarim)\.html#([A-Za-z0-9_-]+)/g, (m, d, a) => `<a href="${d}.html#${a}">${d}#${a}</a>`);
const code = s => `<code>${esc(s)}</code>`;
const nokta = s => /[.!?]$/.test(String(s).trim()) ? String(s).trim() : String(s).trim() + '.';
const tipler = endpoints.tipler;
const kisalt = v => { let x = String(v); for (const [ad, tanim] of Object.entries(tipler)) x = x.split(tanim).join(ad === 'ProgramSaatiGirdisi' ? 'ProgramSaatiGirdisi[] (0 ile 20 öğe; kural ortak tiplerde)' : ad); return x; };
const tr = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
const th = cells => `<tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr>`;
const row = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;
const out = [];
const P = s => out.push(s);

P(`<section id="${mod.name}">`);
P(`<h2>${esc(mod.title)}</h2>`);
P(`<p class="meta">D02 · modül ${code(mod.name)} · ${code(mod.path)} · uç öneki ${code('/v1/dersler')} · ${tables.length} tablo, ${endpoints.length} uç, ${P3.jobs.length} iş</p>`);
P(`<p>${lnk(spec.summary)}</p>`);

// Amaç ve sınırlar
P('<h3>Amaç ve sınırlar</h3>');
P('<div class="rows">');
P(row('Kapsam', lnk('Birim, bölüm, genel dönem, birim takvimi (tatil, sınav haftası), birim ve dönem kilidi; ders, şube, haftalık program; oturumların dönem boyu üretimi, telafi, iptal, tek oturum düzenlemesi, "Ders yapıldı mı?", çakışma listesi ve inceleme hesaplarının deneme dersi. Kararlar: plan.html#hoca, plan.html#kararlar-kafa-sayisi, plan.html#devam-donem-sonu, teknik.html#kod-veri-modeli.')));
P(row('Kapsam dışı', esc('Pencere, kapanış ve ders içi ayar (D04); kayıt kararı, kafa sayısı karşılaştırması ve kilit kapanış adımının içeriği (D07); devam hesabı, p\'nin anlamı ve oran ucu (D08); öğrenci listesi (D03); değişenler akışının zarfı ve imleç (D06); düzeltme ve denetim tablosu (D09); raporlar (D10, D02 tablolarını yalnız okur).')));
P(row('Çağırdığı dış yüzler', esc('D01 kisiGetir, personelRolleri, ogrenciHesabiGetir, yetkiDenetle; D06 surumAl [yaprak], indirmeKaynagiKaydet; D08 devamHesaplaIsiKoy [yaprak]; D09 denetimeYaz [yaprak]; D12 islem, kisitAdi, testVeritabaniHazirla; D13 rotalariKaydet, uygulamaHatasi, hizSinifi; D14 isGonder, isTanimla. D03, D04, D05 ve D07 içe aktarılmaz.')));
P(row('Ona kaydolanlar', esc('D04 pencereleriHesapla (oturumUretimDinleyicisiKaydet), D07 donemKilidiKararKapanisi (kilitAdimiKaydet), D03 liste kaynağı (listeKaynagiKaydet, sözleşme eki D02-A12). D02 de kendi eklentisinde D06\'ya indirme kaynağı olarak kaydolur.')));
P(row('Kod yeri', esc('apps/server/src/modules/dersler/ (dış yüz index.ts; D01\'in içe aktardığı okuma işlevleri yaprak.ts içinde ve bu dosyanın içe aktarma zinciri modules/kimlik\'e varmaz, böylece D01 ile D02 arasında dosya döngüsü kurulmaz), jobs/dersler/, packages/core/src/dersler/ (saf üretim planı ve takvim kuralları), packages/contracts/src/dersler.ts (şemalar, rota listesi, DERSLER_ hata kodları, dersler.* denetim olayları). Göçler apps/server/migrations/<UTC zaman>_dersler_<açıklama>/ altında, yalnız D02 tablolarına dokunur.')));
P(row('Zaman', lnk('Kural taşıyan her an bileşim kökünün (app.ts, worker.ts) verdiği saat arayüzünden gelir; SQL now() ve Date.now() yok. Program saati yerel time, ders günü date; anlar timestamptz ve yazımla aynı SQL deyiminde AT TIME ZONE \'Europe/Istanbul\' ile kurulur (teknik.html#veritabani-donem-alani). Testler TZ=UTC ile koşar, senaryodaki saatler İstanbul saatiyle yorumlanır (teknik.html#testler-veritabani-sifirlama).')));
P(row('Ölçülen sonuç', lnk('Program kaydından sonra oluşan planlı oturum sayısı takvimden gün gün sayılanla eşittir (davranış ve özellik testi); gece işinin dersler.yenileme.fark log satırı sıfır kalmalı. Cevapsız oturum oranı (oturumlar.yapildi, D15\'in ölçüm görünümü okur) dönem sonu çıktısı engelini önceden gösterir. Toplu cevapla "Ders yapıldı mı?" ekranı ders başına 2 dakika hedefinde kalır (plan.html#hedefler). Her üretim dersler.uretim log satırı yazar: dersId, eklenen, güncellenen, iptal, geri alınan, süre; numara ve isim yok.')));
P('</div>');

// Tablolar
P('<h3>Tablolar</h3>');
P(`<p>${lnk('14 tablo. Telefona inen beşi (dersler, program_saatleri, oturumlar, takvim_tatilleri, birim_donemleri) surum ve silindi taşır (teknik.html#kod-veri-modeli); şube dizisi ders satırıyla, şube kümeleri program saati ve oturum satırıyla iner. Adlar D12-B01 kalıbında; kimlik varsayılanı açıkça uuidv7() (teknik.html#veritabani); kod listeleri metin ve CHECK; ders, oturum ve takvim satırları silinmez, göç uygulama rollerinden DELETE yetkisini geri alır.')}</p>`);
const tabloGrubu = (baslik, adlar) => {
  P(`<details><summary>${esc(baslik)}</summary>`);
  for (const t of tables.filter(t => adlar.includes(t.name))) {
    P(`<p><strong>${code(t.name)}</strong>: ${lnk(t.purpose)}</p>`);
    P('<table>');
    P(th(['Sütun', 'Tip', 'Boş', 'Varsayılan', 'Not']));
    for (const c of t.columns) P(tr([code(c.name), esc(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', lnk(c.note)]));
    P('</table>');
    P(`<p>Dizinler: ${nokta(t.indexes.map(lnk).join('; '))}</p>`);
    P(`<p>Kısıtlar: ${nokta(t.constraints.map(lnk).join('; '))}</p>`);
  }
  P('</details>');
};
tabloGrubu('Birim, dönem ve takvim (7 tablo): takvim birimden ayrı, kilit anı birim ve dönem satırında türetilir', ['birimler', 'bolumler', 'donemler', 'takvimler', 'takvim_tatilleri', 'takvim_sinav_haftalari', 'birim_donemleri']);
tabloGrubu('Ders, program ve oturum (7 tablo): oturum programın tek buluşması, kimliği (program saati, tarih), hiç silinmez', ['dersler', 'subeler', 'program_saatleri', 'program_saati_subeleri', 'oturumlar', 'oturum_subeleri', 'oturum_degisiklikleri']);

// Uç noktalar
P('<h3>Uç noktalar</h3>');
P(`<p>${lnk('31 uç, hepsi /v1/dersler altında; yönetici uçları /v1/dersler/yonetim altında (teknik.html#sunucu). Ortak kurallar: JSON camelCase; tarih YYYY-MM-DD İstanbul günü, saat HH:MM yerel, an UTC ISO 8601 milisaniyeli ve Z ile; sürüm ve kısa kod metin; durum ve kod değerleri cevapta x-extensible-enum (teknik.html#sunucu-mimari); oluşturan uçlarda istemcinin UUIDv7 kimliği tekrar anahtarı; başka hocanın kaynağı 404. Hata zarfı, oturum kancası, 401, 403, doğrulama 400, 413 ve 429 D13\'ün. Yönlendirici sabit yol parçasını önce eşler (/v1/dersler/oturumlar, /birimler, /yonetim); ders ve oturum kimliği Zod ile UUIDv7 denetlenir. Bir istek uçun kendi kurallarına göre birden çok nedenle reddedilecekse dönen kodu bu sıra belirler: kimlik ve rol (D13), kaynak yetkisi (404), dönem kilidi (DERSLER_DONEM_KILITLI), arşiv (DERSLER_DERS_ARSIVDE), deneme dersi, alan kuralları; kilitten sonra da izinli işler (cevapsız oturumun cevabı, kafa sayısı) bu sıraya takılmaz.')}</p>`);
const ucGrubu = (baslik, sec) => {
  P(`<details><summary>${esc(baslik)}</summary>`);
  P('<div class="rows">');
  for (const e of endpoints.filter(sec)) {
    const istek = Object.entries(e.request).map(([k, v]) => `${code(k)}: ${lnk(kisalt(v))}`).join('<br>') || 'yok';
    const cevap = Object.entries(e.response).map(([k, v]) => `${code(k)}: ${lnk(kisalt(v))}`).join('<br>');
    P(row(code(`${e.method} ${e.path}`), `<p>${lnk(e.auth)} İstemci: ${esc(e.client)}.</p><ul><li>İstek: ${istek}</li><li>Cevap: ${cevap}</li><li>Hatalar: ${e.errors.length ? e.errors.map(code).join(', ') : 'yalnız genel kodlar'}</li><li>Tekrar: ${lnk(e.idempotency)}</li><li>Sınır: ${esc(e.rate_limit)}</li></ul>`));
  }
  P('</div>');
  P('</details>');
};
P('<details><summary>Ortak tipler: DersOzeti, ProgramSaati, ProgramSaatiGirdisi, OturumPanel, OturumEtkisi (uç satırlarında adla geçer)</summary>');
P('<pre><code>' + esc(Object.entries(tipler).map(([ad, tanim]) => ad === 'ProgramSaatiGirdisi' ? `ProgramSaatiGirdisi: ${tanim}` : tanim).join('\n\n')) + '</code></pre>');
P('</details>');
ucGrubu('Hoca uçları (18): ders, şube, program, oturum, telafi, "Ders yapıldı mı?", çakışma', e => !e.path.includes('/yonetim') && e.path !== '/v1/dersler/birimler');
ucGrubu('Yönetici ve girişsiz uçlar (13): birim, bölüm, dönem, takvim, birim dönemi bağı, kilit, ders listesi, devir', e => e.path.includes('/yonetim') || e.path === '/v1/dersler/birimler');

// İşler
P('<h3>İşler</h3>');
P(`<p>${lnk('Üç iş, işleyicileri apps/server/src/jobs/dersler/ altında; worker.ts toplar, D14.isTanimla kaydeder. Oturum başına iş yok; süresi dolan oturumu kapatma D04\'ün oturum_pencere_kapat işidir (teknik.html#sunucu-arka-plan). İş verisi yalnız iç kimlik taşır.')}</p>`);
P('<div class="rows">');
for (const j of P3.jobs) P(row(code(j.name), `<p>${lnk(j.does)}</p><ul><li>Zamanlama: ${lnk(j.schedule)}</li><li>Tekrar: ${lnk(j.idempotency)}</li></ul>`));
P('</div>');

// Durumlar ve kurallar
P('<h3>Durumlar ve kurallar</h3>');
P('<details><summary>Beş durum makinesi: oturum, yapıldı onayı, ders, birim ve dönem kilidi, şube</summary>');
for (const m of P3.state_machines) {
  P(`<p><strong>${esc(m.name)}</strong>: ${m.states.map(code).join(', ')}</p>`);
  P('<table>');
  P(th(['Önce', 'Sonra', 'Kim', 'Ne zaman']));
  for (const x of m.transitions) P(tr([code(x.from), code(x.to), esc(x.by), lnk(x.when)]));
  P('</table>');
}
P('</details>');
P('<p><strong>Üretim kuralı</strong> (program kaydı, takvim işi, şube ve ders ayarı değişikliği aynı fonksiyonu çağırır):</p>');
P('<pre><code>' + esc([
  'plan = oturumPlaniHesapla(girdi)          packages/core/src/dersler/uretim.ts, saf, Intl yok',
  'girdi: takvim (ders başlangıcı, bitişi, tatiller, sınav haftaları), takip başlangıcı,',
  '       silinmemiş program saatleri ve şube kümeleri, ders ayarı (süre, QR),',
  '       şimdi (İstanbul sivil tarih ve saat; saat arayüzünün anından SQL ile çevrilir),',
  '       dersin normal oturumları (anahtar: program saati, tarih)',
  'istenen: her program saati s için [enGeç(ders başlangıcı, takip başlangıcı, s.geçerlilik başı),',
  '         enErken(ders bitişi, s.geçerlilik sonu)] aralığında hafta günü s.gün olan her d;',
  '         d tam gün tatilse, yarım gün tatil günü ve s.başlangıç >= tatil saatiyse,',
  '         ders yapılmayan sınav haftasındaysa atlanır',
  'başlamamış her mevcut normal oturum m için:',
  '   anahtarı istenende, m planlı, elle düzenlenmemiş, alan farkı var   -> güncelle',
  '   anahtarı istenende, m iptal (program, takvim, tatil, sinav_haftasi) -> geri al',
  '   anahtarı istenende değil, m planlı                                 -> iptal (neden)',
  'istenende olup mevcutta olmayan başlamamış her oluşum                  -> ekle',
  'başlamış ya da geçmiş oturum, telafi ve deneme oturumu                 -> dokunulmaz',
  'uygula (tek işlem): ders FOR UPDATE, plan, INSERT ve UPDATE (anlar AT TIME ZONE ile),',
  '   oturum_degisiklikleri, dinleyiciler (D04), denetim (D09), D08 işi, en son surumAl (D06)',
].join('\n')) + '</code></pre>');
P('<p><strong>İndirme kaynağı</strong> (D06.indirmeKaynagiKaydet ile kayıtlı, D06 zarfı ve imleci tutar):</p>');
P('<ul>' + [
  'Tek kaynak (ad dersler) bir istekte beş tablonun satırlarını ayrı dizilerle döner; D06 tablo başına kaynak isterse aynı işlem içinde paylaşılan kapsam hesabıyla beş ada bölünür. Girdi { kisi, surumden, surumaKadar? }; surumden 0 tam indirmedir.',
  'Öğrenci kapsamı: D01.ogrenciHesabiGetir ile numara, liste kaynağının etkinSatirlar({ ogrenciNolari }) işleviyle şubeler; dersler bu şubelerin dersleri, program saati ve oturum yalnız bu şubeleri kapsayanlar. Hoca kapsamı: sahibi olduğu dersler.',
  'Arşiv: kilitle arşivlenen ders kilit anından 180 gün sonrasına kadar kapsamda kalır (telefonda Dönem kapandı; başlangıç değeri, telefon da aynı sürede yerel dersi siler). Hocanın arşivlediği ders, arşiv sürümü imleçten büyükse kapsamdanCikti satırıyla iner; tam indirmede hiç gönderilmez.',
  'Sürüm: kapsamdaki derslerin surum değeri surumden\'den büyük satırları. Kapsam olayı: öğrencide liste satırının sürümü, hocada hocaAtamaSurumu surumden\'den büyükse o dersin bütün satırları sürüme bakılmadan gider; birim dönemi satırının sürümü büyükse (takvim bağı ya da son gün değişti) bağlı takvimin bütün tatilleri de gider.',
  'Şube daralması: öğrencide, kapsamdaki derste sürümü imleçten büyük olup öğrencinin şubesini artık kapsamayan program saati ve oturum { id, silindi: true } olarak gider; telefon elindeyse siler, hiç almamışsa yok sayar. Böylece şubesi oturumdan çıkarılan öğrencinin telefonu o oturumda pencere açmaz.',
  'Kapsamdan çıkma: öğrencide pasiflesenSatirlar(surumden) ile pasifleşen ve başka etkin şubesi kalmayan ders, hocada oncekiHocaKisiIdleri içinde olup hocaAtamaSurumu surumden\'den büyük ders { dersId, kapsamdanCikti: true, silindi: true } satırıyla iner; telefon o dersin yerel satırlarını siler (D06-B15).',
  'Sütunlar: kafa sayısı ve yapıldı hiçbir telefona inmez (hoca çevrimiçi uçlardan okur); hocanın görünen adı istek başına bir kez D01.kisiGetir ile.',
].map(x => `<li>${lnk(x)}</li>`).join('') + '</ul>');
P(`<details><summary>${P3.invariants.length} değişmez: her zaman doğru kalması gerekenler</summary>`);
P('<ol>' + P3.invariants.map(x => `<li>${lnk(x)}</li>`).join('') + '</ol>');
P('</details>');
P(`<details><summary>Dış yüz (${spec.exports.length} işlev): sözleşmedeki 16, sözleşme eki 3, bileşim kökü 2</summary>`);
P('<table>');
P(th(['İşlev', 'İmza', 'Amaç']));
for (const x of spec.exports) P(tr([code(x.name), code(x.signature), lnk(x.purpose)]));
P('</table>');
P('</details>');
P(`<p>Denetim olay türleri (D09.denetimeYaz, önceki ve sonraki değerle, numara ve isim yok): ${P4.denetim_olaylari.map(code).join(', ')}.</p>`);

// Hata kodları
P('<h3>Hata kodları</h3>');
P(`<p>${esc('Kodlar packages/contracts/src/dersler.ts içinde, her biri tek HTTP durumuna bağlı; birleştirme hatalar.ts (D13). Başka hocanın kaynağı varlığı sızdırmamak için 404 döner; 409 yalnız çevrimiçi panel işlemlerinde.')}</p>`);
P(`<details><summary>${P4.hata_katalogu.length} DERSLER_ kodu ve HTTP durumu</summary>`);
P('<table>');
P(th(['Kod', 'HTTP', 'Ne zaman']));
for (const h of P4.hata_katalogu) P(tr([code(h.kod), String(h.http), lnk(h.ne)]));
P('</table>');
P('</details>');

// Testler
P('<h3>Testler</h3>');
P(`<p>${lnk('Davranış senaryoları apps/server/test/features/dersler/ (Türkçe), adımlar steps/dersler/, veri kurucusu support/kurucular/dersler.ts (birimKur, takvimKur, dersKur, oturumKur; öbür modüllerin senaryoları da kullanır, teknik.html#testler-veritabani-sifirlama); özellik testleri packages/core/src/dersler/*.test.ts (fast-check, deneme sayısı açık yazılır, teknik.html#testler-birim). Her senaryo önce kırmızı yazılır (plan.html#baslangic); yokluk iddia eden her senaryonun karşı durumda dolu dönen pozitif kontrolü var; beklenen sayılar adımda sabit yazılmaz, kurucunun takviminden hesaplanır.')}</p>`);
P('<pre><code>' + esc([
  '# language: tr',
  'Özellik: Oturum üretimi',
  '  Geçmiş:',
  '    Diyelim ki birimin 2026-2027 güz takviminde dersler 28 Eylül ile 8 Ocak arasında ve son gün 8 Ocak',
  "    Ve takvimde 28 Ekim 13:00'ten 29 Ekim sonuna kadar tatil",
  '    Ve "MAT101" dersi çarşamba 09:00-11:00 ve 14:00-16:00 arasında ve yoklama süresi 15 dakika',
  '  Senaryo: Yarım gün tatil yalnız tatil saatinden sonra başlayan oturumu düşürür',
  '    Eğer ki hoca programı kaydederse',
  '    O zaman 28 Ekim 09:00 oturumu planlı olur ve açılışı 06:00Z olur',
  '    Ve 28 Ekim 14:00 oturumu üretilmez',
  '    Ve öteki çarşambaların iki oturumu da planlı olur',
].join('\n')) + '</code></pre>');
const turAd = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
const sayim = Object.entries(spec.tests.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {})).map(([k, v]) => `${v} ${turAd[k]}`).join(', ');
P(`<details><summary>${spec.tests.length} test (${sayim}); her biri kırmızıya dönebildiği gösterilerek kabul edilir</summary>`);
P('<table>');
P(th(['Test', 'Tür', 'Neyi denetler']));
for (const x of spec.tests) P(tr([esc(x.name), turAd[x.kind], lnk(x.asserts)]));
P('</table>');
P('</details>');

// Netleştirilenler
P('<h3>Netleştirilenler</h3>');
P(`<p>${esc(`Envanterdeki ${INV.gaps.length} boşluğun ${spec.resolved_gaps.length} tanesi burada kararla kapandı, ${INV.gaps.filter(g => g.needs_owner).length} tanesi ürün kararı istediği için açık noktada önerilen varsayılanla bekliyor; ${INV.contradictions.length} çelişki çözüldü.`)}</p>`);
P(`<details><summary>${spec.resolved_gaps.length} boşluk kararı: karar ve nedeni</summary>`);
P('<table>');
P(th(['Boşluk', 'Karar', 'Neden']));
for (const r of spec.resolved_gaps) P(tr([code(r.gap), lnk(r.decision), lnk(r.why)]));
P('</table>');
P('</details>');
P('<details><summary>3 çelişki: oturum tanımı, hocanın unvanı, takvimin birimi</summary>');
P('<table>');
P(th(['Çelişki', 'Çözüm']));
for (const c of spec.contradictions_resolved) P(tr([code(c.id), lnk(c.resolution)]));
P('</table>');
P('</details>');

// Açık noktalar
P('<h3>Açık noktalar</h3>');
P(`<div class="callout warn"><p>${esc(`${spec.open_points.filter(o => o.needs_owner).length} soru sahibin kararını bekliyor; sunucu öneriyle kurulur, karar değişirse yalnız varsayılan ya da kural değişir. ${spec.open_points.filter(o => !o.needs_owner).length} sözleşme eki contracts.json'a işlenmeli.`)}</p><ul>`);
for (const o of spec.open_points) P(`<li><strong>${esc(o.id)}</strong> <span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahip kararı' : 'sözleşme eki'}</span> ${lnk(o.question)} Öneri: ${lnk(o.recommendation)}</li>`);
P('</ul></div>');
P('</section>');

const html = out.join('\n') + '\n';
if (/[–—]/.test(html)) { console.log('HTML U+2013 ya da U+2014 içeriyor'); process.exit(1); }
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });
fs.writeFileSync(path.join(B, 'frag', 'D02.html'), html, 'utf8');
console.log(`yazıldı: spec/D02.json (${tables.length} tablo, ${endpoints.length} uç, ${P3.jobs.length} iş, ${spec.exports.length} dış yüz, ${spec.files.length} dosya, ${spec.tests.length} test, ${spec.resolved_gaps.length} karar, ${spec.open_points.length} açık nokta), frag/D02.html (${html.length} karakter)`);
