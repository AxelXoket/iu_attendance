"""Deterministic gate for the summary HTML: dashes, banned words, tag balance, external refs, body length."""
import sys, re
from html.parser import HTMLParser
path = sys.argv[1]
t = open(path, encoding="utf-8").read()
fails = []
if "—" in t or "–" in t: fails.append(f"dash: em={t.count(chr(0x2014))} en={t.count(chr(0x2013))}")
banned = ("delve crucial robust comprehensive nuanced multifaceted furthermore moreover pivotal landscape "
          "tapestry underscore foster showcase intricate vibrant fundamental significant interplay").split()
hits = [w for w in banned if re.search(r"\b" + w, t, re.I)]
if hits: fails.append(f"banned words: {hits}")
for p in ["here's the kicker", "here's the thing", "plot twist", "let me break this down", "the bottom line", "make no mistake"]:
    if p in t.lower(): fails.append(f"banned phrase: {p}")
VOID = {"meta","link","br","img","input","hr","col","source","wbr","area","base","embed","param","track"}
class P(HTMLParser):
    def __init__(s): super().__init__(); s.stack=[]; s.err=[]; s.ids=[]; s.hrefs=[]; s.ext=[]
    def handle_starttag(s, tag, a):
        a = dict(a)
        if "id" in a: s.ids.append(a["id"])
        if tag == "a" and a.get("href","").startswith("#"): s.hrefs.append(a["href"][1:])
        for k in ("src",):
            if k in a and re.match(r"https?:", a[k] or ""): s.ext.append(a[k])
        if tag == "link": s.ext.append(a.get("href"))
        if tag not in VOID: s.stack.append((tag, s.getpos()))
    def handle_endtag(s, tag):
        if tag in VOID: return
        if s.stack and s.stack[-1][0] == tag: s.stack.pop(); return
        # tolerate implicit closes of li/p/td/tr/th
        while s.stack and s.stack[-1][0] in ("li","p","td","th","tr") and s.stack[-1][0] != tag: s.stack.pop()
        if s.stack and s.stack[-1][0] == tag: s.stack.pop()
        else: s.err.append(f"unexpected </{tag}> at {s.getpos()}")
p = P(); p.feed(t)
if p.err: fails.append("tag errors: " + "; ".join(p.err[:5]))
if p.stack: fails.append("unclosed: " + ", ".join(f"{a}@{b}" for a,b in p.stack[:5]))
dup = {i for i in p.ids if p.ids.count(i) > 1}
if dup: fails.append(f"duplicate ids: {dup}")
missing = sorted(set(h for h in p.hrefs if h not in p.ids))
if missing: fails.append(f"broken anchors: {missing}")
if p.ext: fails.append(f"external resources: {p.ext}")
# body length: visible text of <main> minus <details> appendices
m = re.search(r"<main>(.*)</main>", t, re.S).group(1)
m_no_details = re.sub(r"<details.*?</details>", " ", m, flags=re.S)
def words(h): return len(re.sub(r"<[^>]+>", " ", h).split())
print(f"main words (no appendices): {words(m_no_details)} | appendices: {words(m) - words(m_no_details)}")
print("RESULT:", "PASS" if not fails else "FAIL")
for f in fails: print(" -", f)
sys.exit(1 if fails else 0)
