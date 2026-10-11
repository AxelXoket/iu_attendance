const fs=require('fs');
const P1=[
"Gece işleri yazılıp sınanır, 19. aşamada işçiyle çalışır.",
"Dönem kilitlenince şubelerin AKSİS özetinin değişmez kopyası alınır, sonradan değişenler ve Haksız devamsız buna göre ölçülür; ekranda açılmış dönem sonu özeti taban olur, kilitten sonraki kayıt hücre değiştirmez, KARAR BEKLİYOR öğrenci yoksa özet geçici değildir (D10-P15).",
"Takvim yenileme işi, dönem kilidi ve deneme dersi işleriyle listeye girer; 15. aşamanın takvim senaryoları yeşile döner (D02-P18).",
"Saklama işinin yalnız gece çerçevesi gelir (silme 5., senaryolar 18. aşamada); İÜ süresi belirlenene kadar (açık nokta) hiçbir satıra dokunmaz, gecede en çok 30 dakika çalışır (D12-P10).",
"Panel parolalı Excel'i tanıyıp hocaya açık hata verir, kodlamaları ve CSV'yi çözer (D03-P05).",
"Aylık geri yükleme denemesine ayrı veritabanı kurulur (D12-P18)."
];
const P2=[
"Hem hoca hem yönetici olan kişi hocası olmadığı derse, öğrenci ve yönetici hiçbir derse düzeltme yazamaz; toplu istek 200 öğeyi geçmez; Kendi beyanı toplu onayı görülmeyeni onaylamaz (D09-P15).",
"Sorun bildirimi düzeltmeyle kapanır (D09-P16).",
"İşaretli oturumun ertesi günkü sınıfta değil düzeltmesi Haksız devamsız saymadan Yok yapar; son günden sonraki kayıt yalnız Beyana dayalı düzeltmeyle sayılır; kilitle kopya arasındaki düzeltme 10 dakika sonra yinelenir (D09-P17).",
"Silinen hesabın sayaçları ve ekran süreleri birlikte silinir, geç sayaç yazılmaz; panel ekran süresi kişi ve günde en çok 500 satır (D15-P23).",
"Uyarıda numara gizlenir; e-posta sunucusu düşükken dış izlemeye arıza sinyali gider (D15-P24).",
"Devamsızlık tutarlılık farkı, cihaz kanıtı reddi ve aynı gün yeni ret kodu uyarı açar (D15-P25).",
"13 aydan eski sayaç, ekran süresi ve kapanmış uyarı silinir (D15-P26).",
"Saat belgesi, QR ve ulaşma makbuzu anahtarları iki adımda döner; olay komutu personel oturumlarını denetim kaydıyla kapatır, hocanın QR'ını iptal eder, öğrenci oturumlarını açık bırakır (D15-P28).",
"Ders çıkışı işleri 50'lik partilerle işlenir, 20.000 iş tek tekten en az 10 kat hızlı; hatalı iş yalnız kendini yeniler (D14-P08)."
];
const wc=s=>s.split(/\s+/).filter(Boolean).length;
for (const [n,P] of [["P1",P1],["P2",P2]]) { P.forEach(s=>console.log(n,wc(s),s.slice(0,50))); console.log(n,"total",P.reduce((a,s)=>a+wc(s),0)); }
const o={asama:16,baslik:"Gece işleri, dönem sonu kopyası ve işletim senaryoları",paragraflar:[P1.join(' '),P2.join(' ')]};
fs.writeFileSync(process.argv[2], JSON.stringify(o,null,2)+'\n');
