// Applies critic round-1 fixes as exact unique replacements: node fix1.js file
const fs=require('fs');const f=process.argv[2];let s=fs.readFileSync(f,'utf8');
const R=[
[`Telefon koduna başlarken en güncel kararlı Expo SDK'sı: bugün 57`,`Telefon koduna başlarken en güncel kararlı Expo SDK'sı alınır: bugün 57`],
[`iOS 27 derlemesinin istediği yeni açılış düzeni 58'de kendiliğinden açık, 57'de ben açarım.`,`58, iOS 27 ile derlemede gereken yeni açılış düzenini kendiliğinden açıyor; 57'de kalırsam ayrıca açarım.`],
[`ile kurulur, yapılandırma eklentisiz.`,`ile kurulur, yapılandırma eklentisi gerekmez.`],
[`iPhone kodu en küçük, önce`,`iPhone kodu en küçük tutulur, önce`],
[`Telefon ve panel ayrı uygulama: telefonda Expo'nun istediği React sürümü, depoda tek sürüm zorlanmaz.`,`Telefon ve panel ayrı uygulama olduğundan telefonun React sürümü Expo'nun istediğinde kalır, depoda tek React sürümü zorlanmaz.`],
[`(tablo, sütun silinmez, adı değişmez)`,`(tablo ve sütun eklenir, silinmez, adı değişmez)`],
[`Gönderme kuyruğu kaydı: kimlik, sıra numarası, imzalı metin, durum, sonraki deneme zamanı.`,`Gönderme kuyruğunda her kaydın: kimliği, sıra numarası, imzalı metni, durumu, sonraki deneme zamanı.`],
[`Her açılışta yerel veritabanı ile telefondaki anahtar karşılaştırılır:`,`Her açılışta yerel veritabanıyla telefondaki anahtarın tuttuğu denetlenir:`],
[`Veri çoğunlukla yalnız ekleniyor`,`Veri büyük ölçüde yalnız ekleniyor`],
[`sunucu verisini indirme adımı veritabanına yazar;`,`sunucu verisi indirme adımıyla veritabanına yazılır;`],
[`paketin Play Integrity'si kullanılmaz.`,`paketin Android tarafındaki Play Integrity kullanılmaz.`],
[`Kayıtta Secure Enclave'de ikinci donanım anahtarı da üretilir (CryptoKit, yeni paket yok): App Attest başarısız kalırsa kayıtları o imzalar ("Cihaz doğrulanmadı" etiketiyle); gönderim paketini o imzalar (bkz. ikinci çapa); bozulan App Attest anahtarının yenisini o imzasıyla aynı hesaba bağlar (bkz. Kenar durumlar).`,`Kayıtta App Attest anahtarının yanında Secure Enclave'de ikinci donanım anahtarı üretilir (CryptoKit, yeni paket yok): App Attest başarısız kalırsa kayıtlar bununla imzalanıp "Cihaz doğrulanmadı" etiketi alır; gönderim paketini bu anahtar imzalar (bkz. ikinci çapa); bozulan App Attest anahtarının yenisi bunun imzasıyla aynı hesaba bağlanır (bkz. Kenar durumlar).`],
[`yeniden başlatmayı anlamak için uygulamaya eklenen App Group'a bağlı sistem semaforu (adı en çok 31 karakter; "zaten var" dışındaki her hata yeniden başlatma sayılır).`,`yeniden başlatmayı anlamak için uygulama grubuna bağlı sistem semaforu (adı en çok 31 karakter; "zaten var" dışındaki her hata yeniden başlatma sayılır), bunun için uygulamaya App Group eklenir.`],
[`(çalışması garanti değil; asıl gönderme uygulama açılınca, bkz. Gönderme)`,`(çalışması garanti değil; gönderme asıl olarak uygulama açılınca, bkz. Gönderme)`],
[`react-native-ble-manager ve munim-bluetooth (11 ayda 52 sürüm, tek geliştirici) kullanılmaz;`,`react-native-ble-manager ve munim-bluetooth kullanılmaz (munim-bluetooth 11 ayda 52 sürüm, tek geliştirici);`],
[`(Vite eklentisi, rota üretimi yok)`,`(Vite eklentisi ve rota üretimi yok)`],
[`Derleme hedefi Chrome ve Edge 111, Firefox 114, Safari 16.4 ve üstü (Vite 8'in varsayılanı), en eski hedef tarayıcıda denenir;`,`Panel Chrome ve Edge 111, Firefox 114, Safari 16.4 ve üstü için derlenir (Vite 8'in varsayılanı), en eski hedef tarayıcıda denenir;`],
[`eski Windows varsa hedef ona çekilir.`,`eski Windows varsa derleme hedefi ona çekilir.`],
[`(<code>cellStyles: true</code> ile),`,`(<code>cellStyles: true</code> ile yazılır),`],
[`pnpm özetini kilit dosyasına yazar`,`pnpm dosyanın özetini kilit dosyasına yazar`],
[`istemcinin adres başlıklarını yok sayıp kendisi yazar.`,`istemcinin gönderdiği adres başlıklarını yok sayıp kendisi yazar.`],
[`Caddy istemci adresinde yalnız ağ geçidinin başlığına güvenir.`,`Caddy istemci adresi olarak yalnız ağ geçidinin yazdığı başlığa güvenir.`],
[`benim kuralım olur, göndermeden önce pre-push kancası Biome, tip denetimi ve Vitest'i koşar.`,`benim kuralım olur ve göndermeden önce Biome, tip denetimi ve Vitest'i bir pre-push kancası koşar.`],
[`Tek PostgreSQL rahat taşır;`,`Tek PostgreSQL bunu rahat taşır;`],
[`Sunucu içinde durum tutmadığından`,`Sunucu kendi içinde durum tutmadığından`],
[`Tek kaynak: şemalar ve rota tablosu <code>packages/contracts</code>, kurallar <code>packages/core</code> içinde (saf, testli, çatı değişse de kalır).`,`Tek kaynak: şemalar ve rota tablosu <code>packages/contracts</code> içinde, kurallar <code>packages/core</code> içinde; kurallar saf, testli, çatı değişse de kalır.`],
[`Güvenlik duyuruları: Dependabot uyarıları, gece <code>pnpm audit</code>; Fastify ve imza doğrulama paketleri öncelikli.`,`Güvenlik duyuruları Dependabot uyarıları ve gece <code>pnpm audit</code> ile izlenir; Fastify ve imza doğrulamada kullanılan paketler öncelikli.`],
];
let bad=0;for(const [a,b] of R){const n=s.split(a).length-1;if(n!==1){console.log('NOT UNIQUE/FOUND',n,'|',a.slice(0,60));bad++}}
if(bad){process.exit(1)}
for(const [a,b] of R)s=s.replace(a,()=>b);
fs.writeFileSync(f,s);console.log('applied',R.length);
