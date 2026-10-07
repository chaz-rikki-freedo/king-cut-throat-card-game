/* Live adapter: applies the Advanced v3 mockup layer (advanced3.js) after every game render, so the mockup can be
   played. build-play.js bundles it into advanced3-play.html. Not app code.
   Each render rebuilds the seats, the play area and your seat; this adapter clears what the layer put elsewhere,
   computes the layer's inputs from the live state, and runs the layer again. */
(() => {
  const SRC = window.__ADV_SRC, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  window.__live = true;
  let seq = 0, lastHand = 0, discardHand = -1, discarders = [], shownLayers = 0, dealtHand = -1, personaSeat = null;
  const seen = new Set();

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
.speed-pick select{display:block!important;position:absolute;inset:0;width:100%;opacity:0;cursor:pointer}`;
  document.head.appendChild(live);

  function apply() {
    const s = KCT.App.app.state, log = $('#gameLog');
    // Clear the previous pass: its styles, the strip, a panel, the log toggle, and Skip in the top bar.
    $$('head style[data-adv], #table > .info, #table > .panel, .lp-toggle, .skip-top').forEach(e => e.remove());
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

    // Discards: who has discarded, in the order seen, so each new layer slides in once.
    if (s.phase === 'discard') {
      if (discardHand !== s.handNumber) { discardHand = s.handNumber; discarders = []; shownLayers = 0; }
      for (const p of [1, 2, 0]) if (!discarders.includes(p) && /Discarded/.test((($('#seat' + p + ' .discard-note') || {}).textContent || ''))) discarders.push(p);
    }
    window.__discarders = discarders.concat([1, 2, 0].filter(p => !discarders.includes(p)));
    window.__outside = s.phase === 'discard' ? discarders.length * 3 : undefined;
    window.__animFrom = shownLayers;

    const before = new Set(document.head.children);
    try { new Function(SRC)(); } catch (e) { console.error('Advanced layer:', e); }
    for (const el of document.head.children) if (!before.has(el) && el.tagName === 'STYLE') el.dataset.adv = '1';
    if (s.phase === 'discard') shownLayers = $$('.outpile .olayer').length;

    // The kitty deal plays once per hand, when the kitty first shows.
    if (s.phase === 'bid1' && dealtHand !== s.handNumber && $('.kpile') && window.__kittyDeal) { dealtHand = s.handNumber; window.__kittyDeal(s.dealer); }

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
    if (tg) { $('.layout').classList.toggle('log-collapsed'); apply(); ev.stopPropagation(); return; }
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
