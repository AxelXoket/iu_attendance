# Backend kademeleri: çalışma düzeni

Bu klasör sunucunun yapım planıdır. Kod reponun kökünde (apps/, packages/) yazılır; docs/ yalnız okunur, bu klasördeki ilerleme dosyaları dışında değişmez.

## Dosyalar
- index.html: tek bakışta, 41 kademenin listesi, modüller, ortak kurallar.
- kademe-NN[a|b].html: bir kademenin iş dosyası. Özet, önce bitmesi gereken kademeler, bitti ölçütü ve her paketin dosyaları, tabloları (sütunlarıyla), uç noktaları, işleri, dışa açtıkları, kullandıkları (imzalarıyla) ve testleri.
- moduller/<modül>.html: modülün amacı, kuralları, durumları, hata kodları, açık noktaları.
- acik-noktalar.html: onay bekleyen kararlar ve önerileri.
- ilerleme.json: her paketin durumu (bekliyor, yapiliyor, bitti).
- ilerleme-notlari.md: oturum notları, en yeni en üstte.

## Bir oturum
1. ilerleme-notlari.md'nin en üstünü, ilerleme.json'u ve dev reposunun git geçmişini oku.
2. Sıradaki kademeyi seç: önce bitmesi gerekenlerin hepsi bitti olmalı. Aynı aşamanın A ve B kademesi birbirine dokunmaz.
3. Kademenin özetini proje sahibine göster, değişiklik isterse önce onu uygula.
4. Her paketi ayrı bir ajana ver: kademe sayfasındaki paket bölümü ve modül sayfası yeter. Paket kendi testleriyle biter.
5. Testler geçince ilerleme.json'da paketi bitti yap, tarihi ve commit'i yaz, ilerleme-notlari.md'ye not ekle.

## Kaynak
Bu sayfalar docs/hatlar/backend-hatti klasöründeki JSON şartnamelerden betikle üretilir (gen-kademe.js). Elle düzeltilmez; değişiklik şartnamede yapılır, sonra yeniden üretilir.
