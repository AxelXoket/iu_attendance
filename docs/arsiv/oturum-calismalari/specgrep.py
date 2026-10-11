import json,sys,re
base='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/'
mod=sys.argv[1]; pat=re.compile(sys.argv[2],re.I); w=int(sys.argv[3]) if len(sys.argv)>3 else 300
d=json.load(open(base+mod+'.json',encoding='utf-8'))
def walk(o,path):
    if isinstance(o,dict):
        for k,v in o.items(): yield from walk(v,path+'.'+str(k))
    elif isinstance(o,list):
        for i,v in enumerate(o): yield from walk(v,path+'[%d]'%i)
    elif isinstance(o,str):
        for m in pat.finditer(o):
            yield path, o[max(0,m.start()-w):m.end()+w]
n=0
for p,s in walk(d,mod):
    print('--',p,'::',s.replace('\n',' ')); n+=1
    if n>int(sys.argv[4] if len(sys.argv)>4 else 15): break
