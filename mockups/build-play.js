/* Builds advanced3-play.html: a playable copy of index.html with the Advanced v3 mockup layer applied after every
   render (live.js). index.html is not changed. Run: node mockups/build-play.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const layer = fs.readFileSync(path.join(__dirname, 'advanced3.js'), 'utf8'), live = fs.readFileSync(path.join(__dirname, 'live.js'), 'utf8');
// The game redraws the table several times in a row with the same content; each redraw would restart every animation.
// The render collects its writes, and __advFlush (live.js) skips a redraw that changes nothing.
const once = (from, to) => { if (html.split(from).length !== 2) throw new Error('not found exactly once: ' + from); html = html.replace(from, to); };
once('  function render(v, ui, ctx) {\n', '  function render(v, ui, ctx) {\n    const __w = [];\n');
once('      el.innerHTML = seatHTML(v, p, ctx);', '      __w.push([el, seatHTML(v, p, ctx)]);');
once("    $('center').innerHTML = center;", "    __w.push([$('center'), center]);");
once("const said = $('center').querySelector('.status').textContent", "const said = (d => (d.innerHTML = center, d.querySelector('.status').textContent))(document.createElement('div'))");
once("    me.innerHTML = '<div class=\"me-head\">'", "    __w.push([me, '<div class=\"me-head\">'");
once("'</div>' + handHTML(v, ui);", "'</div>' + handHTML(v, ui)]);");
once("    me.classList.toggle('turn', isTurn(v, v.seat));\n", "    me.classList.toggle('turn', isTurn(v, v.seat));\n    window.__advDirty = window.__advFlush(__w);\n");
once('Render.render(v, app.ui, ctx);', 'Render.render(v, app.ui, ctx); if (window.__advDirty) window.__advLive();');
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');
const inject = '<script>window.__ADV_SRC = ' + safe(JSON.stringify(layer)) + ';</script>\n<script>' + safe(live) + '</script>\n';
const at = html.indexOf('<script>');
if (at < 0) throw new Error('no script tag');
html = html.slice(0, at) + inject + html.slice(at);
html = html.replace(/<title>([^<]*)<\/title>/, '<title>$1 · Advanced v3 mockup</title>');
fs.writeFileSync(path.join(__dirname, 'advanced3-play.html'), html);
console.log('wrote mockups/advanced3-play.html', html.length, 'bytes');
