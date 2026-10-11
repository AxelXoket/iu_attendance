import json,re
base='../r17/backend/ozet/'
A=json.load(open(base+'asamalar.json',encoding='utf-8'))
for n in (5,6):
    d=json.load(open(base+'asama-%02d.json'%n,encoding='utf-8'))
    txt=' '.join(d['paragraflar'])
    words=len(txt.split())
    pk=[p['id'] for a in A if a['asama']==n for p in a['paketler']]
    inpar=set(re.findall(r'D\d\d-P\d\d',' '.join(re.findall(r'\(([^)]*)\)',txt))))
    allids=re.findall(r'D\d\d-P\d\d',txt)
    print('ASAMA',n,'words',words,'p1',len(d['paragraflar'][0].split()),'p2',len(d['paragraflar'][1].split()),'baslik words',len(d['baslik'].split()))
    print(' missing in parens',[p for p in pk if p not in inpar])
    print(' foreign ids',sorted(set(allids)-set(pk)))
    print(' bare ids (outside parens):',[m for m in re.findall(r'D\d\d-P\d\d[^\s,.;)]*',re.sub(r'\([^)]*\)','',txt))])
    for ch in ('–','—'):
        print(' dash',repr(ch),ch in txt)
    print(' sahip',bool(re.search('sahip',txt,re.I)),'kullanıcı',bool(re.search('kullanıcı',txt,re.I)))
    print(' asama mentions',re.findall(r'[^.]*aşama[^.]*',txt,re.I))
