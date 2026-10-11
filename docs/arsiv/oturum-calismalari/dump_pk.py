import json,sys
ids=sys.argv[1].split(',')
for pid in ids:
    m=pid.split('-')[0]
    d=json.load(open(f'packages/{m}.json',encoding='utf-8'))
    for p in d['packages']:
        if p['id']==pid:
            print('=====',pid, p['title'])
            for k in ['tables','endpoints','jobs','exports','needs','tests','depends_on','notes']:
                print(' ',k,':',json.dumps(p.get(k),ensure_ascii=False))
