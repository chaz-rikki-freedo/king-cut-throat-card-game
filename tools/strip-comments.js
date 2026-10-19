#!/usr/bin/env node
/* Removes the comments from an HTML page: HTML comments, CSS comments in <style>, and JavaScript comments in each
   <script> that holds code (a JSON script is left as it is). Lines left empty are dropped; code is not reformatted,
   and text inside strings, template literals and regular expressions is kept as it is.
   publish.sh runs it on the published index.html. No dependencies.

   Usage: node tools/strip-comments.js file.html   (the file is rewritten in place) */
'use strict';
const fs = require('fs');

/* Words after which a "/" starts a regular expression, not a division. */
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/** JavaScript without its comments. Strings, template literals and regular expressions are kept as they are. */
function stripJS(src) {
  /* done: finished lines; line: the line being built. A line left empty by a removed comment is dropped. */
  const done = [];
  let line = '', i = 0;
  const n = src.length;
  /** Adds source text (a template literal can hold newlines). */
  const put = s => {
    line += s;
    const k = line.lastIndexOf('\n');
    if (k >= 0) { done.push(line.slice(0, k + 1)); line = line.slice(k + 1); }
  };
  const newline = () => { if (line.trim()) done.push(line.replace(/[ \t]+$/, '') + '\n'); line = ''; };
  const restOfLineBlank = /[ \t]*(?:\n|$)/y;
  /* The last significant character or word, to tell a regular expression from a division. */
  let prev = '';
  const regexAllowed = () => prev === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || REGEX_AFTER_WORD.has(prev);
  /* Open template literals: the brace depth at each "${", so its "}" returns to the template. */
  const tpl = [];
  let depth = 0;
  function template() {
    /* After the opening backquote or the "}" that ends a "${...}": up to the closing backquote or the next "${". */
    let j = i;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') { put(src.slice(i, j + 1)); i = j + 1; prev = '`'; return; }
      if (c === '$' && src[j + 1] === '{') { put(src.slice(i, j + 2)); i = j + 2; tpl.push(depth); depth++; prev = '{'; return; }
      j++;
    }
    put(src.slice(i)); i = n;
  }
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') i++;
      line = line.replace(/[ \t]+$/, '');
      continue;
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      restOfLineBlank.lastIndex = i;
      /* A comment between two words keeps them apart. */
      if (/[\w$]$/.test(line) && /[\w$]/.test(src[i] || '')) line += ' ';
      else if (restOfLineBlank.test(src)) line = line.replace(/[ \t]+$/, '');
      continue;
    }
    if (c === '\n') { newline(); i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      put(src.slice(i, j + 1)); i = j + 1; prev = c; continue;
    }
    if (c === '`') { put(c); i++; template(); continue; }
    if (c === '/' && regexAllowed()) {
      let j = i + 1, cls = false;
      while (j < n) {
        const x = src[j];
        if (x === '\\') { j += 2; continue; }
        if (x === '[') cls = true; else if (x === ']') cls = false; else if (x === '/' && !cls) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      put(src.slice(i, j)); i = j; prev = 'regex'; continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); put(c); i++; template(); continue; }
    }
    if (/[\w$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j++;
      prev = src.slice(i, j); put(prev); i = j; continue;
    }
    if (!/\s/.test(c)) prev = c;
    line += c; i++;
  }
  newline();
  return done.join('');
}

/** CSS without its comments. Quoted strings are kept. */
function stripCSS(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

/** Trailing spaces go, and so do lines left empty. For HTML and CSS: neither has text that spans lines here. */
const tidy = s => s.split('\n').map(l => l.replace(/[ \t]+$/, '')).filter(l => l !== '').join('\n');

/** The page without comments. */
function stripHTML(html) {
  let out = '', i = 0;
  const open = /<!--|<(script|style)\b([^>]*)>/gi;
  for (;;) {
    open.lastIndex = i;
    const m = open.exec(html);
    if (!m) { out += tidy(html.slice(i)); break; }
    out += tidy(html.slice(i, m.index));
    if (m[0] === '<!--') { const end = html.indexOf('-->', m.index + 4); i = end < 0 ? html.length : end + 3; continue; }
    const tag = m[1].toLowerCase(), close = html.toLowerCase().indexOf('</' + tag, open.lastIndex);
    const body = html.slice(open.lastIndex, close < 0 ? html.length : close);
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[2]);
    const code = tag === 'style' || !type || /^(module|text\/javascript|application\/javascript)$/i.test(type[1]);
    const stripped = (tag === 'style' ? tidy(stripCSS(body)) : stripJS(body)).replace(/\s+$/, '');
    out += (out && !out.endsWith('\n') ? '\n' : '') + m[0] + (code ? '\n' + stripped + '\n' : body);
    i = close < 0 ? html.length : close;
  }
  return out.endsWith('\n') ? out : out + '\n';
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node tools/strip-comments.js file.html'); process.exit(2); }
  const before = fs.readFileSync(file, 'utf8'), after = stripHTML(before);
  fs.writeFileSync(file, after);
  console.log('strip-comments: ' + file + ' ' + before.length + ' -> ' + after.length + ' bytes');
}

module.exports = { stripHTML, stripJS, stripCSS };
