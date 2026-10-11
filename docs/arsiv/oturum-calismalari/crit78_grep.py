import json,re,sys
mod=sys.argv[1]; pats=sys.argv[2:]
d=json.load(open('spec/%s.json'%mod,encoding='utf-8'))
def walk(o,path):
    if isinstance(o,dict):
        for k,v in o.items(): yield from walk(v,path+'.'+str(k))
    elif isinstance(o,list):
        for i,v in enumerate(o): yield from walk(v,path+'[%d]'%i)
    elif isinstance(o,str):
        yield path,o
for path,s in walk(d,''):
    for p in pats:
        for m in re.finditer(p,s,re.I):
            a=max(0,m.start()-250); b=min(len(s),m.end()+250)
            print('##',path,'|',s[a:b].replace('\n',' ')); print()
            break
