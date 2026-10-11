import json,sys
a=json.load(open('ozet/asamalar.json',encoding='utf-8'))
ph=int(sys.argv[1])
ids=[p['id'] for x in a if x['asama']==ph for p in x['paketler']]
for pid in ids:
    m=pid.split('-')[0]
    d=json.load(open(f'packages/{m}.json',encoding='utf-8'))
    for p in d['packages']:
        if p['id']==pid:
            q=dict(p); q.pop('files',None); q.pop('needs',None); q.pop('depends_on',None)
            print(json.dumps(q,ensure_ascii=False))
            print()
