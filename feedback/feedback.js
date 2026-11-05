/* King Cut-Throat: feedback/feedback.js, the optional feedback module.

   Listens for the game's 'kct:moment' batches and answers with sound (made by synth.js from the presets in
   palettes.js) and vibration (Android). It never reads the game: it knows only the batches and control
   messages the game sends. Without this file, the game is silent and still, and nothing says so.

   Phase 1: the contract, the settings rows, the ordinary rule and cue tables, the gates, the dropping rules,
   rendering at idle, and the theme palettes with Fall's Showdown voice. Derived events, moments of interest
   and variety come in later phases. Event parallax waits for #185: its channel is a no-op hook.

   Spec: docs/ui/feedback.md (the module) and docs/ui/feedback-contract.md (the contract).
   Tests: tests/feedback.js. Exposes window.KCTFeedback (the pure core, for tests). */
(function () {
'use strict';

/* ---- Contract ---- */
const V = 1;
const ME = /** @type {HTMLScriptElement | null} */ (document.currentScript);
const BASE = ME && ME.src ? ME.src.replace(/[^/]*$/, '') : 'feedback/';

/* ---- Constants (docs/ui/feedback.md, Constants) ---- */
const LATE_MS = 80;
const GAP_VIBRATE_MS = 150;
const GAP_SOUND_MS = 60;
const MAX_VOICES = 4;
const HALF_GAIN = 0.5;
const RENDER_BUDGET_MS = 150;

/* ---- Rule table: when. First match wins, in rank order. `m` is a moment. ---- */
/** @typedef {{ rank: number, cue: string, when: (m: any) => boolean }} Rule */
/** @type {Rule[]} */
const RULES = [
  { rank: 1, cue: 'waveCleared', when: (m) => m.type === 'waveCleared' },
  { rank: 2, cue: 'gameWin', when: (m) => m.type === 'gameEnded' && m.you },
  { rank: 2, cue: 'gameLoss', when: (m) => m.type === 'gameEnded' && !m.you },
  { rank: 3, cue: 'showdownCalledYou', when: (m) => m.type === 'showdownCalled' && m.youPlay },
  { rank: 3, cue: 'showdownCalledOther', when: (m) => m.type === 'showdownCalled' && !m.youPlay },
  { rank: 4, cue: 'showdownMediated', when: (m) => m.type === 'showdownScored' && m.youMediate },
  { rank: 4, cue: 'showdownWin', when: (m) => m.type === 'showdownScored' && m.you },
  { rank: 4, cue: 'showdownLoss', when: (m) => m.type === 'showdownScored' && !m.you },
  { rank: 5, cue: 'handWin', when: (m) => m.type === 'handScored' && m.you },
  { rank: 5, cue: 'handLoss', when: (m) => m.type === 'handScored' && !m.you },
  { rank: 6, cue: 'kingYou', when: (m) => m.type === 'king' && m.you },
  { rank: 6, cue: 'kingBot', when: (m) => m.type === 'king' && !m.you },
  { rank: 7, cue: 'trickYou', when: (m) => m.type === 'trickWon' && m.you },
  { rank: 7, cue: 'trickBot', when: (m) => m.type === 'trickWon' && !m.you },
  { rank: 8, cue: 'trumpNamed', when: (m) => m.type === 'trumpNamed' },
  { rank: 9, cue: 'cardPlayed', when: (m) => m.type === 'cardPlayed' },
  { rank: 9, cue: 'deal', when: (m) => m.type === 'deal' },
  { rank: 9, cue: 'flip', when: (m) => m.type === 'flip' },
  { rank: 10, cue: 'discard', when: (m) => m.type === 'discard' },
  { rank: 11, cue: 'pick', when: (m) => m.type === 'cardPicked' },
  { rank: 11, cue: 'skip', when: (m) => m.type === 'skipPressed' && m.youMediate },
];

/* ---- Cue table: what each channel does. null: that channel does nothing. ---- */
/** @typedef {{ vibrate: number[] | null, sound: string | null, parallax: string | null, noGap?: boolean }} Cue */
/** @type {Record<string, Cue>} */
const CUES = {
  waveCleared:         { vibrate: [60, 40, 60, 40, 60, 40, 160], sound: 'wave-cleared', parallax: 'celebrate' },
  gameWin:             { vibrate: [60, 40, 60, 40, 120], sound: 'game-win', parallax: 'celebrate' },
  gameLoss:            { vibrate: [150], sound: 'game-loss', parallax: null },
  showdownCalledYou:   { vibrate: [80, 60, 80], sound: 'showdown-called', parallax: 'lift' },
  showdownCalledOther: { vibrate: null, sound: 'showdown-called', parallax: null },
  showdownWin:         { vibrate: [60, 40, 60], sound: 'showdown-win', parallax: null },
  showdownLoss:        { vibrate: [60, 40, 60], sound: 'showdown-loss', parallax: null },
  showdownMediated:    { vibrate: [60, 40, 60], sound: 'showdown-win', parallax: null },
  handWin:             { vibrate: null, sound: 'hand-win', parallax: null },
  handLoss:            { vibrate: null, sound: 'hand-loss', parallax: null },
  kingYou:             { vibrate: [35, 60, 35], sound: 'king-you', parallax: null },
  kingBot:             { vibrate: null, sound: 'king-bot', parallax: null },
  trickYou:            { vibrate: [35], sound: 'trick-you', parallax: null },
  trickBot:            { vibrate: null, sound: 'trick-bot', parallax: null },
  trumpNamed:          { vibrate: null, sound: 'trump-named', parallax: null },
  cardPlayed:          { vibrate: null, sound: 'card-play', parallax: null },
  deal:                { vibrate: null, sound: 'deal', parallax: null },
  flip:                { vibrate: null, sound: 'flip', parallax: null },
  discard:             { vibrate: null, sound: 'discard', parallax: null },
  pick:                { vibrate: [8], sound: null, parallax: null, noGap: true },
  skip:                { vibrate: [20], sound: null, parallax: null },
};

/**
 * The main cue for a batch: the first rule, in rank order, that any of its moments matches.
 * Unknown types and fields are ignored. Pure.
 * @param {{ moments?: any[] }} batch
 * @returns {{ name: string, rank: number, cue: Cue } | null}
 */
function cueFor(batch) {
  const moments = Array.isArray(batch && batch.moments) ? batch.moments.filter((m) => m && typeof m.type === 'string') : [];
  for (const rule of RULES) {
    if (moments.some((m) => { try { return rule.when(m); } catch (e) { return false; } })) {
      return { name: rule.cue, rank: rule.rank, cue: CUES[rule.cue] };
    }
  }
  return null;
}

/**
 * Which channels may play a batch's cue, from the module's gates (docs/ui/feedback.md, Gates). Pure.
 * @param {any} batch
 * @param {{ vibration: boolean, sound: string, replaySound: boolean, canVibrate: boolean, canSound: boolean,
 *   activated: boolean, hidden: boolean, instant: boolean }} env
 */
function channelsFor(batch, env) {
  const ok = !!batch && batch.v === V && !env.hidden && !env.instant;
  const replay = !!(batch && batch.replay);
  return {
    vibrate: ok && env.vibration && env.canVibrate && env.activated && !replay,
    sound: ok && env.sound !== 'off' && env.canSound && env.activated && (!replay || env.replaySound),
  };
}

/**
 * The dropping rules for one channel (docs/ui/feedback.md, Dropping). Pure apart from its own record of the
 * last part played. `now` and `at` are performance.now() times.
 * @param {number} gapMs
 */
function makeDropper(gapMs) {
  let lastAt = -Infinity, lastRank = Infinity;
  return {
    /**
     * @param {{ at: number, now: number, rank: number, noGap?: boolean, stale?: boolean, ready?: boolean, voices?: number }} p
     * @returns {'play' | 'replace' | 'stale' | 'notReady' | 'late' | 'tooSoon' | 'voices'}
     */
    decide(p) {
      if (p.stale) return 'stale';
      if (p.ready === false) return 'notReady';
      if (p.now - p.at > LATE_MS) return 'late';
      let verdict = /** @type {'play' | 'replace'} */ ('play');
      if (!p.noGap && p.now - lastAt < gapMs) {
        if (p.rank < lastRank) verdict = 'replace';
        else return 'tooSoon';
      }
      if (verdict === 'play' && p.voices !== undefined && p.voices >= MAX_VOICES) return 'voices';
      if (!p.noGap) { lastAt = p.now; lastRank = p.rank; }
      return verdict;
    },
    reset() { lastAt = -Infinity; lastRank = Infinity; },
  };
}

/* ---- Device settings (docs/ui/feedback-contract.md, Device keys) ---- */
const KEYS = { vibration: 'kct.feedback.vibration', sound: 'kct.feedback.sound', replaySound: 'kct.feedback.replaySound' };
const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* not kept */ } };
const settings = {
  get vibration() { return read(KEYS.vibration) === 'on'; },
  set vibration(on) { write(KEYS.vibration, on ? 'on' : null); },
  /** @returns {string} 'off', 'half' or 'full' */
  get sound() { const s = read(KEYS.sound); return s === 'half' || s === 'full' ? s : 'off'; },
  set sound(level) { write(KEYS.sound, level === 'half' || level === 'full' ? level : null); },
  get replaySound() { return read(KEYS.replaySound) === 'on'; },
  set replaySound(on) { write(KEYS.replaySound, on ? 'on' : null); },
};

/* ---- State ---- */
const state = {
  felt: 'classic',
  instant: false,
  showdown: false,
  version: -1,
  activated: false,
  logged: new Set(),
};
const canVibrate = typeof navigator.vibrate === 'function';
const AudioCtor = /** @type {any} */ (window).AudioContext || /** @type {any} */ (window).webkitAudioContext;
const canSound = typeof AudioCtor === 'function' && typeof OfflineAudioContext === 'function';

/* ---- Messages to the game ---- */
function log(kind, data) {
  document.dispatchEvent(new CustomEvent('kct:feedback-log', { detail: { v: V, kind, data } }));
}
function logOnce(kind, key, data) {
  if (state.logged.has(kind + ':' + key)) return;
  state.logged.add(kind + ':' + key);
  log(kind, data);
}

/* ---- Loading synth.js and palettes.js at idle ---- */
/* Each render gets its own idle slot. The timeout keeps a busy page from waiting long: a render takes 15 to 50 ms. */
const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => fn(), { timeout: 250 }) : setTimeout(fn, 200));
/** @type {Promise<boolean> | null} */
let libsLoaded = null;
function loadScript(file) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = BASE + file;
    s.onload = () => resolve(true);
    s.onerror = () => { logOnce('FILE_MISSING', file, { file }); resolve(false); };
    document.head.appendChild(s);
  });
}
function loadLibs() {
  if (!libsLoaded) {
    const w = /** @type {any} */ (window);
    libsLoaded = (async () => {
      const a = w.KCTSynth || await loadScript('synth.js');
      const b = w.KCTPalettes || await loadScript('palettes.js');
      return !!(a && b && w.KCTSynth && w.KCTPalettes);
    })();
  }
  return libsLoaded;
}

/* ---- Rendering: one preset at a time, each in its own idle slot ---- */
/** @type {Map<string, AudioBuffer | null>} key: felt|showdown|name. null: failed. */
const buffers = new Map();
const keyOf = (felt, showdown, name) => felt + (showdown ? '/sd' : '') + '|' + name;
let renderQueue = Promise.resolve();
/** The rendered buffer for a sound, after the fallbacks: this palette (or its Showdown voice), then Classic. */
function bufferFor(name) {
  return buffers.get(keyOf(state.felt, state.showdown, name)) || buffers.get(keyOf('classic', false, name)) || null;
}
function renderPalette(felt, showdown) {
  renderQueue = renderQueue.then(async () => {
    if (!(await loadLibs())) return;
    const P = /** @type {any} */ (window).KCTPalettes, S = /** @type {any} */ (window).KCTSynth;
    for (const name of P.required) {
      const key = keyOf(felt, showdown, name);
      if (buffers.has(key) || settings.sound === 'off') continue;
      await new Promise((r) => idle(r));
      const r = P.resolve(felt, name, showdown);
      if (!r) { buffers.set(key, null); continue; }
      try {
        const t0 = performance.now();
        const out = await S.render(r.preset, r.voice);
        const ms = performance.now() - t0;
        if (ms > RENDER_BUDGET_MS) log('RENDER_SLOW', { name, palette: felt, ms: Math.round(ms) });
        buffers.set(key, toBuffer(out));
      } catch (e) {
        buffers.set(key, null);
        logOnce('RENDER_FAILED', key, { name, palette: felt, error: String(e && e.message || e) });
      }
    }
  }).catch(() => { /* a failed render never stops the queue */ });
  return renderQueue;
}
function renderCurrent() {
  if (settings.sound === 'off' || !canSound) return;
  renderPalette('classic', false);
  if (state.felt !== 'classic') renderPalette(state.felt, false);
  const P = /** @type {any} */ (window).KCTPalettes;
  if (P && P.palettes[state.felt] && P.palettes[state.felt].showdown) renderPalette(state.felt, true);
}

/* ---- The sound channel ---- */
/** @type {any} */
let audio = null;
/** @type {any[]} */
const voices = [];
function ensureAudio() {
  if (!canSound || settings.sound === 'off') return null;
  try {
    if (!audio) audio = new AudioCtor();
    if (audio.state === 'suspended' && typeof audio.resume === 'function') audio.resume();
  } catch (e) { audio = null; }
  return audio;
}
/* A buffer needs no context: making one never creates the playing AudioContext, so nothing happens before
   the first tap that a browser would warn about. */
function toBuffer(out) {
  const b = typeof AudioBuffer === 'function'
    ? new AudioBuffer({ numberOfChannels: 1, length: out.samples.length, sampleRate: out.sampleRate })
    : new OfflineAudioContext(1, 1, out.sampleRate).createBuffer(1, out.samples.length, out.sampleRate);
  b.getChannelData(0).set(out.samples);
  return b;
}
function playSound(buffer, replace) {
  const ctx = ensureAudio();
  if (!ctx) return false;
  if (replace && voices.length) { try { voices[voices.length - 1].stop(); } catch (e) { /* already ended */ } }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = settings.sound === 'half' ? HALF_GAIN : 1;
  src.connect(gain);
  gain.connect(ctx.destination);
  voices.push(src);
  src.onended = () => { const i = voices.indexOf(src); if (i >= 0) voices.splice(i, 1); };
  src.start(ctx.currentTime);
  return true;
}

/* ---- The vibration and event parallax channels ---- */
function vibrate(pattern) { try { return !!navigator.vibrate(pattern); } catch (e) { return false; } }
/** Event parallax waits for #185. A listener can set KCTFeedback.parallax to receive motion names. */
function parallax(name) { const f = api.parallax; if (typeof f === 'function') { try { f(name); } catch (e) { /* never stops feedback */ } } }

const drop = { vibrate: makeDropper(GAP_VIBRATE_MS), sound: makeDropper(GAP_SOUND_MS) };

/** Plays a batch: the order of operations in docs/ui/feedback.md, step 4. Returns what each channel did. */
function play(batch) {
  const now = performance.now();
  const found = cueFor(batch);
  if (!found) return null;
  const allowed = channelsFor(batch, {
    vibration: settings.vibration, sound: settings.sound, replaySound: settings.replaySound, canVibrate, canSound,
    activated: state.activated || !!(navigator.userActivation && navigator.userActivation.hasBeenActive),
    hidden: document.hidden, instant: state.instant,
  });
  const stale = typeof batch.version === 'number' && batch.version < state.version;
  const at = typeof batch.at === 'number' ? batch.at : now;
  const result = { cue: found.name, vibrate: 'off', sound: 'off', parallax: 'off' };
  const { cue, rank } = found;
  if (cue.vibrate && allowed.vibrate) {
    const v = drop.vibrate.decide({ at, now, rank, noGap: cue.noGap, stale });
    result.vibrate = v;
    if (v === 'play' || v === 'replace') vibrate(cue.vibrate);
  }
  if (cue.sound && allowed.sound) {
    const buffer = bufferFor(cue.sound);
    if (!buffer) logOnce('SOUND_MISSING', cue.sound + '|' + state.felt, { name: cue.sound, palette: state.felt });
    const v = drop.sound.decide({ at, now, rank, stale, ready: !!buffer, voices: voices.length });
    result.sound = v;
    if ((v === 'play' || v === 'replace') && buffer) playSound(buffer, v === 'replace');
  }
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cue.parallax && !batch.replay && !state.instant && !document.hidden && !reduced && batch.v === V) {
    result.parallax = 'play';
    parallax(cue.parallax);
  }
  return result;
}

/* ---- Control messages ---- */
/* Nothing is armed in phase 1: each batch plays when it arrives. A new game (scope 'game') also forgets the Showdown
   voice and the last part each channel played; a step (scope 'step', such as Next hand) keeps the gaps. */
function cancel(scope) {
  if (scope !== 'game') return;
  state.showdown = false;
  drop.vibrate.reset();
  drop.sound.reset();
}
function control(detail) {
  switch (detail.control) {
    case 'cancel': cancel(detail.scope); break;
    case 'reset':
      settings.vibration = false; settings.sound = 'off'; settings.replaySound = false;
      vibrate(0); syncRows(); suspend();
      break;
    case 'speed':
      state.instant = detail.speed === 'instant';
      if (state.instant) { vibrate(0); cancel('step'); }
      break;
    case 'theme':
      if (typeof detail.felt === 'string' && detail.felt !== state.felt) { state.felt = detail.felt; renderCurrent(); }
      break;
    default: /* unknown control: ignored */
  }
}
function suspend() { if (audio && typeof audio.suspend === 'function') { try { audio.suspend(); } catch (e) { /* ignore */ } } }

/* ---- The listener ---- */
function onMoment(e) {
  const d = /** @type {CustomEvent} */ (e).detail;
  if (!d || d.v !== V) return;
  if (typeof d.version === 'number' && d.version > state.version) state.version = d.version;
  if (d.control) { control(d); return; }
  const moments = Array.isArray(d.moments) ? d.moments : [];
  play(d);
  /* Fall's Showdown voice: from the Showdown call to the Showdown result (after the result's own cue). */
  if (moments.some((m) => m && m.type === 'showdownCalled')) state.showdown = true;
  if (moments.some((m) => m && (m.type === 'showdownScored' || m.type === 'gameEnded'))) state.showdown = false;
}

/* ---- Settings rows (docs/ui/feedback-contract.md, The markup the module may use) ---- */
const ROWS_HTML =
  (canVibrate ? '<label class="set-row"><span class="set-text"><span class="set-name">Vibration</span><span class="set-desc">Short vibrations when you win a trick or a King point, pick a card, and at the end of a game.</span></span><input class="sw" type="checkbox" id="setFbVibration"></label>' : '') +
  '<div class="set-row"><span class="set-text"><label class="set-name" for="setFbSound">Sound</label><span class="set-desc">Short sounds for cards, tricks and results. Half plays them at half volume.</span></span>' +
  '<select id="setFbSound"><option value="off">Off</option><option value="half">Half</option><option value="full">Full</option></select></div>' +
  '<label class="set-row" id="setFbReplayRow"><span class="set-text"><span class="set-name">Sound in replays</span><span class="set-desc">The replay viewer plays the same sounds, at the Sound level.</span></span><input class="sw" type="checkbox" id="setFbReplay"></label>';
function rowsRoot() { return document.getElementById('setFeedback'); }
function syncRows() {
  const root = rowsRoot();
  if (!root) return;
  const v = /** @type {HTMLInputElement | null} */ (root.querySelector('#setFbVibration'));
  const s = /** @type {HTMLSelectElement | null} */ (root.querySelector('#setFbSound'));
  const r = /** @type {HTMLInputElement | null} */ (root.querySelector('#setFbReplay'));
  const rr = /** @type {HTMLElement | null} */ (root.querySelector('#setFbReplayRow'));
  if (v) v.checked = settings.vibration;
  if (s) s.value = settings.sound;
  if (r) r.checked = settings.replaySound;
  if (rr) rr.hidden = settings.sound === 'off';
}
function mountRows() {
  const root = rowsRoot();
  if (!root || root.querySelector('#setFbSound')) return;
  root.insertAdjacentHTML('beforeend', ROWS_HTML);
  const v = root.querySelector('#setFbVibration'), s = root.querySelector('#setFbSound'), r = root.querySelector('#setFbReplay');
  if (v) v.addEventListener('change', () => { settings.vibration = /** @type {HTMLInputElement} */ (v).checked; if (!settings.vibration) vibrate(0); });
  if (s) s.addEventListener('change', () => {
    const was = settings.sound;
    settings.sound = /** @type {HTMLSelectElement} */ (s).value;
    syncRows();
    if (settings.sound === 'off') { cancel('step'); suspend(); }
    else { ensureAudio(); if (was === 'off') renderCurrent(); }
  });
  if (r) r.addEventListener('change', () => { settings.replaySound = /** @type {HTMLInputElement} */ (r).checked; });
  syncRows();
}

/* ---- The first tap ---- */
function onFirstTap() {
  state.activated = true;
  ensureAudio();
  document.removeEventListener('pointerdown', onFirstTap, true);
}

/* ---- Start ---- */
const api = {
  version: V,
  /** Set by event parallax (#185) to receive motion names. */
  parallax: /** @type {null | ((name: string) => void)} */ (null),
  /** The pure core and the module's state, for tests (tests/feedback.js). */
  core: Object.freeze({ RULES, CUES, cueFor, channelsFor, makeDropper, LATE_MS, GAP_VIBRATE_MS, GAP_SOUND_MS, MAX_VOICES, KEYS }),
  test: Object.freeze({
    play, state, settings, buffers, voices: () => voices.length, whenRendered: () => renderQueue,
    renderCurrent, mountRows,
  }),
};
/** @type {any} */ (window).KCTFeedback = api;
document.addEventListener('kct:moment', onMoment);
document.addEventListener('pointerdown', onFirstTap, true);
mountRows();
idle(() => { loadLibs().then((ok) => { if (ok) renderCurrent(); }); });
document.dispatchEvent(new CustomEvent('kct:feedback-ready', { detail: { v: V } }));
})();
