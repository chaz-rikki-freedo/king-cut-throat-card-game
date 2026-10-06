/* Mockup layer: applies the Advanced profile to the current DOM. Not app code. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const css = `
#trumpChip,.trick-label,.who,.status,.prompt,.actionbar .hint,.score small{display:none!important}
.score{font-size:46px!important}
.seat-name{font-size:21px!important}
.seat-east .seat-head{flex-direction:row-reverse}
.seat-east{align-items:flex-end}
.seat-east .score-row{justify-content:flex-end}
.speed-pick select{display:none}.speed-pick{padding:0 10px}
.won{display:flex;align-items:center;gap:0;min-height:24px}
.won .mini-back{width:22px;height:15px;margin-right:-14px;background:repeating-linear-gradient(-45deg,#7a1f2b 0 3px,#93303d 3px 6px);transform:rotate(-3deg)}
.won .mini-back:nth-child(2n){transform:rotate(2deg)}
.won{padding-right:14px}
.seat-east .won{justify-content:flex-end}
.pile > .cap{display:none}
.actionbar:not(:has(.btn)){display:none}
.messy{position:relative;width:calc(var(--cw-small)*1.25);height:calc(var(--cw-small)*1.5)}
.messy .card{position:absolute;--w:var(--cw-small);left:0;top:0}
.trump-big div{display:none}.trump-big .sym{font-size:calc(var(--cw-small)*1.3)!important}
.turned .card{--w:calc(var(--cw-small)*.7)}
.lasttrick{font-size:0!important}
.c-tag.king{background:#f2c14e;color:#1b1b1b}
.logpanel h2 .tn{float:right;color:var(--muted);font-weight:600;letter-spacing:0}
`;
document.head.insertAdjacentHTML('beforeend', '<style id="mockAdv">' + css + '</style>');
// Top bar: hand number only; speed icon with a label.
const hc = $('#handChip'); hc.textContent = hc.textContent.replace(/\s*·\s*Trick.*$/, '');
const sp = $('.speed-pick'), cur = $('#speedSel'); sp.title = 'Speed: ' + cur.options[cur.selectedIndex].text;
// Trick count moves to the log heading.
const tn = (window.__trick || ''); $('.logpanel h2').insertAdjacentHTML('beforeend', '<span class="tn">' + tn + '</span>');
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
for (const p of $$('.pile')) for (const d of [...p.children]) if (!d.classList.contains('pile-cards')) d.classList.add('cap');
// Center: no captions; messy outside pile; small turned card.
const out = $('.pile .pile-cards'); if (out) { out.className = 'messy'; out.innerHTML = [[-6,0,0],[4,5,3],[-1,2,6]].map(([r,x,y]) => '<div class="card back" style="transform:translate(' + x + 'px,' + y + 'px) rotate(' + r + 'deg)"></div>').join(''); }
const turned = $$('.pile').find(p => /Turned card/.test(p.textContent));
if (turned && window.__turnedHTML) turned.innerHTML = '<div class="turned pile-cards">' + window.__turnedHTML + '</div>';
// KING tag on every King.
for (const c of $$('.card[data-card^="K"]')) if (!$('.c-tag', c)) c.insertAdjacentHTML('beforeend', '<span class="c-tag king">KING</span>');
