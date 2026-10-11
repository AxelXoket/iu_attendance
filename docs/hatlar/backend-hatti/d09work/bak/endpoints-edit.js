const fs=require('fs');const f=__dirname+'/../data-endpoints.js';let s=fs.readFileSync(f,'utf8');
const rep=(a,b)=>{const n=s.split(a).length-1;if(n!==1)throw new Error('count '+n+' for '+a.slice(0,70));s=s.replace(a,b);};
rep(`const SAHIP = "kaynak düzeyinde yalnız D02.dersYetkisi(tx, kisi, dersId) === 'sahip' geçer;`, `const SAHIP = "kaynak düzeyinde yalnız D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' geçer (üç parametre, I009);`);
rep(`const HOCA_LISTE = "Rota roller [hoca] (panel ya da telefonun hoca modu); yalnız kişinin sahibi olduğu dersler (D02.dersYetkisi === 'sahip'); dersId verilip sahip değilse 404 DUZELTMELER_BULUNAMADI";`,
    `const HOCA_LISTE = "Rota roller [hoca] (panel ya da telefonun hoca modu); yalnız kişinin sahibi olduğu dersler: liste D02.hocaninDersleri(tx, kimlik.kisiId, { acikDonem: true }) ile süzülür; dersId verilip D02.dersYetkisi(tx, kimlik, dersId) 'sahip' değilse 404 DUZELTMELER_BULUNAMADI";`);
rep(`const TOPLU_TEKRAR = "Tek işlem, öğe başına SAVEPOINT (D13-B28). Öğeler kanonik sırayla`, `const TOPLU_TEKRAR = "Tek işlem: önce danışma anahtarları işlemin ilk çağrısında tek D12.danismaKilidi ile (D09-B40), sonra öğe başına SAVEPOINT (D13-B28). Öğeler kanonik sırayla`);
rep(`yine olursa öğe TEKRAR_DENE DUZELTMELER_GECICI_CAKISMA alır (D09-B32).";`, `yine olursa öğe TEKRAR_DENE DUZELTMELER_GECICI_CAKISMA alır (D09-B32). Öğrenci sürümü (D06.ogrenciDurumuDegisti) öğrenci başına bir kez, o öğrencinin öğelerinden sonra.";`);
// POST /v1/duzeltmeler lock
rep(`Zincir okunmadan önce D12.danismaKilidi(tx, ['duzeltmeler:zincir:<oturumId>:<listeSatiriId>']) alınır; kuyruk işleyicisi aynı anahtarı kullanır. " + TOPLU_TEKRAR,`,
    `Danışma anahtarları: bütün öğelerin 'duzeltmeler:zincir:<oturumId>:<listeSatiriId>' anahtarları (katman 3) işlemin ilk çağrısıdır; kuyruk işleyicisi aynı anahtarı kilitAnahtarlari kancasıyla D06'ya verir. Hesap işi D08.devamHesaplaIsiKoy(tx, dersId, ogrenciId ya da hesapsız öğrencide null, DUZELTME, { tur: 'DUZELTME', id }); liste satırından hesaba geçiş D03 satırının numarasıyla D01.ogrenciHesabiGetir(tx, { numaralar }) toplu çağrısıdır, numara yalnız bellekte. " + TOPLU_TEKRAR,`);
// GET /v1/duzeltmeler auth
rep(`Rol YONETICI: salt okuma; kapsam D01.personelRolleri'nin kapsamBirimId'si: kapsamlı yönetici`, `Rol YONETICI: salt okuma; kapsam kimlik.roller'daki yönetici rolünün kapsamBirimId'si (I009): kapsamlı yönetici`);
rep(`auth: "Rol HOCA: dersId zorunlu ve D02.dersYetkisi === 'sahip' (değilse ve kişi yönetici de değilse 404).`, `auth: "Rol HOCA: dersId zorunlu ve D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse ve kişi yönetici de değilse 404).`);
// geri-al
rep(`Danışma kilidi POST /v1/duzeltmeler ile aynı anahtarda.",`, `Danışma kilidi POST /v1/duzeltmeler ile aynı anahtarda, işlemin ilk çağrısı.",`);
// kendi-beyani kararlar
rep(`Onay D07.kararDegistir(tx, kayit, { karar: VAR, beklenenKarar: VAR, onay: true }, kaynak), ret { karar: RET, beklenenKarar: VAR }; kaynak KararKaynagi { tur: HOCA, islem: KENDI_BEYANI_ONAY ya da KENDI_BEYANI_RET, ... } (D09-B12).`,
    `Danışma anahtarları: kayıtlar önce kilitsiz okunur (D05.kayitGetir), D07.kararAnahtarlari(kayıtların { oturumId, ogrenciId, anahtarId } listesi) çift ve sayaç anahtarlarını üretir, işlemin ilk çağrısında alınır. Onay D07.kararDegistir(tx, kayit, { karar: 'VAR', beklenenKarar: 'VAR' }, { tur: 'HOCA', kisiId, olay: 'KENDI_BEYANI_ONAY', islemId }), ret { karar: 'RET', beklenenKarar: 'VAR' } ve olay KENDI_BEYANI_RET (birleşik biçim, D09-B12; dersId ve istemci D09'un olayında).`);
// teyitler kararlar
rep(`reddedilenHesaplar'ın her biri için aynı işlemde D06.ogrenciDurumuDegisti. " + TOPLU_TEKRAR,`,
    `reddedilenHesaplar'ın her biri için aynı işlemde D06.ogrenciDurumuDegisti. Öğe başına ayrı işlem (D09-B40): her öğenin işleminde ilk kilit D01'in 'dogrulama:teyit:<ogrenciId>' anahtarı (katman 2), sonra D07'nin yeniden değerlendirme anahtarları; öğeler kanonik sırayla (ogrenciId) işlenir, cevap istek sırasıyla döner; 40P01 ve 55P03'te öğenin işlemi bir kez yeniden denenir, yine olursa TEKRAR_DENE DUZELTMELER_GECICI_CAKISMA.",`);
// incelemeler kararlar
rep(`Onayda D07.kararDegistir dönüşündeki kaydın sayilan bayrağı okunur:`, `Danışma anahtarları kendi-beyani kararlarıyla aynı: D07.kararAnahtarlari ile işlemin ilk çağrısında. KararKaynagi { tur: 'HOCA', kisiId, olay: INCELEME_ONAY | INCELEME_RET | KARAR_DEGISTIR, islemId }, YeniKarar { karar: yeniKarar, beklenenKarar } (D09-B12). Onayda D07.kararDegistir dönüşündeki kaydın (KararDegisimi.kayit) sayilan bayrağı okunur:`);
// sonradan değişenler
rep(`SONUCU_DEGISEN { bolum, listeSatiriId, ogrenciAdSoyad, tur: TEORI | UYGULAMA | GENEL, tabanSonucu, simdikiSonuc, tabanAni, kaynaklar:`, `SONUCU_DEGISEN { bolum, listeSatiriId, ogrenciAdSoyad, tur: TEORI | UYGULAMA | GENEL, tabanSonucu, simdikiSonuc, tabanAni, sinif (D10'un degisimSinifi sonucu; Haksız devamsız sınıflaması, I048), kaynaklar:`);
rep(`idempotency: OKUMA + " Liste sorgu anında kurulur, ayrı tablo yok; sayfalama D13-B13 keyset desenidir.",`, `idempotency: OKUMA + " Liste sorgu anında, yalitim 'repeatable_read' ile açılan okuma işleminde kurulur, ayrı tablo yok; D08.sonucuDegistirebilirMi kip 'AKSIS' ve isteğin anıyla çağrılır (I038); sayfalama D13-B13 keyset desenidir.",`);
// denetim auth
rep(`auth: "Rol HOCA: dersId zorunlu, D02.dersYetkisi === 'sahip' (değilse 404). Rol YONETICI: salt okuma; D01.personelRolleri kapsamBirimId'si doluysa`, `auth: "Rol HOCA: dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse 404). Rol YONETICI: salt okuma; kimlik.roller'daki yönetici rolünün kapsamBirimId'si doluysa`);
rep(`auth: "Rol HOCA; dersId zorunlu, D02.dersYetkisi === 'sahip' (değilse 404).",`, `auth: "Rol HOCA; dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse 404).",`);
fs.writeFileSync(f,s);console.log('ok');
