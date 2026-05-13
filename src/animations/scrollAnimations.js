/**
 * SAC IISER Kolkata — Scroll-Based Animations
 * Defines scroll-triggered animations for each section of the page.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animateSectionIn, animateGridReveal, parallaxScroll } from './timeline.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Initialize all scroll-based animations on the page.
 * Called after the DOM is ready and the loader has completed.
 */
export function initScrollAnimations() {
  initHeroScrollEffects();
  initAboutScrollEffects();
  initClubsGridAnimations();
  initFooterAnimations();
}

/**
 * Hero section scroll effects.
 * Subtle parallax on the background and fade-in of hero content.
 */
function initHeroScrollEffects() {
  // Hero background parallax
  const heroBg = document.querySelector('.hero-bg-layer');
  if (heroBg) {
    heroBg.style.willChange = 'transform';
    gsap.to(heroBg, {
      yPercent: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    });
  }

  // Orbital ring rotation
  const orbitalRing = document.querySelector('.orbital-ring-container');
  if (orbitalRing) {
    gsap.to(orbitalRing, {
      rotation: 360,
      duration: 30,
      repeat: -1,
      ease: 'none',
    });
  }
}

/**
 * About section scroll effects.
 */
function initAboutScrollEffects() {
  const aboutSection = document.querySelector('#about');
  if (!aboutSection) return;

  // Text column animations
  const textCol = aboutSection.querySelector('.about-text');
  if (textCol) {
    animateSectionIn(textCol, { delay: 0.2, duration: 0.8, y: 40 });
  }

  // Visual column parallax
  const visualCol = aboutSection.querySelector('.about-visual');
  if (visualCol) {
    parallaxScroll(visualCol, 0.2);
    animateSectionIn(visualCol, { delay: 0.4, duration: 0.8, y: 60 });
  }
}

/**
 * Clubs grid staggered reveal.
 */
function initClubsGridAnimations() {
  const clubsSection = document.querySelector('#clubs');
  if (!clubsSection) return;

  const cards = clubsSection.querySelectorAll('.club-card');
  if (cards.length > 0) {
    animateGridReveal(Array.from(cards), {
      delay: 0.2,
      duration: 0.6,
      stagger: 0.1,
    });
  }
}

/**
 * Footer fade-in.
 */
function initFooterAnimations() {
  const footer = document.querySelector('footer');
  if (footer) {
    animateSectionIn(footer, { delay: 0.3, duration: 0.6, y: 30 });
  }
}
