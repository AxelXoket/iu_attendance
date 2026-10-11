const fs=require('fs');const f=__dirname+'/../data-rest.js';let s=fs.readFileSync(f,'utf8');
const rep=(a,b)=>{const n=s.split(a).length-1;if(n!==1)throw new Error('count '+n+' for '+a.slice(0,70));s=s.replace(a,b);};
const T=(kind,name,asserts)=>`  t('${kind}', ${JSON.stringify(name)}, ${JSON.stringify(asserts)}),\n`;
// gece sıralaması
rep(`D08.sonucuDegistirebilirMi'nin kritik dediği öğeler önce (kayıtsız bildirim de { oturumId, ogrenciId } ile);`,
    `D08.sonucuDegistirebilirMi'nin kritik dediği öğeler önce (kayıtsız bildirim de { oturumId, ogrenciId } ile; bütün çağrılarda kip 'DONEM_ORTASI' ve aynı an, işlem repeatable_read);`);
// iki kez çalışma
rep(`t('behavior', "Gece işi aynı gün ikinci kez çalışınca partiyi değiştirmez", "İlk çalışmadan sonra`,
    `t('behavior', "Gece işi aynı veriyle iki kez çalışınca partiyi değiştirmez", "D14'ün 'aynı veriyle iki kez çalışırsa' adımıyla: ilk çalışmadan sonra`);
// saklama
rep(`t('behavior', "Saklama işleyicisi yalnız yoklama_saklama rolüyle siler", "Varsayılan 'silme yok' ayarında işleyici hiçbir satır silmez; süre verilip D12 saklama işi yoklama_saklama rolüyle çağırınca dönemin duzeltmeler, sorun_bildirimleri ve denetim_kayitlari satırlarını partiler hâlinde siler (anonimleştirme yok) ve satır sayısını döner; yoklama_api ve yoklama_isci ile aynı silme 42501."),`,
    `t('behavior', "Saklama işleyicisi tek sınıfla ve yalnız yoklama_saklama girişiyle siler", "Varsayılan 'silme yok' ayarında işleyici hiçbir satır silmez; D12.saklamaIsleyicisiniCalistir(saklamaVeritabani, 'duzeltmeler.donem_verisi', { sinirAni, sureAy, saat }) dönemin gunluk_inceleme_partileri, duzeltmeler, sorun_bildirimleri ve denetim_kayitlari satırlarını bu sırayla partiler hâlinde siler (anonimleştirme yok) ve satır sayısını döner; ardından D05'in yoklama.donem_verisi işleyicisi aynı dönemin kayıtlarını 23503 almadan siler (pozitif kontrol: D09 işleyicisi çalışmadan D05 silmesi 23503 alır); yoklama_api ve yoklama_isci ile aynı silme 42501; aynı sınıfa ikinci kayıt VERITABANI_SAKLAMA_SINIF_IKI_KEZ ile düşer."),`);
// sonradan değişenler
rep(`kilitten sonra ulaşan kayıt SAYILIRSA_DEGISECEK'te ve sayım değişmez; adet 2 ile sayfalarda satır atlanmaz ve tekrar etmez."),`,
    `kilitten sonra ulaşan kayıt SAYILIRSA_DEGISECEK'te ve sayım değişmez; SONUCU_DEGISEN öğesinin sınıfı aynı öğrenci için D10'un raporundaki degisimSinifi sonucuyla birebir aynı; sonucuDegistirebilirMi kip 'AKSIS' ve isteğin anıyla çağrılır; adet 2 ile sayfalarda satır atlanmaz ve tekrar etmez."),`);
// toplu istekler
rep(`t('behavior', "Toplu istekler kilitlenmez", "Aynı öğrencileri ters sırayla taşıyan iki toplu karar isteği eşzamanlı: ikisi de 200 ve hiçbir öğe TEKRAR_DENE almaz (kanonik sıra).`,
    `t('behavior', "Toplu istekler kilitlenmez", "D12 sıra denetimi açıkken (geliştirme kipinde sıra ihlali hata atar) aynı öğrencileri ters sırayla taşıyan iki toplu karar isteği eşzamanlı: ikisi de 200 ve hiçbir öğe TEKRAR_DENE almaz (anahtarlar baştan, kanonik sıra).`);
// denetim birimId
rep(`8 KB'yi aşan ayrıntı reddedilir; iki rollü kişinin hoca rotasındaki olayında yapan_rol HOCA."),`,
    `8 KB'yi aşan ayrıntı reddedilir; iki rollü kişinin hoca rotasındaki olayında yapan_rol HOCA; dersId verilip birimId alanı verilmeyen olay reddedilir, birimsiz derste birimId null ile yazılır (pozitif kontrol)."),`);
// property
rep(`Yok ve 2 saatlik Belgeli 2 mazeretli 1 yok."),`,
    `Yok ve 2 saatlik Belgeli 2 mazeretli 1 yok; sayılan kaydı sayimDisi true olan Var kayıt Y; kilitli oturumda yalnız İncelemede kayıt Y ve gecici false, onaysız Kendi beyanı V ve gecici false; kilitli false iken aynı girdiler boş ve geçici V verir (kontrol)."),`);
// contract kuyruk
rep(`elle_ekleme ve sorun_bildirimi işleyicileri D06'nın OgeIsleyici tipine uyar (roller, oturumGerekli, govdeEnBuyukBayt, ayrintiSemasi, isle(tx, oge, baglam)); iki öğrenci kaynağı OgrenciKaynagi tipine uyar ve tam: true döner."),`,
    `elle_ekleme ve sorun_bildirimi işleyicileri D06'nın OgeIsleyici tipine uyar (roller, oturumGerekli, govdeEnBuyukBayt, ilkCapaVar true, ayrintiSemasi, kilitAnahtarlari, isle(tx, oge, baglam)); gövde şemaları ogeTuruTanimla ile tanımlı ve TUM_OGE_TURLERI'nde (OpenAPI Oge_elle_ekleme ve Oge_sorun_bildirimi); kararSurumu şeması JSON sayı, en az 1; iki öğrenci kaynağı OgrenciKaynagi tipine uyar ve tam: true döner."),`);
// contract yaprak
rep(`t('contract', "D09'dan yalnız yaprak içe aktarılır", "dependency-cruiser: D05, D08 ve D10 dosyaları D09'dan yalnız modules/duzeltmeler/yaprak.ts'i ve packages/core/src/duzeltmeler'i içe aktarır; yaprak.ts hiçbir modülü içe aktarmaz; no-circular kuralı D08 ile D09 ve D05 ile D09 arasında döngü bulmaz."),`,
    `t('contract', "D09'dan yalnız yaprak içe aktarılır", "D13'ün sınır testi (dependency-cruiser API'si, apps/server/src): başka modül dosyaları D09'dan yalnız modules/duzeltmeler/yaprak.ts'i ve packages/core/src/duzeltmeler'i içe aktarır; duzeltmeler/yaprak.ts hiçbir modül dosyası içe aktarmaz; modules/duzeltmeler/ dosyaları jobs/ ve bileşim kökü içe aktarmaz; no-circular D05, D07 ve D08 ile D09 arasında döngü bulmaz; her kural bilerek eklenen yanlış içe aktarmayla (ör. devam/index.ts'ten duzeltmeler/index.ts) kırmızıya döner."),`);
// contract denetim
rep(`Bütün modüllerin sözleşme dosyalarındaki <MODÜL>_DENETIM_OLAYLARI türleri`, `Bütün modüllerin sözleşme dosyalarındaki <MODÜL>_DENETIM_OLAYLARI türleri (D09'da DUZELTMELER_DENETIM_OLAYLARI)`);
// kararSurumu
rep(`istemci_karar_surumu iz olarak yazılır. Güncel sürüm hiç teslim edilmediyse`, `istemci_karar_surumu iz olarak yazılır; kararSurumu metin olarak ("3") gelen öğe RET DUZELTMELER_GECERSIZ_OGE. Güncel sürüm hiç teslim edilmediyse`);
// karar değiştirme
rep(`Kendi beyanı kaydı toplu reddedilir; aynı kayıtlar baglam KARAR_DEGISTIR, beklenenKarar RET, yeniKarar VAR ile gelince KABUL,`,
    `Kendi beyanı kaydı toplu reddedilir; aynı kayıtlar baglam KARAR_DEGISTIR, beklenenKarar RET, yeniKarar VAR ile gelince KABUL; D07.kararDegistir'e giden KararKaynagi { tur: 'HOCA', kisiId, olay: 'KARAR_DEGISTIR', islemId } (dersId, istemci ve onay yok, bunlar duzeltmeler.karar_degistirildi olayında),`);
// mutation
rep(`dersYetkisi denetimi 'sahip' yerine doğruluk denetimine çevrilince iki rollü kişi senaryosu kırmızı olur;`,
    `dersYetkisi denetimi 'sahip' yerine doğruluk denetimine çevrilince iki rollü kişi senaryosu, toplu karar anahtarları öğe öğe alınınca D12 sıra senaryosu, elle_ekleme kilitAnahtarlari kancası kaldırılınca kuyruk sıra senaryosu, denetimeYaz'ın birimId denetimi kaldırılınca denetim senaryosu kırmızı olur;`);
// new tests before the first property test
const anchor=`  t('property', "Son durum önceliği tek ve tam",`;
const add=T('behavior',"Toplu karar isteği danışma anahtarlarını baştan alır","200 öğelik kendi-beyani ve incelemeler karar isteği: kayıtlar önce kilitsiz okunur (D05.kayitGetir), D07.kararAnahtarlari'nın döndüğü çift ve sayaç anahtarları işlemin ilk danismaKilidi çağrısıdır ve öğe SAVEPOINT'lerinden önce alınır; D07.kararDegistir'in kendi isteği işlemsizdir; D12 sıra denetimi açıkken istek hatasız biter. Kontrol: ön çağrı kaldırılınca aynı istek geliştirme kipinde sıra hatası verir.")
 +T('behavior',"Kuyruk öğeleri zincir anahtarını D06'nın paket çağrısına verir","Aynı pakette yoklama_kaydi ve elle_ekleme öğeleri: elle_ekleme'nin 'duzeltmeler:zincir:<oturumId>:<listeSatiriId>' anahtarı D06'nın tek danismaKilidi çağrısında, esitleme:kurulum_siniri anahtarıyla birlikte alınır; işleyicinin kendi isteği işlemsizdir; sorun_bildirimi kancası kova anahtarını paylasimli kipte döner ve uyelikDenetle'nin ret yolu sıra hatası vermez; kanca kilit almaz (kanca sırasında pg_locks'ta yeni danışma kilidi yok).")
 +T('behavior',"Toplu teyit öğe başına ayrı işlemle yürür","3 öğrencilik toplu teyitte her öğe kendi işleminde: ilk kilit dogrulama:teyit:<ogrenciId>, sonra D07'nin yeniden değerlendirme anahtarları; ikinci öğe D01'de bulunamadi alınca birinci ve üçüncü KABUL kalır; 200 öğelik istek D12 sıra denetimi açıkken hatasız biter; aynı islemId ile tekrar ZATEN_VAR.")
 +T('behavior',"Hesabı olmayan öğrencinin düzeltmesi ders düzeyinde hesap işi koyar","Telefonsuz, hesabı olmayan liste satırına Görevli düzeltmesi KABUL; kuyrukta devam_hesapla işi dersId ile ve ogrenciId null; D06.ogrenciDurumuDegisti çağrılmaz; iş verisinde, logda ve denetim ayrıntısında numara yok (yalnız listeSatiriId). Kontrol: hesabı olan öğrencide iş ogrenciId ile konur ve öğrenci sürümü artar; numaralar D01.ogrenciHesabiGetir(tx, { numaralar }) toplu çağrısıyla bir kez çözülür, silinmiş hesap da bulunur.")
 +T('behavior',"201 öğeli toplu istek 400 alır","POST /v1/duzeltmeler ile kendi-beyani, teyitler ve incelemeler kararları 201 öğeyle 400 API_ISTEK_GECERSIZ alır (413 değil) ve hiçbir satır yazılmaz; 200 öğe 200 (pozitif kontrol); 256 KiB'ı aşan gövde 413 API_GOVDE_COK_BUYUK.")
 +T('contract',"duzeltmelerEklentisi birleşim kuralına uyar","D13'ün belge kipi (uygulamaKur surec 'belge', her kullanımda hata fırlatan sahte altyapı) eklentiyi hatasız kurar, kayıt sırasında veritabanı çağrısı yok; surec 'api' ve 'isci' ikisinde de ogeTuruKaydet (2), indirmeKaynagiKaydet (2), saklamaIsleyicisiKaydet ('duzeltmeler.donem_verisi') ve denetimOlaylariniKaydet ('duzeltmeler') kayıtları var; rotalar yalnız rotalariKaydet ile; setErrorHandler ve setNotFoundHandler çağrılmaz; bütün hata kodları DUZELTMELER_ önekli; isler dizisinde tek iş (gece_inceleme_siralamasi) ve KuyrukTanimi modules/duzeltmeler/kuyruklar.ts'ten.");
const i=s.indexOf(anchor);if(i<0)throw new Error('anchor');s=s.slice(0,i)+add+s.slice(i);
fs.writeFileSync(f,s);console.log('ok');
