#!/usr/bin/env node
/* docs/defaults.md against the app: opens the page with empty storage and checks that every row of the table there
   (Key: a path under window.KCT, Value: JSON) matches the page. Exit code 1 on a failed check. */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage, ROOT } = require('./lib/browser');

/* The rows of the table whose header has Key and Value: [setting, key, value]. */
function rows(md) {
  const lines = md.split('\n').filter(l => l.startsWith('|'));
  const cells = l => l.slice(1, -1).split('|').map(c => c.trim());
  const head = lines.length ? cells(lines[0]) : [], k = head.indexOf('Key'), v = head.indexOf('Value');
  if (k < 0 || v < 0) throw new Error('docs/defaults.md: no table with Key and Value columns');
  return lines.slice(2).map(cells).map(c => [c[0], c[k].replace(/^`|`$/g, ''), c[v].replace(/^`|`$/g, '')]);
}

(async () => {
  const table = rows(fs.readFileSync(path.join(ROOT, 'docs', 'defaults.md'), 'utf8'));
  const srv = await serve(), browser = await launch();
  let failed = 0;
  try {
    const { page, errors } = await openPage(browser, srv.url);
    const got = await page.evaluate(keys => keys.map(k => { try { return { v: JSON.stringify(new Function('KCT', 'with (KCT) return ' + k)(window.KCT)) }; } catch (e) { return { e: String(e) }; } }), table.map(r => r[1]));
    table.forEach(([name, key, want], i) => {
      const ok = !got[i].e && got[i].v === JSON.stringify(JSON.parse(want));
      if (!ok) failed++;
      console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok ? '' : '  ' + key + ': page ' + (got[i].e || got[i].v) + ', table ' + want));
    });
    if (!table.length) { failed++; console.log('  ✖ the table has no rows'); }
    if (errors.length) { failed++; console.log('  ✖ page errors: ' + errors.join('; ')); }
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? 'FAILED: ' + failed + ' check(s)' : 'OK: all ' + table.length + ' defaults match docs/defaults.md');
  process.exit(failed ? 1 : 0);
})();
