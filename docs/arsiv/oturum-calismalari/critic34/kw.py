import json,sys,io,re
out=io.open(sys.argv[2],'a',encoding='utf-8')
pat=re.compile(sys.argv[3])
mods=sys.argv[1].split(',')
for m in mods:
    s=json.load(open('spec/%s.json'%m,encoding='utf-8'))
    def walk(x,path):
        if isinstance(x,dict):
            for k,v in x.items(): walk(v,path+'.'+k)
        elif isinstance(x,list):
            for i,v in enumerate(x): walk(v,path+'[%d]'%i)
        elif isinstance(x,str):
            for mm in pat.finditer(x):
                a=max(0,mm.start()-250); b=min(len(x),mm.end()+250)
                out.write('%s %s: ...%s...\n'%(m,path,x[a:b].replace('\n',' ')))
    walk(s,'')
