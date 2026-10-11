import re, html, sys
from datetime import date, timedelta
t=open(sys.argv[1],encoding="utf-8").read()
print("bytes",len(t.encode()))
print("U+2014",t.count("—"),"U+2013",t.count("–"))
main=re.search(r"<main>(.*)</main>",t,re.S).group(1)
body=re.sub(r"<details.*?</details>"," ",main,flags=re.S)
def txt(h): return html.unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",h))).strip()
bt=txt(body)
print("body words",len(bt.split()), "appendix words", len(txt(main).split())-len(bt.split()))
secs={}
for sid,sec in re.findall(r'<section id="([\w-]+)"[^>]*>(.*?)</section>',body,re.S):
    secs[sid]=len(txt(sec).split()); print(" sec",sid,secs[sid])
m=re.search(r"Tek bakışta(.*?)1 Kararlar",bt); tb=len(m.group(1).split()) if m else 0
print("tek bakista words",tb)
print("short read (tek bakista + kararlar + kapsam + sorular)", tb+secs.get('kararlar',0)+secs.get('kapsam',0)+secs.get('sorular',0))
for c in re.findall(r"<td[^>]*>(.*?)</td>",body,re.S):
    n=len(txt(c).split())
    if n>20: print(" cell",n,txt(c)[:70])
ids=set(re.findall(r'id="([^"]+)"',t))
for h in set(re.findall(r'href="#([^"]+)"',t)):
    if h not in ids: print(" broken anchor",h)
ban="delve crucial robust comprehensive nuanced multifaceted furthermore moreover pivotal landscape tapestry underscore foster showcase intricate vibrant fundamental significant interplay".split()
low=txt(main).lower()
print("banned",[b for b in ban if re.search(r"\b"+b,low)])
print("1 Dec - 29 Sep days",(date(2026,12,1)-date(2026,9,29)).days)
for d in [date(2027,1,20),date(2027,4,10)]: print(d,"+90",d+timedelta(90))
for d in [date(2026,12,20),date(2027,5,2),date(2026,12,19),date(2026,12,21),date(2027,1,25),date(2027,4,30)]: print(d,d.strftime("%A"))
print("2 Ekim + 6 wk",date(2026,10,2)+timedelta(42))
