// Shared deterministic helpers for the D11 spec build: D12 kisitAdi, constant lists, kürsü state function.
const crypto = require('crypto');

// D12 kisitAdi: <tablo>_<sütunlar>_<tür>; over 63 bytes the body is cut and the first 8 hex of SHA-256(full name) added.
function kisitAdi(tablo, sutunlar, tur) {
  const tam = `${tablo}_${sutunlar.join('_')}_${tur}`;
  if (Buffer.byteLength(tam) <= 63) return tam;
  const ozet = crypto.createHash('sha256').update(tam).digest('hex').slice(0, 8);
  const govde = `${tablo}_${sutunlar.join('_')}`.slice(0, 63 - (1 + 8 + 1 + tur.length));
  return `${govde}_${ozet}_${tur}`;
}

// D11 result dictionary (packages/contracts/src/projeksiyon.ts); the CHECK lists and the QrSonucu type come from these.
const DOGRULAMA = ['GECERLI', 'BICIM_BOZUK', 'SURUM_BILINMIYOR', 'OTURUM_UYUSMUYOR', 'ANAHTAR_BULUNAMADI', 'ANAHTAR_EMEKLI', 'ANAHTAR_ELE_GECIRILDI', 'INDIRME_KAYDI_YOK', 'MAC_GECERSIZ', 'YEDEK_KOD_ESLESMEDI', 'YEDEK_KOD_SINIR', 'YOK'];
const GECIKME = ['NORMAL', 'INCELEMEDE', 'RET', 'ONCE_OKUTULMUS', 'GOSTERIM_DISI', 'BEKLEMEDE', 'SAAT_DOGRULANAMADI', 'HOCA_SAATI_YOK', 'HOCA_CAPALARI_AYRISIYOR', 'ANAHTAR_IPTAL', 'CAPALAR_ESKI'];
// D04 values (upper case, packages/contracts/src/saat.ts) are stored as they are; D06's lower-case yokNedeni is stored as its ASCII upper case.
const D04_ILK_CAPA_DURUMU = ['GECERLI', 'ONCE_YENIDEN_BASLATMA', 'BELGE_7_GUNDEN_ESKI', 'BELGE_YOK', 'BELGE_GECERSIZ', 'ANAHTAR_ELE_GECIRILDI', 'OZNE_UYUSMUYOR', 'ISTEK_SURESI_ASILDI', 'SURE_GECERSIZ'];
const D04_IKINCI_CAPA_DURUMU = ['GECERLI', 'SONRA_YENIDEN_BASLATMA', 'KAYIT_7_GUNDEN_ESKI', 'PAKET_IMZASIZ', 'OKUTMA_YOLU', 'BASKA_CIHAZ_GONDERDI', 'ESITLEME_BOZUK', 'GONDERILMEDI', 'BELGE_GECERSIZ', 'ANAHTAR_ELE_GECIRILDI', 'OZNE_UYUSMUYOR', 'ISTEK_SURESI_ASILDI', 'SURE_GECERSIZ'];
const D04_ILK_CAPA_BILDIRIMI = ['ONCE_YENIDEN_BASLATMA', 'BELGE_7_GUNDEN_ESKI', 'BELGE_YOK'];
const D06_IKINCI_CAPA_YOK = ['sonra_yeniden_baslatma', 'paket_imzasiz', 'esitleme_bozuk', 'gonderilmedi'];
const buyuk = s => s.replace(/[a-z]/g, c => String.fromCharCode(c.charCodeAt(0) - 32)); // ASCII only, locale independent
const sqlListe = l => l.map(v => `'${v}'`).join(',');

// Kürsü page state: the rule block's priority order as one pure function (packages/core/src/projeksiyon/kursu-durumu.ts).
// bag: YOK_ACIK_KOD (no open link, code valid) | YOK_KOD_DOLDU | YOK_KAPANDI (last link closed) | ACIK
function kursuDurumu({ bag, dersBitti, esitleme, pencere }) {
  if (bag === 'YOK_ACIK_KOD') return 'ESLESME_BEKLIYOR';
  if (bag === 'YOK_KOD_DOLDU') return 'KOD_SURESI_DOLDU';
  if (bag === 'YOK_KAPANDI') return 'KAPANDI';
  if (dersBitti) return 'KAPANDI';
  if (esitleme === 'BOZUK') return 'SUNUCU_SAATI_BOZUK';
  if (pencere === 'ONCE') return 'YOKLAMA_ACILMADI';
  if (pencere === 'SONRA') return 'YOKLAMA_KAPANDI';
  return 'BAGLI';
}
const KURSU_DURUMLARI = ['ESLESME_BEKLIYOR', 'KOD_SURESI_DOLDU', 'YOKLAMA_ACILMADI', 'BAGLI', 'YOKLAMA_KAPANDI', 'SUNUCU_SAATI_BOZUK', 'KAPANDI'];
const KURSU_OLAYLARI = [
  { by: 'zaman', when: 'Eşleştirme kodunun bitis_ani geçti; sayfa yeni kod ister.', f: s => s.bag === 'YOK_ACIK_KOD' ? { ...s, bag: 'YOK_KOD_DOLDU' } : null },
  { by: 'POST /v1/projeksiyon/eslestirme-kodu', when: 'Sayfa yeni eşleştirme kodu aldı.', f: s => (s.bag === 'YOK_KOD_DOLDU' || s.bag === 'YOK_KAPANDI') ? { ...s, bag: 'YOK_ACIK_KOD', dersBitti: false } : null },
  { by: 'POST /v1/projeksiyon/onay', when: 'Hoca kodu onayladı (pencere açılışından 15 dakika önce ile ders bitişi arası); durum o anki pencere ve eşitlemeden çıkar.', f: s => s.bag === 'YOK_ACIK_KOD' ? { ...s, bag: 'ACIK', dersBitti: false } : null },
  { by: 'bağlantı kapanışı', when: 'Hoca kesti, yenisi geldi ya da ikinci kullanım; kapanmaSebebi dolu.', f: s => s.bag === 'ACIK' ? { ...s, bag: 'YOK_KAPANDI' } : null },
  { by: 'zaman ya da D02 oturum iptali', when: 'Ders bitti ya da oturum iptal edildi; yazılmadan önce de okuyan uç KAPANDI gösterir.', f: s => (s.bag === 'ACIK' && !s.dersBitti) ? { ...s, dersBitti: true } : null },
  { by: 'D04.esitlemeSaglikliMi false', when: 'Sunucu saat eşitlemesi bozuldu; kod verilmez, hoca QR\'ı telefonundan gösterir.', f: s => s.esitleme === 'SAGLIKLI' ? { ...s, esitleme: 'BOZUK' } : null },
  { by: 'D04.esitlemeSaglikliMi true', when: 'Eşitleme düzeldi; durum pencereden çıkar.', f: s => s.esitleme === 'BOZUK' ? { ...s, esitleme: 'SAGLIKLI' } : null },
  { by: 'zaman', when: 'Pencere açıldı.', f: s => s.pencere === 'ONCE' ? { ...s, pencere: 'ICINDE' } : null },
  { by: 'zaman ya da D04 erken kapatma', when: 'Pencere kapandı; bağlantı ders bitişine kadar açık kalır.', f: s => s.pencere === 'ICINDE' ? { ...s, pencere: 'SONRA' } : null },
  { by: 'D04 pencere değişikliği', when: 'Pencere ders bitişinden önce uzatıldı ya da yeniden açıldı (D04-A02 onaylanırsa).', f: s => s.pencere === 'SONRA' ? { ...s, pencere: 'ICINDE' } : null },
];
function kursuGirdileri() {
  const l = [];
  for (const bag of ['YOK_ACIK_KOD', 'YOK_KOD_DOLDU', 'YOK_KAPANDI', 'ACIK'])
    for (const dersBitti of [false, true]) for (const esitleme of ['SAGLIKLI', 'BOZUK']) for (const pencere of ['ONCE', 'ICINDE', 'SONRA']) {
      if (bag !== 'ACIK' && dersBitti) continue; // dersBitti only matters for an open link
      l.push({ bag, dersBitti, esitleme, pencere });
    }
  return l;
}
// Derive the transition table: every single event applied to every input combination.
function kursuGecisleri() {
  const m = new Map();
  for (const s of kursuGirdileri()) for (const o of KURSU_OLAYLARI) {
    const t = o.f(s); if (!t) continue;
    const a = kursuDurumu(s), b = kursuDurumu(t); if (a === b) continue;
    const k = a + '>' + b; if (!m.has(k)) m.set(k, { from: a, to: b, olaylar: [] });
    const e = m.get(k); if (!e.olaylar.some(x => x.by === o.by && x.when === o.when)) e.olaylar.push(o);
  }
  const sira = s => KURSU_DURUMLARI.indexOf(s);
  return [...m.values()].sort((x, y) => sira(x.from) - sira(y.from) || sira(x.to) - sira(y.to))
    .map(e => ({ from: e.from, to: e.to, by: [...new Set(e.olaylar.map(o => o.by))].join('; '), when: e.olaylar.map(o => o.when).join(' Ya da: ') }));
}

module.exports = { kisitAdi, DOGRULAMA, GECIKME, D04_ILK_CAPA_DURUMU, D04_IKINCI_CAPA_DURUMU, D04_ILK_CAPA_BILDIRIMI, D06_IKINCI_CAPA_YOK, buyuk, sqlListe, kursuDurumu, KURSU_DURUMLARI, KURSU_OLAYLARI, kursuGirdileri, kursuGecisleri };
