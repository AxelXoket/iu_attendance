// r17 D05 düzeltme kontrolü: her bulgunun düzeltmesinin spec/D05.json ve frag/D05.html'de olduğunu, kaldırılanların gerçekten gittiğini sınar.
// Çalıştır: node kontrol.js   (çıkış kodu 0 = hepsi geçti)
const fs = require('fs'), path = require('path');
const KOK = path.resolve(__dirname, '..', '..');
const S = JSON.parse(fs.readFileSync(path.join(__dirname, 'onceki', 'D05.json'), 'utf8'));
const H = fs.readFileSync(path.join(__dirname, 'onceki', 'D05.html'), 'utf8');
const J = JSON.stringify(S);
const hata = [];
const var_ = (ad, kosul) => { if (!kosul) hata.push(ad); };
const yok = (ad, re, metin = J + H) => { const m = metin.match(re); if (m) hata.push(`${ad}: '${m[0]}' hâlâ var`); };
const kolon = (t, n) => S.tables.find(x => x.name === t).columns.find(c => c.name === n);
const kodlar = S.queue_items.flatMap(q => q.errors);

// F2 KURULMADI gitti, okutma_yolu ve baska_cihaz var
yok('F2 KURULMADI', /KURULMADI/);
var_('F2 okutma_yolu', /okutma_yolu/.test((kolon('yoklama_kayitlari', 'ikinci_capa_durumu')||{}).note));
var_('F2 baska_cihaz', /baska_cihaz/.test((kolon('yoklama_kayitlari', 'ikinci_capa_durumu')||{}).note));
var_('F2 sözleşme testi', S.tests.some(t => /İkinci çapa değerleri sözleşmesi/.test(t.name) && /23514/.test(t.asserts)));
// F3 onarılabilir nedenler
var_('F3 kural', /paket_imzasiz, esitleme_bozuk ya da gonderilmedi/.test(H));
var_('F3 test', S.tests.some(t => /onarılabilir/.test(t.name) && /sonra_yeniden_baslatma/.test(t.asserts) && /gonderilmedi/.test(t.asserts)));
// F4 ve F31 karar sürümü
var_('F4 sütun', kolon('yoklama_kayitlari', 'karar_surumu')?.type === 'integer' && kolon('yoklama_kayitlari', 'karar_surumu').null === false);
var_('F4 GRANT', /GRANT UPDATE \(karar, gerekce_kodu, karar_kaynagi, karar_ani, karar_surumu/.test(H));
var_('F4 kararSutunlariniYaz', /kararSurumu: number/.test((S.exports.find(e => e.name === 'kararSutunlariniYaz')||{}).signature));
var_('F4 kaynak kararlar', /kararlar: readonly \{ donemId: DonemId; kayitId: KayitId; kararSurumu: number \}/.test(S.exports.find(e => e.name === 'ogrencininKayitlari').signature));
var_('F4 test', S.tests.some(t => /Karar sürümü telefona iner/.test(t.name)));
var_('F31 surumeKadar', /surumeKadar: bigint/.test(S.exports.find(e => e.name === 'ogrencininKayitlari').signature));
var_('F31 kayıt', /indirmeKaynagiKaydet\('ogrenci_kayitlari', \{ tur: 'ogrenci', bolum: ogrencininKayitlari \}\)/.test(J));
// F1, F5, F32 ulaşma belgesi gitti
yok('F5 ulasmaBelgesi', /ulasmaBelgesi/);
var_('F5 saatBelgesiVer yalnız D05-A09 ve D12-B31 içinde', (() => { const kopya = JSON.parse(J); kopya.open_points = kopya.open_points.filter(o => o.id !== 'D05-A09'); kopya.resolved_gaps = kopya.resolved_gaps.filter(g => g.gap !== 'D12-B31'); return !/saatBelgesiVer/.test(JSON.stringify(kopya)); })());
var_('F5 GelenOge.ulasmaAni', /GelenOge\.ulasmaAni/.test(kolon('yoklama_kayitlari', 'ulasma_ani').note) && /GelenOge\.ulasmaAni/.test(kolon('makbuz_okutmalari', 'ulasma_ani').note));
var_('F5 A08 kapandı', !S.open_points.some(o => o.id === 'D05-A08'));
var_('F1 test', S.tests.some(t => /POST \/v1\/saat\/belge/.test(t.asserts)));
// F6 ve F32 OgeIsleyici
var_('F6 isleToplu', ['yoklamaKaydiOgesi', 'makbuzOkutmasiOgesi'].every(n => /isleToplu\(tx: Islem, ogeler: readonly GelenOge\[\], baglam: PaketBaglami\): Promise<readonly OgeSonucu\[\]>/.test(S.exports.find(e => e.name === n).signature)));
var_('F6 kayıt değerleri', /roller: \['OGRENCI'\], oturumGerekli: false, govdeEnBuyukBayt: 2048/.test(J) && /roller: \['PERSONEL'\], oturumGerekli: true, govdeEnBuyukBayt: 2048/.test(J));
yok('F6 GelenOge<', /GelenOge</);
yok('F6 yetkiDenetle', /yetkiDenetle/);
yok('F6 eski bağlam alanları', /gonderenCihazId|paketImzali|islemAni/);
yok('F6 giriş oturumu yok dalı', /sahibi değil ya da giriş oturumu yok|Giriş oturumu yok ya da öğeyi/i);
var_('F6 dersYetkisi sahip', /dersYetkisi sonucu 'sahip'|dersYetkisi 'sahip'/.test(J + H));
var_('F6 okutma anı saatSonucu', /saatSonucu ile özne personel/.test(H));
// F7 tipler
var_('F7 tipler', Array.isArray(S.tipler) && /export type KayitTaslagi = \{/.test((S.tipler||[]).join('\n')) && /export type YoklamaKaydi = \{/.test((S.tipler||[]).join('\n')) && /export type KayitKaniti/.test((S.tipler||[]).join('\n')));
var_('F7 appAttest ARTMADI', /'GECTI' \| 'ARTMADI'/.test((S.tipler||[]).join('\n')));
var_('F7 D07 tipleri istendi', S.open_points.some(o => o.id === 'D05-A03' && /KararBaglami ve KararSonucu/.test(o.question)));
// F8 saat sütunları
for (const n of ['saat_durumu', 'ulasma_anini_asiyor', 'ele_gecmis_anahtar', 'saat_sebebi']) var_('F8 ' + n, !!kolon('yoklama_kayitlari', n));
var_('F8 saat_sebebi üretilmiş', /GENERATED ALWAYS AS/.test((kolon('yoklama_kayitlari', 'saat_sebebi')||{}).note));
var_('F8 pencere_sonucu sütunu yok', !kolon('yoklama_kayitlari', 'pencere_sonucu'));
var_('F8 gidiş dönüş testi', S.tests.some(t => /Saat sonucu sütun gidiş dönüşü/.test(t.name)));
// F9 imza önce, denetim sınırı
var_('F9 imza önce', /kilit alınmaz, saklı kayda bakılmaz/.test(H));
var_('F9 test 500', S.tests.some(t => /500/.test(t.asserts) && /denetim satırı 0/.test(t.asserts)));
var_('F9 sınır', /en çok 20/.test(J) && S.files.includes('apps/server/src/modules/yoklama/denetimSiniri.ts'));
// F10 kilit sırası
yok('F10 elle kilit', /pg_advisory_xact_lock\(\$ad_alani|hashtext\(\$oturum/);
var_('F10 danismaKilidi', /tek D12\.danismaKilidi çağrısında/.test(H));
var_('F10 kayitlariKilitle', S.exports.some(e => e.name === 'kayitlariKilitle') && S.open_points.some(o => o.id === 'D05-A10'));
// F11 ZATEN_VAR sızıntısı
var_('F11', S.tests.some(t => /A'nın saklı zarfını/.test(t.asserts) && /karar ve etiket yok/.test(t.asserts)));
// F12 RET okutma yeniden
var_('F12 deneme_no', !!kolon('makbuz_okutmalari', 'deneme_no'));
var_('F12 test', S.tests.some(t => /Reddedilmiş okutma yeniden gelir/.test(t.name) && /ZATEN_VAR değil/.test(t.asserts)));
// F13 yan etki belleği
var_('F13 kural', /isleToplu çağrısına yereldir/.test(H) && S.open_points.some(o => o.id === 'D05-A12'));
var_('F13 test', S.tests.some(t => /23505/.test(t.asserts) && /devam_hesapla/.test(t.asserts)));
// F14, F35, F36 saklama
var_('F14 sınıflar', /yoklama\.makbuz_okutmalari/.test(J) && /yoklama\.yoklama_kayitlari/.test(J));
for (const s of ['esitleme.karar_teslimleri', 'dogrulama.kayit_karar_gecmisi', 'duzeltmeler.duzeltmeler', 'projeksiyon.kanitlar']) var_('F14 oncekiSiniflar ' + s, H.includes(s));
var_('F14 REVOKE saklama', /REVOKE UPDATE ON yoklama_kayitlari, makbuz_okutmalari FROM yoklama_saklama/.test(H));
var_('F14 test sinirAni', S.tests.some(t => /sinirAni/.test(t.asserts) && /partiBoyutu/.test(t.asserts)));
// F15, F33 HESAP_SILINMIS
var_('F15 öğe kodu değil', !kodlar.includes('HESAP_SILINMIS') && !kodlar.includes('YOKLAMA_HESAP_SILINMIS'));
var_('F15 silinmeAni', /ogrenciSilinmeAni/.test((S.tipler||[]).join('\n')));
// F16 satır sınırı
yok('F16 409', /YOKLAMA_LISTE_SINIRI_ASILDI|\(409\)/);
var_('F16 test', S.tests.some(t => /İki şubeli büyük oturum/.test(t.name)));
// F17 panel bölüşümü
var_('F17 kural', /ilk uyan kümeye girer/.test(S.endpoints[0].response.sayilar));
var_('F17 null', /number \| null/.test(S.endpoints[0].response.listeDisiKayitSayisi));
var_('F17 örnek', S.tests.some(t => /17 öğrencilik/.test(t.asserts) && /var 7/.test(t.asserts)));
// F18 süzgeç
var_('F18 süzgeç', /kendiBeyaniOnaysiz\?: true; ulasmaAraligi\?/.test(S.exports.find(e => e.name === 'sayilanKayitlar').signature));
var_('F18 dizin', S.tables[0].indexes.some(i => /etiket_kendi_beyani AND onaylayan_id IS NULL AND karar = 'VAR'/.test(i)));
// F19 döngü
var_('F19 yaprak', S.files.includes('apps/server/src/modules/yoklama/yaprak.ts') && S.tests.some(t => /no-circular/.test(t.asserts)));
// F20 iOS 27
var_('F20', /iOS 27/.test(J) && S.tests.some(t => /iOS 27 onay uzantıları/.test(t.name)));
// F21 A04 A06 kapandı
var_('F21', !S.open_points.some(o => ['D05-A04', 'D05-A06'].includes(o.id)) && /numaralar/.test(J) && /ogrenciIdler/.test(S.endpoints[0].response.ogrenciler));
// F22 önek ve D13 adları
var_('F22 önek', kodlar.every(k => k.startsWith('YOKLAMA_')));
yok('F22 çıplak SUNUCU_YOGUN', /(?<!API_)SUNUCU_YOGUN/);
var_('F22 D13 adları', ['API_KIMLIK_GEREKLI', 'API_ROL_YETKISIZ', 'API_HIZ_SINIRI', 'API_SUNUCU_YOGUN', 'API_SORGU_ZAMAN_ASIMI'].every(k => S.endpoints[0].errors.join(' ').includes(k)));
// F23 bekleme
var_('F23', /beklemeSaniye 3600/.test(J));
// F24 öğe kimliği
var_('F24', kodlar.includes('YOKLAMA_OGE_KIMLIGI_UYUSMUYOR'));
// F26 devir
var_('F26', /devir anından önce/.test(J) && S.open_points.some(o => o.id === 'D05-A13'));
// F27 hız sınıfı
var_('F27', /'agir'/.test(S.endpoints[0].rate_limit));
// F28 testler
var_('F28 strip', S.tests.some(t => /Genişleyen değerler/.test(t.name) && /strip/.test(t.asserts)));
yok('F28 kapalı şema cümlesi', /KayitMetni alanları kapalıdır/);
var_('F28 Stryker ve numRuns', /kırma eşiği %90/.test(J) && /numRuns 200/.test(J));
// F29 makbuz anahtarları
var_('F29', S.tables[1].indexes.every(i => !/_(pk|uq|idx):/.test(i) || /: (PRIMARY KEY |UNIQUE )?\(donem_id/.test(i)));
// F30 A07
var_('F30', /farklı içerikle \(kayıt metni\)/.test((S.open_points.find(o => o.id === 'D05-A07')||{}).question));
// F34 qrYetenegi
var_('F34', /qrYetenegi/.test((S.resolved_gaps.find(g => g.gap === 'D05-B01')||{}).decision) && /KayitKanitAlanlari/.test(J));
// genel: yasak tire
yok('tire', /[–—]/);

if (hata.length) { console.log('KALAN (' + hata.length + '):\n' + hata.join('\n')); process.exit(1); }
console.log('kontrol: bütün bulgu denetimleri geçti');
