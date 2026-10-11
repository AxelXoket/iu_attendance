// src/js/base.js · owner F1a (OWNERS.md)
// Opens and closes the page IIFE and holds its shared helpers ($, $$, reduced, ms, ease, restart, icon, spin, slow),
// the side navigation, page toasts, dialogs, switches, tabs and the Röntgen switch.
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

/* @order 0300 */
  /* Switches */
  $$('[role="switch"]').forEach(sw => sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    sw.dispatchEvent(new CustomEvent('switchchange', { detail: on }));
  }));

/* @order 0500 */
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

/* @order 0700 */
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

/* @order 1000 */
  /* Motion: a switch slows every replay down four times for inspection (lanes and the success moment). */
  let slow = 1;
  const slowSw = $('#slow-sw');
  if (slowSw) slowSw.addEventListener('switchchange', e => { slow = e.detail ? 4 : 1; });

/* @order 1200 */
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

/* @order 1500 */
})();
