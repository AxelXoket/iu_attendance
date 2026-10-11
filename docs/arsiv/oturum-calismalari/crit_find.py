import json,sys,re
base=sys.argv[1]; out=sys.argv[2]; pats=sys.argv[3:]
o=open(out,'w',encoding='utf-8')
def walk(x,path):
  if isinstance(x,dict):
    for k,v in x.items(): yield from walk(v,path+'.'+str(k))
  elif isinstance(x,list):
    for i,v in enumerate(x): yield from walk(v,path+'[%d]'%i)
  else:
    yield path,str(x)
import glob,os
for f in sorted(glob.glob(base+'/spec/*.json'))+sorted(glob.glob(base+'/packages/*.json')):
  d=json.load(open(f,encoding='utf-8'))
  for p,s in walk(d,os.path.basename(os.path.dirname(f))+'/'+os.path.basename(f)):
    for pat in pats:
      for m in re.finditer(pat,s,re.I):
        a=max(0,m.start()-300); b=min(len(s),m.end()+300)
        o.write('## %s | %s\n%s\n\n'%(pat,p,s[a:b]))
