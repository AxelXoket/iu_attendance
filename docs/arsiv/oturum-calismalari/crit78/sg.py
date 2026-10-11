import json,sys,re
base='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/'
mods=sys.argv[1].split(',')
pat=re.compile(sys.argv[2],re.I)
width=int(sys.argv[3]) if len(sys.argv)>3 else 400
def walk(o,path):
    if isinstance(o,dict):
        for k,v in o.items(): yield from walk(v,path+'.'+str(k))
    elif isinstance(o,list):
        for i,v in enumerate(o):
            nm=v.get('name') or v.get('id') or v.get('path') or v.get('method') if isinstance(v,dict) else None
            yield from walk(v,path+'['+str(nm if nm else i)+']')
    elif isinstance(o,str):
        yield path,o
for m in mods:
    d=json.load(open(base+m+'.json',encoding='utf-8'))
    for p,s in walk(d,m):
        for mt in pat.finditer(s):
            a=max(0,mt.start()-width//2); b=min(len(s),mt.end()+width//2)
            print('##',p,'::',s[a:b].replace('\n',' '))
            break
