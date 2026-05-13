/**
 * SAC IISER Kolkata — Fluid Text Animation System
 *
 * Implements five text animation presets using GSAP SplitText and anime.js.
 * All animations support scroll-triggering via GSAP ScrollTrigger.
 * Text is always readable as plain-text fallback if JS fails.
 *
 * Usage: Add data-text-anim="splitReveal" (or other preset) to any element.
 *   <h1 data-text-anim="splitReveal">Where Knowledge Meets Curiosity</h1>
 */

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate } from 'animejs';

// Register GSAP plugins
gsap.registerPlugin(SplitText, ScrollTrigger);

/**
 * Common animation options:
 * { delay, duration, stagger, ease, trigger }
 * trigger: 'viewport' (default, scroll-based) | 'immediate' | 'manual'
 */

// ===== 1. splitReveal =====
// Characters animate in from below with rotation and blur
export function splitReveal(element, options = {}) {
  const {
    delay = 0,
    duration = 0.8,
    stagger = 0.03,
    ease = 'power3.out',
    trigger = 'viewport',
  } = options;

  // Plain-text fallback: ensure text is visible
  element.style.visibility = 'visible';

  const runAnimation = () => {
    // Split text into characters using GSAP SplitText
    const split = new SplitText(element, { type: 'chars' });
    const chars = split.chars;

    // Set initial state
    gsap.set(chars, {
      y: '100%',
      rotationX: -90,
      opacity: 0,
      filter: 'blur(8px)',
    });

    // Animate in
    gsap.to(chars, {
      y: '0%',
      rotationX: 0,
      opacity: 1,
      filter: 'blur(0px)',
      duration,
      stagger,
      ease,
      delay,
      onComplete: () => split.revert(), // Revert to let GSAP clean up
    });
  };

  if (trigger === 'viewport') {
    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none none',
      onEnter: runAnimation,
    });
  } else {
    runAnimation();
  }

  return { revert: () => gsap.set(element, { clearProps: 'all' }) };
}

// ===== 2. lineWipe =====
// Each line revealed by a clip-path wipe from left to right
export function lineWipe(element, options = {}) {
  const {
    delay = 0,
    duration = 0.6,
    stagger = 0.15,
    ease = 'power2.inOut',
    trigger = 'viewport',
  } = options;

  const runAnimation = () => {
    const split = new SplitText(element, { type: 'lines' });
    const lines = split.lines;

    gsap.set(lines, {
      clipPath: 'inset(0 100% 0 0)',
    });

    gsap.to(lines, {
      clipPath: 'inset(0 0% 0 0)',
      duration,
      stagger,
      ease,
      delay,
      onComplete: () => split.revert(),
    });
  };

  if (trigger === 'viewport') {
    ScrollTrigger.create({
      trigger: element,
      start: 'top 80%',
      toggleActions: 'play none none none',
      onEnter: runAnimation,
    });
  } else {
    runAnimation();
  }

  return { revert: () => gsap.set(element, { clearProps: 'all' }) };
}

// ===== 3. letterFloat =====
// Characters float in from random Y offsets with spring easing
export function letterFloat(element, options = {}) {
  const {
    delay = 0,
    duration = 1.0,
    stagger = 0.04,
    ease = 'elastic.out(1, 0.5)',
    trigger = 'viewport',
  } = options;

  const runAnimation = () => {
    const split = new SplitText(element, { type: 'chars' });
    const chars = split.chars;

    gsap.set(chars, {
      y: () => -50 - Math.random() * 80,
      opacity: 0,
      rotation: () => (Math.random() - 0.5) * 30,
    });

    gsap.to(chars, {
      y: 0,
      opacity: 1,
      rotation: 0,
      duration,
      stagger,
      ease,
      delay,
      onComplete: () => split.revert(),
    });
  };

  if (trigger === 'viewport') {
    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none none',
      onEnter: runAnimation,
    });
  } else {
    runAnimation();
  }

  return { revert: () => gsap.set(element, { clearProps: 'all' }) };
}

// ===== 4. wordScramble =====
// Cycles through random characters before settling (decryption effect)
export function wordScramble(element, options = {}) {
  const {
    delay = 0,
    duration = 1.5,
    stagger = 0.06,
    ease = 'power2.inOut',
    trigger = 'viewport',
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*0123456789',
  } = options;

  const runAnimation = () => {
    const split = new SplitText(element, { type: 'chars' });
    const chars = split.chars;
    const originalTexts = chars.map((c) => c.textContent);

    gsap.to(chars, {
      duration: duration * 0.6,
      stagger,
      ease: 'steps(6)',
      delay,
      innerHTML: () => charset[Math.floor(Math.random() * charset.length)],
      onComplete: () => {
        // Settle on actual text
        gsap.to(chars, {
          duration: duration * 0.4,
          stagger,
          ease,
          innerHTML: (i) => originalTexts[i],
        });
      },
      onCompleteParams: [chars, originalTexts],
    });

    // Store for cleanup
    return () => split.revert();
  };

  if (trigger === 'viewport') {
    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none none',
      onEnter: runAnimation,
    });
  } else {
    runAnimation();
  }

  return { revert: () => gsap.set(element, { clearProps: 'all' }) };
}

// ===== 5. typewriter =====
// Classic monospace typewriter with blinking cursor
export function typewriter(element, options = {}) {
  const {
    delay = 0,
    duration = 1.5,
    trigger = 'viewport',
    cursor = true,
    cursorChar = '|',
    cursorBlinkSpeed = 500,
  } = options;

  const runAnimation = () => {
    const text = element.textContent;
    element.textContent = '';

    // Create cursor span
    let cursorEl = null;
    if (cursor) {
      cursorEl = document.createElement('span');
      cursorEl.textContent = cursorChar;
      cursorEl.style.borderRight = '2px solid currentColor';
      cursorEl.style.animation = `typewriterBlink ${cursorBlinkSpeed}ms step-end infinite`;
      element.appendChild(cursorEl);
    }

    // Use anime.js for precise character typing
    animate(
      { progress: [0, 100] },
      {
        targets: { progress: 0 },
        duration,
        easing: 'steps(20)',
        delay,
        update: (anim) => {
          const charsToShow = Math.ceil((anim.animations[0].current / 100) * text.length);
          element.textContent = text.substring(0, charsToShow);
          if (cursorEl) element.appendChild(cursorEl);
        },
        complete: () => {
          if (cursorEl) {
            cursorEl.style.animation = 'none';
            cursorEl.textContent = '';
            setTimeout(() => {
              if (cursorEl && cursorEl.parentNode) {
                cursorEl.parentNode.removeChild(cursorEl);
              }
            }, 2000);
          }
        },
      }
    );
  };

  if (trigger === 'viewport') {
    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none none',
      onEnter: runAnimation,
    });
  } else {
    runAnimation();
  }

  return {
    revert: () => {
      element.textContent = element.dataset.originalText || '';
    },
  };
}

/**
 * Initialize all text animations on the page based on data attributes.
 * Call this after DOM is ready to activate scroll-triggered animations.
 */
export function initTextAnimations() {
  // splitReveal
  document.querySelectorAll('[data-text-anim="splitReveal"]').forEach((el) => {
    splitReveal(el, {
      duration: parseFloat(el.dataset.animDuration) || 0.8,
      stagger: parseFloat(el.dataset.animStagger) || 0.03,
    });
  });

  // lineWipe
  document.querySelectorAll('[data-text-anim="lineWipe"]').forEach((el) => {
    lineWipe(el, {
      duration: parseFloat(el.dataset.animDuration) || 0.6,
      stagger: parseFloat(el.dataset.animStagger) || 0.15,
    });
  });

  // letterFloat
  document.querySelectorAll('[data-text-anim="letterFloat"]').forEach((el) => {
    letterFloat(el, {
      duration: parseFloat(el.dataset.animDuration) || 1.0,
      stagger: parseFloat(el.dataset.animStagger) || 0.04,
    });
  });

  // wordScramble
  document.querySelectorAll('[data-text-anim="wordScramble"]').forEach((el) => {
    wordScramble(el, {
      duration: parseFloat(el.dataset.animDuration) || 1.5,
      stagger: parseFloat(el.dataset.animStagger) || 0.06,
    });
  });

  // typewriter
  document.querySelectorAll('[data-text-anim="typewriter"]').forEach((el) => {
    // Store original text for fallback
    el.dataset.originalText = el.textContent;
    typewriter(el, {
      duration: parseFloat(el.dataset.animDuration) || 1.5,
    });
  });
}
