import json,sys,glob,os
sys.stdout.reconfigure(encoding='utf-8')
base=r'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend'
ph=json.load(open(base+'/ozet/asamalar.json',encoding='utf-8'))
where={p['id']:a['asama'] for a in ph for p in a['paketler']}
pk={}
for f in sorted(glob.glob(base+'/packages/D??.json')):
  for q in json.load(open(f,encoding='utf-8'))['packages']: pk[q['id']]=q
args=sys.argv[1:]
mode=args[0]
if mode=='id':
  for i in args[1:]:
    q=pk[i]; print('=====',i,'phase',where.get(i),q['title']); 
    for k in ['tables','endpoints','jobs','exports','tests']: print(' ',k,q.get(k))
    print('  notes:',q['notes'])
else:
  kw=args[1]
  for i,q in pk.items():
    s=json.dumps(q,ensure_ascii=False)
    if kw in s:
      print(i,'phase',where.get(i),'|',q['title'])
