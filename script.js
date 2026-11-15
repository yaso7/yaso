(() => {
  /* Settings and content (PHOTOS, FORM, RELEASES, COMPANIES, LAB, …) live in data.js.
     The ink shader lives in shader.js. Both load before this file. */
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch {} } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const moving = () => flags.motion && !reduce;

  /* ---------- photos ---------- */
  function loadPhoto(fig, src, fallback) {
    const img = $('img', fig); if (!img || !src) { fig.classList.add('empty'); return; }
    // optional fallback: if the first file is missing, try the second (and mark the figure so CSS can adapt)
    img.onerror = () => { if (fallback && img.getAttribute('src') !== fallback) { fig.classList.add('is-fallback'); img.src = fallback; } else fig.classList.add('empty'); };
    img.onload = () => fig.classList.remove('empty');
    img.src = src;
  }
  $$('[data-photo="portrait"]').forEach(f => loadPhoto(f, PHOTOS.portrait));
  $$('[data-photo="avatar"]').forEach(f => loadPhoto(f, PHOTOS.avatar, PHOTOS.portrait));
  (function strip() {
    const el = $('#strip'); let shown = 0;
    PHOTOS.strip.forEach(p => {
      const probe = new Image();
      probe.onload = () => {
        const f = document.createElement('figure'); f.className = 'ph reveal-in';
        f.innerHTML = `<img src="${esc(p.src)}" alt="${esc(p.cap)}" loading="lazy" decoding="async"><figcaption>${esc(p.cap)}</figcaption>`;
        el.appendChild(f); shown++; el.style.setProperty('--n', Math.min(shown, 3)); el.hidden = false; seeObs.observe(el);
      };
      probe.src = p.src;
    });
  })();
  // observe the parent: a clip-path on the figure itself hides it from IntersectionObserver
  const seeObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('.reveal-in', e.target).forEach(f => f.classList.add('seen')); } }), { threshold: .1 });
  $$('.reveal-in').forEach(f => seeObs.observe(f.parentElement));

  /* ---------- experience: releases (real work, real figures) ---------- */
  const relEl = $('#rels');
  relEl.innerHTML = RELEASES.map((r, i) => {
    const ph = PHOTOS.releases[r.v];
    return `
    <li class="rel" id="rel-${r.v.replace('.', '-')}"${i === 0 ? ' data-xc="ReleaseRow" data-xr="rendered from one array of real projects" data-xt="click for the before → after"' : ''}>
      <button class="rel-head" type="button" aria-expanded="false" aria-controls="diff${i}" data-label="Diff">
        <span class="ver">${r.v}</span>
        <span class="rel-title"><span class="label">${r.date} · ${r.area}</span><b>${r.title}</b></span>
        <ul class="changes">${r.changes.map(([k, t]) => `<li><span class="k ${k}">${k === 'add' ? 'Added' : k === 'chg' ? 'Changed' : 'Fixed'}</span><span>${t}</span></li>`).join('')}</ul>
        <span class="diff-btn" aria-hidden="true">± Diff</span>
      </button>
      <div class="diff" id="diff${i}"><div><div class="diff-in"><div class="diff-body">
        <div class="diff-box">
          <header><span>impact · before → after</span><span>${r.date}</span></header>
          ${r.diff.map(([m, a, b]) => `<div class="l m"><span>−</span><span>${m}: ${a}</span></div><div class="l p"><span>+</span><span>${m}: ${b}</span></div>`).join('')}
        </div>
        ${ph ? `<figure class="ph" data-src="${esc(ph)}" hidden><img alt="${esc(r.title)}" loading="lazy" decoding="async"></figure>` : ''}
      </div></div></div></div>
    </li>`; }).join('');
  // release photos: shown only if the file exists
  $$('.diff-body .ph', relEl).forEach(f => {
    const img = $('img', f);
    img.onload = () => { f.hidden = false; f.parentElement.classList.add('has-ph'); };
    img.src = f.dataset.src;
  });
  function toggleRel(li, open) {
    const b = $('.rel-head', li);
    open = open ?? !li.classList.contains('is-open');
    li.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    $('.diff-btn', li).textContent = open ? '× Close' : '± Diff';
  }
  $$('.rel', relEl).forEach(li => {
    const b = $('.rel-head', li);
    b.addEventListener('click', () => { toggleRel(li); pulse(b); });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault(); const all = $$('.rel-head', relEl); const k = all.indexOf(b) + (e.key === 'ArrowDown' ? 1 : -1);
      all[(k + all.length) % all.length].focus();
    });
  });

  /* ---------- experience: by company ---------- */
  const mi = s => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); };
  const today = new Date(); const NOW = today.getFullYear() * 12 + today.getMonth();
  const A0 = mi('2022-01'), A1 = Math.max(NOW + 1, mi('2027-01'));
  const pos = m => ((m - A0) / (A1 - A0) * 100).toFixed(3) + '%';
  const span = (a, b) => ((b - a) / (A1 - A0) * 100).toFixed(3) + '%';
  const fmtDur = m => { const y = Math.floor(m / 12), r = m % 12; return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', r ? `${r} mo` : ''].filter(Boolean).join(' ') || '< 1 mo'; };
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtM = s => { const [y, m] = s.split('-').map(Number); return `${MON[m - 1]} ${y}`; };
  const years = []; for (let y = 2022; y * 12 < A1; y++) years.push(y);
  $('#ticks').innerHTML = years.map(y => `<span style="left:${pos(y * 12)}">${y}</span>`).join('');
  const yrLines = years.slice(1).map(y => `<i class="yr" style="left:${pos(y * 12)}"></i>`).join('');
  $('#tlrows').innerHTML = COMPANIES.map((c, i) => {
    const s = mi(c.start), e = c.end ? mi(c.end) : NOW, live = !c.end;
    let bars;
    if (c.kind === 'split') { const k = mi(c.splitAt); bars = `<span class="bar part" style="left:${pos(s)};width:${span(s, k)}"></span><span class="bar now${live ? ' live' : ''}" style="left:${pos(k)};width:${span(k, e)}"></span>`; }
    else bars = `<span class="bar ${c.kind === 'part' ? 'part' : ''} ${live ? 'now live' : ''}" style="left:${pos(s)};width:${span(s, e)}"></span>`;
    return `<div class="tl-row" id="co-${c.id}">
      <button class="tl-row-head" type="button" aria-expanded="false" aria-controls="com${i}" data-label="Details">
        <span class="org"><b>${c.org}</b><span>${c.role}</span></span>
        <span class="track" aria-hidden="true">${yrLines}${bars}</span>
        <span class="dur"><b>${fmtDur(e - s)}</b><span>${fmtM(c.start)} – ${c.end ? fmtM(c.end) : 'now'}</span></span>
      </button>
      <div class="tl-more" id="com${i}"><div><div class="tl-more-in">
        <div class="meta"><span class="label">${c.type} · ${c.place}</span>${c.rel ? `<button class="jump" type="button" data-rel="${c.rel}" data-label="Jump">See ${c.rel} in the changelog →</button>` : ''}</div>
        <ul>${c.notes.map(n => `<li>${n}</li>`).join('')}</ul>
      </div></div></div>
    </div>`; }).join('');
  const totalM = NOW - A0;
  $('#tlsum').innerHTML = `
    <div><b>${fmtDur(totalM)}</b><span class="label">shipping since Jan 2022</span></div>
    <div><b>${COMPANIES.length - 1}</b><span class="label">companies, several in parallel</span></div>
    <div><b>${COMPANIES.filter(c => c.place === 'Remote').length}</b><span class="label">remote engagements</span></div>`;
  $$('.tl-row').forEach(row => {
    const b = $('.tl-row-head', row);
    b.addEventListener('click', () => { const o = !row.classList.contains('is-open'); row.classList.toggle('is-open', o); b.setAttribute('aria-expanded', String(o)); pulse(b); });
  });
  $$('.jump').forEach(j => j.addEventListener('click', () => {
    setView('log');
    const li = $('#rel-' + j.dataset.rel.replace('.', '-'));
    toggleRel(li, true);
    requestAnimationFrame(() => li.scrollIntoView({ behavior: moving() ? 'smooth' : 'auto', block: 'center' }));
    pulse(li);
  }));
  const tlObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('pre'); tlObs.unobserve(e.target); } }), { threshold: .2 });
  function setView(v, origin) {
    $$('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    $('#view-log').classList.toggle('is-on', v === 'log');
    $('#view-co').classList.toggle('is-on', v === 'co');
    $('#exproute').textContent = `GET /experience?view=${v === 'log' ? 'changelog' : 'company'}`;
    if (v === 'co') { const tl = $('#tl'); if (moving()) { tl.classList.add('pre'); tlObs.observe(tl); } else tl.classList.remove('pre'); }
    store.set('yusra-view', v);
    if (origin) pulse(origin);
    setTimeout(onScroll, 50);
  }
  $$('[data-view]').forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.view, b));
    b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const o = $$('[data-view]').find(x => x !== b); o.focus(); setView(o.dataset.view, o); } });
  });

  /* ---------- lab: list + live preview ---------- */
  let labSel = 0, labVer = 'with', labLive = false;
  const labList = $('#lablist'), frame = $('#labframe'), screen = $('#screen');
  labList.innerHTML = LAB.map((l, i) => `<li${i === 0 ? ' class="is-on"' : ''}><button class="lab-pick" type="button" data-i="${i}" data-label="Preview" aria-pressed="${i === 0}"><span class="n">0${i + 1}</span><b>${l.name}</b><span class="arrow">→</span><p>${l.brief}</p></button></li>`).join('');
  const labFile = () => `lab/${LAB[labSel].id}-${labVer === 'with' ? 'with-skill' : 'without'}.html`;
  function fitFrame() { const w = screen.clientWidth; frame.style.transform = `scale(${w / 1440})`; }
  function loadLab() {
    const f = labFile();
    $('#laburl').innerHTML = `lab/<b>${f.slice(4, -5)}</b>.html`;
    $('#labopen').href = $('#labopen2').href = f;
    $('#labnote').textContent = `${LAB[labSel].name} · same brief, same agent · ${labVer === 'with' ? 'with the skill' : 'without the skill'}`;
    $$('li', labList).forEach((li, i) => { li.classList.toggle('is-on', i === labSel); $('button', li).setAttribute('aria-pressed', String(i === labSel)); });
    $$('[data-ver]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ver === labVer)));
    if (!labLive) return;
    frame.classList.remove('ready'); $('#labwait').hidden = false;
    frame.src = f;
  }
  frame.addEventListener('load', () => { if (frame.src && !frame.src.endsWith('about:blank')) { frame.classList.add('ready'); $('#labwait').hidden = true; } });
  $$('.lab-pick', labList).forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; if (i === labSel) return; labSel = i; loadLab(); pulse(b); }));
  $$('[data-ver]').forEach(b => b.addEventListener('click', () => { if (b.dataset.ver === labVer) return; labVer = b.dataset.ver; loadLab(); pulse(b); }));
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !labLive) { labLive = true; fitFrame(); loadLab(); }
    else if (!e.isIntersecting && labLive) { labLive = false; frame.src = 'about:blank'; frame.classList.remove('ready'); }
  }), { rootMargin: '200px 0px' }).observe($('#lab'));
  new ResizeObserver(fitFrame).observe(screen);
  loadLab();

  /* ---------- headline: name first, per-character width ---------- */
  const h1 = $('#headline'); let chars = [];
  function buildHeadline(key, animate) {
    const lines = VARIANTS[key]; let i = 0;
    h1.setAttribute('aria-label', key === 'A' ? 'Yusra Malas' : lines.join(' '));
    h1.classList.toggle('long', key === 'B');
    $('#verbline').hidden = key === 'B';
    h1.innerHTML = lines.map(line => `<span class="ln" aria-hidden="true">${line.split(' ').map(w =>
      `<span class="w">${[...w].map(c => `<span class="ch" style="--i:${i++}">${c}</span>`).join('')}</span>`).join(' ')}</span>`).join('');
    chars = $$('.ch', h1).map(el => ({ el, w: 62, cx: 0, cy: 0 }));
    measure();
    if (animate && moving()) { h1.classList.remove('swap'); void h1.offsetWidth; h1.classList.add('swap'); setTimeout(() => h1.classList.remove('swap'), 1400); }
  }
  function measure() { chars.forEach(c => { const r = c.el.getBoundingClientRect(); c.cx = r.left + r.width / 2; c.cy = r.top + r.height / 2 + scrollY; }); }
  document.fonts?.ready?.then(measure);
  document.fonts?.addEventListener?.('loadingdone', measure); // stylesheet may arrive after 'ready'

  /* ---------- the verb: click to see what else I do ---------- */
  let vi = 0, verbClicks = 0;
  const verbEl = $('#verb');
  function setVerb(i, animate) {
    vi = (i + VERBS.length) % VERBS.length; const w = VERBS[vi];
    verbEl.innerHTML = [...w].map((c, k) => `<span class="vc" style="--i:${k}">${c}</span>`).join('');
    if (!animate || !moving()) $$('.vc', verbEl).forEach(s => s.style.animation = 'none');
    verbEl.setAttribute('aria-label', `Change the verb. Current: ${w}`);
    $('#verbn').textContent = `${vi + 1}/${VERBS.length}`;
  }
  verbEl.addEventListener('click', () => {
    setVerb(vi + 1, true); pulse(verbEl);
    if (++verbClicks === 3) $('#verbhint').firstChild.textContent = '';
  });
  setVerb(0, false);

  /* ---------- pointer ---------- */
  const P = { x: -999, y: -999, nx: .3, ny: .1, v: 0, has: false };
  addEventListener('pointermove', e => {
    if (P.has) P.v = Math.hypot(e.clientX - P.x, e.clientY - P.y);
    P.x = e.clientX; P.y = e.clientY; P.has = true;
    P.nx = e.clientX / innerWidth * 2 - 1; P.ny = -(e.clientY / innerHeight * 2 - 1);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { P.has = false; });
  // "hovering" drives the themes' hover effects: on while a pointer is over the page, off when the
  // mouse leaves or a finger lifts (so a phone doesn't keep a hover spot where you last touched).
  let hovering = false;
  addEventListener('pointermove', () => { hovering = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { hovering = false; });
  ['pointerup', 'pointercancel'].forEach(ev => addEventListener(ev, e => { if (e.pointerType !== 'mouse') hovering = false; }, { passive: true }));

  /* ---------- flags ---------- */
  const flags = { hero_variant: false, x_ray: false, dense_mode: false, motion: !reduce, dark_launch: false };
  try { Object.assign(flags, JSON.parse(store.get('yusra-flags') || '{}')); } catch {}
  if (reduce) flags.motion = false;
  const flagEls = $$('[data-flag]');
  const xtip = $('.xtip');
  function applyFlags(changed) {
    root.classList.toggle('xray', flags.x_ray);
    root.classList.toggle('dense', flags.dense_mode);
    root.classList.toggle('no-motion', !flags.motion);
    $('#next').hidden = !flags.dark_launch;
    flagEls.forEach(b => {
      const on = !!flags[b.dataset.flag];
      b.setAttribute('aria-checked', String(on));
      if (b.dataset.flag === 'hero_variant') { const [a, bb] = $$('i', b); a.classList.toggle('on', !on); bb.classList.toggle('on', on); }
    });
    $('#flagcount').textContent = `${Object.values(flags).filter(Boolean).length}/5 on`;
    if (changed === 'hero_variant' || changed === undefined) buildHeadline(flags.hero_variant ? 'B' : 'A', changed === 'hero_variant');
    if (changed === 'dense_mode' || changed === 'dark_launch') setTimeout(measure, 500);
    if (!flags.x_ray) xtip.classList.remove('is-on');
    store.set('yusra-flags', JSON.stringify(flags));
    dirty = true;
  }
  function setFlag(k, v, origin) { flags[k] = v ?? !flags[k]; applyFlags(k); if (origin) pulse(origin); }
  flagEls.forEach(b => b.addEventListener('click', () => setFlag(b.dataset.flag, undefined, b)));
  const flagWrap = $('#flags'), flagBtn = $('#flagbtn');
  function panel(open) { open = open ?? !flagWrap.classList.contains('is-open'); flagWrap.classList.toggle('is-open', open); flagBtn.setAttribute('aria-expanded', String(open)); }
  flagBtn.addEventListener('click', () => panel());
  $('#openflags').addEventListener('click', () => { panel(true); flagEls[1].focus(); pulse(flagBtn); });
  document.addEventListener('click', e => { if (!flagWrap.contains(e.target) && e.target.id !== 'openflags') panel(false); });

  /* ---------- x-ray tooltip ---------- */
  document.addEventListener('pointerover', e => {
    if (!flags.x_ray) return;
    const el = e.target.closest('[data-xc]');
    if (!el) { xtip.classList.remove('is-on'); return; }
    $('#xc').textContent = el.dataset.xc; $('#xr').textContent = '→ ' + el.dataset.xr;
    $('#xt').textContent = el.dataset.xt && el.dataset.xt !== '—' ? '→ ' + el.dataset.xt : '';
    xtip.classList.add('is-on');
    if (!fine) { const r = el.getBoundingClientRect(); placeTip(r.left, r.bottom + 8); }
  });
  function placeTip(x, y) {
    const w = xtip.offsetWidth, h = xtip.offsetHeight;
    xtip.style.transform = `translate3d(${Math.min(x, innerWidth - w - 12)}px,${Math.min(y, innerHeight - h - 12)}px,0)`;
  }

  /* ---------- contact: email up front ---------- */
  const copyBtn = $('#copy');
  copyBtn.addEventListener('click', () => {
    pulse(copyBtn);
    const done = ok => { copyBtn.textContent = ok ? 'Copied ✓' : 'Select the address'; setTimeout(() => copyBtn.textContent = 'Copy email', 1700); };
    try { navigator.clipboard.writeText(MY_EMAIL).then(() => done(true), () => done(false)); } catch { done(false); }
  });

  /* ---------- contact: stepped request ---------- */
  const flow = $('#flow'), idle = $('#idle');
  $('#opts').innerHTML = NEEDS.map((n, i) => `<label class="opt" data-label="Select"><input type="checkbox" name="need" value="${esc(n)}" id="need${i}"><span>${esc(n)}</span></label>`).join('');
  const panes = $$('.pane', flow), stepLis = $$('#flowsteps li');
  let step = 1;
  const picked = () => $$('input[name="need"]:checked', flow).map(x => x.value);
  let wasSent = false;
  function go(n, dir = 1) {
    step = n;
    panes.forEach(p => { const on = +p.dataset.pane === n; p.hidden = !on; if (on) { p.classList.toggle('back', dir < 0); p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; } });
    const merged = n === 3 && wasSent;
    stepLis.forEach((li, i) => { li.classList.toggle('done', i + 1 < n || merged); li.classList.toggle('cur', i + 1 === n && !merged);
      if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    stepLis[2].textContent = n === 3 && !wasSent ? '03 · Send by email' : '03 · Merged';
    const first = $(`.pane[data-pane="${n}"] input, .pane[data-pane="${n}"] button`, flow);
    if (n === 2) setTimeout(() => $('#reqemail').focus({ preventScroll: true }), 60);
    else if (n === 3) $('#donebox').focus({ preventScroll: true }); // read the result first, not a button
    else if (first) first.focus({ preventScroll: true });
  }
  function updatePick() {
    const p = picked();
    $('#pickcount').textContent = p.length ? `${p.length} selected` : 'Pick at least one';
    $('[data-next]', flow).disabled = !p.length;
  }
  flow.addEventListener('change', e => { if (e.target.name === 'need') { updatePick(); pulse(e.target.closest('.opt')); } });
  $('#start').addEventListener('click', () => {
    idle.hidden = true; flow.hidden = false; updatePick(); go(1);
    pulse($('#contactright'));
  });
  $('[data-cancel]', flow).addEventListener('click', () => { flow.hidden = true; idle.hidden = false; $('#start').focus(); });
  $('[data-next]', flow).addEventListener('click', e => {
    if (!picked().length) return;
    $('#picked').innerHTML = picked().map(p => `<span class="chip">${esc(p)}</span>`).join('');
    go(2); pulse(e.currentTarget);
  });
  $('[data-back]', flow).addEventListener('click', () => go(1, -1));
  const emailOK = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  $('#reqemail').addEventListener('input', () => { $('#emailfield').classList.remove('bad'); $('#reqemail').removeAttribute('aria-invalid'); $('#reqerr').textContent = ''; });
  flow.addEventListener('submit', async e => {
    e.preventDefault();
    if (step === 1) { $('[data-next]', flow).click(); return; }
    if (step !== 2) return;
    const email = $('#reqemail').value.trim();
    if (!emailOK(email)) { $('#emailfield').classList.add('bad'); $('#reqemail').setAttribute('aria-invalid', 'true'); $('#reqerr').textContent = 'That doesn\'t look like an email address yet.'; $('#reqemail').focus(); return; }
    const needs = picked();
    const send = $('#send'); send.disabled = true; send.textContent = 'Sending…';
    let sent = false;
    if (FORM.endpoint) {
      try {
        const res = await fetch(FORM.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, needs: needs.join(', '), website: $('#reqhp').value, _subject: `Portfolio request: ${needs.join(', ')}`, ...FORM.extra }) });
        sent = res.ok;
      } catch { sent = false; }
    }
    send.disabled = false; send.textContent = 'Send request →';
    wasSent = sent; renderDone(sent, email, needs);
    go(3); pulse(send);
  });
  function renderDone(sent, email, needs) {
    const lines = [['✓ scope: ' + needs.join(', '), 'ok'], ['✓ reply-to: ' + email, 'ok']];
    if (sent) {
      lines.push(['→ request merged. I\'ll contact you soon.', 'acc']);
      $('#donebox').innerHTML = `<div class="done-title"><i>✓</i><h3 style="margin:0">Your request is in.</h3></div>
        <p style="margin:12px 0 14px;max-width:40ch">Thanks. I'll read it and contact you soon at <b>${esc(email)}</b>.</p>
        <div class="term">${lines.map(([t, c], i) => `<div class="${c}" style="--i:${i}">${esc(t)}</div>`).join('')}</div>`;
    } else {
      // No endpoint, or it failed: say so honestly and hand the request to the visitor's email app.
      const body = `Hi Yusra,\n\nI'd like help with: ${needs.join(', ')}.\n\nReply to: ${email}\n`;
      const href = `mailto:${MY_EMAIL}?subject=${encodeURIComponent('Portfolio request: ' + needs.join(', '))}&body=${encodeURIComponent(body)}`;
      $('#donebox').innerHTML = `<h3 style="margin:0 0 10px">One last step</h3>
        <p style="margin:0 0 14px;max-width:42ch">The form couldn't send this by itself. Your request is ready below: send it from your email and I'll reply soon.</p>
        <div class="term">${lines.map(([t, c], i) => `<div class="${c}" style="--i:${i}">${esc(t)}</div>`).join('')}</div>
        <div class="flow-row" style="justify-content:flex-start;margin-top:12px"><a class="btn btn--accent" href="${href}" data-label="Email">Open in my email app ↗</a><span class="label">or write to ${MY_EMAIL}</span></div>`;
    }
  }
  $('[data-reset]', flow).addEventListener('click', () => {
    flow.reset(); updatePick(); $('#emailfield').classList.remove('bad'); $('#reqerr').textContent = ''; go(1, -1);
  });

  /* ---------- routes + rollout + process track ---------- */
  const sections = $$('[data-section]'), routeLinks = $$('.routes a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) routeLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
  const rollEl = $('#roll'), stepsEl = $('#steps'), stepItems = $$('.step', stepsEl), ptrack = $('.ptrack', stepsEl);
  const STAGE = [0, .25, .5, .75, 1];
  let scrollP = 0;
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollP = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    rollEl.textContent = Math.round((.05 + scrollP * .95) * 100) + '%';
    const r = stepsEl.getBoundingClientRect();
    const sp = Math.min(1, Math.max(0, (innerHeight * .75 - r.top) / (r.height + innerHeight * .25)));
    ptrack.style.setProperty('--prog', sp.toFixed(3));
    stepItems.forEach((s, i) => s.classList.toggle('done', sp >= STAGE[i] - .001 && sp > 0));
    dirty = true;
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- keyboard ---------- */
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { panel(false); return; }
    if (/^[1-7]$/.test(k)) { sections[+k - 1]?.scrollIntoView({ behavior: moving() ? 'smooth' : 'auto' }); return; }
    if (k === 'f') panel();
    else if (k === 'x') setFlag('x_ray', undefined, flagBtn);
    else if (k === 'a') setFlag('hero_variant', false, flagBtn);
    else if (k === 'b') setFlag('hero_variant', true, flagBtn);
    else if (k === 'd') setFlag('dense_mode', undefined, flagBtn);
    else if (k === 'm') setFlag('motion', undefined, flagBtn);
    else if (k === 't') applyTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length], flagBtn);
  });

  /* ---------- cursor ---------- */
  const cur = $('.cursor'), curT = $('.t', cur); let cx = 0, cy = 0;
  if (fine) {
    root.classList.add('has-cursor');
    document.addEventListener('pointerover', e => {
      const isText = !!e.target.closest('input[type="email"]');
      const link = !isText && e.target.closest('a,button,label.opt,[data-label]');
      cur.classList.toggle('is-text', isText);
      cur.classList.toggle('is-x', flags.x_ray && !!e.target.closest('[data-xc]'));
      cur.classList.toggle('is-link', !!link && !flags.x_ray);
      const label = link?.dataset?.label || ''; curT.textContent = label; cur.classList.toggle('has-label', !!label);
    });
  }

  /* ---------- ink field: raw WebGL, domain-warped noise, no libraries ---------- */
  const cv = $('#ink');
  let gl = null, U = {}, glOK = false, dirty = true;
  try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch {}
  glOK = inkInit(gl, U);
  let qual = 1, slow = 0; // adaptive resolution: only lowers on devices that stay under ~20 fps
  function sizeGL() {
    if (!glOK) return;
    const s = Math.min(devicePixelRatio || 1, 1.5) * .75 * qual;
    cv.width = Math.round(innerWidth * s); cv.height = Math.round(innerHeight * s);
    gl.viewport(0, 0, cv.width, cv.height); dirty = true;
  }
  const rip = { x: 0, y: 0, age: 9 };
  function pulse(el) {
    if (!el || !el.getBoundingClientRect) return; const r = el.getBoundingClientRect();
    rip.x = (r.left + r.width / 2) / innerWidth * 2 - 1; rip.y = -((r.top + r.height / 2) / innerHeight * 2 - 1); rip.age = 0; dirty = true;
  }
  addEventListener('pointerdown', e => { if (e.target.closest('a,button,label,input')) return;
    rip.x = e.clientX / innerWidth * 2 - 1; rip.y = -(e.clientY / innerHeight * 2 - 1); rip.age = 0; });
  let time = 0, mx = .3, my = .1, vel = 0, hov = 0;
  function drawInk(dt, live) {
    if (live) { time += dt; rip.age += dt; mx += (P.nx - mx) * .06; my += (P.ny - my) * .06; vel += (Math.min(P.v / 40, 1) - vel) * .05; P.v *= .9; hov += ((hovering ? 1 : 0) - hov) * .1; }
    else { rip.age = 9; mx = P.nx; my = P.ny; vel = 0; hov = 0; }
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uVel, vel); gl.uniform1f(U.uScroll, scrollP); gl.uniform1f(U.uHas, hov);
    gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uMouse, mx, my);
    gl.uniform3f(U.uRip, rip.x, rip.y, rip.age);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  addEventListener('resize', () => { sizeGL(); measure(); });

  /* ---------- theme: accent colour + background pattern (THEMES in data.js) ---------- */
  const themeEl = $('#themes');
  themeEl.innerHTML = THEMES.map(t => `<button type="button" class="tsw tsw--${t.id}" data-theme="${t.id}" aria-pressed="false" aria-label="${esc(t.label)} theme" title="${esc(t.label)}" data-label="${esc(t.id)}" style="--c:${t.accent}"></button>`).join('');
  let theme = THEMES.find(t => t.id === store.get('yusra-theme')) || THEMES[0];
  function applyTheme(t, origin) {
    theme = t;
    if (t.mode) { root.dataset.theme = t.id; root.style.setProperty('--accent', t.accent); }
    else { delete root.dataset.theme; root.style.removeProperty('--accent'); }           // default: back to the CSS value
    $$('.tsw', themeEl).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === t.id)));
    $('#themename').textContent = t.id;
    if (glOK) {
      const c = parseInt(t.accent.slice(1), 16);
      gl.uniform1f(U.uMode, t.mode);
      if (t.mode) gl.uniform3f(U.uC, (c >> 16) / 255, (c >> 8 & 255) / 255, (c & 255) / 255);
      else gl.uniform3f(U.uC, 1., .416, .239);                                             // exact original ink accent
    }
    store.set('yusra-theme', t.id); dirty = true;
    if (origin) pulse(origin);
  }
  themeEl.addEventListener('click', e => { const b = e.target.closest('.tsw'); if (b) applyTheme(THEMES.find(t => t.id === b.dataset.theme), b); });
  applyTheme(theme);

  // If the browser drops the WebGL context, hide the canvas (the dark page shows through) instead of
  // leaving a blank one behind light text; rebuild the shader when the context comes back.
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); glOK = false; cv.style.visibility = 'hidden'; });
  cv.addEventListener('webglcontextrestored', () => { glOK = inkInit(gl, U); if (glOK) { cv.style.visibility = ''; sizeGL(); applyTheme(theme); } });

  /* ---------- ticker ---------- */
  let last = performance.now();
  function tick(now) {
    const raw = now - last, dt = Math.min(.05, raw / 1000); last = now;
    const live = moving();
    if (glOK && live && !document.hidden) {
      slow = raw > 50 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 45 && qual > .5) { qual = Math.max(.5, qual - .15); slow = 0; sizeGL(); }
    }
    for (const c of chars) {
      let target = 62;
      if (live && P.has) { const d = Math.hypot(c.cx - P.x, (c.cy - scrollY) - P.y); if (d < 220) target = 62 + (1 - d / 220) * 40; }
      c.w += (target - c.w) * .14;
      const q = Math.round(c.w * 10);
      if (c.cur !== q) { c.cur = q; c.el.style.setProperty('--w', c.w.toFixed(1)); }
    }
    if (fine) {
      cx += (P.x - cx) * .25; cy += (P.y - cy) * .25; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      if (flags.x_ray && xtip.classList.contains('is-on')) placeTip(P.x + 16, P.y + 18);
    }
    if (glOK && !document.hidden && (live || dirty)) { drawInk(dt, live); dirty = false; }
    requestAnimationFrame(tick);
  }

  /* ---------- boot ---------- */
  sizeGL(); applyFlags(); setView(store.get('yusra-view') === 'co' ? 'co' : 'log'); onScroll();
  requestAnimationFrame(tick);
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const showLoaded = () => { const ms = nav && nav.domContentLoadedEventEnd ? nav.domContentLoadedEventEnd : performance.now(); $('#loaded').textContent = (ms / 1000).toFixed(2) + 's'; };
  const loader = $('.loader'); let entered = false;
  function enter() {
    if (entered) return; entered = true; loader.classList.add('is-done'); showLoaded(); measure();
    if (moving()) { h1.classList.add('swap'); setTimeout(() => h1.classList.remove('swap'), 1400); pulse(h1); }
  }
  if (!moving()) { loader.remove(); entered = true; setTimeout(showLoaded, 0); }
  else {
    const lns = $$('[data-ln]', loader), bar = $('.loader-bar', loader), t0 = performance.now(), D = 1000;
    (function f(now) {
      const p = Math.min(1, (now - t0) / D); bar.style.setProperty('--p', p.toFixed(3));
      lns.forEach((l, i) => {
        const a = i / lns.length, b = (i + 1) / lns.length;
        l.classList.toggle('run', p >= a && p < b); l.classList.toggle('ok', p >= b);
        $('.st', l).textContent = p >= b ? (i === lns.length - 1 ? '✓ live' : '✓') : p >= a ? '…' : '';
      });
      if (p < 1) requestAnimationFrame(f); else setTimeout(enter, 160);
    })(t0);
    setTimeout(enter, 3000);
  }
})();
