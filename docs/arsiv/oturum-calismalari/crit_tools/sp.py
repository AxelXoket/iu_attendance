import json,sys,re
B="C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/"
mode=sys.argv[1]; mod=sys.argv[2]; arg=sys.argv[3]
d=json.load(open(B+mod+'.json',encoding='utf-8'))
if mode=='ep':
    for e in d['endpoints']:
        if e['path'].endswith(arg) or arg in e['path']:
            if len(sys.argv)>4 and e['method']!=sys.argv[4]: continue
            print(json.dumps(e,ensure_ascii=False,indent=1))
elif mode=='job':
    for e in d['jobs']:
        if arg in e['name']: print(json.dumps(e,ensure_ascii=False,indent=1))
elif mode=='grep':
    s=json.dumps(d,ensure_ascii=False)
    for m in re.finditer(arg,s,flags=re.I):
        a=max(0,m.start()-400); b=min(len(s),m.end()+400)
        print('...',s[a:b],'...\n')
elif mode=='key':
    print(json.dumps(d[arg],ensure_ascii=False,indent=1))
