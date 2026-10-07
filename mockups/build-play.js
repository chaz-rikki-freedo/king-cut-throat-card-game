/* Builds advanced3-play.html: a playable copy of index.html with the Advanced v3 mockup layer applied after every
   render (live.js). index.html is not changed. Run: node mockups/build-play.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const layer = fs.readFileSync(path.join(__dirname, 'advanced3.js'), 'utf8'), live = fs.readFileSync(path.join(__dirname, 'live.js'), 'utf8');
const HOOK = 'Render.render(v, app.ui, ctx);';
if (html.split(HOOK).length !== 2) throw new Error('render hook not found exactly once');
html = html.replace(HOOK, HOOK + ' if (window.__advLive) window.__advLive();');
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');
const inject = '<script>window.__ADV_SRC = ' + safe(JSON.stringify(layer)) + ';</script>\n<script>' + safe(live) + '</script>\n';
const at = html.indexOf('<script>');
if (at < 0) throw new Error('no script tag');
html = html.slice(0, at) + inject + html.slice(at);
html = html.replace(/<title>([^<]*)<\/title>/, '<title>$1 · Advanced v3 mockup</title>');
fs.writeFileSync(path.join(__dirname, 'advanced3-play.html'), html);
console.log('wrote mockups/advanced3-play.html', html.length, 'bytes');
