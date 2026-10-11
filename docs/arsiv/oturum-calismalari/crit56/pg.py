import re,sys
t=open('plan.txt',encoding='utf-8').read()
w=int(sys.argv[2]) if len(sys.argv)>2 else 250
for m in re.finditer(sys.argv[1],t,re.I):
    print('..',t[max(0,m.start()-w):m.end()+w]); print()
