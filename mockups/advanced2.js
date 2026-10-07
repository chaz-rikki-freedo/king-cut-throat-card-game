/* Mockup layer, Advanced v2: a redesign of the Advanced UI level. Not app code. Applied to the live table DOM.
   Inputs set by the shot scripts: __turn, __led (seat ids), __collapsed (log collapsed), __outside (discard count),
   __leftHand (mirror the action corner); KCT.App.app.state carries trump, handNumber, trick, myOut, sdDiscards.

   Design basis (validated sources):
   - Nielsen, 10 usability heuristics: visibility of system status (scores, trump, turn are always on screen),
     consistency and standards (one tag style, one card style, one table color), recognition rather than recall
     (trick pips and a score track show the race at a glance), aesthetic and minimalist design (one place per fact).
   - Hodent, The Gamer's Brain: perception and attention are limited, so each piece of game state has one stable,
     predictable location; feedback for events is transient (toasts), state is persistent (seats, strip).
   - Gestalt proximity and similarity: everything about a player sits in that player's seat; the same kind of
     information looks the same in every seat.
   - Fitts's law: actions sit in one fixed corner of the play area, next to your hand.
   - WCAG 1.4.1 (use of color): no state is shown by color alone (turn = glow + border; mediator = dim + tag).
   - Card-game convention (Hearts, Spades, Euchre apps): score beside the name; each played card lies in front of
     the player who played it. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const st = KCT.App.app.state, sym = { S: '♠', H: '♥', D: '♦', C: '♣' };
const isSD = $('#table').classList.contains('showdown');
const css = `
/* ---- One table color, always. The Showdown is shown by its tags and the strip, not by repainting the table. */
.table,.table.showdown{background:radial-gradient(ellipse at center,var(--felt) 0%,var(--felt-edge) 100%)!important}
.center .banner,.trick-label,.who,.status,.prompt,.actionbar .hint,.center .lasttrick,.center .piles,
.seat .bubble,.me .bubble,.seat .discard-note,.hand .hint,.score small,#trumpChip,#handChip{display:none!important}
.actionbar:not(:has(.btn)){display:none}
.speed-pick select{display:none}.speed-pick{padding:0 10px}
.table{grid-template-areas:"info info info" "west center east" "me me me"!important;
  grid-template-columns:minmax(170px,.8fr) minmax(0,2.4fr) minmax(170px,.8fr)!important}
@media (max-width:720px){.table{grid-template-areas:"info info" "west east" "center center" "me me"!important;grid-template-columns:1fr 1fr!important}}

/* ---- Information strip: shared facts, one cell each, no empty cells. */
.info{grid-area:info;display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;background:rgba(0,0,0,.22);border-radius:12px;padding:6px}
.info .cell{display:flex;flex-direction:column;justify-content:center;gap:2px;padding:4px 12px;border-radius:8px;background:rgba(255,255,255,.04);min-width:0}
.info .lab{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.info .val{font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px;white-space:nowrap}
.info .pip{font-size:38px;line-height:1}
.info .latest{flex:1 1 200px;min-width:0}.info .latest .val{font-weight:400;font-size:14px;white-space:normal}
.info ul.gamelog{all:unset;display:block}.info ul.gamelog li{list-style:none;padding:0}
.mc{width:14px;height:20px;border-radius:2px;border:1px solid #f5f2e9;background:repeating-linear-gradient(45deg,#7a1f2b 0 2px,#93303d 2px 4px);display:inline-grid;place-items:center;font-size:8px;font-weight:800}
.mc + .mc{margin-left:3px}.mc.up{background:#fdfbf5;color:#1b1b1b;width:22px}.mc.up.red{color:#d32f2f}
@media (max-width:720px){.info{gap:4px;padding:4px}.info .cell{padding:3px 8px}.info .pip{font-size:28px}.info .latest{order:9;flex:1 1 100%;flex-direction:row;align-items:center;gap:8px}}

/* ---- Seats: one plate per player, the same parts in the same places in every seat. */
.seat,.me{gap:8px!important;padding:10px 12px!important}
.seat-west,.seat-east{align-self:start}
.plate-head{display:flex;align-items:center;gap:8px;min-width:0}
.plate-head .seat-name{font-size:19px;font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis}
.plate-head .pscore{margin-left:auto;font-size:30px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:var(--ink)}
.track{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;height:6px}
.track i{border-radius:2px;background:rgba(255,255,255,.12)}.track i.on{background:var(--gold)}
.plate-row{display:flex;align-items:center;gap:10px;min-height:22px;font-size:12px;color:var(--muted)}
.plate-row .lbl{min-width:46px}
.pips{display:flex;gap:3px;flex-wrap:nowrap}.pips i{flex:none;width:9px;height:9px;border-radius:50%;border:1.5px solid rgba(255,255,255,.45)}.pips i.on{background:var(--ink);border-color:var(--ink)}
.plate-row .backs{display:flex;flex-wrap:nowrap}.plate-row .mini-back{flex:none;margin-right:-9px}
.roles{display:flex;flex-wrap:wrap;gap:4px;min-height:20px}
.roles .tag{all:unset;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:999px;
  border:1px solid rgba(255,255,255,.35);color:var(--ink);background:rgba(255,255,255,.06)}
.seat.out{opacity:.5}
.seat.turn,.me.turn{border-color:var(--gold)!important;box-shadow:0 0 0 3px rgba(242,193,78,.25),0 0 18px rgba(242,193,78,.25)!important}
.me .me-head{display:none}
.me .plate{max-width:440px;display:flex;flex-direction:column;gap:8px}
.hand-row:not(:has(.backs)){display:none}
.me .hand{gap:6px;flex-wrap:wrap;padding-top:6px;min-height:0}

/* ---- Play area: each card lies in front of the player who played it, in play order; the lead card is marked. */
.center{position:relative;min-height:calc(var(--cw)*3.9 + 70px);justify-content:center;gap:10px}
.trick{flex:1;display:grid!important;grid-template-columns:1fr 1fr 1fr!important;grid-template-rows:1fr 1fr!important;min-height:calc(var(--cw)*3.4)!important;background:rgba(0,0,0,.10)!important}
.trick .slot{position:relative}
.trick .slot .card,.trick .slot .empty{--w:calc(var(--cw)*1.25);width:var(--w);height:calc(var(--w)*1.4);box-shadow:0 6px 14px rgba(0,0,0,.45)}
.trick .slot-1{grid-column:1;grid-row:1 / span 2;justify-self:end;align-self:center;transform:rotate(-7deg) translateX(18%)}
.trick .slot-2{grid-column:3;grid-row:1 / span 2;justify-self:start;align-self:center;transform:rotate(7deg) translateX(-18%)}
.trick .slot-0{grid-column:2;grid-row:2;align-self:end;transform:translateY(-6%)}
.trick .slot .empty{background:none;border:2px dashed rgba(255,255,255,.35);box-shadow:none}
.trick .slot-1 .empty,.trick .slot-2 .empty{display:none}
.trick .slot .ledmark{position:absolute;top:-10px;left:50%;transform:translateX(-50%);z-index:3;font-size:10px;font-weight:800;letter-spacing:.08em;padding:1px 7px;border-radius:999px;background:var(--ink);color:#0b1a12}
.c-tag.king{background:#f2c14e;color:#1b1b1b}

/* ---- Piles before the first trick (discard: outside pile; bidding: kitty). */
.kitty-spot{display:flex;align-items:center;justify-content:center;min-height:calc(var(--cw)*3.4);--kw:var(--cw)}
.kpile{position:relative;width:calc(var(--kw)*(1 + 2 * .45));height:calc(var(--kw)*1.4)}
.kpile .card{position:absolute;top:0;--w:var(--kw);box-shadow:0 2px 5px rgba(0,0,0,.45)}
.outpile{position:relative;width:var(--kw);height:calc(var(--kw)*1.4)}
.outpile .card{position:absolute;left:0;top:0;--w:var(--kw)}
.outpile.empty{border:2px dashed rgba(255,255,255,.35);border-radius:calc(var(--cw)*.12)}
.outpile .op-face{position:absolute;inset:0;z-index:5;display:grid;place-items:center}
.outpile .op-n{font-size:calc(var(--cw)*.9);font-weight:900;color:rgba(0,0,0,.45)}.outpile.empty .op-n{color:rgba(255,255,255,.25)}
.kpile .card .cat{position:absolute;left:15%;top:10%;width:70%;height:80%;fill:#000;opacity:.5}

/* ---- Actions: one corner of the play area, primary action outermost. Left-hand mode mirrors it. */
.center > .acts{margin-top:auto;align-self:flex-end;display:flex;flex-direction:row-reverse;gap:8px;padding:4px 4px 0}
html.lefthand .center > .acts{align-self:flex-start;flex-direction:row}
.acts .btn{font-size:15px;padding:8px 18px}
.skip-top{height:40px;padding:0 12px;font-size:14px}

/* ---- Summary charts: uniform. Names keep their identity color; numbers are plain. */
.summary table.stats td:first-child{white-space:nowrap;font-size:16px;font-weight:800;text-align:left}
.summary table.stats td:last-child{font-size:22px;font-weight:800}
.summary .pos,.summary .neg{color:var(--ink)!important}

/* ---- Log toggle. */
.logpanel h2{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lp-toggle{all:unset;cursor:pointer;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:var(--ink);font-size:16px}
.layout.log-collapsed .logpanel{min-height:0}.layout.log-collapsed #gameLog{display:none}
@media (min-width:1150px){
  .layout.log-collapsed{grid-template-columns:minmax(0,1fr) 48px!important}
  .layout.log-collapsed .logpanel{padding:10px 4px;align-items:center}
  .layout.log-collapsed .logpanel h2{flex-direction:column-reverse;writing-mode:vertical-rl;margin:0}
  .layout.log-collapsed .logpanel h2 .lp-toggle{writing-mode:horizontal-tb}
}
.gamelog li.gap:first-child{margin-top:0}
`;
document.head.insertAdjacentHTML('beforeend', '<style id="mockAdv2">' + css + '</style>');
$('.speed-pick').title = 'Speed: ' + $('#speedSel').options[$('#speedSel').selectedIndex].text;

// ---- Seats: rebuild each one as a plate: name and score, score track, role tags, hand, tricks.
const ROLE_ORDER = ['dealer', 'caller', 'receiver', 'mediator', 'duelist'];
for (const s of $$('#seat1,#seat2,#seat0')) {
  const me = s.id === 'seat0', head = $('.seat-head,.me-head', s);
  const scoreEl = $('.score', s), score = scoreEl ? parseInt(scoreEl.textContent, 10) || 0 : 0;
  const face = $('.seat-face', head), name = $('.seat-name', head);
  const roles = $$('.tag', head).filter(t => ROLE_ORDER.some(c => t.classList.contains(c)))
    .sort((a, b) => ROLE_ORDER.findIndex(c => a.classList.contains(c)) - ROLE_ORDER.findIndex(c => b.classList.contains(c)));
  for (const t of roles) { if (t.classList.contains('caller')) t.textContent = 'Namer'; if (t.classList.contains('duelist')) t.textContent = 'Showdown'; }
  // Tricks: pips for the contest in progress. A tied player in a Showdown counts Showdown tricks (of 5);
  // everyone else counts this hand's tricks (of 7).
  const tt = ($('.tricks', s) || {}).textContent || '';
  const sdM = tt.match(/Showdown tricks:\s*(\d+)/), mainM = tt.match(/(?:this hand|main hand):\s*(\d+)/);
  const won = sdM ? +sdM[1] : mainM ? +mainM[1] : 0, of = sdM ? 5 : 7;
  const pips = '<span class="pips" aria-label="' + won + ' of ' + of + ' tricks">' + Array.from({ length: of }, (_, i) => '<i' + (i < won ? ' class="on"' : '') + '></i>').join('') + '</span>';
  const backs = $(':scope > .backs', s);
  const plate = document.createElement('div'); plate.className = 'plate';
  plate.innerHTML = '<div class="plate-head"></div>' +
    '<div class="track" aria-label="Score ' + score + ' of 10">' + Array.from({ length: 10 }, (_, i) => '<i' + (i < score ? ' class="on"' : '') + '></i>').join('') + '</div>' +
    '<div class="roles"></div>' +
    (me ? '' : '<div class="plate-row hand-row"><span class="lbl">Hand</span></div>') +
    '<div class="plate-row"><span class="lbl">Tricks</span>' + pips + '</div>';
  const ph = $('.plate-head', plate);
  if (face) ph.appendChild(face); ph.appendChild(name);
  ph.insertAdjacentHTML('beforeend', '<span class="pscore">' + score + '</span>');
  for (const t of roles) $('.roles', plate).appendChild(t);
  if (backs && !me && backs.children.length) $('.hand-row', plate).appendChild(backs); else if (!me) $('.hand-row', plate).remove();
  for (const x of $$(':scope > .seat-head, :scope > .score-row, :scope > .tricks, :scope > .backs', s)) x.remove();
  if (me) { const tr = $('.me-head .tricks', s); if (tr) tr.remove(); s.prepend(plate); } else s.prepend(plate);
}
for (const c of $$('.card[data-card^="K"]')) if (!$('.c-tag', c)) c.insertAdjacentHTML('beforeend', '<span class="c-tag king">KING</span>');

// ---- Log: newest first.
const log = $('#gameLog'), groups = [];
for (const li of [...log.children]) { if (!groups.length || li.classList.contains('gap')) groups.push([]); groups[groups.length - 1].push(li); }
log.replaceChildren(...groups.reverse().flatMap(g => g[0].classList.contains('gap') ? [g[0], ...g.slice(1).reverse()] : g.slice().reverse()));
log.scrollTop = 0;

// ---- Information strip.
const latest = [...log.children].find(li => !li.classList.contains('gap'));
const pilesTxt = (($('.center .piles') || {}).textContent || '');
const outN = pilesTxt.match(/Outside pile \((\d+)\)/);
const turnedTxt = pilesTxt.match(/Turned card:\s*(\S+)/) || pilesTxt.match(/turned\s+((?:10|[2-9AKQJ])[♠♥♦♣])/i);
const tl = (($('.trick-label') || {}).textContent || '').match(/(Showdown )?trick (\d+) of (\d+)/i);
const cell = (cls, lab, val) => '<div class="cell ' + cls + '"><span class="lab">' + lab + '</span><span class="val">' + val + '</span></div>';
const myOut = st.myOut || [], sdN = st.sdDiscards || 0;
const mini = id => { const m = String(id).match(/^(10|[2-9AKQJ])([SHDC])$/); return m ? '<span class="mc up' + (/[HD]/.test(m[2]) ? ' red' : '') + '">' + m[1] + sym[m[2]] + '</span>' : '<span class="mc"></span>'; };
const outCell = isSD ? (sdN ? cell('', 'Outside', Array.from({ length: sdN }, (_, i) => i < myOut.length ? mini(myOut[i]) : '<span class="mc"></span>').join('')) : '')
  : (outN ? cell('', 'Outside', outN[1]) : '');
$('#table').insertAdjacentHTML('afterbegin', '<section class="info" aria-label="Shared information">' +
  (st.trump ? cell('', 'Trump', '<span class="pip" style="color:' + (/[HD]/.test(st.trump) ? '#ff6b6b' : 'var(--ink)') + '">' + sym[st.trump] + '</span>') : '') +
  cell('', 'Hand ' + st.handNumber, tl ? (tl[1] ? 'Showdown ' : 'Trick ') + tl[2] + ' of ' + tl[3] : (isSD ? 'Showdown' : '')) +
  cell('latest', 'Latest', latest ? '<ul class="gamelog">' + latest.outerHTML.replace(/class="[^"]*"/, '') + '</ul>' : '') +
  (turnedTxt && !isSD ? cell('', 'Turned up', turnedTxt[1]) : '') + outCell + '</section>');

// ---- Trick: play order sets the stacking; the lead card carries a LEAD mark.
const plays = (st.trick && st.trick.plays) || [];
plays.forEach((pl, i) => { const sl = $('.trick .slot-' + pl.player); if (sl) { sl.style.zIndex = String(i + 1); if (!i) sl.insertAdjacentHTML('beforeend', '<span class="ledmark">LEAD</span>'); } });
for (const sl of $$('.trick .slot')) if (!sl.style.zIndex) sl.style.zIndex = String(plays.length + 1);

// ---- Piles before the first trick.
const CAT = '<svg class="cat" viewBox="0 0 64 80" aria-hidden="true"><path d="M20 6l5 9c2-.6 4-.9 6-.9s4 .3 6 .9l5-9 2 13c2 3 3 6 3 9 0 5-2 9-6 12 6 5 10 13 10 22 0 6-1 10-3 13h6c4 0 6-2 6-5s-2-4-4-4c-2 0-3 1-3 3h-3c0-4 3-6 6-6 5 0 7 3 7 7 0 5-4 8-9 8H17c-3 0-5-2-5-4s1-4 3-5c-2-4-3-8-3-13 0-9 4-17 10-22-4-3-6-7-6-12 0-3 1-6 3-9z"/></svg>';
const kitty = $$('.center .piles .pile').find(p => /Kitty/.test(p.textContent));
const discardBtn = $('[data-action="confirm-discard"]');
if (kitty && !$('.center .trick')) {
  $('.center .piles').insertAdjacentHTML('afterend', '<div class="kitty-spot"></div>');
  if (discardBtn) {
    const n = window.__outside || 0, layers = Math.min(Math.ceil(n / 3), 4);
    $('.kitty-spot').innerHTML = '<div class="outpile' + (n ? '' : ' empty') + '" aria-label="Outside pile: ' + n + ' cards">' +
      Array.from({ length: layers }, (_, i) => '<div class="card back" style="transform:translate(' + i * 1.5 + 'px,' + (-i * 1.5) + 'px)"></div>').join('') +
      '<div class="op-face" style="transform:translate(' + Math.max(0, layers - 1) * 1.5 + 'px,' + (-Math.max(0, layers - 1) * 1.5) + 'px)"><b class="op-n">' + n + '</b></div></div>';
  } else {
    const cards = $$('.pile-cards .card', kitty).reverse(), top = cards.length - 1;
    $('.kitty-spot').innerHTML = '<div class="kpile" aria-label="Kitty: ' + cards.length + ' cards">' + cards.map((c, i) =>
      c.outerHTML.replace('class="card', 'style="left:calc(' + i + ' * var(--kw) * .45)" class="card').replace(/<\/div>$/, i === top && /\bback\b/.test(c.className) ? CAT + '</div>' : '</div>')).join('') + '</div>';
  }
}

// ---- Actions: every action button in one corner of the play area. Skip is a speed control: top bar.
{ const sk = $('[data-action="skip"]'); if (sk) { sk.classList.add('skip-top'); $('.speed-pick').before(sk); } }
{ const btns = $$('.actionbar .btn, .summary .btn').filter(b => b.dataset.action !== 'skip');
  btns.sort((a, b) => b.classList.contains('primary') - a.classList.contains('primary'));
  if (btns.length) { $('#center').insertAdjacentHTML('beforeend', '<div class="acts"></div>'); for (const b of btns) $('.center > .acts').appendChild(b); }
  const bar = $('.me .actionbar'); if (bar) bar.style.display = 'none'; }
if (window.__leftHand) document.documentElement.classList.add('lefthand');

// ---- Summary chart: drop role notes (the tags carry them); names in their identity color.
for (const tr of $$('.summary table.stats tr')) {
  const c = tr.cells; if (!c || !c.length || tr.querySelector('th')) continue;
  const m = c[0].textContent.match(/^(You|Kit|Tex)/); if (!m) continue;
  c[0].innerHTML = '<span style="color:var(--name' + { You: 0, Kit: 1, Tex: 2 }[m[1]] + ')">' + m[1] + '</span>';
}

// ---- Events are transient: calls and passes are toasts (the game already toasts calls).
for (const b of $$('.seat .bubble, .me .bubble')) {
  const who = (($('.seat-name', b.closest('.seat, .me')) || {}).textContent || '').trim(), t = b.textContent.trim();
  const msg = /^Pass/.test(t) ? who + (who === 'You' ? ' pass' : ' passes') : who + ' ' + t.replace(/^Accepts/, who === 'You' ? 'accept' : 'accepts').replace(/^Names/, who === 'You' ? 'name' : 'names') + ' trump';
  $('#toasts').insertAdjacentHTML('beforeend', '<div class="toast info" style="animation:none">' + msg + '</div>');
}

// ---- Log toggle.
{ const c = !!window.__collapsed;
  $('.logpanel h2').insertAdjacentHTML('beforeend', '<button type="button" class="lp-toggle" aria-expanded="' + !c + '" aria-label="' + (c ? 'Open' : 'Collapse') + ' the Latest Scroll">' + (c ? '‹' : '›') + '</button>');
  if (c) $('.layout').classList.add('log-collapsed'); }
