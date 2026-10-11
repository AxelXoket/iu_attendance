// Deterministic presence check: each review finding's required elements appear in spec/D03.json or frag/D03.html.
const fs = require('fs');
const J = fs.readFileSync('spec/D03.json', 'utf8'), H = fs.readFileSync('frag/D03.html', 'utf8');
const all = J + H;
const need = {
  F01_kova_D01: ['kovaNo', 'pg_advisory_xact_lock_shared(3, kova', 'saniyede 50 kayıt', '55P03 yok'],
  F02_F03_listeKaynagi: ['listeKaynagiKaydet({ etkinSatirlar, pasiflesenSatirlar })', 'ikisi de boşsa iç hata', 'uyelik_surumu > $2', 'DERSLER_SUBEDE_OGRENCI_VAR', 'app.ts ve worker.ts'],
  F04_indirme: ["'ogrenci_liste_kapsami'", "roller: ['OGRENCI', 'PERSONEL']", 'surumeKadar = surumden + 1', 'uyelik_surumu', 'sahipAtamaSurumu okumaz', 'ortak kaynak sözleşme yardımcısı'],
  F05_F29_teyit: ['Kapsam.teyitli true değilse adSoyad null', 'Teyitsiz öğrenciye ad inmez', 'hesap özetine teyit'],
  F06_kilit: ["SET LOCAL lock_timeout = '3s'", 'LISTELER_MESGUL', '2.000 satırlık canlanma', 'işlemin ilk kilididir', 'bekleyen_kayit_kapatma'],
  F07_kirpma: ['üyelik aralıkları', 'kesişmez', 'satir_kirpildi', 'KIRPILDI', 'Satırların üyelik aralıkları kesişmez', 'Yanlış şubeye yüklenen dosya'],
  F08_ret_yolu: ['Gönderim ile canlanma yarışı', 'ret yolu'],
  F09_ozet: ['farkOzeti', 'beklenenFarkOzeti', 'tek anlık görüntü'],
  F10_sube_onayi: ['subeDegisikligiOnaylandi', '2 x (pasifOlacak + subeDegisecek)', 'Boş şubeye başka şubenin dosyası'],
  F11_secim: ['(ders, numara) başına tek', 'LISTELER_GEC_KAYIT_DEGIL', 'Geç kayıt seçimi dersteki bütün satırlara yazılır'],
  F12_saklama: ["'listeler.liste_satirlari'", 'partiIsle', 'sinirAni', 'birim_id', 'bitti'],
  F13_etkin: ['birim dönemi', 'açık dönemlerdeki bütün etkin satırlar eşleşmeli', 'Geçmiş dönemin satırı eşleşmeye ve yetkiye girmez'],
  F14_F30_muaf: ["sonuc: 'KILITLI'", "'SATIR_YOK'", 'onceki: boolean', 'degisti: boolean', '{satirId}/muaf'],
  F15_get_sayfa: ['bolum (sorgu)', 'Pasif satırlar sayfalı döner', 'pasifSayisi'],
  F16_skew: ["kilitle: 'paylasimli'", 'Şube pasifleştirme ile uygula yarışmaz'],
  F17_olaylar: ['Her geçiş kendi denetim olayını yazar', 'SUBE_DEGISIMI', 'listeler.satir_canlandi'],
  F18_deneme: ['denemeListesiniKur(tx: Islem, subeId: SubeId, ogrenciNo: OgrenciNo, adSoyad: string)', 'Deneme listesi kurulur'],
  F19_ic_ice: ['granted false', 'Belirlenimci iç içe geçme'],
  F20_hedef: ['hedefSatirId', 'şube değişimi değeri hedef satıra kopyalar'],
  F21_adlar: ['liste_yuklemeleri_eklenen_ck', '@dizinsiz-kabul', 'liste_satirlari_pasif_ani_eklenme_ani_ck'],
  F22_cagiranlar: ['D05 D03\'ü çağırmaz', 'LISTELER_GIZLI_ALANLAR'],
  F23_uyarlayici: ['LISTE_DEGISTI', "'LISTE_SATIRI'", 'turler: ReadonlySet', 'Fastify örneğine bağlı'],
  F24_oncelik: ['Hata sırası', 'satirSiniriAsilir', 'Hata önceliği'],
  F25_ilk_ders: ["durum: 'planlandi'", 'telafi oturumu'],
  F26_toplam: ['toplam satır sınırı yoktur', 'toplam sınır yok'],
  F27_tipler: ['tx: Islem', 'kimlikSemasi'],
  F28_sube: ['SUBE_SATIRI_YOK', "'1. Şube'"],
  F31_ogrencininSatirlari: ['ogrencininSatirlari(tx: Islem, ogrenciNo: OgrenciNo, s?: { donemIdler?: readonly DonemId[] })']
};
let bad = 0;
for (const [k, list] of Object.entries(need)) for (const x of list) if (!all.includes(x) && !all.includes(x.replace(/'/g, '&#39;')) && !all.includes(x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'))) { console.log('MISSING', k, '|', x); bad++; }
// negative controls: stale phrases must be gone
for (const x of ['(3, 1)', 'gecEklenen', '6.000 toplam', "{ogrenciId}/muaf", 'tek danışma kilidi', 'muafIsaretle de bu kodla']) if (all.includes(x)) { console.log('STALE', x); bad++; }
console.log(bad ? 'FAIL ' + bad : 'ALL PRESENT');
