import sys,re
t=open(sys.argv[1],encoding='utf-8').read()
w=int(sys.argv[3]) if len(sys.argv)>3 else 200
for m in re.finditer(sys.argv[2],t,flags=re.I):
    s=max(0,m.start()-w);e=min(len(t),m.end()+w)
    print('...',t[s:e].replace('\n',' '),'...\n')
