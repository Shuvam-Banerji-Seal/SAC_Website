/**
 * SAC IISER Kolkata — Master GSAP Timeline Orchestrator
 * Central timeline that coordinates section-level animations across the page.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Master timeline instance.
 */
const masterTimeline = gsap.timeline({
  defaults: { ease: 'power2.out' },
});

/**
 * Add a labeled section to the master timeline.
 * @param {string} label - Section label (e.g., 'hero', 'about', 'clubs')
 * @param {number} position - Position in timeline (seconds)
 * @returns {GSAPTimeline}
 */
export function addSection(label, position = '<') {
  return masterTimeline.addLabel(label, position);
}

/**
 * Animate a section in with a standard fade-up.
 * @param {Element} element
 * @param {Object} options
 */
export function animateSectionIn(element, options = {}) {
  const { delay = 0, duration = 0.8, y = 60 } = options;

  return gsap.fromTo(
    element,
    { y, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration,
      delay,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    }
  );
}

/**
 * Animate a grid of items with staggered reveal.
 * @param {Element[]} items
 * @param {Object} options
 */
export function animateGridReveal(items, options = {}) {
  const { delay = 0, duration = 0.5, stagger = 0.1 } = options;

  return gsap.fromTo(
    items,
    { y: 40, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration,
      stagger,
      delay,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: items[0]?.parentElement,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    }
  );
}

/**
 * Parallax scroll animation for an element.
 * @param {Element} element
 * @param {number} speed - Parallax speed multiplier (default 0.3)
 */
export function parallaxScroll(element, speed = 0.3) {
  gsap.to(element, {
    y: () => -(element.offsetHeight * speed),
    ease: 'none',
    scrollTrigger: {
      trigger: element.parentElement,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
}

/**
 * Fade between sections with scroll trigger.
 * @param {Element} fromEl - Element to fade out
 * @param {Element} toEl - Element to fade in
 */
export function crossfadeScroll(fromEl, toEl) {
  gsap.to(fromEl, {
    opacity: 0,
    scrollTrigger: {
      trigger: toEl,
      start: 'top 20%',
      end: 'top 10%',
      scrub: 0.5,
    },
  });

  gsap.fromTo(
    toEl,
    { opacity: 0 },
    {
      opacity: 1,
      scrollTrigger: {
        trigger: toEl,
        start: 'top 30%',
        end: 'top 10%',
        scrub: 0.5,
      },
    }
  );
}

export default masterTimeline;
