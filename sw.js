/* King Cut-Throat service worker: offline play and update prompts.
   The game page is served from the cache, so the app opens offline and never
   changes in the middle of a session. Each time the page opens, the worker
   fetches the page from the network in the background. If it differs from the
   cached page, the new page waits in a separate cache and the app is told
   ("update-ready"). The app asks you, between games, and then sends
   "apply-update": the waiting page becomes the cached page and the app reloads.
   A new version therefore needs no version number here: publishing a changed
   index.html is enough. Change this file only to change how caching works.
   The manifest and icons are served from the cache too, and each request also
   fetches them in the background, so a changed icon arrives on the next load. */
'use strict';
const SHELL = 'kct-shell', PENDING = 'kct-pending';
const PAGE = new URL('./index.html', self.registration.scope).href;
const ROOT = new URL('./', self.registration.scope).href;
const ASSETS = ['./manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png']
  .map(u => new URL(u, self.registration.scope).href);

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(SHELL).then(c => c.addAll([PAGE, ...ASSETS].map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
    ev.waitUntil(checkPage());
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

async function cachedPage(req) {
  const hit = await (await caches.open(SHELL)).match(PAGE);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(SHELL)).put(PAGE, res.clone());
  return res;
}

/* Fetches the page from the network. A changed page waits in PENDING and the app is told. */
async function checkPage() {
  let res;
  try { res = await fetch(PAGE, { cache: 'no-store' }); } catch (e) { return; }
  if (!res.ok) return;
  const shell = await caches.open(SHELL);
  const current = await shell.match(PAGE);
  const text = await res.clone().text();
  if (!current) { await shell.put(PAGE, res); return; }
  if (text === await current.text()) { await caches.delete(PENDING); return; }
  const pending = await caches.open(PENDING);
  const waiting = await pending.match(PAGE);
  if (!waiting || text !== await waiting.text()) await pending.put(PAGE, res);
  await tell({ type: 'update-ready' });
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
  if (type === 'apply-update') ev.waitUntil((async () => {
    const waiting = await (await caches.open(PENDING)).match(PAGE);
    if (waiting) await (await caches.open(SHELL)).put(PAGE, waiting);
    await caches.delete(PENDING);
    await tell({ type: 'update-applied' }, ev.source);
  })());
});
