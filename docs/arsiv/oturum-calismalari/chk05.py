import json,sys,re,difflib
a=json.load(open(sys.argv[1],encoding='utf-8'));b=json.load(open(sys.argv[2],encoding='utf-8'))
ta=' '.join(a['paragraflar']);tb=' '.join(b['paragraflar'])
print('paras',len(a['paragraflar']),'words new',len(ta.split()),'old',len(tb.split()))
sa=re.split(r'(?<=[.;:])\s+',ta);sb=re.split(r'(?<=[.;:])\s+',tb)
for l in difflib.unified_diff(sb,sa,lineterm='',n=0):print(l)
for ch in ['–','—']:print(repr(ch),ch in ta)
print('sahip',re.search('sahip',ta,re.I),'kullanıcı',re.search('kullan[ıi]c[ıi]',ta,re.I))
ids=sorted(set(re.findall(r'D\d\d-P\d\d',ta)));print(ids)
