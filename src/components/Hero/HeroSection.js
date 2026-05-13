/**
 * SAC IISER Kolkata — Hero Section Component
 * Post-loader hero with animated headline, subheadline, CTA, and persistent background scene.
 */

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class HeroSection {
  constructor() {
    this.section = null;
  }

  /**
   * Mount the hero section into the app container.
   * @param {Element} container
   */
  mount(container) {
    this.section = document.createElement('section');
    this.section.id = 'hero';
    this.section.className = 'hero-section';
    this.section.setAttribute('aria-label', 'Hero');

    this.section.innerHTML = `
      <div class="hero-bg-layer" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" class="hero-bg-svg">
          <defs>
            <radialGradient id="heroGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="#362f29" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#1a1410" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#heroGlow)"/>
          <polygon points="720,200 920,350 920,550 720,700 520,550 520,350"
                   fill="#4a423b" fill-opacity="0.1" transform="rotate(15 720 450)"/>
          <polygon points="400,100 550,250 550,450 400,600 250,450 250,250"
                   fill="none" stroke="#4a423b" stroke-opacity="0.08" stroke-width="1"/>
          <path d="M 200,450 A 300,300 0 0,1 500,300" fill="none" stroke="#4a423b" stroke-opacity="0.08" stroke-width="1.5"/>
          <path d="M 1200,300 A 300,300 0 0,1 900,450" fill="none" stroke="#4a423b" stroke-opacity="0.08" stroke-width="1.5"/>
          <circle cx="500" cy="350" r="3" fill="#8B7355" fill-opacity="0.15"/>
          <circle cx="700" cy="300" r="3" fill="#A0896C" fill-opacity="0.15"/>
          <circle cx="900" cy="400" r="3" fill="#C4A882" fill-opacity="0.15"/>
        </svg>
      </div>

      <div class="orbital-ring-container" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="300" height="300" class="orbital-ring-svg">
          <ellipse cx="100" cy="100" rx="85" ry="60" fill="none" stroke="#8B7355" stroke-width="1" opacity="0.2" stroke-dasharray="4 8" stroke-linecap="round"/>
          <ellipse cx="100" cy="100" rx="65" ry="48" fill="none" stroke="#A0896C" stroke-width="0.8" opacity="0.15" stroke-dasharray="3 6" stroke-linecap="round"/>
          <ellipse cx="100" cy="100" rx="45" ry="35" fill="none" stroke="#C4A882" stroke-width="0.6" opacity="0.1" stroke-dasharray="2 5" stroke-linecap="round"/>
        </svg>
      </div>

      <div class="hero-content">
        <div class="hero-badge">
          <span class="label">IISER Kolkata</span>
        </div>

        <h1 class="heading-hero" data-text-anim="splitReveal" data-anim-duration="1.0" data-anim-stagger="0.04">
          Where Knowledge Meets Curiosity
        </h1>

        <p class="body-lg hero-subtitle" data-text-anim="wordScramble" data-anim-duration="1.2">
          Empowering academic excellence through student-led initiatives
        </p>

        <div class="hero-actions">
          <a href="#clubs" class="btn btn--primary btn--magnetic" data-magnetic>
            Explore Clubs
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a href="#about" class="btn btn--ghost btn--magnetic" data-magnetic>
            Learn More
          </a>
        </div>

        <!-- Scroll indicator -->
        <div class="scroll-indicator" aria-hidden="true">
          <div class="scroll-indicator__line">
            <div class="scroll-indicator__dot"></div>
          </div>
          <span class="body-sm scroll-indicator__label">Scroll</span>
        </div>
      </div>
    `;

    container.appendChild(this.section);

    // Initialize animations
    this._initAnimations();
  }

  _initAnimations() {
    // Badge entrance
    const badge = this.section.querySelector('.hero-badge');
    if (badge) {
      gsap.from(badge, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 1.0,
        ease: 'power2.out',
      });
    }

    // Text animations (handled by textAnimations.js scroll triggers via data attributes)
    // But for hero specifically, we want immediate animation after loader
    const headline = this.section.querySelector('[data-text-anim="splitReveal"]');
    const subtitle = this.section.querySelector('[data-text-anim="wordScramble"]');

    // Trigger hero text animations immediately (not scroll-dependent)
    if (headline) {
      // Override scroll trigger — animate in immediately
      const split = new SplitText(headline, {
        type: 'chars',
      });
      gsap.set(split.chars, {
        y: '100%',
        rotationX: -90,
        opacity: 0,
        filter: 'blur(8px)',
      });
      gsap.to(split.chars, {
        y: '0%',
        rotationX: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.0,
        stagger: 0.04,
        ease: 'power3.out',
        delay: 1.2,
        onComplete: () => split.revert(),
      });
    }

    if (subtitle) {
      gsap.fromTo(
        subtitle,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 2.0, ease: 'power2.out' }
      );
    }

    // Scroll indicator fade
    const scrollInd = this.section.querySelector('.scroll-indicator');
    if (scrollInd) {
      gsap.from(scrollInd, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 2.5,
        ease: 'power2.out',
      });
    }
  }
}
