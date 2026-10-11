// src/js/system.js · owner F1a (OWNERS.md)
// Behaviour that only system sections use: loading buttons, e-mail code, selection rows, reduced-motion preview,
// menus, the records screen of katmanlar, motion lanes. Its statements run inside the IIFE of base.js.
// tools/lib/sources.js merges base, system and screens: every chunk starts with an "@order" marker line,
// and the chunks of all three files are joined in marker order, so the page sees one script in that order.
// Markers and this note never reach tasarim.html. To add code, extend a chunk, or start one with a free number
// between its neighbours.
/* @order 0200 */
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

/* @order 0400 */
  /* Reduced-motion preview: the page behaves as under prefers-reduced-motion (the CSS copy lives under html.rm). */
  const rmSw = $('[data-rm]');
  if (rmSw) rmSw.addEventListener('switchchange', e => { root.classList.toggle('rm', e.detail); replaceTabs(); });

  /* Single-choice rows (list demo) */
  $$('[data-pick-group]').forEach(g => {
    const rows = $$('[data-pick]', g);
    rows.forEach(r => r.addEventListener('click', () => rows.forEach(x => x.setAttribute('aria-pressed', String(x === r)))));
  });

/* @order 0600 */
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

/* @order 0800 */
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

/* @order 1400 */
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
