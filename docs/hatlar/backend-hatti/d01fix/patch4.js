const fs = require('fs');
const edit = (f, pairs) => { let s = fs.readFileSync(f, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(f + ' missing: ' + a.slice(0, 90)); s = s.split(a).join(b); } fs.writeFileSync(f, s); };
edit('g2a.js', [
  ["24 saatte doğrulanmayan ve açık kodu kalmayan başvuruyu silindi yapar", "Son başvuru kodu üretildikten 24 saat sonra hâlâ kod_bekliyor olan ve açık kodu kalmayan başvuruyu silindi yapar"],
  ["'5. yanlış (sayaç kayıt işleminden önce işlenir, geri alınmaz) ya da aynı numaraya yeni kod.'", "'5. yanlış (sayaç hata cevabından önce işlenir, geri alınmaz) ya da aynı numaraya yeni kod.'"],
  ["TR('kod_bekliyor', 'silindi', 'kimlik_temizligi', '24 saatte doğrulanmadı ve açık kodu yok;", "TR('kod_bekliyor', 'silindi', 'kimlik_temizligi', 'Son başvuru kodundan 24 saat sonra doğrulanmadı ve açık kodu yok;"],
]);
edit('g2b.js', [
  ["`Yanlışsa: ardışık yanlışı artır, 3 ve üstünde beklemeyi yaz (başlangıç anı yalnız yeni bekleme başlarken), aday kodların yanlış sayısını artır, 3 olanları gecersiz yap, işlemi bitir; sabit alt süreden sonra KIMLIK_KOD_GECERSIZ, bekleme sürüyorsa KIMLIK_BEKLEME_SURUYOR.`",
   "`Yanlışsa: aday kodların yanlış sayısını artır, 3 olanları gecersiz yap. Bekleme sürmüyorsa ardışık yanlışı da artır, 3 ve üstünde beklemeyi yaz (başlangıç anı yalnız yeni bekleme başlarken), işlemi bitir, sabit alt süreden sonra KIMLIK_KOD_GECERSIZ. Bekleme sürüyorsa ardışık yanlışa ve bekleme bitişine dokunma, işlemi bitir, KIMLIK_BEKLEME_SURUYOR dön: kalan süre aday kod olmayan adresteki kadar kalır, cevap hesabın kod isteyip istemediğini sızdırmaz.`"],
  ["`Kayıt kodu geldiyse (kimlik.kayitKoduAcik değilse 403 KIMLIK_KAYIT_KODU_KAPALI) numaranın açık koduyla karşılaştır;", "`Kayıt kodu geldiyse (kimlik.kayitKoduAcik değilse 403 KIMLIK_KAYIT_KODU_KAPALI; numarada teyitli hesap varsa 409 KIMLIK_NUMARA_TEYITLI) numaranın açık koduyla karşılaştır;"],
  ["Bekleme başlamadan önce üretilmiş kod beklemede 429 alır; yeni koda gelen yanlış deneme 429 döner ama kodun 3 yanlış hakkından düşer.", "Bekleme başlamadan önce üretilmiş kod beklemede 429 alır; yeni koda gelen yanlış deneme 429 döner, kalan bekleme değişmez (aday kodu olmayan kayıtsız adresle aynı cevap ve aynı kalan süre) ama kodun 3 yanlış hakkından düşer."],
]);
edit('g2c.js', [
  ["böyle kod yoksa deneme sayılmadan 429, varsa yanlış deneme o kodun 3 yanlış hakkından düşer ve yine 429 döner.", "böyle kod yoksa deneme sayılmadan 429; varsa yanlış deneme o kodun 3 yanlış hakkından düşer ama bekleme uzamaz ve yine aynı kalan süreyle 429 döner (cevap hesabın kod isteyip istemediğini sızdırmaz)."],
]);
edit('g3.js', [
  ["öğrencide tek etkin cihaz, hesapta tek açık talep,", "öğrencide tek etkin cihaz, cihazda tek açık talep,"],
]);
console.log('ok');
