/* Live adapter: applies the Advanced v3 mockup layer (advanced3.js) after every game render, so the mockup can be
   played. build-play.js bundles it into advanced3-play.html. Not app code.
   A render that changes the table rebuilds the seats, the play area and your seat. This adapter clears what the layer
   put elsewhere, computes the layer's inputs from the live state, and runs the layer again. Animations are timed from
   when each thing first appeared, so a rebuild mid-animation resumes it instead of restarting or cutting it.
   Phase changes: before a rebuild, the outgoing trick, kitty, outside pile and your hand are kept; after it, they fly
   to where the cards went (the winner's trick circles, the receiver, the Outside cell), and a new hand is dealt. */
(() => {
  const SRC = window.__ADV_SRC, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  window.__live = true;
  let prev = null, out = null, handDeal = { key: '', t0: 0 }, kittyHold = 0, mineLand = null;
  let seq = 0, lastHand = 0, logCount = -1, discardHand = -1, discarders = [], dealKey = '', dealStart = 0, trickKey = '', personaSeat = null;
  const seen = new Set(), layerStart = [], slotStart = {}, winStart = {};
  const speedMs = () => ({ slow: 700, normal: 450, fast: 250, instant: 0 }[($('#speedSel') || {}).value] ?? 450);

  // A redraw that changes nothing is skipped (the ' enter' and ' flash' classes mark only the first draw of a change).
  const norm = h => h.replace(/ (?:enter|flash)"/g, '"');
  window.__advFlush = w => {
    const n = $('#gameLog').children.length;
    if (n === logCount && w.every(([el, h]) => el.__raw === norm(h))) return false;
    logCount = n; out = capture();
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
.trick .slot .card{transition:none!important}
#fx{position:fixed;inset:0;pointer-events:none;z-index:30}
#fx > *{position:fixed!important;margin:0!important;box-sizing:border-box}
#fx .olayer,#fx .olayer .card{animation:none!important}`;
  document.head.appendChild(live);

  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // ---- Phase changes. capture() runs just before a rebuild, while the outgoing table is still on screen.
  // Measured at rest: an animation still running (a deal, a slide-in) is finished first.
  const keep = el => { if (!el) return null; for (const a of el.getAnimations({ subtree: true })) try { a.finish(); } catch (e) { /* infinite: none here */ }
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), vars = {};
    for (const k of cs) if (k.startsWith('--')) vars[k] = cs.getPropertyValue(k);
    return { el, r, vars }; };
  function capture() {
    const tr = $('#center .trick');
    return { trick: tr && $('.slot.win', tr) ? keep(tr) : null, kpile: keep($('#center .kpile')), outpile: keep($('#center .outpile')),
      hand: $$('#hand .card[data-card]').map(c => ({ id: c.dataset.card, k: keep(c) })) };
  }
  // A kept element goes into the effects layer exactly where it was, with the variables it had.
  function place(k) {
    let fx = $('#fx'); if (!fx) { fx = document.createElement('div'); fx.id = 'fx'; document.body.appendChild(fx); }
    const el = k.el; el.removeAttribute('id');
    for (const [n, v] of Object.entries(k.vars)) el.style.setProperty(n, v);
    Object.assign(el.style, { left: k.r.left + 'px', top: k.r.top + 'px', width: k.r.width + 'px', height: k.r.height + 'px', minHeight: '0' });
    fx.appendChild(el); return el;
  }
  // One card (or stack) flies to a target and shrinks away; the effects layer is cleared when it lands.
  function fly(el, to, ms, delay = 0, turn = 0) {
    const [sx, sy] = center(el), [tx, ty] = center(to);
    const a = el.animate([{ transform: getComputedStyle(el).transform === 'none' ? 'none' : getComputedStyle(el).transform, opacity: 1 },
      { opacity: 1, offset: 0.7 },
      { transform: 'translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) rotate(' + turn + 'deg) scale(.35)', opacity: 0 }],
      { duration: ms * 1.3, delay, easing: 'ease-in-out', fill: 'both' });
    return a;
  }
  // A card lands on a pile: it moves there and takes the pile card's size, then gives way to the pile.
  function land(el, to, ms, delay = 0) {
    const [sx, sy] = center(el), [tx, ty] = center(to), sc = (to.getBoundingClientRect().width || 1) / (el.getBoundingClientRect().width || 1);
    const at = 'translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) scale(' + sc.toFixed(3) + ')';
    return el.animate([{ transform: 'none', opacity: 1 }, { transform: at, opacity: 1, offset: 0.85 }, { transform: at, opacity: 0 }],
      { duration: ms, delay, easing: 'ease-in-out', fill: 'both' });
  }
  // Your discards: the cards that just left your hand, kept where they were.
  const leftMyHand = (o, s) => { const ids = new Set(s.hands[0]); return o.hand.filter(x => !ids.has(x.id)); };
  const done = (root, anims) => Promise.all(anims.map(a => a.finished)).catch(() => {}).then(() => root.remove());
  const outsideCell = () => $$('.info .cell').find(c => /Outside/i.test(c.textContent)) || $('.info');
  const seatOf = p => p === 0 ? ($('#hand') || $('#seat0')) : $('#seat' + p);

  function transitions(s, o, before) {
    const ms = speedMs(); if (!ms || !o || !before || before.hand !== s.handNumber) return;
    // Trick end: the three cards sweep to the winner's trick circles.
    if (o.trick) {
      const ids = k => $$('.slot .card[data-card]', k).map(c => c.dataset.card).sort().join();
      const now = $('#center .trick'), stay = now && $('.slot.win', now) && ids(now) === ids(o.trick.el);
      if (!stay) {
        const g = place(o.trick), w = $('.slot.win', g), p = w ? +(w.className.match(/slot-(\d)/) || [])[1] : -1;
        const to = $('#seat' + p + ' .pips') || $('#seat' + p);
        if (to) done(g, $$('.slot', g).map((sl, i) => { if (!$('.card[data-card]', sl)) { sl.style.visibility = 'hidden'; return null; } return fly(sl, to, ms, i * 60); }).filter(Boolean));
        else g.remove();
      }
    }
    // Bid won: round 1, the turned card goes to the receiver and the 2 face-down cards to the outside pile;
    // round 2, the 2 face-down cards go to the receiver and the turned card to the outside pile.
    if (o.kpile && !$('#center .kpile') && s.trump && s.receiver != null) {
      const g = place(o.kpile), cards = $$('.card', g), top = cards[cards.length - 1], r1 = s.exchangeCount === 1;
      const recv = seatOf(s.receiver), oc = outsideCell(), tilt = { 0: 0, 1: -30, 2: 30 }[s.receiver];
      done(g, cards.map((c, i) => (c === top) === r1 ? fly(c, recv, ms, i * 80, tilt) : fly(c, oc, ms, ms * 0.5 + i * 80)));
    }
    // Discards complete: the outside pile slides off to the Outside cell; the kitty takes its spot.
    // Your discard: your 3 cards fly from your hand onto the pile. When it was the last discard, the pile then slides
    // to the Outside cell, and the kitty is dealt only after that (kittyHold).
    const mine = before.phase === 'discard' ? leftMyHand(o, s) : [], pileNow = $('#center .outpile');
    if (o.outpile && !pileNow) {
      // The last discards never reached the pile on screen: they land on it first, one player after another (your
      // cards themselves; a bot's as backs from its seat), then the pile leaves.
      const shown = discarders.slice(0, $$('.olayer', o.outpile.el).length), missing = [1, 2, 0].filter(p => !shown.includes(p));
      const g = place(o.outpile), gap = ms * 0.4, wait = missing.length ? ms + (missing.length - 1) * gap : 0;
      const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 60;
      missing.forEach((p, n) => {
        if (p === 0) { mine.forEach((x, i) => { const c = place(x.k); c.classList.remove('selected'); done(c, [land(c, g, ms, n * gap + i * 70)]); }); return; }
        const r = $('#seat' + p).getBoundingClientRect();
        for (let i = 0; i < 3; i++) {
          const b = document.createElement('div'); b.className = 'card back';
          const c = place({ el: b, r: { left: r.left + r.width / 2 - w / 2 + (i - 1) * 12, top: r.top + r.height / 2 - w * 0.7, width: w, height: w * 1.4 }, vars: {} });
          done(c, [land(c, g, ms, n * gap + i * 70)]);
        }
      });
      done(g, [fly(g, outsideCell(), ms, wait)]);
      kittyHold = performance.now() + wait + ms * 0.9;
    } else if (pileNow && mine.length) {
      mine.forEach((x, i) => { const c = place(x.k); c.classList.remove('selected'); done(c, [land(c, pileNow, ms, i * 70)]); });
      mineLand = { hand: s.handNumber, idx: discarders.indexOf(0), t0: performance.now() };
      holdMyLayer(performance.now());
    }
    // Exchange and Showdown discards: cards that leave a hand outside trick play fly to the Outside cell. Yours are the
    // cards themselves; a bot's are backs from its seat.
    if (before.phase !== 'discard' && !/Play$|rickDone/.test(before.phase)) {
      const oc = outsideCell(), ids = new Set(s.hands[0]);
      for (const p of [0, 1, 2]) {
        const k = before.counts[p] - s.hands[p].length; if (k <= 0) continue;
        if (p === 0) {
          for (const x of o.hand.filter(x => !ids.has(x.id))) { const g = place(x.k); g.classList.remove('selected'); done(g, [fly(g, oc, ms)]); }
          continue;
        }
        const r = $('#seat' + p).getBoundingClientRect(), w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 60;
        for (let i = 0; i < k; i++) {
          const b = document.createElement('div'); b.className = 'card back';
          const g = place({ el: b, r: { left: r.left + r.width / 2 - w / 2 + i * 10, top: r.top + r.height / 2 - w * 0.7, width: w, height: w * 1.4 }, vars: {} });
          done(g, [fly(g, oc, ms, i * 80)]);
        }
      }
    }
  }

  // A new hand (or the Showdown deal): the cards go out from the dealer (the mediator in a Showdown) one at a time,
  // round the table from the dealer's left: your cards and the opponents' hand backs alike. Timed from when the hand
  // first showed, so a rebuild mid-deal resumes it.
  function dealHand(s, now) {
    const ms = speedMs(), sd = s.showdown && s.showdown.active, key = s.handNumber + (sd ? 'sd' : '');
    if (!/^(discard|showdownDiscard)$/.test(s.phase)) return;
    const dealer = sd ? s.showdown.mediator : s.dealer, from = $('#seat' + dealer);
    const order = [1, 2, 3].map(k => (dealer + k) % 3).filter(p => !sd || s.showdown.participants.includes(p));
    const hands = order.map(p => p === 0 ? $$('#hand .card[data-card]') : $$('#seat' + p + ' .mini-back'));
    if (!hands.some(h => h.length)) return;
    if (handDeal.key !== key) handDeal = { key, t0: now, end: 0 };
    const e = now - handDeal.t0, step = ms * 0.06, most = Math.max(...hands.map(h => h.length));
    handDeal.end = Math.max(handDeal.end, handDeal.t0 + ms + step * order.length * most);
    if (!ms || !from || e > ms + step * order.length * most) return;
    const [fx, fy] = center(from);
    hands.forEach((cards, j) => cards.forEach((c, i) => { const [cx, cy] = center(c);
      c.animate([{ transform: 'translate(' + (fx - cx) + 'px,' + (fy - cy) + 'px) scale(.5)', opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: 'none', opacity: 1 }],
        { duration: ms, delay: (i * order.length + j) * step, easing: 'ease-out', fill: 'backwards' }).currentTime = e; }));
  }

  // Trick cards slide in from the player's seat; at a trick's end the winner lifts once the last card has landed.
  function animateTrick(s, now) {
    const sd = s.showdown && s.showdown.active, key = s.handNumber + '|' + (sd ? 'sd' : '') + '|' + s.trickNumber;
    if (key !== trickKey) { trickKey = key; for (const k in slotStart) delete slotStart[k]; for (const k in winStart) delete winStart[k]; }
    const ms = speedMs();
    for (const slot of $$('#center .trick .slot')) {
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

  // Your layer of the outside pile stays hidden until your cards have landed on the pile.
  function holdMyLayer(now) {
    if (!mineLand || mineLand.hand !== KCT.App.app.state.handNumber) return;
    const el = $$('#center .outpile .olayer')[mineLand.idx], e = now - mineLand.t0, ms = speedMs();
    if (!el) return;
    el.style.setProperty('--ms', '0ms'); for (const x of [el, ...el.children]) x.style.animationDelay = '';
    if (e < ms) el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: ms - e });
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
    if (!s || !s.phase || s.phase === 'setup') return;

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
      for (const p of [1, 2, 0]) if (!discarders.includes(p) && !s.pendingDiscard[p]) discarders.push(p);
    }
    window.__discarders = discarders.concat([1, 2, 0].filter(p => !discarders.includes(p)));
    window.__outside = s.phase === 'discard' ? discarders.length * 3 : undefined;
    window.__animFrom = 99; window.__pileAll = true;   // the layer draws every layer at rest; the timing below sets the moving ones

    // The layer finds things by class across the page; cards still flying in the effects layer stay out of its way.
    const fx = $('#fx'); if (fx) fx.remove();
    try { new Function(SRC)(); } catch (e) { console.error('Advanced layer:', e); }
    if (fx) document.body.appendChild(fx);

    const ms = speedMs();
    $$('#center .outpile .olayer').forEach((el, i) => {
      // A discard waits for the deal to finish: no one discards before they hold all their cards.
      if (layerStart[i] == null) layerStart[i] = handDeal.key === String(s.handNumber) ? Math.max(now, handDeal.end) : now;
      if (mineLand && mineLand.hand === s.handNumber && mineLand.idx === i) return;
      const e = now - layerStart[i];
      if (!ms || e >= ms) return;
      if (e < 0) el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: -e });
      el.style.setProperty('--ms', ms + 'ms');
      for (const x of [el, ...el.children]) x.style.animationDelay = -e + 'ms';
    });
    holdMyLayer(now);
    transitions(s, out, prev); out = null;
    // The kitty deal: timed from when the kitty first showed this hand, and held while the outside pile clears.
    const kp = $('#center .kpile');
    if (kp && window.__kittyDeal) {
      const k = s.handNumber + '|' + s.dealer;
      if (dealKey !== k) { dealKey = k; dealStart = Math.max(now, kittyHold); }
      if (now < dealStart) kp.animate([{ opacity: 0 }, { opacity: 0 }], { duration: dealStart - now });
      window.__kittyDeal(s.dealer, now - dealStart);
    }
    animateTrick(s, now);
    dealHand(s, now);
    prev = { hand: s.handNumber, phase: s.phase, counts: s.hands.map(h => h.length) };

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
