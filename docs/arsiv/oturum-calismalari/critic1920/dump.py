import json,sys,os
B=sys.argv[1]; O=sys.argv[2]
a=json.load(open(B+'/ozet/asamalar.json',encoding='utf-8'))
pk={}; sp={}
for m in range(1,16):
    d=json.load(open(B+'/packages/D%02d.json'%m,encoding='utf-8'))
    for p in d['packages']: pk[p['id']]=p
    sp['D%02d'%m]=json.load(open(B+'/spec/D%02d.json'%m,encoding='utf-8'))
out=open(O,'w',encoding='utf-8')
for ph in (19,20):
    out.write('######## PHASE %d\n'%ph)
    for e in a[ph-1]['paketler']:
        p=pk[e['id']]; s=sp[p['id'][:3]]
        out.write('\n=== %s %s\n'%(p['id'],p['title']))
        for t in p['tests']:
            hits=[x for x in s.get('tests',[]) if x.get('name')==t]
            for h in hits: out.write('  TEST %s: %s\n'%(t,h.get('asserts')))
            if not hits: out.write('  TEST %s: (no spec match)\n'%t)
        for j in p['jobs']:
            hits=[x for x in s.get('jobs',[]) if x.get('name')==j]
            for h in hits: out.write('  JOB %s\n'%json.dumps(h,ensure_ascii=False))
            if not hits: out.write('  JOB %s: (no spec match)\n'%j)
        for x in p['exports']:
            hits=[y for y in s.get('exports',[]) if y.get('name')==x]
            for h in hits: out.write('  EXPORT %s\n'%json.dumps(h,ensure_ascii=False))
            if not hits: out.write('  EXPORT %s: (no spec match)\n'%x)
