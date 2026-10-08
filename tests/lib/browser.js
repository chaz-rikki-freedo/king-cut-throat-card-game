/* Shared by the test scripts: serves the repository over HTTP and opens pages in Chromium.
   Playwright comes from tests/node_modules (npm install in tests/), or from NODE_PATH. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

/** Starts a static server on a free port. @returns {Promise<{ url: string, close(): void }>} */
function serve() {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + srv.address().port + '/index.html', close: () => srv.close() })));
}

/** Launches Chromium. PW_CHROMIUM sets the browser file when Playwright has none of its own. */
function launch() {
  return chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
}

/** A new page in its own context (own storage), with page errors collected. The service worker is blocked. */
async function openPage(browser, url) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url);
  return { page, errors };
}

/** Runs src as the body of an async function in the page, with arg. page/*.js files can be put in front. */
function run(page, src, arg, libs) {
  const code = (libs || []).map(f => fs.readFileSync(path.join(__dirname, '..', 'page', f), 'utf8')).join('\n') + '\n' + src;
  return page.evaluate(([c, a]) => new Function('arg', 'return (async () => {' + c + '\n})()')(a), [code, arg]);
}

module.exports = { serve, launch, openPage, run, ROOT };
