/* Live adapter: applies the Advanced v3 mockup layer (advanced3.js) after every game render, so the mockup can be
   played. build-play.js bundles it into advanced3-play.html. Not app code.
   A render that changes the table rebuilds the seats, the play area and your seat. This adapter clears what the layer
   put elsewhere, computes the layer's inputs from the live state, and runs the layer again. Animations are timed from
   when each thing first appeared, so a rebuild mid-animation resumes it instead of restarting or cutting it. */
(() => {
  const SRC = window.__ADV_SRC, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  window.__live = true;
  let seq = 0, lastHand = 0, logCount = -1, discardHand = -1, discarders = [], dealKey = '', dealStart = 0, trickKey = '', personaSeat = null;
  const seen = new Set(), layerStart = [], slotStart = {}, winStart = {};
  const speedMs = () => ({ slow: 700, normal: 450, fast: 250, instant: 0 }[($('#speedSel') || {}).value] ?? 450);

  // A redraw that changes nothing is skipped (the ' enter' and ' flash' classes mark only the first draw of a change).
  const norm = h => h.replace(/ (?:enter|flash)"/g, '"');
  window.__advFlush = w => {
    const n = $('#gameLog').children.length;
    if (n === logCount && w.every(([el, h]) => el.__raw === norm(h))) return false;
    logCount = n;
    for (const [el, h] of w) { el.innerHTML = h; el.__raw = norm(h); }
    return true;
  };

  // The layer's styles go in once; a style it adds again on a later pass is skipped.
  { const styles = new Set(), head = document.head, ins = head.insertAdjacentHTML.bind(head);
    head.insertAdjacentHTML = (pos, html) => { if (/^\s*<style/.test(html)) { if (styles.has(html)) return; styles.add(html); } ins(pos, html); }; }

  // Toasts from the layer: each once per hand (a pass once per bidding round). Trump calls are skipped: the game
  // already toasts them.
  window.__toast = m => {
    const s = KCT.App.app.state, key = s.handNumber + '|' + (/ pass(es)?$/.test(m) ? s.phase : '') + '|' + m;
    if (/ trump$/.test(m) || seen.has(key)) return;
    seen.add(key);
    const t = document.createElement('div'); t.className = 'toast info'; t.textContent = m;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2700);
  };

  const live = document.createElement('style');
  live.textContent = `
.layout:not(.log-collapsed) #gameLog{display:flex;flex-direction:column}
.speed-pick{position:relative}
.speed-pick select{display:block!important;position:absolute;inset:0;width:100%;opacity:0;cursor:pointer}
.trick .card.enter{animation:none!important}
.trick .slot .card{transition:none!important}`;
  document.head.appendChild(live);

  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // Trick cards slide in from the player's seat; at a trick's end the winner lifts once the last card has landed.
  function animateTrick(s, now) {
    const sd = s.showdown && s.showdown.active, key = s.handNumber + '|' + (sd ? 'sd' : '') + '|' + s.trickNumber;
    if (key !== trickKey) { trickKey = key; for (const k in slotStart) delete slotStart[k]; for (const k in winStart) delete winStart[k]; }
    const ms = speedMs();
    for (const slot of $$('.trick .slot')) {
      const card = $(':scope > .card', slot) || $('.card', slot), p = (slot.className.match(/slot-(\d)/) || [])[1];
      if (!card || !card.dataset.card || p == null) continue;
      const id = p + card.dataset.card;
      if (slotStart[id] == null) slotStart[id] = now;
      const e = now - slotStart[id], seat = document.getElementById('seat' + p), isWin = slot.classList.contains('win');
      // Resting transforms first, before any animation applies: without the winner's lift, and with it.
      if (isWin) slot.classList.remove('win');
      const base = getComputedStyle(card).transform;
      if (isWin) slot.classList.add('win');
      const lifted = getComputedStyle(card).transform, rest = base === 'none' ? '' : base;
      if (ms && e < ms && seat) {
        const [sx, sy] = center(seat), [cx, cy] = center(card);
        card.animate([{ transform: ('translate(' + (sx - cx) + 'px,' + (sy - cy) + 'px) ' + rest).trim(), opacity: 0.4 }, { transform: rest || 'none', opacity: 1 }],
          { duration: ms, easing: 'ease-out', fill: 'backwards' }).currentTime = e;
      }
      if (isWin) {
        if (winStart[p] == null) winStart[p] = now;
        const delay = Math.max(0, slotStart[id] + ms - winStart[p]), w = now - winStart[p];
        if (ms && w < delay + ms) card.animate([{ transform: rest || 'none' }, { transform: lifted }], { duration: ms, delay, easing: 'ease-out' }).currentTime = w;
      }
    }
  }

  function apply() {
    const s = KCT.App.app.state, log = $('#gameLog'), now = performance.now();
    // Clear the previous pass: the strip, a panel, the log toggle, and Skip in the top bar.
    $$('#table > .info, #table > .panel, .lp-toggle, .skip-top').forEach(e => e.remove());
    $$('.open').forEach(e => e.classList.remove('open'));
    // The log back in play order (the layer reverses it itself).
    for (const li of log.children) if (!li.dataset.seq) li.dataset.seq = String(++seq);
    log.replaceChildren(...[...log.children].sort((a, b) => a.dataset.seq - b.dataset.seq));
    for (const li of log.children) li.style.order = '';
    if (!s || !s.handNumber) return;

    if (s.handNumber < lastHand) seen.clear();
    lastHand = s.handNumber;
    const E = KCT.Engine, R = KCT.Render, v = KCT.buildView(s, 0), ac = E.actors(s), sym = { S: '♠', H: '♥', D: '♦', C: '♣' };
    const won = [[], [], []], pl = v.playLog || [];
    (v.trickWinners || []).forEach((w, i) => won[w].push({ n: i + 1, cards: pl.slice(i * 3, i * 3 + 3).map(x => x.card) }));
    const info = { flippedHTML: s.flippedId ? R.cardHTML(s.flippedId, null) : '', flipped: s.flippedId, flippedBlocked: s.flippedBlocked,
      bids: [0, 1, 2].map(p => v.bidLog.filter(b => b.player === p).map(b => b.round === 1 ? (b.action === 'accept' ? 'accepted' : 'passed') + ' round 1' : (b.action === 'name' ? 'named ' + sym[b.suit] : 'passed') + ' round 2')),
      voids: v.voids.map(x => x.map(c => sym[c] || c)), myOut: v.myOut, won };
    window.__st = Object.assign({}, s, { info, myOut: v.myOut, sdDiscards: s.showdown && s.showdown.active ? s.showdown.discards.length : 0 });
    window.__turn = ac.length === 1 ? ac[0] : -1;
    window.__led = s.trick && s.trick.plays.length ? s.trick.plays[0].player : -1;
    window.__collapsed = $('.layout').classList.contains('log-collapsed');

    // Discards: who has discarded, in the order seen. Each layer's slide is timed from when it first appeared.
    if (s.phase === 'discard') {
      if (discardHand !== s.handNumber) { discardHand = s.handNumber; discarders = []; layerStart.length = 0; }
      for (const p of [1, 2, 0]) if (!discarders.includes(p) && /Discarded/.test((($('#seat' + p + ' .discard-note') || {}).textContent || ''))) discarders.push(p);
    }
    window.__discarders = discarders.concat([1, 2, 0].filter(p => !discarders.includes(p)));
    window.__outside = s.phase === 'discard' ? discarders.length * 3 : undefined;
    window.__animFrom = 99;   // the layer draws every layer at rest; the timing below sets the moving ones

    try { new Function(SRC)(); } catch (e) { console.error('Advanced layer:', e); }

    const ms = speedMs();
    $$('.outpile .olayer').forEach((el, i) => {
      if (layerStart[i] == null) layerStart[i] = now;
      const e = now - layerStart[i];
      if (!ms || e >= ms) return;
      el.style.setProperty('--ms', ms + 'ms');
      for (const x of [el, ...el.children]) x.style.animationDelay = -e + 'ms';
    });
    // The kitty deal: timed from when the kitty first showed this hand.
    if ($('.kpile') && window.__kittyDeal) {
      const k = s.handNumber + '|' + s.dealer;
      if (dealKey !== k) { dealKey = k; dealStart = now; }
      window.__kittyDeal(s.dealer, now - dealStart);
    }
    animateTrick(s, now);

    // The log shows newest first through CSS order; the DOM stays in play order so the game can trim its oldest line.
    const shown = [...log.children];
    log.replaceChildren(...shown.slice().sort((a, b) => a.dataset.seq - b.dataset.seq));
    shown.forEach((li, i) => { li.style.order = String(i); });
    log.scrollTop = 0;
    placeToasts();
  }

  // Toasts sit over the play area.
  function placeToasts() {
    const c = $('#center'), t = $('#toasts'); if (!c || !t) return;
    const r = c.getBoundingClientRect();
    t.style.top = (r.top + 10) + 'px'; t.style.left = (r.left + r.width / 2) + 'px'; t.style.width = 'min(92%,380px)';
  }
  addEventListener('resize', () => { placeToasts(); });

  // Taps: the Outside cell and the trick circles open their panels; a tap elsewhere closes them. The log toggle.
  document.addEventListener('click', ev => {
    const t = ev.target instanceof Element ? ev.target : null; if (!t) return;
    const tg = t.closest('.lp-toggle');
    if (tg) {
      const c = $('.layout').classList.toggle('log-collapsed'), label = (c ? 'Open' : 'Collapse') + ' the Latest Scroll';
      tg.textContent = c ? '‹' : '›'; tg.title = label; tg.setAttribute('aria-label', label); tg.setAttribute('aria-expanded', String(!c));
      ev.stopPropagation(); return;
    }
    const oc = t.closest('.info .cell.tappable'), pp = t.closest('.pips.tappable'), a = oc || pp;
    if (a) {
      const open = a.classList.contains('open');
      $$('#table > .panel').forEach(e => e.remove()); $$('.open').forEach(e => e.classList.remove('open'));
      if (!open && window.__panel) { if (oc) window.__panel('outside'); else window.__panel('tricks', +pp.closest('#seat0,#seat1,#seat2').id.slice(4)); }
      ev.stopPropagation(); return;
    }
    if (!t.closest('.panel')) { $$('#table > .panel').forEach(e => e.remove()); $$('.open').forEach(e => e.classList.remove('open')); }
    // A seat's face opens its profile; during a hand the profile adds "This hand" (the future setting, on here).
    const face = t.closest('[data-action="persona"]'), seat = face && face.closest('#seat0,#seat1,#seat2');
    personaSeat = seat ? +seat.id.slice(4) : null;
    if (personaSeat != null) setTimeout(() => { const s = KCT.App.app.state; if (s && s.handNumber && window.__profileThisHand && !$('.modal.persona .p-hand')) window.__profileThisHand(personaSeat); });
  }, true);

  window.__advLive = apply;
})();
