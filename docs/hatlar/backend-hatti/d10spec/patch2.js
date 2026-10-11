const fs = require('fs');
let s = fs.readFileSync('build-spec.js', 'utf8');
let bad = 0;
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) { console.log('MATCHES=' + n + ':', a.slice(0, 90)); bad++; return; } s = s.replace(a, b); };

// (d) hours always from D08; column state only changes the code
rep("['YAPILMADI', 'açık nokta D10-A01', 'Oturum için \"yapılmadı\" cevabı verilmiş; sütunun bütün hücreleri, toplama girmez'],",
    "['YAPILMADI', 'açık nokta D10-A01', 'Oturum için \"yapılmadı\" cevabı verilmiş; sütunun bütün hücreleri. Saatler her zaman D08 satırından (yapılmayan oturumda 0), toplam eşitliği bozulmaz'],");
rep("['CEVAP_BEKLIYOR', 'açık nokta D10-A01', '\"Ders yapıldı mı?\" cevapsız; sütunun bütün hücreleri, toplama girmez'],",
    "['CEVAP_BEKLIYOR', 'açık nokta D10-A01', '\"Ders yapıldı mı?\" cevapsız; sütunun bütün hücreleri. Saatler D08 satırından: cevapsız oturumu D08 nasıl sayıyorsa (D08-B02) toplam onunla tutar'],");
rep("['KAPSAM_DISI', 'açık nokta D10-A01', 'Öğrenci o oturumda listede değil (eklenmeden önce ekle-bırakta ya da listeden çıktıktan sonra); D08 satırı yok'],",
    "['KAPSAM_DISI', 'açık nokta D10-A01', 'D08 satırı yok: öğrenci o oturumda listede değil (eklenmeden önce ekle-bırakta ya da listeden çıktıktan sonra). Yeni eklenen öğrencide D08 hesabı bitene kadar birkaç saniye de böyle görünür; saatler 0'],");
rep("asserts: 'yapılmadı denen oturum YAPILMADI, cevapsız oturum CEVAP_BEKLIYOR, eklenmeden önceki oturum KAPSAM_DISI, Beklemede ya da İncelemede kayıt KARAR_ACIK, muaf öğrenci MUAF, 3 saatlik blokta 2 saat Görevli GOREVLI ile mazeretliSaat 2 ve yokSaat 1; olumlu kontrol: sayılan kayıt VAR. YAPILMADI ve CEVAP_BEKLIYOR sütunları toplamlara girmez.' },",
    "asserts: 'yapılmadı denen oturum YAPILMADI, cevapsız oturum CEVAP_BEKLIYOR, eklenmeden önceki oturum KAPSAM_DISI, Beklemede ya da İncelemede kayıt KARAR_ACIK, muaf öğrenci MUAF, 3 saatlik blokta 2 saat Görevli GOREVLI ile mazeretliSaat 2 ve yokSaat 1; olumlu kontrol: sayılan kayıt VAR. Her hücrenin saatleri D08 satırıyla aynı, kod değişse de saat değişmez (yapılmadı oturumda 0).' },");

// (c) list row without D08 data
rep("'(tip) AksisSatiri': '{ listeSatiriId, ogrenciNo, adSoyad, sira, kaynak: DOSYA | ELLE, muaf, teori: TurOzeti | null, uygulama: TurOzeti | null, sonuc: DEVAMLI | DEVAMSIZ | DEVAMLI_MUAF, kararBekliyor: { neden: ACIK_ISARET | BAGLANTI_YOK } | null }',",
    "'(tip) AksisSatiri': '{ listeSatiriId, ogrenciNo, adSoyad, sira, kaynak: DOSYA | ELLE, muaf, teori: TurOzeti | null, uygulama: TurOzeti | null, sonuc: DEVAMLI | DEVAMSIZ | DEVAMLI_MUAF | null, kararBekliyor: { neden: ACIK_ISARET | BAGLANTI_YOK } | null } (D08 bu liste satırını henüz hesaplamadıysa tür değerleri ve sonuc null, hesapGuncel false; böyle özetten anlık alınmaz)',");

// (b) AKSIS summary and output always on the primary; (e) dönem sonu set-based
rep("bileşim kökü rapor okumaları için ayrı havuz verebilir, okuma kopyasına geçiş yalnız bu havuzun adresidir (çıktı ucu ve iş her zaman ana veritabanında).",
    "bileşim kökü ders raporu, öğrenci raporu ve dönem sonu raporu için ayrı havuz verebilir, okuma kopyasına geçiş yalnız bu havuzun adresidir; AKSİS özeti, çıktı ucu ve gece işi her zaman ana veritabanında kalır (özet özeti karşılaştırması gecikmeli kopyayla 409 döngüsüne girmesin).");
rep("idempotency: 'Yan etkisiz GET; tabanlar değişmediğinden aynı veriyle aynı sayılar.',",
    "idempotency: 'Yan etkisiz GET; tabanlar değişmediğinden aynı veriyle aynı sayılar. Şube başına dış yüz çağrısı yapılmaz: tek küme sorgusu her şubenin tabanını (DISTINCT ON), şimdiki Sonuç\'u (D08 devam_sonuclari, okuma istisnası), tabandan sonraki düzeltmeleri ve kayıtları toplar; yalnız Sonuç\'u dönen öğrenciler degisimSinifi ile sınıflanır.',");
rep("uses: 'liste_satirlari (D03): sıra, numara, ad, kaynak, muaf, eklenme ve pasif anı; oturumlar, oturum_subeleri, dersler, subeler (D02): iş adayları ve aralık matrisi; oturum_son_durumlari (D08): hücreler;",
    "uses: 'liste_satirlari (D03): sıra, numara, ad, kaynak, muaf, eklenme ve pasif anı; oturumlar, oturum_subeleri, dersler, subeler (D02): iş adayları ve aralık matrisi; oturum_son_durumlari (D08): hücreler; devam_sonuclari (D08): dönem sonu raporunda şimdiki Sonuç, tek küme sorgusuyla;");
rep("{ name: 'Gün sonu işi büyük birimde', kind: 'load', asserts: '1000 şubelik birimde iş 10 dakikayı geçmez, her şube kendi işleminde; işlem başına kilit tutma süresi ölçülür.' },",
    "{ name: 'Gün sonu işi ve dönem sonu raporu büyük birimde', kind: 'load', asserts: '1000 şubelik birimde gece işi 10 dakikayı geçmez, her şube kendi işleminde, işlem başına kilit tutma süresi ölçülür; aynı birimin dönem sonu raporu tek küme sorgusuyla p95 en çok 5 sn.' },");

// (a) retry enqueue survives the stale-pending failure
rep("Kilit anından 6 saat sonra hâlâ bekleyen şube varsa iş hata koduyla biter;",
    "Yeniden kuyruğa koyma ayrı işlemde ve hata atılmadan önce yapılır. Kilit anından 6 saat sonra hâlâ bekleyen şube varsa iş hata koduyla biter;");

fs.writeFileSync('build-spec.js', s);
let f = fs.readFileSync('build-frag.js', 'utf8');
const repf = (a, b) => { const n = f.split(a).length - 1; if (n !== 1) { console.log('FRAG MATCHES=' + n + ':', a.slice(0, 90)); bad++; return; } f = f.replace(a, b); };
repf("Satırlar saklama süresi dolunca D12\'nin saklama işinde, D10\'un kaydettiği işleyiciyle silinir; süre yoklama kayıtlarınınkiyle aynı veri sınıfındadır (plan.html#kararlar-hesap-silme).",
     "Satırlar saklama süresi dolunca D12\'nin saklama işinde, D10\'un kaydettiği işleyiciyle silinir. Veri sınıfı aksis_ozet_anliklari kendi adıyla kaydolur, varsayılan süresi yoklama kayıtlarınınkiyle aynıdır (plan.html#acik-saklama-suresi); hesap silinince anlık kalır, itirazda kanıttır (plan.html#kararlar-hesap-silme).");
repf("Her olmayan şeyi doğrulayan testin bir olumlu kontrolü vardır;", "Bir şeyin olmadığını doğrulayan her testin olumlu kontrolü vardır;");
fs.writeFileSync('build-frag.js', f);
console.log(bad ? 'FAILED ' + bad : 'all patches applied');
process.exitCode = bad ? 1 : 0;
