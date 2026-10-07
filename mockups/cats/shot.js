const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM }); const p = await b.newPage({ viewport: { width: 1180, height: 340 } });
  await p.goto('file://' + __dirname + '/cats.html'); await p.screenshot({ path: __dirname + '/cat-options.png', fullPage: true }); await b.close(); })();
