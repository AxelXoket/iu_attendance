import json,sys,glob
# usage: ep.py MODULE "METHOD path" ...
m=sys.argv[1]
d=json.load(open(f'spec/{m}.json',encoding='utf-8'))
for q in sys.argv[2:]:
    found=False
    for e in d['endpoints']:
        if f"{e['method']} {e['path']}"==q:
            print('#####',q); print(json.dumps(e,ensure_ascii=False,indent=0)); found=True
    for j in d['jobs']:
        if j['name']==q:
            print('#####JOB',q); print(json.dumps(j,ensure_ascii=False,indent=0)); found=True
    if not found: print('NOTFOUND',q)
