import json,sys
ids=sys.argv[1:]
for pid in ids:
    m=pid.split('-')[0]
    d=json.load(open(f'packages/{m}.json',encoding='utf-8'))
    for p in d['packages']:
        if p['id']==pid:
            print('=====',pid,p['title'])
            for k in ('notes','tables','endpoints','jobs','exports','tests'):
                print(' ',k,':',json.dumps(p.get(k),ensure_ascii=False))
