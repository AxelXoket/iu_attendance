"""Replace selected <section> blocks in _main.html with compressed versions from sections/*.html.

The edge-case <details> block of the old 'akis' section is carried over into the new one
at the %%EDGE%% marker so it is not lost.
"""
import pathlib
import re
import sys

S = pathlib.Path(sys.argv[1])
main_path = S / "_main.html"
t = main_path.read_text(encoding="utf-8")

old_akis = re.search(r'<section id="akis".*?</section>', t, re.S).group(0)
edge = re.search(r"<details>.*?</details>", old_akis, re.S).group(0)

for f in sorted((S / "sections").glob("*.html")):
    sec_id = f.stem
    new = f.read_text(encoding="utf-8").strip().replace("%%EDGE%%", edge)
    pat = re.compile(r'<section id="%s".*?</section>' % re.escape(sec_id), re.S)
    hits = pat.findall(t)
    assert len(hits) == 1, (sec_id, len(hits))
    t = pat.sub(lambda m: new, t)
    print("replaced", sec_id)

assert "%%EDGE%%" not in t
main_path.write_text(t, encoding="utf-8")
