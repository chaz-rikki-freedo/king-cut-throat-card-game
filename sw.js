/* King Cut-Throat service worker: offline play and update prompts.
   The game page is served from the cache, so the app opens offline and never
   changes in the middle of a session. Each time the page opens, and each time
   the app asks ("check-update": it comes back to the screen, which an installed
   app does without opening the page again), the worker fetches the page from
   the network in the background, past the host's CDN copy (see checkPage). If it differs from the
   cached page, the new page waits in a separate cache and the app is told
   ("update-ready"). The app asks you, between games, and then sends
   "apply-update": the waiting page becomes the cached page and the app reloads.
   A new version therefore needs no version number here: publishing a changed
   index.html is enough. Change this file only to change how caching works.
   A changed sw.js reaches an app that stays open: the app asks the browser for it each time it comes back to
   the screen, and the new worker takes over the open page (see install).
   The manifest and icons are served from the cache too, and each request also
   fetches them in the background, so a changed icon arrives on the next load.
   Each page open and "check-update" also saves again any of them missing from the cache: Android never
   asks for the Apple icon, so a lost copy of it would otherwise stay lost. */
'use strict';
const SHELL = 'kct-shell', PENDING = 'kct-pending';
const PAGE = new URL('./index.html', self.registration.scope).href;
const ROOT = new URL('./', self.registration.scope).href;
const ASSETS = ['./manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png']
  .map(u => new URL(u, self.registration.scope).href);

/* A new worker keeps the cached page: it takes over pages that are already open (skipWaiting, then clients.claim),
   and its first check (the app asks on controllerchange) offers the newer page as an update, as usual. Saving the
   newest page here instead would make that check find nothing new, and an open app would stay on its old page. */
self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    const urls = (await shell.match(PAGE)) ? ASSETS : [PAGE, ...ASSETS];
    await shell.addAll(urls.map(u => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
/* Removes files that this version no longer caches, such as an icon taken off the ASSETS list.
   Only this app's own cache is cleaned: other project pages on the same github.io origin share the cache storage. */
self.addEventListener('activate', ev => ev.waitUntil((async () => {
  const keep = new Set([PAGE, ...ASSETS]);
  const shell = await caches.open(SHELL);
  for (const req of await shell.keys()) if (!keep.has(req.url)) await shell.delete(req);
  await self.clients.claim();
})()));

const isPage = url => { const u = new URL(url); u.search = ''; u.hash = ''; return u.href === PAGE || u.href === ROOT; };

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate' && isPage(req.url)) {
    ev.respondWith(cachedPage(req));
    ev.waitUntil(Promise.all([checkPage(), refill()]));
    return;
  }
  const asset = ASSETS.find(u => isSame(u, req.url));
  if (asset) {
    const fresh = refreshAsset(asset);
    ev.respondWith(caches.match(asset).then(hit => hit || fresh.then(res => res || fetch(req))));
    ev.waitUntil(fresh);
  }
});
const isSame = (a, b) => { const u = new URL(b); u.search = ''; return u.href === a; };

/* Fetches an asset and keeps it in the cache. Resolves to the response, or null when offline. */
async function refreshAsset(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) await (await caches.open(SHELL)).put(url, res.clone());
    return res;
  } catch (e) { return null; }
}

/* Saves again the manifest and icons missing from the cache. Offline it saves nothing. */
async function refill() {
  const shell = await caches.open(SHELL);
  for (const u of ASSETS) if (!await shell.match(u)) await refreshAsset(u);
}

async function cachedPage(req) {
  const hit = await (await caches.open(SHELL)).match(PAGE);
  if (hit) return fromCache(hit);
  const res = await fetch(req);
  if (res.ok && isGame(await res.clone().text())) (await caches.open(SHELL)).put(PAGE, res.clone());
  return res;
}

/* Fetches the page from the network. A changed page waits in PENDING and the app is told. Every check adds a query
   to the address, so a CDN in front of the host (GitHub Pages keeps a page for minutes) fetches the page again:
   without it, an app opened just after a publish would get the old page, see nothing new, and offer the update
   only one start later. Returns what it found: 'offline', 'not-game' (an error or a page that is not the game),
   'same', 'new' or 'first' (nothing was cached yet). */
async function checkPage() {
  let res;
  try { res = await fetch(PAGE + '?fresh=' + Date.now(), { cache: 'no-store' }); } catch (e) { return 'offline'; }
  if (!res.ok) return 'not-game';
  const text = await res.clone().text();
  if (!isGame(text)) return 'not-game';
  const shell = await caches.open(SHELL);
  const current = await shell.match(PAGE);
  if (!current) { await shell.put(PAGE, res); return 'first'; }
  if (core(text) === core(await current.text())) { await caches.delete(PENDING); return 'same'; }
  const pending = await caches.open(PENDING);
  const waiting = await pending.match(PAGE);
  if (!waiting || core(text) !== core(await waiting.text())) await pending.put(PAGE, res);
  await tell({ type: 'update-ready' });
  return 'new';
}
/* A page that loads but is not the game (a network sign-in page, a host's error page) must never replace it:
   the game would be gone from the cache, and with it the note that offers the next update. The game page
   always holds its BUILD line (tools/publish.sh stamps it). */
const isGame = html => /^const BUILD = Object\.freeze\(\{ commit: '/m.test(html);
/* The part of the page that counts as a new version. Ad blockers such as AdGuard change the page
   as it downloads: they remove <link> tags and add tags of their own. Turning one on or off must not
   look like a new version, so <link> tags, <script> and <style> tags with attributes and whitespace are
   left out. The game's own tags with attributes stay in: OWN_TAGS lists their ids (tests/sw.js fails when
   index.html has one that is not listed). A change to the page's <link> tags alone is therefore not
   offered as an update; it arrives with the next change to anything else. */
const OWN_TAGS = ['themePacks', 'themeBoot'];
const isOwn = tag => { const m = /^<[^>]*\bid="([^"]*)"/.exec(tag); return !!m && OWN_TAGS.includes(m[1]); };
const core = html => html
  .replace(/<link\b[^>]*>/gi, '')
  .replace(/<(script|style)\b[^>]+>[\s\S]*?<\/\1>/gi, tag => isOwn(tag) ? tag : '')
  .replace(/\s+/g, ' ');
/* The cached page without the <script src> and <link> tags that load from another site. Ad blockers that filter
   HTTPS (AdGuard) add such tags as the page downloads, so the cached copy holds them. Offline, the ad blocker's VPN
   cannot answer and the script request hangs: the page never draws and an installed app stays on its logo.
   The game loads nothing from another site, so removing them changes nothing it needs. */
const LOADS = /<script\b[^>]*\bsrc\s*=[^>]*>[\s\S]*?<\/script\s*>|<link\b[^>]*>/gi;
const offSite = tag => {
  const src = /\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
  if (!src) return false;
  try { return new URL(src[1] ?? src[2] ?? src[3], PAGE).origin !== self.location.origin; } catch (e) { return false; }
};
const local = html => html.replace(LOADS, tag => offSite(tag) ? '' : tag);
/** The page as served from the cache. @param {Response} hit */
const fromCache = async hit => new Response(local(await hit.text()), { status: hit.status, statusText: hit.statusText, headers: { 'content-type': hit.headers.get('content-type') || 'text/html' } });
/** @returns {number} the tags in html that load from another site */
const offSiteTags = html => (html.match(LOADS) || []).filter(offSite).length;
/* For the self-tests (Settings → Tools → Self-tests): what this worker serves in airplane mode, from the cache
   alone. It never uses the network. */
async function offlineReport() {
  const shell = await caches.open(SHELL);
  const hit = await shell.match(PAGE);
  const served = hit ? await (await fromCache(hit)).text() : '';
  const missing = [];
  for (const u of ASSETS) {
    if (await shell.match(u)) continue;
    /* Saved but not found: the response's Vary header stops the match. */
    const kept = await shell.match(u, { ignoreVary: true });
    missing.push(u.slice(self.registration.scope.length) + (kept ? ' (saved, but Vary: ' + kept.headers.get('vary') + ' stops a match)' : ''));
  }
  return { page: !!hit, game: isGame(served), offSite: offSiteTags(served), missing };
}
async function tell(msg, client) {
  const list = client ? [client] : await self.clients.matchAll({ type: 'window' });
  for (const c of list) c.postMessage(msg);
}

self.addEventListener('message', ev => {
  const type = ev.data && ev.data.type;
  if (type === 'update-status') ev.waitUntil((async () => {
    if (await (await caches.open(PENDING)).match(PAGE)) await tell({ type: 'update-ready' }, ev.source);
  })());
  /* reply: the app waits for the result (Settings → Install, Check again). */
  if (type === 'check-update') ev.waitUntil(Promise.all([checkPage(), refill()]).then(([result]) => {
    if (ev.data.reply) return tell({ type: 'update-checked', result }, ev.source);
  }));
  if (type === 'offline-check') ev.waitUntil(offlineReport().then(report => tell({ type: 'offline-report', report }, ev.source)));
  if (type === 'apply-update') ev.waitUntil((async () => {
    const waiting = await (await caches.open(PENDING)).match(PAGE);
    if (waiting) await (await caches.open(SHELL)).put(PAGE, waiting);
    await caches.delete(PENDING);
    await tell({ type: 'update-applied' }, ev.source);
  })());
});
