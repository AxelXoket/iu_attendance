import json,sys
B=sys.argv[1]; O=sys.argv[2]
out=open(O,'w',encoding='utf-8')
a=json.load(open(B+'/ozet/asamalar.json',encoding='utf-8'))
ph={}
for p in a:
    for e in p['paketler']: ph[e['id']]=p['asama']
for i in ['D13-P01','D13-P02','D13-P03','D13-P04','D04-P01','D04-P02','D04-P03','D04-P04','D12-P02','D12-P22','D03-P02','D03-P03','D03-P04','D03-P05','D03-P06','D15-P01','D13-P15','D10-P01','D10-P03','D10-P04','D10-P05']:
    out.write('%s phase %s\n'%(i,ph.get(i)))
pk={}; sp={}
for m in range(1,16):
    d=json.load(open(B+'/packages/D%02d.json'%m,encoding='utf-8'))
    for p in d['packages']: pk[p['id']]=p
    sp['D%02d'%m]=json.load(open(B+'/spec/D%02d.json'%m,encoding='utf-8'))
for i in ['D13-P14','D15-P30']:
    out.write(json.dumps({k:v for k,v in pk[i].items() if k!='files'},ensure_ascii=False)+'\n')
out.write('\n## D15 yayin_is_akislari\n')
for x in sp['D15']['yayin_is_akislari']: out.write('- '+x+'\n')
out.write('\n## D15 yuk_testi\n'+json.dumps(sp['D15']['yuk_testi'],ensure_ascii=False)[:4000]+'\n')
out.write('\n## D12 jobs\n')
for j in sp['D12']['jobs']: out.write(json.dumps(j,ensure_ascii=False)[:900]+'\n')
out.write('\n## files of phase pkgs\n')
for i in ['D15-P13','D04-P05','D03-P16','D06-P12','D06-P13','D04-P14','D03-P18','D13-P12','D13-P17','D08-P15','D11-P28','D06-P15','D12-P22','D14-P16','D03-P07']:
    out.write('%s %s\n'%(i,pk[i]['files']))
