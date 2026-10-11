"""Critic B10: text-level diff between r9 and current (read-only)."""
import re, sys, html, difflib
def raw(path): return open(path,encoding="utf-8").read()
def blocks(t): return re.findall(r"(?s)<style.*?</style>|<script.*?</script>",t)
def txt(t):
    h=re.sub(r"(?s)<style.*?</style>|<script.*?</script>","",t)
    h=re.sub(r"</(tr|p|li|h\d|summary|div|caption|details|section|table|thead|tbody)>","\n",h)
    h=re.sub(r"<(br|/td|/th)[^>]*>"," | ",h)
    h=re.sub(r"<[^>]+>","",h); h=html.unescape(h)
    return [re.sub(r"[ \t]+"," ",l).strip() for l in h.splitlines() if l.strip()]
A=raw(sys.argv[1]); B=raw(sys.argv[2])
print("style/script identical:", blocks(A)==blocks(B))
for l in difflib.unified_diff(txt(A),txt(B),"r9","cur",n=0,lineterm=""): print(l)
