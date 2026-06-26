/**
 * js/utils/calligraphy.js — calligraphy text reveal animation.
 *
 * Makes text appear as if it's being written by hand, letter by letter.
 * Uses a clip-path animation to reveal characters progressively, with
 * a slight wobble on each character for a hand-written feel.
 *
 * Usage:
 *   import { revealText } from "./utils/calligraphy.js";
 *   revealText(document.querySelector(".lead-article__headline"), 2000);
 *   // Text reveals over 2 seconds with a writing animation
 */

/* -------------------------------------------------------------------------
 * Text reveal — shows text character by character
 * ------------------------------------------------------------------------- */

/**
 * Reveal text in an element as if it's being written.
 * @param {HTMLElement} el - The element containing text to reveal
 * @param {number} duration - Total duration in ms (default 2000)
 * @param {number} stagger - Delay between characters in ms (default = duration / text.length)
 */
export function revealText(el, duration = 2000, stagger) {
  if (!el || !el.textContent.trim()) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  const text = el.textContent;
  const chars = Array.from(text);
  const delay = stagger || Math.max(8, duration / chars.length);

  // Wrap each character in a span with a reveal animation
  el.innerHTML = chars
    .map((char, i) => {
      if (char === " ") return " ";
      const escaped = char.replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]
      );
      return `<span class="calligraphy-char" style="animation-delay: ${i * delay}ms">${escaped}</span>`;
    })
    .join("");

  // Add the calligraphy class to trigger the CSS animation
  el.classList.add("calligraphy-active");
}

/**
 * Reveal all paragraphs in a container sequentially.
 * @param {HTMLElement} container - The container with <p> elements
 * @param {number} perCharDelay - Delay between characters in ms
 */
export function revealParagraphs(container, perCharDelay = 20) {
  if (!container) return;
  const paragraphs = container.querySelectorAll("p");
  let totalDelay = 0;

  paragraphs.forEach((p) => {
    const text = p.textContent;
    const charCount = Array.from(text).length;
    const duration = charCount * perCharDelay;

    setTimeout(() => {
      revealText(p, duration, perCharDelay);
    }, totalDelay);

    totalDelay += duration + 200; // 200ms gap between paragraphs
  });
}

/* -------------------------------------------------------------------------
 * Sound effects — paper scratching and printing sounds
 * ------------------------------------------------------------------------- */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Play a short paper-scratch sound using white noise filtered.
 * @param {number} duration - Duration in seconds (default 0.1)
 * @param {number} volume - Volume 0-1 (default 0.05)
 */
export function playPaperScratch(duration = 0.1, volume = 0.05) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  // Create white noise buffer
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  // Filter to make it sound like paper scratching
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
  noise.stop(ctx.currentTime + duration);
}

/**
 * Play a printing press sound (low rumble + click).
 * @param {number} volume - Volume 0-1 (default 0.08)
 */
export function playPrintSound(volume = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  // Low rumble
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 60;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);

  // Click
  setTimeout(() => {
    const click = ctx.createOscillator();
    click.type = "square";
    click.frequency.value = 800;
    const clickGain = ctx.createGain();
    clickGain.gain.value = volume * 0.5;
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start();
    click.stop(ctx.currentTime + 0.03);
  }, 80);
}

/**
 * Initialize scroll-based sound effects.
 * Plays a paper scratch sound when the user scrolls.
 */
export function initScrollSounds() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  let lastScratch = 0;
  const SCRATCH_INTERVAL = 200; // ms between scratch sounds

  let scrollTimeout = null;
  window.addEventListener(
    "scroll",
    () => {
      const now = Date.now();
      if (now - lastScratch > SCRATCH_INTERVAL) {
        playPaperScratch(0.08, 0.03);
        lastScratch = now;
      }

      // Play a print sound when scrolling stops
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        playPrintSound(0.05);
      }, 300);
    },
    { passive: true }
  );
}
