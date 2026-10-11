import json,sys,re
base=r'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/'
mod=sys.argv[1]; pat=re.compile(sys.argv[2],re.I); w=int(sys.argv[3]) if len(sys.argv)>3 else 300
mx=int(sys.argv[4]) if len(sys.argv)>4 else 30
d=json.load(open(base+mod+'.json',encoding='utf-8'))
out=[]
def walk(x,path):
  if isinstance(x,dict):
    for k,v in x.items(): walk(v,path+'.'+str(k))
  elif isinstance(x,list):
    for i,v in enumerate(x): walk(v,path+'[%d]'%i)
  elif isinstance(x,str):
    for m in pat.finditer(x):
      s=max(0,m.start()-w); e=min(len(x),m.end()+w)
      out.append((path,x[s:e]))
walk(d,mod)
n=0
seen=set()
for p,t in out:
  if (p,t) in seen: continue
  seen.add((p,t)); n+=1
  if n>mx: break
  print('##',p); print(t); print()
print('TOTAL',len(out))
