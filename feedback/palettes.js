/* King Cut-Throat: feedback/palettes.js, the sound presets for each theme palette.

   Data only. Each palette belongs to a Felt (Settings → Table → Theme) and has:
   - tone:    the result family's key (root frequency, scale in semitones) and note partials.
   - timbre:  multipliers on the card families' primitives (bright is added). Classic is neutral.
   - presets: sounds by name. A preset is the Card Sound Lab's identity of a sound: family, archetype
              and seed, plus optional fixed settings in `set`. Copy them from the lab.
   - showdown (optional): a tone, a timbre or presets that replace the palette's own from the Showdown call
              to the Showdown result.

   Classic is the base. Another palette lists only what it changes: a missing preset is Classic's, played
   in that palette's tone and timbre. The seeds are the lab's default seeds, so each sound matches the
   lab's default row for that family and archetype.

   Spec: docs/ui/feedback.md (Sounds, Theme palettes, Required presets). Exposes window.KCTPalettes. */
(function () {
'use strict';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const FIFTHS = [0, 7, 12, 19, 24];

/* The 17 required presets. Family and archetype names are the lab's. */
const REQUIRED = {
  'card-play':       { family: 'play',    archetype: 0, seed: 2135764878 },  // B · Card played: Firm place
  'deal':            { family: 'deal',    archetype: 0, seed: 509677570 },   // C · Card dealt: Flick to table
  'flip':            { family: 'reveal',  archetype: 0, seed: 2209683029 },  // F · Card turn / reveal: Flip over
  'discard':         { family: 'slide',   archetype: 0, seed: 1878005619 },  // D · Card slide: Short push
  'trump-named':     { family: 'confirm', archetype: 0, seed: 942327234 },   // H · Game-state confirmation: Deck knock
  'trick-you':       { family: 'collect', archetype: 0, seed: 4211907244 },  // G · Trick collection: Sweep together
  'trick-bot':       { family: 'collect', archetype: 3, seed: 4262240101 },  // G · Trick collection: Quick gather
  'king-you':        { family: 'confirm', archetype: 2, seed: 908771996 },   // H · Game-state confirmation: Thumb strum
  'king-bot':        { family: 'confirm', archetype: 3, seed: 925549615 },   // H · Game-state confirmation: Square and tap
  'showdown-called': { family: 'shuffle', archetype: 0, seed: 2256289995 },  // E · Card shuffle: Riffle
  'hand-win':        { family: 'result',  archetype: 0, seed: 3507591809, set: { notes: 2 } },  // I · Result tones: Win rise
  'hand-loss':       { family: 'result',  archetype: 1, seed: 3490814190, set: { notes: 2 } },  // I · Result tones: Loss fall
  'showdown-win':    { family: 'result',  archetype: 0, seed: 3507591809, set: { notes: 3 } },  // I · Result tones: Win rise
  'showdown-loss':   { family: 'result',  archetype: 1, seed: 3490814190, set: { notes: 3 } },  // I · Result tones: Loss fall
  'game-win':        { family: 'result',  archetype: 2, seed: 3474036571 },  // I · Result tones: Fanfare
  'game-loss':       { family: 'result',  archetype: 4, seed: 3574702285 },  // I · Result tones: Settle
  'wave-cleared':    { family: 'result',  archetype: 3, seed: 3457258952 },  // I · Result tones: Fanfare and riffle
};

/* Optional variants of the most frequent sounds: the same family and archetype with another seed, so a variant is the
   same gesture by another hand. A cue lists its variants; the module picks one by a hash of the moment, so a game
   and its replay pick the same ones (docs/ui/feedback.md, Variants). A missing variant is skipped. */
const OPTIONAL = {
  'card-play-2':     { family: 'play',    archetype: 0, seed: 556975261 },
  'card-play-3':     { family: 'play',    archetype: 0, seed: 540197642 },
  'trick-you-2':     { family: 'collect', archetype: 0, seed: 1701469623 },
  'trick-bot-2':     { family: 'collect', archetype: 3, seed: 2103038088 },
  'king-you-2':      { family: 'confirm', archetype: 2, seed: 673906119 },
  'king-bot-2':      { family: 'confirm', archetype: 3, seed: 3033046886 },
  'deal-2':          { family: 'deal',    archetype: 0, seed: 3588240473 },
  'discard-2':       { family: 'slide',   archetype: 0, seed: 185656162 },
};

const NEUTRAL = { center: 1, edge: 1, bright: 0, body: 1, thump: 1, thumpFreq: 1, decay: 1, air: 1, airFreq: 1, rub: 1, rubGain: 1, grain: 1 };

const PALETTES = {
  classic: {
    title: 'Classic',
    tone: { root: 523.25, scale: MAJOR, partials: [1, 2, 3], weights: [0.8, 0.6, 0.25] },
    timbre: NEUTRAL,
    presets: Object.assign({}, REQUIRED, OPTIONAL),
  },
  spring: {
    title: 'Spring',
    tone: { root: 587.33, scale: MAJOR, partials: [1, 2], weights: [1, 0.25] },
    timbre: { center: 1.05, edge: 1.03, bright: 0.04, body: 0.9, thump: 0.75, thumpFreq: 1.05, decay: 0.92, air: 0.85, airFreq: 1.1, rub: 1.06, rubGain: 1, grain: 1.1 },
    presets: {},
  },
  summer: {
    title: 'Summer',
    tone: { root: 523.25, scale: FIFTHS, partials: [1, 2, 3], weights: [1, 0.2, 0.06] },
    timbre: { center: 1.03, edge: 1, bright: 0.05, body: 0.9, thump: 0.9, thumpFreq: 1, decay: 1.1, air: 1.35, airFreq: 1.05, rub: 1, rubGain: 0.9, grain: 0.95 },
    presets: {},
  },
  fall: {
    title: 'Fall',
    tone: { root: 440.0, scale: MAJOR, partials: [1, 2, 3], weights: [0.6, 0.85, 0.45] },
    timbre: { center: 0.88, edge: 0.92, bright: -0.15, body: 1.2, thump: 1.3, thumpFreq: 0.9, decay: 1.1, air: 1, airFreq: 0.95, rub: 0.9, rubGain: 1, grain: 0.85 },
    presets: {},
    /* The navy Showdown felt's voice: minor, and darker. */
    showdown: {
      tone: { root: 440.0, scale: MINOR, partials: [1, 2, 3], weights: [0.6, 0.85, 0.45] },
      timbre: { center: 0.82, edge: 0.88, bright: -0.22, body: 1.3, thump: 1.45, thumpFreq: 0.85, decay: 1.2, air: 1, airFreq: 0.92, rub: 0.85, rubGain: 1, grain: 0.8 },
    },
  },
  winter: {
    title: 'Winter',
    tone: { root: 659.25, scale: MAJOR, partials: [1, 2.76, 5.4], weights: [1, 0.3, 0.08] },
    timbre: { center: 1.06, edge: 1.04, bright: 0.04, body: 0.9, thump: 0.65, thumpFreq: 1.1, decay: 0.85, air: 0.8, airFreq: 1.08, rub: 1.08, rubGain: 0.9, grain: 1.2 },
    presets: {},
  },
};

/**
 * What to render for one sound in one palette: the preset (the palette's, else Classic's) and the voice
 * (tone and timbre) to render it in. Null when no palette has the sound.
 * @param {string} felt the felt's id, such as 'fall'
 * @param {string} name the preset's name, such as 'card-play'
 * @param {boolean} [showdown] true from the Showdown call to the Showdown result
 */
function resolve(felt, name, showdown) {
  const pal = PALETTES[felt] || PALETTES.classic;
  const sd = (showdown && pal.showdown) || null;
  const preset = (sd && sd.presets && sd.presets[name]) || pal.presets[name] || PALETTES.classic.presets[name] || null;
  if (!preset) return null;
  return { preset, voice: { tone: (sd && sd.tone) || pal.tone, timbre: (sd && sd.timbre) || pal.timbre } };
}

/** @type {any} */ (window).KCTPalettes = Object.freeze({
  version: 1,
  palettes: PALETTES,
  required: Object.freeze(Object.keys(REQUIRED)),
  optional: Object.freeze(Object.keys(OPTIONAL)),
  resolve,
});
})();
