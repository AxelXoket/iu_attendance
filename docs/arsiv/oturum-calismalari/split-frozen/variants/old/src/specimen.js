(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  // Reduced motion: the operating-system setting, or the page's own preview switch (html.rm).
  const reduced = () => mq.matches || root.classList.contains('rm');
  const rootStyle = getComputedStyle(root);
  // Motion tokens are read from tokens.css so script timing never drifts from the token file.
  const ms = name => { const v = rootStyle.getPropertyValue(name).trim(); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const ease = name => rootStyle.getPropertyValue(name).trim();
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const icon = (name, size) => '<svg class="ic ic' + (size || 16) + '" aria-hidden="true"><use href="#i20-' + name + '"></use></svg>';
  const spin = '<svg class="spin" viewBox="0 0 16 16" aria-hidden="true"><rect class="t0" x="1" y="1" width="14" height="14"></rect><rect class="t1" x="1" y="1" width="14" height="14" pathLength="56"></rect></svg>';

  /* Side navigation: current section, scrolled into view on narrow screens. Plan and Teknik are ordinary links. */
  const navLinks = $$('.side-nav a[href^="#"]');
  const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const setCurrent = a => {
    navLinks.forEach(x => x.removeAttribute('aria-current'));
    a.setAttribute('aria-current', 'true');
    const nav = a.parentElement;
    if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - 24, behavior: reduced() ? 'auto' : 'smooth' });
  };
  if (navLinks[0]) navLinks[0].setAttribute('aria-current', 'true');
  // Smooth scroll only for in-page navigation and only without reduced motion (no global scroll-behavior).
  $$('.side-nav a[href^="#"], a.brand').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1), t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
    t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  }));
  // Links inside the drawn screens are part of the picture, not navigation.
  $$('.pnl a, .ph a').forEach(a => a.addEventListener('click', e => e.preventDefault()));
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && byId.get(e.target.id)) setCurrent(byId.get(e.target.id)); }), { rootMargin: '-35% 0px -60% 0px' });
  byId.forEach((a, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* Toasts (panel): native live regions, no library. Success goes to role=status and closes after 5 s; errors go to role=alert and stay. */
  const lists = $$('.toasts .toast-list');
  const toast = (kind, title, text) => {
    const t = document.createElement('div');
    t.className = 'toast';
    const ic = kind === 'err' ? '<svg class="ic ic20 st-danger" aria-hidden="true"><use href="#i20-error"></use></svg>' : '<svg class="ic ic20 st-ulasti" aria-hidden="true"><use href="#i20-check"></use></svg>';
    t.innerHTML = ic + '<div><p class="tt"></p><p class="tx"></p></div><button class="btn btn-ghost btn-icon" type="button" aria-label="Kapat"><svg class="ic ic20" aria-hidden="true"><use href="#i20-close"></use></svg></button>';
    $('.tt', t).textContent = title; $('.tx', t).textContent = text;
    const close = () => { if (t.classList.contains('out')) return; t.classList.add('out'); setTimeout(() => t.remove(), ms('--dur-kisa') + 30); };
    $('button', t).addEventListener('click', close);
    (kind === 'err' ? lists[1] : lists[0]).appendChild(t);
    const all = $$('.toasts .toast'); if (all.length > 3) all[0].remove();
    if (kind !== 'err') setTimeout(close, 5000);
  };
  $$('[data-toast]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.toast === 'err') toast('err', 'Liste yüklenemedi', "Bu dosya okunamadı. AKSİS'ten indirdiğin Excel dosyasını (.xlsx) seç.");
    else toast('ok', 'Düzeltme kaydedildi', 'Öğrencinin devam seviyesi yeniden hesaplandı.');
  }));

  /* Loading buttons keep their width while busy. */
  $$('[data-busy]').forEach(b => b.addEventListener('click', () => {
    if (b.getAttribute('aria-busy') === 'true') return;
    const label = $('.btn-label', b), before = label.textContent;
    b.style.minWidth = b.offsetWidth + 'px';
    b.setAttribute('aria-busy', 'true'); label.textContent = b.dataset.busy;
    setTimeout(() => { b.removeAttribute('aria-busy'); label.textContent = before; b.style.minWidth = ''; }, 1800);
  }));

  /* E-mail code: one input, six cells drawn behind it. Paste and autofill stay on. */
  $$('[data-otp]').forEach(otp => {
    const inp = $('.otp-in', otp), cells = $$('.otp-cells span', otp), msg = $('.msg', otp);
    let timer = 0;
    const render = () => {
      const v = inp.value;
      cells.forEach((c, i) => { c.textContent = v[i] || ''; c.classList.toggle('cur', i === Math.min(v.length, 5)); });
    };
    const say = (kind, html) => { msg.className = 'msg ' + kind; msg.innerHTML = html; restart(msg, 'in'); };
    inp.addEventListener('input', () => {
      const d = inp.value.replace(/\D/g, '').slice(0, 6);
      if (d !== inp.value) inp.value = d;
      clearTimeout(timer); otp.dataset.st = ''; inp.removeAttribute('aria-invalid'); msg.className = 'msg'; msg.textContent = '';
      render();
      if (d.length === 6) {
        say('busy', spin + '<span>Kod denetleniyor</span>');
        timer = setTimeout(() => {
          if (d === '246810') { otp.dataset.st = 'ok'; say('ok', icon('check') + '<span>Kod doğru. Giriş yapılıyor.</span>'); }
          else { otp.dataset.st = 'err'; inp.setAttribute('aria-invalid', 'true'); say('err', icon('error') + '<span>Kod tutmadı. Bu kodla 2 deneme daha yapabilirsin.</span>'); }
        }, 900);
      }
    });
    inp.addEventListener('focus', render); inp.addEventListener('blur', render);
    render();
  });

  $$('input[data-ind]').forEach(i => { i.indeterminate = true; });

  /* Switches */
  $$('[role="switch"]').forEach(sw => sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    sw.dispatchEvent(new CustomEvent('switchchange', { detail: on }));
  }));

  /* Reduced-motion preview: the page behaves as under prefers-reduced-motion (the CSS copy lives under html.rm). */
  const rmSw = $('[data-rm]');
  if (rmSw) rmSw.addEventListener('switchchange', e => { root.classList.toggle('rm', e.detail); replaceTabs(); });

  /* Single-choice rows (list demo) */
  $$('[data-pick-group]').forEach(g => {
    const rows = $$('[data-pick]', g);
    rows.forEach(r => r.addEventListener('click', () => rows.forEach(x => x.setAttribute('aria-pressed', String(x === r)))));
  });

  /* Tabs with a moving 2 px ink indicator; it follows wrapped rows too (offsetTop). */
  const tabsets = [];
  $$('[role="tablist"]').forEach(tl => {
    const tabs = $$('[role="tab"]', tl), ind = $('.tabs-ind', tl);
    const place = (t, animate) => {
      if (!ind || !t) return;
      const tf = 'translate(' + t.offsetLeft + 'px, ' + (t.offsetTop + t.offsetHeight - 2) + 'px) scaleX(' + (t.offsetWidth / 100) + ')';
      if (!animate) { ind.classList.add('no-anim'); ind.style.transform = tf; void ind.offsetWidth; ind.classList.remove('no-anim'); return; }
      ind.style.transform = tf;
      if (reduced()) ind.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-mikro'), easing: ease('--ease-mikro') });
    };
    const select = (t, focus) => {
      tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        const p = x.getAttribute('aria-controls') && document.getElementById(x.getAttribute('aria-controls'));
        if (p) { p.hidden = !on; if (on) restart(p, 'in'); }
      });
      place(t, true);
      if (focus) t.focus();
      tl.dispatchEvent(new CustomEvent('tabchange', { detail: t }));
    };
    tabs.forEach(t => t.addEventListener('click', () => select(t)));
    tl.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n >= 0) { e.preventDefault(); select(tabs[n], true); }
    });
    const cur = () => tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    tabsets.push(() => place(cur(), false));
    place(cur(), false);
  });
  function replaceTabs() { tabsets.forEach(f => f()); }
  window.addEventListener('resize', replaceTabs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(replaceTabs);

  /* Menus: opens from its trigger, arrow keys, Escape and outside click close it, focus returns. */
  $$('.menu-wrap').forEach(wrap => {
    const btn = $('[aria-haspopup="menu"]', wrap), menu = $('[role="menu"]', wrap), items = $$('[role="menuitem"]', menu);
    const isOpen = () => menu.dataset.open === 'true';
    const outside = e => { if (!wrap.contains(e.target)) close(false); };
    const open = idx => { menu.dataset.open = 'true'; btn.setAttribute('aria-expanded', 'true'); items[idx || 0].focus({ preventScroll: true }); document.addEventListener('pointerdown', outside, true); };
    const close = refocus => { menu.dataset.open = 'false'; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); if (refocus !== false) btn.focus({ preventScroll: true }); };
    btn.addEventListener('click', () => (isOpen() ? close() : open(0)));
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(0); }
      if (e.key === 'ArrowUp') { e.preventDefault(); open(items.length - 1); }
    });
    menu.addEventListener('keydown', e => {
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') close(false);
    });
    items.forEach(it => it.addEventListener('click', () => close()));
  });

  /* Dialogs: native dialog; enter with @keyframes, exit with data-closing, then close(). */
  $$('dialog.dlg').forEach(dlg => {
    let opener = null;
    const finish = () => { if (!dlg.hasAttribute('data-closing')) return; dlg.removeAttribute('data-closing'); dlg.close(); if (opener) opener.focus({ preventScroll: true }); };
    const shut = () => {
      if (!dlg.open || dlg.hasAttribute('data-closing')) return;
      dlg.setAttribute('data-closing', '');
      dlg.addEventListener('animationend', finish, { once: true });
      setTimeout(finish, ms('--dur-kisa') + 80);
    };
    $$('[data-dialog="' + dlg.id + '"]').forEach(b => b.addEventListener('click', () => { opener = b; dlg.showModal(); }));
    dlg.addEventListener('cancel', e => { e.preventDefault(); shut(); });
    dlg.addEventListener('click', e => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) shut();
    });
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', () => { shut(); if (b.hasAttribute('data-confirm')) setTimeout(() => toast('ok', 'Yoklama erken kapatıldı', 'İnternetsiz telefonlar bunu bilemez; o telefonlardaki kayıtlar beklemede kalır.'), ms('--dur-kisa')); }));
  });

  /* Phone: records screen with bottom sheet, offline band and in-phone toast */
  const rec = $('#ph-records');
  if (rec) {
    const sheet = $('.sheet', rec), scrim = $('.sheet-scrim', rec), main = $('.ph-main', rec), banner = $('.pbanner', rec);
    const opts = $$('.opt', sheet), smsg = $('.msg', sheet), recLine = $('[data-sheet-rec]', sheet), rule = $('[data-sheet-rule]', sheet);
    let opener = null;
    const ptoast = (text, ic, tone) => {
      const old = $('.ptoast', rec); if (old) old.remove();
      const t = document.createElement('div');
      t.className = 'ptoast'; t.setAttribute('role', 'status');
      t.innerHTML = '<svg class="ic ic20 ' + (tone || 'st-ulasti') + '" aria-hidden="true"><use href="#i20-' + (ic || 'check') + '"></use></svg><p></p><button class="icon-btn" type="button" aria-label="Kapat"><svg class="ic ic20" aria-hidden="true"><use href="#i20-close"></use></svg></button>';
      $('p', t).textContent = text;
      const close = () => { if (t.classList.contains('out')) return; t.classList.add('out'); setTimeout(() => t.remove(), ms('--dur-kisa') + 30); };
      $('button', t).addEventListener('click', close);
      rec.appendChild(t); setTimeout(close, 5000);
    };
    const choose = o => { opts.forEach(x => { x.setAttribute('aria-checked', String(x === o)); x.tabIndex = x === o ? 0 : -1; }); smsg.className = 'msg'; smsg.textContent = ''; };
    const openSheet = b => {
      opener = b;
      // The 3-day rule (plan.html#kararlar): it starts when the server decision reaches the phone, or when the lesson ends if there is no record.
      if (b.dataset.rec) recLine.textContent = b.dataset.rec;
      rule.textContent = b.dataset.karar === '0' ? rule.dataset.bekliyorText : rule.dataset.kararText;
      rec.classList.add('sheet-open'); sheet.removeAttribute('inert'); main.setAttribute('inert', ''); sheet.setAttribute('aria-hidden', 'false');
      const first = opts.find(o => o.getAttribute('aria-checked') === 'true') || opts[0];
      setTimeout(() => first.focus({ preventScroll: true }), 30);
    };
    const closeSheet = () => {
      rec.classList.remove('sheet-open'); sheet.setAttribute('inert', ''); main.removeAttribute('inert'); sheet.setAttribute('aria-hidden', 'true');
      smsg.className = 'msg'; smsg.textContent = '';
      if (opener) opener.focus({ preventScroll: true });
    };
    $$('[data-sheet-open]').forEach(b => b.addEventListener('click', () => openSheet(b)));
    scrim.addEventListener('click', closeSheet);
    $$('[data-sheet-close]', sheet).forEach(b => b.addEventListener('click', closeSheet));
    sheet.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
      const i = opts.indexOf(document.activeElement);
      if (i >= 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; opts[n].focus(); choose(opts[n]); }
      if (e.key === 'Tab') {
        const f = $$('button:not([disabled])', sheet).filter(x => x.tabIndex >= 0); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    opts.forEach(o => o.addEventListener('click', () => choose(o)));
    $('[data-sheet-send]', sheet).addEventListener('click', () => {
      if (!opts.some(o => o.getAttribute('aria-checked') === 'true')) {
        smsg.className = 'msg err'; smsg.innerHTML = icon('error') + '<span>Bir neden seç.</span>'; restart(smsg, 'in'); opts[0].focus(); return;
      }
      const off = rec.classList.contains('offline');
      closeSheet(); setTimeout(() => (off ? ptoast('Bildirimin telefonda; internet gelince gönderilir.', 'smartphone', 'st-tel') : ptoast('Bildirimin hocanın listesine düştü.', 'check')), ms('--dur-orta'));
    });

    const setBh = () => rec.style.setProperty('--bh', banner.offsetHeight + 'px');
    setBh(); window.addEventListener('resize', setBh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setBh);
    const tgl = $('[data-offline]');
    tgl.addEventListener('click', () => {
      const goOffline = !rec.classList.contains('offline');
      setBh();
      rec.classList.toggle('offline', goOffline);
      banner.setAttribute('aria-hidden', String(!goOffline));
      tgl.querySelector('.btn-label').textContent = goOffline ? 'İnterneti aç' : 'İnterneti kes';
      $$('[data-pending]', rec).forEach(p => {
        $$('[data-v]', p).forEach(s => { const sent = s.dataset.v === 'sent'; if (goOffline ? sent : !sent) s.setAttribute('data-off', ''); else s.removeAttribute('data-off'); });
      });
      if (!goOffline) setTimeout(() => ptoast('Bağlantı geri geldi. Bekleyen 2 kayıt gönderildi.', 'cloud_done'), ms('--dur-kisa'));
    });
  }

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

  /* Motion: a switch slows every replay down four times for inspection (lanes and the success moment). */
  let slow = 1;
  const slowSw = $('#slow-sw');
  if (slowSw) slowSw.addEventListener('switchchange', e => { slow = e.detail ? 4 : 1; });

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

  /* Röntgen: one switch grays every color that is not midnight blue on every drawn screen (a token swap, .xray),
     then pins the usage-map number on what remains. The share under each screen comes from coverage.json. */
  const xsw = $('[data-xray]');
  const xrTargets = () => $$('.device-screen, .pnl');
  const ROLE = { 1: 'birincil eylem', 4: 'seçim işareti', 5: 'işaretli kontrol', 6: 'anahtar rakam', 7: 'başarı ve Var', 8: 'ilerleme' };
  const clearPins = () => $$('.xr-pin, .xr-tag').forEach(p => p.remove());
  const pin = scr => {
    if (scr.querySelector('.pin')) return; // the annotated map screen carries its own numbers
    const sr = scr.getBoundingClientRect(), found = [];
    $$('[data-xr]', scr).forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < sr.top || r.top > sr.bottom) return;
      const n = el.dataset.xr; found.push(n);
      const p = document.createElement('span');
      p.className = 'xr-pin'; p.textContent = n; p.setAttribute('aria-hidden', 'true');
      p.style.left = Math.round(Math.min(Math.max(r.right - sr.left - 12, 4), sr.width - 24)) + 'px';
      p.style.top = Math.round(Math.min(Math.max(r.top - sr.top - 10, 4), sr.height - 24)) + 'px';
      scr.appendChild(p);
    });
    const tag = document.createElement('p');
    tag.className = 'xr-tag'; tag.setAttribute('aria-hidden', 'true');
    const uniq = [...new Set(found)].sort();
    tag.textContent = uniq.length ? 'Kalan gece mavisi: ' + uniq.map(n => n + ' ' + (ROLE[n] || '')).join(', ') : 'Kalan gece mavisi yok';
    scr.appendChild(tag);
  };
  const applyXray = on => {
    clearPins();
    xrTargets().forEach(s => s.classList.toggle('xray', on));
    if (on) requestAnimationFrame(() => xrTargets().forEach(pin));
  };
  if (xsw) {
    xsw.addEventListener('switchchange', e => applyXray(e.detail));
    window.addEventListener('resize', () => { if (xsw.getAttribute('aria-checked') === 'true') applyXray(true); });
  }

  /* Turkish casing, computed here (never typed): toLocaleUpperCase('tr-TR') against the locale-free calls. */
  $$('[data-case]').forEach(el => {
    const s = el.dataset.src, k = el.dataset.case;
    el.textContent = k === 'upper-tr' ? s.toLocaleUpperCase('tr-TR') : k === 'upper' ? s.toUpperCase() : k === 'lower-tr' ? s.toLocaleLowerCase('tr-TR') : s.toLowerCase();
  });

  /* Motion lanes */
  const run = lane => {
    const d = parseFloat(lane.dataset.ms) * slow;
    lane.style.setProperty('--d', d + 'ms');
    lane.style.setProperty('--e', lane.dataset.ease);
    lane.style.setProperty('--lw', lane.offsetWidth + 'px');
    restart(lane, 'run');
  };
  $$('[data-run]').forEach(b => b.addEventListener('click', () => run(document.getElementById(b.dataset.run))));
  $$('[data-run-all]').forEach(b => b.addEventListener('click', () => $$('.lane[data-ms]', document.getElementById(b.dataset.runAll)).forEach(run)));
})();
