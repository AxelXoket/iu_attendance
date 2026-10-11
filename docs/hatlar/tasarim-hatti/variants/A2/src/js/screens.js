// src/js/screens.js · owner F1b (OWNERS.md)
// Behaviour that only screen sections use: scan demo, success moment and receipt, deletion roles, countdowns, instructor
// QR, the panel (width, fit, table, search, drawer, head count), the Röntgen caption and link, Turkish casing. (Fitting
// the phones to their column is page-level: base.js.) Its statements run inside the IIFE of base.js and use its helpers.
// tools/lib/sources.js merges base, system and screens: every chunk starts with an "@order" marker line,
// and the chunks of all three files are joined in marker order, so the page sees one script in that order.
// Markers and this note never reach tasarim.html. To add code, extend a chunk, or start one with a free number
// between its neighbours.
/* @order 0900 */
  /* Phone: QR scanning demo. On capture each corner of the frame moves onto the QR's measured edges, 4 px outside them
     (the camera scene is zoomed and skewed, so the code's box is measured, never assumed); the frame and its scrim stay.
     Measured in viewport pixels and divided by the phone's own zoom, so the move is right at any phone scale. Under
     reduced motion the corners stay (CSS: --mv) and only the hint changes. */
  $$('[data-scan]').forEach(b => b.addEventListener('click', () => {
    const ph = document.getElementById(b.dataset.scan), frame = $('.scan-frame', ph), hint = $('.scan-hint', ph), qr = $('.cam-qr', ph);
    if (!frame || frame.classList.contains('lock')) return;
    const before = hint.innerHTML;
    if (qr) {
      // Each corner's resting outer point comes from the frame and the corner's own offset (left or right, top or bottom),
      // so the move is right even while a previous move is still easing back.
      const f = frame.getBoundingClientRect(), q = qr.getBoundingClientRect(), k = f.width / frame.offsetWidth || 1, m = 4 * k;
      [...frame.children].forEach(c => {
        const cs = getComputedStyle(c), left = cs.left !== 'auto' && c.offsetLeft < frame.offsetWidth / 2, top = c.offsetTop < frame.offsetHeight / 2;
        const x = left ? f.left + parseFloat(cs.left) * k : f.right - parseFloat(cs.right) * k, y = top ? f.top + parseFloat(cs.top) * k : f.bottom - parseFloat(cs.bottom) * k;
        const tx = (left ? q.left - m : q.right + m) - x, ty = (top ? q.top - m : q.bottom + m) - y;
        c.style.setProperty('--tx', (tx / k).toFixed(1) + 'px'); c.style.setProperty('--ty', (ty / k).toFixed(1) + 'px');
      });
    }
    frame.classList.add('lock'); hint.innerHTML = spin + '<span>Okundu, kaydediliyor</span>';
    setTimeout(() => { frame.classList.remove('lock'); hint.innerHTML = before; }, 1600);
  }));
  $$('[data-press]').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));


/* @order 1100 */
  /* Phone: success moment (plays when first seen, replay on demand; the final state is the default) */
  const ok = $('#ph-success');
  if (ok) {
    const play = () => { restart(ok, 'play'); if (slow !== 1) ok.getAnimations({ subtree: true }).forEach(a => { a.playbackRate = 1 / slow; }); };
    new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { play(); o.disconnect(); } }), { threshold: 0.5 }).observe(ok);
    $$('[data-replay]').forEach(b => b.addEventListener('click', play));
    // The receipt switch (a pressed button with a fixed label) swaps every on/off part of the screen: the receipt
    // steps, the line under them and the status bar icons.
    const net = $('[data-receipt]');
    if (net) net.addEventListener('click', () => {
      const off = net.getAttribute('aria-pressed') !== 'true';
      net.setAttribute('aria-pressed', String(off));
      $$('[data-v]', ok).forEach(s => { const isOff = s.dataset.v === 'off'; if (off === isOff) s.removeAttribute('data-off'); else s.setAttribute('data-off', ''); });
    });
  }

  /* Phone: account deletion, the student's screen or the instructor's (a pressed button with a fixed label). */
  $$('[data-role-swap]').forEach(b => {
    const ph = document.getElementById(b.dataset.roleSwap);
    if (!ph) return;
    b.addEventListener('click', () => {
      const hoca = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(hoca));
      $$('.del-v', ph).forEach(v => { if ((v.dataset.v === 'hoca') === hoca) v.removeAttribute('data-off'); else v.setAttribute('data-off', ''); });
    });
  });

  /* Phone: countdowns (information, not decoration: update once a second without animation). Every screen of the lesson
     counts the same window, so the home, scan and QR screens always agree. */
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

  /* Phone: the instructor's QR changes every 5 s instantly (no animation, R11-K10). It rotates through the attendance
     codes only (the first data-qr-n entries of QR_CODES; the projector's pairing QR is not one of them). */
  const qrData = window.QR_CODES || [];
  $$('[data-qr]').forEach(svg => {
    const path = $('.qr-m', svg), out = document.getElementById(svg.dataset.qr), n = Math.min(qrData.length, parseInt(svg.dataset.qrN, 10) || qrData.length);
    let i = 0, left = 5;
    setInterval(() => {
      left -= 1;
      if (left <= 0) { i = (i + 1) % n; path.setAttribute('d', qrData[i]); left = 5; }
      if (out) out.textContent = String(left);
    }, 1000);
  });

  /* Panel: drawn at the chosen window width (--pw) and zoomed to fit its column, like the phones; the scale is written
     under it. It opens at the side-bar width where the column is at least the narrow breakpoint, else at the narrow
     sample. A width change cross-fades the drawing in dur.kisa (ease.giris), at once under reduced motion, and lets the
     page re-place its tab indicators. */
  const pnl = $('#scr-panel');
  const fit = $('#panel .panel-fit');
  if (pnl && fit) {
    const frame = $('.panel-frame', fit), note = $('#panel .pnl-scale'), segs = $$('#panel [data-pw]');
    const main = $('.pnl-main', pnl), nav = $('.pnl-nav', pnl), menu = $('.pnl-menu', pnl), drawer = $('#pnl-drawer');
    let width = segs.length ? +segs[0].dataset.pw : 1280;
    const fitPanel = () => {
      fit.style.zoom = '';
      const k = Math.min(1, fit.parentElement.clientWidth / frame.offsetWidth);
      if (k < 1) fit.style.zoom = k.toFixed(4);
      if (note) { note.hidden = false; note.textContent = width + ' px pencere, ' + (k < 1 ? '%' + Math.floor(k * 100) + ' ölçekle' : 'gerçek boyda'); }
    };
    /* The narrow layout's menu opens the navigation as a side panel from the right edge (Etkileşim tablosu, yan panel;
       CSS draws the motion). While it is open the rest of the panel is inert and Tab stays inside it; Escape, the scrim
       and the close button close it, and focus goes back to the menu button. */
    const isOpen = () => pnl.dataset.drawer === 'open';
    const closeDrawer = (refocus = true) => {
      if (!isOpen()) return;
      delete pnl.dataset.drawer;
      menu.setAttribute('aria-expanded', 'false');
      main.inert = false; nav.inert = false;
      if (refocus) menu.focus({ preventScroll: true });
    };
    const openDrawer = () => {
      pnl.dataset.drawer = 'open';
      menu.setAttribute('aria-expanded', 'true');
      main.inert = true; nav.inert = true;
      const first = $('[data-drawer-close]', drawer);
      if (first) first.focus({ preventScroll: true });
    };
    if (menu && drawer) {
      menu.addEventListener('click', () => (isOpen() ? closeDrawer() : openDrawer()));
      $$('[data-drawer-close]', pnl).forEach(x => x.addEventListener('click', () => closeDrawer()));
      $$('.pnl-link', drawer).forEach(x => x.addEventListener('click', () => closeDrawer()));
      drawer.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
        if (e.key !== 'Tab') return;
        const f = $$('button, a[href]', drawer), a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      });
    }
    const setWidth = (w, animate) => {
      width = w;
      segs.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.pw === w)));
      frame.style.setProperty('--pw', w + 'px');
      closeDrawer(false);
      fitPanel();
      window.dispatchEvent(new Event('resize'));
      if (animate && !reduced()) fit.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-kisa'), easing: ease('--ease-giris') });
    };
    segs.forEach(b => b.addEventListener('click', () => { if (+b.dataset.pw !== width) setWidth(+b.dataset.pw, true); }));
    const narrow = +fit.dataset.narrow || 672;
    if (segs.length && fit.parentElement.clientWidth < narrow) setWidth(+segs[segs.length - 1].dataset.pw, false); else fitPanel();
    let fitQueued = false;
    window.addEventListener('resize', () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fitPanel(); }); });

    /* Before the head count: the switch shows the page as it stands until the head count is entered (no record, no
       count); the change cross-fades the page in dur.kisa, at once under reduced motion. */
    const hs = $('[data-head-sw]');
    if (hs) hs.addEventListener('switchchange', e => {
      pnl.dataset.head = e.detail ? 'yok' : 'girildi';
      if (!reduced()) main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-kisa'), easing: ease('--ease-giris') });
      window.dispatchEvent(new Event('resize'));
    });
  }

  /* Panel table: selection, select all, Turkish sort, search and filter tabs (the groups partition the class). Sorting and
     filtering cross-fade the table body in 120 ms (dur-hover, ease-mikro); with reduced motion the body changes at once.
     Search narrows the rows of the chosen tab at once, by name (Turkish lower case) or number. */
  const tbl = $('#pnl-table');
  if (tbl) {
    const body = $('tbody', tbl), all = $('[data-all]', tbl), count = $('[data-selcount]'), search = $('#panel [data-search]'), empty = $('#panel [data-empty]');
    const rows = () => $$('tr', body);
    const norm = s => s.toLocaleLowerCase('tr-TR');
    let group = 'all', query = '';
    const sync = () => {
      const vis = rows().filter(r => !r.hidden), on = vis.filter(r => $('input', r).checked);
      rows().forEach(r => r.classList.toggle('sel', $('input', r).checked));
      all.checked = on.length > 0 && on.length === vis.length; all.indeterminate = on.length > 0 && on.length < vis.length;
      if (count) count.textContent = on.length ? on.length + ' seçili' : '';
    };
    const apply = () => {
      rows().forEach(r => { r.hidden = !((group === 'all' || r.dataset.f === group) && (!query || norm(r.dataset.name).includes(query) || (r.dataset.no || '').includes(query))); });
      const n = rows().filter(r => !r.hidden).length;
      const shown = document.querySelector('[data-shown]'); if (shown) shown.textContent = String(n);
      if (empty) empty.hidden = n > 0;
      sync();
    };
    const fade = () => { if (!reduced()) body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-hover'), easing: ease('--ease-mikro') }); };
    body.addEventListener('change', sync);
    all.addEventListener('change', () => { rows().filter(r => !r.hidden).forEach(r => { $('input', r).checked = all.checked; }); sync(); });
    const coll = new Intl.Collator('tr');
    const sortBtn = $('[data-sort]', tbl);
    sortBtn.addEventListener('click', () => {
      const desc = sortBtn.getAttribute('aria-pressed') !== 'true';
      sortBtn.setAttribute('aria-pressed', String(desc));
      sortBtn.closest('th').setAttribute('aria-sort', desc ? 'descending' : 'ascending');
      rows().sort((a, b) => (desc ? -1 : 1) * coll.compare(a.dataset.name, b.dataset.name)).forEach(r => body.appendChild(r));
      fade();
    });
    const tl = $('#pnl-tabs');
    if (tl) tl.addEventListener('tabchange', e => { group = e.detail.dataset.filter; apply(); fade(); });
    if (search) search.addEventListener('input', () => { query = norm(search.value.trim()); apply(); });
    sync();
  }

  /* Röntgen: base.js writes the caption that names the remaining roles into each drawn screen; here it moves under the
     screen (into its caption, after the title line; on the panel, after the scale line), so it never covers the screen's
     own header. The pins stay on the screen; base.js places them in viewport pixels, so on a zoomed screen (the panel,
     a phone in a narrow column) their offsets are divided by the zoom to land on their elements. */
  const capOf = scr => { const fig = scr.closest('.device-fig'); return fig ? $('.device-cap', fig) : $('#panel .panel-cap'); };
  $$('#ekranlar .device-screen, #panel .pnl').forEach(scr => new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.classList.contains('xr-pin')) {
      const k = scr.getBoundingClientRect().width / scr.offsetWidth;
      if (k > 0 && Math.abs(k - 1) > 0.001) { n.style.left = Math.round(parseFloat(n.style.left) / k) + 'px'; n.style.top = Math.round(parseFloat(n.style.top) / k) + 'px'; }
      return;
    }
    if (!n.classList.contains('xr-tag')) return;
    const cap = capOf(scr);
    if (cap) cap.insertBefore(n, cap.children[1] || null);
  }))).observe(scr, { childList: true }));

  /* Gece mavisi nerede: "Röntgen'i aç" turns the switch on (if it is off) and brings its plate into view; without the
     script it is a plain link to Telefon ekranları. */
  $$('[data-xray-go]').forEach(a => a.addEventListener('click', e => {
    const sw = $('#ekranlar [data-xray]'), plate = $('#xr-plate');
    if (!sw || !plate) return;
    e.preventDefault();
    if (sw.getAttribute('aria-checked') !== 'true') sw.click();
    plate.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    sw.focus({ preventScroll: true });
  }));

/* @order 1300 */
  /* Turkish casing, computed here (never typed): toLocaleUpperCase('tr-TR') against the locale-free calls. */
  $$('[data-case]').forEach(el => {
    const s = el.dataset.src, k = el.dataset.case;
    el.textContent = k === 'upper-tr' ? s.toLocaleUpperCase('tr-TR') : k === 'upper' ? s.toUpperCase() : k === 'lower-tr' ? s.toLocaleLowerCase('tr-TR') : s.toLowerCase();
  });

