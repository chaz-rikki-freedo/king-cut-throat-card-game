#!/usr/bin/env node
/* Service worker: a page that loads but is not the game (a network sign-in page) is never offered as an update,
   and a real new version is, both when the page opens and when the app comes back to the screen. A page that an
   ad blocker filled with scripts from another site still opens offline, while those scripts' requests hang. Serves the repository with a switchable index.html. Exit code 1 on a failed check. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { launch, ROOT } = require('./lib/browser');

const TYPES = { '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
let serve = 'game';
const ADBLOCK = '<script src="https://local.adguard.org/?type=content-script"></script><link type="text/css" rel="stylesheet" href="https://local.adguard.org/?type=css">';
let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
}

const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '/index.html') {
    let body = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    if (serve === 'portal') body = '<!doctype html><title>Sign in</title><p>Sign in to the Wi-Fi to continue.</p>';
    if (serve === 'new') body = body.replace('<body>', '<body><!-- a new version -->');
    if (serve === 'newer') body = body.replace('<body>', '<body><!-- a newer version -->');
    /* What an ad blocker that filters HTTPS (AdGuard) does to the page as it downloads. */
    if (serve === 'adblock') body = body.replace(/<link rel="manifest"[^>]*>/, '').replace('<head>', '<head>' + ADBLOCK);
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end(body);
    return;
  }
  const file = path.join(ROOT, u);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

srv.listen(0, '127.0.0.1', async () => {
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await launch();
  try {
    const page = await (await browser.newContext()).newPage();
    /* What the page shows, and whether the worker keeps a page waiting as an update. */
    const state = () => page.evaluate(async () => {
      const pending = await (await caches.open('kct-pending')).match(new URL('./index.html', location.href).href);
      const note = document.querySelector('#updateNote');
      return { game: !!window.KCT, controlled: !!navigator.serviceWorker.controller, pending: !!pending, note: !!note && !note.hidden };
    });
    const reload = async () => { await page.reload(); await page.waitForTimeout(1500); };
    await page.goto(url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await reload();
    let r = await state();
    expect('the worker controls the page, with no update waiting', r.game && r.controlled && !r.pending && !r.note, r);
    serve = 'portal';
    await reload();
    r = await state();
    expect('a sign-in page on the network: the game still opens from the cache', r.game, r);
    expect('the sign-in page is not offered as an update', !r.pending && !r.note, r);
    /* An installed app comes back to the screen without opening the page again. */
    serve = 'new';
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1500);
    r = await state();
    expect('back on the screen: a new version is offered without a reload', r.game && r.pending && r.note, r);
    await Promise.all([page.waitForEvent('load'), page.evaluate(() => navigator.serviceWorker.controller.postMessage({ type: 'apply-update' }))]);
    await page.waitForTimeout(1500);
    r = await state();
    expect('the update applied: nothing waits', r.game && !r.pending && !r.note, r);
    serve = 'newer';
    await reload();
    r = await state();
    expect('a real new version is offered', r.game && r.pending && r.note, r);
    /* The ad blocker answers its own scripts while there is a network. Offline its VPN cannot, and the request hangs. */
    serve = 'adblock';
    const ctx = await browser.newContext();
    let offline = false;
    await ctx.route(/local\.adguard\.org/, route => { if (!offline) route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
    const ad = await ctx.newPage();
    await ad.goto(url);
    await ad.evaluate(() => navigator.serviceWorker.ready);
    await ad.close();
    offline = true;
    await ctx.setOffline(true);
    const off = await ctx.newPage();
    const opened = await off.goto(url, { timeout: 10000 }).then(() => off.evaluate(() => !!window.KCT), e => String(e).split('\n')[0]);
    expect('an ad blocker\'s scripts in the cached page: the game still opens offline', opened === true, opened);
    await ctx.close();
  } catch (e) {
    failed++;
    console.log('  ✖ ' + (e instanceof Error ? e.message : String(e)));
  } finally {
    await browser.close();
    srv.close();
  }
  console.log(failed ? 'FAIL: ' + failed + ' check(s) failed' : 'OK: all checks passed');
  process.exit(failed ? 1 : 0);
});
