import re,sys
t=open('plan.txt',encoding='utf-8').read()
for m in re.finditer(sys.argv[1],t,flags=re.I):
    a=max(0,m.start()-250); b=min(len(t),m.end()+250)
    print('...',t[a:b],'...\n')
