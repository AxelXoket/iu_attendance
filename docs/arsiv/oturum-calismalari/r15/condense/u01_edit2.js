// Critic round 1 fixes: exact unique replacements, abort on any miss.
const fs=require('fs');const f=process.argv[2];let s=fs.readFileSync(f,'utf8');
const R=[
 // readability: Kim kullanir as plain elliptical Turkish
 ['Tek telefon uygulaması (öğrenci, hoca modu): öğrenci, hoca; tarayıcıda web paneli: hoca, yönetici.','Öğrenci ve hoca aynı telefon uygulamasını (öğrenci, hoca modu), hoca ve yönetici ayrıca tarayıcıda web panelini.'],
 // 5 + 11
 ['İnternetsiz üniversite ürünleri sınıfa donanım koyuyor; öğrenci telefonuyla','İnternetsiz çalışan üniversite ürünleri sınıfa donanım koyuyor; öğrencinin kendi telefonuyla'],
 // 9
 ['<p>QR yalnız makbuzda. Yoklama','<p>Yoklama QR\'ı yok (yalnız makbuz QR\'ı). Yoklama'],
 // 10
 ['ekrandaki koddan birkaç saniyede yapıldığını','ekrandaki koddan birkaç saniye içinde yapıldığını'],
 // 6
 ['emeklilerde de var), öncesinde giriş yok.','emeklilerde de var). Onaydan önce giriş yok.'],
 // 1 (real loss)
 ['sunucuda tek kural: İ ve I, i olur.','sunucu adresi tek kuralla düzeltir (İ ve I, i olur).'],
 // 2
 ['çıkış düğmesi her sayfada (ortak kürsü','çıkış düğmesi her sayfada (panel ortak kürsü'],
 // 4
 ['SPF, DKIM, DMARC hizalı; önce birkaç','SPF, DKIM, DMARC hizalı kurulur, önce birkaç'],
 // B2 + 13
 ['Intl farklı davrandığı için Türkçe','Intl farklı davrandığından Türkçe'],
 ['büyük küçük harf Türkçe kuralla eşitlenir.','büyük küçük harf Türkçe kuralla yok sayılır.'],
 // 3
 ['Öğrencinin herhangi bir hocası bir kez','Öğrencinin herhangi bir dersinin hocası bir kez'],
 // 7 + 17
 ['gizli anahtar güvenli donanımda üretilir','gizli anahtar telefonun güvenli donanımında üretilir'],
 ['paket adı, imza sertifikası kanıttan okunur','paket adı ve imza sertifikası kanıttan okunur'],
 // 14
 ['onlar gidince yapılır (ekranda yazar).','onlar gidince yapılır; ekranda bu yazar.'],
];
for(const [a,b] of R){const n=s.split(a).length-1;if(n!==1){console.error('NOT UNIQUE/MISSING ('+n+'): '+a);process.exit(1)}s=s.replace(a,b)}
fs.writeFileSync(f,s);console.log('applied',R.length);
