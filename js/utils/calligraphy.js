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
 * Sound effects use the Web Audio API with proper synthesis:
 *   - Paper scratch: layered noise with crackle envelope
 *   - Print sound: mechanical printing press rhythm
 *   - Pen scratch: subtle high-frequency burst synced to writing
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
let soundEnabled = true;

/**
 * Get the existing AudioContext WITHOUT creating one.
 * Returns null if the context hasn't been created yet.
 * This is safe to call from any context (scroll, timer, etc.)
 * because it never creates a new context.
 */
function getAudioCtx() {
  return audioCtx;
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
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(audioCtx.destination);
    }

    // Resume if suspended (Chrome starts contexts suspended)
    if (audioCtx.state === "suspended") {
      const resumePromise = audioCtx.resume();
      // Handle both native Promise and non-Promise resume (older browsers)
      if (resumePromise && typeof resumePromise.then === "function") {
        resumePromise
          .then(function () {
            audioUnlocked = true;
          })
          .catch(function () {
            // Resume failed — context may need another gesture.
            // Don't mark as unlocked; the next gesture will retry.
          });
      } else {
        audioUnlocked = true;
      }
    } else if (audioCtx.state === "running") {
      audioUnlocked = true;
    }
    // If state is "closed" (destroyed), don't set unlocked — can't recover
  } catch {
    // AudioContext not supported or blocked — fail silently
  }
}

// Register unlock listeners on user gestures only.
// Chrome treats click and touchstart as trusted gestures for AudioContext.
// keydown/pointerdown are NOT reliable — Tab navigation, arrow keys, etc.
// don't count as gestures and trigger the console warning.
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
 * Sound synthesis
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
    // Pink noise: filtered white noise, -3dB/octave
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
    // Brown noise: integrated white noise, -6dB/octave
    let last = 0;
    for (let j = 0; j < length; j++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[j] = last * 3.5;
    }
  } else {
    // White noise
    for (let k = 0; k < length; k++) {
      data[k] = Math.random() * 2 - 1;
    }
  }

  return buffer;
}

/**
 * Play a realistic paper-scratch sound.
 * Layers pink noise (paper texture) with a highpass-filtered white noise
 * (the scratch itself) and a subtle crackle envelope.
 *
 * @param {number} duration - seconds (default 0.12)
 * @param {number} volume - 0-1 (default 0.04)
 */
export function playPaperScratch(duration, volume) {
  if (!soundEnabled || !audioUnlocked) return;
  duration = duration || 0.12;
  volume = volume || 0.04;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Layer 1: Pink noise through bandpass (the paper texture body)
  const pinkBuf = createNoiseBuffer(ctx, duration, "pink");
  const pink = ctx.createBufferSource();
  pink.buffer = pinkBuf;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2500;
  bandpass.Q.value = 0.8;

  const pinkGain = ctx.createGain();
  pinkGain.gain.setValueAtTime(0, now);
  pinkGain.gain.linearRampToValueAtTime(volume * 0.6, now + 0.01);
  pinkGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  pink.connect(bandpass);
  bandpass.connect(pinkGain);
  pinkGain.connect(masterGain);
  pink.start(now);
  pink.stop(now + duration);

  // Layer 2: White noise through highpass (the sharp scratch)
  const whiteBuf = createNoiseBuffer(ctx, duration * 0.7, "white");
  const white = ctx.createBufferSource();
  white.buffer = whiteBuf;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 4000;
  highpass.Q.value = 1.2;

  const whiteGain = ctx.createGain();
  whiteGain.gain.setValueAtTime(0, now);
  whiteGain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.005);
  whiteGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

  white.connect(highpass);
  highpass.connect(whiteGain);
  whiteGain.connect(masterGain);
  white.start(now);
  white.stop(now + duration * 0.7);

  // Layer 3: Subtle crackle (a few random transient clicks)
  const crackleCount = Math.floor(duration * 30);
  for (let c = 0; c < crackleCount; c++) {
    const clickTime = now + Math.random() * duration;
    const click = ctx.createOscillator();
    click.type = "square";
    click.frequency.value = 2000 + Math.random() * 3000;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0, clickTime);
    clickGain.gain.linearRampToValueAtTime(volume * 0.08, clickTime + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.003);
    click.connect(clickGain);
    clickGain.connect(masterGain);
    click.start(clickTime);
    click.stop(clickTime + 0.004);
  }
}

/**
 * Play a printing press sound: low rumble + mechanical rhythm + impact.
 * Simulates a letterpress machine: the motor hum, the plate coming down,
 * and the ink transfer.
 *
 * @param {number} volume - 0-1 (default 0.06)
 */
export function playPrintSound(volume) {
  if (!soundEnabled || !audioUnlocked) return;
  volume = volume || 0.06;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Low rumble: the motor / press mechanism
  const rumbleOsc = ctx.createOscillator();
  rumbleOsc.type = "sawtooth";
  rumbleOsc.frequency.setValueAtTime(55, now);
  rumbleOsc.frequency.linearRampToValueAtTime(48, now + 0.18);

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0, now);
  rumbleGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.03);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 120;

  rumbleOsc.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(masterGain);
  rumbleOsc.start(now);
  rumbleOsc.stop(now + 0.18);

  // 2. Mechanical rhythm: 2-3 quick thuds (the plate coming down)
  const thudTimes = [0.06, 0.1, 0.14];
  thudTimes.forEach(function (t, idx) {
    const thudTime = now + t;
    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(120, thudTime);
    thud.frequency.exponentialRampToValueAtTime(40, thudTime + 0.04);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0, thudTime);
    thudGain.gain.linearRampToValueAtTime(volume * (0.4 - idx * 0.1), thudTime + 0.005);
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.05);

    thud.connect(thudGain);
    thudGain.connect(masterGain);
    thud.start(thudTime);
    thud.stop(thudTime + 0.06);
  });

  // 3. Ink transfer: a short noise burst (the ink hitting paper)
  const inkTime = now + 0.12;
  const inkBuf = createNoiseBuffer(ctx, 0.08, "brown");
  const ink = ctx.createBufferSource();
  ink.buffer = inkBuf;

  const inkFilter = ctx.createBiquadFilter();
  inkFilter.type = "lowpass";
  inkFilter.frequency.value = 800;

  const inkGain = ctx.createGain();
  inkGain.gain.setValueAtTime(0, inkTime);
  inkGain.gain.linearRampToValueAtTime(volume * 0.3, inkTime + 0.01);
  inkGain.gain.exponentialRampToValueAtTime(0.001, inkTime + 0.08);

  ink.connect(inkFilter);
  inkFilter.connect(inkGain);
  inkGain.connect(masterGain);
  ink.start(inkTime);
  ink.stop(inkTime + 0.08);
}

/**
 * Play a very subtle pen-scratch sound for calligraphy.
 * This is intentionally quiet and short — it's the sound of a pen
 * nib scratching across paper, synced to each character reveal.
 *
 * @param {number} volume - 0-1 (default 0.015)
 */
export function playPenScratch(volume) {
  if (!soundEnabled || !audioUnlocked) return;
  volume = volume || 0.015;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const dur = 0.04 + Math.random() * 0.02;

  // Very short burst of highpass-filtered noise
  const buf = createNoiseBuffer(ctx, dur, "white");
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6000;
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start(now);
  src.stop(now + dur);
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
      // Play pen scratch for this character
      (function (d) {
        setTimeout(function () {
          playPenScratch(0.008 + Math.random() * 0.006);
        }, d);
      })(soundDelay);

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
