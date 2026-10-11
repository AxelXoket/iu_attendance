import json,sys,re
# usage: g.py MOD pattern [width]
mod=sys.argv[1]; pat=sys.argv[2]; w=int(sys.argv[3]) if len(sys.argv)>3 else 300
s=open('spec/%s.json'%mod,encoding='utf-8').read()
s=json.dumps(json.loads(s),ensure_ascii=False)
for m in re.finditer(pat,s,flags=re.I):
    a=max(0,m.start()-w); b=min(len(s),m.end()+w)
    print('...',s[a:b],'...\n')
