const denetimOlaylari = [
  `Olay türleri dogrulama.<olay> adıyla packages/contracts/src/dogrulama.ts'deki DOGRULAMA_DENETIM_OLAYLARI listesindedir (tür ve strict ayrıntı şeması) ve açılışta D09.denetimOlaylariniKaydet('dogrulama', DOGRULAMA_DENETIM_OLAYLARI) ile kaydolur; D09.denetimeYaz yalnız kayıtlı türü yazar. dersId taşıyan her olay birimId de taşır (ortak kural); şema testi bunu her tür için denetler.`,
  `dogrulama.kafa_sayisi_girildi: oturum, ders ve birim, önceki ve yeni kafa sayısı, D02 sonucu (yazildi ya da celiski), giren hoca.`,
  `dogrulama.sinifta_degil_isaretlendi ve dogrulama.sinifta_degil_geri_alindi: oturum, ders ve birim, öğrencinin iç kimliği, etkilenen kayıtlar, hoca.`,
  `dogrulama.onaysiz_kilitlendi ve dogrulama.kararsiz_kilitlendi: birim, dönem, kilit anı, oturum ve ders, parca, parcaSayisi ve en çok 150 kayıt kimliği; büyük oturum birden çok olaya bölünür, her ayrıntı 8 KB'nin altında kalır.`,
  `dogrulama.cihaz_iptal_listesinde ve dogrulama.cihaz_iptal_kalkti: cihaz ve kanıt kimliği, durum (ders taşımaz).`,
  `dogrulama.ios_beklenmeyen_alan: cihaz kimliği ve aykırılık kodu (değerin metni değil); yalnız değer cihaz satırındakinden farklı olduğunda bir kez (ders taşımaz).`,
  `Denetim olayı değil, log satırı (D15.log): dogrulama.kanit_reddedildi (platform, amaç, kanıt gerekçesi; işlem geri alındığı için denetim tablosuna yazılamaz), dogrulama.var_korundu (kayıt kimliği, gerekçe kodu) ve dogrulama.isaret_ertelendi (oturum kimliği).`,
  `Hocanın onay, ret ve karar değiştirme olaylarını (Kendi beyanı, İncelemede, işaretli oturum, KARAR_DEGISTIR) D09 yazar; D07 kendi uçlarının, öğesinin ve işlerinin olaylarını yazar.`,
];
