/* Mockup layer, Advanced v3: v1 (advanced.js) with the v2 trick circles, scores back in the seats, and one uniform
   style (one tag shape; each role keeps its color; the Showdown table is magenta throughout). Not app code.
   Inputs set by the shot scripts: __turn, __led (seat ids), __lastWinner (HTML), __collapsed (log collapsed). */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const css = `
#trumpChip,#handChip,.trick-label,.who,.status,.prompt,.actionbar .hint,.score small,.center .piles,.center .lasttrick{display:none!important}
.actionbar:not(:has(.btn)){display:none}
.seat .discard-note,.hand .hint{display:none!important}
.speed-pick select{display:none}.speed-pick{padding:0 10px}
/* Table: the shared information strip on top, then the seats close around the trick. */
.table{grid-template-areas:"info info info" "west center east" "me me me"!important}
@media (max-width:720px){.table{grid-template-areas:"info info" "west east" "center center" "me me"!important}}
.info{grid-area:info;display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;background:rgba(0,0,0,.22);border-radius:12px;padding:6px}
.info .cell{display:flex;flex-direction:column;justify-content:center;gap:2px;padding:4px 10px;border-radius:8px;background:rgba(255,255,255,.04);min-width:0}
.info .lab{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.info .val{font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px;white-space:nowrap}
.info .pip{font-size:40px;line-height:1;color:#ff6b6b;text-align:center}
.info .lt .card{--w:26px}
.info .lt .card .c-br,.info .lt .card .c-tag{display:none}
.info .lt .card.win-mini{box-shadow:0 0 0 2px var(--gold)}
.info .latest{flex:1 1 180px}
.info .latest .val{font-weight:400;font-size:14px}
.info ul.gamelog{all:unset;display:block}.info ul.gamelog li{list-style:none;padding:0}
.hand{min-height:0!important}
@media (max-width:720px){
  .info{gap:4px;padding:4px}.info .cell{padding:3px 8px}.info .pip{font-size:28px}
  .info .lt{order:5;flex:1 1 100%;flex-direction:row;align-items:center;gap:8px}
  .info .latest{order:6;flex:1 1 100%;flex-direction:row;align-items:center;gap:8px}
  .info .lt .lab,.info .latest .lab{min-width:64px}
  .info .muted{flex:1 1 0}
}
.info .muted .val{font-weight:600;font-size:13px;color:var(--muted)}
.center{justify-content:center}
.trick{grid-template-rows:calc(var(--cw)*.55) auto!important}
/* Seats */
.score{font-size:46px!important}
.seat-name{font-size:21px!important}
.seat-east .seat-head{flex-direction:row-reverse}
.seat-east{align-items:flex-end}
.seat-east .score-row{justify-content:flex-end}
.seat .seat-head{order:0}.seat .tagbox{order:1}.seat .backs{order:2}.seat .score-row{order:3}.seat .won{order:4}
/* Hand backs ride on the name line, pushed to the inner side (toward the trick). */
.seat .seat-head{flex-wrap:nowrap;align-self:stretch;min-width:0}
.seat .seat-head .seat-name{min-width:0;overflow:hidden;text-overflow:ellipsis}
@media (max-width:720px){.seat .seat-head .mini-back{width:12px;height:18px;margin-right:-9px}}
.info .latest{min-width:0}.info .latest .val{white-space:normal;overflow:hidden;display:block}
.seat .seat-head .backs{margin-left:auto;flex:none;padding-right:8px}
.seat .seat-head .mini-back{margin-right:-8px}
.seat-east .seat-head .backs{padding-right:8px}
.seat-east .seat-head .backs{margin-left:0;margin-right:auto}
/* Tags: one uniform size, packed from the seat's outer edge in a fixed order as they come up.
   The tag area keeps a fixed height (two rows for bots), so names, backs and scores line up. */
.tagbox{display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;width:100%;min-height:44px}
.seat-east .tagbox{direction:rtl}
.tagbox .tag{margin:0;flex:0 0 calc((100% - 8px) / 3);height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;padding:0 2px;overflow:hidden;white-space:nowrap;direction:ltr}
.seat .tagbox .tag.mediator,.seat .tagbox .tag.duelist{flex-basis:calc((100% - 8px) / 3 * 2 + 4px)}
/* Bid bubbles float from the seat's inner edge over the table, so they never push the seat's contents. */
.seat{position:relative}
.seat .bubble{position:absolute;top:8px;z-index:6;margin:0;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.4)}
.seat-west .bubble{left:calc(100% + 8px)}.seat-east .bubble{right:calc(100% + 8px)}
.me .tagbox{width:auto;min-height:20px;flex:0 1 auto}.me .tagbox .tag{flex-basis:66px}.me .tagbox .tag.duelist,.me .tagbox .tag.mediator{flex-basis:auto;padding:0 8px}
@media (max-width:720px){.tagbox .tag{font-size:9px;letter-spacing:0}.me .tagbox .tag{flex-basis:calc((100% - 12px) / 4)}.me .tagbox .tag.mediator{flex-basis:auto;padding:0 6px}.me .tagbox{flex:1 1 200px;min-height:20px}}
.won{all:unset;display:flex;flex-wrap:wrap;align-items:center;gap:4px 0;min-height:48px;padding:4px;cursor:pointer;border-radius:8px;max-width:100%}
.won.none{display:none}
.wonrows{display:flex;flex-direction:column;gap:2px;order:4}
.seat-east .wonrows{align-items:flex-end}
.me > .wonrows{order:9;align-self:center;align-items:center}
.won.sdrow .wt span{border-color:#ff9ad5}
.won:hover{background:rgba(255,255,255,.06)}.won:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.seat-east .won{align-self:flex-end;flex-direction:row-reverse}
.me .won{min-height:0;padding:2px 4px}
.won .wt{position:relative;flex:none}.won .wt.v{width:28px;height:46px}.won .wt.h{width:46px;height:28px}
.won .wt span{position:absolute;inset:0;border-radius:3px;border:1px solid #f5f2e9;background:repeating-linear-gradient(45deg,#7a1f2b 0 3px,#93303d 3px 6px);box-shadow:0 1px 2px rgba(0,0,0,.45)}
/* Trick cards in 3D: the table tilts away from you, each bot card turns to face your slot, lifted and larger. */
.trick{perspective:900px;perspective-origin:50% 120%;min-height:calc(var(--cw)*2.7)!important;padding:18px 10px 14px!important}
.trick .slot{transform-style:preserve-3d}
.trick .slot .card,.trick .slot .empty{--w:calc(var(--cw)*1.22);width:var(--w);height:calc(var(--w)*1.4);transition:transform .3s}
.trick .slot .card,.trick .slot .empty{--w:calc(var(--cw)*1.5)!important}
.trick .slot{position:relative}
.trick .slot-1{justify-self:end;margin-right:calc(var(--cw)*-.22)}
.trick .slot-2{justify-self:start;margin-left:calc(var(--cw)*-.22)}
.trick .slot .empty{background:none;border-color:#8fa79a}
.trick .slot-1 .empty,.trick .slot-2 .empty{visibility:hidden}
.trick{min-height:calc(var(--cw)*4.2)!important}
.trick .slot-1 .card{transform:rotateX(22deg) rotateY(16deg) rotateZ(-14deg) translateZ(30px);box-shadow:-10px 18px 22px rgba(0,0,0,.5)}
.trick .slot-2 .card{transform:rotateX(22deg) rotateY(-16deg) rotateZ(14deg) translateZ(30px);box-shadow:10px 18px 22px rgba(0,0,0,.5)}
.trick .slot-0 .card,.trick .slot-0 .empty{transform:rotateX(22deg) translateZ(30px)}
.trick .slot-0 .card{box-shadow:0 18px 22px rgba(0,0,0,.5)}
.c-tag.king{background:#f2c14e;color:#1b1b1b}
.gamelog li.gap:first-child{margin-top:0}
.info .hand.wide{flex:0 0 auto;min-width:140px}
.info .out .val{gap:8px}
.minis{display:inline-flex}
.mc{width:14px;height:20px;border-radius:2px;border:1px solid #f5f2e9;background:repeating-linear-gradient(45deg,#7a1f2b 0 2px,#93303d 2px 4px);display:inline-grid;place-items:center;font-size:8px;font-weight:800;line-height:1}
.mc + .mc{margin-left:3px}
.mc.up{background:#fdfbf5;color:#1b1b1b;width:20px}.mc.up.red{color:#d32f2f}
.table.showdown .not-sd{background:var(--felt-edge)!important}
.skip-top{height:40px;padding:0 12px;font-size:14px}
.won .wt span .tn{position:absolute;inset:0;display:grid;place-items:center;font-size:20px;font-weight:900;opacity:.6;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.seat-west .won .wt span .tn,.me .won .wt span .tn{place-items:center start;padding-left:3px}.seat-east .won .wt span .tn{place-items:center end;padding-right:3px}
/* Seats: a fixed ratio, so West and East always match. */
/* West and East take the play area's height (the trick, or the summary chart), so all three line up. */
/* Seats size to the space: West and East stretch to the play row's height; the center takes the rest of the width. */
.seat-west,.seat-east{align-self:stretch}
.table{grid-template-columns:minmax(150px,.85fr) minmax(0,2.3fr) minmax(150px,.85fr)!important}
@media (max-width:720px){.table{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}}
.center{justify-content:safe center}
}
/* Your seat: a fixed ratio. Hand cards crowd (overlap) to stay on one row; won tricks go below the hand. */
/* Your seat: full width, height from its content. The hand never overlaps: it wraps to a second row when needed. */
.me{justify-content:flex-start}
.me .hand{flex-wrap:wrap;gap:6px;padding-top:10px}
.me .hand .card{flex:none}
.me > .won{order:9;align-self:center}
/* Scores move into the play area: West upper left, East upper right, you directly under your dashed space. */
.center{position:relative}
/* Score bands: the play area always reserves the same space for the scores (top band for West and East, a band
   under your slot for yours), whatever their values. A zero score keeps its space, invisible. Centering is
   measured inside the bands, so scores never move anything. */
.center{position:relative;padding-top:58px!important;padding-bottom:6px;min-height:calc(var(--cw)*4.2 + 128px)}
.trick{padding-bottom:64px!important}
.center > .pscore,.trick > .pscore{position:absolute;top:-52px;z-index:8;font-size:46px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;pointer-events:none}
.center > .pscore.w,.trick > .pscore.w{left:12px}.center > .pscore.e,.trick > .pscore.e{right:12px}
/* A summary chart already shows the scores: no play-area scores then. Its names and scores are larger, in name colors. */
.center:has(.summary) > .pscore,.center:has(.summary) .trick .pscore{display:none}
.summary table.stats td:first-child{white-space:nowrap;font-size:18px;font-weight:800;text-align:left}
.summary table.stats td:first-child small{font-size:12px;font-weight:600;color:var(--muted)}
.summary table.stats td:last-child{font-size:26px;font-weight:800;line-height:1.1}
.trick .slot-0{margin-top:calc(var(--cw)*1.5*1.4*.45)}
/* Scores never take layout space: they float, so they never shift the centering of anything. */
.trick .slot-0 .pscore{position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);color:var(--ink);font-size:46px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;pointer-events:none}
.center > .pscore.pme{left:50%;bottom:-52px;top:auto;transform:translateX(-50%)}
.center:not(:has(.trick)){padding-bottom:58px!important}
.center:not(:has(.trick)) > .pscore.pme{bottom:6px}
.center:not(:has(.trick)) > .pscore.w,.center:not(:has(.trick)) > .pscore.e{top:6px}
/* Kitty: before the first trick, the kitty lies in the middle of the table as one squared stack; at turn-up its top card is face up. */
.kitty-spot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:calc(var(--cw)*3.3)}
.kitty-spot .piles-row{display:flex;align-items:center;justify-content:center;gap:calc(var(--kw)*.5)}
.kitty-spot{--kw:var(--cw)}
.kpile{position:relative;width:calc(var(--kw)*(1 + 2 * .45));height:calc(var(--kw)*1.4)}
.kpile .card{position:absolute;top:0;--w:var(--kw);box-shadow:0 2px 5px rgba(0,0,0,.45);transform-origin:50% 90%}
.kpile .card .cat{position:absolute;left:15%;top:10%;width:70%;height:80%;fill:#000;opacity:.5}
/* Action buttons: bottom of the play area, right-justified (primary action rightmost, Pass to its left).
   Left-hand mode (a future setting) mirrors it: bottom left, primary action leftmost. */
.center > .pile-act{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);z-index:9;flex-direction:row-reverse}
.pile-act{display:flex;flex-wrap:nowrap;gap:8px}.pile-act .btn{font-size:15px;padding:8px 18px;white-space:nowrap;flex:none}
.outpile{position:relative;width:var(--kw);height:calc(var(--kw)*1.4)}
/* Discards start under the center of the discarding player's seat (measured), so they slide out from beneath it:
   the seats sit above the play area in the stacking order. */
.table > .seat,.table > .me{position:relative;z-index:5;background:linear-gradient(var(--panel),var(--panel)),var(--felt-edge)!important}
.table.showdown > .seat,.table.showdown > .me{background:linear-gradient(var(--panel),var(--panel)),var(--felt-showdown-edge)!important}
.table > .center{z-index:1}
.olayer.from-1{--from:translate(-230%,-10%) rotate(-38deg)}.olayer.from-2{--from:translate(230%,-10%) rotate(38deg)}.olayer.from-0{--from:translate(0,190%) rotate(0deg)}
@media (max-width:720px){.olayer.from-1{--from:translate(-150%,-230%) rotate(-30deg)}.olayer.from-2{--from:translate(150%,-230%) rotate(30deg)}}
.outpile .olayer{position:absolute;inset:0;transform:translate(var(--dx),var(--lift)) rotate(var(--rest));animation:olayer var(--ms) ease-out both}
.outpile .olayer .card{animation:ofan var(--ms) ease-out both}
@keyframes olayer{from{transform:var(--from)}to{transform:translate(var(--dx),var(--lift)) rotate(var(--rest))}}
@keyframes ofan{0%{transform:translateX(var(--fx)) rotate(var(--fan))}60%{transform:translateX(calc(var(--fx) * .6)) rotate(calc(var(--fan) * .6))}100%{transform:translate(calc(var(--fx) * .12),0) rotate(calc(var(--fan) * .3))}}
@media (prefers-reduced-motion:reduce){.outpile .olayer,.outpile .olayer .card{animation:none}}
.outpile .card{position:absolute;left:0;top:0;--w:var(--kw);box-shadow:0 2px 4px rgba(0,0,0,.4)}
.outpile.empty{border:2px dashed #8fa79a;border-radius:calc(var(--cw)*.12)}
.outpile .op-face{position:absolute;inset:0;z-index:5;display:grid;place-items:center}
.outpile .op-n{font-size:calc(var(--cw)*.9);font-weight:900;line-height:1;color:rgba(0,0,0,.45)}
.outpile.empty .op-n{color:rgba(255,255,255,.22)}
/* Log: a toggle collapses it to a side tab (wide screens) or a one-line bar (narrow screens). */
.logpanel h2{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lp-toggle{all:unset;cursor:pointer;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:var(--ink);font-size:16px}
.lp-toggle:hover{background:rgba(255,255,255,.08)}.lp-toggle:focus-visible{outline:2px solid var(--gold)}
.layout.log-collapsed .logpanel{min-height:0}
.layout.log-collapsed #gameLog{display:none}
@media (min-width:1150px){
  .layout.log-collapsed{grid-template-columns:minmax(0,1fr) 48px!important}
  .layout.log-collapsed .logpanel{padding:10px 4px;align-items:center}
  .layout.log-collapsed .logpanel h2{flex-direction:column-reverse;writing-mode:vertical-rl;margin:0}
  .layout.log-collapsed .logpanel h2 .lp-toggle{writing-mode:horizontal-tb}
}
/* ---- v3 ---- */
/* Card sizes: five named tiers, every card on screen uses one of them.
   Big: everything in the play area (the trick, the kitty, the outside pile). Normal: your hand. Small: spare tier.
   Tiny: face-down backs (hand counts on the seats, the Showdown outside pile).
   Micro: text-sized cards (the log, the information strip), the same width as the name chips. */
:root{--card-big:calc(var(--cw)*1.5);--card-normal:var(--cw);--card-small:var(--cw-small);--card-tiny:14px;--card-micro:40px}
.trick .slot .card,.trick .slot .empty{--w:var(--card-big)!important}
.hand .card{--w:var(--card-normal)}
.kitty-spot{--kw:var(--card-big)!important}
.mini-back,.seat .seat-head .mini-back{width:var(--card-tiny)!important;height:calc(var(--card-tiny)*1.45)!important}
.mc{width:var(--card-tiny)!important;height:calc(var(--card-tiny)*1.45)!important}
.gamelog .p0,.gamelog .p1,.gamelog .p2,.gamelog .card-tag,.micro{display:inline-block;box-sizing:border-box;width:var(--card-micro);text-align:center;padding:0;line-height:1.35;border-radius:4px;white-space:nowrap;vertical-align:baseline}
.micro{background:#fff;color:#1b1b1b;font-weight:800;font-size:13px}.micro .rank{color:#6b6b6b}.micro .pip-red{color:#d32f2f}.micro .pip-black{color:#000}
.micro + .micro,.micro + .mc,.mc + .micro{margin-left:4px}
.pips{display:flex;gap:4px;order:4;min-height:14px;align-items:center}
.seat-east .pips{align-self:flex-end;flex-direction:row-reverse}
.pips i{flex:none;width:12px;height:12px;border-radius:50%;border:1.5px solid rgba(255,255,255,.45)}.pips i.on{background:var(--ink);border-color:var(--ink)}
.me > .pips{order:9;align-self:center}
.sscore{font-size:26px!important;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:var(--ink)!important}
.summary table.stats td:last-child{color:var(--ink)!important}
.center{padding-top:10px!important}
/* One uniform style: one table color, one tag style. */
/* The Showdown keeps its magenta table, the whole table, every seat alike. */
.table.showdown .not-sd{background:var(--panel)!important}
/* Tags: each role keeps its own color (filled); the shape is uniform: one pill, one size, one weight. */
.tagbox .tag.mediator,.tagbox .tag.duelist{flex-basis:calc((100% - 8px) / 3)!important}
.me .tagbox .tag.mediator,.me .tagbox .tag.duelist{flex-basis:66px!important;padding:0 2px!important}
.tag.receiver{background:#e07b28!important;color:#1b1b1b!important}
.tagbox .tag{border-radius:999px;font-weight:800;letter-spacing:.03em;box-shadow:0 1px 2px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.18)}
`;
document.head.insertAdjacentHTML('beforeend', '<style id="mockAdv">' + css + '</style>');

// Top bar: speed icon with a label.
const sp = $('.speed-pick'), cur = $('#speedSel'); sp.title = 'Speed: ' + cur.options[cur.selectedIndex].text;
// Seats: tags in a fixed order (Human/AI, Dealer, Namer, Kitty, Turn, Led, Mediator or Showdown [duelist]), packed as they come up;
// won-trick stacks replace the text.
const SLOTS = [['ai you', 'id'], ['dealer', 'dealer'], ['caller', 'namer'], ['receiver', 'kitty'], ['turn', 'turn'], ['led', 'led'], ['mediator duelist', 'sd']];
for (const t of $$('.tag.duelist')) { t.textContent = 'SD'; t.title = 'Showdown'; }
// Which trick numbers each seat won this hand, read from the log (oldest first at this point).
const WON = { 0: [], 1: [], 2: [] }, SDWON = { 0: [], 1: [], 2: [] }, NAME = { You: 0, Kit: 1, Tex: 2 }, curHand = KCT.App.app.state.handNumber;
{ let h = 0;
  for (const li of $$('#gameLog li')) {
    const t = li.textContent, hm = t.match(/^Hand (\d+)\b/); if (hm) h = +hm[1];
    const w = t.match(/^(You|Kit|Tex) wins? trick (\d+)/); if (w && h === curHand) WON[NAME[w[1]]].push(+w[2]);
    const sw = t.match(/^(You|Kit|Tex) wins? Showdown trick (\d+)/); if (sw && h === curHand) SDWON[NAME[sw[1]]].push(+sw[2]);
  } }
for (const s of $$('#seat1,#seat2,#seat0')) {
  const head = $('.seat-head,.me-head', s), id = +s.id.slice(4);
  if (window.__turn === id) head.insertAdjacentHTML('beforeend', '<span class="tag turn" style="background:#2e7d32;color:#fff">Turn</span>');
  if (window.__led === id) head.insertAdjacentHTML('beforeend', '<span class="tag led" style="background:#00838f;color:#fff">Led</span>');
  const tags = $$('.tag', head), box = document.createElement('div');
  box.className = 'tagbox';
  for (const [classes, slot] of SLOTS) {
    const t = tags.find(x => classes.split(' ').some(c => x.classList.contains(c)));
    if (t) box.appendChild(t);
  }
  const backs = $(':scope > .backs', s); if (backs && s.id !== 'seat0') head.appendChild(backs);
  const score = $('.score', head);
  if (s.id === 'seat0') head.insertBefore(box, score); else head.after(box);
  const tr = $('.tricks', s);
  // Won tricks: one row per pile (a single button each). Each trick is a rough stack of three backs at truly random
  // angles, all vertical; each overlaps the one before it by 20% of its width. The top back carries the trick
  // number in the winner's name color, half transparent. In a Showdown a tied player has two rows: the Showdown
  // tricks (first) and the main-hand tricks; the mediator keeps only the main-hand row.
  const rnd = (a) => (Math.random() * 2 - 1) * a;
  const east = s.id === 'seat2', side = east ? 'margin-right' : 'margin-left';
  const pile = (nums, label) => !nums.length ? '' : '<button type="button" class="won' + (label ? ' sdrow' : '') + '" aria-label="' + (label || '') + nums.length + (nums.length === 1 ? ' trick' : ' tricks') + ' won: trick ' + nums.join(', ') + '" title="' + (label || '') + 'trick ' + nums.join(', ') + '">' +
    nums.map((num, i) => '<div class="wt v" style="' + (i ? side + ':' + (-28 * 0.2) + 'px;' : '') + 'z-index:' + (i + 1) + ';transform:translateY(' + rnd(3).toFixed(1) + 'px) rotate(' + rnd(9).toFixed(1) + 'deg)">' +
      [0, 1, 2].map(k => '<span style="transform:translate(' + rnd(2.5).toFixed(1) + 'px,' + rnd(2.5).toFixed(1) + 'px) rotate(' + rnd(7).toFixed(1) + 'deg)">' +
        (k === 2 ? '<b class="tn" style="color:var(--name' + id + ')">' + num + '</b>' : '') + '</span>').join('') + '</div>').join('') + '</button>';
  // Tricks: circles that fill as tricks are won. A tied player in a Showdown counts Showdown tricks (of 5);
  // everyone else counts this hand's tricks (of 7).
  const tt = tr.textContent, sdM = tt.match(/Showdown tricks:\s*(\d+)/), mainM = tt.match(/(?:this hand|main hand):\s*(\d+)/);
  const nWon = sdM ? +sdM[1] : mainM ? +mainM[1] : 0, of = sdM ? 5 : 7;
  tr.outerHTML = '<div class="pips" role="img" aria-label="' + nWon + ' of ' + of + ' tricks won">' + Array.from({ length: of }, (_, i) => '<i' + (i < nWon ? ' class="on"' : '') + '></i>').join('') + '</div>';
}
// KING tag on full-size Kings only (not the small last-trick cards).
for (const c of $$('.card[data-card^="K"]')) if (!c.closest('.lasttrick') && !$('.c-tag', c)) c.insertAdjacentHTML('beforeend', '<span class="c-tag king">KING</span>');

// Log: a full scroll, newest first. Groups start at li.gap; each keeps its heading on top, its lines newest first.
const log = $('#gameLog'), groups = [];
for (const li of [...log.children]) { if (!groups.length || li.classList.contains('gap')) groups.push([]); groups[groups.length - 1].push(li); }
log.scrollTop = 0; log.replaceChildren(...groups.reverse().flatMap(g => g[0].classList.contains('gap') ? [g[0], ...g.slice(1).reverse()] : g.slice().reverse()));

// Shared information strip: everything both sides of the table share.
const st = KCT.App.app.state, sym = { S: '♠', H: '♥', D: '♦', C: '♣' }, red = st.trump === 'H' || st.trump === 'D';
const lt = $('.center .lasttrick'), ltCards = lt ? $$('.card', lt).map(c => c.outerHTML).join('') : '';
const latest = [...log.children].find(li => !li.classList.contains('gap'));
const pilesTxt = (($('.center .piles') || {}).textContent || '');
const outN = pilesTxt.match(/Outside pile \((\d+)\)/);
const turnedTxt = pilesTxt.match(/Turned card:\s*(\S+)/) || pilesTxt.match(/turned\s+((?:10|[2-9AKQJ])[♠♥♦♣])/i);
const tl = (($('.trick-label') || {}).textContent || '').match(/(Showdown )?trick (\d+) of (\d+)/i);
const trickVal = tl ? (tl[1] ? 'Showdown ' : 'Trick ') + tl[2] + '/' + tl[3] : '–';
const cell = (cls, lab, val) => '<div class="cell ' + cls + '"><span class="lab">' + lab + '</span><span class="val">' + val + '</span></div>';
// No dashes: a cell with nothing to show hides. During a Showdown the turned card no longer matters, so Turned up
// hides and the Hand cell widens.
// Outside: in normal play, just the count. In a Showdown the 12 outside cards are dealt out, and each tied player
// discards 1 face down, so the Showdown's outside pile is those discards: one tiny card each, face up when it is
// the card you discarded (you know it), face down otherwise.
const isSD = $('#table').classList.contains('showdown');
const myOut = st.myOut || [], sdN = st.sdDiscards || 0;
const micro = (rank, suit) => '<span class="micro"><span class="rank">' + rank + '</span><span class="' + (/[♥♦]/.test(suit) ? 'pip-red' : 'pip-black') + '">' + suit + '</span></span>';
const mini = id => { const m = String(id).match(/^(10|[2-9AKQJ])([SHDC])$/); return m ? micro(m[1], sym[m[2]]) : '<span class="mc"></span>'; };
const sdOut = sdN ? '<span class="minis">' + Array.from({ length: sdN }, (_, i) => i < myOut.length ? mini(myOut[i]) : '<span class="mc"></span>').join('') + '</span>' : '';
const outCell = isSD ? (sdN ? cell('muted out', 'Outside', sdOut) : '') : (outN ? cell('muted', 'Outside', outN[1]) : ($('[data-action="confirm-discard"]') ? cell('muted', 'Outside', String(window.__outside || 0)) : ''));
$('#table').insertAdjacentHTML('afterbegin', '<section class="info" aria-label="Shared information">' +
  (st.trump ? cell('', 'Trump', '<span class="pip" style="color:' + (red ? '#ff6b6b' : 'var(--ink)') + '">' + sym[st.trump] + '</span>') : '') +
  cell(isSD && tl ? 'hand wide' : 'hand', 'Hand ' + st.handNumber, tl ? trickVal : '') +
  cell('latest', 'Latest', latest ? '<ul class="gamelog">' + latest.outerHTML.replace(/class="[^"]*"/, '') + '</ul>' : '') +
  (turnedTxt && !isSD ? cell('muted', 'Turned up', (m => m ? micro(m[1], m[2]) : turnedTxt[1])(turnedTxt[1].match(/^(10|[2-9AKQJ])([♠♥♦♣])$/))) : '') +
  outCell +
  '</section>');

// Trick stacking: each card sits above the cards played before it; your empty slot, still to play, is on top.
const plays = (st.trick && st.trick.plays) || [];
plays.forEach((pl, i) => { const sl = $('.trick .slot-' + pl.player); if (sl) sl.style.zIndex = String(i + 1); });
for (const sl of $$('.trick .slot')) if (!sl.style.zIndex) sl.style.zIndex = String(plays.length + 1);

log.scrollTop = 0;

// Kitty in the middle of the table before the first trick: spread flat and overlapping like the bots' hand backs
// (each card covers more than half of the one before), so its few cards can be counted. Until the
// turn-up, the top card carries a black cat silhouette at 50% opacity.
const CAT = '<svg class="cat" viewBox="0 0 64 80" aria-hidden="true"><path d="M20 6l5 9c2-.6 4-.9 6-.9s4 .3 6 .9l5-9 2 13c2 3 3 6 3 9 0 5-2 9-6 12 6 5 10 13 10 22 0 6-1 10-3 13h6c4 0 6-2 6-5s-2-4-4-4c-2 0-3 1-3 3h-3c0-4 3-6 6-6 5 0 7 3 7 7 0 5-4 8-9 8H17c-3 0-5-2-5-4s1-4 3-5c-2-4-3-8-3-13 0-9 4-17 10-22-4-3-6-7-6-12 0-3 1-6 3-9z"/></svg>';
const kitty = $$('.center .piles .pile').find(p => /Kitty/.test(p.textContent));
if (kitty && !$('.center .trick')) {
  const cards = $$('.pile-cards .card', kitty).reverse(), top = cards.length - 1;
  $('.center .piles').insertAdjacentHTML('afterend', '<div class="kitty-spot"><div class="piles-row"><div class="kpile" aria-label="Kitty: ' + cards.length + ' cards">' +
    cards.map((c, i) => c.outerHTML.replace('class="card', 'style="left:calc(' + i + ' * var(--kw) * .45)" class="card')
      .replace(/<\/div>$/, i === top && /\bback\b/.test(c.className) ? CAT + '</div>' : '</div>')).join('') + '</div></div></div>');
}
// Discard phase: the outside pile is a neat squared stack in the kitty's spot (the kitty shows from the bids on), its count on the top card in transparent
// black. The action buttons sit above both piles.
const discardBtn = $('[data-action="confirm-discard"]');
if (discardBtn && $('.kitty-spot')) {
  const n = window.__outside != null ? window.__outside : $$('.seat .discard-note, .me .discard-note').filter(d => /Discarded/.test(d.textContent)).length * 3;
  // One coherent pile, built in layers: each player's 3 discards arrive as a small fan from that player's seat, at the
  // seat's angle (the same angles as the trick), then square up into a layer that keeps a slight turn toward its seat.
  // Animation length follows the game speed; Instant skips it.
  const kp = $('.kitty-spot .kpile'); if (kp) kp.remove();   // one spot, one pile at a time: discards now, kitty at the bids
  $('.kitty-spot .piles-row').insertAdjacentHTML('beforeend', '<div class="outpile' + (n ? '' : ' empty') + '" aria-label="Outside pile: ' + n + ' cards"></div>');
  const pile = $('.kitty-spot .outpile');
  const SEAT = { 1: { from: 'translate(-230%,-10%) rotate(-38deg)', rest: -7, dx: -3 }, 2: { from: 'translate(230%,-10%) rotate(38deg)', rest: 6, dx: 3 }, 0: { from: 'translate(0,190%) rotate(0deg)', rest: 1, dx: 0 } };
  const ms = { slow: 700, normal: 450, fast: 250, instant: 0 }[($('#speedSel') || {}).value] ?? 450;
  window.__addDiscard = (seat, animate = true) => {
    const k = SEAT[seat], i = pile.children.length;
    pile.classList.remove('empty');
    const pr = pile.getBoundingClientRect(), sr = document.getElementById('seat' + seat).getBoundingClientRect();
    const fx = (sr.left + sr.width / 2) - (pr.left + pr.width / 2), fy = (sr.top + sr.height / 2) - (pr.top + pr.height / 2);
    pile.insertAdjacentHTML('beforeend', '<div class="olayer" style="--from:translate(' + fx.toFixed(0) + 'px,' + fy.toFixed(0) + 'px) rotate(' + (k.rest * 4) + 'deg);--rest:' + k.rest + 'deg;--dx:' + k.dx + 'px;--lift:' + (-i * 2) + 'px;--ms:' + (animate ? ms : 0) + 'ms">' +
      [-1, 0, 1].map(j => '<div class="card back" style="--fan:' + (j * 9) + 'deg;--fx:' + (j * 14) + 'px"></div>').join('') + '</div>');
  };
  for (const seat of (window.__discarders || [1, 2, 0]).slice(0, Math.min(Math.round(n / 3), 3))) window.__addDiscard(seat, false);
  $('.kitty-spot').insertAdjacentHTML('afterbegin', '<div class="pile-act"></div>');
  $('.kitty-spot .pile-act').appendChild(discardBtn);
}
// Bidding: the same rule, the action buttons go below the kitty.
if (!discardBtn && $('.kitty-spot') && $('.actionbar .btn')) {
  $('.kitty-spot').insertAdjacentHTML('afterbegin', '<div class="pile-act"></div>');
  for (const b of $$('.actionbar .btn')) $('.kitty-spot .pile-act').appendChild(b);
}
// Log toggle.
const lpH = $('.logpanel h2'), collapsed = !!window.__collapsed;
lpH.insertAdjacentHTML('beforeend', '<button type="button" class="lp-toggle" aria-expanded="' + !collapsed + '" aria-label="' + (collapsed ? 'Open' : 'Collapse') + ' the Latest Scroll" title="' + (collapsed ? 'Open' : 'Collapse') + ' the Latest Scroll">' + (collapsed ? '‹' : '›') + '</button>');
if (collapsed) $('.layout').classList.add('log-collapsed');

// Scores: back in the seats, a plain number on the name line beside the name. A zero keeps its space, invisible.
for (const id of ['seat1', 'seat2', 'seat0']) {
  const sc = $('#' + id + ' .score'); if (!sc) continue;
  const row = sc.closest('.score-row'), name = $('#' + id + ' .seat-name');
  sc.classList.add('sscore'); name.after(sc);
  if (row && !row.children.length) row.remove();
}

// Summary chart: color each name and score in the player's name color; the role note goes small.
for (const tr of $$('.summary table.stats tbody tr, .summary table.stats tr')) {
  const c = tr.cells; if (!c || !c.length || tr.querySelector('th')) continue;
  const m = c[0].textContent.match(/^(You|Kit|Tex)(.*)$/); if (!m) continue;
  const id = NAME[m[1]], col = 'var(--name' + id + ')';
  const extra = m[2].replace(/\([^)]*\)/g, '').trim();   // role notes repeat the tags: dropped
  c[0].innerHTML = '<span style="color:' + col + '">' + m[1] + '</span>' + (extra ? ' ' + extra : '');

}

// Your seat: won tricks below the hand; the hand knows its card count for crowding.
{ const me = $('#seat0'), won = $('#seat0 .pips'), hand = $('#hand');
  if (won) me.appendChild(won);
  if (hand) hand.style.setProperty('--n', String(Math.max(2, hand.children.length))); }

// Seats are seats; action happens in the play area. Every action button, in every phase, moves to the play
// area's corner, primary action outermost. Your seat keeps no action bar.
{ const center = $('#center');
  let pa = $('.kitty-spot .pile-act');
  if (!pa) { center.insertAdjacentHTML('beforeend', '<div class="pile-act"></div>'); pa = $('.center > .pile-act'); }
  else center.appendChild(pa);
  const btns = $$('.actionbar .btn');
  btns.sort((a, b) => b.classList.contains('primary') - a.classList.contains('primary'));   // primary first = outermost
  for (const b of btns) pa.appendChild(b);
  if (!pa.children.length) pa.remove();
  const bar = $('.me .actionbar'); if (bar) bar.style.display = 'none'; }

// Calls (Accepts ♥, Names ♥) are toasts, not seat bubbles: the game already toasts them. Pass bubbles stay.
for (const b of $$('.seat .bubble.call, .me .bubble.call')) {
  const seat = b.closest('.seat, .me'), who = (($('.seat-name', seat) || {}).textContent || '').trim();
  const t = b.textContent.trim().replace(/^Accepts\s+/, 'accepts ').replace(/^Names\s+/, 'names ');
  $('#toasts').insertAdjacentHTML('beforeend', '<div class="toast info" style="animation:none">' + (who === 'You' ? 'You ' + t.replace(/^accepts/, 'accept').replace(/^names/, 'name') : who + ' ' + t) + ' trump</div>');
  b.remove();
}
// Pass is a toast too. Pass bubbles leave the seats.
for (const b of $$('.seat .bubble.pass, .me .bubble.pass')) {
  const who = (($('.seat-name', b.closest('.seat, .me')) || {}).textContent || '').trim();
  $('#toasts').insertAdjacentHTML('beforeend', '<div class="toast info" style="animation:none">' + who + (who === 'You' ? ' pass' : ' passes') + '</div>');
  b.remove();
}
// A tag that gets added is announced once by a toast (Dealer, Kitty, Mediator/Showdown; Namer is the trump call above).
// Turn and Led change every play, so they stay tag-only. The mockup toasts the newest such event in the log.
{ const first = $('#gameLog li'), t = first ? first.textContent.trim() : '';
  let m, msg = null;
  if ((m = t.match(/^Hand \d+: (\w+) deals/))) msg = m[1] + ' deals';
  else if ((m = t.match(/^(\S+) goes to (\w+)/))) msg = m[1] + ' goes to ' + m[2] + ' · Kitty';
  else if ((m = t.match(/^SHOWDOWN! (\w+) and (\w+) tied.*?(\w+) (?:are|is) the mediator/))) msg = 'SHOWDOWN! ' + m[1] + ' vs ' + m[2] + ' · ' + (m[3] === 'You' ? 'you mediate' : m[3] + ' mediates');
  if (msg && !$$('#toasts .toast').some(x => x.textContent === msg)) $('#toasts').insertAdjacentHTML('afterbegin', '<div class="toast info" style="animation:none">' + msg + '</div>'); }

// Showdown: no banner; the seat that is not in the Showdown keeps the regular table color.
{ const b = $('.center .banner'); if (b) b.remove();
  for (const t of $$('.tag.mediator')) { const seat = t.closest('.seat, .me'); if (seat) seat.classList.add('not-sd'); } }
// Skip is a speed control: a temporary button in the top bar, left of the speed icon.
{ const sk = $('[data-action="skip"]'), sp = $('.speed-pick');
  if (sk && sp) { sk.classList.add('skip-top'); sp.before(sk); const pa = $('.center > .pile-act'); if (pa && !pa.children.length) pa.remove(); } }
// Names never truncate: the hand backs give way first.
document.head.insertAdjacentHTML('beforeend', '<style>.seat .seat-head .seat-name{flex:none;overflow:visible}.seat .seat-head .backs{min-width:0;overflow:hidden}@media (max-width:720px){.sscore{font-size:22px!important}}</style>');
// No mirroring: East reads exactly like West (left-aligned, same order). Opponents' hand backs get their own row,
// just above the trick circles.
for (const s of $$('#seat1,#seat2')) {
  const b = $('.seat-head .backs', s), p = $('.pips', s);
  if (b && p) { b.classList.add('backrow'); p.before(b); }
}
document.head.insertAdjacentHTML('beforeend', `<style>
.seat-east{align-items:stretch!important}
.seat-east .seat-head{flex-direction:row!important}
.seat-east .tagbox{direction:ltr!important}
.seat-east .pips{align-self:flex-start!important;flex-direction:row!important}
.seat-east .score-row{justify-content:flex-start!important}
.seat .backrow{order:3;display:flex;align-self:flex-start;margin:0!important;padding:0 0 0 0!important;min-height:calc(var(--card-tiny)*1.45)}
.seat .backrow .mini-back{margin-right:-6px!important}
.seat .pips{order:4}
</style>`);
// Toasts appear over the play area, not over the information strip or the seats.
{ const t = $('#toasts'), c = $('#center'); if (t && c) { c.appendChild(t); t.classList.add('in-play'); } }
document.head.insertAdjacentHTML('beforeend', `<style>
#toasts.in-play{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:min(92%,380px);z-index:20}
.tagbox .tag{font-size:9.5px!important;letter-spacing:0!important;padding:0 3px!important}
.me .tagbox .tag{flex-basis:72px!important}
</style>`);

// Kitty animations, in the same language as the discards: cards slide out from under (or back under) a seat.
// __kittyDeal(dealer): the dealer's 3 kitty cards slide out from under the dealer's seat into the spread, one by one.
// __kittyTake(receiver): the turned card slides under the receiver's seat; the other 2 square into the outside pile.
{ const speedMs = () => ({ slow: 700, normal: 450, fast: 250, instant: 0 }[($('#speedSel') || {}).value] ?? 450);
  const offset = (el, seat) => { const a = el.getBoundingClientRect(), b = document.getElementById('seat' + seat).getBoundingClientRect();
    return [(b.left + b.width / 2) - (a.left + a.width / 2), (b.top + b.height / 2) - (a.top + a.height / 2)]; };
  const tilt = { 1: -30, 2: 30, 0: 0 };
  window.__kittyDeal = dealer => {
    const ms = speedMs();
    $$('.kpile .card').forEach((c, i) => { const [x, y] = offset(c, dealer);
      c.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + tilt[dealer] + 'deg)' }, { transform: 'none' }],
        { duration: ms, delay: i * ms * 0.45, easing: 'ease-out', fill: 'backwards' }); });
  };
  window.__kittyTake = receiver => {
    const ms = speedMs(), cards = $$('.kpile .card'), top = cards[cards.length - 1];
    const pa = $('.pile-act'); if (pa) pa.remove();   // the call is made: no bid buttons
    const oc = $$('.info .cell').find(c => /Outside/i.test(c.textContent));
    if (oc) setTimeout(() => { const v = $('.val', oc); v.textContent = String((parseInt(v.textContent, 10) || 0) + cards.length - 1); }, ms * 2.2);
    const [x, y] = offset(top, receiver);
    top.style.zIndex = '1';
    top.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: .8 }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + tilt[receiver] + 'deg)', opacity: 0 }],
      { duration: ms * 1.2, easing: 'ease-in', fill: 'forwards' });
    cards.slice(0, -1).forEach((c, i) => {
      const dx = -parseFloat(getComputedStyle(c).left) + (cards[0].offsetWidth * 0.45) + i * 2;
      c.animate([{ transform: 'none' }, { transform: 'translate(' + dx + 'px,' + (-i * 2) + 'px) rotate(' + (i ? 3 : -2) + 'deg)' }],
        { duration: ms, delay: ms * 1.2, easing: 'ease-out', fill: 'forwards' }); });
  };
}
