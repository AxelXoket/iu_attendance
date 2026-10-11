import json,sys,re
for f in sys.argv[1:]:
  d=json.load(open(f,encoding='utf-8'))
  txt=' '.join(d['paragraflar'])
  w=len(txt.split())
  print(f[-13:], 'words',w,[len(p.split()) for p in d['paragraflar']],'title words',len(d['baslik'].split()))
  for bad in ['\u2013','\u2014','sahip','kullanıcı','Kullanıcı']:
    if bad in txt or bad in d['baslik']: print('  BAD',repr(bad))
  ids=re.findall(r'D\d\d-P\d\d',txt); print('  ids',len(set(ids)))
  print('  other-phase mentions:', re.findall(r'[^.]*(?:aşama|Aşama)[^.]*',txt))
