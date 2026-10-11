"""Critic B8: text-level diff between r7 and current (read-only)."""
import re, sys, html, difflib
def txt(path):
    t=open(path,encoding="utf-8").read()
    h=re.sub(r"(?s)<style.*?</style>|<script.*?</script>","",t)
    h=re.sub(r"</(tr|p|li|h\d|summary|div|caption|details|section|table|thead|tbody)>","\n",h)
    h=re.sub(r"<(br|/td|/th)[^>]*>"," | ",h)
    h=re.sub(r"<[^>]+>","",h); h=html.unescape(h)
    return [re.sub(r"[ \t]+"," ",l).strip() for l in h.splitlines() if l.strip()]
a=txt(sys.argv[1]); b=txt(sys.argv[2])
for l in difflib.unified_diff(a,b,"r7","cur",n=0,lineterm=""): print(l)
