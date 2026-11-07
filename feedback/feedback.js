/* King Cut-Throat: feedback/feedback.js, the optional feedback module.

   Listens for the game's 'kct:moment' batches and answers with sound (made by synth.js from the presets in
   palettes.js) and vibration (Android). It never reads the game: it knows only the batches and control
   messages the game sends. Without this file, the game is silent and still, and nothing says so.

   Phase 1: the contract, the settings rows, the ordinary rule and cue tables, the gates, the dropping rules,
   rendering at idle, and the theme palettes with Fall's Showdown voice. Derived events, moments of interest
   and variety come in later phases. Event parallax waits for #185: its channel is a no-op hook.

   Beats (phase 7): the game also sends each motion's contact time. The module plays the table's sounds at those
   times, and schedules every part on the audio clock (sound) or a timer (vibration, parallax) for its batch's at.

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
/* ---- The mix (docs/ui/feedback.md, Mixing) ---- */
const dbToGain = (db) => Math.pow(10, db / 20);
/* The Sound levels, loudest first: Max is well under the rendered level (-18 LUFS), which is loud on a phone speaker.
   Med is about half as loud as Max; each step below it is 6 dB quieter. Loudness is heard in decibels, not in gain. */
const LEVEL_DB = Object.freeze({ max: -18, med: -28, low: -34, lower: -40, min: -46 });
const LEVEL_NAMES = Object.freeze({ max: 'Max', med: 'Med', low: 'Low', lower: 'Lower', min: 'Min' });
/* The levels a device may have stored before there were six: Full is Max and Half is Med. */
const LEVEL_ALIASES = Object.freeze({ full: 'max', half: 'med' });
const levelOf = (/** @type {any} */ v) => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEVEL_DB, v) ? v
  : typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEVEL_ALIASES, v) ? LEVEL_ALIASES[v] : 'off');
const LEVEL_GLIDE_S = 0.015;   // a level change settles in about 50 ms (3 time constants): no click
const SHELF_HZ = 4500;         // the master tone: a high shelf that softens the cards' contact and grain bands
const SHELF_DB = -5;
const LOWPASS_HZ = 9000;       // and a gentle low-pass for the airy top end
const JITTER_DB = 1.5;         // each hit's gain varies within this, by a hash of its beat's key: no two cards land alike
const JITTER_RATE = 0.02;      // and its pitch, within this fraction
const DISTANCE_DB = -2;        // a bot's table sounds sit behind yours
const PAN = { 0: 0, 1: -0.35, 2: 0.35 };   // by place on the table: you, the left seat, the right seat
/* ---- Variation within a game (docs/ui/feedback.md, Variation within a game) ---- */
const CONTEXT_MAX_DB = 2.5;    // the most a card's context moves its gain, either way
const TONE_JITTER_DB = 2;      // how far a hit's brightness (a high shelf at SHELF_HZ) varies, either way
/* A trick card's context: gain (dB), pitch (rate offset) and brightness (shelf dB), added up for each fact that holds. */
const CONTEXT = [
  { when: (b) => b.trump === true, db: 1.5, rate: -0.02, shelf: 0 },     // a trump lands with weight
  { when: (b) => b.high === true, db: 0, rate: 0, shelf: 1 },            // an Ace or a King snaps
  { when: (b) => b.lead === true, db: 0.5, rate: 0, shelf: 0 },          // a firm opening
  { when: (b) => b.last === true, db: 1, rate: 0, shelf: 0 },            // it completes the trick
  { when: (b) => b.follow === false, db: -1.5, rate: 0.01, shelf: 0 },   // a slough, thrown away lightly
];
const RENDER_BUDGET_MS = 150;
const MAX_AHEAD_MS = 4000;     // how far ahead a part may be scheduled
const RETRY_AHEAD_MS = 40;     // a beat whose sound is still rendering asks again this long before it is due
const GAP_BEAT_MS = 30;        // the minimum time between two beat sounds
const BEAT_GAIN = 0.7;         // beat sounds sit under the moments' sounds
const TRAIN_MAX = 6;           // the most cards a train mixes; more add nothing you can hear
const TRAIN_FALL = 0.88;       // each later card in a train, against the one before
const GESTURE_STEP = 0.06;     // a gesture's gain per card above or below its usual count

/* ---- Moments of interest (docs/ui/feedback.md): settled definitions ---- */
const STREAK_MIN = 4;          // tricks in a row, across hands, for a trick streak (then every 3 more)
const COMEBACK_POINTS = 4;     // how far behind the leader a win must have come from
const MATCH = 9;               // one below the winning score
const LEAD_FROM = 7;           // a lead change counts once the new leader has this many points: early leads change all the time
const isKing = (card) => typeof card === 'string' && card[0] === 'K';
/** The seat alone at the top of scores, or -1 when the top is shared. @param {number[]} sc */
function soleLeader(sc) {
  if (!Array.isArray(sc) || sc.length < 3) return -1;
  const top = Math.max(...sc);
  return sc.filter((x) => x === top).length === 1 ? sc.indexOf(top) : -1;
}
/**
 * A lead change at a scoring moment, for the seat at the bottom (you). Ties never count: 'you' means you went from
 * not leading alone to leading alone; 'bot' means a bot now leads alone where you led or shared the lead before.
 * A move between two bots while you trail isn't a lead change for you. @returns {'you' | 'bot' | null}
 */
function leadChange(m, you) {
  if (you < 0 || !m.scoresBefore || !m.scoresAfter) return null;
  const before = soleLeader(m.scoresBefore), after = soleLeader(m.scoresAfter);
  if (after < 0 || m.scoresAfter[after] < LEAD_FROM) return null;
  if (after === you && before !== you) return 'you';
  const wasTop = m.scoresBefore[you] === Math.max(...m.scoresBefore);
  if (after >= 0 && after !== you && wasTop) return 'bot';
  return null;
}
/** Your lead over the next seat after a scoring moment (negative when you trail). */
function lead(m, c) {
  const sc = m.scoresAfter, you = c && typeof c.you === 'number' ? c.you : -1;
  if (!Array.isArray(sc) || you < 0) return 0;
  return sc[you] - Math.max(...sc.filter((_, i) => i !== you));
}
const ninthBefore = (m, seat) => Array.isArray(m.scoresBefore) && m.scoresBefore.some((x, s) => s !== seat && x === MATCH);

/* ---- Rule table: when. First match wins, in rank order. `m` is a moment, `c` the context ({ you: the bottom seat }).
   Moments of interest and derived events (derived:…) rank above the ordinary rule for the same moment. ---- */
/** @typedef {{ rank: number, cue: string, when: (m: any, c: { you: number, stakes?: number }) => boolean }} Rule */
/** @type {Rule[]} */
const RULES = [
  { rank: 0.5, cue: 'finalWave', when: (m) => m.type === 'waveCleared' && m.finalWave },
  { rank: 1, cue: 'waveCleared', when: (m) => m.type === 'waveCleared' },
  { rank: 1.5, cue: 'comeback', when: (m) => m.type === 'derived:comeback' },
  { rank: 1.8, cue: 'suddenDeathYou', when: (m) => m.type === 'gameEnded' && m.byKing && m.you },
  { rank: 1.8, cue: 'suddenDeathBot', when: (m) => m.type === 'gameEnded' && m.byKing && !m.you },
  { rank: 2, cue: 'gameWin', when: (m) => m.type === 'gameEnded' && m.you },
  { rank: 2, cue: 'gameLoss', when: (m) => m.type === 'gameEnded' && !m.you },
  { rank: 3, cue: 'showdownCalledYou', when: (m) => m.type === 'showdownCalled' && m.youPlay },
  { rank: 3, cue: 'showdownCalledOther', when: (m) => m.type === 'showdownCalled' && !m.youPlay },
  { rank: 3.2, cue: 'matchPointYou', when: (m) => m.type === 'derived:matchPoint' && m.you },
  { rank: 3.2, cue: 'matchPointBot', when: (m) => m.type === 'derived:matchPoint' && !m.you },
  { rank: 3.4, cue: 'showdownSweep', when: (m) => m.type === 'showdownScored' && Array.isArray(m.tricks) && m.tricks[m.winner] === 5 },
  { rank: 3.5, cue: 'knockedBack', when: (m) => m.type === 'showdownScored' && m.scoresBefore && m.scoresBefore[m.loser] === MATCH },
  { rank: 3.6, cue: 'revenge', when: (m) => m.type === 'derived:revenge' },
  { rank: 3.7, cue: 'denial', when: (m, c) => (m.type === 'showdownScored' || m.type === 'handScored') && m.you && ninthBefore(m, c.you) },
  { rank: 4, cue: 'showdownMediated', when: (m) => m.type === 'showdownScored' && m.youMediate },
  { rank: 4, cue: 'showdownWin', when: (m) => m.type === 'showdownScored' && m.you },
  { rank: 4, cue: 'showdownLoss', when: (m) => m.type === 'showdownScored' && !m.you },
  { rank: 4.2, cue: 'stealYou', when: (m) => m.type === 'handScored' && m.outcome === 'NON_NAMER_SWEEP' && m.you },
  { rank: 4.2, cue: 'stealBot', when: (m) => m.type === 'handScored' && m.outcome === 'NON_NAMER_SWEEP' && !m.you },
  { rank: 4.3, cue: 'perfectHand', when: (m) => m.type === 'handScored' && m.outcome === 'NAMER_SWEEP' && m.you },
  { rank: 4.6, cue: 'leadYou', when: (m, c) => m.type === 'handScored' && leadChange(m, c.you) === 'you' },
  { rank: 4.6, cue: 'leadBot', when: (m, c) => m.type === 'handScored' && leadChange(m, c.you) === 'bot' },
  { rank: 5, cue: 'handWin', when: (m) => m.type === 'handScored' && m.you },
  { rank: 5, cue: 'handLoss', when: (m) => m.type === 'handScored' && !m.you },
  { rank: 5.2, cue: 'decider', when: (m) => m.type === 'derived:decider' },
  { rank: 5.3, cue: 'kingKilled', when: (m) => m.type === 'derived:kingKilled' },
  { rank: 5.5, cue: 'leadYou', when: (m, c) => m.type === 'king' && leadChange(m, c.you) === 'you' },
  { rank: 5.5, cue: 'leadBot', when: (m, c) => m.type === 'king' && leadChange(m, c.you) === 'bot' },
  { rank: 5.6, cue: 'firstKing', when: (m) => m.type === 'derived:firstKing' },
  { rank: 6, cue: 'kingYou', when: (m) => m.type === 'king' && m.you },
  { rank: 6, cue: 'kingBot', when: (m) => m.type === 'king' && !m.you },
  { rank: 6.5, cue: 'streak', when: (m) => m.type === 'derived:trickStreak' },
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

/* Layer rules add one part on a channel the main cue leaves free. At most one per batch. */
/** @type {Rule[]} */
const LAYERS = [
  /* At the Decider level a scoring moment can end the game: a pulse of the table, under whatever plays. */
  { rank: 1, cue: 'layerDecider', when: (m, c) => c.stakes === 3 && ['king', 'handScored', 'showdownScored'].includes(m.type) },
];

/* ---- Cue table: what each channel does. null: that channel does nothing. A moment of interest's sound falls back to
   the ordinary cue's (fallback) until its own preset exists. Only your moments vibrate. ---- */
/** A part can be one value or a list of variants. stakes and count hold stronger entries; gain, rate, scale and amount
    are parameters (numbers or functions of the moment). ordinary: the cue novelty falls back to.
    @typedef {{ vibrate: any, sound: any, parallax: any, noGap?: boolean, beat?: boolean, fallback?: string, special?: boolean, ordinary?: string,
      stakes?: Record<number, any>, count?: Record<number, any>, gain?: any, rate?: any, scale?: any, amount?: any }} Cue */
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
  handWin:             { vibrate: null, sound: 'hand-win', parallax: null, gain: (m) => 0.7 + 0.1 * (m.points || 1) },
  handLoss:            { vibrate: null, sound: 'hand-loss', parallax: null },
  kingYou:             { vibrate: [35, 60, 35], sound: ['king-you', 'king-you-2'], parallax: null,
                         stakes: { 2: { vibrate: [45, 50, 45] }, 3: { vibrate: [55, 40, 55, 40, 55] } } },
  kingBot:             { vibrate: null, sound: ['king-bot', 'king-bot-2'], parallax: null },
  /* beat: in a batch timed to a beat (beat: true), the beats play this sound, and the cue keeps its other parts. */
  trickYou:            { vibrate: [35], sound: ['trick-you', 'trick-you-2', 'trick-you-3', 'trick-you-4'], parallax: null, stakes: { 3: { vibrate: [35, 40, 35] } }, beat: true },
  trickBot:            { vibrate: null, sound: ['trick-bot', 'trick-bot-2', 'trick-bot-3', 'trick-bot-4'], parallax: null, beat: true },
  trumpNamed:          { vibrate: null, sound: 'trump-named', parallax: null },
  cardPlayed:          { vibrate: null, sound: ['card-play', 'card-play-2', 'card-play-3', 'card-play-4', 'card-play-5', 'card-play-6', 'card-play-7', 'card-play-8'], parallax: null, beat: true },
  deal:                { vibrate: null, sound: ['deal', 'deal-2', 'deal-3', 'deal-4'], parallax: null, beat: true },
  flip:                { vibrate: null, sound: 'flip', parallax: null, beat: true },
  discard:             { vibrate: null, sound: ['discard', 'discard-2'], parallax: null, beat: true },
  pick:                { vibrate: [8], sound: null, parallax: null, noGap: true },
  skip:                { vibrate: [20], sound: null, parallax: null },
  /* Layers: one part each (docs/ui/feedback.md, Layering). */
  layerDecider:        { vibrate: null, sound: null, parallax: 'pulse' },
  /* Moments of interest */
  finalWave:           { vibrate: [60, 40, 60, 40, 60, 40, 60, 40, 200], sound: 'final-wave', fallback: 'wave-cleared', parallax: 'celebrate', special: true, ordinary: 'waveCleared' },
  comeback:            { vibrate: [80, 40, 80, 40, 160], sound: 'comeback', fallback: 'game-win', parallax: 'celebrate', special: true, ordinary: 'gameWin',
                         amount: (m) => Math.min(1, (m.deficit || 4) / 6) },
  suddenDeathYou:      { vibrate: [40, 30, 40, 30, 40, 30, 200], sound: 'sudden-death-you', fallback: 'game-win', parallax: 'celebrate', special: true, ordinary: 'gameWin' },
  suddenDeathBot:      { vibrate: [200], sound: 'sudden-death-bot', fallback: 'game-loss', parallax: null, special: true, ordinary: 'gameLoss' },
  matchPointYou:       { vibrate: [100, 60, 100], sound: 'match-point-you', fallback: 'king-you', parallax: 'lift', special: true, ordinary: 'kingYou' },
  matchPointBot:       { vibrate: null, sound: 'match-point-bot', fallback: 'king-bot', parallax: null, special: true, ordinary: 'kingBot' },
  showdownSweep:       { vibrate: [60, 40, 60, 40, 60], sound: 'showdown-sweep', fallback: 'showdown-win', parallax: null, special: true, ordinary: 'showdownWin' },
  knockedBack:         { vibrate: null, sound: 'knocked-back', fallback: 'showdown-loss', parallax: null, special: true, ordinary: 'showdownLoss' },
  revenge:             { vibrate: [60, 40, 100], sound: 'revenge', fallback: 'showdown-win', parallax: null, special: true, ordinary: 'showdownWin' },
  denial:              { vibrate: [50, 30, 50, 30, 90], sound: 'denial', fallback: 'hand-win', parallax: null, special: true, ordinary: 'handWin' },
  stealYou:            { vibrate: [50, 30, 50, 30, 50, 30, 120], sound: 'steal-you', fallback: 'hand-win', parallax: 'lift', special: true, ordinary: 'handWin' },
  stealBot:            { vibrate: null, sound: 'steal-bot', fallback: 'hand-loss', parallax: null, special: true, ordinary: 'handLoss' },
  perfectHand:         { vibrate: [50, 30, 50, 30, 50, 30, 50], sound: 'perfect-hand', fallback: 'hand-win', parallax: null, special: true, ordinary: 'handWin' },
  leadYou:             { vibrate: [35, 40, 70], sound: 'lead-you', fallback: 'king-you', parallax: null, special: true, ordinary: 'kingYou',
                         scale: (m, c) => 1 + 0.25 * Math.max(0, lead(m, c)) },
  leadBot:             { vibrate: null, sound: 'lead-bot', fallback: 'king-bot', parallax: null, special: true, ordinary: 'kingBot' },
  decider:             { vibrate: [20, 30, 20], sound: 'decider', fallback: 'trick-you', parallax: null, special: true, ordinary: 'trickYou' },
  kingKilled:          { vibrate: [90], sound: 'king-killed', fallback: 'trick-bot', parallax: null, special: true, ordinary: 'trickBot' },
  firstKing:           { vibrate: [35, 60, 35, 60, 35], sound: 'first-king', fallback: 'king-you', parallax: null, special: true, ordinary: 'kingYou' },
  streak:              { vibrate: [30, 30, 30], sound: 'streak', fallback: 'trick-you', parallax: null, special: true, ordinary: 'trickYou',
                         count: { 7: { vibrate: [30, 25, 30, 25, 30] } }, rate: (m) => 1 + 0.02 * ((m.count || 4) - 4) },
};

/* ---- Derived events and the module's memory (docs/ui/feedback.md, Derived events) ---- */
/** A fresh memory: nothing seen this game. @returns {any} */
function newMemory() {
  return { count: 0, complete: false, you: -1, scores: null, reached: [false, false, false], maxDeficit: 0, kingsYou: 0,
    streak: 0, trickCards: [], lastSdWinner: -1, hand: 0, novelty: {} };
}
/**
 * Adds a batch to the memory and returns the derived events it completes (types derived:…). Deterministic: the same
 * batches from a fresh memory give the same events. Only moments are remembered, so nothing hidden can leak.
 * @param {any} mem from newMemory() @param {{ moments?: any[] }} batch @returns {any[]}
 */
function derive(mem, batch) {
  const out = [];
  const moments = Array.isArray(batch && batch.moments) ? batch.moments.filter((m) => m && typeof m.type === 'string') : [];
  for (const m of moments) {
    if (m.type.startsWith('derived:')) continue;   // a derived event never spawns another
    if (m.type === 'deal') {
      if (typeof m.bottom === 'number') mem.you = m.bottom;
      /* The memory holds the whole game only when it began at the first deal. */
      if (mem.count === 0 && m.handNumber === 1 && !m.showdown) mem.complete = true;
      if (!m.showdown && typeof m.handNumber === 'number') mem.hand = m.handNumber;
      mem.trickCards = [];
    }
    if (typeof m.seat === 'number' && m.you === true) mem.you = m.seat;
    if (m.type === 'cardPlayed' && m.you) mem.trickCards.push(m.card);
    if (m.type === 'trickWon') {
      /* Your King of trump, beaten: a King loses a trick most hands, the King of trump seldom. */
      const trumpKing = mem.trickCards.find((c) => isKing(c) && typeof m.trump === 'string' && c.slice(1) === m.trump);
      if (!m.you && trumpKing) out.push({ type: 'derived:kingKilled', card: trumpKing });
      mem.trickCards = [];
      if (m.you) {
        mem.streak++;
        if (mem.streak >= STREAK_MIN && (mem.streak - STREAK_MIN) % 3 === 0) out.push({ type: 'derived:trickStreak', count: mem.streak });
      } else mem.streak = 0;
      /* Trick 7 decides between a clear win and a Showdown when the counts before it allow a 3-3-1 split. */
      if (!m.showdown && m.trickNumber === m.totalTricks && Array.isArray(m.tricksWon)) {
        const before = m.tricksWon.slice(); before[m.seat]--;
        const key = before.slice().sort((a, b) => b - a).join('-');
        /* 3-3-0: the trick decides between a clear 4-3 win and a 3-3-1 Showdown. (3-2-1 is too common to be special.) */
        if (key === '3-3-0' && before[mem.you] === 3) out.push({ type: 'derived:decider', you: !!m.you });
      }
    }
    if (m.type === 'king' && m.you) {
      if (mem.complete && mem.kingsYou === 0) out.push({ type: 'derived:firstKing' });
      mem.kingsYou++;
    }
    if (m.type === 'showdownScored') {
      if (m.you && mem.lastSdWinner === m.loser) out.push({ type: 'derived:revenge' });
      mem.lastSdWinner = m.winner;
    }
    const after = m.scoresAfter || (m.type === 'gameEnded' ? m.scores : null);
    if (Array.isArray(after)) {
      mem.scores = after.slice();
      after.forEach((x, seat) => {
        if (x >= MATCH && x < MATCH + 1 && !mem.reached[seat] && m.type !== 'gameEnded') {
          mem.reached[seat] = true;
          out.push({ type: 'derived:matchPoint', seat, you: seat === mem.you });
        }
      });
      if (mem.you >= 0) {
        const others = after.filter((_, s) => s !== mem.you);
        mem.maxDeficit = Math.max(mem.maxDeficit, Math.max(...others) - after[mem.you]);
      }
    }
    if (m.type === 'gameEnded' && m.you && mem.complete && mem.maxDeficit >= COMEBACK_POINTS) out.push({ type: 'derived:comeback', deficit: mem.maxDeficit });
    mem.count++;
  }
  return out;
}

/**
 * The main cue for a batch: the first rule, in rank order, that any of its moments (and derived events) matches.
 * Unknown types and fields are ignored. Pure.
 * @param {{ moments?: any[] }} batch @param {{ you?: number }} [ctx]
 * @returns {{ name: string, rank: number, cue: Cue } | null}
 */
function cueFor(batch, ctx) {
  const moments = Array.isArray(batch && batch.moments) ? batch.moments.filter((m) => m && typeof m.type === 'string') : [];
  const c = { you: ctx && typeof ctx.you === 'number' ? ctx.you : -1 };
  for (const rule of RULES) {
    if (moments.some((m) => { try { return rule.when(m, c); } catch (e) { return false; } })) {
      return { name: rule.cue, rank: rule.rank, cue: CUES[rule.cue] };
    }
  }
  return null;
}

/* ---- Variety (docs/ui/feedback.md, Variety): stakes, variants, escalation, novelty, layering, parameters ---- */
const STAKES_CLOSE = 7;
const STAKES_MATCH = 9;
const NOVELTY_HANDS = 3;
const VIBRATE_MAX_MS = 300;
const VIBRATE_TOTAL_MS = 1500;
const RANGE = { gain: [0, 1], rate: [0.9, 1.1], scale: [0.5, 2], amount: [0, 1] };

/**
 * The stakes of a batch, from public scores only: 0 Calm, 1 Close (a seat at 7 or 8), 2 Match point (a seat at 9),
 * 3 Decider (a seat at 9, and the batch holds a scoring moment that can end the game). Pure.
 * @param {number[] | null} scores the scores before the batch @param {{ moments?: any[] }} batch
 */
function stakesOf(scores, batch) {
  if (!Array.isArray(scores)) return 0;
  const top = Math.max(...scores);
  const scoring = (batch.moments || []).some((m) => m && ['king', 'handScored', 'showdownScored'].includes(m.type));
  if (top >= STAKES_MATCH) return scoring ? 3 : 2;
  return top >= STAKES_CLOSE ? 1 : 0;
}
/** A 32-bit FNV-1a hash of text: the variant pick. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** One of a list, picked by a hash of the cue, the state version and the moment's facts: the same game, the same pick. */
function pick(list, key) { return Array.isArray(list) && list.length ? list[hash(key) % list.length] : list; }
const isPattern = (v) => Array.isArray(v) && v.every((x) => typeof x === 'number');
/** A number in [-1, 1] from a key: the same key, the same number, so a replay sounds the same. */
const unit = (key) => (hash(key) / 0xffffffff) * 2 - 1;
/**
 * A card beat's context (docs/ui/feedback.md, Context): its gain in dB (clamped to CONTEXT_MAX_DB), a pitch offset
 * and a brightness in dB. Zero for any other beat, or a card beat without the facts. Pure.
 * @param {any} b @returns {{ db: number, rate: number, shelf: number }}
 */
function contextOf(b) {
  const out = { db: 0, rate: 0, shelf: 0 };
  if (!b || b.beat !== 'card') return out;
  for (const c of CONTEXT) { let on = false; try { on = !!c.when(b); } catch (e) { on = false; } if (on) { out.db += c.db; out.rate += c.rate; out.shelf += c.shelf; } }
  out.db = Math.max(-CONTEXT_MAX_DB, Math.min(CONTEXT_MAX_DB, out.db));
  return out;
}
const clamp = (x, [lo, hi]) => Math.max(lo, Math.min(hi, x));
/** A parameter's value: a number, or a function of the moment; clamped; its default when it fails. */
function param(p, m, c, name, dflt) {
  let v = p;
  if (typeof p === 'function') { try { v = p(m, c); } catch (e) { v = dflt; } }
  return typeof v === 'number' && Number.isFinite(v) ? clamp(v, RANGE[name]) : dflt;
}
/** The highest entry at or below a level, for escalation. @param {Record<number, any> | undefined} table */
/* The sound of each beat (docs/ui/feedback.md, Beat list): a name or a list of variants, picked by the beat's key.
   A beat this table doesn't name plays nothing. */
/** @type {Record<string, (b: any) => (string | string[] | { sound: string | string[], gain: number })>} */
const BEAT_SOUNDS = {
  deal: (b) => (b.showdown ? 'deal-snap' : b.you ? ['deal-hand', 'deal-hand-2', 'deal-hand-3', 'deal-hand-4'] : ['deal', 'deal-2', 'deal-3', 'deal-4']),
  kitty: () => 'kitty-set',
  turnUp: () => 'flip',
  tuck: () => 'tuck',
  toss: () => 'toss',
  sink: () => 'sink',
  discard: () => ['discard', 'discard-2'],
  pileSink: () => 'pile-sink',
  card: (b) => (b.you ? ['card-play', 'card-play-2', 'card-play-3', 'card-play-4', 'card-play-5', 'card-play-6', 'card-play-7', 'card-play-8']
    : ['card-slide-in', 'card-slide-in-2', 'card-slide-in-3', 'card-slide-in-4']),
  sweep: (b) => (b.you ? ['trick-you', 'trick-you-2', 'trick-you-3', 'trick-you-4'] : ['trick-bot', 'trick-bot-2', 'trick-bot-3', 'trick-bot-4']),
  collect: () => 'collect',
  handClose: () => ({ sound: 'hand-close', gain: 0.5 }),
};
/* Beat ticks: the beats you feel (docs/ui/feedback.md, Beat ticks). A tick is a very short pulse at the beat's own time:
   your card landing in its slot, and each packet dealt to your hand (in a Showdown deal, its first card only). */
/** @type {Record<string, (b: any) => (number[] | null)>} */
const BEAT_TICKS = {
  card: (b) => (b.you ? [12] : null),
  deal: (b) => (!b.you ? null : !b.showdown ? [10] : /\|0$/.test(String(b.key)) ? [10] : null),
};
/** A beat's tick, or null. Pure. @param {any} b @returns {number[] | null} */
function beatTick(b) {
  const f = b && typeof b.beat === 'string' && Object.prototype.hasOwnProperty.call(BEAT_TICKS, b.beat) ? BEAT_TICKS[b.beat] : null;
  if (!f) return null;
  try { const t = f(b); return isPattern(t) && t.length ? t : null; } catch (e) { return null; }
}

/* The usual card count of a gesture (cards that move together): its sound is designed for that many, and a beat
   with more or fewer is a little louder or softer (docs/ui/feedback.md, Card count). */
/** @type {Record<string, number>} */
const GESTURE_CARDS = { sweep: 3, collect: 21, pileSink: 9, discard: 3, handClose: 7, kitty: 3 };
/* The beats whose sound is one card's: with a spread, each card gets its own hit. The others are gestures. */
const TRAIN_BEATS = new Set(['deal', 'discard', 'toss', 'sink']);
/**
 * A beat's sound, for its card count (docs/ui/feedback.md, Card count). Pure.
 * - A train (cards that land one after another, `spread` ms apart): one hit per card, up to TRAIN_MAX, each a
 *   variant in turn from the one the key picks, each later one TRAIN_FALL softer.
 * - A gesture (cards that move together, no spread): one sound, its gain set by the count against GESTURE_CARDS.
 * @param {any} b @param {(name: string) => boolean} [has]
 * @returns {{ sound: string, gain: number, pan: number, rate?: number, hits: { sound: string, offset: number, gain: number, rate: number, tone: number }[] } | null}
 */
function beatSound(b, has) {
  const f = b && typeof b.beat === 'string' && Object.prototype.hasOwnProperty.call(BEAT_SOUNDS, b.beat) ? BEAT_SOUNDS[b.beat] : null;
  if (!f) return null;
  let r; try { r = f(b); } catch (e) { return null; }
  const spec = typeof r === 'object' && !Array.isArray(r) ? r : { sound: r, gain: 1 };
  const all = [].concat(spec.sound || []), ready = all.filter((n) => !has || has(n));
  const list = ready.length ? ready : all;
  if (!list.length) return null;
  const first = pick(list, String(b.key)), at0 = list.indexOf(first);
  const n = Number.isFinite(b.cards) ? Math.max(1, Math.min(TRAIN_MAX, Math.round(b.cards))) : 1;
  const spread = Number.isFinite(b.spread) && b.spread > 0 ? Math.min(400, b.spread) : 0;
  if (spread && n > 1 && TRAIN_BEATS.has(b.beat)) {
    /* The hits come from the train's variants, count and spread alone, so its mix is made once (warmTrains); the beat's
       key varies the whole sound, its pitch and level, on the audio thread. */
    const k = String(b.key) + '|0';
    return { sound: first, gain: spec.gain * placeGain(b) * dbToGain(JITTER_DB * unit(k + 'g')), pan: panOf(b), rate: 1 + JITTER_RATE * unit(k + 'r'),
      hits: trainHits(list, at0, n, spread) };
  }
  const usual = GESTURE_CARDS[b.beat];
  const count = Number.isFinite(b.cards) ? b.cards : usual || 1;
  const size = usual ? Math.max(0.8, Math.min(1.2, 1 + GESTURE_STEP * (count - usual) / Math.max(1, usual / 3))) : 1;
  const k = String(b.key) + '|0', cx = contextOf(b);
  return { sound: first, gain: spec.gain * size * placeGain(b) * dbToGain(JITTER_DB * unit(k + 'g') + cx.db), pan: panOf(b),
    hits: [{ sound: first, offset: 0, gain: 1, rate: (1 + JITTER_RATE * unit(k + 'r')) * (1 + cx.rate), tone: TONE_JITTER_DB * unit(k + 't') + cx.shelf }] };
}
/**
 * A train's hits: card i plays variant at0 + i, i × spread ms after the first, each TRAIN_FALL as loud as the one
 * before, with a small variation of its own (from its variant and place, never the beat's key). Pure.
 * @param {string[]} list @param {number} at0 @param {number} n @param {number} spread
 */
function trainHits(list, at0, n, spread) {
  const hits = [];
  for (let i = 0; i < n; i++) {
    const sound = list[(at0 + i) % list.length], k = list[at0] + '|' + i;
    hits.push({ sound, offset: i * spread, gain: Math.pow(TRAIN_FALL, i) * dbToGain(JITTER_DB * unit(k + 'g')), rate: 1 + JITTER_RATE * unit(k + 'r'),
      tone: TONE_JITTER_DB * unit(k + 't') });
  }
  return hits;
}
/** A beat's distance: a bot's motion is DISTANCE_DB behind yours; one with no seat (the pile) sits between. */
function placeGain(b) { return b && b.you === false && typeof b.seat === 'number' ? dbToGain(DISTANCE_DB) : 1; }
/** A beat's pan, by its place on the table (0 the bottom, 1 left, 2 right); the middle when it has none. */
function panOf(b) { return b && Object.prototype.hasOwnProperty.call(PAN, b.place) ? PAN[b.place] : 0; }

function entryAt(table, level) {
  if (!table) return null;
  const keys = Object.keys(table).map(Number).filter((k) => k <= level).sort((a, b) => b - a);
  return keys.length ? table[keys[0]] : null;
}

/**
 * The parts to play for a batch's main cue (and its layer), after escalation, novelty, variants and parameters.
 * Pure apart from the memory's novelty record, which it updates when a special cue is used.
 * @param {{ name: string, cue: Cue }} found @param {any} batch @param {any} mem @param {number} stakes
 * @param {(name: string) => boolean} [has] whether a sound is ready, so a missing variant is skipped
 */
function compose(found, batch, mem, stakes, has) {
  let name = found.name, cue = found.cue;
  const moments = (batch.moments || []).filter((m) => m && typeof m.type === 'string');
  const c = { you: mem.you, stakes };
  /* Novelty: a special cue that played in the last NOVELTY_HANDS hands gives way to its ordinary cue. */
  const hand = mem.hand || 0;
  if (cue.special && cue.ordinary && mem.novelty && typeof mem.novelty[name] === 'number' && hand - mem.novelty[name] < NOVELTY_HANDS) {
    name = cue.ordinary; cue = CUES[name];
  } else if (cue.special && mem.novelty) mem.novelty[name] = hand;
  const m = moments.find((x) => RULES.some((r) => r.cue === name && (() => { try { return r.when(x, c); } catch (e) { return false; } })())) || moments[0] || {};
  /* Escalation: stakes, then a derived event's count. Each entry replaces only the parts it names. */
  const derivedCount = moments.reduce((n, x) => (typeof x.count === 'number' ? x.count : n), 0);
  const up = Object.assign({}, entryAt(cue.stakes, stakes) || {}, entryAt(cue.count, derivedCount) || {});
  const part = (k) => (k in up ? up[k] : cue[k]);
  const key = name + '|' + batch.version + '|' + JSON.stringify(m);
  /* A batch timed to a beat: the beats play the table's sound, so a cue marked beat leaves it out. */
  const beatOwned = !!batch.beat && !!cue.beat;
  const sounds = beatOwned ? [] : [].concat(part('sound') || []).filter((n) => !has || has(n));
  const vib = part('vibrate');
  let pattern = isPattern(vib) ? vib : pick(vib, key + '|v');
  const scale = param(cue.scale, m, c, 'scale', 1);
  if (isPattern(pattern)) {
    let total = 0;
    pattern = pattern.map((x) => Math.min(VIBRATE_MAX_MS, Math.round(x * scale))).filter((x) => (total += x) <= VIBRATE_TOTAL_MS);
  }
  const out = {
    name, special: !!cue.special,
    vibrate: isPattern(pattern) && pattern.length ? pattern : null,
    sound: beatOwned ? null : sounds.length ? pick(sounds, key + '|s') : (cue.sound ? [].concat(cue.sound)[0] : null),
    fallback: cue.fallback || null,
    parallax: part('parallax') ? pick(part('parallax'), key + '|p') : null,
    gain: param(cue.gain, m, c, 'gain', 1), rate: param(cue.rate, m, c, 'rate', 1), amount: param(cue.amount, m, c, 'amount', 1),
    noGap: !!cue.noGap, layer: null,
  };
  /* Layering: the first layer rule that matches adds its one part on a channel the main cue leaves empty. */
  for (const rule of LAYERS) {
    if (!moments.some((x) => { try { return rule.when(x, c); } catch (e) { return false; } })) continue;
    const L = CUES[rule.cue];
    for (const ch of ['vibrate', 'sound', 'parallax']) if (L[ch] && !out[ch]) { out.layer = rule.cue; out[ch] = ch === 'vibrate' ? L[ch] : pick(L[ch], key + '|l'); break; }
    break;
  }
  return out;
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
     * A part still ahead (at > now) is judged at its own time: the gap is between play times, in either order.
     * @param {{ at: number, now: number, rank: number, noGap?: boolean, stale?: boolean, ready?: boolean, voices?: number }} p
     * @returns {'play' | 'replace' | 'stale' | 'notReady' | 'late' | 'far' | 'tooSoon' | 'voices'}
     */
    decide(p) {
      if (p.stale) return 'stale';
      if (p.ready === false) return 'notReady';
      if (p.now - p.at > LATE_MS) return 'late';
      if (p.at - p.now > MAX_AHEAD_MS) return 'far';
      const t = Math.max(p.at, p.now);
      let verdict = /** @type {'play' | 'replace'} */ ('play');
      if (!p.noGap && Math.abs(t - lastAt) < gapMs) {
        if (p.rank < lastRank) verdict = 'replace';
        else return 'tooSoon';
      }
      if (verdict === 'play' && p.voices !== undefined && p.voices >= MAX_VOICES) return 'voices';
      if (!p.noGap) { lastAt = t; lastRank = p.rank; }
      return verdict;
    },
    reset() { lastAt = -Infinity; lastRank = Infinity; },
  };
}

/* ---- Device settings (docs/ui/feedback-contract.md, Device keys) ---- */
const KEYS = { vibration: 'kct.feedback.vibration', sound: 'kct.feedback.sound', replaySound: 'kct.feedback.replaySound' };
/* Values are JSON, like every kct. key: a backup checks that each value parses, and refuses the whole backup otherwise. */
const read = (k) => { try { const t = localStorage.getItem(k); return t === null ? null : JSON.parse(t); } catch (e) { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* not kept */ } };
const settings = {
  get vibration() { return read(KEYS.vibration) === true; },
  set vibration(on) { write(KEYS.vibration, on ? true : null); },
  /** @returns {string} 'off' or a level of LEVEL_DB ('max' to 'min'); a stored 'full' or 'half' reads as 'max' or 'med' */
  get sound() { return levelOf(read(KEYS.sound)); },
  set sound(level) { const l = levelOf(level); write(KEYS.sound, l === 'off' ? null : l); },
  get replaySound() { return read(KEYS.replaySound) === true; },
  set replaySound(on) { write(KEYS.replaySound, on ? true : null); },
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
/** A cue's sound after every fallback: its own preset, then the ordinary cue's (docs/ui/feedback.md, Fallbacks). */
function soundFor(cue) { return bufferFor(cue.sound) || (cue.fallback ? bufferFor(cue.fallback) : null); }
/* The sounds of a deal (its packets and the kitty) render first: a game's first deal can come a second after the
   page opens, and every other sound has a hand's time to follow. Once they are ready, the game hears it
   (kct:feedback-sounds), so it can stop holding a first deal (docs/ui/feedback-contract.md, Sounds ready). */
const FIRST = /^(deal|kitty)/;
let dealReady = false;
function dealSoundsReady() {
  if (dealReady) return;
  dealReady = true;
  document.dispatchEvent(new CustomEvent('kct:feedback-sounds', { detail: { v: V, ready: 'deal' } }));
}
function renderPalette(felt, showdown) {
  renderQueue = renderQueue.then(async () => {
    if (!(await loadLibs())) return;
    const P = /** @type {any} */ (window).KCTPalettes, S = /** @type {any} */ (window).KCTSynth;
    const all = P.required.concat(P.optional || [], P.beats || []);
    const names = all.filter((n) => FIRST.test(n)).concat(all.filter((n) => !FIRST.test(n)));
    let first = names.findIndex((n) => !FIRST.test(n));
    for (const name of names) {
      /* The deal's combination sounds too, before the rest: a first deal then mixes nothing. */
      if (first === 0 && felt === 'classic' && !showdown) { await warmTrains('deal'); dealSoundsReady(); }
      first--;
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
        dropTrains(name);   // a train may have mixed a fallback that this render replaces
      } catch (e) {
        buffers.set(key, null);
        logOnce('RENDER_FAILED', key, { name, palette: felt, error: String(e && e.message || e) });
      }
    }
    if (felt === 'classic' && !showdown) dealSoundsReady();
    await warmTrains();
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

/* ---- Card trains: one hit per card, mixed into one buffer (one voice), kept by palette, sounds and spread ---- */
/** @type {Map<string, any>} */
const trains = new Map();
/** The buffer for a beat's hits: the single buffer for one hit, else the mix. Null when a hit's sound isn't ready. */
function trainBuffer(hits) {
  if (hits.length === 1) return bufferFor(hits[0].sound);
  const key = state.felt + (state.showdown ? '/sd' : '') + '|' + hits.map((h) => h.sound + '@' + h.offset + '*' + h.gain.toFixed(3) + '^' + (h.rate || 1).toFixed(4) + '~' + (h.tone || 0).toFixed(2)).join(',');
  if (trains.has(key)) return trains.get(key);
  const parts = hits.map((h) => ({ h, b: bufferFor(h.sound) }));
  if (parts.some((x) => !x.b)) return null;
  const rate = parts[0].b.sampleRate;
  /* Each hit at its own pitch (rate): read with linear interpolation, so it is a little shorter or longer. */
  const lenOf = (x) => Math.floor((x.b.length - 1) / (x.h.rate || 1));
  const len = Math.max(...parts.map((x) => Math.round(x.h.offset / 1000 * rate) + lenOf(x) + 1));
  const mix = new Float32Array(len);
  /* Each hit's tone: a one-pole high shelf at SHELF_HZ (the part above it scaled by the tone's gain), as the voice's
     filter would do for a single hit. */
  const a = Math.exp(-2 * Math.PI * SHELF_HZ / rate);
  for (const x of parts) {
    const { h, b } = x, d = b.getChannelData(0), o = Math.round(h.offset / 1000 * rate), r = h.rate || 1, n = lenOf(x);
    const k = dbToGain(h.tone || 0) - 1;
    let lp = 0;
    for (let i = 0; i <= n; i++) {
      const p = i * r, j = Math.floor(p), f = p - j, v = d[j] + ((d[j + 1] || 0) - d[j]) * f;
      lp = (1 - a) * v + a * lp;
      mix[o + i] += (v + k * (v - lp)) * h.gain;
    }
  }
  /* Overlapping hits can add up past the ceiling: bring the peak back under it. */
  let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(mix[i]));
  if (peak > 0.89) for (let i = 0; i < len; i++) mix[i] *= 0.89 / peak;
  const out = toBuffer({ samples: mix, sampleRate: rate });
  if (trains.size > TRAIN_CACHE) { trains.clear(); trainWarm = new WeakSet(); }
  trains.set(key, out);
  return out;
}
/* Combination sounds: the trains a hand plays, mixed ahead at idle, one in each idle slot, once the sounds they use are
   rendered, so a deal's packets each play one ready sound, as a single card does, and nothing is mixed at the deal
   (docs/ui/feedback.md, Card count). A train not here is mixed when it plays, as before. The spreads are the
   table's: a deal packet's PACKET_CARD × the motion step at Fast, Normal and Slow; discards 70 ms; tossed and sunk
   cards 80 ms. */
const TRAIN_CACHE = 160;
const TRAIN_WARM = [
  { beat: 'deal', you: true, cards: [3, 4], spread: [12.5, 19.8, 30.8] },
  { beat: 'deal', you: false, cards: [3, 4], spread: [12.5, 19.8, 30.8] },
  { beat: 'discard', you: true, cards: [2, 3], spread: [70] },
  { beat: 'toss', you: true, cards: [2, 3], spread: [80] },
  { beat: 'sink', you: true, cards: [2, 3], spread: [80] },
];
let trainWarm = new WeakSet();
/** Forgets the mixes that use a sound (by name, in any palette). @param {string} name */
function dropTrains(name) {
  for (const key of [...trains.keys()]) if (key.slice(key.indexOf('|') + 1).split(',').some((h) => h.slice(0, h.indexOf('@')) === name)) trains.delete(key);
}
const trainUse = { warm: 0, mixed: 0 };
/** @param {string} [only] one beat's trains, such as 'deal' */
async function warmTrains(only) {
  if (settings.sound === 'off') return;
  for (const w of TRAIN_WARM) {
    if (only && w.beat !== only) continue;
    let all; try { all = [].concat(BEAT_SOUNDS[w.beat]({ beat: w.beat, you: w.you }) || []); } catch (e) { continue; }
    const list = all.filter((n) => !!bufferFor(n));
    if (!list.length) continue;
    for (let at0 = 0; at0 < list.length; at0++) for (const n of w.cards) for (const spread of w.spread) {
      /* A mix takes a few ms: one a task, so the page's frames go on between them. */
      await new Promise((r) => setTimeout(r, 0));
      const b = trainBuffer(trainHits(list, at0, n, spread));
      if (b) trainWarm.add(b);
    }
  }
}

/* ---- The sound channel ---- */
/** @type {any} */
let audio = null;
/** Sounds started or scheduled, with their audio-clock start and end. @type {{ src: any, start: number, end: number }[]} */
const voices = [];
/** The last moment sound, which a higher-ranked one may replace (never a beat's). @type {any} */
let lastMoment = null;
/** Timers for vibration and parallax parts still ahead. @type {Set<number>} */
const timers = new Set();
/** The audio-clock time for a performance.now() time, less the device's output delay; never before now. */
function audioTime(ctx, at) {
  const ahead = typeof at === 'number' ? Math.max(0, (at - performance.now()) / 1000) : 0;
  const lat = typeof ctx.outputLatency === 'number' && ctx.outputLatency > 0 ? ctx.outputLatency : 0;
  return Math.max(ctx.currentTime, ctx.currentTime + ahead - lat);
}
/** How many sounds play at a performance.now() time: started or scheduled, and not ended by then. */
function voicesAt(at) {
  const ctx = audio;
  if (!ctx) return 0;
  const t = audioTime(ctx, at);
  return voices.filter((v) => v.start <= t + 0.001 && v.end > t).length;
}
/** Runs fn at a performance.now() time: now when it is due. */
function later(at, fn) {
  const wait = typeof at === 'number' ? at - performance.now() : 0;
  if (wait <= 4) { fn(); return; }
  const id = setTimeout(() => { timers.delete(id); fn(); }, wait);
  timers.add(id);
}
/** Stops every sound not yet started and every timer still ahead. */
function stopScheduled() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
  const ctx = audio, now = ctx ? ctx.currentTime : Infinity;
  for (const v of voices.slice()) if (v.start > now + 0.001) { try { v.src.stop(); } catch (e) { /* not started */ } const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); }
}
/** The master bus: every sound goes through the tone filters, the level and a soft limiter. @type {any} */
let bus = null;
/** Builds the bus once: tone (high shelf, low-pass), level (the Sound setting), limiter. A node the browser lacks is left out. */
function buildBus(ctx) {
  const chain = [];
  try { if (ctx.createBiquadFilter) { const f = ctx.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = SHELF_HZ; f.gain.value = SHELF_DB; chain.push(f); } } catch (e) { /* no tone */ }
  try { if (ctx.createBiquadFilter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = LOWPASS_HZ; f.Q.value = 0.5; chain.push(f); } } catch (e) { /* no tone */ }
  const level = ctx.createGain();
  level.gain.value = levelGain();
  chain.push(level);
  /* Soft limiter: stacked sounds (a train over a King point) never clip, which is what grit is. */
  try {
    if (ctx.createDynamicsCompressor) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = -12; c.knee.value = 12; c.ratio.value = 4; c.attack.value = 0.003; c.release.value = 0.15;
      chain.push(c);
    }
  } catch (e) { /* no limiter */ }
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
  chain[chain.length - 1].connect(ctx.destination);
  return { input: chain[0], level };
}
const levelGain = () => { const l = settings.sound; return l === 'off' ? 0 : dbToGain(LEVEL_DB[l]); };
/** Glides the bus to the current level: a Settings change reaches the sounds already playing. */
function setLevel() {
  if (!audio || !bus) return;
  const g = bus.level.gain, v = levelGain();
  try { if (typeof g.setTargetAtTime === 'function') g.setTargetAtTime(v, audio.currentTime, LEVEL_GLIDE_S); else g.value = v; } catch (e) { g.value = v; }
}
function ensureAudio() {
  if (!canSound || settings.sound === 'off') return null;
  try {
    if (!audio) { audio = new AudioCtor(); if (typeof audio.addEventListener === 'function') audio.addEventListener('error', onAudioError); }
    if (!bus) bus = buildBus(audio);
    if (audio.state === 'suspended' && typeof audio.resume === 'function') audio.resume();
  } catch (e) { audio = null; bus = null; }
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
/**
 * Plays a sound at a performance.now() time (now when at is missing or past), on the audio clock.
 * @param {any} buffer @param {boolean} replace stop the last moment sound first @param {number} [gainParam]
 * @param {number} [rate] @param {number} [at] @param {boolean} [isBeat] a beat's sound, never replaced
 */
function playSound(buffer, replace, gainParam = 1, rate = 1, at, isBeat = false, pan = 0, tone = 0) {
  const ctx = ensureAudio();
  if (!ctx) return false;
  if (replace && lastMoment) { try { lastMoment.stop(); } catch (e) { /* already ended */ } }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  if (src.playbackRate) src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = gainParam;
  /* A single hit's tone: its own high shelf, at most MAX_VOICES at a time. */
  if (tone && typeof ctx.createBiquadFilter === 'function') {
    try { const f = ctx.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = SHELF_HZ; f.gain.value = tone; src.connect(f); f.connect(gain); } catch (e) { src.connect(gain); }
  } else src.connect(gain);
  let out = gain;
  if (pan && typeof ctx.createStereoPanner === 'function') {
    try { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(p); out = p; } catch (e) { /* centered */ }
  }
  out.connect(bus ? bus.input : ctx.destination);
  const start = audioTime(ctx, at), v = { src, start, end: start + (buffer.duration || 0) / (rate || 1) };
  voices.push(v);
  src.onended = () => { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); if (lastMoment === src) lastMoment = null; };
  if (!isBeat) lastMoment = src;
  src.start(start);
  return true;
}

/* ---- The vibration and event parallax channels ---- */
function vibrate(pattern) { try { return !!navigator.vibrate(pattern); } catch (e) { return false; } }
/** Event parallax waits for #185. A listener can set KCTFeedback.parallax to receive motion names. */
function parallax(name, amount = 1) { const f = api.parallax; if (typeof f === 'function') { try { f(name, amount); } catch (e) { /* never stops feedback */ } } }

const drop = { vibrate: makeDropper(GAP_VIBRATE_MS), sound: makeDropper(GAP_SOUND_MS), beat: makeDropper(GAP_BEAT_MS) };
/* The memory of this game's moments, for derived events. A cancel with scope 'game' starts it again. */
let memory = newMemory();

/** Plays a batch: the order of operations in docs/ui/feedback.md, step 4. Returns what each channel did. */
function play(batch) {
  const now = performance.now();
  const before = memory.scores ? memory.scores.slice() : null;
  const derived = derive(memory, batch);
  const full = derived.length ? Object.assign({}, batch, { moments: batch.moments.concat(derived) }) : batch;
  const found = cueFor(full, { you: memory.you });
  if (!found) return null;
  const stakes = stakesOf(before, full);
  const parts = compose(found, full, memory, stakes, (n) => !!bufferFor(n));
  const allowed = channelsFor(batch, {
    vibration: settings.vibration, sound: settings.sound, replaySound: settings.replaySound, canVibrate, canSound,
    activated: state.activated || !!(navigator.userActivation && navigator.userActivation.hasBeenActive),
    hidden: document.hidden, instant: state.instant,
  });
  const stale = typeof batch.version === 'number' && batch.version < state.version;
  const at = typeof batch.at === 'number' ? batch.at : now;
  const rank = found.rank;
  const result = { cue: parts.name, derived: derived.map((d) => d.type), stakes, layer: parts.layer, vibrate: 'off', sound: 'off', parallax: 'off', pattern: parts.vibrate };
  if (parts.vibrate && allowed.vibrate) {
    const v = drop.vibrate.decide({ at, now, rank, noGap: parts.noGap, stale });
    result.vibrate = v;
    if (v === 'play' || v === 'replace') { const pat = parts.vibrate; later(at, () => vibrate(pat)); }
  }
  if (parts.sound && allowed.sound) {
    const buffer = bufferFor(parts.sound) || (parts.fallback ? bufferFor(parts.fallback) : null);
    if (!buffer) logOnce('SOUND_MISSING', parts.sound + '|' + state.felt, { name: parts.sound, palette: state.felt });
    const v = drop.sound.decide({ at, now, rank, stale, ready: !!buffer, voices: voicesAt(at) });
    result.sound = v;
    if ((v === 'play' || v === 'replace') && buffer) playSound(buffer, v === 'replace', parts.gain, parts.rate, at);
  }
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (parts.parallax && !batch.replay && !state.instant && !document.hidden && !reduced && batch.v === V) {
    result.parallax = 'play';
    const name = parts.parallax, amount = parts.amount;
    later(at, () => parallax(name, amount));
  }
  return result;
}

/** Plays a beats message: each beat's sound, and its tick if it has one, at its own time (docs/ui/feedback.md,
    When beats arrive). Returns each beat's verdict, for tests. */
function playBeats(msg) {
  const now = performance.now();
  const allowed = channelsFor(msg, {
    vibration: settings.vibration, sound: settings.sound, replaySound: settings.replaySound, canVibrate, canSound,
    activated: state.activated || !!(navigator.userActivation && navigator.userActivation.hasBeenActive),
    hidden: document.hidden, instant: state.instant,
  });
  const stale = typeof msg.version === 'number' && msg.version < state.version;
  const out = [];
  const list = msg.beats.filter((b) => b && typeof b.at === 'number').slice().sort((a, b) => a.at - b.at);
  for (const b of list) {
    /* The tick: on the vibration channel's own dropper, at the lowest rank, so a moment's pattern always wins. */
    const tick = beatTick(b);
    let felt = 'none';
    if (tick && allowed.vibrate) {
      felt = drop.vibrate.decide({ at: b.at, now, rank: 99, stale });
      if (felt === 'play' || felt === 'replace') later(b.at, () => vibrate(tick));
    } else if (tick) felt = 'off';
    const bs = beatSound(b, (n) => !!bufferFor(n));
    if (!bs) { out.push({ beat: b.beat, sound: 'unknown', tick: felt }); continue; }
    if (!allowed.sound) { out.push({ beat: b.beat, sound: 'off', tick: felt }); continue; }
    const buffer = trainBuffer(bs.hits);
    if (bs.hits.length > 1) trainUse[buffer && trainWarm.has(buffer) ? 'warm' : 'mixed']++;
    /* Its sound is still rendering but its time is ahead: ask again just before it is due, once. */
    if (!buffer && !b.again && b.at - now > RETRY_AHEAD_MS) {
      /* No version: a cancel clears this timer (stopScheduled), and a newer message in the meantime must not drop it. */
      later(b.at - RETRY_AHEAD_MS, () => playBeats(Object.assign({}, msg, { version: undefined, beats: [Object.assign({}, b, { again: true })] })));
      out.push({ beat: b.beat, sound: 'again', name: bs.sound, hits: bs.hits.length, gain: bs.gain, tick: felt });
      continue;
    }
    const v = drop.beat.decide({ at: b.at, now, rank: 99, stale, ready: !!buffer, voices: voicesAt(b.at) });
    /* A single hit plays at its own pitch; a train's hits are at theirs inside the mix. */
    const one = bs.hits.length === 1, rate = one ? bs.hits[0].rate || 1 : bs.rate || 1, tone = one ? bs.hits[0].tone || 0 : 0;
    if ((v === 'play' || v === 'replace') && buffer) playSound(buffer, false, BEAT_GAIN * bs.gain, rate, b.at, true, bs.pan, tone);
    out.push({ beat: b.beat, sound: v, name: bs.sound, hits: bs.hits.length, gain: bs.gain, tick: felt });
  }
  trace('beats', { retry: msg.version === undefined, beats: list.map((b, i) => ({ beat: b.beat, cards: b.cards, ahead: Math.round(b.at - now), sound: out[i] && out[i].sound })) });
  return out;
}

/* ---- The trace ('!dev sound'): what each message did, for a readout on the device ---- */
/** Hands a record to api.trace when a listener set it. Never stops feedback. @param {string} kind @param {any} data */
function trace(kind, data) {
  const f = api.trace;
  if (typeof f === 'function') { try { f(kind, data); } catch (e) { /* never stops feedback */ } }
}
/** The sound channel's state, for the readout. */
function status() {
  const all = [...buffers.values()];
  return {
    canSound, sound: settings.sound, activated: state.activated || !!(navigator.userActivation && navigator.userActivation.hasBeenActive),
    context: audio ? audio.state : 'none', rate: audio ? audio.sampleRate : 0,
    latency: audio && typeof audio.outputLatency === 'number' ? Math.round(audio.outputLatency * 1000) : null,
    ready: all.filter(Boolean).length, failed: all.filter((b) => b === null).length, dealReady, felt: state.felt, voices: voices.length,
    trains: trains.size, warm: trainUse.warm, mixed: trainUse.mixed, revived,
  };
}

/* ---- Control messages ---- */
/* Every cancel stops what is scheduled but not started. A new game (scope 'game') also forgets the Showdown
   voice, the last part each channel played and the newest version heard: a new game, a resume or a jump in the replay
   viewer counts its versions again from where it is, so keeping the old one would drop every message as stale until
   the new versions passed it. A step (scope 'step', such as Next hand) keeps the gaps and the version. */
function cancel(scope) {
  stopScheduled();
  if (scope !== 'game') return;
  state.version = -1;
  state.showdown = false;
  memory = newMemory();
  drop.vibrate.reset();
  drop.sound.reset();
  drop.beat.reset();
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
  if (Array.isArray(d.beats)) { playBeats(d); return; }
  const moments = Array.isArray(d.moments) ? d.moments : [];
  const r = play(d);
  if (api.trace) trace('moment', { anchor: d.anchor, beat: !!d.beat, types: moments.map((m) => m && m.type), ahead: typeof d.at === 'number' ? Math.round(d.at - performance.now()) : 0,
    cue: r ? r.cue : null, sound: r ? r.sound : 'none' });
  /* Fall's Showdown voice: from the Showdown call to the Showdown result (after the result's own cue). */
  if (moments.some((m) => m && m.type === 'showdownCalled')) state.showdown = true;
  if (moments.some((m) => m && (m.type === 'showdownScored' || m.type === 'gameEnded'))) state.showdown = false;
}

/* ---- Settings rows (docs/ui/feedback-contract.md, The markup the module may use) ---- */
const ROWS_HTML =
  (canVibrate ? '<label class="set-row"><span class="set-text"><span class="set-name">Vibration</span><span class="set-desc">Short vibrations when you play a card, are dealt cards, pick a card, win a trick or a King point, and at the end of a game.</span></span><input class="sw" type="checkbox" id="setFbVibration"></label>' : '') +
  '<div class="set-row"><span class="set-text"><label class="set-name" for="setFbSound">Sound</label><span class="set-desc">Short sounds for cards, tricks and results, from Max down to Min.</span></span>' +
  '<select id="setFbSound">' + Object.keys(LEVEL_DB).map((k) => '<option value="' + k + '">' + LEVEL_NAMES[k] + '</option>').join('') + '<option value="off">Off</option></select></div>' +
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
    else { ensureAudio(); setLevel(); if (was === 'off') renderCurrent(); }
  });
  if (r) r.addEventListener('change', () => { settings.replaySound = /** @type {HTMLInputElement} */ (r).checked; });
  syncRows();
}

/* ---- Keeping the sound alive ----
   A browser stops the audio context when the page hides, the phone locks, or a call, an alarm or another app takes
   the audio (Safari calls that 'interrupted'), and it starts it again only from a tap. So every tap looks at it, at
   the cost of one check: a stopped context resumes, inside the tap. One that is still stopped at the next tap, or
   that says 'running' while its clock stands still (a phone can leave it so after an interruption), is replaced by a
   new one, made inside that tap. Sounds are buffers that belong to no context, so nothing renders again.
   Without this, the sound stopped for good until the app was closed. */
const REVIVE_GAP_MS = 500;   // a context still stopped this long after a tap's resume is replaced at the next tap
let revived = 0, resumeAt = 0, clockSeen = { t: -1, at: 0 }, failed = false;
/* Chrome reports a failed output device (a Bluetooth headset gone, the audio service restarted) with an error event on
   the context, which may still say 'running': the next tap replaces it. */
const onAudioError = () => { failed = true; trace('audio', { action: 'error', why: 'device', context: audio ? audio.state : 'none' }); };
/** Closes the context and makes a new one: the voices on the old one are gone. @param {string} why */
function replaceAudio(why) {
  const old = audio;
  for (const v of voices) { try { v.src.stop(); } catch (e) { /* ended */ } }
  voices.length = 0; lastMoment = null; audio = null; bus = null;
  resumeAt = 0; clockSeen = { t: -1, at: 0 }; failed = false;
  if (old && typeof old.removeEventListener === 'function') old.removeEventListener('error', onAudioError);
  if (old && typeof old.close === 'function') { try { const p = old.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* already closed */ } }
  revived++;
  ensureAudio();
  trace('audio', { action: 'replaced', why, context: audio ? audio.state : 'none' });
}
/** Brings a stopped context back. gesture: called from a tap (the only place iOS lets it start). @param {boolean} gesture */
function revive(gesture) {
  if (!audio || settings.sound === 'off' || !canSound) return;
  const st = audio.state;
  if (st === 'closed' || failed) { if (gesture) replaceAudio(failed ? 'error' : 'closed'); return; }
  if (st !== 'running') {
    if (gesture && resumeAt && performance.now() - resumeAt > REVIVE_GAP_MS) { replaceAudio(st); return; }
    try { const p = audio.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the next tap replaces it */ }
    if (gesture && !resumeAt) resumeAt = performance.now();
    trace('audio', { action: 'resume', why: st, context: audio.state });
    return;
  }
  resumeAt = 0;
  const t = audio.currentTime, now = performance.now();
  if (t !== clockSeen.t) { clockSeen = { t, at: now }; return; }
  if (gesture && now - clockSeen.at > 1000) replaceAudio('stalled');
}
/* ---- Each tap ---- */
function onTap() {
  state.activated = true;
  if (!audio) ensureAudio(); else revive(true);
}

/* ---- Start ---- */
const api = {
  version: V,
  /** Set by event parallax (#185) to receive motion names. */
  parallax: /** @type {null | ((name: string, amount: number) => void)} */ (null),
  /** Set by the game's sound readout ('!dev sound') to receive what each message did: ('beats' | 'moment', record). */
  trace: /** @type {null | ((kind: string, data: any) => void)} */ (null),
  /** The sound channel's state: the context, the rendered sounds, the setting. Read-only. */
  status,
  /** The pure core and the module's state, for tests (tests/feedback.js). */
  core: Object.freeze({ RULES, CUES, LAYERS, cueFor, channelsFor, makeDropper, newMemory, derive, leadChange, soleLeader, stakesOf, compose, hash,
    STAKES_CLOSE, STAKES_MATCH, NOVELTY_HANDS, VIBRATE_MAX_MS, VIBRATE_TOTAL_MS,
    STREAK_MIN, COMEBACK_POINTS, LEAD_FROM, LEVEL_DB, LEVEL_ALIASES, levelOf, JITTER_DB, JITTER_RATE, DISTANCE_DB, PAN, LATE_MS, GAP_VIBRATE_MS, GAP_SOUND_MS, MAX_VOICES, KEYS,
    BEAT_SOUNDS, beatSound, trainHits, TRAIN_WARM, BEAT_TICKS, beatTick, MAX_AHEAD_MS, GAP_BEAT_MS, BEAT_GAIN, TRAIN_MAX, TRAIN_FALL, GESTURE_CARDS, TRAIN_BEATS, CONTEXT, CONTEXT_MAX_DB, TONE_JITTER_DB, contextOf }),
  test: Object.freeze({
    play, playBeats, state, settings, buffers, voices: () => voices.length, scheduled: () => voices.map((v) => ({ start: v.start, end: v.end })),
    timers: () => timers.size, bus: () => bus, audio: () => audio, revive, whenRendered: () => renderQueue, memory: () => memory,
    renderCurrent, mountRows,
  }),
};
/** @type {any} */ (window).KCTFeedback = api;
document.addEventListener('kct:moment', onMoment);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopScheduled(); else revive(false); });
document.addEventListener('pointerdown', onTap, true);
document.addEventListener('keydown', onTap, true);
mountRows();
idle(() => { loadLibs().then((ok) => { if (ok) renderCurrent(); }); });
/* sound: the deal's sounds will come (Sound on, on a device that can play it): the game may hold a first deal for them. */
document.dispatchEvent(new CustomEvent('kct:feedback-ready', { detail: { v: V, sound: settings.sound !== 'off' && canSound && !dealReady } }));
})();
