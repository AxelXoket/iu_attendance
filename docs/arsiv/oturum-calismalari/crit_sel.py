import json,sys
base=sys.argv[1]; out=sys.argv[2]
o=open(out,'w',encoding='utf-8')
for spec in sys.argv[3:]:
  m,path=spec.split(':',1)
  d=json.load(open(base+'/spec/%s.json'%m,encoding='utf-8'))
  x=d
  for part in path.split('/'):
    if part=='' : continue
    x = x[int(part)] if isinstance(x,list) else x[part]
  o.write('### %s\n%s\n\n'%(spec,json.dumps(x,ensure_ascii=False,indent=0)))
