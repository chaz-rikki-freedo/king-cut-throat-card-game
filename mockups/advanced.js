/* Mockup layer: applies the Advanced profile to the current DOM. Not app code.
   Inputs set by shot.js: __turn, __led (seat ids), __lastWinner (HTML). */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const css = `
#trumpChip,#handChip,.trick-label,.who,.status,.prompt,.actionbar .hint,.score small,.center .piles,.center .lasttrick{display:none!important}
.actionbar:not(:has(.btn)){display:none}
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
.seat .seat-head{flex-wrap:nowrap;align-self:stretch}
.seat .seat-head .backs{margin-left:auto;flex:none}
.seat-east .seat-head .backs{margin-left:0;margin-right:auto}
/* Tags: one uniform size, packed from the seat's outer edge in a fixed order as they come up.
   The tag area keeps a fixed height (two rows for bots), so names, backs and scores line up. */
.tagbox{display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;width:100%;min-height:44px}
.seat-east .tagbox{direction:rtl}
.tagbox .tag{margin:0;flex:0 0 calc((100% - 8px) / 3);height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;padding:0 2px;overflow:hidden;white-space:nowrap;direction:ltr}
.me .tagbox{width:auto;min-height:20px;flex:0 1 auto}.me .tagbox .tag{flex-basis:58px}
@media (max-width:720px){.tagbox .tag{font-size:9px;letter-spacing:0}.me .tagbox .tag{flex-basis:calc((100% - 12px) / 4)}.me .tagbox{flex:1 1 200px;min-height:20px}}
.won{all:unset;display:flex;flex-wrap:wrap;align-items:center;gap:4px 0;min-height:48px;padding:4px;cursor:pointer;border-radius:8px;max-width:100%}
.won.none{display:none}
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
.trick{min-height:calc(var(--cw)*3.3)!important}
.trick .slot-1 .card{transform:rotateX(22deg) rotateY(16deg) rotateZ(-14deg) translateZ(30px);box-shadow:-10px 18px 22px rgba(0,0,0,.5)}
.trick .slot-2 .card{transform:rotateX(22deg) rotateY(-16deg) rotateZ(14deg) translateZ(30px);box-shadow:10px 18px 22px rgba(0,0,0,.5)}
.trick .slot-0 .card,.trick .slot-0 .empty{transform:rotateX(22deg) translateZ(30px)}
.trick .slot-0 .card{box-shadow:0 18px 22px rgba(0,0,0,.5)}
.c-tag.king{background:#f2c14e;color:#1b1b1b}
.gamelog li.gap:first-child{margin-top:0}
`;
document.head.insertAdjacentHTML('beforeend', '<style id="mockAdv">' + css + '</style>');
// Top bar: speed icon with a label.
const sp = $('.speed-pick'), cur = $('#speedSel'); sp.title = 'Speed: ' + cur.options[cur.selectedIndex].text;
// Seats: tags in a fixed order (Human/AI, Dealer, Namer, Kitty, Turn, Led, Mediator or Showdown), packed as they come up;
// won-trick stacks replace the text.
const SLOTS = [['ai you', 'id'], ['dealer', 'dealer'], ['caller', 'namer'], ['receiver', 'kitty'], ['turn', 'turn'], ['led', 'led'], ['mediator showdown', 'sd']];
for (const s of $$('#seat1,#seat2,#seat0')) {
  const head = $('.seat-head,.me-head', s), id = +s.id.slice(4);
  if (window.__turn === id) head.insertAdjacentHTML('beforeend', '<span class="tag turn" style="background:#2e7d32;color:#fff">Turn</span>');
  if (window.__led === id) head.insertAdjacentHTML('beforeend', '<span class="tag led" style="background:#455a8a;color:#fff">Led</span>');
  const tags = $$('.tag', head), box = document.createElement('div');
  box.className = 'tagbox';
  for (const [classes, slot] of SLOTS) {
    const t = tags.find(x => classes.split(' ').some(c => x.classList.contains(c)));
    if (t) box.appendChild(t);
  }
  const backs = $(':scope > .backs', s); if (backs && s.id !== 'seat0') head.appendChild(backs);
  const score = $('.score', head);
  if (s.id === 'seat0') head.insertBefore(box, score); else head.after(box);
  const tr = $('.tricks', s), n = +($('b', tr) || {}).textContent || 0;
  // Won tricks: one row (a single button); each trick is a rough stack of three backs.
  const jit = (i, k) => ((i * 7 + k * 13 + i * k * 5) % 9) - 4;
  // Side by side, all vertical, a little haphazard; each stack overlaps the one before it by 20% of its width.
  const east = s.id === 'seat2', side = east ? 'margin-right' : 'margin-left';
  const tricks = Array.from({ length: n }, (_, i) => '<div class="wt v" style="' + (i ? side + ':' + (-28 * 0.2) + 'px;' : '') + 'z-index:' + (i + 1) + ';transform:translateY(' + jit(i, 2) * 0.75 + 'px) rotate(' + jit(i, 3) * 1.5 + 'deg)">' +
    [0, 1, 2].map(k => '<span style="transform:translate(' + jit(i + k, 4) * 0.6 + 'px,' + jit(i + k, 5) * 0.6 + 'px) rotate(' + jit(i + k, 6) * 1.2 + 'deg)"></span>').join('') + '</div>').join('');
  tr.outerHTML = n ? '<button type="button" class="won" aria-label="' + n + (n === 1 ? ' trick' : ' tricks') + ' won" title="' + n + (n === 1 ? ' trick' : ' tricks') + ' won">' + tricks + '</button>' : '<div class="won none" aria-hidden="true"></div>';
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
const outN = (($('.center .pile') || {}).textContent || '').match(/\((\d+)\)/);
const turnedTxt = (($('.center .piles') || {}).textContent || '').match(/Turned card:\s*(\S+)/);
const cell = (cls, lab, val) => '<div class="cell ' + cls + '"><span class="lab">' + lab + '</span><span class="val">' + val + '</span></div>';
$('#table').insertAdjacentHTML('afterbegin', '<section class="info" aria-label="Shared information">' +
  cell('', 'Trump', '<span class="pip" style="color:' + (red ? '#ff6b6b' : 'var(--ink)') + '">' + (sym[st.trump] || '–') + '</span>') +
  cell('', 'Hand ' + st.handNumber, 'Trick ' + st.trickNumber + '/7') +
  cell('lt', 'Last trick', ltCards ? ltCards + (window.__lastWinner || '') : '–') +
  cell('latest', 'Latest', latest ? '<ul class="gamelog">' + latest.outerHTML.replace(/class="[^"]*"/, '') + '</ul>' : '') +
  cell('muted', 'Outside', (outN ? outN[1] : '–') + ' cards') +
  cell('muted', 'Turned up', turnedTxt ? turnedTxt[1] : '–') +
  '</section>');

// Trick stacking: each card sits above the cards played before it; your empty slot, still to play, is on top.
const plays = (st.trick && st.trick.plays) || [];
plays.forEach((pl, i) => { const sl = $('.trick .slot-' + pl.player); if (sl) sl.style.zIndex = String(i + 1); });
for (const sl of $$('.trick .slot')) if (!sl.style.zIndex) sl.style.zIndex = String(plays.length + 1);

log.scrollTop = 0;
