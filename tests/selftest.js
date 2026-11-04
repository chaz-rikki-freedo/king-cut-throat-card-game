#!/usr/bin/env node
/* Runs the in-page self-tests (Settings > Run self-tests) in Chromium. Exit code 1 on a failure.

   Usage: node selftest.js                   every area (about 2 s)
          node selftest.js interface         one area
          node selftest.js rules 'app logic' several areas, or a group (GROUPS below)
          node selftest.js --list            the areas and groups

   An area is a section name in SelfTest (safeRun in index.html). The service worker and airplane mode areas wait on
   the browser and never run here: node sw.js covers them. */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage, run, ROOT } = require('./lib/browser');

const GROUPS = {
  rules: ['cards', 'deal', 'discard order', 'bidding', 'follow', 'scoring', 'showdown', 'restart'],
  ai: ['ai knowledge', 'planner', 'hand stats', 'simulation'],
  data: ['memory', 'replay', 'backup'],
  ui: ['interface', 'app logic']
};
/* The areas, read from index.html, so a new area needs no change here. */
const AREAS = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/safeRun\('([^']+)'/g)].map(m => m[1]);

const args = process.argv.slice(2);
if (args.includes('--list')) {
  console.log('Areas: ' + AREAS.join(', '));
  for (const [g, a] of Object.entries(GROUPS)) console.log('Group ' + g + ': ' + a.join(', '));
  process.exit(0);
}
const only = [...new Set(args.flatMap(a => GROUPS[a] || [a]))];
const unknown = only.filter(a => !AREAS.includes(a));
if (unknown.length) {
  console.error('Unknown area: ' + unknown.join(', ') + '. Run node selftest.js --list for the areas.');
  process.exit(2);
}

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page, errors } = await openPage(browser, srv.url);
    const r = await run(page, `const r = KCT.SelfTest.run(arg.length ? { only: arg } : {});
      return { total: r.results.length, failed: r.failed, ms: r.ms, fails: r.results.filter(x => !x.ok).map(x => x.section + ': ' + x.name + ' ' + x.detail.slice(0, 300)) };`, only);
    console.log((r.failed ? 'FAIL' : 'OK') + ': ' + (r.total - r.failed) + ' of ' + r.total + ' checks passed (' + r.ms + ' ms)' + (only.length ? ' in ' + only.join(', ') : ''));
    for (const f of r.fails) console.log('  ✖ ' + f);
    if (errors.length) console.log('Page errors:', errors);
    process.exitCode = r.failed || errors.length ? 1 : 0;
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
