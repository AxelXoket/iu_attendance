import json,sys
base=sys.argv[1]; out=sys.argv[2]
o=open(out,'w',encoding='utf-8')
for spec in sys.argv[3:]:
  m,name=spec.split(':',1)
  d=json.load(open(base+'/spec/%s.json'%m,encoding='utf-8'))
  hit=False
  for t in d.get('tests',[]):
    if name.lower() in json.dumps(t,ensure_ascii=False).lower():
      o.write('### %s\n%s\n\n'%(spec,json.dumps(t,ensure_ascii=False))); hit=True
  if not hit: o.write('### %s  NO MATCH\n\n'%spec)
