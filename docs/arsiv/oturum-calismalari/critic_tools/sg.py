import json,sys,re
# usage: sg.py MOD section regex [maxchars]
base=r"C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/"
mod,sec,pat=sys.argv[1],sys.argv[2],sys.argv[3]
mx=int(sys.argv[4]) if len(sys.argv)>4 else 3000
d=json.load(open(base+mod+'.json',encoding='utf-8'))
secs=[sec] if sec!='*' else [k for k,v in d.items() if isinstance(v,list)]
r=re.compile(pat,re.I)
for s in secs:
  for it in d.get(s,[]):
    t=json.dumps(it,ensure_ascii=False)
    if r.search(t):
      print('['+s+']',t[:mx]); print()
