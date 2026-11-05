/* King Cut-Throat: feedback/synth.js, the sound generator.

   The synthesis core of the Card Sound Lab, with its result-tone family and palette timbres. It turns a
   preset (family, archetype, seed) into audio, rendered offline with Web Audio. It is a classic script with
   no dependencies, loaded by feedback/feedback.js when the browser is idle, and it exposes one global,
   window.KCTSynth. It never plays sound itself and reads nothing from the game.

   Kept from the lab: its constants, random number generator, primitives, the 9 families, rendering, and the
   finishing steps (trim, fades, loudness normalization to the target, peak ceiling). Left out: the lab's
   interface, spectrum analysis, validation, WAV encoding and ZIP export.

   Spec: docs/ui/feedback.md (Sounds). Update this file from the lab, not by hand: the families and primitives
   must stay the lab's, so a preset renders the same sound here as there. */
(function () {
'use strict';

/* ---- Constants, as in the lab ---- */
const SAMPLE_RATE = 48000;
const RENDER_SECONDS = 0.96;          // offline render window; output is trimmed to the real sound
const MAX_DURATION_SECONDS = 0.98;    // hard cap, strictly below 1 s
const TARGET_LUFS = -18;
const PEAK_CEILING_DB = -1;
const FADE_IN_SECONDS = 0.001;
const FADE_OUT_SECONDS = 0.006;
const ONSET_THRESHOLD_DB = -40;       // relative to peak, for leading trim
const TAIL_THRESHOLD_DB = -50;        // relative to peak, for trailing trim
const PARAM_SPREAD = 0.2;             // seeded jitter around an archetype's base design

/** The Classic tone, for a result rendered without a palette. */
const CLASSIC_TONE = { root: 523.25, scale: [0, 2, 4, 5, 7, 9, 11], partials: [1, 2, 3], weights: [0.8, 0.6, 0.25] };

/* The card families' neutral timbre: the original lab. A palette's timbre replaces it. */
const TIMBRE_NEUTRAL = { center: 1, edge: 1, bright: 0, body: 1, thump: 1, thumpFreq: 1, decay: 1, air: 1, airFreq: 1, rub: 1, rubGain: 1, grain: 1 };

/* A scale degree to a frequency, in a palette's tone. Degrees past the scale wrap into the next octave. */
function degreeFreq(palette, degree) {
  const n = palette.scale.length;
  const octave = Math.floor(degree / n);
  const step = palette.scale[((degree % n) + n) % n];
  return palette.root * Math.pow(2, octave + step / 12);
}

const renderSecondsFor = (family) => family.renderSeconds || RENDER_SECONDS;

const maxSecondsFor = (family) => family.maxSeconds || MAX_DURATION_SECONDS;

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dbToGain = (db) => Math.pow(10, db / 20);

const gainToDb = (gain) => (gain > 0 ? 20 * Math.log10(gain) : -Infinity);

function jitterAll(rng, base, spread) {
  const result = {};
  for (const [key, value] of Object.entries(base)) {
    if (typeof value === 'number' && value > 0) {
      result[key] = value * (1 + (rng() * 2 - 1) * spread);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function createNoiseBuffer(ctx, rng, seconds) {
  const length = Math.ceil(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Sum of two uniforms: triangular distribution, slightly smoother than plain uniform noise.
    data[i] = rng() + rng() - 1;
  }
  return buffer;
}

function createMasterBus(ctx) {
  const input = ctx.createGain();
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 70;
  highpass.Q.value = -3;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 7500;
  lowpass.Q.value = -3;
  input.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(ctx.destination);

  // One faint, close tabletop reflection for body. Deliberately not a reverb.
  const reflection = ctx.createDelay(0.05);
  reflection.delayTime.value = 0.0055;
  const reflectionTone = ctx.createBiquadFilter();
  reflectionTone.type = 'lowpass';
  reflectionTone.frequency.value = 2800;
  reflectionTone.Q.value = -3;
  const reflectionGain = ctx.createGain();
  reflectionGain.gain.value = 0.12;
  lowpass.connect(reflection);
  reflection.connect(reflectionTone);
  reflectionTone.connect(reflectionGain);
  reflectionGain.connect(ctx.destination);
  return input;
}

function createVoice(ctx, bus, noiseBuffer, rng, timbre = TIMBRE_NEUTRAL) {
  let scheduledEnd = 0;
  const track = (end) => {
    scheduledEnd = Math.max(scheduledEnd, end);
    return end;
  };

  // Linear attack from zero, optional hold, exponential decay to −60 dB, then a 2 ms ramp to exact zero.
  function applyEnvelope(param, t, attack, hold, decay, peak) {
    const tPeak = t + Math.max(attack, 0.0003);
    const tHold = tPeak + Math.max(hold, 0);
    const tEnd = tHold + Math.max(decay, 0.002);
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, tPeak);
    if (hold > 0) param.setValueAtTime(peak, tHold);
    param.exponentialRampToValueAtTime(peak * 0.001, tEnd);
    param.linearRampToValueAtTime(0, tEnd + 0.002);
    return tEnd + 0.002;
  }

  function buildFilters(input, filters, t, sweepEnd) {
    let node = input;
    for (const spec of filters) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = spec.type;
      biquad.Q.value = spec.q ?? (spec.type === 'bandpass' ? 1 : -3);
      biquad.frequency.setValueAtTime(spec.freq, t);
      if (spec.freqEnd && spec.freqEnd !== spec.freq) {
        biquad.frequency.exponentialRampToValueAtTime(spec.freqEnd, sweepEnd);
      }
      node.connect(biquad);
      node = biquad;
    }
    return node;
  }

  // Paper grain: mostly low amplitude with irregular catches, read at a few hundred points per second.
  function grainCurve(duration, rate, depth) {
    const count = Math.max(4, Math.ceil(duration * rate));
    const curve = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      curve[i] = 1 - depth + depth * Math.pow(rng(), 2);
    }
    return curve;
  }

  function layer({ t, attack, hold = 0, decay, peak, filters, grain = null }) {
    if (!(peak > 0)) return t;
    t = Math.max(0.001, t);
    const body = attack + hold + decay;
    const length = body + 0.012;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const maxOffset = Math.max(0, noiseBuffer.duration - length - 0.01);
    source.start(t, rng() * maxOffset, length);
    let node = buildFilters(source, filters, t, t + body);
    if (grain) {
      const grainGain = ctx.createGain();
      grainGain.gain.setValueCurveAtTime(grainCurve(body, grain.rate, grain.depth), t, body);
      node.connect(grainGain);
      node = grainGain;
    }
    const envelope = ctx.createGain();
    envelope.gain.value = 0;
    const end = applyEnvelope(envelope.gain, t, attack, hold, decay, peak);
    node.connect(envelope);
    envelope.connect(bus);
    return track(end);
  }

  function tone({ t, f0, f1 = f0, drop = 0.03, attack = 0.002, decay = 0.03, peak }) {
    if (!(peak > 0)) return t;
    t = Math.max(0.001, t);
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(f0, t);
    oscillator.frequency.exponentialRampToValueAtTime(f1, t + drop);
    const envelope = ctx.createGain();
    envelope.gain.value = 0;
    const end = applyEnvelope(envelope.gain, t, attack, 0, decay, peak);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(t);
    oscillator.stop(end + 0.01);
    return track(end);
  }

  // Card edge: a rounded, band-limited tick with a little lower body so it is not a bare click.
  function edge(t, { gain = 1, freq = 2400, q = 1.1, decay = 0.006 } = {}) {
    layer({
      t, attack: 0.0007, decay, peak: gain,
      filters: [{ type: 'highpass', freq: 650 }, { type: 'bandpass', freq, q }],
    });
    return layer({
      t, attack: 0.0012, decay: decay * 1.8, peak: gain * 0.6,
      filters: [{ type: 'bandpass', freq: freq * 0.5, q: 3 }],
    });
  }

  // Card face meeting a surface: contact crack, cardstock body, damped flex resonance, faint table thump.
  function slap(t, { gain = 1, center = 1300, decay = 0.04, body = 0.5, thump = 0.3, thumpFreq = 170, bright = 0.5 } = {}) {
    layer({
      t, attack: 0.0013, decay: 0.009, peak: gain * (0.32 + bright * 0.5),
      filters: [{ type: 'highpass', freq: 900 }, { type: 'bandpass', freq: center * 1.7, q: 0.7 }, { type: 'lowpass', freq: 7000 }],
    });
    let end = layer({
      t: t + 0.0005, attack: 0.0018, decay, peak: gain,
      filters: [{ type: 'highpass', freq: 300 }, { type: 'bandpass', freq: center, q: 0.9 }],
    });
    if (body > 0) {
      end = Math.max(end, layer({
        t, attack: 0.002, decay: decay * 0.9, peak: gain * body * 2.5,
        filters: [{ type: 'bandpass', freq: center * 0.58, q: 5.5 }],
      }));
    }
    if (thump > 0) {
      end = Math.max(end, tone({
        t, f0: thumpFreq, f1: thumpFreq * 0.75, drop: 0.03, attack: 0.003, decay: 0.035, peak: gain * thump * 0.2,
      }));
    }
    return end;
  }

  // Air pushed by a moving card: a soft swell with a rising band.
  function air(t, { dur = 0.035, gain = 0.3, f0 = 450, f1 = 1000, q = 0.8 } = {}) {
    return layer({
      t, attack: dur * 0.85, decay: Math.max(0.012, dur * 0.3), peak: gain,
      filters: [{ type: 'bandpass', freq: f0, freqEnd: f1, q }, { type: 'lowpass', freq: 2600 }],
    });
  }

  // Paper friction: band-limited noise with grain, a moving spectral centre and optional fibre catches.
  function rub(t, {
    dur = 0.15, f0 = 1500, f1 = 2000, q = 1, gain = 0.6, attack = 0.025, release = 0.05,
    grainRate = 240, grainDepth = 0.6, catches = 0, catchGain = 0.3,
  } = {}) {
    const hold = Math.max(0, dur - attack - release);
    let end = layer({
      t, attack, hold, decay: release, peak: gain,
      filters: [{ type: 'highpass', freq: 450 }, { type: 'bandpass', freq: f0, freqEnd: f1, q }, { type: 'lowpass', freq: 6500 }],
      grain: { rate: grainRate, depth: grainDepth },
    });
    // Lower, smoother companion band keeps the friction in the clearly audible mid range.
    end = Math.max(end, layer({
      t, attack, hold, decay: release, peak: gain * 0.45,
      filters: [{ type: 'bandpass', freq: f0 * 0.55, freqEnd: f1 * 0.55, q: 0.8 }],
      grain: { rate: grainRate * 0.5, depth: grainDepth * 0.5 },
    }));
    const catchCount = Math.round(catches);
    for (let i = 0; i < catchCount; i++) {
      const at = t + attack + rng() * Math.max(0.005, hold + release * 0.4);
      edge(at, { gain: gain * catchGain * (0.6 + 0.6 * rng()), freq: f0 * (1.1 + 0.4 * rng()), decay: 0.004 });
    }
    return end;
  }

  // Train of card-edge ticks: riffles, strums and fluttering stacks.
  function flutter(t, {
    count, dur, freqLo = 1900, freqHi = 2700, gain = 0.5, accel = 1, shape = 'bell', ascending = false,
    decayLo = 0.004, decayHi = 0.008,
  }) {
    const n = Math.max(2, Math.round(count));
    const spacing = dur / (n - 1);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const time = t + dur * Math.pow(u, accel) + (rng() - 0.5) * spacing * 0.45;
      const contour = shape === 'rise' ? 0.45 + 0.55 * u
        : shape === 'fall' ? 1 - 0.6 * u
        : Math.sin(Math.PI * (0.15 + 0.7 * u));
      const freq = ascending
        ? freqLo + (freqHi - freqLo) * u * (0.9 + 0.2 * rng())
        : freqLo + (freqHi - freqLo) * rng();
      edge(time, {
        gain: gain * contour * (0.75 + 0.5 * rng()),
        freq, q: 1 + 0.4 * rng(),
        decay: decayLo + (decayHi - decayLo) * rng(),
      });
    }
    return track(t + dur + decayHi * 2);
  }

  // Chime: a short stack of sine partials sharing one envelope shape. Upper partials decay faster,
  // as on a struck bar. Built on tone(), so it inherits its exact-zero ending.
  function chime(t, { freq, partials = [1, 2, 3], weights = [1, 0.4, 0.15], attack = 0.004, decay = 0.4, gain = 0.6 }) {
    let end = t;
    partials.forEach((ratio, i) => {
      const weight = weights[i] ?? 0;
      if (!(weight > 0)) return;
      const f = freq * ratio;
      if (f >= 7000) return;
      end = Math.max(end, tone({ t, f0: f, f1: f, drop: 0.01, attack, decay: decay / (1 + 0.7 * i), peak: gain * weight }));
    });
    return track(end);
  }

  // The palette's timbre, applied once at the public entry points. Internal calls (a rub's fibre catches)
  // use the raw primitives, so nothing is scaled twice.
  const T = timbre;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const tEdge = (t, o = {}) => edge(t, { ...o, freq: (o.freq ?? 2400) * T.edge, decay: (o.decay ?? 0.006) * T.decay });
  const tSlap = (t, o = {}) => slap(t, {
    ...o, center: (o.center ?? 1300) * T.center, decay: (o.decay ?? 0.04) * T.decay,
    body: Math.min(1, (o.body ?? 0.5) * T.body), thump: (o.thump ?? 0.3) * T.thump,
    thumpFreq: (o.thumpFreq ?? 170) * T.thumpFreq, bright: clamp01((o.bright ?? 0.5) + T.bright),
  });
  const tAir = (t, o = {}) => air(t, { ...o, gain: (o.gain ?? 0.3) * T.air, f0: (o.f0 ?? 450) * T.airFreq, f1: (o.f1 ?? 1000) * T.airFreq });
  const tRub = (t, o = {}) => rub(t, {
    ...o, f0: (o.f0 ?? 1500) * T.rub, f1: (o.f1 ?? 2000) * T.rub, gain: (o.gain ?? 0.6) * T.rubGain,
    grainRate: (o.grainRate ?? 240) * T.grain,
  });
  const tFlutter = (t, o) => flutter(t, {
    ...o, freqLo: (o.freqLo ?? 1900) * T.edge, freqHi: (o.freqHi ?? 2700) * T.edge,
    decayLo: (o.decayLo ?? 0.004) * T.decay, decayHi: (o.decayHi ?? 0.008) * T.decay,
  });

  return {
    rand: rng, layer, tone, edge: tEdge, slap: tSlap, air: tAir, rub: tRub, flutter: tFlutter, chime,
    get scheduledEnd() { return scheduledEnd; },
  };
}

const FAMILIES = [
  {
    id: 'select', slug: 'card-select', title: 'A · Card selection', levelOffsetDb: -2.5,
    blurb: 'A card lifted or eased out of the hand. Light friction and a small release; no table impact.',
    archetypes: ['Pinch lift', 'Fan pull', 'Fingertip tap', 'Edge flick'],
    bases: [
      { rubDelay: 0.004, rubDur: 0.1, rubF0: 1500, rubF1: 2300, rubGain: 0.8, tickAt: 0.72, tickGain: 0.55, tickFreq: 2500, tapGain: 0, tapCenter: 1000, grainRate: 260 },
      { rubDelay: 0.004, rubDur: 0.13, rubF0: 1150, rubF1: 2100, rubGain: 0.85, tickAt: 0.88, tickGain: 0.32, tickFreq: 2300, tapGain: 0, tapCenter: 1000, grainRate: 210 },
      { rubDelay: 0.012, rubDur: 0.07, rubF0: 1300, rubF1: 1750, rubGain: 0.4, tickAt: 0.5, tickGain: 0.15, tickFreq: 2100, tapGain: 0.9, tapCenter: 950, grainRate: 300 },
      { rubDelay: 0.008, rubDur: 0.08, rubF0: 2100, rubF1: 1500, rubGain: 0.5, tickAt: -1, tickGain: 0.75, tickFreq: 2700, tapGain: 0, tapCenter: 1000, grainRate: 280 },
    ],
    perform(voice, p) {
      const t0 = 0.004;
      if (p.tapGain > 0) {
        voice.slap(t0, { gain: p.tapGain, center: p.tapCenter, decay: 0.035, body: 0.35, thump: 0.06, bright: 0.15 });
      }
      const rubStart = t0 + p.rubDelay;
      voice.rub(rubStart, {
        dur: p.rubDur, f0: p.rubF0, f1: p.rubF1, q: 1.1, gain: p.rubGain,
        attack: p.rubDur * 0.35, release: p.rubDur * 0.45, grainRate: p.grainRate, grainDepth: 0.65,
      });
      const tickTime = p.tickAt < 0 ? t0 : rubStart + p.rubDur * p.tickAt;
      voice.edge(tickTime, { gain: p.tickGain, freq: p.tickFreq, decay: 0.007 });
    },
  },
  {
    id: 'play', slug: 'card-play', title: 'B · Card played', levelOffsetDb: 0,
    blurb: 'A card placed decisively on the table: air cushion, crisp contact, short cardstock body.',
    archetypes: ['Firm place', 'Soft place', 'Corner first', 'Place and skid'],
    bases: [
      { airDur: 0.026, airGain: 0.22, preEdgeGain: 0, preEdgeLead: 0.01, slapGain: 1, center: 1450, decay: 0.06, body: 0.5, thump: 0.35, thumpFreq: 190, bright: 0.6, skidDur: 0, skidGain: 0, settleGain: 0.22 },
      { airDur: 0.045, airGain: 0.38, preEdgeGain: 0, preEdgeLead: 0.01, slapGain: 1, center: 1100, decay: 0.075, body: 0.6, thump: 0.25, thumpFreq: 170, bright: 0.3, skidDur: 0, skidGain: 0, settleGain: 0.12 },
      { airDur: 0.03, airGain: 0.25, preEdgeGain: 0.6, preEdgeLead: 0.013, slapGain: 1, center: 1350, decay: 0.065, body: 0.45, thump: 0.3, thumpFreq: 180, bright: 0.45, skidDur: 0, skidGain: 0, settleGain: 0.15 },
      { airDur: 0.03, airGain: 0.25, preEdgeGain: 0, preEdgeLead: 0.01, slapGain: 1, center: 1300, decay: 0.055, body: 0.45, thump: 0.3, thumpFreq: 175, bright: 0.5, skidDur: 0.085, skidGain: 0.45, settleGain: 0 },
    ],
    perform(voice, p) {
      const t0 = 0.004;
      voice.air(t0, { dur: p.airDur, gain: p.airGain, f0: 380, f1: 950 });
      const tLand = t0 + p.airDur;
      if (p.preEdgeGain > 0) voice.edge(tLand - p.preEdgeLead, { gain: p.preEdgeGain, freq: 2400, decay: 0.007 });
      voice.slap(tLand, { gain: p.slapGain, center: p.center, decay: p.decay, body: p.body, thump: p.thump, thumpFreq: p.thumpFreq, bright: p.bright });
      if (p.skidGain > 0) {
        voice.rub(tLand + 0.008, { dur: p.skidDur, f0: 2000, f1: 1350, q: 1.1, gain: p.skidGain, attack: 0.008, release: p.skidDur * 0.6, grainRate: 300, grainDepth: 0.7 });
      }
      if (p.settleGain > 0) {
        voice.slap(tLand + 0.024, { gain: p.settleGain, center: p.center * 1.2, decay: 0.022, body: 0.2, thump: 0, bright: 0.3 });
      }
    },
  },
  {
    id: 'deal', slug: 'card-deal', title: 'C · Card dealt', levelOffsetDb: -1,
    blurb: 'A card released from the deck, travelling briefly, then landing. Lighter landing than a played card.',
    archetypes: ['Flick to table', 'Into hand', 'Long toss', 'Quick snap'],
    bases: [
      { releaseGain: 0.6, releaseFreq: 2700, whooshDur: 0.06, whooshGain: 0.35, whooshF0: 650, whooshF1: 1500, landGain: 0.75, landCenter: 1600, landDecay: 0.05, landThump: 0.18, landBody: 0.4, skidDur: 0.045, skidGain: 0.3, cardRubGain: 0 },
      { releaseGain: 0.45, releaseFreq: 2500, whooshDur: 0.05, whooshGain: 0.3, whooshF0: 600, whooshF1: 1300, landGain: 0.6, landCenter: 1800, landDecay: 0.04, landThump: 0, landBody: 0.25, skidDur: 0, skidGain: 0, cardRubGain: 0.55 },
      { releaseGain: 0.5, releaseFreq: 2600, whooshDur: 0.1, whooshGain: 0.4, whooshF0: 550, whooshF1: 1700, landGain: 0.7, landCenter: 1500, landDecay: 0.045, landThump: 0.2, landBody: 0.4, skidDur: 0.1, skidGain: 0.4, cardRubGain: 0 },
      { releaseGain: 0.9, releaseFreq: 2300, whooshDur: 0.045, whooshGain: 0.25, whooshF0: 800, whooshF1: 1600, landGain: 0.8, landCenter: 1700, landDecay: 0.045, landThump: 0.15, landBody: 0.35, skidDur: 0, skidGain: 0, cardRubGain: 0 },
    ],
    perform(voice, p) {
      const t0 = 0.004;
      voice.edge(t0, { gain: p.releaseGain, freq: p.releaseFreq, decay: 0.007 });
      voice.rub(t0, { dur: 0.026, f0: 2200, f1: 2600, gain: p.releaseGain * 0.5, attack: 0.004, release: 0.015, grainRate: 320, grainDepth: 0.6 });
      voice.air(t0 + 0.006, { dur: p.whooshDur, gain: p.whooshGain, f0: p.whooshF0, f1: p.whooshF1 });
      const tLand = t0 + 0.006 + p.whooshDur;
      voice.slap(tLand, { gain: p.landGain, center: p.landCenter, decay: p.landDecay, body: p.landBody, thump: p.landThump, thumpFreq: 190, bright: 0.5 });
      if (p.skidGain > 0) {
        voice.rub(tLand + 0.006, { dur: p.skidDur, f0: 2100, f1: 1500, q: 1.1, gain: p.skidGain, attack: 0.007, release: p.skidDur * 0.6, grainRate: 290, grainDepth: 0.7 });
      }
      if (p.cardRubGain > 0) {
        voice.rub(tLand + 0.004, { dur: 0.055, f0: 2300, f1: 1800, gain: p.cardRubGain, attack: 0.006, release: 0.032, grainRate: 300, grainDepth: 0.6 });
      }
    },
  },
  {
    id: 'slide', slug: 'card-slide', title: 'D · Card slide', levelOffsetDb: -1.5,
    blurb: 'A card pushed or repositioned on the table: a short, textured friction gesture.',
    archetypes: ['Short push', 'Long drag', 'Two-step nudge', 'Pivot turn'],
    bases: [
      { contactGain: 0.35, rubDur: 0.16, rubF0: 1700, rubF1: 2000, rubQ: 1, rubGain: 0.75, attack: 0.03, release: 0.06, grainRate: 240, grainDepth: 0.65, catches: 2, secondDur: 0, secondGain: 0, secondGap: 0, stopGain: 0.25 },
      { contactGain: 0.3, rubDur: 0.32, rubF0: 1400, rubF1: 1900, rubQ: 0.9, rubGain: 0.7, attack: 0.06, release: 0.09, grainRate: 200, grainDepth: 0.7, catches: 4, secondDur: 0, secondGain: 0, secondGap: 0, stopGain: 0.2 },
      { contactGain: 0.35, rubDur: 0.11, rubF0: 1600, rubF1: 2100, rubQ: 1.1, rubGain: 0.7, attack: 0.02, release: 0.045, grainRate: 260, grainDepth: 0.6, catches: 1, secondDur: 0.09, secondGain: 0.5, secondGap: 0.05, stopGain: 0.18 },
      { contactGain: 0.4, rubDur: 0.2, rubF0: 2200, rubF1: 1300, rubQ: 1.4, rubGain: 0.7, attack: 0.035, release: 0.07, grainRate: 170, grainDepth: 0.75, catches: 3, secondDur: 0, secondGain: 0, secondGap: 0, stopGain: 0 },
    ],
    perform(voice, p) {
      const t0 = 0.004;
      voice.edge(t0, { gain: p.contactGain, freq: 2000, decay: 0.008 });
      const rubStart = t0 + 0.004;
      voice.rub(rubStart, {
        dur: p.rubDur, f0: p.rubF0, f1: p.rubF1, q: p.rubQ, gain: p.rubGain, attack: p.attack, release: p.release,
        grainRate: p.grainRate, grainDepth: p.grainDepth, catches: p.catches,
      });
      let rubEnd = rubStart + p.rubDur;
      const lastRelease = p.release;
      if (p.secondGain > 0) {
        const secondStart = rubEnd + p.secondGap;
        voice.edge(secondStart, { gain: p.contactGain * 0.7, freq: 2100, decay: 0.007 });
        voice.rub(secondStart + 0.003, {
          dur: p.secondDur, f0: p.rubF0 * 1.08, f1: p.rubF1 * 1.05, q: p.rubQ, gain: p.secondGain,
          attack: p.attack * 0.8, release: p.release, grainRate: p.grainRate * 1.1, grainDepth: p.grainDepth, catches: 1,
        });
        rubEnd = secondStart + 0.003 + p.secondDur;
      }
      if (p.stopGain > 0) {
        voice.slap(rubEnd - lastRelease * 0.6, { gain: p.stopGain, center: 1250, decay: 0.025, body: 0.3, thump: 0.08, bright: 0.2 });
      }
    },
  },
  {
    id: 'shuffle', slug: 'card-shuffle', title: 'E · Card shuffle', levelOffsetDb: -0.5,
    blurb: 'A compact shuffle gesture: several cards moving together, finished by squaring the pack.',
    archetypes: ['Riffle', 'Riffle and bridge', 'Overhand', 'Table wash'],
    bases: [
      { riffleDur: 0.36, riffleCount: 18, accel: 1.15, tickLo: 1700, tickHi: 2500, tickGain: 0.7, bedGain: 0.16, bedF0: 1700, bedF1: 2200, bridgeDur: 0, bridgeCount: 0, squareGain: 0.7 },
      { riffleDur: 0.26, riffleCount: 14, accel: 1.1, tickLo: 1900, tickHi: 2700, tickGain: 0.7, bedGain: 0.15, bedF0: 1700, bedF1: 2200, bridgeDur: 0.12, bridgeCount: 12, squareGain: 0.75 },
      { blockCount: 4, blockSpacing: 0.12, blockGain: 0.65, blockCenter: 1350, squareGain: 0.6 },
      { washCount: 3, washDur: 0.24, washSpread: 0.13, washGain: 0.55, tickCount: 4, squareGain: 0.5 },
    ],
    perform(voice, p, archetype) {
      const r = voice.rand;
      const t0 = 0.004;
      const square = (t, gain) => voice.slap(t, { gain, center: 1100, decay: 0.05, body: 0.65, thump: 0.3, bright: 0.35 });
      if (archetype <= 1) {
        voice.flutter(t0, { count: p.riffleCount, dur: p.riffleDur, freqLo: p.tickLo, freqHi: p.tickHi, gain: p.tickGain, accel: p.accel, shape: 'bell' });
        voice.rub(t0, { dur: p.riffleDur + 0.02, f0: p.bedF0, f1: p.bedF1, gain: p.bedGain, attack: 0.04, release: 0.06, grainRate: 320, grainDepth: 0.8 });
        let tSquare = t0 + p.riffleDur + 0.03;
        if (p.bridgeCount > 0) {
          const tBridge = t0 + p.riffleDur + 0.04;
          voice.flutter(tBridge, { count: p.bridgeCount, dur: p.bridgeDur, freqLo: 1600, freqHi: 2300, gain: p.tickGain * 0.6, accel: 0.8, shape: 'fall' });
          voice.rub(tBridge, { dur: p.bridgeDur + 0.03, f0: 2300, f1: 1400, gain: p.bedGain * 0.9, attack: 0.015, release: 0.05, grainRate: 340, grainDepth: 0.8 });
          tSquare = tBridge + p.bridgeDur + 0.03;
        }
        square(tSquare, p.squareGain);
      } else if (archetype === 2) {
        const count = Math.round(p.blockCount);
        let t = t0;
        for (let i = 0; i < count; i++) {
          voice.rub(t, { dur: 0.045, f0: 1800, f1: 1500, gain: 0.4, attack: 0.008, release: 0.025, grainRate: 300, grainDepth: 0.7 });
          voice.slap(t + 0.035, {
            gain: p.blockGain * (1 - i * 0.08), center: p.blockCenter * (0.92 + 0.16 * r()),
            decay: 0.035, body: 0.5, thump: 0.12, bright: 0.35,
          });
          t += p.blockSpacing * (0.85 + 0.3 * r());
        }
        square(t + 0.01, p.squareGain);
      } else {
        const count = Math.round(p.washCount);
        for (let i = 0; i < count; i++) {
          const f0 = 1300 + 600 * r();
          voice.rub(t0 + i * p.washSpread, {
            dur: p.washDur * (0.85 + 0.3 * r()), f0, f1: f0 * (0.8 + 0.4 * r()), q: 1,
            gain: p.washGain * (0.8 + 0.4 * r()), attack: 0.05, release: 0.08, grainRate: 230, grainDepth: 0.75, catches: 2,
          });
        }
        const span = (count - 1) * p.washSpread + p.washDur;
        const ticks = Math.round(p.tickCount);
        for (let i = 0; i < ticks; i++) {
          voice.edge(t0 + 0.03 + r() * (span - 0.06), { gain: 0.4 + 0.25 * r(), freq: 1900 + 700 * r(), decay: 0.006 });
        }
        square(t0 + span - 0.02, p.squareGain);
      }
    },
  },
  {
    id: 'reveal', slug: 'card-reveal', title: 'F · Card turn / reveal', levelOffsetDb: -1,
    blurb: 'A card lifted at the corner, turned through the air and laid face up.',
    archetypes: ['Flip over', 'Slow peel', 'Snap flip', 'Slide and turn'],
    bases: [
      { slideDur: 0, slideGain: 0, peelDur: 0, peelGain: 0, liftGain: 0.45, snapGain: 0, flipDur: 0.08, flipGain: 0.5, flipF0: 600, flipF1: 1500, landGain: 0.65, landCenter: 1500, landDecay: 0.04, landThump: 0.15 },
      { slideDur: 0, slideGain: 0, peelDur: 0.09, peelGain: 0.5, liftGain: 0.25, snapGain: 0, flipDur: 0.1, flipGain: 0.45, flipF0: 550, flipF1: 1300, landGain: 0.55, landCenter: 1350, landDecay: 0.05, landThump: 0.12 },
      { slideDur: 0, slideGain: 0, peelDur: 0, peelGain: 0, liftGain: 0.3, snapGain: 0.7, flipDur: 0.055, flipGain: 0.4, flipF0: 700, flipF1: 1700, landGain: 0.7, landCenter: 1600, landDecay: 0.035, landThump: 0.18 },
      { slideDur: 0.11, slideGain: 0.55, peelDur: 0, peelGain: 0, liftGain: 0.3, snapGain: 0, flipDur: 0.07, flipGain: 0.45, flipF0: 600, flipF1: 1500, landGain: 0.6, landCenter: 1450, landDecay: 0.04, landThump: 0.15 },
    ],
    perform(voice, p) {
      let t = 0.004;
      if (p.slideGain > 0) {
        voice.rub(t, { dur: p.slideDur, f0: 1600, f1: 2000, gain: p.slideGain, attack: 0.02, release: 0.04, grainRate: 240, grainDepth: 0.65, catches: 1 });
        t += p.slideDur * 0.8;
      }
      if (p.peelGain > 0) {
        voice.rub(t, { dur: p.peelDur, f0: 1300, f1: 2300, gain: p.peelGain, attack: p.peelDur * 0.6, release: 0.03, grainRate: 180, grainDepth: 0.7 });
        t += p.peelDur * 0.85;
      }
      voice.edge(t, { gain: p.liftGain, freq: 2600, decay: 0.006 });
      if (p.snapGain > 0) {
        voice.edge(t + 0.012, { gain: p.snapGain, freq: 2200, decay: 0.009 });
        voice.edge(t + 0.019, { gain: p.snapGain * 0.5, freq: 1700, decay: 0.01 });
        voice.layer({ t: t + 0.012, attack: 0.002, decay: 0.03, peak: p.snapGain * 0.9, filters: [{ type: 'bandpass', freq: 900, q: 5 }] });
        t += 0.012;
      }
      const tFlip = t + 0.008;
      voice.air(tFlip, { dur: p.flipDur * 0.6, gain: p.flipGain, f0: p.flipF0, f1: p.flipF1 });
      voice.air(tFlip + p.flipDur * 0.5, { dur: p.flipDur * 0.5, gain: p.flipGain * 0.7, f0: p.flipF1, f1: p.flipF0 * 1.1 });
      voice.rub(tFlip + p.flipDur * 0.25, { dur: p.flipDur * 0.5, f0: 1200, f1: 1500, gain: p.flipGain * 0.35, attack: p.flipDur * 0.2, release: p.flipDur * 0.2, grainRate: 150, grainDepth: 0.5 });
      const tLand = tFlip + p.flipDur;
      voice.slap(tLand, { gain: p.landGain, center: p.landCenter, decay: p.landDecay, body: 0.4, thump: p.landThump, bright: 0.45 });
    },
  },
  {
    id: 'collect', slug: 'trick-collect', title: 'G · Trick collection', levelOffsetDb: -0.5,
    blurb: 'Several cards swept or stacked together, then squared into a small pile.',
    archetypes: ['Sweep together', 'Stack and square', 'Scoop', 'Quick gather'],
    bases: [
      { dropCount: 0, dropSpacing: 0, dropGain: 0, sweepDur: 0.17, sweepGain: 0.6, sweepF0: 1300, sweepF1: 1900, contactCount: 3, contactGain: 0.45, flutterCount: 0, flutterDur: 0, squareGain: 0.85, squareCount: 1 },
      { dropCount: 3, dropSpacing: 0.07, dropGain: 0.6, sweepDur: 0, sweepGain: 0, sweepF0: 1300, sweepF1: 1900, contactCount: 0, contactGain: 0, flutterCount: 0, flutterDur: 0, squareGain: 0.65, squareCount: 2 },
      { dropCount: 0, dropSpacing: 0, dropGain: 0, sweepDur: 0.2, sweepGain: 0.55, sweepF0: 1200, sweepF1: 2200, contactCount: 1, contactGain: 0.4, flutterCount: 6, flutterDur: 0.07, squareGain: 0.75, squareCount: 1 },
      { dropCount: 0, dropSpacing: 0, dropGain: 0, sweepDur: 0.09, sweepGain: 0.55, sweepF0: 1500, sweepF1: 1900, contactCount: 2, contactGain: 0.5, flutterCount: 0, flutterDur: 0, squareGain: 0.8, squareCount: 1 },
    ],
    perform(voice, p) {
      const r = voice.rand;
      let t = 0.004;
      const drops = Math.round(p.dropCount);
      for (let i = 0; i < drops; i++) {
        voice.slap(t + i * p.dropSpacing * (0.85 + 0.3 * r()), {
          gain: p.dropGain * (0.85 + 0.3 * r()), center: 1400 + 400 * r(), decay: 0.035, body: 0.4, thump: 0.1, bright: 0.4,
        });
      }
      if (drops > 0) t += drops * p.dropSpacing;
      if (p.sweepGain > 0) {
        voice.rub(t, { dur: p.sweepDur, f0: p.sweepF0, f1: p.sweepF1, gain: p.sweepGain, attack: p.sweepDur * 0.3, release: p.sweepDur * 0.35, grainRate: 250, grainDepth: 0.7 });
        const contacts = Math.round(p.contactCount);
        for (let i = 0; i < contacts; i++) {
          voice.slap(t + p.sweepDur * (0.15 + 0.7 * r()), {
            gain: p.contactGain * (0.7 + 0.3 * r()), center: 1500 + 400 * r(), decay: 0.025, body: 0.3, thump: 0.04, bright: 0.5,
          });
        }
        t += p.sweepDur;
      }
      if (p.flutterCount > 0) {
        voice.flutter(t - p.flutterDur, { count: p.flutterCount, dur: p.flutterDur, freqLo: 1800, freqHi: 2600, gain: 0.4, shape: 'rise' });
      }
      const squares = Math.max(1, Math.round(p.squareCount));
      for (let k = 0; k < squares; k++) {
        voice.slap(t + 0.015 + k * 0.075, { gain: p.squareGain * (k ? 0.62 : 1), center: 1050, decay: 0.05, body: 0.7, thump: 0.3, bright: 0.25 });
      }
    },
  },
  {
    id: 'confirm', slug: 'game-confirm', title: 'H · Game-state confirmation', levelOffsetDb: 0.5,
    blurb: 'A deliberate, physical acknowledgment: the pack tapped, strummed or set down. Fuller than single-card sounds.',
    archetypes: ['Deck knock', 'Pack set down', 'Thumb strum', 'Square and tap'],
    bases: [
      { airGain: 0, airDur: 0, strumCount: 0, strumDur: 0, strumGain: 0, sideTaps: 0, sideGap: 0, sideGain: 0, knockCount: 2, knockGap: 0.1, knockGain: 1, knockCenter: 1000, knockBody: 0.75, knockThump: 0.35, settleGain: 0 },
      { airGain: 0.35, airDur: 0.035, strumCount: 0, strumDur: 0, strumGain: 0, sideTaps: 0, sideGap: 0, sideGain: 0, knockCount: 1, knockGap: 0, knockGain: 1, knockCenter: 1000, knockBody: 0.85, knockThump: 0.3, settleGain: 0.4 },
      { airGain: 0, airDur: 0, strumCount: 8, strumDur: 0.11, strumGain: 0.5, sideTaps: 0, sideGap: 0, sideGain: 0, knockCount: 1, knockGap: 0, knockGain: 0.85, knockCenter: 1100, knockBody: 0.7, knockThump: 0.4, settleGain: 0 },
      { airGain: 0, airDur: 0, strumCount: 0, strumDur: 0, strumGain: 0, sideTaps: 2, sideGap: 0.06, sideGain: 0.5, knockCount: 1, knockGap: 0, knockGain: 0.95, knockCenter: 1050, knockBody: 0.75, knockThump: 0.45, settleGain: 0 },
    ],
    perform(voice, p) {
      let t = 0.004;
      if (p.airGain > 0) {
        voice.air(t, { dur: p.airDur, gain: p.airGain, f0: 350, f1: 850 });
        t += p.airDur;
      }
      if (p.strumCount > 0) {
        voice.flutter(t, { count: p.strumCount, dur: p.strumDur, freqLo: 1700, freqHi: 2700, gain: p.strumGain, shape: 'rise', ascending: true });
        t += p.strumDur + 0.012;
      }
      const sideTaps = Math.round(p.sideTaps);
      for (let i = 0; i < sideTaps; i++) {
        voice.rub(t, { dur: 0.03, f0: 1800, f1: 1500, gain: p.sideGain * 0.6, attack: 0.005, release: 0.02, grainRate: 300, grainDepth: 0.6 });
        voice.slap(t + 0.02, { gain: p.sideGain, center: 1700, decay: 0.03, body: 0.35, thump: 0.05, bright: 0.45 });
        t += p.sideGap;
      }
      if (sideTaps > 0) t += 0.02;
      const knocks = Math.max(1, Math.round(p.knockCount));
      for (let k = 0; k < knocks; k++) {
        voice.slap(t + k * p.knockGap, {
          gain: p.knockGain * (k ? 0.65 : 1), center: p.knockCenter * (k ? 1.06 : 1), decay: 0.055,
          body: p.knockBody, thump: p.knockThump, thumpFreq: 165, bright: 0.35,
        });
      }
      if (p.settleGain > 0) {
        voice.rub(t + 0.012, { dur: 0.05, f0: 1600, f1: 1300, gain: p.settleGain, attack: 0.006, release: 0.035, grainRate: 260, grainDepth: 0.6 });
      }
    },
  },
  {
    id: 'result', slug: 'game-result', title: 'I · Result tones', levelOffsetDb: -1,
    renderSeconds: 2.6, maxSeconds: 2.5,
    blurb: 'A result: a card knock that resolves into tones from the palette. Wins rise, losses fall, a game end holds.',
    archetypes: ['Win rise', 'Loss fall', 'Fanfare', 'Fanfare and riffle', 'Settle'],
    bases: [
      { knockGain: 0.55, knockCenter: 1150, notes: 2.6, gap: 0.11, noteDecay: 0.28, lastDecay: 0.55, gain: 0.55, riffleGain: 0, chordDecay: 0 },
      { knockGain: 0.4, knockCenter: 950, notes: 2.6, gap: 0.17, noteDecay: 0.32, lastDecay: 0.22, gain: 0.5, riffleGain: 0, chordDecay: 0 },
      { knockGain: 0.9, knockCenter: 1050, notes: 3.6, gap: 0.075, noteDecay: 0.22, lastDecay: 0.3, gain: 0.5, riffleGain: 0, chordDecay: 1.1 },
      { knockGain: 0.9, knockCenter: 1050, notes: 3.6, gap: 0.075, noteDecay: 0.22, lastDecay: 0.3, gain: 0.5, riffleGain: 0.45, chordDecay: 1.0 },
      { knockGain: 1, knockCenter: 900, notes: 1, gap: 0, noteDecay: 0, lastDecay: 1.15, gain: 0.6, riffleGain: 0, chordDecay: 0 },
    ],
    perform(voice, p, archetype, palette) {
      const pal = palette || CLASSIC_TONE;
      const chime = (t, degree, decay, gain) => voice.chime(t, { freq: degreeFreq(pal, degree), partials: pal.partials, weights: pal.weights, decay, gain });
      let t = 0.004;
      // The knock: the table's physical voice, before the tones.
      if (archetype === 4) {
        voice.air(t, { dur: 0.035, gain: 0.3, f0: 350, f1: 850 });
        t += 0.035;
      }
      const knocks = archetype === 2 || archetype === 3 ? 2 : 1;
      for (let k = 0; k < knocks; k++) {
        voice.slap(t + k * 0.09, { gain: p.knockGain * (k ? 0.65 : 1), center: p.knockCenter * (k ? 1.06 : 1), decay: 0.05, body: 0.75, thump: 0.3, thumpFreq: 165, bright: 0.35 });
      }
      t += 0.05 + (knocks - 1) * 0.09;
      const notes = Math.max(1, Math.round(p.notes));
      const step = () => (voice.rand() < 0.5 ? 1 : 2);   // seeded: by step or by a third
      if (archetype === 0) {                                // Win rise
        let d = voice.rand() < 0.5 ? 0 : 2;
        for (let i = 0; i < notes; i++) {
          const last = i === notes - 1;
          chime(t + i * p.gap, d, last ? p.lastDecay : p.noteDecay, p.gain * (last ? 1 : 0.8));
          d += step();
        }
      } else if (archetype === 1) {                         // Loss fall
        let d = voice.rand() < 0.5 ? 4 : 3;
        for (let i = 0; i < notes; i++) {
          const last = i === notes - 1;
          chime(t + i * p.gap, d, last ? p.lastDecay : p.noteDecay, p.gain * (1 - 0.15 * i));
          d -= step();
        }
      } else if (archetype === 2 || archetype === 3) {      // Fanfare, with or without the riffle
        const arp = [0, 2, 4, 7].slice(0, Math.min(4, Math.max(3, notes)));
        arp.forEach((d, i) => chime(t + i * p.gap, d, p.noteDecay, p.gain * 0.75));
        const tChord = t + arp.length * p.gap + 0.02;
        [0, 2, 4].forEach((d) => chime(tChord, d + pal.scale.length, p.chordDecay, p.gain * 0.5));
        if (p.riffleGain > 0) {
          voice.flutter(tChord + 0.18, { count: 16, dur: 0.45, freqLo: 1800, freqHi: 2700, gain: p.riffleGain, shape: 'fall' });
        }
      } else {                                              // Settle
        // A low note heard through its upper partials: the fundamental stays light, so small speakers
        // still carry it in the mid band, and the ear still hears the low pitch.
        voice.chime(t + 0.02, { freq: degreeFreq(pal, -3), partials: [1, 2, 3, 4], weights: [0.3, 1, 0.7, 0.4], decay: p.lastDecay, gain: p.gain });
      }
    },
  },
];

const familyById = new Map(FAMILIES.map((family) => [family.id, family]));

function designParams(family, archetype, seed) {
  const rng = mulberry32(seed);
  return jitterAll(rng, family.bases[archetype], PARAM_SPREAD);
}

function peakAbs(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = Math.abs(samples[i]);
    if (value > peak) peak = value;
  }
  return peak;
}

function findActiveRegion(samples, sampleRate) {
  const peak = peakAbs(samples);
  if (peak === 0) return { start: 0, end: samples.length };
  const onset = peak * dbToGain(ONSET_THRESHOLD_DB);
  const tail = peak * dbToGain(TAIL_THRESHOLD_DB);
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < onset) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < tail) last--;
  const start = Math.max(0, first - Math.round(0.0005 * sampleRate));
  const end = Math.min(samples.length, last + Math.round(0.002 * sampleRate));
  return { start, end };
}

function applyFades(samples, sampleRate, fadeInSeconds, fadeOutSeconds) {
  const fadeIn = Math.min(samples.length >> 1, Math.round(fadeInSeconds * sampleRate));
  const fadeOut = Math.min(samples.length >> 1, Math.round(fadeOutSeconds * sampleRate));
  for (let i = 0; i < fadeIn; i++) samples[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeIn);
  for (let i = 0; i < fadeOut; i++) {
    samples[samples.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeOut);
  }
}

function kWeight(samples) {
  const stages = [
    { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] },
    { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] },
  ];
  let input = samples;
  for (const { b, a } of stages) {
    const output = new Float64Array(input.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < input.length; i++) {
      const x0 = input[i];
      const y0 = b[0] * x0 + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      output[i] = y0;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    }
    input = output;
  }
  return input;
}

const powerToLufs = (power) => -0.691 + 10 * Math.log10(power);

function measureLoudness(samples, sampleRate) {
  if (sampleRate !== 48000) throw new Error('K-weighting coefficients require 48 kHz');
  const weighted = kWeight(samples);
  const block = Math.round(0.05 * sampleRate);
  const hop = Math.round(0.0125 * sampleRate);
  const starts = [];
  if (weighted.length <= block) {
    starts.push(0);
  } else {
    for (let s = 0; s + block <= weighted.length; s += hop) starts.push(s);
    if ((weighted.length - block) % hop !== 0) starts.push(weighted.length - block);
  }
  const powers = starts.map((s) => {
    const end = Math.min(weighted.length, s + block);
    let sum = 0;
    for (let i = s; i < end; i++) sum += weighted[i] * weighted[i];
    return sum / block;
  });
  const absolute = powers.filter((p) => p > 0 && powerToLufs(p) > -70);
  if (!absolute.length) return -Infinity;
  const mean = (list) => list.reduce((acc, p) => acc + p, 0) / list.length;
  const relativeGate = powerToLufs(mean(absolute)) - 10;
  const gated = absolute.filter((p) => powerToLufs(p) > relativeGate);
  return powerToLufs(mean(gated));
}

function finalizeSignal(raw, sampleRate, targetLufs, maxSeconds = MAX_DURATION_SECONDS) {
  for (let i = 0; i < raw.length; i++) {
    if (!Number.isFinite(raw[i])) throw new Error(`Non-finite sample at index ${i} in render`);
  }
  let mean = 0;
  for (let i = 0; i < raw.length; i++) mean += raw[i];
  mean /= raw.length;
  const { start, end } = findActiveRegion(raw, sampleRate);
  let trimmed = raw.slice(start, end);
  for (let i = 0; i < trimmed.length; i++) trimmed[i] -= mean;
  const maxLength = Math.floor(maxSeconds * sampleRate);
  const capped = trimmed.length > maxLength;
  if (capped) trimmed = trimmed.slice(0, maxLength);
  applyFades(trimmed, sampleRate, FADE_IN_SECONDS, capped ? 0.03 : FADE_OUT_SECONDS);

  const loudness = measureLoudness(trimmed, sampleRate);
  const peak = peakAbs(trimmed);
  if (!(peak > 0) || !Number.isFinite(loudness)) throw new Error('Render produced silence');
  let gainDb = targetLufs - loudness;
  let peakLimited = false;
  const ceiling = dbToGain(PEAK_CEILING_DB);
  if (peak * dbToGain(gainDb) > ceiling) {
    gainDb = gainToDb(ceiling / peak);
    peakLimited = true;
  }
  const gain = dbToGain(gainDb);
  const int16 = new Int16Array(trimmed.length);
  const playable = new Float32Array(trimmed.length);
  for (let i = 0; i < trimmed.length; i++) {
    const value = Math.max(-1, Math.min(1, trimmed[i] * gain));
    int16[i] = Math.round(value * 32767);
    playable[i] = int16[i] / 32768;
  }
  return { int16, playable, gainDb, peakLimited, capped };
}

/* ---- The public interface ---- */

/**
 * Renders one preset.
 * @param {{ family: string, archetype: number, seed: number, set?: Object<string, number> }} preset
 *   The lab's identity of a sound, plus optional fixed settings that replace the seeded ones (for example
 *   { notes: 2 }).
 * @param {{ tone?: object, timbre?: object }} [voiceOf] The palette's tone (result family) and timbre (card families).
 * @returns {Promise<{ samples: Float32Array, sampleRate: number, durationMs: number }>}
 */
async function render(preset, voiceOf) {
  const family = familyById.get(preset && preset.family);
  if (!family) throw new Error('Unknown family: ' + (preset && preset.family));
  const archetype = preset.archetype | 0;
  if (archetype < 0 || archetype >= family.archetypes.length) throw new Error('Unknown archetype ' + archetype + ' in ' + family.id);
  const seed = preset.seed >>> 0;
  const params = Object.assign(designParams(family, archetype, seed), preset.set || {});
  const renderSeconds = renderSecondsFor(family);
  const ctx = new OfflineAudioContext(1, Math.round(renderSeconds * SAMPLE_RATE), SAMPLE_RATE);
  const detailRng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const noiseBuffer = createNoiseBuffer(ctx, detailRng, renderSeconds + 1);
  const bus = createMasterBus(ctx);
  const voice = createVoice(ctx, bus, noiseBuffer, detailRng, (voiceOf && voiceOf.timbre) || TIMBRE_NEUTRAL);
  family.perform(voice, params, archetype, (voiceOf && voiceOf.tone) || CLASSIC_TONE);
  const rendered = await ctx.startRendering();
  const raw = new Float32Array(rendered.getChannelData(0));
  const done = finalizeSignal(raw, SAMPLE_RATE, TARGET_LUFS + family.levelOffsetDb, maxSecondsFor(family));
  return { samples: done.playable, sampleRate: SAMPLE_RATE, durationMs: done.playable.length / SAMPLE_RATE * 1000 };
}

/** @type {any} */ (window).KCTSynth = Object.freeze({
  version: 1,
  render,
  /** The families and their archetypes, for checking presets. */
  families: Object.freeze(FAMILIES.map((f) => Object.freeze({ id: f.id, title: f.title, archetypes: Object.freeze(f.archetypes.slice()) }))),
});
})();
