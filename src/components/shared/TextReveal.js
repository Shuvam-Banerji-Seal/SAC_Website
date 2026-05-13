/**
 * SAC IISER Kolkata — Text Reveal Component
 * GSAP SplitText-based fluid text reveal with multiple presets.
 */

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export class TextReveal {
  /**
   * Reveal text by splitting into characters and animating from below.
   * @param {Element} element
   * @param {Object} options
   */
  static fromBelow(element, options = {}) {
    const { duration = 0.8, stagger = 0.03, ease = 'power3.out', delay = 0 } = options;

    const split = new SplitText(element, { type: 'chars' });
    gsap.set(split.chars, { y: '100%', opacity: 0 });
    gsap.to(split.chars, {
      y: '0%',
      opacity: 1,
      duration,
      stagger,
      ease,
      delay,
      onComplete: () => split.revert(),
    });
  }

  /**
   * Reveal text with a fade-in only (simpler, lighter).
   * @param {Element} element
   */
  static fadeIn(element, options = {}) {
    const { duration = 0.6, delay = 0 } = options;
    gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration, delay });
  }

  /**
   * Reveal text by scaling from 0 with spring.
   * @param {Element} element
   */
  static scaleIn(element, options = {}) {
    const { duration = 0.8, delay = 0 } = options;
    gsap.fromTo(
      element,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration, delay, ease: 'elastic.out(1, 0.5)' }
    );
  }
}
