module.exports = {
  'r17/backend/d11work/icerik-1.js': [
    [String.raw`D04\'ün telefonBildirimi listesinden aynen (ONCE_YENIDEN_BASLATMA, BELGE_7_GUNDEN_ESKI, BELGE_YOK); ilkCapa boşsa BELGE_YOK.`,
     String.raw`D04\'ün ILK_CAPA_TELEFON_BILDIRIMLERI sabitinden aynen (' + O.D04_ILK_CAPA_BILDIRIMI.join(', ') + '); ilkCapa boşsa BELGE_YOK.`],
    [String.raw`CHECK listesi D04\'ün IlkCapaDurumu sabitinden üretilir (ANAHTAR_ELE_GECIRILDI dahil).`,
     String.raw`CHECK listesi D04\'ün ILK_CAPA_DURUMLARI sabitinden üretilir (ANAHTAR_ELE_GECIRILDI dahil).`],
    [String.raw`CHECK listesi D04\'ün IkinciCapaDurumu sabitinden üretilir.`,
     String.raw`CHECK listesi D04\'ün IKINCI_CAPA_DURUMLARI sabitinden üretilir.`],
  ],
  'r17/backend/d11work/icerik-3.js': [
    [String.raw`T('Çapa sütunları D04 ve D06 değerleriyle aynı', 'contract', 'ilk_capa_durumu, ikinci_capa_durumu, ilk_capa_bildirimi ve ikinci_capa_yok_nedeni CHECK listeleri packages/core/src/saat ve packages/contracts/src/esitleme.ts sabitlerinin ASCII büyük harfiyle üretilir (içe alınır, elle yazılmaz); D04 ya da D06 listeye değer ekleyince göç olmadan test kırmızı.`,
     String.raw`T('Çapa sütunları D04 sabitleriyle aynı', 'contract', 'ilk_capa_durumu, ikinci_capa_durumu, ilk_capa_bildirimi ve ikinci_capa_yok_nedeni CHECK listeleri D04\'ün büyük harfli sabitlerinden (ILK_CAPA_DURUMLARI, IKINCI_CAPA_DURUMLARI, ILK_CAPA_TELEFON_BILDIRIMLERI, IKINCI_CAPA_YOK_NEDENLERI; packages/contracts/src/saat.ts) içe alınarak aynen üretilir, çevrilmez ve elle yazılmaz; D04 listeye değer ekleyince göç olmadan test kırmızı; D06 IkinciCapaBaglami.yokNedeni aynı sabittir.`],
    [String.raw`oncekiSahipKisiIdleri kalktı.`, String.raw`eski önceki sahip kimlikleri listesi kalktı.`],
    [String.raw`eşleme tablosundaki eski \"gecikme NORMAL ise Doğrulanmış\" notu düzeltildi.`, String.raw`eşleme tablosunda etiketi gecikmeye bağlayan eski not düzeltildi.`],
    [String.raw`D06 OgeIsleyici\'ye isteğe bağlı kilitAnahtarlari(tx, ogeler, baglam) kancasını ekliyor`, String.raw`D06 OgeIsleyici\'ye isteğe bağlı kilitAnahtarlari(tx, ogeler, baglam) kancasını ekliyor`],
  ],
};
