#!/usr/bin/env node
/* Stress sections of page/stress.js, each in W pages at the same time (shards).
   Usage: node stress.js <section|all> [workers] [json params]
   Sections and their main parameter (see page/stress.js):
     engine      games per shard: random and AI games, checked against an independent rules oracle,
                 with invalid-action fuzzing, replay, seek and save checks   {"games":2000,"fuzz":0.25,"replayEvery":4}
     replayFuzz  damaged replay codes                                         {"tries":25000}
     recordFuzz  damaged replay records (objects)                             {"tries":10000}
     backup      backup round trips, all-or-nothing import, damaged input    {"n":250}
     ai          AI decisions: legal, and the same when hidden cards move     {"n":500}
   "all" runs every section with small defaults (a quick check). Exit code 1 on any failure. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const QUICK = {
  engine: { games: 150, fuzz: 0.25, replayEvery: 3 }, replayFuzz: { tries: 5000 }, recordFuzz: { tries: 2000 },
  backup: { n: 40 }, ai: { n: 40 }
};

/* Adds numbers, joins arrays (capped), merges objects, keeps the first other value. */
function merge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number') a[k] = (a[k] || 0) + v;
    else if (Array.isArray(v)) a[k] = (a[k] || []).concat(v).slice(0, 20);
    else if (v && typeof v === 'object') a[k] = merge(a[k] || {}, v);
    else if (!(k in a)) a[k] = v;
  }
  return a;
}

async function section(browser, url, name, workers, params) {
  const t0 = Date.now();
  const shards = await Promise.all(Array.from({ length: workers }, async (_, shard) => {
    const { page, errors } = await openPage(browser, url);
    const res = await run(page, 'return SECTIONS[arg.name](arg.params);', { name, params: Object.assign({ shard, shards: workers }, params) }, ['stress.js']);
    await page.context().close();
    return { res, errors };
  }));
  const out = shards.reduce((m, x) => merge(m, x.res), {});
  out.pageErrors = shards.flatMap(x => x.errors);
  out.seconds = Math.round((Date.now() - t0) / 1000);
  return out;
}

(async () => {
  const [name = 'all', w = '4', p] = process.argv.slice(2);
  const workers = Number(w);
  const plan = name === 'all' ? Object.entries(QUICK) : [[name, Object.assign({}, QUICK[name], p ? JSON.parse(p) : {})]];
  if (!plan.every(([n]) => QUICK[n])) { console.error('Unknown section: ' + name + '. Sections: ' + Object.keys(QUICK).join(', ') + ', all'); process.exit(2); }
  const srv = await serve(), browser = await launch();
  let bad = 0;
  try {
    for (const [n, params] of plan) {
      const out = await section(browser, srv.url, n, workers, params);
      const fails = out.fails || [];
      delete out.fails;
      const failed = fails.length || out.pageErrors.length;
      bad += failed ? 1 : 0;
      console.log((failed ? 'FAIL ' : 'OK   ') + n + ' ' + JSON.stringify(out));
      for (const f of fails) console.log('  ✖ ' + JSON.stringify(f).slice(0, 600));
    }
  } finally { await browser.close(); srv.close(); }
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
