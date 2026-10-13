#!/usr/bin/env node
/* Type check: runs the TypeScript checker on the game script in index.html, so the JSDoc types
   are checked. No browser is needed. Errors name the line in index.html. Exit code 1 on an error.
   It runs the tsc command, not the TypeScript API: TypeScript 7 has no stable JavaScript API. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /<script>([\s\S]*?)<\/script>/.exec(html);
if (!m) { console.error('no <script> in index.html'); process.exit(1); }
/* Lines in the script plus this offset are lines in index.html. */
const offset = html.slice(0, m.index + '<script>'.length).split('\n').length - 1;

/* strict is set off by name: TypeScript 6 and later turn it on by default, which the JSDoc types do not aim for. */
const compilerOptions = { allowJs: true, checkJs: true, strict: false, noEmit: true, target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], skipLibCheck: true, types: [] };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kct-typecheck-'));
let out;
try {
  fs.writeFileSync(path.join(dir, 'game.js'), m[1]);
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions, files: ['game.js'] }));
  const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  const run = spawnSync(process.execPath, [tsc, '-p', dir, '--pretty', 'false'], { encoding: 'utf8' });
  if (run.error) throw run.error;
  out = (run.stdout || '') + (run.stderr || '');
  if (run.status !== 0 && !/error TS\d+/.test(out)) { console.error(out.trim() || 'tsc failed with exit code ' + run.status); process.exit(1); }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

/* tsc prints game.js(line,col): error TSxxxx: text, and more lines for a long message. */
let errors = 0;
for (const line of out.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const e = /^(?:.*[\\/])?game\.js\((\d+),(\d+)\): (error TS\d+: .*)$/.exec(line);
  if (e) { errors++; console.log('index.html:' + (Number(e[1]) + offset) + ':' + e[2] + ' ' + e[3]); }
  else { if (/error TS\d+/.test(line)) errors++; console.log(line); }
}
console.log(errors ? errors + ' type error(s)' : 'No type errors.');
process.exit(errors ? 1 : 0);
