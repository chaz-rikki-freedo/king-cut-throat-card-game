#!/usr/bin/env node
/* Runs the in-page self-tests (Settings > Run self-tests) in Chromium. Exit code 1 on a failure. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page, errors } = await openPage(browser, srv.url);
    const r = await run(page, `const r = KCT.SelfTest.run();
      return { total: r.results.length, failed: r.failed, ms: r.ms, fails: r.results.filter(x => !x.ok).map(x => x.section + ': ' + x.name + ' ' + x.detail.slice(0, 300)) };`);
    console.log((r.failed ? 'FAIL' : 'OK') + ': ' + (r.total - r.failed) + ' of ' + r.total + ' checks passed (' + r.ms + ' ms)');
    for (const f of r.fails) console.log('  ✖ ' + f);
    if (errors.length) console.log('Page errors:', errors);
    process.exitCode = r.failed || errors.length ? 1 : 0;
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
