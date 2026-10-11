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
  state_machines: I.state_machines,
  invariants: I.invariants,
  exports: I.exportsList,
  files: I.files,
  tests: I.tests,
  resolved_gaps: I.resolved_gaps,
  contradictions_resolved: I.contradictions_resolved,
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

const H = [];
H.push(`<section id="yoklama">`);
H.push(`<h2>Kayıt, imza ve makbuz</h2>`);
H.push(`<p class="meta">D05 · yoklama modülü · apps/server/src/modules/yoklama · sözleşme packages/contracts/src/yoklama.ts · ortak kurallar packages/core/src/yoklama</p>`);

// Amaç ve sınırlar
H.push(`<h3>Amaç ve sınırlar</h3>`);
H.push(`<p>${f("Telefon kaydı bir kez tek metin olarak üretip imzalar; metin telefonda, kuyrukta ve sunucuda aynen durur (plan.html#kararlar-kayit-ve-makbuz, teknik.html#sunucu-imza-dogrulama). Bu modül o kaydın sunucudaki tek sahibidir: zarfı ayrıştırır, imzayı gelen baytlar üzerinde doğrular, kaydı değiştirmeden saklar ve her kayda KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE sonucu verir. Karar ve etiket kuralları D07'nin, saat ve pencere kuralları D04'ün, taşıma ve indirme D06'nın; bu modül onların sonucunu kayıt satırına yazan tek yerdir.")}</p>`);
H.push(`<div class="rows">`);
H.push(satir('Kapsam', f("Kayıt zarfı ve kayıt metni (şema, kodlama, 1273 bayt sınırı); imza doğrulama (Android P-256, Secure Enclave, App Attest onayı); 'zaten var' ve 'ret' karşılaştırması; «yoklama_kaydi» ve «makbuz_okutmasi» öğe işleyicileri; sayılan kayıt seçimi; karar sütunlarının yazımı (değeri D07 verir); öğrencinin kendi kayıtları indirme kaynağı; yedekten dönüş için ulaşma belgesi; oturum kayıtları ucu; kanıt çıkarma işlevi; iki tablonun göçleri ve yetkileri.")));
H.push(satir('Kapsam dışı', f("Taşıma, paket imzası, su seviyesi, indirme imleci ve sıra boşluğu ölçümü (D06); karar, etiket, 2'lik sınır ve App Attest sayaç kuralı (D07); saat belgesi, çapa ve pencere (D04); elle ekleme, düzeltme, sorun bildirimi ve denetim tablosu (D09); cihaz, anahtar ve hesap (D01); raporlar (D10) ve olcum_ görünümleri (D15) bu tabloyu yalnız okur.")));
H.push(satir('Kullandığı dış yüzler', f("D01 «cihazAnahtariGetir», «cihazGetir», «kisiGetir», «ogrenciHesabiGetir», «yetkiDenetle» · D02 «oturumGetir», «oturumSubeleri», «dersGetir», «dersYetkisi», «birimDonemiGetir» · D03 «listeSatirlari» · D04 «simdi», «saatBelgesiVer», «saatBelgesiDogrula», «pencereSonucu», «esitlemeSaglikliMi» ve packages/core/src/saat saf işlevleri · D06 «ogeTuruKaydet», «indirmeKaynagiKaydet», «ogrenciDurumuDegisti», «gondermeSuresiSonu» · D07 «appAttestSayaciniDenetle», «kararHesapla», «kararGecmisineYaz» · D08 «devamHesaplaIsiKoy» · D09 «denetimeYaz», «duzeltmeleriGetir», «sonDurumOnceligi» · D11 «qrKanitiniAyristir» (Aşama 2) · D12 «islem», «kisitAdi», «saklamaIsleyicisiKaydet» · D13 «rotalariKaydet», «uygulamaHatasi», «hizSinifi».")));
H.push(satir('Kaydolduğu yerler', f("Eklentide (index.ts yüklenirken değil): D06'ya iki öğe türü ve «ogrenci_kayitlari» indirme kaynağı, D12'ye «yoklama» saklama işleyicisi, D13'ün rota tablosuna tek uç. App Attest uygulama kimliği (takım kimliği ve paket adı) eklenti seçeneği olarak app.ts'ten gelir.")));
H.push(satir('Ölçülen sonuç', f("'Sunucuya ulaştı' makbuzlu kayıtta kayıp 0; kayıtların en az %95'i 24 saatte (ulasma_ani ile hesaplanan_ani farkı); saati doğrulanamayan oranı platforma göre (imza_turu); işaretlenmeden kabul (ilk_kesin_karar). Hepsi bu tablodan tek sorguyla (plan.html#hedefler, plan.html#kararlar-olcum). Her öğe sonucu tek log satırı bırakır: olay, tür, sonuç, gerekçe, kurulum kimliği, süre; numara ve isim yok.")));
H.push(satir('Göçler', f("«apps/server/migrations/<UTC zaman>_yoklama_tablolar» (Drizzle üretir) ve «<UTC zaman>_yoklama_yetkiler» (drizzle-kit generate --custom ile REVOKE ve sütun GRANT'ları). Klasör kuralı D12'nin, göçler yalnız bu iki tabloya dokunur; bu yüzden dosya listesinde yer almaz.")));
H.push(satir('Yeni paket', f("node-app-attest, sürümü tam sabit; apps/server/package.json'a D15 ekler. Bakımı durursa koda alınır (teknik.html#temel-yedek-paketler).")));
H.push(`</div>`);
H.push(ayrinti(`Dış yüz: ${I.exportsList.length} işlev, imzaları ve kimin çağırdığı`, tablo(['İşlev', 'İmza', 'Amaç'], I.exportsList.map(e => [kodla(e.name), `<code>${esc(e.signature)}</code>`, f(e.purpose)]))));
H.push(ayrinti(`Dosyalar: ${I.files.length} dosya, hepsi D05'in dosya alanında`, tablo(['Dosya', 'İçerik'], I.files.map(p => [kodla(p), f(I.DOSYA_ACIKLAMA[p] || '')]))));

// Tablolar
H.push(`<h3>Tablolar</h3>`);
H.push(`<p>${f("İki tablo, ikisi de UUIDv7 kimlikli ve dönem kimliği başta (teknik.html#veritabani-donem-alani). Durum ve kod sütunları PostgreSQL enum değil metin ve CHECK; değer listeleri sahibinin sözleşme sabitlerinden üretilir (teknik.html#sunucu-mimari). Anlık zamanlar timestamptz, kural taşıyanlar saat arayüzünden yazılır.")}</p>`);
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
H.push(`<div class="callout">${f("<strong>Kuyruk öğeleri.</strong> Kayıtlar ve okutmalar ayrı uçtan değil, ortak kuyruğun tek ucundan (POST /v1/esitleme/gonderim, D06) öğe olarak gelir. D06 yalnız dağıtır; öğe gövdesinin şeması, iş kuralı ve sonucu bu modülündür. Sonuçlar 200 gövdesinde öğe başına döner, bozuk öğe paketi düşürmez (plan.html#kararlar-gonderme).").replace('&lt;strong&gt;', '<strong>').replace('&lt;/strong&gt;', '</strong>')}</div>`);
for (const q of I.queue_items) {
  const ic = ['<div class="rows">',
    satir('Gelir', f(q.gelir)),
    satir('Kimlik', f(q.kimlik)),
    satir('Gövde', liste(Object.entries(q.govde).map(([k, v]) => `${kodla(k)}: ${f(v)}`))),
    satir('Bağlam (D06)', liste(Object.entries(q.baglam).map(([k, v]) => `${kodla(k)}: ${f(v)}`))),
    satir('Sonuç', liste(Object.entries(q.sonuc).map(([k, v]) => `${kodla(k)}: ${f(v)}`))),
    satir('Tekrar', f(q.idempotency)),
    satir('Gerekçe kodları', f('Hata kodları bölümündeki öğe gerekçeleri; okutmaya özgü olanlar HOCANIN_DERSI_DEGIL ve HESAP_UYUSMUYOR.')),
    '</div>'].join('\n');
  H.push(ayrinti(`${kodla(q.tur)}: ${esc(q.tur === 'yoklama_kaydi' ? "öğrencinin imzalı kaydı, cihaz imzasıyla" : "hocanın okuttuğu makbuz, hocanın giriş oturumuyla")}`, ic));
}

// İşler
H.push(`<h3>İşler</h3>`);
H.push(`<p>${f("D05'in zamanlanmış işi yoktur; «apps/server/src/jobs/yoklama/index.ts» boş liste verir (worker.ts bütün modülleri bir kez listeler). Kayda bağlı iş kaydı yazan işlemin içinde ve aynı bağlantıda yapılır: D07'nin kararı ve karar geçmişi, öğrencinin durum sürümü (D06), devam hesabı işinin kuyruğa konması (D08.devamHesaplaIsiKoy; kuyruk D14'ün).")}</p>`);
H.push(`<p>${f("Kayda dokunan zamanlanmış işler başkalarınındır ve bu modülü yalnız dış yüzden çağırır: bekleyen_kararlari_coz ve pencere_beklemede_kesinlestir (D07, kararSutunlariniYaz ile), esitleme_sonrasi_yeniden_degerlendir (D04, D07 üstünden), gece_inceleme_siralamasi (D09, sayilanKayitlar ile), sira_boslugu_raporu (D06, kendi defterinden), saklama_suresi_isi (D12, «yoklama» saklama işleyicisiyle).")}</p>`);

// Durumlar ve kurallar
H.push(`<h3>Durumlar ve kurallar</h3>`);
H.push(`<p>${f("<b>Zarf ve kayıt metni.</b> Zarf kuyrukta, istekte ve makbuz QR'ında aynı tek ASCII metindir; sunucu saklarken ve karşılaştırırken yeniden biçimlendirmez (teknik.html#sunucu-imza-dogrulama, teknik.html#telefon-kamera-qr).").replace('&lt;b&gt;', '<strong>').replace('&lt;/b&gt;', '</strong>')}</p>`);
H.push(`<pre><code>${esc(`IUY1.<kayıt metni>.<tür>.<imza>
  kayıt metni  base64url (dolgusuz) UTF-8 JSON; imzalanan baytlar bu metnin ASCII baytları
  tür          a  Android Keystore P-256 (DER, SHA-256)
               s  Secure Enclave P-256 (DER, SHA-256)
               i  App Attest onayı (CBOR: authenticatorData, signature)
  imza         base64url (dolgusuz)
  üst sınır    1273 bayt (L düzeyinde QR sürüm 25)

Kayıt metninin içi, v1:
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
 "uygulamaSurumu":"1.0.0","runtimeSurumu":"1.0.0","guncellemeKimligi":null}`)}</code></pre>`);
H.push(`<p>${f("Metinde öğrenci numarası, isim, kod ya da jeton yoktur; dönem yazılmaz, oturumdan bulunur. Bilinmeyen alan atılır, kayıt reddedilmez; sunucu bildiği her v'yi okumayı sürdürür, kayıt gönderme yolu hiçbir sürüme kapanmaz (plan.html#dagitim-guncelleme-ilkesi). Aşama 2 ve 3 alanları isteğe bağlı alan olarak eklenir.")}</p>`);
H.push(`<p><strong>İşleme sırası</strong> ${f("(yoklama_kaydi; makbuz okutması 5. adımdan itibaren aynı çekirdeği kullanır)")}</p>`);
H.push(liste([
  "Zarf ayrıştırılır (packages/core/src/yoklama/zarf.ts): önek, üç ayırıcı, en çok 1273 bayt, kanonik base64url, UTF-8 JSON, KayitMetni şeması. Bozuksa RET ZARF_BOZUK ya da METIN_BOZUK; önek ya da v bu sunucudan yeniyse TEKRAR_DENE BICIM_SURUMU_BILINMIYOR.",
  "Metindeki (oturum, öğrenci) çiftinin işlem danışma kilidi alınır.",
  "Kimlik bütün dönemlerde aranır. Varsa: zarf aynı ise ZATEN_VAR; metin aynı, imza farklı ise imza saklı anahtarla sayaçsız doğrulanır (geçerse ZATEN_VAR, geçmezse RET IMZA_GECERSIZ); metin farklı ise RET KIMLIK_CAKISMASI ve denetim kaydı. Geliş yolu bakılmaz; ZATEN_VAR saklı ulaşma anını ve güncel kararı taşır.",
  "Anahtar D01.cihazAnahtariGetir ile etkinliğine bakılmadan bulunur; tür harfi ve metindeki cihaz tutmalı.",
  "İmza doğrulanır: a ve s için Node «crypto.verify('sha256', ..., { dsaEncoding: 'der' })»; i için node-app-attest (uygulama kimliği özeti ve imza; sayaç kütüphaneye 0 verilerek geçilir, sıra numarasına göre D07 denetler).",
  "Cihaz metindeki öğrenciye bağlı olmalı (D01.cihazGetir), değilse RET OGRENCI_CIHAZ_UYUSMUYOR ve denetim kaydı. Telefon yolunda paketi gönderen cihaz aynı öğrencinin olmalı, değilse RET GONDEREN_UYUSMUYOR ve denetim kaydı.",
  "Oturum D02.oturumGetir ile bulunur, dönem oradan alınır; yoksa RET OTURUM_BILINMIYOR. Aynı dönemde (cihaz, sıra) başka kimlikle saklıysa RET SIRA_CAKISMASI.",
  "Öğrencinin bu oturumdaki kayıtları okunur; cihazın bu oturumda 10 saklı kaydı varsa RET OTURUM_KAYIT_SINIRI.",
  "Saat kurulur: D04.saatBelgesiDogrula ve packages/core/src/saat işlevleri; ikinci çapa yalnız kaydın kendi cihazının imzalı paketinde kullanılır. Kendi cihazından gelen, ilk çapası bozuk kayıt imzasız pakette gelirse TEKRAR_DENE IKINCI_CAPA_GEREKLI. Cihaz hesap silme nedeniyle kapalıysa silme anı D01.kisiGetir ile okunur; doğrulanmış saat silme anından sonraysa RET HESAP_SILINMIS. Ulaşma anı paketinkidir; öğede bu zarf için geçerli ulaşma belgesi varsa (yedekten dönüş) belgenin anıdır (D12-B31). Ardından D04.pencereSonucu ve D04.esitlemeSaglikliMi.",
  "App Attest kaydında D07.appAttestSayaciniDenetle; Aşama 2 alanları varsa D11.qrKanitiniAyristir; sonra D07.kararHesapla (yalnız okur ve kilitler).",
  "D06.ogrenciDurumuDegisti sürümü alınır; satır «INSERT ... ON CONFLICT (donem_id, id) DO NOTHING» ile eklenir: öğrencinin o oturumdaki ilk kaydıysa sayılan, değilse sayılmayan. Ekleme olmazsa yan etki yazılmadan 3. adımdaki karşılaştırma yapılır.",
  "Eklendiyse aynı işlemde: yeni kayıt sıralamada öndeyse eski sayılanın işareti kaldırılır, yenisi işaretlenir; D07.kararGecmisineYaz; D08.devamHesaplaIsiKoy; Aşama 2 kanıt satırı (D11). Sonuç KABUL; KABUL ve ZATEN_VAR cevabına D04.saatBelgesiVer ile ulaşma belgesi eklenir.",
].map(f), true));
H.push(`<div class="rows">`);
H.push(satir('Saklanmadan RET', f("Makbuz 'Telefonda kayıtlı, gönderilmedi' kalır; kendiliğinden yeniden denenmez (plan.html#kararlar-yeniden-deneme). Yalnız kayda güvenilemeyen durumlar: ZARF_BOZUK, METIN_BOZUK, ANAHTAR_BILINMIYOR, IMZA_TURU_UYUSMUYOR, ANAHTAR_CIHAZ_UYUSMUYOR, IMZA_GECERSIZ, OGRENCI_CIHAZ_UYUSMUYOR, GONDEREN_UYUSMUYOR, OTURUM_BILINMIYOR, KIMLIK_CAKISMASI, SIRA_CAKISMASI, OTURUM_KAYIT_SINIRI, HESAP_SILINMIS; okutmada HOCANIN_DERSI_DEGIL ve HESAP_UYUSMUYOR.")));
H.push(satir('Saklanır, kararı D07', f("Makbuz 'Sunucuya ulaştı', karar ayrıca görünür. İmzası geçerli ve metindeki öğrencinin cihazına bağlı öbür her kayıt: listede olmayan ders, pencere dışı, ulaşma anını aşan saat, eski ya da değişim bekleyen cihaz, teyitsiz öğrenci, hatalı sürüm, eşitleme bozukken ulaşan kayıt. Ham kayıt kanıttır, atılmaz (plan.html#kararlar-cihaz-dogrulamasi). Bu ayrım varsayılandır, sahibin kararı D05-A01.")));
H.push(satir('Sayılan kayıt', f("Sıralama: karar önceliği (VAR, BEKLEMEDE, INCELEMEDE, RET), sonra ulaşma anı, sonra kimlik (packages/core/src/yoklama/sayilan.ts). İlk kayıt sayılan eklenir; sonraki sayılmayan eklenir ve öndeyse aynı işlemde yer değiştirir. Her karar değişikliği seçimi yeniden yapar. Tek kaydı Ret olan öğrencinin sayılanı o kayıttır; son durumu D09.sonDurumOnceligi verir.")));
H.push(satir('Kilit ve işlem', f("Bir (oturum, öğrenci) çiftine yazan her işlem önce o çiftin işlem danışma kilidini alır («pg_advisory_xact_lock», yoklama ad alanı): ekleme, kararSutunlariniYaz, kayitGetir(kilitle). Aynı kaydın iki yoldan ve aynı öğrencinin iki kaydının eşzamanlı gelişi sıraya girer; ikinci işlem birincinin yazdığını görür. teknik.html#veritabani satırındaki 'sayılan dizinine takılan kayıt sayılmayan olarak yazılır, kabul alır' sonucu böylece hata oluşmadan sağlanır (D05-A07). Kilit sırası: önce danışma kilitleri (oturum kimliği sırasıyla), sonra D07'nin sayaç satırları; kilitlenme olursa işlem bir kez baştan denenir (D12-B08).")));
H.push(satir('Yan etkiler', f("İşleyici SAVEPOINT açmaz ve veritabanı hatası yakalamaz; öğe başına SAVEPOINT D06'nındır. 2'lik sınır kullanımı, karar geçmişi, devam işi ve Aşama 2 kanıt satırı yalnız satır eklendikten sonra yazılır; eklenmeyen kayıt bunların hiçbirini bırakmaz. Durum sürümü eklemeden önce alınır; eklemeyen yarışta yalnız zararsız bir sürüm artışı kalabilir. Aynı paketteki kayıtlar için cihaz, anahtar, kişi ve oturum bir kez okunur, durum sürümü ve devam işi öğrenci başına bir kez alınır.")));
H.push(satir('Makbuz okutması', liste([
  "Giriş oturumu hoca rolünde ve öğedeki hocaId oturumun sahibi olmalı (D01.yetkiDenetle); değilse RET HESAP_UYUSMUYOR, satır yazılmaz.",
  "Öğe kimliği makbuz_okutmalari'nda varsa: zarf özeti ve hoca aynıysa saklı sonuç ZATEN_VAR olarak döner, kayıt yeniden işlenmez; farklıysa RET KIMLIK_CAKISMASI.",
  "Zarf ayrıştırılır, oturum bulunur; bozuksa ya da oturum yoksa RET, satır yazılmaz.",
  "Okutan oturumun dersinin hocası değilse (D02.dersYetkisi) RET HOCANIN_DERSI_DEGIL; karar dönmez, okutma satırı yazılır.",
  "Zarf ortak çekirdekten OKUTMA yoluyla geçer: ikinci çapa kurulmaz, okutma anı kayıt saatinin üst sınırıdır, ulaşma anı hocanın gönderiminin anıdır (plan.html#kararlar-kayit-ve-makbuz).",
  "Okutma satırı sonucuyla yazılır (KABUL, ZATEN_VAR ya da RET); dersin hocasına kaydın kararı ve etiketleri döner.",
].map(f), true)));
H.push(satir('Öğrencinin kayıtları', f("D06'nın «ogrenci_kayitlari» indirme kaynağı ogrencininKayitlari'nı çağırır; öğrenci kendi oturum anahtarıyla yalnız kendi kayıtlarını alır. Her ekleme ve karar değişikliği durum sürümünü artırdığından okutmayla ulaşan kayıt ve sonradan değişen karar telefona iner; telefon listede gördüğü yerel kaydı 'Sunucuya ulaştı' yapar (tasarim.html#ph-records). Zarf ve cihaz alanları inmez.")));
H.push(satir('Oturum ucu', f("D02.oturumGetir ve dersYetkisi (değilse 404); kafa sayısı ya da 'ders yapıldı mı' cevabı yoksa KAFA_SAYISI_BEKLENIYOR ve boş liste (plan.html#kararlar-kafa-sayisi, tasarim.html#head-sw-l). Varsa her satır bir liste satırıdır (D02.oturumSubeleri ve D03.listeSatirlari; numara ve ad liste satırından); kayıt satıra öğrencinin numarasıyla bağlanır (numara D01.ogrenciHesabiGetir'den, öğrenci başına bir kez), hesabı olmayan öğrencinin satırı kayıtsız kalır; sayılan kayıtlar bu tablodan, düzeltmeler D09.duzeltmeleriGetir ile, son durum D09.sonDurumOnceligi ile, sayılar panelSayilari ile, gönderme süresinin sonu D06.gondermeSuresiSonu ile, şimdiki an D04.simdi ile. Panel görünüşü için bkz. tasarim.html#pnl-table ve tasarim.html#pnl-drawer.")));
H.push(satir('Değişmezlik', f("Uygulama rollerinde UPDATE yalnız karar, gerekçe, karar kaynağı ve anı, ilk kesin karar ve anı, onay, etiket, sayılan ve değişiklik sürümü sütunlarında; DELETE ve TRUNCATE yalnız sahip rolde. Kanıt sütunlarını kod hatası bile değiştiremez (teknik.html#veritabani).")));
H.push(satir('Saklama ve kanıt', f("D12'nin saklama_suresi_isi «yoklama» işleyicisini dönem kimliğiyle çağırır: silme kipinde önce makbuz_okutmalari, sonra yoklama_kayitlari satırları sahip rolle silinir (kayda başvuran D06, D07 ve D09 satırları önce kendi işleyicileriyle; sırayı D12 verir). Anonimleştirme kipinde bu tablolarda kişisel veri olmadığından satırlar kalır. Süre sahibin açık noktasıdır (plan.html#acik-saklama-suresi). İtirazda kanıtı kanitCikar verir.")));
H.push(`</div>`);
for (const sm of I.state_machines) {
  H.push(ayrinti(`Durum makinesi: ${esc(sm.name)}`, [`<p>Durumlar: ${sm.states.map(kodla).join(', ')}</p>`,
    tablo(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], sm.transitions.map(t => [kodla(t.from), kodla(t.to), esc(t.by), f(t.when)]))].join('\n')));
}
H.push(ayrinti(`Ana yolun SQL taslağı: kilit, arama, ekleme, sayılan ve yetkiler`, [`<p>${f("Kodun tek kaynağı tablolar.ts ve kayitIsle.ts'tir; bu taslak işleme sırasındaki adımların SQL karşılığıdır. Parametreler $ ile; her ifade ayrı istektir, böylece kilitten sonraki okuma kilidi bekledikten sonra işlenmiş veriyi görür (READ COMMITTED).")}</p>`,
  `<pre><code>${esc(`-- 2. (oturum, öğrenci) danışma kilidi; ad alanı sabiti packages/core/src/yoklama'da
SELECT pg_advisory_xact_lock($ad_alani::int, hashtext($oturum_id::text || ':' || $ogrenci_id::text));

-- 3. kimlik bütün dönemlerde (PostgreSQL 18 skip scan, birincil anahtar dizini)
SELECT donem_id, zarf, anahtar_id, ulasma_ani, karar, gerekce_kodu, karar_ani,
       etiket_qrsiz, etiket_kendi_beyani, etiket_saat_dogrulanamadi, etiket_cihaz_dogrulanmadi,
       etiket_ikinci_profil, etiket_yedek_kodlu, etiket_dogrulanmis, sayilan, degisiklik_surumu
  FROM yoklama_kayitlari WHERE id = $kimlik;

-- 7. aynı dönemde (cihaz, sıra)
SELECT id FROM yoklama_kayitlari
 WHERE donem_id = $donem AND cihaz_id = $cihaz AND sira_no = $sira;

-- 8. öğrencinin bu oturumdaki ham kayıtları (sınır ve sayılan seçimi)
SELECT id, cihaz_id, karar, ulasma_ani, sayilan FROM yoklama_kayitlari
 WHERE donem_id = $donem AND oturum_id = $oturum AND ogrenci_id = $ogrenci ORDER BY id;

-- 11. ekleme: hedefli, hedefsiz ON CONFLICT yazılmaz
INSERT INTO yoklama_kayitlari (donem_id, id, ..., sayilan, degisiklik_surumu)
VALUES ($donem, $kimlik, ..., $ilk_kayit_mi, $surum)
ON CONFLICT (donem_id, id) DO NOTHING
RETURNING id;            -- satır dönmezse 3. adımdaki karşılaştırma

-- 12. yeni kayıt sıralamada öndeyse yer değiştirme (aynı işlem, kilit altında, önce eskisi)
UPDATE yoklama_kayitlari SET sayilan = false, degisiklik_surumu = $surum
 WHERE donem_id = $donem AND id = $eski_sayilan;
UPDATE yoklama_kayitlari SET sayilan = true
 WHERE donem_id = $donem AND id = $kimlik;

-- kararSutunlariniYaz: ilk kesin karar bir kez yazılır
UPDATE yoklama_kayitlari
   SET karar = $karar, gerekce_kodu = $gerekce, karar_kaynagi = $kaynak, karar_ani = $an,
       ilk_kesin_karar     = COALESCE(ilk_kesin_karar,     CASE WHEN $karar <> 'BEKLEMEDE' THEN $karar END),
       ilk_kesin_karar_ani = COALESCE(ilk_kesin_karar_ani, CASE WHEN $karar <> 'BEKLEMEDE' THEN $an END),
       degisiklik_surumu = $surum            -- etiket ve onay sütunları verilmişse eklenir
 WHERE donem_id = $donem AND id = $kimlik;

-- yetki göçü (drizzle-kit generate --custom)
REVOKE UPDATE, DELETE, TRUNCATE ON yoklama_kayitlari, makbuz_okutmalari FROM yoklama_api, yoklama_isci;
GRANT UPDATE (karar, gerekce_kodu, karar_kaynagi, karar_ani, ilk_kesin_karar, ilk_kesin_karar_ani,
              onaylayan_id, onay_ani, etiket_qrsiz, etiket_kendi_beyani, etiket_saat_dogrulanamadi,
              etiket_cihaz_dogrulanmadi, etiket_ikinci_profil, etiket_yedek_kodlu, etiket_dogrulanmis,
              sayilan, degisiklik_surumu)
   ON yoklama_kayitlari TO yoklama_api, yoklama_isci;`)}</code></pre>`].join('\n')));
H.push(ayrinti(`Değişmezler: her zaman doğru kalması gereken ${I.invariants.length} kural`, liste(I.invariants.map(f), true)));

// Hata kodları
H.push(`<h3>Hata kodları</h3>`);
H.push(`<p>${f("HTTP hatası yalnız oturum ucundadır; kuyruk öğelerinin her sonucu 200 gövdesinde öğe sonucu olarak döner (D13). Kodlar BÜYÜK_HARF ve packages/contracts/src/yoklama.ts'te; cevaplarda x-extensible-enum.")}</p>`);
H.push(tablo(['Kod', 'HTTP', 'Ne zaman'], [
  [kodla('YOKLAMA_OTURUM_BULUNAMADI'), '404', f("Oturum yok ya da çağıran o oturumun dersinin hocası değil (varlık sızdırılmaz).")],
  [kodla('YOKLAMA_LISTE_SINIRI_ASILDI'), '409', f("Liste 2000 satırı aşıyor; kesik liste dönmez.")],
  ['Kökteki ortak kodlar', '401, 403, 429, 503', f("Giriş oturumu yok ya da bitti, rol uymuyor, hız sınırı, aşırı yük; kodları D01 ve D13'ün.")],
]));
H.push(ayrinti(`Öğe gerekçe kodları: ${I.RET_KODLARI.filter(r => r[1] === 'RET').length} RET, ${I.RET_KODLARI.filter(r => r[1] === 'TEKRAR_DENE').length} TEKRAR_DENE`, tablo(['Kod', 'Sonuç', 'Ne zaman', 'İz'], I.RET_KODLARI.map(r => [kodla(r[0]), kodla(r[1]), f(r[2]), f(r[3])]))));
H.push(`<p>${f("Denetim olayları (D09.denetimeYaz, ayrıntıda yalnız iç kimlik): «yoklama.kimlik_cakismasi», «yoklama.ogrenci_cihaz_uyusmuyor», «yoklama.gonderen_uyusmuyor». Beklenmeyen kısıt hatası ya da zaman aşımında öğe SAVEPOINT'i geri alınır, sonucu D06 verir (kısıt hatası RET, zaman aşımı TEKRAR_DENE).")}</p>`);

// Testler
const turSay = I.tests.reduce((a, t) => (a[t.kind] = (a[t.kind] || 0) + 1, a), {});
H.push(`<h3>Testler</h3>`);
H.push(`<p>${f(`Davranış senaryoları apps/server/test/features/yoklama'da Türkçe, gerçek PostgreSQL ile (teknik.html#testler-veritabani-sifirlama); özellik testleri packages/core/src/yoklama'da Vitest ve fast-check ile, deneme sayısı açıkça yazılı (teknik.html#testler-birim); gönderme ucunun durum makinesi Cucumber içinde (teknik.html#testler-kalite). Her yokluk iddiası pozitif kontrolle birlikte yazılır. Dağılım: ${Object.entries(turSay).map(([k, v]) => `${k} ${v}`).join(', ')}.`)}</p>`);
H.push(ayrinti(`${I.tests.length} test: ne doğruladıkları`, tablo(['Ad', 'Tür', 'Doğruladığı'], I.tests.map(t => [f(t.name), kodla(t.kind), f(t.asserts)]))));

// Netleştirilenler
H.push(`<h3>Netleştirilenler</h3>`);
const kendi = I.resolved_gaps.filter(g => g.gap.startsWith('D05-')), baskasi = I.resolved_gaps.filter(g => !g.gap.startsWith('D05-'));
H.push(`<p>${f(`Envanterdeki ${kendi.length} boşluğun her biri karara bağlandı; biri (D05-B05) sahibin onayına bağlı varsayılanla kodlanır. Başka alanların D05'e bıraktığı ${baskasi.length} madde (${baskasi.map(g => g.gap).join(', ')}) da burada karara bağlandı. Envanterdeki ${I.contradictions_resolved.length} çelişki çözüldü.`)}</p>`);
H.push(ayrinti(`${kendi.length} boşluk ve ${baskasi.length} başka alan maddesi: karar ve gerekçe`, tablo(['Boşluk', 'Karar', 'Neden'], I.resolved_gaps.map(g => [kodla(g.gap), f(g.decision), f(g.why)]))));
H.push(ayrinti(`${I.contradictions_resolved.length} çelişki: çözüm`, tablo(['Çelişki', 'Çözüm'], I.contradictions_resolved.map(x => [kodla(x.id), f(x.resolution)]))));

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
