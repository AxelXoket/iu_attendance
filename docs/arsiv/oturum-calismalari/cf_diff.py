import difflib,re,sys,html
D=sys.argv[1]
a=open(D+'/iu-yoklama-ozet.r10.html',encoding='utf-8').read()
b=open(D+'/iu-yoklama-ozet.html',encoding='utf-8').read()
def txt(s):
    s=re.sub(r'<(script|style)[^>]*>.*?</\1>','',s,flags=re.S)
    s=re.sub(r'<[^>]+>','\n',s); s=html.unescape(s)
    return [l.strip() for l in s.split('\n') if l.strip()]
print('raw lines',len(a.splitlines()),len(b.splitlines()))
for l in difflib.unified_diff(a.splitlines(),b.splitlines(),'r10','cur',n=0,lineterm=''):
    print(l)
print('DASHES cur', b.count('\u2014'), b.count('\u2013'), 'r10', a.count('\u2014'),a.count('\u2013'))
