> Not, 6 Ekim 2026: Bu gerekçe kör karşılaştırmaya giren A yönüne aittir ve eskidi. Düzeltme listesinden sonraki kararlar ve ölçümler tasarim.html içindedir (bütçe telefonda yüzde 7, panelde yüzde 2; hover girişte 120 ms, çıkışta 100 ms; basma 0,97; Görevli #652F94; Belgeli düzeltme neutral.11).

# Yön A: Kesin

## Fikir

Kâğıt ve mürekkep. Ekranın kendisi kâğıttır: kırık beyaz sayfa (#F2F4F8), bir ton açık yüzey (#FEFEFF), ince gri çizgiler ve gri metin. Gece mavisi bu kâğıda sürülen boya değil, karar verilen yere yazılan mürekkeptir. Nötr ölçek aynı ailenin H 270 tonunu taşıdığı için alt ton her gri yüzeyde hissedilir; renk olarak yalnız sekiz rolde görünür. Biçim IBM Carbon'un üretken dilinden gelir: 0 köşe, 1 px çizgi, 4 ve 8 ızgarası, kısa ve aşmasız hareket. Zarafet süsten değil hizadan, boşluktan ve tipografiden gelir (R05-K10, R13-K14, R13-K15).

## Gece mavisi nerede ve nasıl

Kural üç cümle: ekranda en çok bir dolu gece mavisi alan vardır (birincil eylem); seçim gri zemin ve 2 px mürekkep çizgiyle gösterilir; renkli zemin yoktur, accent.1 ile accent.8 kullanılmaz (R02-K05, R08-K08, R07-K05, R02-F14).

Sekiz rol ve adımı:

1. Birincil eylem dolgusu, accent.11; hover accent.10, basılı accent.12 (sahibin kilidi, R02-K02).
2. Odak halkası, accent.9, 2 px çizgi 2 px boşluk; koyu yüzeyde neutral.1 (R02-K03, R05-K05, R11-K03).
3. Satır içi bağlantı, accent.9, her zaman altı çizili; gövde metninden 2,38:1 ayrıldığı için (R02-K04, R02-F18).
4. Seçim işareti, accent.11, 2 px çubuk: seçili satırın solu, etkin sekmenin altı, panel gezinmesinde etkin öğe, kod alanında sıradaki kutu.
5. İşaretli kontrol, accent.11: onay kutusu dolgusu ve açık anahtar rayı.
6. Anahtar rakam, accent.11, ekran başına bir sayı: öğrencide kalan süre, panelde Var sayısı.
7. Başarı ve Var: Var damgası, Sunucuya ulaştı makbuzu, başarı ekranındaki kare ve onay işareti. Başarı gece mavisi ailesinden, yeşil yok (sahibin kilidi).
8. İlerleme, accent.11, 4 dp çubuk.

Hiçbir zaman: zeminler ve çubuklar, başlık ve gövde metni, ikinci bir dolu düğme, QR ve QR gösterme ekranı, kamera ekranı, çevrimdışı şeridi ve bildirimler (grafit ters yüzey), uyarı ve hata anlamı, degrade ve süs, 48 dp'yi aşan dolu alan.

Bütçe ekran başına telefonda yüzde 8, panelde yüzde 2. shot.js --elements ve coverage.js ile ölçülen paylar (1440 px): öğrenci ana ekranı yüzde 5,65 (390 px'te 5,64), QR okutma 0, yoklama kaydedildi 6,23, hoca QR ekranı 0, kayıtlar ve alt sayfa 0,58, panel yoklama tablosu 0,79. Sarı ve yeşil ailesi bütün ekranlarda yüzde 0. Ölçümde çizilen ekranlar kendi katmanında, gri tonlu kenar yumuşatmayla çizilir; 1440 px'te Windows'un alt piksel renk saçakları ilk ölçümde sarı ve mavi piksel sayıyordu, bunlar tasarım rengi değildir ve telefonlar zaten gri tonlu çizer.

## Renk ve durumlar

Nötr ve gece mavisi ölçekleri locked.json'dan aynen alındı. Roller: zemin, metin, ikon, kenar, mürekkep, tehlike, odak, QR. Kontrol kenarı neutral.9; hover ve seçili satırda neutral.10, çünkü neutral.9 orada 3:1'in altında kalıyor (R01-K04 düzeltmesi, R11-K02). tcheck.js 70 çifti ölçtü, hepsi geçer.

Durumların zemini yok: anlamı önce ikonun biçimi ve sözcük, sonra mürekkebin rengi taşır (R09-K02, R11-K07, R14-F06). Damga 1 px durum renginde çerçeve, 16 px ikon, 13 px yazıdır; tabloda çerçevesiz biçim kullanılır. Altı son durumun mürekkebi bir betikle seçildi (tools/explore-status.js, tools/eval-set.js): Var accent.11, Yok kırmızı #AC312E, Görevli çivit #3A3CA2, Belgeli düzeltme mürdüm #653749, Elle eklendi grafit neutral.12, Devamdan muaf gri neutral.11. Normal görüşte ve protan, deutan, tritan benzetiminde en yakın çift 0,081 OKLab uzaklıkta (R02-F20'deki 0,077'den iyi). Zeminler bilerek aynı olduğu için tcheck 15 uyarı yazar; bu yönün kararıdır. Uyarı ailesi mor #7839A5 (İncelemede, düzey 2), tehlike kırmızı; dört uyarı düzeyi ayrıca dört bölmeli bir sayaçla okunur (R14-K06). Belgede benzetim görüntüsü yok: kırmızının deutan benzetimi sarıya kayar ve sahibin kilidi belgede de sarı istemiyor; benzetim sayıyla ve renksiz (gri) satırla gösterildi.

## Tipografi

IBM Plex Sans ve IBM Plex Mono, SIL OFL 1.1 (R06-F14, L3-C45). Plex rakamları varsayılan olarak eşit genişlikli, I ve l ayrışık; Carbon'un Plex için ayarladığı harf aralıkları panel ölçeğine alındı (R06-F21). Araştırma Inter'i önermişti (R06-K01); Plex bu yönün keskin karakteri için seçildi, bedeli biraz daha küçük x yüksekliği (0,516). Bunu telefonda 16 pt gövde ve 40 pt anahtar rakamla karşılıyoruz. Plex'in fi bağı Türkçe dil sistemi olmadan açık geldiği için bağlar kapatıldı: panelde font-variant-ligatures, telefonda fontTools alt kümesi (R06-F06). Öğrenci numarası, e-posta kodu ve istek kimliği Plex Mono. Büyük harf dönüşümü yok; AKSİS sonuçları metinde toLocaleUpperCase('tr-TR') ile hazırlanır (R06-K06).

## Biçim, çizgi, gölge, boşluk

Bütün bileşenler 0 köşe; istisna yalnız işletim sisteminin çizdiği parçalar (R05-K01, R08-F12). Yüzeyler gölgeyle değil ton farkı (1,09:1) ve 1 px çizgiyle ayrılır; gölge yalnız menü, diyalog, alt sayfa ve bildirimde, rengi neutral.12 (R05-K04, R01-K03). Boşluk Carbon'un 4 tabanlı ölçeği (R05-K06); telefonda dokunma alanı 48 dp, panelde tıklama alanı en az 24 px (R05-K07, R05-K08, R11-K04). Tablo satırı 48 px, zebra yok, sayılar eşit genişlikli (R14-K01, R14-K02).

## Hareket

Süreler Carbon üretken setine yakın: 0, 70, 110, 150, 200, 240, 300 ve yalnız başarı anı için 400 ms (R13-K02, R03-K01). Eğriler Carbon üretken standart, giriş ve çıkış; başarı anında Carbon ifadeci eğri (R13-F09). Yaylar telefonda Reanimated withSpring ile, sönüm oranı 0,9 ile 1 arası: hızlı 282 ms, orta 384 ms, efekt 272 ms, hepsi aşmasız; imza yayı 350 ms ve yüzde 0,12 aşma (R03-K03, R13-K03). Panel yedeği spring.js'in ürettiği linear() eğrileri. Çıkış girişten kısa (oran 0,67 ile 0,75). Yalnız transform ve opacity canlanır; çevrimdışı şeridinin ittiği içerik FLIP ile transform olarak kayar. Hover yalnız imleçli cihazda, basma :active ile 0,98 ölçek. Hareket azaltma tek değişkenle (--mv) bütün kayma ve ölçeği sıfırlar, renk ve opaklık 70 ile 150 ms kalır (R03-K09, R04-K21, R11-K09). Boşta hareket ve tarama çizgisi yok; QR anında değişir (R07-K04, R11-K10). Tek ifadeci an yoklamanın kaydedildiği an: kare ve onay çizilir, makbuz satırları 40 ms arayla gelir (R13-K15, R04-K17).

## Bileşen ve ekran kararları

Birincil düğme dolu mürekkep, ikincil gri çerçeveli, hayalet çerçevesiz, tehlike kırmızı. Yükleniyor durumunda genişlik korunur, karenin çevresinde dönen bir iz gösterilir (dairesel gösterge yerine köşeli dilin karşılığı). E-posta kodu tek alan, altı kutu arkasına çizili, yapıştırma ve otomatik doldurma açık (R14-K12). Diyalog yerel dialog öğesi; menü tetikleyiciden açılır; alt sayfa köşesiz, görünür Kapat düğmesiyle (R13-K09, L1-C14). Çevrimdışı şeridi grafit, kalıcı, kırmızı değil (R07-K06, R14-K10). Hoca QR ekranında gece mavisi yok: QR saf siyah ve beyaz, dört modül boşluklu (R11-K13). Panelde tek birincil eylem Excel olarak indir, anahtar rakam Var sayısı, ad sütunu Türkçe harf sırasıyla sıralanır.

## Açık noktalar

- Plex'in daha küçük x yüksekliği alt segment Android ekranında gerçek cihazda denenmeli.
- Ürün metinleri planın sesiyle "sen" hitabında (uyarı metinleri ve kod uyarısı böyle); R14-K13 "siz" öneriyordu, sahip karar vermeli.
- iOS 26 ve sonrasında TrueSheet cornerRadius 0 ve özel zeminle sistem sayfasının görünümü cihazda denenmeli.
- Durum zeminlerinin aynı olması bilinçli; tcheck'in 15 uyarısı bu yüzden.
- Panel animasyonlarının ayrıntısı (yan panel, sayfa geçişi) sahiple ayrıca konuşulacak; buradaki değerler başlangıç değeridir.
