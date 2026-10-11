import re,sys
t=open('plan.txt',encoding='utf-8').read()
w=int(sys.argv[2]) if len(sys.argv)>2 else 200
for m in list(re.finditer(sys.argv[1],t,re.I))[:int(sys.argv[3]) if len(sys.argv)>3 else 10]:
  print('...',t[max(0,m.start()-w):m.end()+w]); print()
