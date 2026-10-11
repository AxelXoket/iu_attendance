import json,sys
base=sys.argv[1]
ids=sys.argv[2].split(',')
for pid in ids:
    m=pid.split('-')[0]
    d=json.load(open(f'{base}/packages/{m}.json',encoding='utf-8'))
    for p in d['packages']:
        if p['id']==pid:
            print('=====',pid,p['title'])
            for k in ['tables','endpoints','jobs','exports','tests','notes']:
                print(' ',k,':',json.dumps(p.get(k),ensure_ascii=False))
