// src/js/base.js · owner F1a (OWNERS.md)
// Opens and closes the page IIFE and holds its shared helpers ($, $$, reduced, ms, ease, num, restart, icon, spin, slow),
// the side navigation, press release, panel table cross-fades, accordions, page toasts, dialogs, switches, tabs and the
// Röntgen switch. Every duration and curve is read from the page's CSS variables (the token file and the interaction
// patterns, --motion-*), so script timing never drifts from the token file and follows reduced motion by itself.
// tools/lib/sources.js merges base, system and screens: every chunk starts with an "@order" marker line,
// and the chunks of all three files are joined in marker order, so the page sees one script in that order.
// Markers and this note never reach tasarim.html. To add code, extend a chunk, or start one with a free number
// between its neighbours.
/* @order 0100 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  // Reduced motion: the operating-system setting, or the page's own preview switch (html.rm).
  const reduced = () => mq.matches || root.classList.contains('rm');
  const rootStyle = getComputedStyle(root);
  // Motion and timing tokens are read from the page's CSS variables (live: html.rm and the media query are followed).
  const ms = name => { const v = rootStyle.getPropertyValue(name).trim(); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const ease = name => rootStyle.getPropertyValue(name).trim();
  const num = name => parseFloat(rootStyle.getPropertyValue(name));
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const icon = (name, size) => '<svg class="ic ic' + (size || 16) + '" aria-hidden="true"><use href="#i20-' + name + '"></use></svg>';
  // The loading mark: the same markup the build draws (tools/lib/controls.js), taken from the page.
  const spinEl = $('.spin');
  const spin = spinEl ? spinEl.outerHTML : '';

  /* Side navigation: the current section is marked and kept in view. On a narrow screen the bar scrolls sideways and the
     current link sits 16 px from the bar's own left edge (after the brand); on a wide screen the side bar scrolls up and
     down when the window is shorter than the list. Plan and Teknik are ordinary links. */
  const side = $('.side');
  const navLinks = $$('.side-nav a[href^="#"]');
  const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const setCurrent = a => {
    navLinks.forEach(x => x.removeAttribute('aria-current'));
    a.setAttribute('aria-current', 'true');
    const nav = a.parentElement, behavior = reduced() ? 'auto' : 'smooth';
    const nr = nav.getBoundingClientRect(), ar = a.getBoundingClientRect();
    if (nav.scrollWidth > nav.clientWidth + 1) nav.scrollTo({ left: nav.scrollLeft + ar.left - nr.left - 16, behavior });
    else if (side && side.scrollHeight > side.clientHeight + 1) {
      const sr = side.getBoundingClientRect();
      if (ar.top < sr.top + 8 || ar.bottom > sr.bottom - 8) side.scrollTo({ top: side.scrollTop + ar.top - sr.top - sr.height / 2, behavior });
    }
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
  /* Phones are drawn at 360 dp in a 372 px frame (base.css .device). Where a column is narrower the whole phone is zoomed
     down, so its line breaks stay those of a 360 dp phone; a .ph-scale note under it, when there is one, gives the scale. */
  const fitDevices = () => $$('.device-fig').forEach(fig => {
    const dev = $('.device', fig), note = $('.ph-scale', fig);
    if (!dev) return;
    dev.style.zoom = '';
    const k = Math.min(1, fig.clientWidth / dev.offsetWidth);
    if (k < 1) dev.style.zoom = k.toFixed(4);
    if (note) { note.hidden = k >= 1; note.textContent = k < 1 ? '360 dp ekran, %' + Math.floor(k * 100) + ' ölçekle' : ''; }
  });
  fitDevices();
  let fitDevQueued = false;
  window.addEventListener('resize', () => { if (fitDevQueued) return; fitDevQueued = true; requestAnimationFrame(() => { fitDevQueued = false; fitDevices(); }); });
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && byId.get(e.target.id)) setCurrent(byId.get(e.target.id)); }), { rootMargin: '-35% 0px -60% 0px' });
  byId.forEach((a, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* Press release (Etkileşim tablosu, basma): for one press duration after a press ends, colors go back with the press
     timing (.rel) instead of the hover entry timing. */
  const PRESSABLE = 'button, a[href], [role=tab], [role=switch], [role=menuitem], [role=radio], label';
  const rel = el => { if (!el) return; el.classList.add('rel'); setTimeout(() => el.classList.remove('rel'), ms('--motion-press-exit-dur')); };
  let pressed = null;
  document.addEventListener('pointerdown', e => { pressed = e.target.closest && e.target.closest(PRESSABLE); }, true);
  const release = () => { const el = pressed; pressed = null; rel(el); };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  document.addEventListener('keyup', e => { if ((e.key === ' ' || e.key === 'Enter') && document.activeElement && document.activeElement.matches(PRESSABLE)) rel(document.activeElement); }, true);

  /* Panel tables (Etkileşim tablosu, tablo): sorting and filtering by pointer cross-fade the table body with the table
     pattern's timing. Before the sort button or a filter tab acts, a copy of the table as it was is laid over it; in the
     next frame, if the rows have changed, the copy fades out over the new rows and is removed. Its head is hidden, so
     the real head and its sort arrow stay in view. This is the only fade: any other animation on the real body is
     cancelled. A change made with the arrow keys, and any change under reduced motion, is instant (Hareket, Kurallar). */
  const xfade = table => {
    const box = table && table.parentElement, body = table && table.tBodies[0];
    if (!box || !body || reduced()) return;
    const before = [...body.rows].map(r => [r, r.hidden]);
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    const ghost = table.cloneNode(true);
    ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true; ghost.classList.add('xf-ghost');
    ghost.style.left = table.offsetLeft + 'px'; ghost.style.top = table.offsetTop + 'px'; ghost.style.width = table.offsetWidth + 'px';
    box.appendChild(ghost);
    requestAnimationFrame(() => {
      const rows = [...body.rows];
      body.getAnimations().forEach(a => a.cancel());
      if (rows.length === before.length && rows.every((r, i) => r === before[i][0] && r.hidden === before[i][1])) { ghost.remove(); return; }
      const a = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms('--motion-table-enter-dur'), easing: ease('--motion-table-enter-ease'), fill: 'forwards' });
      a.onfinish = a.oncancel = () => ghost.remove();
    });
  };
  const xfTable = t => { const el = t && t.closest && t.closest('.pnl [data-sort], .pnl [role="tab"]'); const p = el && el.closest('.pnl'); return p ? $('table', p) : null; };
  document.addEventListener('click', e => { if (e.detail === 0) return; const tb = xfTable(e.target); if (tb) xfade(tb); }, true);
  // A change made with the keyboard (Enter or Space on the sort button or a tab, the arrow keys on the tabs) is instant:
  // whatever the page's own listeners started on the table body for it is cancelled once they have run.
  const still = t => { const tb = xfTable(t); if (tb && tb.tBodies[0]) tb.tBodies[0].getAnimations().forEach(a => a.cancel()); };
  document.addEventListener('click', e => { if (e.detail === 0) still(e.target); });

  /* Accordions (Etkileşim tablosu, akordeon): every details element. The content is wrapped in .det > .det-i > .det-c;
     opening lays the body out closed (data-shut, 0fr), opens it and lets it grow to 1fr while the content fades in and
     the arrow turns; closing sets data-shut again and removes [open] when the body has shrunk. A click during either
     reverses it. The timing is the accordion pattern's (--motion-accordion-*); under reduced motion it makes the height
     and the arrow instant and fades the content in dur.mikro. Without this script the browser's own details still works. */
  const detBody = d => {
    let b = d.querySelector(':scope > .det');
    if (b) return b;
    const s = d.querySelector(':scope > summary');
    b = document.createElement('div'); b.className = 'det';
    const i = document.createElement('div'); i.className = 'det-i';
    const c = document.createElement('div'); c.className = 'det-c';
    [...d.childNodes].filter(n => n !== s).forEach(n => c.appendChild(n));
    i.appendChild(c); b.appendChild(i); d.appendChild(b);
    return b;
  };
  $$('details').forEach(d => {
    const s = d.querySelector(':scope > summary');
    if (!s) return;
    const b = detBody(d);
    let timer = 0, raf = 0;
    const finish = () => { clearTimeout(timer); if (!d.hasAttribute('data-shut')) return; d.removeAttribute('data-shut'); d.open = false; };
    s.addEventListener('click', e => {
      e.preventDefault();
      clearTimeout(timer);
      if (raf) { cancelAnimationFrame(raf); raf = 0; d.removeAttribute('data-shut'); d.removeAttribute('data-still'); d.open = false; return; } // clicked again before it began to open
      if (d.open && !d.hasAttribute('data-shut')) {
        d.setAttribute('data-shut', '');
        const t = ms('--motion-accordion-exit-dur');
        if (!t) { finish(); return; }
        timer = setTimeout(finish, t + 60);
      } else if (d.hasAttribute('data-shut') && d.open) {
        d.removeAttribute('data-shut');
      } else {
        // The content of a closed details element keeps whatever style it last had, so the body is first drawn closed
        // without a transition (data-still) for one frame, then set free in the next: it always grows from 0fr.
        d.setAttribute('data-shut', ''); d.setAttribute('data-still', '');
        d.open = true;
        raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => { raf = 0; d.removeAttribute('data-still'); d.removeAttribute('data-shut'); }); });
      }
    });
    b.addEventListener('transitionend', e => { if (e.target === b && e.propertyName === 'grid-template-rows' && d.hasAttribute('data-shut')) finish(); });
  });

  /* Toasts (panel): native live regions, no library. Success goes to role=status and closes after time.bildirim; the time
     stops while the pointer or the focus is on the toast and goes on from where it stopped. Errors go to role=alert and
     stay until closed. At most component.toast.max; a new one goes under the others. */
  const lists = $$('.toasts .toast-list');
  // A timer that can stop and go on: start(), pause(), resume().
  const lifetime = (t, close) => {
    let left = ms('--time-bildirim'), started = 0, id = 0;
    const run = () => { started = Date.now(); id = setTimeout(close, left); };
    const pause = () => { if (!id) return; clearTimeout(id); id = 0; left -= Date.now() - started; };
    const resume = () => { if (id || t.classList.contains('out') || t.matches(':hover, :focus-within')) return; run(); };
    t.addEventListener('pointerenter', pause); t.addEventListener('focusin', pause);
    t.addEventListener('pointerleave', resume); t.addEventListener('focusout', () => setTimeout(resume, 0));
    run();
  };
  const toast = (kind, title, text) => {
    const t = document.createElement('div');
    t.className = 'toast';
    const ic = kind === 'err' ? '<svg class="ic ic20 st-danger" aria-hidden="true"><use href="#i20-error"></use></svg>' : '<svg class="ic ic20 st-ulasti" aria-hidden="true"><use href="#i20-check"></use></svg>';
    t.innerHTML = ic + '<div><p class="tt"></p><p class="tx"></p></div><button class="btn btn-ghost btn-icon" type="button" aria-label="Kapat"><svg class="ic ic20" aria-hidden="true"><use href="#i20-close"></use></svg></button>';
    $('.tt', t).textContent = title; $('.tx', t).textContent = text;
    const close = () => { if (t.classList.contains('out')) return; t.classList.add('out'); setTimeout(() => t.remove(), ms('--motion-toast-exit-dur') + 30); };
    $('button', t).addEventListener('click', close);
    (kind === 'err' ? lists[1] : lists[0]).appendChild(t);
    const all = $$('.toasts .toast'); if (all.length > num('--component-toast-max')) all[0].remove();
    if (kind !== 'err') lifetime(t, close);
  };
  $$('[data-toast]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.toast === 'err') toast('err', 'Liste yüklenemedi', "Bu dosya okunamadı. AKSİS'ten indirdiğin Excel dosyasını (.xlsx) seç.");
    else toast('ok', 'Düzeltme kaydedildi', 'Öğrencinin devam seviyesi yeniden hesaplandı.');
  }));

/* @order 0300 */
  /* Switches */
  $$('[role="switch"]').forEach(sw => sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    sw.dispatchEvent(new CustomEvent('switchchange', { detail: on }));
  }));

/* @order 0500 */
  /* Tabs (Etkileşim tablosu, sekme): the indicator slides to the chosen tab and the content fades in when a tab is
     clicked; chosen with the arrow keys, Home or End, the indicator appears in its new place and the content shows at
     once (Hareket, Kurallar). The indicator follows wrapped rows too (offsetTop). */
  const tabsets = [];
  $$('[role="tablist"]').forEach(tl => {
    const tabs = $$('[role="tab"]', tl), ind = $('.tabs-ind', tl);
    const place = (t, animate) => {
      if (!ind || !t) return;
      const tf = 'translate(' + t.offsetLeft + 'px, ' + (t.offsetTop + t.offsetHeight - ind.offsetHeight) + 'px) scaleX(' + (t.offsetWidth / 100) + ')';
      if (!animate) { ind.classList.add('no-anim'); ind.style.transform = tf; void ind.offsetWidth; ind.classList.remove('no-anim'); return; }
      ind.style.transform = tf;
      if (reduced()) ind.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--motion-tab-indicator-enter-dur'), easing: ease('--motion-tab-indicator-enter-ease') });
    };
    const select = (t, byKey) => {
      tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        const p = x.getAttribute('aria-controls') && document.getElementById(x.getAttribute('aria-controls'));
        if (p) { p.hidden = !on; p.classList.remove('in'); if (on && !byKey) restart(p, 'in'); }
      });
      place(t, !byKey);
      if (byKey) t.focus();
      tl.dispatchEvent(new CustomEvent('tabchange', { detail: t }));
      if (byKey) still(t);
    };
    tabs.forEach(t => t.addEventListener('click', e => select(t, e.detail === 0)));
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

/* @order 0700 */
  /* Dialogs: native dialog; enter with @keyframes, exit with data-closing, then close(); the dialog pattern's timing.
     Focus returns to the opener; when a menu item opened the dialog, to the menu's trigger. A confirm button may leave
     a toast (data-toast-ok="title|text"). */
  $$('dialog.dlg').forEach(dlg => {
    let opener = null;
    const finish = () => { if (!dlg.hasAttribute('data-closing')) return; dlg.removeAttribute('data-closing'); dlg.close(); if (opener) opener.focus({ preventScroll: true }); };
    const shut = () => {
      if (!dlg.open || dlg.hasAttribute('data-closing')) return;
      dlg.setAttribute('data-closing', '');
      dlg.addEventListener('animationend', finish, { once: true });
      setTimeout(finish, ms('--motion-dialog-exit-dur') + 80);
    };
    $$('[data-dialog="' + dlg.id + '"]').forEach(b => b.addEventListener('click', () => {
      const menu = b.closest('[role="menu"]');
      opener = menu ? document.querySelector('[aria-controls="' + menu.id + '"]') : b;
      dlg.showModal();
    }));
    dlg.addEventListener('cancel', e => { e.preventDefault(); shut(); });
    dlg.addEventListener('click', e => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) shut();
    });
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', () => {
      shut();
      const t = b.dataset.toastOk;
      if (t) setTimeout(() => toast('ok', t.split('|')[0], t.split('|')[1] || ''), ms('--motion-dialog-exit-dur'));
    }));
  });

/* @order 1000 */
  /* Motion: a switch slows every replay down four times for inspection (lanes and the success moment). */
  let slow = 1;
  const slowSw = $('#slow-sw');
  if (slowSw) slowSw.addEventListener('switchchange', e => { slow = e.detail ? 4 : 1; });

/* @order 1200 */
  /* Röntgen: one switch grays every color that is not midnight blue on every drawn screen (a token swap, .xray),
     then pins the usage-map number on what remains. The caption that names the remaining roles goes under the screen,
     into its caption (after the title line), so it never covers the screen's own header. Pins are placed in the
     screen's own pixels: on a zoomed screen (a phone in a narrow column, the panel) the viewport offsets are divided by
     the zoom. The screens of Telefon ekranları and Panel ekranı are still corrected by src/js/screens.js; they are left
     to it here until that code goes, so no pin is divided twice. The share under each screen comes from coverage.json. */
  const xsw = $('[data-xray]');
  const xrTargets = () => $$('.device-screen, .pnl');
  const ROLE = { 1: 'birincil eylem', 4: 'seçim işareti', 5: 'işaretli kontrol', 6: 'anahtar rakam', 7: 'başarı ve Var', 8: 'ilerleme' };
  const clearPins = () => $$('.xr-pin, .xr-tag').forEach(p => p.remove());
  const xrCaption = scr => { const fig = scr.closest('.device-fig'); return fig ? $('.device-cap', fig) : scr.closest('#panel') ? $('#panel .panel-cap') : null; };
  const correctedElsewhere = scr => scr.matches('#ekranlar .device-screen, #panel .pnl');
  const pin = scr => {
    if (scr.querySelector('.pin')) return; // the annotated map screen carries its own numbers
    const sr = scr.getBoundingClientRect(), found = [];
    const z = correctedElsewhere(scr) ? 1 : (sr.width / scr.offsetWidth) || 1;
    $$('[data-xr]', scr).forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < sr.top || r.top > sr.bottom) return;
      const n = el.dataset.xr; found.push(n);
      const p = document.createElement('span');
      p.className = 'xr-pin'; p.textContent = n; p.setAttribute('aria-hidden', 'true');
      p.style.left = Math.round(Math.min(Math.max(r.right - sr.left - 12, 4), sr.width - 24) / z) + 'px';
      p.style.top = Math.round(Math.min(Math.max(r.top - sr.top - 10, 4), sr.height - 24) / z) + 'px';
      scr.appendChild(p);
    });
    const tag = document.createElement('p');
    tag.className = 'xr-tag'; tag.setAttribute('aria-hidden', 'true');
    const uniq = [...new Set(found)].sort();
    tag.textContent = uniq.length ? 'Kalan gece mavisi: ' + uniq.map(n => n + ' ' + (ROLE[n] || '')).join(', ') : 'Kalan gece mavisi yok';
    const cap = xrCaption(scr);
    if (cap) cap.insertBefore(tag, cap.children[1] || null); else scr.appendChild(tag);
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

/* @order 1500 */
})();
