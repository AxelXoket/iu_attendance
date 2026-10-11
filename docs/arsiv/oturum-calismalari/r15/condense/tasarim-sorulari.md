# Eski planda zaten var olan tasarım boşlukları (kısaltma ve bölmeyle ilgisiz)

Kaynak: ilk turdaki soğuk okuyucu denetçi. Her biri bir karar ister; bu turda plana dokunulmadı.

## Önemli
1. App Attest sayacı: "sayacı yalnız kayıtlar ilerletir" deniyor, ama uygulama her açılışta deneme onayı üretiyor ve o da sayacı artırıyor. Karar: deneme onayları sunucuya gitmez, kayıt sayaçlarında boşluğa izin verilir mi?
2. iPhone oturum anahtarı "WHEN_UNLOCKED_THIS_DEVICE_ONLY", ama arka plan görevi çoğunlukla telefon kilitliyken çalışıyor; kilitliyken indirme ve hak uyarısı yapılamaz. Karar: AFTER_FIRST_UNLOCK mı, yoksa arka planda yalnız gönderim mi?
3. İnceleme hesapları "tek telefon kuralından muaf", ama veritabanındaki "öğrencide tek etkin cihaz" dizini herkesi kapsıyor.
4. Uzaktan güncelleme sorgusu yoklama gönderildikten hemen sonra: ders çıkışı yoğunluğuna denk geliyor; hiç kayıt göndermeyen hoca ve öğrenci düzeltme alamıyor.
5. Etiketler bir yerde "ayrı evet/hayır alanları", başka yerde "metin ve CHECK kısıtı".
6. "Dönem ortasında zorunlu güncelleme yok" ile "desteklenmeyen sürüm güncelleme ekranı görür" ve "gönderme ucu en son kapanır" birlikte belirsiz: en düşük sürüm yalnız dönem arasında mı yükselir?
7. Hesap silmenin kapsamı tanımsız (ham yoklama kayıtları kanıt ve silinmiyor).
8. Sunucunun nerede ve hangi boyutta çalışacağı karar ya da açık nokta olarak yazılı değil.
9. Telefona inen "listeler": öğrenci telefonuna sınıf listesi de iner mi, yoksa yalnız hoca telefonuna mı?
10. QR gecikme hesabında yalnız öğrencinin saat payı var; QR'ı internetsiz gösteren hoca telefonunun payı yok.

## Orta
11. p değeri veri modelinde tek alan; kural teori ve uygulama için ayrı oran istiyor.
12. Geliştirme ve test kurulumunda göç adımı eksik (pnpm dev göç çalıştırmıyor; test şablonuna pg-boss migrate uygulanmıyor); test PostgreSQL'inin dayanıklılık ayarları yayın kabıyla aynı servisi paylaşıyor.
13. İlk yöneticinin nasıl oluşturulacağı yazılı değil.
14. Apple hesabı kararı iş sırasında 8. adımda, ama iPhone geliştirme derlemeleri (App Group, App Attest) 6. adımda ücretli hesap ister.
15. Gizli anahtar listesinde e-posta kodu HMAC anahtarı ve inceleme hesabının sabit kodu yok.
16. pgBackRest resmî PostgreSQL imajında yok; kendi imajımızın adı ve kullanım yeri yazılı değil.
17. Küçük haklarda seviyeler çakışınca hangi mesajın gideceği yazılı değil.
18. Güncelleme ekranı "diğerlerinde GitHub bağlantısı" diyor; iPhone'da App Store ya da TestFlight sayfası açılmalı.
19. Makbuz QR'ının ne taşıdığı ve hoca okutunca kaydın hangi yoldan sunucuya gittiği yazılı değil.
20. "Kendi beyanı" ve "QR'sız" kayıtların onaydan önce sayılıp sayılmadığı yazılı değil; yedek kodlu kayıt için ayrı etiket yok.

## Küçük ve terim
21. "Olay kaydı" ile "günlük sayaçlar" aynı şey mi; "nesil" ve "eşitleme belirteci" tanımsız; "tarafsız sebep kodu" Son durumlar listesinde yok; gece sınıflandırma işi tanımsız.
