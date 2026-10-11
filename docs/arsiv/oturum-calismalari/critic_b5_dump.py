"""Critic B3: dump main-body and appendix text with row structure (read-only)."""
import re, sys, html
t = open(sys.argv[1], encoding="utf-8").read()
mode = sys.argv[2]
m = re.search(r"<main>(.*)</main>", t, re.S)
main = m.group(1) if m else t
def txt(h):
    h = re.sub(r"</(tr|p|li|h\d|summary|div|caption)>", "\n", h)
    h = re.sub(r"</t[dh]>", " | ", h)
    h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h)
    return "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in h.splitlines() if l.strip())
if mode == "body":
    print(txt(re.sub(r"<details.*?</details>", "\n[[DETAILS]]\n", main, flags=re.S)))
else:
    for d in re.findall(r"<details.*?</details>", main, re.S):
        print("=====DETAILS"); print(txt(d))
