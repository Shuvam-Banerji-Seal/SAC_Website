/**
 * SAC IISER Kolkata — Page/Section Transition Definitions
 * Defines transition effects between page sections.
 */

import { gsap } from 'gsap';

/**
 * Fade transition between sections.
 * @param {Element} outgoing - Section leaving
 * @param {Element} incoming - Section entering
 * @returns {Promise} Resolves when transition completes
 */
export function fadeTransition(outgoing, incoming) {
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: resolve,
    });

    if (outgoing) {
      tl.to(outgoing, { opacity: 0, duration: 0.4 }, 0);
    }

    if (incoming) {
      tl.fromTo(incoming, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2);
    }
  });
}

/**
 * Slide transition (horizontal).
 * @param {Element} outgoing
 * @param {Element} incoming
 * @param {string} direction - 'left' | 'right'
 * @returns {Promise}
 */
export function slideTransition(outgoing, incoming, direction = 'left') {
  return new Promise((resolve) => {
    const xFrom = direction === 'left' ? '-100%' : '100%';
    const xTo = direction === 'left' ? '100%' : '-100%';

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 0.5 },
      onComplete: resolve,
    });

    if (outgoing) {
      tl.to(outgoing, { x: xTo, opacity: 0 }, 0);
    }

    if (incoming) {
      tl.fromTo(incoming, { x: xFrom, opacity: 0 }, { x: 0, opacity: 1 }, 0);
    }
  });
}

/**
 * Morph/iris transition (used by loader).
 * @param {Element} container
 * @param {Object} options
 */
export function irisTransition(container, options = {}) {
  const { duration = 0.8, fromCenter = true } = options;

  return new Promise((resolve) => {
    gsap.to(container, {
      clipPath: fromCenter ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)',
      duration,
      ease: 'power2.out',
      onComplete: resolve,
    });
  });
}
