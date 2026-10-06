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
.seat .seat-head{order:0}.seat .backs{order:1}.seat .score-row{order:2}.seat .won{order:3}
.won{display:flex;align-items:center;min-height:24px;padding-right:14px}
.won .mini-back{width:22px;height:15px;margin-right:-14px;background:repeating-linear-gradient(-45deg,#7a1f2b 0 3px,#93303d 3px 6px);transform:rotate(-3deg)}
.won .mini-back:nth-child(2n){transform:rotate(2deg)}
.seat-east .won{justify-content:flex-end}
/* Trick cards in 3D: the table tilts away from you, each bot card turns to face your slot, lifted and larger. */
.trick{perspective:900px;perspective-origin:50% 120%;min-height:calc(var(--cw)*2.7)!important;padding:18px 10px 14px!important}
.trick .slot{transform-style:preserve-3d}
.trick .slot .card,.trick .slot .empty{--w:calc(var(--cw)*1.22);width:var(--w);height:calc(var(--w)*1.4);transition:transform .3s}
.trick .slot-1 .card,.trick .slot-2 .card{--w:calc(var(--cw)*2)}
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
// Seats: Turn and Led tags in fixed order; won-trick stacks replace the text.
const order = ['ai', 'you', 'dealer', 'turn', 'caller', 'receiver', 'led', 'mediator', 'showdown'];
for (const s of $$('#seat1,#seat2,#seat0')) {
  const head = $('.seat-head,.me-head', s), id = +s.id.slice(4);
  if (window.__turn === id) head.insertAdjacentHTML('beforeend', '<span class="tag turn" style="background:#2e7d32;color:#fff">Turn</span>');
  if (window.__led === id) head.insertAdjacentHTML('beforeend', '<span class="tag led" style="background:#455a8a;color:#fff">Led</span>');
  const tags = $$('.tag', head).sort((a, b) => order.findIndex(c => a.classList.contains(c)) - order.findIndex(c => b.classList.contains(c)));
  const score = $('.score', head); tags.forEach(t => head.insertBefore(t, score && score.parentNode === head ? score : null));
  const tr = $('.tricks', s), n = +($('b', tr) || {}).textContent || 0;
  tr.outerHTML = '<div class="won" aria-label="' + n + ' tricks won">' + '<span class="mini-back"></span>'.repeat(n) + '</div>';
}
// KING tag on full-size Kings only (not the small last-trick cards).
for (const c of $$('.card[data-card^="K"]')) if (!c.closest('.lasttrick') && !$('.c-tag', c)) c.insertAdjacentHTML('beforeend', '<span class="c-tag king">KING</span>');

// Log: a full scroll, newest first. Groups start at li.gap; each keeps its heading on top, its lines newest first.
const log = $('#gameLog'), groups = [];
for (const li of [...log.children]) { if (!groups.length || li.classList.contains('gap')) groups.push([]); groups[groups.length - 1].push(li); }
log.replaceChildren(...groups.reverse().flatMap(g => g[0].classList.contains('gap') ? [g[0], ...g.slice(1).reverse()] : g.slice().reverse()));

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
  cell('lt', 'Last trick', ltCards + (window.__lastWinner || '')) +
  cell('latest', 'Latest', latest ? '<ul class="gamelog">' + latest.outerHTML.replace(/class="[^"]*"/, '') + '</ul>' : '') +
  cell('muted', 'Outside', (outN ? outN[1] : '–') + ' cards') +
  cell('muted', 'Turned up', turnedTxt ? turnedTxt[1] : '–') +
  '</section>');
