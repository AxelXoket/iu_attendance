import json,sys
mod=sys.argv[1]; keys=sys.argv[2:]
d=json.load(open('spec/'+mod+'.json',encoding='utf-8'))
for sec in ['endpoints','jobs','exports']:
  for e in d.get(sec,[]):
    s=json.dumps(e,ensure_ascii=False)
    name=e.get('path') or e.get('name') or e.get('id') or ''
    if any(k in name for k in keys):
      print('#####',sec,name)
      print(json.dumps(e,ensure_ascii=False,indent=0))
