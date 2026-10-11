"""UX pass: fold reference sections (2,3,4,5,7,8) behind a <details>, make every in-page link open
its target <details> (and ancestors), and apply the two last MINOR wording fixes."""
import pathlib
import re
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")

# --- wording (critic-final MINOR 1, 2) ---
for old, new in [
    ("Yeniden başlatma Android'de BOOT_COUNT ile, iOS'ta açılıştan beri geçen sürenin azalmasıyla anlaşılır.",
     "Yeniden başlatma Android'de BOOT_COUNT ile, iOS'ta açılıştan beri geçen sürenin azalmasıyla yaklaşık olarak anlaşılır."),
    ("Bilgisayarda kamera yoksa panel hocanın kayıtlı telefonunda açılıp orada okutulur.",
     "Bilgisayarda kamera yoksa panel hocanın telefonunda da (kurulabilir PWA) açılıp orada okutulur."),
]:
    assert t.count(old) == 1, old[:60]
    t = t.replace(old, new)

# --- fold reference sections ---
FOLD = ["akis", "hile", "mevzuat", "kvkk", "takvim", "olcut"]
for sid in FOLD:
    pat = re.compile(r'<section id="%s">\s*(<h2>.*?</h2>)(.*?)</section>' % sid, re.S)
    m = pat.search(t)
    assert m, sid
    h2, body = m.group(1), m.group(2)
    new = ('<section id="%s" class="fold">\n  <details class="secd">\n    <summary>%s<span class="hint">aç / kapat</span></summary>%s  </details>\n</section>'
           % (sid, h2, body))
    t = t[:m.start()] + new + t[m.end():]

# --- CSS for folded sections ---
css = """
details.secd{border:0;padding:0;margin:0;background:transparent}
details.secd>summary{list-style:none;cursor:pointer;padding:0;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
details.secd>summary::-webkit-details-marker{display:none}
details.secd>summary>h2{font-size:19px;margin:0;display:flex;gap:10px;align-items:baseline}
details.secd>summary>h2 .n{color:var(--accent)}
details.secd>summary .hint{font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:1px 9px}
details.secd[open]>summary{border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:12px}
@media print{details.secd>summary .hint{display:none}}
</style>"""
assert t.count("</style>") == 1
t = t.replace("</style>", css, 1)

# --- JS: open target details on in-page navigation ---
js_old = "  var opened = [];"
js_new = """  function openTo(id){
    var el = id && document.getElementById(id);
    if(!el){ return; }
    var d = el.tagName === 'DETAILS' ? el : el.querySelector(':scope > details.secd');
    if(d){ d.open = true; }
    for(var a = el.parentElement; a; a = a.parentElement){ if(a.tagName === 'DETAILS'){ a.open = true; } }
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if(a){ openTo(a.getAttribute('href').slice(1)); }
  });
  if(location.hash){ openTo(location.hash.slice(1)); }
  window.addEventListener('hashchange', function(){ openTo(location.hash.slice(1)); });
  var opened = [];"""
assert t.count(js_old) == 1
t = t.replace(js_old, js_new)

# --- reading guide wording ---
old_g = "Diğer bölümler ve ekler başvuru içindir.</p>"
assert t.count(old_g) == 1
t = t.replace(old_g, "Diğer bölümler ve ekler başvuru içindir; başlıklarına tıklayınca açılır.</p>")

p.write_text(t, encoding="utf-8")
print("UX pass applied")
