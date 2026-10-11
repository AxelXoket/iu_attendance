import json,sys,re
base='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/'
mod=sys.argv[1]; pat=sys.argv[2]; w=int(sys.argv[3]) if len(sys.argv)>3 else 250
d=json.load(open(base+mod+'.json',encoding='utf-8'))
def walk(o,path):
    if isinstance(o,dict):
        for k,v in o.items(): yield from walk(v,path+'.'+str(k))
    elif isinstance(o,list):
        for i,v in enumerate(o): yield from walk(v,path+'['+str(i)+']')
    else:
        yield path,str(o)
n=0
for p,s in walk(d,mod):
    for m in re.finditer(pat,s,re.I):
        a=max(0,m.start()-w); b=min(len(s),m.end()+w)
        print('##',p,':',s[a:b].replace('\n',' '))
        n+=1
        if n>40: sys.exit()
