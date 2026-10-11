import sys
b=open("_b5_body.txt",encoding="utf-8").read()
cands=[
("7 Guz donemi line","Güz dönemi: 14 Eylül-18 Aralık 2026. Ekle-bırak 14-18 Eylül."),
("7 Maliyet block (replace w/ 1 line of 16)","Maliyet: Karar verdirecek büyüklükte değil.\nApple: yılda 99 USD.\nGoogle: bir kez 25 USD.\nExpo: pilotta ücretsiz, kampüs genelinde ayda ~19 USD gerekebilir.\nSunucu: İÜ.\nVeri hacmi Ek D'de."),
("5 KVKK Kurulu kararlari","KVKK Kurulu'nun 2021/1214 ve 2024/197 sayılı kararları bu yönde."),
("8 Kayit kaybi + Benimseme","Kayıt kaybı: Makbuzla kanıtlanıp kaybolan kayıt 0.\nBenimseme: 3. haftada öğrencilerin en az %90'ı kayıtlı olmalı."),
("3 cikis yapinca clause","çıkış yapınca anahtar silinir, yeniden giriş cihaz değişimi sayılır."),
("3 gorme engelli detail","Görme engelli öğrenci için hoca kodu sesli okur ya da öğrenciyi elle ekler. Bu işlemler denetim kaydına geçer."),
("3 otomatik kabul ordering detail","Sıra, QR'daki zaman aralığına göredir. Dışa aktarılmış bir kayıt sonradan yerinden edilmez."),
("4 formula rationale","Ondalıklı hesap yanlış sonuç veriyor (Ek C), bu yüzden bu hesap için regresyon testi zorunlu."),
("7 unit calendars detail","Hukuk, İstanbul Tıp, Diş Hekimliği, AUZEF, Eczacılık ve Konservatuvar'ın ayrı takvimi var."),
("7 Apple/Play rule sentence","Apple ve Play, hassas veri işleyen ya da kamu adına yapılan uygulamaları kurum hesabından istiyor (Ek E)."),
("2 Kagittan farki sentence","Kâğıttan farkı: liste sınıfta dolaşmaz, dönem sonunda sayım otomatik yapılır. Kafa sayısı ve cihaz onayı ise yeni iş, pilotta ölçülecek."),
]
tot=0
for n,s in cands:
    ok=s in b; w=len(s.split()); tot+=w
    print(f"{w:3d} {'OK ' if ok else 'MISSING'} {n}")
print("total",tot)
