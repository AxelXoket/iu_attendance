import json,sys,io
mod=sys.argv[1]; names=sys.argv[2].split('|'); 
s=json.load(open('spec/%s.json'%mod,encoding='utf-8'))
out=io.open(sys.argv[3],'a',encoding='utf-8')
out.write('\n######## %s %s\n'%(mod,names))
for t in s.get('tests',[]):
    if any(n.lower() in t.get('name','').lower() for n in names):
        out.write('TEST '+json.dumps(t,ensure_ascii=False)+'\n')
