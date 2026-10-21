#!/usr/bin/env node
/* Service worker: a page that loads but is not the game (a network sign-in page) is never offered as an update,
   and a real new version is, both when the page opens and when the app comes back to the screen, also one that changes
   only the theme packs. A page that an
   ad blocker filled with scripts from another site still opens offline, while those scripts' requests hang, and the
   in-app self-tests for the service worker and airplane mode pass. Inside another app's browser, the menu and Settings
   say to open the game in a real browser, and the Install checklist gives up on a request that hangs. Serves the repository with a switchable index.html. Exit code 1 on a failed check. */
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
    if (serve === 'newer' || serve === 'theme') body = body.replace('<body>', '<body><!-- a newer version -->');
    /* The newer version with a change inside the theme packs only: a <script> tag with attributes, but the game's own. */
    if (serve === 'theme') body = body.replace('"classic":{"name":"Classic"', '"classic":{"name":"Classic felt"');
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

/* The update check leaves out <script> and <style> tags with attributes, except the game's own (OWN_TAGS in sw.js).
   Each such tag in index.html must be listed there, or a change inside it would never be offered as an update. */
{
  const list = /const OWN_TAGS = (\[[^\]]*\])/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
  const own = list ? JSON.parse(list[1].replace(/'/g, '"')) : [];
  const tags = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<(script|style)\b[^>]+>/gi) || [];
  const missing = tags.filter(t => { const m = /\bid="([^"]*)"/.exec(t); return !m || !own.includes(m[1]); });
  expect('every <script> and <style> tag with attributes in index.html is in OWN_TAGS in sw.js', tags.length > 0 && !missing.length, missing);
}

/* The in-app self-tests for the service worker and airplane mode (Settings → Tools → Self-tests): true when they ran
   and passed, else what failed. */
const selfTests = page => page.evaluate(async () => {
  const res = await KCT.SelfTest.runAsync({ only: ['service worker', 'airplane mode'] });
  const ran = new Set(res.results.map(x => x.section));
  return ran.has('service worker') && ran.has('airplane mode') && !res.failed ? true : res.results.filter(x => !x.ok).map(x => x.name + ': ' + x.detail).concat(ran.has('airplane mode') ? [] : ['airplane mode did not run']);
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
    const inApp = await selfTests(page);
    expect('the in-app self-tests: service worker and airplane mode pass', inApp === true, inApp);
    /* Android never asks for the Apple icon, so only a page open can save a lost copy again. */
    await page.evaluate(async () => (await caches.open('kct-shell')).delete(new URL('./icons/apple-touch-icon.png', location.href).href));
    const lost = await selfTests(page);
    expect('a lost icon fails the in-app airplane mode check', lost !== true && String(lost).includes('apple-touch-icon.png'), lost);
    await reload();
    const back = await selfTests(page);
    expect('the next page open saves the lost icon again', back === true, back);
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
    await Promise.all([page.waitForEvent('load'), page.evaluate(() => navigator.serviceWorker.controller.postMessage({ type: 'apply-update' }))]);
    await page.waitForTimeout(1500);
    serve = 'theme';
    await reload();
    r = await state();
    expect('a change in the theme packs alone is offered', r.game && r.pending && r.note, r);
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
    if (opened === true) {
      const offApp = await selfTests(off);
      expect('offline, with the ad blocker\'s page saved: the in-app airplane mode checks pass', offApp === true, offApp);
    }
    await ctx.close();
    /* Inside another app's browser (Facebook here), the menu and Settings → Install say to open the game in a real browser. */
    const fbCtx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/155.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.0;]', serviceWorkers: 'block' });
    const fb = await fbCtx.newPage();
    serve = 'game';
    await fb.goto(url);
    await fb.waitForTimeout(800);
    const fbMenu = await fb.evaluate(() => (document.querySelector('#overlay') || document.body).textContent || '');
    expect('in Facebook\'s browser: the menu says to open the game in Chrome', fbMenu.includes('inside Facebook') && fbMenu.includes('Open in browser'), fbMenu.slice(0, 200));
    await fb.goto(url + '?settings=1');
    await fb.waitForFunction(() => !/Checking/.test(document.querySelector('#setInstall').textContent), null, { timeout: 10000 });
    const fbInstall = await fb.evaluate(() => document.querySelector('#setInstall').textContent);
    expect('in Facebook\'s browser: Settings → Install says so', fbInstall.includes('inside Facebook'), fbInstall);
    await fbCtx.close();
    /* A real browser shows no such note. */
    serve = 'game';
    await page.goto(url);
    await page.waitForTimeout(800);
    const plainMenu = await page.evaluate(() => document.querySelector('#overlay').innerText);
    expect('in a real browser: the menu shows, with no note about another app', plainMenu.includes('King Cut-Throat') && !plainMenu.includes('You opened the game inside'), plainMenu.slice(0, 200));
    /* Offline behind a VPN that blocks traffic, requests hang: the Install checklist gives up after 5 s. */
    const hangCtx = await browser.newContext({ serviceWorkers: 'block' });
    await hangCtx.route(/manifest\.webmanifest/, () => { /* never answers */ });
    const hang = await hangCtx.newPage();
    await hang.goto(url + '?settings=1');
    const t0 = Date.now();
    const done = await hang.waitForFunction(() => /no answer in 5 s/.test(document.querySelector('#setInstall').textContent), null, { timeout: 12000 }).then(() => true, () => false);
    expect('a hanging manifest request: the Install checklist finishes within 12 s and says why', done, Date.now() - t0);
    await hangCtx.close();
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
