#!/usr/bin/env node
/* Type check: runs the TypeScript checker on the game script in index.html, so the JSDoc types
   are checked. No browser is needed. Errors name the line in index.html. Exit code 1 on an error. */
'use strict';
const fs = require('fs'), path = require('path'), ts = require('typescript');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /<script>([\s\S]*?)<\/script>/.exec(html);
if (!m) { console.error('no <script> in index.html'); process.exit(1); }
/* Lines in the script plus this offset are lines in index.html. */
const offset = html.slice(0, m.index + '<script>'.length).split('\n').length - 1;

const FILE = path.join(__dirname, 'game.js');  /* a virtual file: nothing is written to disk */
const options = { allowJs: true, checkJs: true, noEmit: true, target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'], skipLibCheck: true };
const host = ts.createCompilerHost(options);
const readFile = host.readFile, fileExists = host.fileExists;
host.readFile = f => (path.resolve(f) === FILE ? m[1] : readFile(f));
host.fileExists = f => path.resolve(f) === FILE || fileExists(f);

const diags = ts.getPreEmitDiagnostics(ts.createProgram([FILE], options, host));
for (const d of diags) {
  const text = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  if (!d.file) { console.log('error TS' + d.code + ': ' + text); continue; }
  const { line, character } = d.file.getLineAndCharacterOfPosition(d.start || 0);
  console.log('index.html:' + (line + 1 + offset) + ':' + (character + 1) + ' error TS' + d.code + ': ' + text);
}
console.log(diags.length ? diags.length + ' type error(s)' : 'No type errors.');
process.exit(diags.length ? 1 : 0);
