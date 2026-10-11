(() => {
  const cw = document.documentElement.clientWidth, out = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('.side-nav') || e.closest('.scroll-x') || e.closest('.tbl-wrap') || e.closest('.contrast-wrap')) continue;
    const r = e.getBoundingClientRect();
    if (r.right > cw + 1 && r.width > 0) out.push({ tag: e.tagName.toLowerCase(), cls: String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 40), right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width), text: (e.textContent || '').trim().slice(0, 40), parent: e.parentElement.className.toString().slice(0, 30) });
  }
  return { n: out.length, out: out.slice(0, 30) };
})()
