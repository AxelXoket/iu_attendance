import re, html, sys
from datetime import date, timedelta
t=open(sys.argv[1],encoding="utf-8").read()
print("bytes",len(t.encode()))
print("U+2014",t.count("\u2014"),"U+2013",t.count("\u2013"))
main=re.search(r"<main>(.*)</main>",t,re.S).group(1)
body=re.sub(r"<details.*?</details>"," ",main,flags=re.S)
def txt(h): return html.unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",h))).strip()
bt=txt(body)
print("body words",len(bt.split()), "appendix words", len(txt(main).split())-len(bt.split()))
for sid,sec in re.findall(r'<section id="([\w-]+)"[^>]*>(.*?)</section>',body,re.S):
    print(" sec",sid,len(txt(sec).split()))
for c in re.findall(r"<td[^>]*>(.*?)</td>",body,re.S):
    n=len(txt(c).split())
    if n>20: print(" cell",n,txt(c)[:70])
ids=set(re.findall(r'id="([^"]+)"',t))
for h in set(re.findall(r'href="#([^"]+)"',t)):
    if h not in ids: print(" broken anchor",h)
print("anchors",sorted(set(re.findall(r'href="#([^"]+)"',t))))
ban="delve crucial robust comprehensive nuanced multifaceted furthermore moreover pivotal landscape tapestry underscore foster showcase intricate vibrant fundamental significant interplay".split()
low=txt(main).lower()
print("banned",[b for b in ban if re.search(r"\b"+b,low)])
# tek bakista words
m=re.search(r"Tek bakışta(.*?)1 Kararlar",bt); print("tek bakista words",len(m.group(1).split()) if m else None)
for d in [date(2026,12,21),date(2027,1,20),date(2027,4,10)]: print(d,"+90",d+timedelta(90))
print("Apr10 weekday",date(2027,4,10).strftime("%A"),"Jan20",date(2027,1,20).strftime("%A"))
