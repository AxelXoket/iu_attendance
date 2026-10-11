import sys,re
t=open(r'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/plantext.txt',encoding='utf-8').read()
w=int(sys.argv[2]) if len(sys.argv)>2 else 250
for m in re.finditer(sys.argv[1],t,flags=re.I):
    print('...',t[max(0,m.start()-w):m.end()+w],'...\n')
