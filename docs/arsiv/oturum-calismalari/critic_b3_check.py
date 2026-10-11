import re, html, math, sys
from fractions import Fraction
t=open(sys.argv[1],encoding="utf-8").read()
main=re.search(r"<main>(.*)</main>",t,re.S).group(1)
body=re.sub(r"<details.*?</details>"," ",main,flags=re.S)
def txt(h): return html.unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",h))).strip()
bt=txt(body); allt=txt(main)
print("body words",len(bt.split()))
gl=[d for d in re.findall(r"<details.*?</details>",main,re.S) if "Sözlük" in d][0]
glt=txt(gl).lower()
terms=["SDK","Docker Compose","drizzle","expo-sqlite","Fastify","NestJS","Supabase","Sentry","SheetJS","write-excel-file","pdfmake","UBYS","AUZEF","Top Hat","div","regresyon","script","5.1.1(ix)","3.2 dar","push","TypeScript","React Native","Dart","IDFV","risk sırası","PWA","EAS","TestFlight","Unlisted","BİDB","ULAKBİM","SMTP","App Attest","Güvenli Klasör","root","emülatör","senkron","tuzlu","şube","blok ders","kafa sayısı","VERBİS","SUS","veri işleyen","BLE","NFC","monorepo","Expo","MAC","RG ","Genelge"]
for w in terms:
    b=len(re.findall(re.escape(w.lower()),bt.lower())); g=w.lower().split()[0] in glt
    print(f"{w!r}: body={b} glossary={g}")
for w in ["push","yurtdış","Rapor","raporlu","Kafa sayısı","kafa sayısı","2 kez","dönemde 2","otomatik kabul"]:
    print("count",w,len(re.findall(re.escape(w),bt)), "all:",len(re.findall(re.escape(w),allt)))
bad=[T for T in range(1,200) if math.floor(T*(1-80/100))!=T-math.ceil(Fraction(T*80,100))]
print("floor float mismatches p=80:",len(bad),bad[:5]," T=15 ->",math.floor(15*(1-80/100)))
for p in (60,70,75,80,85,90):
    b=[T for T in range(1,200) if math.floor(T*(1-p/100))!=T-math.ceil(Fraction(T*p,100))]
    print(" p",p,len(b))
ok=all(T-(T*p+99)//100==T-math.ceil(Fraction(T*p,100)) for T in range(0,2000) for p in range(0,101))
print("int formula exact:",ok)
from datetime import date,timedelta
print("20 Ara 2026",date(2026,12,20).strftime("%A"),"2 May 2027",date(2027,5,2).strftime("%A"),"2 Eki 2026",date(2026,10,2).strftime("%A"),"15 Ara",date(2026,12,15).strftime("%A"))
print("Jan5+90",date(2027,1,5)+timedelta(90),"Mar22+90",date(2027,3,22)+timedelta(90))
print("8.4M check",50000*6*28, 4.2e9/8.4e6)
# cells > 20 words body
for c in re.findall(r"<td[^>]*>(.*?)</td>",body,re.S):
    n=len(txt(c).split())
    if n>20: print("cell",n,txt(c)[:80])
# section words
for sid,sec in re.findall(r'<section id="(\w+)"[^>]*>(.*?)</section>',re.sub(r"<details.*?</details>"," ",main,flags=re.S),re.S):
    print(sid,len(txt(sec).split()))
