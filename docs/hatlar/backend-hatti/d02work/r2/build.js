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
  summary: "D02 (dersler) birimi, bölümü, genel dönemi, birim takvimini, birim ve dönem kilidini, dersi, şubeyi ve haftalık programı tutar; oturumları programdan dönemin tamamı için önceden üretir ve her değişiklikte yalnız başlamamış oturumları saf bir plan fonksiyonuyla yeniden hesaplayıp farkı yazar. Oturum bir program saatinin tek buluşmasıdır ve hiç silinmez: iptal, taşıma, telafi, tek oturum düzenlemesi ve \"Ders yapıldı mı?\" cevabı oturum satırında ve değişiklik geçmişinde iz bırakır, sayımı D08 ve D10 oturum durumundan okur. Yerel program saati UTC ana PostgreSQL'in saat dilimi verisiyle (AT TIME ZONE 'Europe/Istanbul') çevrilir; kilit dahil kural taşıyan her an bileşim kökünün verdiği saat arayüzünden gelir, kilit anı son günün ertesi 00:00 İstanbul'dur. Pencere hesabı (D04) üretim dinleyicisi, kilit kapanışı (D07, sıra 10) ve gün sonu anlığı (D10, sıra 20) kilit adımı, liste kaynağı (D03) etkinSatirlar olarak D02'ye kaydolur; D02 D01'in kimlik olaylarını derslerKimlikDinleyicisi aboneliğiyle alır. Telefona inen beş tablo işlem başına tek D06 sürümüyle damgalanır (D06.surumDamgasiIste, en son tek surumAl) ve D06'nın kapsamına göre beş genel kaynaktan iner; personel kapsam kaynağı D02'nin, öğrenci kapsam kaynağı D03'ündür. Deneme dersini D01'in inceleme_hesaplari_kurulumu işi D02.denemeDersiniKur ile kurdurur ya da devrettirir (itme modeli); inceleme hesabı deneme dersi dışında hiçbir şey yazamaz. Ürün kararı isteyen " + P4.open_points.filter(o => o.needs_owner).length + " soru önerilen varsayılanla açık noktada bekliyor; mimarın kararlarıyla kapanan " + P4.resolved_gaps.filter(r => /^D02-A\d\d$/.test(r.gap)).length + " sözleşme ve komşu eki Netleştirilenler'de kararıyla yazılı.",
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
  denetim_olaylari: P4.denetim_olaylari,
  migrations: { dir: mod.migration_dir, glob: C.file_ownership.filter(g => g.owner === 'D02' && g.glob.startsWith('apps/server/migrations/')).map(g => g.glob)[0], rule: "Göç yalnız bu modülün tablolarına dokunur, yalnız ileri ve önce genişlet sonra daralt; her göç kendi klasöründe migration.sql ve snapshot.json taşır. Göç dosyaları spec dosya listesine değil iş paketine yazılır; klasör kuralı ve CI göç denetimi D12'nindir. Paralel paketler birleşmeden önce ana dala yeniden dayanır; araya göç girdiyse paket kendi klasörünü silip drizzle-kit generate ile yeniden üretir (A1)." },
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
for (const r of spec.resolved_gaps) if (/^D02-B\d\d$/.test(r.gap)) seen[r.gap] = (seen[r.gap] || 0) + 1;
for (const o of spec.open_points) { const m = o.question.match(/^(D02-B\d\d):/); if (m) seen[m[1]] = (seen[m[1]] || 0) + 1; }
for (const id of gapIds) if (seen[id] !== 1) errs.push(`boşluk ${id} ${seen[id] || 0} kez ele alındı (1 olmalı)`);
for (const id of Object.keys(seen)) if (!gapIds.includes(id)) errs.push('bilinmeyen boşluk ' + id);
// open points the architect closed are recorded as resolved entries with the decision ids; none of them may stay open
const kapanan = spec.resolved_gaps.filter(r => /^D02-A\d\d$/.test(r.gap));
for (const r of spec.resolved_gaps) if (!/^D02-[AB]\d\d$/.test(r.gap)) errs.push('karar kimliği biçimi ' + r.gap);
for (const r of kapanan) { if (spec.open_points.some(o => o.id === r.gap)) errs.push('kapanan açık nokta hâlâ açık ' + r.gap); if (!/Mimar kararı I\d{3}/.test(r.why)) errs.push('kapanan açık noktada mimar kararı yok ' + r.gap); }
if (new Set(kapanan.map(r => r.gap)).size !== kapanan.length) errs.push('aynı açık nokta iki kez kapandı');
for (const o of spec.open_points) if (o.needs_owner !== true) errs.push('mimarın karar verdiği açık nokta kalmamalı: ' + o.id);
// gaps the inventory marked needs_owner must be open points with needs_owner true
for (const g of INV.gaps.filter(g => g.needs_owner)) { const o = spec.open_points.find(o => o.question.startsWith(g.id + ':')); if (!o || !o.needs_owner) errs.push(`ürün kararı isteyen ${g.id} açık noktada değil`); }
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
// open point ids unique and increasing; a closed id is never reused (checked above)
spec.open_points.forEach((o, i) => { if (!/^D02-A\d\d$/.test(o.id)) errs.push('açık nokta kimliği biçimi ' + o.id); if (i && o.id <= spec.open_points[i - 1].id) errs.push(`açık nokta kimlikleri artan sırada değil: ${o.id}`); });
// banned characters and words
const all = JSON.stringify(spec) + JSON.stringify(P4.hata_katalogu);
if (/[–—]/.test(all)) errs.push('U+2013 ya da U+2014 var');
for (const w of ['KVKK', 'sponsor']) if (all.includes(w)) errs.push('yasak sözcük ' + w);
// export names: one plain identifier each, no duplicates (spec-validate.js asks the same)
for (const n of exportNames) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) errs.push('dış yüz adı tek tanımlayıcı olmalı: ' + n);
if (new Set(exportNames).size !== exportNames.length) errs.push('tekrar eden dış yüz adı');
// migrations: same folder rule as contracts.json (A1)
const gocKlasoru = mod.migration_dir.split(' (')[0];
if (!spec.invariants.some(x => x.includes(gocKlasoru))) errs.push('göç klasörü contracts.json ile aynı değil: değişmezlerde ' + gocKlasoru + ' yok');
if (spec.migrations.glob !== 'apps/server/migrations/??????????????_dersler_*') errs.push('göç globu ' + spec.migrations.glob);
if (spec.files.some(f => f.startsWith('apps/server/migrations/'))) errs.push('göç dosyası spec dosya listesinde');
// names the architect retired must not come back (closed entries may name them to say what was removed)
const ESKI = ['surumleDamgala', 'onceki_hoca_kisi_idleri', 'oncekiHocaKisiIdleri', 'yoneticiKapsami', 'YoneticiKapsami', 'incelemeHesaplari', 'denemeDersi(', 'derslerKur', 'kimlikOlayiDinleyicisiKaydet', 'beklenenDuzenlemeNo', 'PROGRESS 5', 'bu işleri bekler', 'hocaAtamaSurumu', 'oturumlar_ders_id_tarih_uq', 'oturumlar_ders_id_bitis_ani_idx', 'oturumlar_durum_id_ck', 'oturum_subeleri_oturum_id_ck', 'dersler_donem_id_ck', '/v1/devam/dersler/{dersId}/oranlar', 'ekme modeli', 'UTC zaman>', 'iki kaynağı', 'D02-A12', 'D02-A13', 'D02-A14', 'D02-A15', 'D02-A16', 'D02-A17', 'D02-A18', 'DERSLER_DERS_BULUNAMADI', 'DERSLER_SUBE_BULUNAMADI', 'DERSLER_OTURUM_BULUNAMADI', 'DERSLER_BIRIM_BULUNAMADI', 'DERSLER_BOLUM_BULUNAMADI', 'DERSLER_DONEM_BULUNAMADI', 'DERSLER_TAKVIM_BULUNAMADI'];
const acikGovde = JSON.stringify({ ...spec, resolved_gaps: spec.resolved_gaps.filter(r => !/^D02-A/.test(r.gap)) }) + JSON.stringify(P4.hata_katalogu);
for (const t of ESKI) if (acikGovde.includes(t)) errs.push('emekli ad ya da kimlik kaldı: ' + t);
// every endpoint carries the required keys
for (const e of endpoints) for (const k of ['client', 'auth', 'request', 'response', 'errors', 'idempotency', 'rate_limit']) if (e[k] === undefined) errs.push(`${e.path} ${k} yok`);
for (const e of endpoints) if (!['telefon', 'panel', 'kürsü', 'sunucu'].includes(e.client)) errs.push('istemci değeri ' + e.client);
for (const t of spec.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('test türü ' + t.kind);
if (errs.length) { console.log('ÖZ DENETİM HATASI (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }

const OUT = process.env.D02_OUT || B;
fs.mkdirSync(path.join(OUT, 'spec'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'spec', 'D02.json'), JSON.stringify(spec, null, 1) + '\n', 'utf8');

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
P(row('Çağırdığı dış yüzler', esc("D01 yalnız modules/kimlik/yaprak.ts'ten: kisiGetir, personelRolleri, yetkiDenetle, hesapSilindiMi; D06 surumDamgasiIste ve surumAl (modules/esitleme/yaprak.ts), indirmeKaynagiKaydet; D08 devamHesaplaIsiKoy (modules/devam/yaprak.ts) ve DEVAM_NEDENLERI (packages/contracts/src/devam.ts); D09 denetimeYaz (modules/duzeltmeler/yaprak.ts); D12 islem, kisitAdi, tabloYardimcilari, donemBolumuAc, testVeritabaniHazirla, veritabani_degismez_sutun (SQL işlevi); D13 rotalariKaydet, uygulamaHatasi, hizSinifi, ortak Kimlik tipi ve beklenenSurumNoSemasi; D14 isGonder, isTanimla. D03, D04, D05, D07, D10 ve D11 içe aktarılmaz. modules/dersler/yaprak.ts hiçbir index.ts'i ve başka alan modülünün hiçbir dosyasını içe aktarmaz; yalnız kendi tablolar.ts'ini, packages/contracts, packages/core ve D12'nin işlem tipini (import type) kullanır (ortak kural Yaprak dosyası, A2).")));
P(row('Ona kaydolanlar', esc("D04 pencereleriHesapla ((tx, olay) => pencereleriHesapla(tx, olay.oturumlar) uyarlayıcısıyla oturumUretimDinleyicisiKaydet), D07 dogrulama.karar_kapanisi (sira 10) ve D10 raporlar.gun_sonu_anligi (sira 20) kilit adımları (kilitAdimiKaydet), D03 liste kaynağı (listeKaynagiKaydet, yalnız etkinSatirlar). D02 kendi eklentisinde D06'ya beş genel kaynak ve personel kapsam kaynağı olarak kaydolur; D01'in kimlik olaylarını derslerKimlikDinleyicisi ile alır, aboneyi bileşim kökü D01.kimlikDinleyicileriniKur ile kurar (I050). Eklentiler app.ts uygulamaKur ile api ve isci süreçlerinde kurulduğundan kayıtlar iki süreçte aynıdır.")));
P(row('Kod yeri', esc("apps/server/src/modules/dersler/ (index.ts derslerEklentisi'ni, seçenek tipini ve dış yüzü verir; dersGetir, dersYetkisi, subeGetir, dersSubeleri, birimGetir ve kilitliBirimDonemleri ile öbür salt okuma işlevleri yaprak.ts içinde, D01 bunları oradan alır; kuyruk tanımları kuyruklar.ts, kapsam kaynağı kapsam.ts, derslerKimlikDinleyicisi dinleyiciler.ts), jobs/dersler/ (export const isler), packages/core/src/dersler/ (saf üretim planı ve takvim kuralları), packages/contracts/src/dersler.ts (şemalar, rota listesi, DERSLER_ hata kodları, OTURUM_TURLERI ve öbür değer sabitleri, OturumUretimOlayi, DERSLER_DENETIM_OLAYLARI). Dosya döngüsü yok: dersler/tablolar.ts D01'in tablo tanımını içe aktarmaz, kisiler yabancı anahtarları yalnız göç SQL'inde kurulur ve şema testi denetler; D02 D01'i yalnız kimlik/yaprak.ts'ten içe aktarır (dependency-cruiser no-circular ve yaprak kuralı, X24).")));
P(row('Göç', lnk("contracts.json migration_dir ile aynı: apps/server/migrations/<14 haneli UTC>_dersler_<açıklama>/ klasörleri (migration.sql ve snapshot.json); dosya haritasında apps/server/migrations/??????????????_dersler_* globu bu modülündür. Göç yalnız D02 tablolarına dokunur, yalnız ileri ve önce genişlet sonra daralt; göç dosyaları spec dosya listesine değil iş paketine yazılır; klasör kuralı ve CI göç denetimi D12'nindir. Paralel paketler birleşmeden önce ana dala yeniden dayanır; araya göç girdiyse paket kendi klasörünü silip drizzle-kit generate ile yeniden üretir (A1).")));
P(row('Zaman', lnk('Kural taşıyan her an bileşim kökünün eklenti seçeneğiyle verdiği saat arayüzünden gelir (app.ts uygulamaKur, api ve isci süreçleri); SQL now() ve Date.now() yok. Program saati yerel time, ders günü date; anlar timestamptz ve yazımla aynı SQL deyiminde AT TIME ZONE \'Europe/Istanbul\' ile kurulur (teknik.html#veritabani-donem-alani). Testler TZ=UTC ile koşar, senaryodaki saatler İstanbul saatiyle yorumlanır (teknik.html#testler-veritabani-sifirlama).')));
P(row('Ölçülen sonuç', lnk('Program kaydından sonra oluşan planlı oturum sayısı takvimden gün gün sayılanla eşittir (davranış ve özellik testi); takvim işinin gece onarımının dersler.yenileme.fark log satırı sıfır kalmalı. Cevapsız oturum oranı (oturumlar.yapildi, D15\'in ölçüm görünümü okur) dönem sonu çıktısı engelini önceden gösterir. Toplu cevapla "Ders yapıldı mı?" ekranı ders başına 2 dakika hedefinde kalır (plan.html#hedefler). Her üretim dersler.uretim log satırı yazar: dersId, eklenen, güncellenen, iptal, geri alınan, süre; numara ve isim yok. Deneme işi her çalışmada dersler.deneme log satırı (eklenen oturum) ya da dersler.deneme.ders_yok uyarısı, denemeDersiniKur dersler.deneme.kurulum log satırı (kuruldu, devredildi ya da degismedi) yazar.')));
P('</div>');

// Tablolar
P('<h3>Tablolar</h3>');
P(`<p>${lnk('14 tablo. Telefona inen beşi (dersler, program_saatleri, oturumlar, takvim_tatilleri, birim_donemleri) surum taşır (DEFAULT 0, D06.surumDamgasiIste ile işlemin tek sürümüyle damgalanır); telefona inen silindi, silinme_ani, pasif_ani ve arsiv_ani sütunlarından türer, sabit false sütun yoktur (teknik.html#kod-veri-modeli, D12-B16); şube dizisi ders satırıyla, şube kümeleri program saati ve oturum satırıyla iner. Her kısıt, dizin ve tetikleyici adı kisitAdi(tablo, sütunlar, tür, ek?) ile: <tablo>_<sütunlar>_<ek>_<tür>, sütunsuz adda <tablo>_<ek>_<tür> (D12-B01, I063; ör. oturumlar_ders_id_tarih_deneme_uq, oturumlar_degismez_tg, oturumlar_onaysiz_idx); kimlik varsayılanı açıkça uuidv7() (teknik.html#veritabani); an sütunları timestamptz(3); kod listeleri metin ve CHECK; ders, oturum ve takvim satırları silinmez, göç uygulama rollerinden DELETE yetkisini geri alır.')}</p>`);
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
P(`<p>${lnk('31 uç, hepsi /v1/dersler altında; yönetici uçları /v1/dersler/yonetim altında (teknik.html#sunucu). Ortak kurallar: JSON camelCase; tarih YYYY-MM-DD İstanbul günü, saat HH:MM yerel, an UTC ISO 8601 milisaniyeli ve Z ile; sürüm ve kısa kod metin; durum ve kod değerleri cevapta x-extensible-enum (teknik.html#sunucu-mimari); oluşturan uçlarda istemcinin UUIDv7 kimliği tekrar anahtarı; başka hocanın kaynağı 404 DERSLER_BULUNAMADI (kaynak düzeyi ret tek kod). Hata zarfı, oturum kancası, 401, rota düzeyi rol reddi (403 API_ROL_YETKISIZ), doğrulama 400, 413 ve 429 D13\'ün; D02 rotaları yalnız D13.rotalariKaydet ile ekler, setErrorHandler ve setNotFoundHandler kullanmaz. Yönlendirici sabit yol parçasını önce eşler (/v1/dersler/oturumlar, /birimler, /yonetim); ders ve oturum kimliği Zod ile UUIDv7 denetlenir. POST /v1/dersler yeni derste 201, tekrarda 200 döner (rota beyanı durumlar [201, 200]); öbür oluşturan uçlar yeni kayıtta da tekrarda da 200 döner (D13-B12). Beklenen numara ortak beklenenSurumNoSemasi alanı beklenenSurumNo ile gelir (D13). Durum çakışmaları 409, gövde ve şema hataları 400, sonucu 2000 satırı aşan liste 422 API_SONUC_COK_BUYUK (D13-B02, D13-B13). Bir istek uçun kendi kurallarına göre birden çok nedenle reddedilecekse dönen kodu bu sıra belirler: kimlik ve rol (D13; 401, 403 API_ROL_YETKISIZ), inceleme hesabı (403 DERSLER_INCELEME_HESABI), kaynak yetkisi (404 DERSLER_BULUNAMADI), dönem kilidi (DERSLER_DONEM_KILITLI), arşiv (DERSLER_DERS_ARSIVDE), deneme dersi, alan kuralları; kilitten sonra da izinli işler (cevapsız oturumun cevabı, kafa sayısı) bu sıraya takılmaz.')}</p>`);
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
P(`<p>${lnk('Üç iş, işleyicileri apps/server/src/jobs/dersler/ altında; tanımlar export const isler dizisinde D14.isTanimla ile, worker.ts toplar; KuyrukTanimi nesneleri modules/dersler/kuyruklar.ts içinde; her iş için D14 adımı "aynı veriyle iki kez çalışırsa" ile senaryo vardır (I074). Zamanlamalar D14-B05 kuralına uyar: günlük işler 03:00 ile 05:00 arasında başlamaz, aralarında en az 5 dakika vardır, missed: once (donem_kilidi 00:05, deneme_dersi_oturumlari 00:35 ve yayın adımında bir kez, takvim gece onarımı 01:55); sözleşme testi isler dizisini D14 çizelge doğrulayıcısından geçirir. Oturum başına iş yok; süresi dolan oturumu kapatma D04\'ün oturum_pencere_kapat işidir (teknik.html#sunucu-arka-plan). İş verisi yalnız iç kimlik taşır.')}</p>`);
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
  '       silinmemiş ve en az bir etkin şubesi olan program saatleri ve şube kümeleri, ders ayarı (süre, QR),',
  '       şimdi (İstanbul sivil tarih ve saat; saat arayüzünün anından SQL ile çevrilir),',
  '       dersin normal oturumları (anahtar: program saati, tarih)',
  'istenen: her program saati s için [enGeç(ders başlangıcı, takip başlangıcı, s.geçerlilik başı),',
  '         enErken(ders bitişi, s.geçerlilik sonu)] aralığında hafta günü s.gün olan her d;',
  '         d tam gün tatilse, yarım gün tatil günü ve s.başlangıç >= tatil saatiyse,',
  '         ders yapılmayan sınav haftasındaysa atlanır',
  'başlamamış her mevcut normal oturum m için:',
  '   anahtarı istenende, m planlı, elle düzenlenmemiş, alan farkı var   -> güncelle',
  '   anahtarı istenende, m iptal (program, takvim, tatil, sinav_haftasi) -> geri al (güncel program değerleriyle,',
  '                                                                         elle düzenlenmişse kendi değerleri)',
  '   anahtarı istenende değil, m planlı                                 -> iptal (neden)',
  'istenende olup mevcutta olmayan, başlangıcı şimdiden sonra olan oluşum  -> ekle',
  'güncellemeyle yeni başlangıcı şimdiye eşit ya da geçmişte kalacak m     -> dokunulmaz (BUGUNKU_OTURUM_KORUNDU)',
  'başlamış ya da geçmiş oturum, telafi ve deneme oturumu                 -> dokunulmaz',
  'uygula (tek işlem): ders FOR UPDATE ve hocanın yeniden denetimi, plan, INSERT ve UPDATE (surum 0, anlar AT TIME ZONE ile),',
  '   oturum_degisiklikleri (degisiklik_ani = olay.an), D02 damgası (D06.surumDamgasiIste),',
  '   dinleyiciler (D04; satır yazar, surumAl çağırmaz, damgasını D06.surumDamgasiIste ile bırakır),',
  '   denetim (D09), D08 işi (DEVAM_NEDENLERI.PROGRAM), en son tek D06.surumAl: bütün damgalar aynı sürümle',
].join('\n')) + '</code></pre>');
P('<p><strong>İndirme kaynakları</strong> (D06.indirmeKaynagiKaydet ile kayıtlı; zarf, imleç, sayfa kesme ve baştan indirme kararı D06\'nındır, D06-B15):</p>');
P('<ul>' + [
  'Beş genel kaynak: dersler, program_saatleri, oturumlar, takvim_tatilleri, kilit (GenelKaynak, roller OGRENCI ve PERSONEL). Her biri degisenler(tx, { kapsam, surumden, surumeKadar, adet }) ile sürümü (surumden, surumeKadar] aralığındaki satırları sürüm sırasıyla en çok adet kadar döner; surumden null tam indirmedir; imleçten eski sürüm hiç dönmez, böylece D06\'nın sayfa kesmesi her sayfada ilerler. Satır biçimi IndirilenSatir { id, surum, silindi, veri }; kilit satırının kimliği birimId:donemId.',
  'Süzgeç D06\'nın Kapsam nesnesidir: dersler kapsam.dersler; program saati ve oturum, ders kapsamda ve şube kümesi kapsam.subeler ile kesişiyorsa; kilit, kapsamdaki derslerin (birim, dönem) çiftleri; tatil, bu birim dönemlerine bağlı takvimlerin tatilleri. Tatilin indirme sürümü GREATEST(tatil sürümü, bağlı birim dönemi sürümü): bağ değişince ya da ders yeni birime taşınınca birim dönemi damgalanır ve yeni takvimin eski tatilleri aralığa girer.',
  'Kapsam kaynakları: öğrenci kapsamı D03\'ün (liste satırının şubesi; pasif satırda ders telefonda kalır, D03-B13); personel kapsamı D02\'nin KapsamKaynagi(PERSONEL) (D02 yalnız bunu kaydeder, I094): kapsam() kişinin hocası olduğu etkin derslerin ve kilitle ya da hocasız kalıp arşivlenip kilit anından 180 gün geçmemiş derslerin şube, ders ve birim kümeleri; degistiMi(kisi, kapsamSurumu, surumeKadar) kişinin şimdiki ya da hoca_atama_gecmisi içinde önceki hocası olduğu bir dersin kapsam_degisim_surumu (kapsamSurumu, surumeKadar] içindeyse true (açılış, devir, hoca arşivi, hocasız arşiv, birim değişikliği, kilitten dönüş). Kapsam değişince D06 baştan indirir; kapsam olayı ya da sanal satır yoktur.',
  'silindi yalnız imleçten sonra değişip kullanıcının görme kapsamından çıkan satırda kullanılır: öğrencide şubesi kümeden çıkarılan program saati ve oturum { id, silindi: true } olarak gider (telefon elindeyse siler, hiç almamışsa yok sayar, şubesi çıkarılan öğrencinin telefonu o oturumda pencere açmaz); hocanın arşivlediği dersin yalnız ders satırı silindi: true olarak gider, öbür satırları dönmez. Kaldırılan program saati ve tatil silinme_ani\'nden türeyen silindi: true ile, iptal oturum durumuyla iner. Tam indirmede silindi satırı gönderilmez.',
  'Arşiv: kilitle ya da hocasız kalıp arşivlenen ders kilit anından 180 gün sonrasına kadar kapsamda kalır (telefonda Dönem kapandı; başlangıç değeri, telefon aynı kuralla yerel dersi siler).',
  'Sütunlar: kafa sayısı ve yapıldı hiçbir telefona inmez (hoca çevrimiçi uçlardan okur); ders satırında birimId, donemId ve takipBaslangici iner; hocanın görünen adı sayfa başına her hoca için bir kez D01.kisiGetir ile.',
].map(x => `<li>${lnk(x)}</li>`).join('') + '</ul>');
P(`<details><summary>${P3.invariants.length} değişmez: her zaman doğru kalması gerekenler</summary>`);
P('<ol>' + P3.invariants.map(x => `<li>${lnk(x)}</li>`).join('') + '</ol>');
P('</details>');
const sozlesmeAdlari = new Set(mod.exports.map(x => x.split('(')[0].trim()));
const nSozlesme = spec.exports.filter(x => sozlesmeAdlari.has(x.name)).length;
P(`<details><summary>Dış yüz (${spec.exports.length} öğe): contracts.json listesindeki ${nSozlesme} işlev ve eklenti; ek ${spec.exports.length - nSozlesme} öğe (seçenek ve olay tipi, değer sabitleri, denetim olayı haritası, iş tanımları)</summary>`);
P('<table>');
P(th(['İşlev', 'İmza', 'Amaç']));
for (const x of spec.exports) P(tr([code(x.name), code(x.signature), lnk(x.purpose)]));
P('</table>');
P('</details>');
P(`<details><summary>${P4.denetim_olaylari.length} denetim olay türü (D09.denetimeYaz; şemalar packages/contracts/src/dersler.ts'teki DERSLER_DENETIM_OLAYLARI haritasında, bileşim kökü D09.denetimOlaylariniKaydet ile kaydeder; dersId taşıyan her olay zarfta birimId de taşır; alan adları D09'un yasak adlarıyla çakışmaz, her olay 8 KB altında; I045)</summary>`);
P('<table>');
P(th(['Tür', 'Zarf', 'Önceki', 'Sonraki', 'Ayrıntı']));
for (const x of P4.denetim_olaylari) P(tr([code(x.tur), esc(x.zarf), esc(x.onceki), esc(x.sonraki), esc(x.ayrinti)]));
P('</table>');
P('</details>');

// Hata kodları
P('<h3>Hata kodları</h3>');
P(`<p>${esc('Kodlar packages/contracts/src/dersler.ts içinde, her biri tek HTTP durumuna bağlı; birleştirme hatalar.ts (D13). Kaynak düzeyi ret ve yokluk varlığı sızdırmamak için tek kodla 404 DERSLER_BULUNAMADI döner; rota düzeyi rol reddi D13\'ün 403 API_ROL_YETKISIZ kodudur; DERSLER_ önekli 403 yalnız ilke düzeyi red (inceleme hesabı); 409 sunucu durumuyla çakışma ve beklenen numara uyuşmazlığı; 400 yalnız gövdeden anlaşılan hata; sonuç büyüklüğü D13\'ün 422 API_SONUC_COK_BUYUK kodudur (D13-B02).')}</p>`);
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
P(`<p>${esc(`Envanterdeki ${INV.gaps.length} boşluğun ${spec.resolved_gaps.filter(r => /^D02-B/.test(r.gap)).length} tanesi burada kararla kapandı, ${INV.gaps.filter(g => g.needs_owner).length} tanesi ürün kararı istediği için açık noktada önerilen varsayılanla bekliyor; ${kapanan.length} sözleşme ve komşu eki (eski açık noktalar) mimarın kararıyla kapandı ve aynı tabloda karar kimliğiyle yazılı (align/decisions.json); ${INV.contradictions.length} çelişki çözüldü.`)}</p>`);
P(`<details><summary>${spec.resolved_gaps.length} karar (boşluk ve kapanan açık nokta): karar ve nedeni</summary>`);
P('<table>');
P(th(['Boşluk ya da açık nokta', 'Karar', 'Neden']));
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
P(`<div class="callout warn"><p>${esc(`${spec.open_points.length} soru karar bekliyor; sunucu öneriyle kurulur, karar değişirse yalnız varsayılan ya da kural değişir. Mimarın karar verdiği açık nokta kalmadı.`)}</p><ul>`);
for (const o of spec.open_points) P(`<li><strong>${esc(o.id)}</strong> <span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'ürün kararı' : 'sözleşme ya da komşu eki'}</span> ${lnk(o.question)} Öneri: ${lnk(o.recommendation)}</li>`);
P('</ul></div>');
P('</section>');

const html = out.join('\n') + '\n';
if (/[–—]/.test(html)) { console.log('HTML U+2013 ya da U+2014 içeriyor'); process.exit(1); }
{ let govde = html; for (const r of kapanan) govde = govde.split(tr([code(r.gap), lnk(r.decision), lnk(r.why)])).join('');
  const kalan = ESKI.filter(t => govde.includes(esc(t)) || govde.includes(t)); if (kalan.length) { console.log('bölümde emekli ad ya da kimlik: ' + kalan.join(', ')); process.exit(1); } }
{ const gocSatiri = (html.match(/<div class="k">Göç<\/div><div>(.*?)<\/div><\/div>/) || [])[1] || ''; if (!gocSatiri.includes(esc(gocKlasoru))) { console.log('bölümde göç klasörü contracts.json ile aynı değil: ' + gocKlasoru); process.exit(1); } }
fs.mkdirSync(path.join(OUT, 'frag'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'frag', 'D02.html'), html, 'utf8');
console.log(`yazıldı: spec/D02.json (${tables.length} tablo, ${endpoints.length} uç, ${P3.jobs.length} iş, ${spec.exports.length} dış yüz, ${spec.files.length} dosya, ${spec.tests.length} test, ${spec.resolved_gaps.length} karar, ${spec.open_points.length} açık nokta), frag/D02.html (${html.length} karakter)`);
