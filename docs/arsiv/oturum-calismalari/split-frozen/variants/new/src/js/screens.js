// src/js/screens.js · owner F1b (OWNERS.md)
// Behaviour that only screen sections use: scan demo, success moment, countdowns, instructor QR, panel table, Turkish
// casing. Its statements run inside the IIFE of base.js and use its helpers.
// tools/lib/sources.js merges base, system and screens: every chunk starts with an "@order" marker line,
// and the chunks of all three files are joined in marker order, so the page sees one script in that order.
// Markers and this note never reach tasarim.html. To add code, extend a chunk, or start one with a free number
// between its neighbours.
/* @order 0900 */
  /* Phone: QR scanning demo */
  $$('[data-scan]').forEach(b => b.addEventListener('click', () => {
    const ph = document.getElementById(b.dataset.scan), frame = $('.scan-frame', ph), hint = $('.scan-hint', ph);
    if (frame.classList.contains('lock')) return;
    const before = hint.innerHTML;
    frame.classList.add('lock'); hint.innerHTML = spin + '<span>Okundu, kaydediliyor</span>';
    setTimeout(() => { frame.classList.remove('lock'); hint.innerHTML = before; }, 1600);
  }));
  $$('.zoom').forEach(z => {
    const bs = $$('[role="radio"]', z), cam = z.closest('.ph').querySelector('.cam');
    bs.forEach(b => b.addEventListener('click', () => {
      bs.forEach(x => { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      const k = b.dataset.zoom === '2' ? 2 : 1;
      cam.style.transition = reduced() ? 'none' : 'transform ' + ease('--dur-uzun') + ' ' + ease('--ease-standart');
      cam.style.transform = 'scale(' + k + ')';
    }));
  });
  $$('[data-press]').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));

/* @order 1100 */
  /* Phone: success moment (plays when first seen, replay on demand; the final state is the default) */
  const ok = $('#ph-success');
  if (ok) {
    const play = () => { restart(ok, 'play'); if (slow !== 1) ok.getAnimations({ subtree: true }).forEach(a => { a.playbackRate = 1 / slow; }); };
    new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { play(); o.disconnect(); } }), { threshold: 0.5 }).observe(ok);
    $$('[data-replay]').forEach(b => b.addEventListener('click', play));
    const net = $('[data-receipt]');
    net.addEventListener('click', () => {
      const off = net.getAttribute('aria-pressed') !== 'true';
      net.setAttribute('aria-pressed', String(off));
      net.querySelector('.btn-label').textContent = off ? 'Çevrimiçi makbuz' : 'Çevrimdışı makbuz';
      $$('[data-v]', ok).forEach(s => { const isOff = s.dataset.v === 'off'; if (off === isOff) s.removeAttribute('data-off'); else s.setAttribute('data-off', ''); });
    });
  }

  /* Phone: countdowns (information, not decoration: update once a second without animation) */
  $$('[data-countdown]').forEach(el => {
    let left = parseInt(el.dataset.countdown, 10);
    const total = parseInt(el.dataset.total, 10);
    const now = el.closest('.now');
    const bar = now && now.querySelector('.prog span'), prog = now && now.querySelector('.prog');
    const draw = () => {
      const m = Math.floor(left / 60), s = left % 60;
      el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', m + ' dakika ' + s + ' saniye kaldı');
      if (bar) { bar.style.transform = 'scaleX(' + (left / total).toFixed(4) + ')'; prog.setAttribute('aria-valuenow', String(Math.round(100 * left / total))); }
    };
    draw();
    setInterval(() => { left = left > 1 ? left - 1 : parseInt(el.dataset.countdown, 10); draw(); }, 1000);
  });

  /* Phone: instructor QR changes every 5 s instantly (no animation, R11-K10) */
  const qrData = window.QR_CODES || [];
  $$('[data-qr]').forEach(svg => {
    const path = $('.qr-m', svg), out = document.getElementById(svg.dataset.qr);
    let i = 0, left = 5;
    setInterval(() => {
      left -= 1;
      if (left <= 0) { i = (i + 1) % qrData.length; path.setAttribute('d', qrData[i]); left = 5; }
      if (out) out.textContent = String(left);
    }, 1000);
  });

  /* Panel table: selection, select all, Turkish sort, filter tabs (the groups partition the class) */
  const tbl = $('#pnl-table');
  if (tbl) {
    const body = $('tbody', tbl), all = $('[data-all]', tbl), count = $('[data-selcount]');
    const rows = () => $$('tr', body);
    const sync = () => {
      const vis = rows().filter(r => !r.hidden), on = vis.filter(r => $('input', r).checked);
      rows().forEach(r => r.classList.toggle('sel', $('input', r).checked));
      all.checked = on.length > 0 && on.length === vis.length; all.indeterminate = on.length > 0 && on.length < vis.length;
      if (count) count.textContent = on.length ? on.length + ' seçili' : '';
    };
    body.addEventListener('change', sync);
    all.addEventListener('change', () => { rows().filter(r => !r.hidden).forEach(r => { $('input', r).checked = all.checked; }); sync(); });
    const coll = new Intl.Collator('tr');
    const sortBtn = $('[data-sort]', tbl);
    sortBtn.addEventListener('click', () => {
      const desc = sortBtn.getAttribute('aria-pressed') !== 'true';
      sortBtn.setAttribute('aria-pressed', String(desc));
      sortBtn.closest('th').setAttribute('aria-sort', desc ? 'descending' : 'ascending');
      rows().sort((a, b) => (desc ? -1 : 1) * coll.compare(a.dataset.name, b.dataset.name)).forEach(r => body.appendChild(r));
    });
    const tl = $('#pnl-tabs');
    if (tl) tl.addEventListener('tabchange', e => {
      const f = e.detail.dataset.filter;
      rows().forEach(r => { r.hidden = f !== 'all' && r.dataset.f !== f; });
      const shown = document.querySelector('[data-shown]'); if (shown) shown.textContent = String(rows().filter(r => !r.hidden).length);
      sync();
    });
    sync();
  }

/* @order 1300 */
  /* Turkish casing, computed here (never typed): toLocaleUpperCase('tr-TR') against the locale-free calls. */
  $$('[data-case]').forEach(el => {
    const s = el.dataset.src, k = el.dataset.case;
    el.textContent = k === 'upper-tr' ? s.toLocaleUpperCase('tr-TR') : k === 'upper' ? s.toUpperCase() : k === 'lower-tr' ? s.toLocaleLowerCase('tr-TR') : s.toLowerCase();
  });

