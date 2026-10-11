import json,sys,re
base=r'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/'
mode=sys.argv[1]
if mode=='job':
    mod,name=sys.argv[2],sys.argv[3]
    d=json.load(open(base+f'spec/{mod}.json',encoding='utf-8'))
    for j in d['jobs']:
        s=json.dumps(j,ensure_ascii=False)
        if name in s[:300]:
            print(json.dumps(j,ensure_ascii=False,indent=0))
elif mode=='grep':
    mod,pat=sys.argv[2],sys.argv[3]
    d=json.load(open(base+f'spec/{mod}.json',encoding='utf-8'))
    w=int(sys.argv[4]) if len(sys.argv)>4 else 300
    def walk(o,path):
        if isinstance(o,dict):
            for k,v in o.items(): walk(v,path+'.'+str(k))
        elif isinstance(o,list):
            for i,v in enumerate(o): walk(v,path+f'[{i}]')
        elif isinstance(o,str):
            for m in re.finditer(pat,o):
                a=max(0,m.start()-w); b=min(len(o),m.end()+w)
                print(path,':',o[a:b].replace('\n',' '))
                print('--')
    walk(d,mod)
elif mode=='key':
    mod,key=sys.argv[2],sys.argv[3]
    d=json.load(open(base+f'spec/{mod}.json',encoding='utf-8'))
    print(json.dumps(d[key],ensure_ascii=False,indent=0)[:int(sys.argv[4]) if len(sys.argv)>4 else 20000])
elif mode=='pkg':
    for i in sys.argv[2:]:
        d=json.load(open(base+f'packages/{i[:3]}.json',encoding='utf-8'))
        for p in d['packages']:
            if p['id']==i:
                q={k:p[k] for k in p if k not in ('needs','depends_on')}
                print(json.dumps(q,ensure_ascii=False,indent=0)); print('=====')
