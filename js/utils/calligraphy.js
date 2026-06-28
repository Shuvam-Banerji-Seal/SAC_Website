/**
 * js/utils/calligraphy.js — calligraphy text reveal animation + sound effects.
 *
 * The reveal simulates ink being written onto paper, character by character.
 * Each character:
 *   - Is wrapped in a span with a clip-path that reveals left-to-right
 *   - Gets a subtle rotation wobble (hand-pressured variance)
 *   - Has an ink-bleed shadow that fades in slightly after the char
 *   - Optionally triggers a very subtle pen-scratch sound
 *
 * The speed varies per character type:
 *   - Spaces and punctuation: fast (the pen lifts between words)
 *   - Lowercase letters: normal
 *   - Uppercase letters: slower (more ink, more pressure)
 *   - First char of a word: slight delay (pen positioning)
 *
 * Sound design
 * ------------
 * All audio is synthesised via the Web Audio API — no external files.
 * The processing chain:
 *
 *   source → filter → gain → panner → dryGain ─┐
 *                                    → reverbSend → reverb → reverbGain → compressor → destination
 *
 *   - DryGain: 100% of the direct signal
 *   - Reverb: 25–35% wet mix via ConvolverNode (synthesised paper-room IR)
 *   - Compressor: DynamicsCompressorNode prevents clipping, glues layers
 *   - Panner: StereoPannerNode for spatial variation per sound
 *
 * AudioContext is only created/resumed on first user gesture (browsers
 * block audio without interaction). We listen for the first click/touch/
 * keydown and resume the context then.
 */

/* -------------------------------------------------------------------------
 * Audio system — lazy init, gesture-unlocked
 *
 * CRITICAL: The AudioContext must only be CREATED inside unlockAudio(),
 * which is triggered by a user gesture (click/touch/keydown/pointerdown).
 * Browsers block AudioContext creation from non-gesture contexts (scroll,
 * page load, setTimeout). If we create it early, the browser refuses and
 * all subsequent sound calls silently fail.
 *
 * All sound functions check `audioUnlocked` BEFORE calling getAudioCtx().
 * If audio isn't unlocked yet, they return immediately — no sound, but
 * no console warning either.
 * ------------------------------------------------------------------------- */

let audioCtx = null;
let audioUnlocked = false;
let masterGain = null;
/** @type {DynamicsCompressorNode|null} */
let compressor = null;
/** @type {ConvolverNode|null} */
let reverbNode = null;
/** @type {GainNode|null} */
let reverbWet = null;
/** @type {GainNode|null} */
let dryGain = null;
let soundEnabled = true;

/**
 * Synthesise a small-room impulse response for the reverb convolver.
 * Creates a short (0.35s) stereo noise burst with exponential decay
 * and early reflections — simulating a paper-laden room.
 */
function createReverbIR(ctx) {
  const sampleRate = ctx.sampleRate;
  const duration = 0.35;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Exponential decay with a fast initial drop (early reflections)
    const decay = Math.exp(-t * 28) * (1 - t / duration);
    const noiseL = Math.random() * 2 - 1;
    const noiseR = Math.random() * 2 - 1;
    // Subtle stereo spread in the tail
    const spread = 0.15 * (1 - Math.exp(-t * 10));
    left[i] = noiseL * decay * (0.5 + spread);
    right[i] = noiseR * decay * (0.5 - spread);
  }
  return buffer;
}

/**
 * Get the existing AudioContext WITHOUT creating one.
 * Returns null if the context hasn't been created yet.
 */
function getAudioCtx() {
  return audioCtx;
}

/**
 * Connect a source node to the master processing chain.
 * Routes it through both the dry path and the reverb send.
 */
function connectToMaster(source) {
  if (!compressor) return;
  source.connect(dryGain);
  if (reverbSend) source.connect(reverbSend);
}

/** Shared gain for reverb send — one node all sounds connect to. */
let reverbSend = null;

/**
 * Build the master processing chain:
 *   dryGain → compressor → destination
 *   reverbSend → reverbNode → reverbWet → compressor → destination
 *
 * Called once when the AudioContext is first created.
 */
function buildMasterChain(ctx) {
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.65;

  // Dry path
  dryGain = ctx.createGain();
  dryGain.gain.value = 1.0;

  // Compressor — glues layers together, prevents harsh transients
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 10;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;

  // Reverb
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.55; // 55% signal sent to reverb
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = createReverbIR(ctx);
  reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.4; // 40% wet mix of the reverb return

  // Chain: dryGain → compressor → destination
  dryGain.connect(compressor);
  // Chain: reverbSend → reverbNode → reverbWet → compressor → destination
  reverbSend.connect(reverbNode);
  reverbNode.connect(reverbWet);
  reverbWet.connect(compressor);
  // Chain: masterGain → compressor (for sounds that want extra gain stage)
  masterGain.connect(compressor);
  compressor.connect(ctx.destination);
}

/**
 * Create and resume the AudioContext. This MUST be called from a user
 * gesture handler (click, touchstart). Browsers will block AudioContext
 * creation/resumption from non-gesture contexts.
 */
function unlockAudio() {
  if (audioUnlocked) return;

  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    // Create the context — this is allowed because we're in a gesture handler
    if (!audioCtx) {
      audioCtx = new AC();
      buildMasterChain(audioCtx);
    }

    // Resume if suspended (Chrome starts contexts suspended)
    if (audioCtx.state === "suspended") {
      const resumePromise = audioCtx.resume();
      if (resumePromise && typeof resumePromise.then === "function") {
        resumePromise
          .then(function () {
            audioUnlocked = true;
          })
          .catch(function () {
            // Resume failed — context may need another gesture.
          });
      } else {
        audioUnlocked = true;
      }
    } else if (audioCtx.state === "running") {
      audioUnlocked = true;
    }
  } catch {
    // AudioContext not supported or blocked — fail silently
  }
}

// Register unlock listeners on user gestures only.
if (typeof window !== "undefined") {
  document.addEventListener("click", unlockAudio, { once: true, passive: true });
  document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
}

/**
 * Enable or disable sound effects globally.
 * @param {boolean} enabled
 */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

/* -------------------------------------------------------------------------
 * Sound synthesis helpers
 * ------------------------------------------------------------------------- */

/**
 * Create a noise buffer of the given duration.
 * @param {AudioContext} ctx
 * @param {number} duration - seconds
 * @param {string} type - "white" | "pink" | "brown"
 * @returns {AudioBuffer}
 */
function createNoiseBuffer(ctx, duration, type) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "pink") {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else if (type === "brown") {
    let last = 0;
    for (let j = 0; j < length; j++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[j] = last * 3.5;
    }
  } else {
    for (let k = 0; k < length; k++) {
      data[k] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

/**
 * Apply an ADSR-like gain envelope to a GainNode.
 * @param {AudioParam} gain
 * @param {number} now
 * @param {number} attack - seconds to peak
 * @param {number} hold - seconds at peak
 * @param {number} release - seconds to fade
 * @param {number} peak - peak gain value (0-1)
 */
function applyEnvelope(gain, now, attack, hold, release, peak) {
  gain.setValueAtTime(0, now);
  gain.linearRampToValueAtTime(peak, now + attack);
  // Slight dip after attack for natural feel
  gain.setValueAtTime(peak, now + attack + hold);
  gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
}

/* -------------------------------------------------------------------------
 * Sound: Paper scratch (scroll) — stereo, filtered, reverberant
 *
 * A realistic paper-texture sound when the user scrolls.
 * Layers:
 *   1. Pink noise through bandpass (paper body) — filter sweeps from
 *      mid to low as the paper depresses
 *   2. White noise through highpass (sharp scratch transient)
 *   3. Subtle crackle clicks (fibre snapping)
 *   4. Low-frequency thud (the paper bed)
 * ------------------------------------------------------------------------- */

/**
 * Play a realistic paper-scratch sound.
 * @param {number} duration - seconds (default 0.14)
 * @param {number} volume - 0-1 (default 0.04)
 */
export function playPaperScratch(duration, volume) {
  if (!soundEnabled || !audioUnlocked) return;
  duration = duration || 0.14;
  volume = volume || 0.04;
  const ctx = getAudioCtx();
  if (!ctx || !compressor) return;

  const now = ctx.currentTime;

  // ── Layer 1: Pink noise with sweeping bandpass ──
  const pinkBuf = createNoiseBuffer(ctx, duration, "pink");
  const pink = ctx.createBufferSource();
  pink.buffer = pinkBuf;

  const bpFilter = ctx.createBiquadFilter();
  bpFilter.type = "bandpass";
  bpFilter.frequency.setValueAtTime(3200, now);
  bpFilter.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.7);
  bpFilter.Q.value = 1.2;

  const pinkGain = ctx.createGain();
  applyEnvelope(pinkGain.gain, now, 0.008, 0.02, duration * 0.8, volume * 0.5);

  pink.connect(bpFilter);
  bpFilter.connect(pinkGain);
  connectToMaster(pinkGain);
  pink.start(now);
  pink.stop(now + duration + 0.01);

  // ── Layer 2: White noise — sharp scratch transient ──
  const scratchDur = duration * 0.5;
  const whiteBuf = createNoiseBuffer(ctx, scratchDur, "white");
  const white = ctx.createBufferSource();
  white.buffer = whiteBuf;

  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = "highpass";
  hpFilter.frequency.value = 5000;
  hpFilter.Q.value = 0.8;

  const whiteGain = ctx.createGain();
  applyEnvelope(whiteGain.gain, now, 0.003, 0.01, scratchDur * 0.7, volume * 0.35);

  white.connect(hpFilter);
  hpFilter.connect(whiteGain);
  connectToMaster(whiteGain);
  white.start(now);
  white.stop(now + scratchDur + 0.01);

  // ── Layer 3: Subtle crackle clicks ──
  const crackleCount = Math.max(2, Math.floor(duration * 28));
  for (let c = 0; c < crackleCount; c++) {
    const clickTime = now + Math.random() * duration * 0.8;
    const click = ctx.createOscillator();
    click.type = "square";
    click.frequency.value = 1500 + Math.random() * 2500;

    const clickGain = ctx.createGain();
    applyEnvelope(clickGain.gain, clickTime, 0.0005, 0.001, 0.002, volume * 0.12);

    click.connect(clickGain);
    connectToMaster(clickGain);
    click.start(clickTime);
    click.stop(clickTime + 0.004);
  }

  // ── Layer 4: Low thud (paper bed) — only on louder scratches ──
  if (volume > 0.025) {
    const thudTime = now + 0.005;
    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(80, thudTime);
    thud.frequency.exponentialRampToValueAtTime(40, thudTime + 0.04);

    const thudGain = ctx.createGain();
    applyEnvelope(thudGain.gain, thudTime, 0.004, 0.008, 0.035, volume * 0.15);

    thud.connect(thudGain);
    connectToMaster(thudGain);
    thud.start(thudTime);
    thud.stop(thudTime + 0.05);
  }

  // ── Stereo spatialisation is handled by the reverb's stereo IR,
  // which gives a subtle left–right spread to the entire composite.
  // Per-layer panning was considered but adds complexity without
  // noticeable improvement at these volumes.
}

/* -------------------------------------------------------------------------
 * Sound: Printing press (loader) — rich mechanical synthesis
 *
 * Simulates a letterpress machine: motor hum, plate descent, impact,
 * and ink transfer. Richer than the previous version:
 *   - Dual-oscillator rumble (fifth interval) for harmonic warmth
 *   - AM noise (gear/crank chatter)
 *   - Sharp impact transient (plate hitting the bed)
 *   - Reverb through master chain
 * ------------------------------------------------------------------------- */

/**
 * Play a printing press sound.
 * @param {number} volume - 0-1 (default 0.07)
 */
export function playPrintSound(volume) {
  if (!soundEnabled || !audioUnlocked) return;
  volume = volume || 0.07;
  const ctx = getAudioCtx();
  if (!ctx || !compressor) return;

  const now = ctx.currentTime;

  // ── 1. Dual-oscillator rumble (motor / mechanism) ──
  // Two oscillators a fifth apart for harmonic richness
  const rumbleOsc1 = ctx.createOscillator();
  rumbleOsc1.type = "sawtooth";
  rumbleOsc1.frequency.setValueAtTime(55, now);
  rumbleOsc1.frequency.linearRampToValueAtTime(48, now + 0.2);

  const rumbleOsc2 = ctx.createOscillator();
  rumbleOsc2.type = "sawtooth";
  rumbleOsc2.frequency.setValueAtTime(82, now); // ~fifth above 55Hz
  rumbleOsc2.frequency.linearRampToValueAtTime(72, now + 0.2);

  const rumbleSum = ctx.createGain();
  rumbleSum.gain.value = 1;

  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 160;

  const rumbleGain = ctx.createGain();
  applyEnvelope(rumbleGain.gain, now, 0.02, 0.05, 0.15, volume * 0.4);

  rumbleOsc1.connect(rumbleSum);
  rumbleOsc2.connect(rumbleSum);
  rumbleSum.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  connectToMaster(rumbleGain);
  rumbleOsc1.start(now);
  rumbleOsc1.stop(now + 0.25);
  rumbleOsc2.start(now);
  rumbleOsc2.stop(now + 0.25);

  // ── 2. AM noise — gear/crank chatter ──
  const chatterDur = 0.18;
  const noiseBuf = createNoiseBuffer(ctx, chatterDur, "brown");
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  // Amplitude modulation: LFO oscillating the gain
  const chatterLfo = ctx.createOscillator();
  chatterLfo.type = "square";
  chatterLfo.frequency.value = 24; // 24 Hz — fast mechanical chatter

  const chatterMod = ctx.createGain();
  chatterMod.gain.value = 1;

  const chatterGain = ctx.createGain();
  applyEnvelope(chatterGain.gain, now, 0.01, 0.02, 0.12, volume * 0.12);

  const chatterFilter = ctx.createBiquadFilter();
  chatterFilter.type = "bandpass";
  chatterFilter.frequency.value = 400;
  chatterFilter.Q.value = 1.5;

  noiseSrc.connect(chatterFilter);
  chatterFilter.connect(chatterGain);
  // Modulate the gain via LFO
  chatterLfo.connect(chatterMod.gain);
  chatterMod.gain.setValueAtTime(0.3, now);
  chatterGain.gain.setValueAtTime(volume * 0.12, now);
  // Connect modulated gain
  chatterGain.connect(chatterMod);
  connectToMaster(chatterMod);
  chatterLfo.start(now);
  chatterLfo.stop(now + chatterDur + 0.01);
  noiseSrc.start(now);
  noiseSrc.stop(now + chatterDur + 0.01);

  // ── 3. Mechanical thuds (plate descent) ──
  [0.04, 0.09, 0.13].forEach(function (t, idx) {
    const thudTime = now + t;
    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(140 - idx * 25, thudTime);
    thud.frequency.exponentialRampToValueAtTime(40, thudTime + 0.05);

    const thudGain = ctx.createGain();
    applyEnvelope(thudGain.gain, thudTime, 0.004, 0.006, 0.04, volume * (0.35 - idx * 0.08));

    thud.connect(thudGain);
    connectToMaster(thudGain);
    thud.start(thudTime);
    thud.stop(thudTime + 0.06);
  });

  // ── 4. Impact transient (plate hits bed) ──
  const impactTime = now + 0.14;
  const impactBuf = createNoiseBuffer(ctx, 0.015, "white");
  const impact = ctx.createBufferSource();
  impact.buffer = impactBuf;

  const impactHP = ctx.createBiquadFilter();
  impactHP.type = "highpass";
  impactHP.frequency.value = 2000;

  const impactGain = ctx.createGain();
  applyEnvelope(impactGain.gain, impactTime, 0.001, 0.002, 0.012, volume * 0.5);

  impact.connect(impactHP);
  impactHP.connect(impactGain);
  connectToMaster(impactGain);
  impact.start(impactTime);
  impact.stop(impactTime + 0.02);

  // ── 5. Ink transfer (noise burst) ──
  const inkTime = now + 0.15;
  const inkBuf = createNoiseBuffer(ctx, 0.08, "brown");
  const ink = ctx.createBufferSource();
  ink.buffer = inkBuf;

  const inkFilter = ctx.createBiquadFilter();
  inkFilter.type = "lowpass";
  inkFilter.frequency.value = 600;

  const inkGain = ctx.createGain();
  applyEnvelope(inkGain.gain, inkTime, 0.008, 0.01, 0.06, volume * 0.25);

  ink.connect(inkFilter);
  inkFilter.connect(inkGain);
  connectToMaster(inkGain);
  ink.start(inkTime);
  ink.stop(inkTime + 0.09);
}

/* -------------------------------------------------------------------------
 * Sound: Pen scratch (calligraphy) — character-type-aware synthesis
 *
 * A subtle nib-on-paper sound synced to each character reveal.
 * Varies by character type:
 *   - Uppercase: fuller, slightly lower frequency (wider nib stroke)
 *   - Lowercase: lighter, higher frequency
 *   - Punctuation: quick tick
 *   - Numbers: moderate, with a slight metallic edge
 * ------------------------------------------------------------------------- */

/**
 * Play a pen-scratch sound for calligraphy.
 * @param {number} volume - 0-1 (default 0.018)
 * @param {string} charType - "upper"|"lower"|"punct"|"digit"|"other"
 */
export function playPenScratch(volume, charType) {
  if (!soundEnabled || !audioUnlocked) return;
  volume = volume || 0.018;
  const ctx = getAudioCtx();
  if (!ctx || !compressor) return;

  const now = ctx.currentTime;

  // Vary parameters by character type
  let cutoffFreq, q, dur, volScale;
  switch (charType) {
    case "upper":
      cutoffFreq = 4000;
      q = 1.2;
      dur = 0.06;
      volScale = 1.2;
      break;
    case "punct":
      cutoffFreq = 7000;
      q = 2;
      dur = 0.025;
      volScale = 0.6;
      break;
    case "digit":
      cutoffFreq = 5000;
      q = 1.5;
      dur = 0.045;
      volScale = 0.9;
      break;
    default:
      // lowercase / other
      cutoffFreq = 6000;
      q = 1.8;
      dur = 0.04;
      volScale = 1.0;
  }

  // Slight randomisation per stroke
  dur += Math.random() * 0.015;
  const actualVol = volume * volScale * (0.85 + Math.random() * 0.3);

  // White noise burst through highpass filter
  const buf = createNoiseBuffer(ctx, dur, "white");
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = cutoffFreq;
  filter.Q.value = q;

  const gain = ctx.createGain();
  applyEnvelope(gain.gain, now, 0.002, 0.003, dur * 0.6, actualVol);

  src.connect(filter);
  filter.connect(gain);
  connectToMaster(gain);
  src.start(now);
  src.stop(now + dur + 0.01);
}

/* -------------------------------------------------------------------------
 * Text reveal — calligraphy writing animation
 * ------------------------------------------------------------------------- */

/**
 * Determine the per-character delay based on character type.
 * This simulates the variable speed of handwriting:
 *   - Spaces are fast (pen lifts between words)
 *   - Punctuation is fast (pen taps)
 *   - Lowercase letters are normal speed
 *   - Uppercase letters are slower (more ink, more pressure)
 *
 * @param {string} char
 * @returns {number} multiplier (0.3 = fast, 1.0 = normal, 1.5 = slow)
 */
function charSpeedMultiplier(char) {
  if (char === " ") return 0.25;
  if (/[.,;:!?—–\-'""')()[\]/]/.test(char)) return 0.4;
  if (/[A-Z]/.test(char)) return 1.4;
  if (/[0-9]/.test(char)) return 1.2;
  return 1.0;
}

/**
 * Determine a per-character rotation wobble.
 * This simulates the slight pressure variance of a pen.
 *
 * @param {string} char
 * @param {number} index
 * @returns {number} degrees (-3 to +3)
 */
function charWobble(char, index) {
  if (char === " ") return 0;
  // Deterministic pseudo-random based on index
  const seed = (index * 73 + char.charCodeAt(0) * 37) % 180;
  return (seed / 180 - 0.5) * 4; // -2 to +2 degrees
}

/**
 * Reveal text in an element as if it's being written by hand.
 *
 * Each character is wrapped in a span with:
 *   - A clip-path that reveals left-to-right (simulating pen movement)
 *   - A subtle rotation wobble (hand pressure variance)
 *   - An ink-bleed shadow that fades in after the character
 *   - An optional pen-scratch sound synced to the reveal
 *
 * @param {HTMLElement} el - The element containing text to reveal
 * @param {number} duration - Total duration in ms (default 2000)
 * @param {number} stagger - Base delay between characters in ms
 * @param {Object} opts - { sound: boolean, inkTrail: boolean }
 */
export function revealText(el, duration, stagger, opts) {
  if (!el || !el.textContent.trim()) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  opts = opts || {};
  const enableSound = opts.sound !== false;
  const enableTrail = opts.trail !== false;

  const text = el.textContent;
  const chars = Array.from(text);
  const baseDelay = stagger || Math.max(12, (duration || 2000) / chars.length);

  // Build the HTML: each character wrapped in a calligraphy-char span
  // with a nested ink-bleed span for the shadow effect.
  let html = "";
  let cumulativeDelay = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (char === " ") {
      html += " ";
      cumulativeDelay += baseDelay * 0.25;
      continue;
    }

    const escaped = char.replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });

    const speedMult = charSpeedMultiplier(char);
    const charDelay = cumulativeDelay;
    const wobble = charWobble(char, i);

    // Each char span gets:
    //   --char-delay: the cumulative delay (ms)
    //   --char-wobble: the rotation wobble (deg)
    //   --char-speed: the reveal duration multiplier
    html +=
      '<span class="calligraphy-char" style="' +
      "--char-delay:" +
      charDelay +
      "ms;" +
      "--char-wobble:" +
      wobble.toFixed(2) +
      "deg;" +
      "--char-speed:" +
      speedMult.toFixed(2) +
      ";" +
      '">' +
      '<span class="calligraphy-char__ink">' +
      escaped +
      "</span>" +
      (enableTrail
        ? '<span class="calligraphy-char__bleed" aria-hidden="true">' + escaped + "</span>"
        : "") +
      "</span>";

    cumulativeDelay += baseDelay * speedMult;
  }

  el.innerHTML = html;
  el.classList.add("calligraphy-active");

  // Schedule pen-scratch sounds synced to each character reveal
  if (enableSound && audioUnlocked) {
    let soundDelay = 0;
    for (let s = 0; s < chars.length; s++) {
      const ch = chars[s];
      if (ch === " ") {
        soundDelay += baseDelay * 0.25;
        continue;
      }
      // Determine character type for sound variation
      let charType = "other";
      if (/[A-Z]/.test(ch)) charType = "upper";
      else if (/[a-z]/.test(ch)) charType = "lower";
      else if (/[.,;:!?—–\-'""')()[\]/]/.test(ch)) charType = "punct";
      else if (/[0-9]/.test(ch)) charType = "digit";
      // Per-iteration let binds the correct delay, volume, and type
      const _delay = soundDelay;
      const _vol = 0.008 + Math.random() * 0.006;
      setTimeout(function () {
        playPenScratch(_vol, charType);
      }, _delay);

      soundDelay += baseDelay * charSpeedMultiplier(ch);
    }
  }
}

/**
 * Reveal all paragraphs in a container sequentially.
 * @param {HTMLElement} container - The container with <p> elements
 * @param {number} perCharDelay - Delay between characters in ms
 */
export function revealParagraphs(container, perCharDelay) {
  if (!container) return;
  perCharDelay = perCharDelay || 20;
  const paragraphs = container.querySelectorAll("p");
  let totalDelay = 0;

  paragraphs.forEach(function (p) {
    const text = p.textContent;
    const charCount = Array.from(text).length;
    const duration = charCount * perCharDelay;

    setTimeout(function () {
      revealText(p, duration, perCharDelay);
    }, totalDelay);

    totalDelay += duration + 300; // 300ms gap between paragraphs
  });
}

/* -------------------------------------------------------------------------
 * Scroll-based sound effects
 * ------------------------------------------------------------------------- */

/**
 * Initialize scroll-based paper scratch sounds.
 *
 * Plays a subtle paper scratch when the user scrolls, with:
 *   - Velocity-based volume (faster scroll = louder)
 *   - 400ms minimum interval between sounds
 *   - No sound on programmatic scroll or very slow drift
 *   - No print-on-stop (the old behavior was confusing)
 */
export function initScrollSounds() {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Guard: prevent double-binding when called from both home.js and club-images.js
  if (window.__sacScrollSoundsBound) return;
  window.__sacScrollSoundsBound = true;

  let lastScratch = 0;
  let lastScrollY = window.scrollY || 0;
  const SCRATCH_INTERVAL = 400; // ms between scratch sounds

  window.addEventListener(
    "scroll",
    function () {
      const now = Date.now();
      const currentY = window.scrollY || 0;
      const velocity = Math.abs(currentY - lastScrollY);
      lastScrollY = currentY;

      // Only play if scrolling fast enough and enough time has passed
      if (now - lastScratch > SCRATCH_INTERVAL && velocity > 3) {
        // Volume scales with velocity, capped at 0.04
        const vol = Math.min(0.04, 0.01 + velocity * 0.002);
        const dur = Math.min(0.15, 0.06 + velocity * 0.003);
        playPaperScratch(dur, vol);
        lastScratch = now;
      }
    },
    { passive: true }
  );
}
