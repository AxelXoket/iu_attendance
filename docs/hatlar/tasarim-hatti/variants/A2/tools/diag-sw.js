(() => {
  const res = [];
  const pick = ['.shell', 'main', '.wrap', '.side', '.toasts', 'header.cover', ...[...document.querySelectorAll('section[id]')].map(s => '#' + s.id)];
  for (const s of pick) { const e = document.querySelector(s); if (!e) continue; const r = e.getBoundingClientRect(); res.push([s, e.scrollWidth, e.clientWidth, Math.round(r.left), Math.round(r.right)]); }
  const deep = [];
  for (const e of document.querySelectorAll('main *')) { if (e.scrollWidth > 400 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0 && e.clientWidth < 400) deep.push([e.tagName, String(e.className).slice(0, 30), e.scrollWidth, e.clientWidth]); }
  return { res, deep: deep.slice(0, 30), vw: innerWidth, vv: visualViewport ? visualViewport.width : null };
})()
