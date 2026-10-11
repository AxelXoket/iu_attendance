const fs=require('fs');
const p1=[
"İşlemler testte çalışır, sunucu Aşama 15'te açılır.",
"Hoca başvurur, yönetici onaylar ya da reddeder (D01-P09).",
"Yönetici rol verip geri alır, hesabı pasifleştirir, oturum kapatır; hoca kendi oturumlarını kapatır (D01-P10).",
"Yönetici birim, dönem ve takvimi kurar (D02-P13), ders listesini görür, dersi gerekçeyle başka hocaya devreder (D02-P12).",
"Hoca ders açıp arşivler, şube ekleyip pasifleştirir (D02-P12); telafi ekler, oturum taşır, iptal eder, Ders yapıldı mı sorusunu cevaplar (D02-P11).",
"Kafa sayısı ya da Ders yapıldı cevabı girilince hoca kayıtları görür (D05-P09), düzeltme yazıp geri alır, telefonsuz öğrenciyi elle ekler (D09-P06).",
"Öğrencinin telefondan bildirdiği sorun hocanın listesine düşer, hoca değişiklik yapmadan kapatabilir (D09-P07).",
"Hoca devamdan muaf işaretler, yönetici kuralı farklı dersin oranlarını yazar (D08-P10).",
"Öğrenciye yalnız kendi kayıtları iner, itiraz kanıtını sunucu komutu çıkarır (D05-P08).",
"Süresi dolan yoklama (D05-P07) ve kararın telefona ulaşma kayıtları (D06-P10) silinir."
].join(' ');
const p2=[
"Kesinleşmedi işaretli kurallar değişebilir.",
"Başvuru sonucunda hocaya e-posta gitmez (kesinleşmedi, D01-P09).",
"Son genel yönetici pasifleştirilemez, rolü alınamaz (D01-P10).",
"Son gün geçtikten sonra yalnız gerekçeyle ileri alınır, kilitle arşivlenen dersler yeniden açılır (kesinleşmedi, D02-P13).",
"Derste dönemlik telafi sınırı 30'dur (D02-P11).",
"Telafi kilitten önce geçmiş güne girilebilir, kaydı olmayanları hoca listeden işaretler (kesinleşmedi, D02-P11).",
"Kilitli ya da arşivdeki ders yalnız hocası silinmiş ya da pasif, cevapsız oturumu kalmışsa devredilir, yeni hoca yalnız onları cevaplar (kesinleşmedi, D02-P12).",
"Yönetici dersin öğrenci listesini, yoklamasını ve kafa sayısını görmez (kesinleşmedi, D02-P12).",
"KARAR BEKLİYOR listesi son ders gününde açılır; muafı yalnız dersin hocası işaretler, kilitten sonra muaf ve oranlar değişmez (D08-P10).",
"Sorun bildirimi süresi 3 gündür, karar telefona ulaşınca başlar (D09-P07).",
"Teyit, cihaz değişimi ya da silme sonuçlanınca bekleyen kaydı Var ya da Ret yapan kural yazılır; işlemler sonraki aşamada gelir (D07-P11).",
"Kapalı gelen QR'lı adımda başka oturumun QR'ı Ret alır, yedek kodda 3 yanlıştan sonra doğru kod da İncelemede kalır (D11-P13).",
"Android ve iPhone kanıtları gerçek doğrulayıcıyla denetlenir, geliştirme ortamı kanıtı Cihaz doğrulanmadı etiketi alır (D07-P12).",
"Testler imzalı kaydın sunucuda değiştirilemediğini (D05-P07), kayıtların kafa sayısı ya da Ders yapıldı cevabına kadar gizli kaldığını (D05-P09) sınar."
].join(' ');
fs.writeFileSync('ozet/asama-09.json', JSON.stringify({asama:9,baslik:"Panel yönetimi, düzeltmeler ve karar kuralları",paragraflar:[p1,p2]},null,2)+'\n');
