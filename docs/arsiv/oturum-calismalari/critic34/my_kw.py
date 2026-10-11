import sys; sys.stdout.reconfigure(encoding="utf-8")
import json,sys,re,glob
mods=sys.argv[1].split(',')
pats=sys.argv[2:]
w=int(__import__('os').environ.get('W','250'))
for m in mods:
    s=json.dumps(json.load(open('spec/%s.json'%m,encoding='utf-8')),ensure_ascii=False)
    for p in pats:
        for mt in list(re.finditer(p,s))[:int(__import__('os').environ.get('N','4'))]:
            a=max(0,mt.start()-w); b=min(len(s),mt.end()+w)
            print('--[%s] %s: ...%s...'%(m,p,s[a:b]))
