import sys,re
t=open(sys.argv[1],encoding='utf-8',errors='ignore').read()
parts=t.split(chr(34))
kw=re.compile('yoklama|devams|yok yaz|internet|QR|kar[eı]kod',re.I)
seen=set();n=0
for c in parts:
  if 40<len(c)<800 and kw.search(c) and c.count(' ')>6 and 'http' not in c and '{' not in c and c not in seen:
    seen.add(c);print('-',c[:400]);n+=1
    if n>30:break
print('count',n)
