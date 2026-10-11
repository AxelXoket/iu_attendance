import json,sys,re
base='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/'
mod=sys.argv[1]; pat=re.compile(sys.argv[2],re.I); width=int(sys.argv[3]) if len(sys.argv)>3 else 300
s=json.load(open(base+mod+'.json',encoding='utf-8'))
def walk(o,path):
    if isinstance(o,dict):
        for k,v in o.items(): walk(v,path+'.'+str(k))
    elif isinstance(o,list):
        for i,v in enumerate(o): walk(v,path+'[%d]'%i)
    elif isinstance(o,str):
        for m in pat.finditer(o):
            a=max(0,m.start()-width); b=min(len(o),m.end()+width)
            print(path,'::',o[a:b].replace('\n',' ')); print('--')
walk(s,mod)
