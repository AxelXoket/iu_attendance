import json,sys
sys.stdout.reconfigure(encoding='utf-8')
base=sys.argv[1]; mod=sys.argv[2]; pats=sys.argv[3:]
d=json.load(open(base+'/spec/'+mod+'.json',encoding='utf-8'))
for e in d['endpoints']:
    s=e['method']+' '+e['path']
    if any(p in s for p in pats):
        e2={k:e[k] for k in ('method','path','client','auth','request','response','errors') if k in e}
        print(json.dumps(e2,ensure_ascii=False)[:2500]); print()
for j in d['jobs']:
    if any(p in j['name'] for p in pats):
        print('JOB',json.dumps(j,ensure_ascii=False)[:2500]); print()
