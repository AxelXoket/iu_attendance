import json,sys,re
# usage: gr.py MODULE regex  -> prints matching sentences w/ path
m=sys.argv[1]; rx=re.compile(sys.argv[2],re.I)
d=json.load(open(f'spec/{m}.json',encoding='utf-8'))
def walk(o,p):
    if isinstance(o,dict):
        for k,v in o.items(): walk(v,p+'.'+str(k))
    elif isinstance(o,list):
        for i,v in enumerate(o): walk(v,p+f'[{i}]')
    elif isinstance(o,str):
        for s in re.split(r'(?<=[.;])\s+',o):
            if rx.search(s): print(p,'::',s)
walk(d,m)
