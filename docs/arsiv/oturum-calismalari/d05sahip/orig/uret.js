// spec/D05.json ve frag/D05.html'i icerik.js'ten üretir. Çalıştır: node uret.js
const fs = require('fs'), path = require('path');
const I = require('./icerik.js');
const basliklar = require('./anchors.js')();
const KOK = path.resolve(__dirname, '..', '..');

// ---------- JSON ----------
const duz = s => String(s).replace(/[«»]/g, '');
const derin = v => Array.isArray(v) ? v.map(derin) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, derin(x)])) : (typeof v === 'string' ? duz(v) : v);
const spec = derin({
  id: 'D05',
  module: 'yoklama',
  summary: I.summary,
  tables: I.tables,
  endpoints: I.endpoints,
  queue_items: I.queue_items,
  jobs: [],
  migrations: I.migrations,
  state_machines: I.state_machines,
  invariants: I.invariants,
  exports: I.exportsList,
  tipler: I.tipler,
  files: I.files,
  tests: I.tests,
  resolved_gaps: I.resolved_gaps,
  contradictions_resolved: I.contradictions_resolved,
  alignment_applied: I.hizalama,
  open_points: [...I.open_points].sort((a, b) => a.id.localeCompare(b.id)),
});
fs.mkdirSync(path.join(KOK, 'spec'), { recursive: true });
fs.writeFileSync(path.join(KOK, 'spec', 'D05.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');

// ---------- HTML ----------
const ADLAR = {
  'plan.html#gun-ikinci-capa': 'İkinci çapa', 'plan.html#gun-kayit-etiketleri': 'Kayıt etiketleri', 'plan.html#gun-son-durumlar': 'Son durumlar',
  'plan.html#gun-kenar-durumlar': 'Kenar durumlar', 'plan.html#gun-zayif-nokta': 'Zayıf nokta', 'plan.html#asama23-okutma': 'Aşama 2, Okutma',
  'plan.html#asama23-degisme-ve-kabul': 'Değişme ve kabul', 'plan.html#hile-rastgele-isim': 'Rastgele isim', 'plan.html#dagitim-guncelleme': 'Güncelleme',
  'plan.html#acik-saklama-suresi': 'Saklama süresi', 'plan.html#teknoloji-sunucu-yeri': 'Sunucu yeri', 'teknik.html#kod-veri-modeli': 'Veri modeli',
  'teknik.html#sunucu': 'Sunucu', 'tasarim.html#head-sw-l': 'Kafa sayısından önce', 'tasarim.html#pnl-table': 'Yoklama tablosu',
  'tasarim.html#pnl-drawer': 'Panel ekranı notları', 'tasarim.html#ph-success': 'Makbuz ekranı', 'tasarim.html#ph-records': 'Kayıtlar ekranı',
  'tasarim.html#anat-receipt': 'Makbuz bileşeni', 'tasarim.html#platform-titresim': 'Titreşim',
};
const BELGE = { plan: 'plan', teknik: 'teknik', tasarim: 'tasarım' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eksikBag = [];
function f(s) { // metni HTML'e çevir: kaçış, «kod», belge bağlantıları
  return esc(s).replace(/«([^»]*)»|\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (m, kod, belge, id) => {
    if (kod !== undefined) return `<code>${kod}</code>`;
    const anahtar = `${belge}.html#${id}`;
    const ad = ADLAR[anahtar] || basliklar[anahtar];
    if (ad === undefined) eksikBag.push(anahtar);
    return `<a href="${anahtar}">${BELGE[belge]}: ${esc(ad || id)}</a>`;
  });
}
const kodla = s => `<code>${esc(s)}</code>`;
const tablo = (basliklar, satirlar) => `<table>\n<thead><tr>${basliklar.map(b => `<th>${esc(b)}</th>`).join('')}</tr></thead>\n<tbody>\n${satirlar.map(r => `<tr>${r.map(h => `<td>${h}</td>`).join('')}</tr>`).join('\n')}\n</tbody>\n</table>`;
const satir = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;
const ayrinti = (ozet, ic) => `<details>\n<summary>${ozet}</summary>\n${ic}\n</details>`;
const liste = (ogeler, sirali) => `<${sirali ? 'ol' : 'ul'}>\n${ogeler.map(o => `<li>${o}</li>`).join('\n')}\n</${sirali ? 'ol' : 'ul'}>`;
const kalin = s => s.replace('&lt;strong&gt;', '<strong>').replace('&lt;/strong&gt;', '</strong>');

const H = [];
H.push(`<section id="yoklama">`);
H.push(`<h2>Kayıt, imza ve makbuz</h2>`);
H.push(`<p class="meta">D05 · yoklama modülü · apps/server/src/modules/yoklama · sözleşme packages/contracts/src/yoklama.ts · ortak kurallar packages/core/src/yoklama</p>`);

// Amaç ve sınırlar
H.push(`<h3>Amaç ve sınırlar</h3>`);
H.push(`<p>${f("Telefon kaydı bir kez tek metin olarak üretip imzalar; metin telefonda, kuyrukta ve sunucuda aynen durur (plan.html#kararlar-kayit-ve-makbuz, teknik.html#sunucu-imza-dogrulama). Bu modül o kaydın sunucudaki tek sahibidir: zarfı ayrıştırır, imzayı gelen baytlar üzerinde doğrular, kaydı değiştirmeden saklar ve her kayda KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE sonucu verir. Karar ve etiket kuralları D07'nin, saat ve pencere kuralları D04'ün, taşıma, ulaşma anı ve indirme D06'nın; bu modül onların sonucunu kayıt satırına yazan tek yerdir.")}</p>`);
H.push(`<div class="rows">`);
H.push(satir('Kapsam', f("Kayıt zarfı ve kayıt metni (şema, kodlama, 1273 bayt sınırı); imza doğrulama (Android P-256, Secure Enclave, App Attest onayı ve iOS 27 uzantıları); 'zaten var' ve 'ret' karşılaştırması; «yoklama_kaydi» ve «makbuz_okutmasi» öğe işleyicileri; saat sonucunun ve gelişteki pencere sonucunun kayıpsız sütunlara yazımı; (oturum, öğrenci) çift anahtarı ve öğe kilit anahtarları; sayılan kayıt seçimi; karar sütunlarının ve karar sürümünün yazımı (değeri D07 verir); öğrencinin kendi kayıtları indirme kaynağı; oturum kayıtları ucu; kanıt çıkarma işlevi ve kanıt komutu; iki tablonun göçleri, yetkileri ve saklama sınıfı.")));
H.push(satir('Kapsam dışı', f("Taşıma, paket imzası, danışma kilitlerinin paket başına alınması, ulaşma anı ve ulaşma makbuzu, su seviyesi, indirme imleci ve sıra boşluğu ölçümü (D06); karar, etiket, pencere sonucunun karara eşlenmesi, 2'lik sınır, App Attest sayaç kuralı ve iOS 27 alanlarının karşılaştırılması (D07); saat belgesi, çapa, pencere ve pencere sonucunun hesabı (D04); danışma kilidi katmanları ve saklama kataloğu (D12); elle ekleme, düzeltme, sorun bildirimi ve denetim tablosu (D09); cihaz, anahtar ve hesap (D01); raporlar (D10) ve olcum_ görünümleri (D15) bu tabloyu yalnız okur.")));
H.push(satir('Kullandığı dış yüzler', f("D01 «cihazAnahtariGetir», «cihazGetir», «kisiGetir», «ogrenciHesabiGetir» (toplu numaralar) · D02 «oturumGetir», «oturumSubeleri», «dersGetir» (hocaAtamaGecmisi), «dersYetkisi(tx, kimlik, dersId)», «kilitDurumu», «oturumlariGetir», «kilitliBirimDonemleri» ve OTURUM_TURLERI, OTURUM_DURUMLARI, IPTAL_NEDENLERI sabitleri · D03 «listeSatirlari» · D04 «simdi», «saatBelgesiDogrula», «esitlemeSaglikliMi», «pencereSonucu», packages/core/src/saat'in «saatSonucu» işlevi ve saat.ts sabitleri · D06 «ogeTuruKaydet», «indirmeKaynagiKaydet», «ogrenciDurumuDegisti», «gondermeSuresiSonu» · D07 «appAttestSayaciniDenetle», «kararHesapla», «kararGecmisineYaz» (index.ts) ve dogrulama.ts'ten «kararAnahtarlari», kod listeleri · D08 «devamHesaplaIsiKoy» (devam/yaprak.ts) ve DEVAM_SON_DURUMLARI · D09 «denetimeYaz», «denetimOlaylariniKaydet», «duzeltmeleriGetir» (duzeltmeler/yaprak.ts), «sonDurumOnceligi» (packages/core) · D11 «qrKanitiniAyristir», «qrKilitAnahtarlari» (Aşama 2) · D12 «islem», «danismaKilidi», «kisitAdi», «tabloYardimcilari», «saklamaIsleyicisiKaydet» · D13 «rotalariKaydet», «ogeTuruTanimla», «uygulamaHatasi», «hizSinifi», EklentiTemelSecenekleri. Log, app.ts'in verdiği Fastify kaydedicisidir.")));
H.push(satir('Kaydolduğu yerler', f("yoklamaEklentisi içinde (index.ts yüklenirken değil): D06'ya «ogeTuruKaydet('yoklama_kaydi', { roller: ['OGRENCI'], oturumGerekli: false, govdeEnBuyukBayt: 2048, ilkCapaVar: false, ayrintiSemasi: YoklamaAyrintisi, kilitAnahtarlari, isleToplu })» ve «ogeTuruKaydet('makbuz_okutmasi', { roller: ['PERSONEL'], oturumGerekli: true, govdeEnBuyukBayt: 2048, ilkCapaVar: true, ayrintiSemasi: OkutmaAyrintisi, kilitAnahtarlari, isleToplu })»; «indirmeKaynagiKaydet('ogrenci_kayitlari', { tur: 'ogrenci', bolum: ogrencininKayitlari })»; D12'ye «saklamaIsleyicisiKaydet('yoklama.donem_verisi', { modul: 'yoklama', islem: 'silme', partiIsle })»; D09'a «denetimOlaylariniKaydet('yoklama', YOKLAMA_DENETIM_OLAYLARI)»; D13'e «rotalariKaydet(app, YOKLAMA_ROTALARI)» (tek uç). Öğe gövde şemaları sözleşme dosyasında D13.ogeTuruTanimla ile tanımlıdır. App Attest uygulama kimliği (takım kimliği ve paket adı) eklenti seçeneği olarak app.ts'ten gelir.")));
H.push(satir('Modül sınırı', f("D07'nin çağırdığı işlevler (kayitGetir, kayitlariKilitle, oturumKayitlari, sayilanKayitlar, kararSutunlariniYaz) modules/yoklama/yaprak.ts'tedir. Yaprak kuralı (contracts.json ortak kuralı, A2): yaprak.ts başka alan modülünden yalnız yaprak.ts içe aktarır, burada devam (devamHesaplaIsiKoy), esitleme (ogrenciDurumuDegisti) ve duzeltmeler; hiçbir index.ts'i ve D07'den hiçbir dosyayı almaz; D02 gerekmez (ders_id sütunu, skip scan). D07 D05'i yalnız yaprak.ts'ten ya da eklenti seçeneğiyle kullanır; modules/yoklama'nın öbür dosyaları D07'nin index.ts'ini (kararHesapla, kararGecmisineYaz, appAttestSayaciniDenetle) içe aktarır. cli/yoklama-kaniti.ts bileşim köküdür, çift saymaz. D13'ün sınır testi dependency-cruiser ile no-circular ve yaprak kuralını sıfır ihlalle koşar.")));
H.push(satir('Birleşim', f("index.ts yoklamaEklentisi'ni ve EklentiTemelSecenekleri'ni ({ surec }) genişleten YoklamaEklentisiSecenekleri tipini dışa verir. Eklenti altyapıyı seçenekten alır, kayıt sırasında veritabanına dokunmaz; zamanlanmış işi olmadığından surec 'api' iken de zamanlayıcı kurmaz; kayıtlarını her süreçte yapar. Rotalar yalnız D13.rotalariKaydet ile; setErrorHandler ve setNotFoundHandler yok. Hata kodu öneki YOKLAMA_; kaynak düzeyi ret 404 YOKLAMA_BULUNAMADI, rota düzeyi rol reddi API_ROL_YETKISIZ (teknik.html#sunucu-mimari).")));
H.push(satir('Ölçülen sonuç', f("'Sunucuya ulaştı' makbuzlu kayıtta kayıp 0; kayıtların en az %95'i 24 saatte (ulasma_ani ile hesaplanan_ani farkı); saati doğrulanamayan oranı platforma ve sebebe göre (imza_turu, saat_sebebi); işaretlenmeden kabul (ilk_kesin_karar). Hepsi bu tablodan tek sorguyla (plan.html#hedefler, plan.html#kararlar-olcum). Her öğe sonucu tek log satırı bırakır: olay, tür, sonuç, gerekçe, kurulum kimliği, istek kimliği, süre; numara ve isim yok.")));
H.push(satir('Göçler', f(`«${I.migrations.dir}» (contracts.json migration_dir ile aynı; dosya haritasında «${I.migrations.glob}» globu bu modülündür). ${I.migrations.dosyalar} Klasörler: ${I.migrations.klasorler.map(k => `«${k.split(':')[0]}»${k.slice(k.indexOf(':'))}`).join('; ')}. ${I.migrations.kural} Göç dosyaları dosya listesinde değil iş paketinde yer alır.`)));
H.push(satir('Yeni paket', f("node-app-attest, sürümü tam sabit; apps/server/package.json'a D15 ekler. Bakımı durursa koda alınır (teknik.html#temel-yedek-paketler).")));
H.push(`</div>`);
H.push(ayrinti(`Dış yüz: ${I.exportsList.length} öğe (contracts.json listesiyle aynı), imzaları ve kimin çağırdığı`, tablo(['Ad', 'İmza', 'Amaç'], I.exportsList.map(e => [kodla(e.name), `<code>${esc(e.signature)}</code>`, f(e.purpose)]))));
H.push(ayrinti(`Tipler ve sözleşme dosyası: yoklamaCiftAnahtari, öğe gövde şemaları, denetim olayları, KayitTaslagi, YoklamaKaydi ve öğe ayrıntıları`, `<p>${f("D05 ile D07 bu tiplere karşı ayrı ayrı yazılabilir. YoklamaKaydi sütun listesinin camelCase halidir; bir sütun eklenip tipe eklenmezse tip testi kırılır.")}</p>\n<pre><code>${esc(I.tipler.join('\n'))}</code></pre>`));
H.push(ayrinti(`Dosyalar: ${I.files.length} dosya, hepsi D05'in dosya alanında`, tablo(['Dosya', 'İçerik'], I.files.map(p => [kodla(p), f(I.DOSYA_ACIKLAMA[p] || '')]))));

// Tablolar
H.push(`<h3>Tablolar</h3>`);
H.push(`<p>${f("İki tablo, ikisi de UUIDv7 kimlikli ve dönem kimliği bütün anahtarlarda başta (teknik.html#veritabani-donem-alani). Durum ve kod sütunları PostgreSQL enum değil metin ve CHECK; değer listeleri sahibinin sözleşme sabitlerinden üretilir (teknik.html#sunucu-mimari). Anlık zamanlar timestamptz, kural taşıyanlar saat arayüzünden ya da D06'nın ulaşma anından yazılır.")}</p>`);
for (const t of I.tables) {
  const ic = [`<p>${f(t.purpose)}</p>`,
    tablo(['Sütun', 'Tip', 'Boş', 'Varsayılan', 'Not'], t.columns.map(k => [kodla(k.name), kodla(k.type), k.null ? 'evet' : 'hayır', k.default ? kodla(k.default) : '', f(k.note)])),
    `<p><strong>Dizinler</strong></p>`, liste(t.indexes.map(f)),
    `<p><strong>Kısıtlar ve yetkiler</strong></p>`, liste(t.constraints.map(f))].join('\n');
  H.push(ayrinti(`${kodla(t.name)}: ${t.columns.length} sütun, ${t.indexes.filter(x => /_(pk|uq|idx):/.test(x)).length} dizin`, ic));
}

// Uç noktalar
H.push(`<h3>Uç noktalar</h3>`);
for (const e of I.endpoints) {
  H.push(`<div class="rows">`);
  H.push(satir('Uç', `<code>${esc(e.method + ' ' + e.path)}</code> <span class="tag">${esc(e.client)}</span>`));
  H.push(satir('Kimlik', f(e.auth)));
  H.push(satir('İstek', liste(Object.entries(e.request).map(([k, v]) => `${kodla(k)}: ${f(v)}`))));
  H.push(satir('Cevap (200)', liste(Object.entries(e.response).map(([k, v]) => `${kodla(k)}: ${f(v)}`))));
  H.push(satir('Hatalar', liste(e.errors.map(f))));
  H.push(satir('Tekrar', f(e.idempotency)));
  H.push(satir('Hız sınırı', f(e.rate_limit)));
  H.push(`</div>`);
}
H.push(`<div class="callout">${kalin(f("<strong>Kuyruk öğeleri.</strong> Kayıtlar ve okutmalar ayrı uçtan değil, ortak kuyruğun tek ucundan (POST /v1/esitleme/gonderim, D06) öğe olarak gelir. D06 yalnız dağıtır, ulaşma anını ve ulaşma makbuzunu verir; öğe gövdesinin şeması, iş kuralı ve sonucu bu modülündür. Sonuçlar 200 gövdesinde öğe başına D06'nın OgeSonucu biçiminde döner, bozuk öğe paketi düşürmez (plan.html#kararlar-gonderme)."))}</div>`);
for (const q of I.queue_items) {
  const ic = ['<div class="rows">',
    satir('Gelir', f(q.gelir)),
    satir('Kayıt', f(`«${q.kayit}»`)),
    satir('Kimlik', f(q.kimlik)),
    satir('Gövde', liste(Object.entries(q.govde).map(([k, v]) => `${kodla(k)}: ${f(v)}`))),
    satir('Bağlam (D06)', liste(Object.entries(q.baglam).map(([k, v]) => `${kodla(k)}: ${f(v)}`))),
    satir('Sonuç (OgeSonucu)', liste(Object.entries(q.sonuc).map(([k, v]) => `${kodla(k)}: ${f(v)}`))),
    satir('Tekrar', f(q.idempotency)),
    satir('Gerekçe kodları', f(`Hata kodları bölümündeki öğe gerekçelerinden bu türde çıkabilenler: ${q.errors.join(', ')}.`)),
    '</div>'].join('\n');
  H.push(ayrinti(`${kodla(q.tur)}: ${esc(q.tur === 'yoklama_kaydi' ? "öğrencinin imzalı kaydı, cihaz imzasıyla" : "hocanın okuttuğu makbuz, hocanın giriş oturumuyla")}`, ic));
}

// İşler
H.push(`<h3>İşler</h3>`);
H.push(`<p>${f("D05'in zamanlanmış işi yoktur; «apps/server/src/jobs/yoklama/index.ts» boş liste verir (worker.ts bütün modülleri bir kez listeler). Kayda bağlı iş kaydı yazan işlemin içinde ve aynı bağlantıda yapılır: D07'nin kararı ve karar geçmişi, devam hesabı işinin kuyruğa konması (D08.devamHesaplaIsiKoy, her çağrı bir iş satırı; kuyruk D14'ün) ve öğrencinin durum sürümü (D06), bu sırayla ve satırlardan sonra.")}</p>`);
H.push(`<p>${f("Kayda dokunan zamanlanmış işler başkalarınındır ve bu modülü yalnız dış yüzden çağırır: bekleyen_kararlari_coz ve pencere_beklemede_kesinlestir olay işi (D07, kayitlariKilitle ya da kararAnahtarlari ve kararSutunlariniYaz ile), esitleme_sonrasi_yeniden_degerlendir (D04, D07 üstünden), gece_inceleme_siralamasi (D09, sayilanKayitlar ile), sira_boslugu_raporu (D06, kendi defterinden), saklama_suresi_isi (D12, katalogdaki «yoklama.donem_verisi» sınıfıyla). Kanıt komutu «apps/server/src/cli/yoklama-kaniti.ts» iş değil, elle çalışan bileşim köküdür.")}</p>`);

// Durumlar ve kurallar
H.push(`<h3>Durumlar ve kurallar</h3>`);
H.push(`<p>${kalin(f("<strong>Zarf ve kayıt metni.</strong> Zarf kuyrukta, istekte ve makbuz QR'ında aynı tek ASCII metindir; sunucu saklarken ve karşılaştırırken yeniden biçimlendirmez (teknik.html#sunucu-imza-dogrulama, teknik.html#telefon-kamera-qr)."))}</p>`);
H.push(`<pre><code>${esc(`IUY1.<kayıt metni>.<tür>.<imza>
  kayıt metni  base64url (dolgusuz) UTF-8 JSON; imzalanan baytlar bu metnin ASCII baytları
  tür          a  Android Keystore P-256 (DER, SHA-256)
               s  Secure Enclave P-256 (DER, SHA-256)
               i  App Attest onayı (CBOR: authenticatorData, signature)
  imza         base64url (dolgusuz)
  üst sınır    1273 bayt (L düzeyinde QR sürüm 25)

Kayıt metninin içi, v1 (Aşama 1):
{"tur":"kayit","v":1,
 "id":"0199b9a4-3c1e-7d2a-9f10-5b2c7e8a4d61",
 "cihaz":"0198f0c2-77a1-7b3e-8c55-1d2e3f4a5b6c",
 "anahtar":"0198f0c2-77a2-7c11-9a0b-2c3d4e5f6a7b",
 "sira":42,
 "oturum":"0198e7d0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
 "ogrenci":"0198d1e2-f3a4-7b5c-9d6e-7f8a9b0c1d2e",
 "belge":"<saat belgesi aynen, D04 biçimi>",
 "belgeIstegiMs":180,"belgedenKayitMs":5400000,"ilkCapa":"<D04 değeri>",
 "telefonSaati":"2026-10-06T07:03:21.000Z","saatDilimi":"Europe/Istanbul",
 "uygulamaSurumu":"1.0.0","runtimeSurumu":"1.0.0","guncellemeKimligi":null}
Aşama 2 ve 3 isteğe bağlı alanları (D11 KayitKanitAlanlari): qr, yedekKod, qrYetenegi, bluetooth, konum`)}</code></pre>`);
H.push(`<p>${f("Metinde öğrenci numarası, isim, kod ya da jeton yoktur; dönem yazılmaz, oturumdan bulunur. Şema «z.object» ile strip kipindedir: bilinmeyen alan atılır, kayıt reddedilmez; sunucu bildiği her v'yi okumayı sürdürür, kayıt gönderme yolu hiçbir sürüme kapanmaz (plan.html#dagitim-guncelleme-ilkesi). Aşama 2 ve 3 alanları D11'in KayitKanitAlanlari şemasından içe alınır, iki yerde yazılmaz.")}</p>`);
H.push(`<p><strong>İşleme sırası</strong> ${f("(1. adım paket başına D06'nın içinde, öbürleri isleToplu'nun her parçasında; makbuz okutması gövde ve hoca denetimlerinden sonra aynı çekirdeği OKUTMA yoluyla kullanır; genel sıra contracts.json'daki danışma kilidi katmanlarıdır: danışma anahtarları, satırlar, iş kuyruğu ve öğrenci sürümü, en son genel sayaç)")}</p>`);
H.push(liste([
  "Anahtarlar (kilitAnahtarlari, D06 hiçbir grubu işlemeden önce çağırır). Gövde imza beklenmeden çözülür; metindeki öğrencisi paketin kişisi olan (okutmada gövdedeki hocaId paketin kişisi olan) her öğe için D07.kararAnahtarlari([{ oturumId, ogrenciId, anahtarId }]) (çift anahtarı yoklamaCiftAnahtari ile 'yoklama:cift:<oturumId>:<ogrenciId>', katman 3; anahtarId yalnız App Attest kaydında, 'dogrulama:sayac:<anahtarId>', katman 4) ve Aşama 2 alanı varsa D11.qrKilitAnahtarlari({ oturumId, ogrenciId, alanlar }) döner. Çözülemeyen ya da başka kişinin öğesi anahtar vermez. D06 bütün grupların anahtarlarını kendi 'esitleme:kurulum_siniri:<kisiId>' anahtarıyla tek D12.danismaKilidi çağrısında alır; isleToplu yeni danışma anahtarı istemez.",
  "Yazısız doğrulama, öğe öğe. Zarf ayrıştırılır (packages/core/src/yoklama/zarf.ts): önek, üç ayırıcı, en çok 1273 bayt, kanonik base64url, UTF-8 JSON, KayitMetni şeması; bozuksa RET YOKLAMA_ZARF_BOZUK ya da YOKLAMA_METIN_BOZUK, önek ya da v bu sunucudan yeniyse TEKRAR_DENE YOKLAMA_BICIM_SURUMU_BILINMIYOR (beklemeSaniye 3600). yoklama_kaydi'nda GelenOge.ogeKimligi metindeki id değilse RET YOKLAMA_OGE_KIMLIGI_UYUSMUYOR.",
  "Anahtar D01.cihazAnahtariGetir ile etkinliğine bakılmadan bulunur; tür harfi ve metindeki cihaz tutmalı. İmza gelen baytlar üzerinde metindeki anahtarla doğrulanır: a ve s için Node «crypto.verify('sha256', ..., { dsaEncoding: 'der' })»; i için node-app-attest (uygulama kimliği özeti ve imza; sayaç kütüphaneye 0 verilerek geçilir, sıra numarasına göre D07 denetler); App Attest doğrulayıcı verisinden sayaç ve iOS 27 uzantıları (açılış doğrulama türü, paket sürümü) çıkarılır. Geçmezse RET YOKLAMA_IMZA_GECERSIZ, yalnız log; saklı kayda bakılmaz.",
  "Bağlar: cihaz metindeki öğrenciye bağlı olmalı (D01.cihazGetir), değilse RET YOKLAMA_OGRENCI_CIHAZ_UYUSMUYOR. Telefon yolunda paketin kişisi (PaketBaglami.kisiId) metindeki öğrenci olmalı, değilse RET YOKLAMA_GONDEREN_UYUSMUYOR ve saklı kayıt olsa bile karar dönmez. İkisi de sınırlı denetim kaydı yazar. Oturum D02.oturumGetir ile bulunur, dönem, ders ve oturumun başlangıç ve bitişi oradan alınır; yoksa RET YOKLAMA_OTURUM_BILINMIYOR.",
  "Okuma ve karşılaştırma. Kimlik bütün dönemlerde aranır. Metin aynıysa ZATEN_VAR (imza baytları farklı olabilir; ikisi de aynı anahtarla doğrulanmıştır), saklı ulaşma anını ve güncel kararı taşır; metin farklıysa RET YOKLAMA_KIMLIK_CAKISMASI ve denetim kaydı. Geliş yolu bakılmaz. Aynı dönemde (cihaz, sıra) başka kimlikle saklıysa RET YOKLAMA_SIRA_CAKISMASI; cihazın bu oturumda 10 saklı kaydı varsa RET YOKLAMA_OTURUM_KAYIT_SINIRI.",
  "Saat: D04.saatBelgesiDogrula ve packages/core/src/saat'in saatSonucu'su; ulaşma anı GelenOge.ulasmaAni, esitlemeSaglikli D04.esitlemeSaglikliMi. İkinci çapa girdisi yola göre seçilir: kaydın kendi cihazının paketi (gönderen imzalayan.cihazId, yoksa oturum.cihazId, ikisi de yoksa kendi cihazı sayılır) GelenOge.ikinciCapa; okutma { yokNedeni: 'OKUTMA_YOLU' }; başka cihaz { yokNedeni: 'BASKA_CIHAZ_GONDERDI' } (D04 sabitleri). Kendi cihazında ilk çapa geçerli değilse ve ikinci çapa PAKET_IMZASIZ, ESITLEME_BOZUK ya da GONDERILMEDI nedeniyle yoksa TEKRAR_DENE YOKLAMA_IKINCI_CAPA_GEREKLI (ESITLEME_BOZUK'ta beklemeSaniye 300), kayıt saklanmaz (plan.html#gun-ikinci-capa). SONRA_YENIDEN_BASLATMA, KAYIT_7_GUNDEN_ESKI ve geçersiz ikinci belge kalıcıdır: kayıt saklanır.",
  "Pencere: kalan öğeler oturum kimliğine göre sıralanır ve her biri için D04.pencereSonucu(tx, { oturumId, kayitSaati, kayitUlasmaAni }) çağrılır (pencere satırı FOR KEY SHARE; kayıt satırı, D07'nin ortak sınır satırı ve öğrenci sürümünden önce). kayitSaati SaatSonucu.aralik, aralık yoksa hesaplanan_ani tek noktası.",
  "Karar: öğrencinin silinme anı D01.kisiGetir ile okunur. App Attest kaydında D07.appAttestSayaciniDenetle; Aşama 2 alanları varsa D11.qrKanitiniAyristir; KayitTaslagi kurulur (Tipler; saat, pencereSonucu, oturumOzeti dahil) ve D07.kararHesapla çağrılır (yalnız okur ve kilitler). { tekrarDene: 'DOGRULAMA_BAGLAM_DEGISIYOR' } dönerse öğe TEKRAR_DENE DOGRULAMA_BAGLAM_DEGISIYOR (beklemeSaniye 2), satır yazılmaz.",
  "Ekleme: satır «INSERT ... ON CONFLICT (donem_id, id) DO NOTHING» ile eklenir; karar_surumu 1, pencere_sonucu, ders_id, degisiklik_surumu 0; öğrencinin o oturumdaki ilk kaydıysa sayılan, değilse sayılmayan. Ekleme olmazsa yan etki yazılmadan 5. adımdaki karşılaştırma yapılır. Eklendiyse aynı işlemde: yeni kayıt sıralamada öndeyse eski sayılanın işareti kaldırılır, yenisi işaretlenir; D07.kararGecmisineYaz (sira 1); Aşama 2 kanıt satırı (D11 kaydet). Sonuç KABUL, ayrıntısı YoklamaAyrintisi.",
  "Son adım (çağrı başına, yan etki belleğinden): yazılan her (ders, öğrenci) için bir kez D08.devamHesaplaIsiKoy(tx, dersId, ogrenciId, 'KAYIT', { tur: 'KAYIT', id, donemId }); sonra öğrenci kimliği sırasıyla öğrenci başına bir kez D06.ogrenciDurumuDegisti ve dönen sürüm o öğrencinin bu çağrıda yazılan ya da sayılan işareti değişen satırlarına tek UPDATE ile. Genel sayacı (D06.surumAl) paketin sonunda D06 alır.",
].map(f), true));
H.push(`<div class="rows">`);
H.push(satir('Ulaşma anı', f("Kaydın ulaşma anı GelenOge.ulasmaAni'dir: D06'nın paket başına saat arayüzünden okuduğu an ya da öğe geçerli ulaşma makbuzuyla yeniden geldiyse makbuzdaki an (D12-B31). D05 kendi ulaşma kanıtını üretmez, D04 saat belgesini bu iş için kullanmaz. Öğe gövdesi yeniden gönderimlerde bayt bayt aynı kalır ki makbuz tutsun.")));
H.push(satir('Saklanmadan RET', f(`Makbuz 'Telefonda kayıtlı, gönderilmedi' kalır; kendiliğinden yeniden denenmez (plan.html#kararlar-yeniden-deneme). Yalnız kayda güvenilemeyen durumlar: ${I.RET_KODLARI.filter(r => r[1] === 'RET').map(r => r[0]).join(', ')}. Son ikisi yalnız okutmada çıkar.`)));
H.push(satir('Saklanır, kararı D07', f("Makbuz 'Sunucuya ulaştı', karar ayrıca görünür. İmzası geçerli ve metindeki öğrencinin cihazına bağlı öbür her kayıt: listede olmayan ders, pencere dışı, ulaşma anını aşan saat, eski ya da değişim bekleyen cihaz, silinmiş hesabın silmeden sonraki kaydı (Ret HESAP_SILINMIS), sayacı artmayan App Attest onayı (İncelemede), teyitsiz öğrenci, hatalı sürüm, eşitleme bozukken ulaşan kayıt. Ham kayıt kanıttır, atılmaz (plan.html#kararlar-cihaz-dogrulamasi). Bu ayrım varsayılandır, sahibin kararı D05-A01.")));
H.push(satir('Saat sütunları', f("SaatSonucu kayıpsız yazılır (packages/core/src/yoklama/saatSutunlari.ts): ilk ve ikinci çapa durumu, saat_durumu, saat_kaynagi, aralık (kayit_ani_alt, kayit_ani_ust), hesaplanan_ani = tahminMs (tahminMs yalnız kaynak YOK iken boştur, o zaman telefon_ani), pay_ms, ulasma_anini_asiyor, esitleme_bozukken_ulasti. Değerler D04'ün büyük harfli sabitleridir (OKUTMA_YOLU, BASKA_CIHAZ_GONDERDI dahil; KURULMADI yoktur), CHECK listeleri oradan içe aktarılır. saat_sebebi ve ele_gecmis_anahtar iki çapa durumundan üretilmiş sütunlardır, ayrı değer listesi yoktur. D07 yeniden değerlendirmede saati bu sütunlardan aynen geri kurar; ele geçmiş anahtar ya da ayrışan çapalar yüzünden İncelemede kalan kayıt yeniden hesapta Var'a kaymaz. Gelişteki pencere sonucu pencere_sonucu sütununda kalır (ICINDE, DEGISIM_DILIMI, ESKI_PROGRAM, DISINDA) ve KayitTaslagi.pencereSonucu ile D07'ye gider; pencere sonradan değişirse D07 yeniden değerlendirmede D04.pencereSonucu'nu yeniden çağırır, sütun değişmez.")));
H.push(satir('Sayılan kayıt', f("Sıralama: karar önceliği (VAR, BEKLEMEDE, INCELEMEDE, RET), sonra ulaşma anı, sonra kimlik (packages/core/src/yoklama/sayilan.ts). İlk kayıt sayılan eklenir; sonraki sayılmayan eklenir ve öndeyse aynı işlemde yer değiştirir. Her karar değişikliği seçimi yeniden yapar. Tek kaydı Ret olan öğrencinin sayılanı o kayıttır; son durumu D09.sonDurumOnceligi verir.")));
H.push(satir('Kilit ve işlem', f("Kilitler contracts.json'daki danışma kilidi katmanlarıyla alınır (D12.danismaKilidi; elle pg_advisory_xact_lock yazılmaz): 'yoklama:cift:<oturumId>:<ogrenciId>' katman 3, D07'nin 'dogrulama:sayac:<anahtarId>' katman 4, 'dogrulama:isaret' katman 5; tek genel sıra önce katman, sonra anahtar metnidir ve işlemde zaten tutulan anahtarı yeniden istemek işlemsizdir. Gönderim işleminde sıra: (1) danışma anahtarları, D06'nın paket başına tek çağrısında (kilitAnahtarlari kancası; D06 kendi kurulum sınırı anahtarını ve öbür grupların anahtarlarını da katar); (2) D04.pencereSonucu'nun pencere satırı okumaları, oturum kimliği sırasıyla; (3) satırlar: kayıt satırları, D07'nin ortak sınır satırı, karar geçmişi, Aşama 2 kanıt satırı; (4) iş kuyruğu (D08.devamHesaplaIsiKoy) ve öğrenci sürümü (D06.ogrenciDurumuDegisti, öğrenci başına bir kez, öğrenci kimliği sırasıyla); (5) en son genel sayaç (D06.surumAl, paket başına bir kez, D06'nın). D07.kararDegistir ve yenidenDegerlendir hedeflerin çift kilitlerini D05.kayitlariKilitle ya da D07.kararAnahtarlari ile tek çağrıda, sayaç, ortak sınır ve işaret kilitlerinden önce alır ve kararSutunlariniYaz'ı satır kilitlerinden sonra çağırır; böylece ekleme yolu ile karar yolu aynı sırayla kilitler (D05-A10 kapandı). kararSutunlariniYaz ve kayitGetir(kilitle) aynı çift anahtarını ister, işlemsiz geçer; kardeş satırlar (sayılan yer değiştirmesi) aynı çift kilidi altında olduğundan başka işlem onları tutamaz. Aynı kaydın iki yoldan ve aynı öğrencinin iki kaydının eşzamanlı gelişi sıraya girer; ikinci işlem birincinin yazdığını görür; teknik.html#veritabani satırındaki 'sayılan dizinine takılan kayıt sayılmayan olarak yazılır, kabul alır' sonucu böylece hata oluşmadan sağlanır (D05-A07). Kalan 40P01 PostgreSQL'in kestiği parçadır: D06 o parçayı TEKRAR_DENE ESITLEME_GECICI_CAKISMA yapar, telefon yeniden gönderir; sayısı ders çıkışı yük testinde yazılır.")));
H.push(satir('Yan etkiler', f("İşleyici SAVEPOINT açmaz ve veritabanı hatası yakalamaz; parça SAVEPOINT'i D06'nındır. 2'lik sınır kullanımı, karar geçmişi, devam işi ve Aşama 2 kanıt satırı yalnız satır eklendikten sonra yazılır; eklenmeyen kayıt bunların hiçbirini bırakmaz. İşlem önbelleği yalnız değişmeyen okumaları tutar (cihaz, anahtar, kişi ve silinme anı, oturum, ders). Yan etki belleği (bu çağrıda yazılan satırlar, öğrenci başına sürüm, (ders, öğrenci) başına devam işi) isleToplu çağrısına yereldir. Her D08.devamHesaplaIsiKoy çağrısı kuyruğa bir iş satırı ekler (ne bellek kümesi ne singletonKey): D06 parçayı SAVEPOINT'e geri alınca iş satırı da gider, öğeleri tek tek yeniden verince her çağrı yeni bellekle başlar ve yeni iş satırı ekler; aynı (ders, öğrenci) işlerini D08 partide birleştirir (D05-A12 kapandı).")));
H.push(satir('Denetim sınırı', f("Denetim satırı yalnız imzası doğrulanmış zarftan D09.denetimeYaz ile yazılır. Olay türleri sözleşme dosyasındaki YOKLAMA_DENETIM_OLAYLARI listesindedir (yoklama.kimlik_cakismasi, yoklama.ogrenci_cihaz_uyusmuyor, yoklama.gonderen_uyusmuyor) ve eklentide D09.denetimOlaylariniKaydet('yoklama', ...) ile kaydolur; ayrıntıda yalnız iç kimlikler ve zarf özeti; dersId taşıyan olay birimId de taşır (D02.dersGetir'den). (cihaz, gerekçe, İstanbul günü) başına en çok 20 olay yazılır, fazlası 'denetim_siniri_asildi' log satırıdır (denetimSiniri.ts, süreç içi sayaç). İmzasız çöp metin log satırından başka iz bırakmaz ve kilitAnahtarlari başka kişinin çiftine anahtar vermediği için kurbanın kilidini de tutamaz. teknik.html#veritabani satırı 'aynı kimlik farklı baytla ya da başka cihazın anahtarıyla imzalı gelirse' gelen zarfı denetim kaydına yazdırır; imzalı zarf için bu aynen korunur. Günlük sınırın teknik.html'e yazılması D05-A07'de.")));
H.push(satir('Makbuz okutması', liste([
  "Anahtar kancası gövdeyi ve içindeki zarfı çözer; gövdedeki hocaId paketin kişisiyse okutulan kaydın çift, sayaç ve QR anahtarlarını verir. Kilit ders sahipliğinden önce alınır: yetkisiz okutma başka öğrencinin çiftini yalnız bu paketin işlemi süresince tutar, iz bırakmaz.",
  "Gövde (JSON { v, zarf, hocaId }) çözülür, değilse RET YOKLAMA_ZARF_BOZUK; hocaId paketin kişisi (PaketBaglami.kisiId) olmalı, değilse RET YOKLAMA_HESAP_UYUSMUYOR. İkisinde de satır yazılmaz. Giriş oturumu olmayan paketi D06 bu işleyiciye vermez (ESITLEME_OTURUM_GEREKLI).",
  "Okutma anı GelenOge.ilkCapa (ilkCapaVar true) ve ikinciCapa'dan D04.saatSonucu ile özne personel (okutan hoca) kurulur; ilkCapa yoksa okutma anı boştur.",
  "Öğe kimliği makbuz_okutmalari'nda bütün dönemlerde aranır, son deneme okunur: zarf özeti ya da hoca farklıysa RET YOKLAMA_KIMLIK_CAKISMASI (satır yazılmaz); son sonuç KABUL ya da ZATEN_VAR ise ZATEN_VAR ve kaydın güncel kararı, kayıt yeniden işlenmez; son sonuç RET ise öğe aşağıdaki adımlardan yeniden geçer.",
  "Zarf çekirdeğin yazısız doğrulamasından geçer; bozuksa, imza geçersizse ya da oturum yoksa RET, satır yazılmaz.",
  "Okutan oturumun dersinin sahibi olmalı: D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) üç parametreyle 'sahip' döner. Önceki sahip D02.dersGetir'in DersBilgisi.hocaAtamaGecmisi alanından okunur ve yalnız okutma anının üst ucu o sahipliğin bitisAni'sinden önceyse kabul edilir; okutma anı boşsa önceki sahip kabul edilmez. Değilse RET YOKLAMA_HOCANIN_DERSI_DEGIL; karar dönmez, okutma satırı yazılır.",
  "Zarf ortak çekirdekten OKUTMA yoluyla geçer: ikinci çapa OKUTMA_YOLU, okutma anı KayitTaslagi.okutmaAni, ulaşma anı hocanın öğesinin GelenOge.ulasmaAni'si (plan.html#kararlar-kayit-ve-makbuz).",
  "Okutma satırı sonucuyla yazılır (KABUL, ZATEN_VAR ya da RET; TEKRAR_DENE satır yazmaz). Yeniden hesaplanan öğede sonuç saklı son RET'ten farklıysa deneme_no bir artan yeni satır yazılır, aynıysa satır yazılmaz; eski satır kanıt olarak kalır. Dersin sahibine OkutmaAyrintisi ile kaydın kararı ve etiketleri döner.",
].map(f), true)));
H.push(satir('Öğrencinin kayıtları', f("D05 kendi «ogrenci_kayitlari» öğrenci kaynağını D06'ya kaydeder; D06 D05'i içe aktarmaz. bolum çağrısı (surumden, surumeKadar] aralığındaki kayıtları verir; surumden boşsa tam indirmedir (tam = true) ve öğrencinin kilidi uygulanmamış birim dönemlerindeki bütün kayıtlarını verir (kayıtlar dönem kilidine kadar telefonda kalır). Her satır için kararlar listesine { donemId, kayitId, kararSurumu } girer; D06 karar teslimini (karar_teslimleri) bununla yazar, sorun bildirme süresi kararın telefona ulaştığı anda başlar (plan.html#kararlar-supheli-kayit). D09'un sorun_bildirimi gövdesindeki kararSurumu aynı tam sayıdır (JSON sayı, en az 1). Okutmayla ulaşan kayıt ve sonradan değişen karar böylece telefona iner; telefon listede gördüğü yerel kaydı 'Sunucuya ulaştı' yapar (tasarim.html#ph-records). Zarf, cihaz ve anahtar alanları inmez.")));
H.push(satir('Oturum ucu', f("D02.oturumGetir ve D02.dersYetkisi(tx, istek.kimlik, dersId) 'sahip' (değilse 404 YOKLAMA_BULUNAMADI); oturum türü, durumu ve iptal nedeni D02'nin OTURUM_TURLERI, OTURUM_DURUMLARI ve IPTAL_NEDENLERI sabitleriyle karşılaştırılır, yeniden yazılmaz. Görünürlük yüklemi D05, D07 ve D09'da tektir: kafa sayısı boş değil ya da yapildi boş değil; değilse KAFA_SAYISI_BEKLENIYOR, boş liste, sayilar ve listeDisiKayitSayisi null (plan.html#kararlar-kafa-sayisi, tasarim.html#head-sw-l). Varsa satırlar oturumun her şubesinin liste satırlarıdır (D02.oturumSubeleri, D03.listeSatirlari): bütün ETKIN satırlar ve yalnız bu oturumda kaydı ya da düzeltmesi olan PASIF satırlar; D03'ün şube başına 2.000 etkin satır sınırı dışında kesme yoktur. Kayıtlar sayilanKayitlar(tx, { donemId, oturumIdler: [oturumId] }) ile toplu okunur, her satır gerekceKodu ve ulasmaAni taşır. Numaralar tek toplu D01.ogrenciHesabiGetir({ numaralar }) çağrısıyla hesaplara çevrilir; bir numarada birden çok hesap varsa (silinip yeniden kaydolan öğrenci) satır hepsini ogrenciIdler'de taşır ve kayıt olarak onların sayılan kayıtlarından sayilanSec ile önde olanı gösterir. Hesabı olmayan öğrencinin satırı kayıtsız kalır. Son durum D09.sonDurumOnceligi ile hesaplanır: SonDurumKaydi.sayimDisi, ulaşma anı D02.kilitDurumu'nun kilit anından sonraysa ya da gerekçe SON_GUNDEN_SONRA ise true; SonDurumOturumu.kilitli, kilitDurumu kilitliyse true. Muaf satırın son durum hücresi MUAF'tır (D08'in DEVAM_SON_DURUMLARI sabiti, D10'un M hücresiyle aynı). Düzeltmeler D09.duzeltmeleriGetir, sayılar panelSayilari (ilk uyan küme kuralı, Cevap bölümünde), gönderme süresinin sonu D06.gondermeSuresiSonu, şimdiki an D04.simdi ile. Panel görünüşü için bkz. tasarim.html#pnl-table ve tasarim.html#pnl-drawer.")));
H.push(satir('Değişmezlik', f("Uygulama rollerinde UPDATE yalnız karar, gerekçe, karar kaynağı, anı ve sürümü, ilk kesin karar ve anı, onay, etiket, sayılan ve değişiklik sürümü sütunlarında; DELETE ve TRUNCATE yok; yoklama_saklama yalnız siler. Kanıt, saat ve pencere sütunlarını kod hatası bile değiştiremez (teknik.html#veritabani).")));
H.push(satir('Saklama ve kanıt', f("D12'ye katalogdaki tek sınıf için tek işleyici kaydedilir: «saklamaIsleyicisiKaydet('yoklama.donem_verisi', { modul: 'yoklama', islem: 'silme', partiIsle })». İnce sınıf adı ve kayıtta oncekiSiniflar listesi yoktur; sıra D12'nin SAKLAMA_VERI_SINIFLARI kataloğundaki oncesinde listesinden gelir: esitleme, dogrulama ve projeksiyon sınıfları yoklamadan önce, devam ve duzeltmeler yoklama ve listelerden önce işlenir (D05-A11 kapandı). makbuz_okutmalari bu sınıftadır ve işleyicide kayıtlardan önce silinir. partiIsle({ tx, sinirAni, partiBoyutu }) yoklama_saklama girişiyle açılan işlemde çalışır, kendi tablolarında yalnız SELECT ve DELETE yapar: D02.kilitliBirimDonemleri(tx, sinirAni) ile kilit anı sınırdan önce olan birim dönemlerini, D02.oturumlariGetir ile onların oturumlarını bulur ve en çok partiBoyutu satırı tek dönemden siler, { satirSayisi, donemId, bitti } döner. Birimsiz deneme dersi (OTURUM_TURLERI'ndeki deneme) kilitlenmediğinden silinmez. Testi D12.saklamaIsleyicisiniCalistir ile yazılır. Süre sahibin açık noktasıdır (plan.html#acik-saklama-suresi); bugün sureler.ts boş, hiçbir satır silinmez. İtirazda kanıtı kanitCikar verir; sunucu makinesinde «apps/server/src/cli/yoklama-kaniti.ts» komutu onu çağırıp JSON yazar (teknik.html#sunucu-ilk-yonetici).")));
H.push(`</div>`);
for (const sm of I.state_machines) {
  H.push(ayrinti(`Durum makinesi: ${esc(sm.name)}`, [`<p>Durumlar: ${sm.states.map(kodla).join(', ')}</p>`,
    tablo(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], sm.transitions.map(t => [kodla(t.from), kodla(t.to), esc(t.by), f(t.when)]))].join('\n')));
}
H.push(ayrinti(`Ana yolun SQL taslağı: kilit, arama, pencere, ekleme, sayılan, öğrenci sürümü, karar sürümü ve yetkiler`, [`<p>${f("Kodun tek kaynağı tablolar.ts, kilit.ts, kayitIsle.ts ve yaprak.ts'tir; bu taslak işleme sırasındaki adımların SQL karşılığıdır. Parametreler $ ile; her ifade ayrı istektir, böylece kilitten sonraki okuma kilidi bekledikten sonra işlenmiş veriyi görür (READ COMMITTED). Danışma kilidi SQL'i elle yazılmaz, D12.danismaKilidi'nin içindedir.")}</p>`,
  `<pre><code>${esc(`-- 1. anahtarlar (TypeScript, D06 paket başına tek çağrı; katman 3 ve 4, önce katman sonra metin):
--    D12.danismaKilidi(tx, [ ...D06 'esitleme:kurulum_siniri:<kisiId>',
--      ...D07.kararAnahtarlari([{ oturumId, ogrenciId, anahtarId }])   -- 'yoklama:cift:<oturumId>:<ogrenciId>' (yoklamaCiftAnahtari)
--                                                                      -- ve App Attest'te 'dogrulama:sayac:<anahtarId>'
--      ...D11.qrKilitAnahtarlari({ oturumId, ogrenciId, alanlar }) ])

-- 5. kimlik bütün dönemlerde (PostgreSQL 18 skip scan, birincil anahtar dizini)
SELECT donem_id, zarf, ulasma_ani, karar, gerekce_kodu, karar_ani, karar_surumu,
       etiket_qrsiz, etiket_kendi_beyani, etiket_saat_dogrulanamadi, etiket_cihaz_dogrulanmadi,
       etiket_ikinci_profil, etiket_yedek_kodlu, etiket_dogrulanmis, sayilan, ogrenci_id
  FROM yoklama_kayitlari WHERE id = $kimlik;

-- 5. aynı dönemde (cihaz, sıra) ve öğrencinin bu oturumdaki ham kayıtları
SELECT id FROM yoklama_kayitlari
 WHERE donem_id = $donem AND cihaz_id = $cihaz AND sira_no = $sira;
SELECT id, cihaz_id, karar, ulasma_ani, sayilan FROM yoklama_kayitlari
 WHERE donem_id = $donem AND oturum_id = $oturum AND ogrenci_id = $ogrenci ORDER BY id;

-- 7. pencere: D04.pencereSonucu oturum kimliği sırasıyla (D04 içinde, kayıt satırından önce)
--    SELECT ... FROM oturum_pencereleri WHERE oturum_id = $oturum FOR KEY SHARE;

-- 9. ekleme: hedefli, hedefsiz ON CONFLICT yazılmaz; saat_sebebi ve ele_gecmis_anahtar üretilmiş, yazılmaz
INSERT INTO yoklama_kayitlari (donem_id, id, oturum_id, ders_id, ..., saat_durumu, ..., pencere_sonucu,
                               ulasma_ani, karar_surumu, sayilan, degisiklik_surumu)
VALUES ($donem, $kimlik, $oturum, $ders, ..., $saat_durumu, ..., $pencere_sonucu,
        $gelen_oge_ulasma_ani, 1, $ilk_kayit_mi, 0)
ON CONFLICT (donem_id, id) DO NOTHING
RETURNING id;            -- satır dönmezse 5. adımdaki karşılaştırma

-- 9. yeni kayıt sıralamada öndeyse yer değiştirme (aynı işlem, çift kilidi altında, önce eskisi)
UPDATE yoklama_kayitlari SET sayilan = false WHERE donem_id = $donem AND id = $eski_sayilan;
UPDATE yoklama_kayitlari SET sayilan = true  WHERE donem_id = $donem AND id = $kimlik;

-- 10. son adım: devam işleri (D08.devamHesaplaIsiKoy, her çağrı bir iş satırı), sonra öğrenci
--     kimliği sırasıyla öğrenci başına bir kez $surum = D06.ogrenciDurumuDegisti(tx, $ogrenci) ve:
UPDATE yoklama_kayitlari SET degisiklik_surumu = $surum
 WHERE (donem_id, id) IN (SELECT * FROM unnest($donemler::uuid[], $kimlikler::uuid[]));
--     (bu çağrıda eklenen ve sayılan işareti değişen satırlar; sonrasında degisiklik_surumu = 0 satır kalmaz)

-- kararSutunlariniYaz: karar sürümü yalnız büyür, ilk kesin karar bir kez yazılır
UPDATE yoklama_kayitlari
   SET karar = $karar, gerekce_kodu = $gerekce, karar_kaynagi = $kaynak, karar_ani = $an,
       karar_surumu = $karar_surumu,
       ilk_kesin_karar     = COALESCE(ilk_kesin_karar,     CASE WHEN $karar <> 'BEKLEMEDE' THEN $karar END),
       ilk_kesin_karar_ani = COALESCE(ilk_kesin_karar_ani, CASE WHEN $karar <> 'BEKLEMEDE' THEN $an END)
       -- etiket sütunları verilmişse; onay nesneyle doldurulur, null ile boşaltılır
 WHERE donem_id = $donem AND id = $kimlik AND karar_surumu < $karar_surumu
RETURNING id, ders_id, ogrenci_id;   -- satır dönmezse sürüm küçük ya da eşit: yazılmaz, hata
--   sonra sayılan yeniden seçimi, D08.devamHesaplaIsiKoy(tx, ders_id, ogrenci_id, 'KARAR', ...),
--   $surum = D06.ogrenciDurumuDegisti(tx, ogrenci_id) ve degisiklik_surumu = $surum

-- okutma öğesinin son denemesi (bütün dönemlerde, skip scan)
SELECT donem_id, deneme_no, zarf_ozeti, hoca_id, sonuc, gerekce_kodu, kayit_id
  FROM makbuz_okutmalari WHERE id = $oge ORDER BY deneme_no DESC LIMIT 1;

-- okutma satırı: hedefli tekillik; aynı öğe aynı anda iki kez gelemez (D06'nın kurulum sınırı anahtarı)
INSERT INTO makbuz_okutmalari (donem_id, id, deneme_no, ..., hoca_telefon_ani, ..., sonuc, gerekce_kodu)
VALUES ($donem, $oge, $son_deneme + 1, ..., $hoca_telefon_ani, ..., $sonuc, $gerekce)
ON CONFLICT (donem_id, id, deneme_no) DO NOTHING;

-- saklama partisi ('yoklama.donem_verisi', yoklama_saklama girişi; oturumlar D02'den, tek dönem)
DELETE FROM makbuz_okutmalari WHERE (donem_id, id, deneme_no) IN (
  SELECT donem_id, id, deneme_no FROM makbuz_okutmalari
   WHERE donem_id = $donem AND oturum_id = ANY($oturumlar) LIMIT $parti_boyutu);
DELETE FROM yoklama_kayitlari WHERE (donem_id, id) IN (     -- okutmalar bittikten sonra
  SELECT donem_id, id FROM yoklama_kayitlari
   WHERE donem_id = $donem AND oturum_id = ANY($oturumlar) LIMIT $parti_boyutu);

-- yetki göçü (<UTC>_yoklama_yetkiler, drizzle-kit generate --custom)
REVOKE UPDATE, DELETE, TRUNCATE ON yoklama_kayitlari, makbuz_okutmalari FROM yoklama_api, yoklama_isci;
REVOKE UPDATE ON yoklama_kayitlari, makbuz_okutmalari FROM yoklama_saklama;
GRANT UPDATE (karar, gerekce_kodu, karar_kaynagi, karar_ani, karar_surumu, ilk_kesin_karar,
              ilk_kesin_karar_ani, onaylayan_id, onay_ani, etiket_qrsiz, etiket_kendi_beyani,
              etiket_saat_dogrulanamadi, etiket_cihaz_dogrulanmadi, etiket_ikinci_profil,
              etiket_yedek_kodlu, etiket_dogrulanmis, sayilan, degisiklik_surumu)
   ON yoklama_kayitlari TO yoklama_api, yoklama_isci;`)}</code></pre>`].join('\n')));
H.push(ayrinti(`Değişmezler: her zaman doğru kalması gereken ${I.invariants.length} kural`, liste(I.invariants.map(f), true)));

// Hata kodları
H.push(`<h3>Hata kodları</h3>`);
H.push(`<p>${f("HTTP hatası yalnız oturum ucundadır; kuyruk öğelerinin her sonucu 200 gövdesinde öğe sonucu olarak döner (D13). Bu modülün kodları YOKLAMA_ önekli (modül adının büyük harfi) ve packages/contracts/src/yoklama.ts'te; ortak kodlar D13'ün API_ önekli kodlarıdır. Kaynak düzeyi ret 404 YOKLAMA_BULUNAMADI, rota düzeyi rol reddi API_ROL_YETKISIZ; modül setErrorHandler ve setNotFoundHandler kullanmaz. Cevaplarda x-extensible-enum. HESAP_SILINMIS bir öğe kodu değil, D07'nin karar gerekçesidir; DOGRULAMA_BAGLAM_DEGISIYOR D07'nin kodudur ve öğe sonucunda aynen geçer.")}</p>`);
H.push(tablo(['Kod', 'HTTP', 'Ne zaman'], [
  [kodla('YOKLAMA_BULUNAMADI'), '404', f("Kaynak düzeyi ret: oturum yok ya da çağıran o oturumun dersinin sahibi değil (varlık sızdırılmaz).")],
  [kodla('API_KIMLIK_GEREKLI'), '401', f("Giriş oturumu yok ya da bitti (D01, D13).")],
  [kodla('API_ROL_YETKISIZ'), '403', f("Rota düzeyi rol reddi: rol hoca değil; öğrenci oturumu (D13).")],
  [kodla('API_HIZ_SINIRI'), '429', f("'agir' sınıfının oturum başına dakikada 20 sınırı (D13).")],
  [`${kodla('API_SUNUCU_YOGUN')}, ${kodla('API_SORGU_ZAMAN_ASIMI')}`, '503', f("Havuz ya da aşırı yük (Retry-After ile), deyim zaman aşımı (D13).")],
]));
H.push(ayrinti(`Öğe gerekçe kodları: ${I.RET_KODLARI.filter(r => r[1] === 'RET').length} RET, ${I.RET_KODLARI.filter(r => r[1] === 'TEKRAR_DENE').length} TEKRAR_DENE`, tablo(['Kod', 'Sonuç', 'Ne zaman', 'İz'], I.RET_KODLARI.map(r => [kodla(r[0]), kodla(r[1]), f(r[2]), f(r[3])]))));
H.push(`<p>${f("Denetim olayları (YOKLAMA_DENETIM_OLAYLARI, D09.denetimOlaylariniKaydet ile kayıtlı; D09.denetimeYaz, ayrıntıda yalnız iç kimlik ve zarf özeti, dersId taşıyan olayda birimId; yalnız imzası doğrulanmış zarftan; (cihaz, gerekçe, gün) başına en çok 20): «yoklama.kimlik_cakismasi», «yoklama.ogrenci_cihaz_uyusmuyor», «yoklama.gonderen_uyusmuyor». Beklenmeyen kısıt hatası ya da zaman aşımında parça SAVEPOINT'i geri alınır, sonucu D06 verir (geçici kod TEKRAR_DENE ESITLEME_GECICI_CAKISMA; kısıt hatasında öğeler tek tek yeniden denenir, yine düşerse RET ESITLEME_KISIT_IHLALI).")}</p>`);

// Testler
const turSay = I.tests.reduce((a, t) => (a[t.kind] = (a[t.kind] || 0) + 1, a), {});
H.push(`<h3>Testler</h3>`);
H.push(`<p>${f(`Davranış senaryoları apps/server/test/features/yoklama'da Türkçe, gerçek PostgreSQL ile (teknik.html#testler-veritabani-sifirlama); özellik ve birim testleri packages/core/src/yoklama'da Vitest ve fast-check ile, deneme sayısı açıkça yazılı (teknik.html#testler-birim); gönderme ucunun durum makinesi Cucumber içinde (teknik.html#testler-kalite). Her yokluk iddiası pozitif kontrolle birlikte yazılır; sabitler ve değer listeleri sözleşmeden içe alınır, testte yeniden yazılmaz. Dağılım: ${Object.entries(turSay).map(([k, v]) => `${k} ${v}`).join(', ')}.`)}</p>`);
H.push(ayrinti(`${I.tests.length} test: ne doğruladıkları`, tablo(['Ad', 'Tür', 'Doğruladığı'], I.tests.map(t => [f(t.name), kodla(t.kind), f(t.asserts)]))));

// Netleştirilenler
H.push(`<h3>Netleştirilenler</h3>`);
const kendi = I.resolved_gaps.filter(g => g.gap.startsWith('D05-B')), kapanan = I.resolved_gaps.filter(g => g.gap.startsWith('D05-A')), baskasi = I.resolved_gaps.filter(g => !g.gap.startsWith('D05-'));
H.push(`<p>${f(`Envanterdeki ${kendi.length} boşluğun her biri karara bağlandı; D05-B05 ve D12-B18 sahibin D05-A01 kararına bağlı varsayılanla kodlanır. Başka alanların D05'e bıraktığı ${baskasi.length} madde (${baskasi.map(g => g.gap).join(', ')}) da burada karara bağlandı. Envanterdeki ${I.contradictions_resolved.length} çelişki çözüldü. Önceki taslağın açık noktalarından D05-A04 (D02'nin tekil kısıtı var), D05-A06 (D01 anahtar kimliklerini ve toplu numara okumasını veriyor) ve D05-A08 (saat belgesiyle ulaşma kanıtı geri çekildi, D12-B31) kapandı. Mimarın 10 Ekim 2026 kararlarıyla ${kapanan.length} açık nokta daha kapandı (${kapanan.map(g => g.gap).join(', ')}); sonuçları ilgili kural, dış yüz ve testlerde uygulandı.`)}</p>`);
H.push(ayrinti(`${kendi.length} boşluk, ${kapanan.length} kapanan açık nokta ve ${baskasi.length} başka alan maddesi: karar ve gerekçe`, tablo(['Boşluk', 'Karar', 'Neden'], I.resolved_gaps.map(g => [kodla(g.gap), f(g.decision), f(g.why)]))));
H.push(ayrinti(`${I.contradictions_resolved.length} çelişki: çözüm`, tablo(['Çelişki', 'Çözüm'], I.contradictions_resolved.map(x => [kodla(x.id), f(x.resolution)]))));
H.push(ayrinti(`Hizalama izi: ${I.hizalama.length} mimar talimatı ve uygulandığı yer`, tablo(['Karar', 'Uygulandığı yer'], I.hizalama.map(h => [h.refs.map(kodla).join(' '), f(h.uygulandi)]))));

// Açık noktalar
H.push(`<h3>Açık noktalar</h3>`);
H.push(`<div class="rows">`);
for (const o of [...I.open_points].sort((a, b) => (b.needs_owner - a.needs_owner) || a.id.localeCompare(b.id))) {
  H.push(satir(`${esc(o.id)} <span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahibin kararı' : 'koordinasyon'}</span>`, `${f(o.question)}<br><strong>Öneri:</strong> ${f(o.recommendation)}`));
}
H.push(`</div>`);
H.push(`</section>`);

const html = H.join('\n') + '\n';
fs.mkdirSync(path.join(KOK, 'frag'), { recursive: true });
fs.writeFileSync(path.join(KOK, 'frag', 'D05.html'), html, 'utf8');
if (eksikBag.length) console.log('EKSİK BAĞLANTI BAŞLIĞI:', [...new Set(eksikBag)].join(', '));
console.log('spec', fs.statSync(path.join(KOK, 'spec', 'D05.json')).size, 'bayt; frag', html.length, 'karakter');
