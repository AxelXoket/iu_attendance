import json,sys
sys.stdout.reconfigure(encoding='utf-8')
pid=sys.argv[1]; fields=sys.argv[2].split(',') if len(sys.argv)>2 else None
m=pid[:3]
P=json.load(open('packages/%s.json'%m,encoding='utf-8'))
S=json.load(open('spec/%s.json'%m,encoding='utf-8'))
pk=[p for p in P['packages'] if p['id']==pid][0]
for e in pk['endpoints']:
  meth,path=e.split(' ',1)
  for se in S['endpoints']:
    if se['method']==meth and se['path']==path:
      d=se if not fields else {k:se.get(k) for k in fields}
      print('EP',json.dumps(d,ensure_ascii=False)); print()
for j in pk['jobs']:
  for sj in S['jobs']:
    if sj['name']==j: print('JOB',json.dumps(sj,ensure_ascii=False)); print()
for x in pk['exports']:
  for sx in S['exports']:
    if sx['name']==x: print('EXP',json.dumps(sx,ensure_ascii=False)[:3000]); print()
