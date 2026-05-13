/**
 * SAC IISER Kolkata — Application Entry Point
 * Orchestrates the loader, page construction, and initialization.
 */

import './styles/variables.css';
import './styles/main.css';
import './styles/typography.css';
import './styles/animations.css';
import './components/shared/shared.css';
import './components/Loader/loader.css';
import './components/Hero/hero.css';
import './components/Clubs/clubs.css';

import { playLoader } from './components/Loader/HeroLoader.js';
import { Navbar } from './components/Navigation/Navbar.js';
import { HeroSection } from './components/Hero/HeroSection.js';
import { MagneticButton } from './components/shared/MagneticButton.js';
import { CustomCursor } from './components/shared/CustomCursor.js';
import { initTheme } from './components/shared/ThemeToggle.js';
import { initTextAnimations } from './animations/textAnimations.js';
import { initScrollAnimations } from './animations/scrollAnimations.js';
import { lazyLoader } from './utils/lazyLoad.js';
import { initFPSMonitor, logCoreWebVitals } from './utils/performance.js';
import { deviceDetect } from './utils/deviceDetect.js';

// ===== Application State =====
const APP = {
  initialized: false,
  loaderComplete: false,
  deviceTier: 'mid',
};

/**
 * Main initialization function.
 * Called after DOM is ready.
 */
async function main() {
  APP.deviceTier = deviceDetect();

  // Init theme (read from localStorage or prefers-color-scheme)
  initTheme();

  // Hide app inline so postLoaderInit can remove it via style.removeProperty
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.opacity = '0';

  // Performance monitoring (dev mode only)
  if (import.meta.env.DEV) {
    initFPSMonitor();
    logCoreWebVitals();
  }

  // Step 1: Build the page skeleton (before loader so DOM is ready)
  buildPageSkeleton();

  // Initialize shared components
  MagneticButton.initAll();

  // Initialize text animations (scroll-triggered)
  initTextAnimations();

  // Step 2: Play the cinematic loader with timeout safety net
  const loaderTimeout = setTimeout(() => {
    console.warn('[SAC] Loader timeout — forcing content display');
    const overlay = document.getElementById('loader-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
  }, 8000); // 8 second max loader time

  try {
    await playLoader();
    APP.loaderComplete = true;
  } catch (err) {
    console.error('[SAC] Loader error:', err);
    // Fallback — ensure content is visible and overlay is removed
    document.body.style.overflow = '';
    const overlay = document.getElementById('loader-overlay');
    if (overlay) overlay.remove();
  } finally {
    clearTimeout(loaderTimeout);
  }

  // Step 3: Post-loader initialization
  postLoaderInit();
}

/**
 * Build the page skeleton — navbar, sections, footer.
 * This runs before the loader to ensure DOM is ready.
 */
function buildPageSkeleton() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('[SAC] #app element not found');
    return;
  }

  // Build navbar
  const navbar = new Navbar();

  // Build hero section
  const hero = new HeroSection();
  hero.mount(app);

  // Build about section
  buildAboutSection(app);

  // Build clubs section (skeleton)
  buildClubsSection(app);

  // Build footer
  buildFooter(app);

  // Store references for post-loader init
  APP.navbar = navbar;
  APP.hero = hero;
}

/**
 * Build the About section.
 * @param {Element} container
 */
function buildAboutSection(container) {
  const section = document.createElement('section');
  section.id = 'about';
  section.className = 'section about-section';
  section.setAttribute('aria-label', 'About SAC');

  section.innerHTML = `
    <div class="container">
      <div class="section-header" data-text-anim="lineWipe">
        <span class="label">Who We Are</span>
        <h2 class="heading-lg">Shaping Academic Excellence</h2>
      </div>

      <div class="about-grid">
        <div class="about-text" data-text-anim="fadeInUp" data-anim-delay="0.2">
          <p class="body-lg">
            The Student Academics Council (SAC) at IISER Kolkata is the premier student-led
            body dedicated to fostering academic growth, intellectual discourse, and
            interdisciplinary collaboration on campus.
          </p>
          <p class="body-md">
            We organize academic events, workshops, seminars, and competitions throughout
            the year — from guest lectures by renowned researchers to peer-led study groups,
            hackathons, quizzes, and cultural fests. SAC creates an environment where
            curiosity thrives and knowledge is shared freely across disciplines.
          </p>
          <p class="body-md">
            Our mission is to bridge the gap between classroom learning and real-world
            application, empowering every student to explore their academic passions
            beyond the curriculum. We currently oversee <strong>8+ clubs</strong>
            spanning technical, literary, cultural, and academic domains.
          </p>
          <p class="body-md">
            Built with modern web technologies and deployed via GitHub Actions,
            this platform serves as a central hub for all SAC activities.
            <a href="https://github.com/Shuvam-Banerji-Seal/SAC_Website" target="_blank" rel="noopener" class="code-inline">View source on GitHub →</a>
          </p>
        </div>

        <div class="about-visual" data-text-anim="fadeInUp" data-anim-delay="0.4">
          <div class="about-visual-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" class="about-visual-svg">
              <rect x="0" y="0" width="400" height="300" rx="12" fill="var(--color-surface)"/>
              <circle cx="100" cy="100" r="40" fill="none" stroke="var(--color-primary)" stroke-opacity="0.25" stroke-width="2"/>
              <circle cx="200" cy="150" r="60" fill="none" stroke="var(--color-secondary)" stroke-opacity="0.2" stroke-width="1.5"/>
              <circle cx="300" cy="100" r="50" fill="none" stroke="var(--color-accent)" stroke-opacity="0.2" stroke-width="2"/>
              <line x1="100" y1="100" x2="200" y2="150" stroke="var(--color-border)" stroke-width="1" opacity="0.4"/>
              <line x1="200" y1="150" x2="300" y2="100" stroke="var(--color-border)" stroke-width="1" opacity="0.4"/>
              <line x1="100" y1="100" x2="300" y2="100" stroke="var(--color-border)" stroke-width="1" opacity="0.2"/>
              <circle cx="100" cy="100" r="4" fill="var(--color-primary)" opacity="0.7"/>
              <circle cx="200" cy="150" r="4" fill="var(--color-secondary)" opacity="0.7"/>
              <circle cx="300" cy="100" r="4" fill="var(--color-accent)" opacity="0.7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(section);
}

/**
 * Build the Clubs section with skeleton cards.
 * @param {Element} container
 */
function buildClubsSection(container) {
  const section = document.createElement('section');
  section.id = 'clubs';
  section.className = 'section clubs-section';
  section.setAttribute('aria-label', 'Clubs');

  // Skeleton club data — content to be filled in Phase 2
  const skeletonClubs = [
    {
      name: 'Robotics Club',
      category: 'Technical',
      description: 'Build, program, and compete with robots.',
    },
    {
      name: 'Debating Society',
      category: 'Literary',
      description: 'Sharpen your argumentation and public speaking skills.',
    },
    {
      name: 'Photography Club',
      category: 'Creative',
      description: 'Capture moments and learn the art of visual storytelling.',
    },
    {
      name: 'Quiz Club',
      category: 'Academic',
      description: 'Test your knowledge and compete in quiz competitions.',
    },
    {
      name: 'Music Band',
      category: 'Cultural',
      description: 'Create music, jam together, and perform at campus events.',
    },
    {
      name: 'Drama Club',
      category: 'Cultural',
      description: 'Explore the world of theater and stage performance.',
    },
    {
      name: 'CodSoc',
      category: 'Technical',
      description: 'Competitive programming and software development community.',
    },
    {
      name: 'Astronomy Club',
      category: 'Academic',
      description: 'Explore the cosmos through observations and talks.',
    },
  ];

  // Fallback HTML for no-JS environments
  const fallbackCards = skeletonClubs
    .map(
      (club) => `
    <article class="club-card" tabindex="0">
      <div class="club-card__inner">
        <div class="club-card__icon-wrapper">
          <img src="/src/assets/svgs/club-placeholder.svg" alt="${club.name}" loading="lazy"/>
          <span class="club-card__category label label--secondary">${club.category}</span>
        </div>
        <h3 class="club-card__name heading-md">${club.name}</h3>
        <p class="club-card__description body-sm">${club.description}</p>
        <div class="club-card__footer">
          <span class="club-card__members body-muted">0 members</span>
          <a href="#" class="club-card__link" aria-label="View ${club.name} details">View Club →</a>
        </div>
      </div>
    </article>
  `
    )
    .join('');

  section.innerHTML = `
    <div class="container">
      <div class="section-header" data-text-anim="lineWipe">
        <span class="label">Our Clubs</span>
        <h2 class="heading-lg">Discover Your Passion</h2>
      </div>

      <div class="clubs-grid">
        ${fallbackCards}
      </div>
    </div>
  `;

  container.appendChild(section);
}

/**
 * Build the page footer.
 * @param {Element} container
 */
function buildFooter(container) {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.setAttribute('role', 'contentinfo');

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="32" height="32" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#4f8ef7" stroke-width="1.2" opacity="0.3"/>
            <path d="M24,28 C24,18 32,12 42,12 C52,12 58,18 58,28 L58,38 C58,44 54,48 48,48 C42,48 36,44 34,38 L30,38 C32,44 38,50 48,50 C58,50 64,44 64,36 C64,24 56,16 44,16 C32,16 26,22 26,32 L26,34 C26,42 30,48 38,48 C44,48 50,44 52,38 L56,38 C54,44 50,48 42,48 C34,48 28,44 28,36 Z" fill="#f1f5f9"/>
            <path d="M70,16 L76,48 L94,48 L84,72 L76,72 L66,44 L56,44 L46,72 L38,72 L48,48 L66,48 L70,16 Z M66,36 L62,24 C60,20 58,20 56,24 L52,36 C54,38 56,38 58,36 Z" fill="#f1f5f9"/>
            <path d="M66,18 C76,18 84,24 84,36 C84,48 76,54 66,54 L62,54 C64,50 66,46 66,42 L66,20 C66,22 65,24 64,26 L60,26 C60,24 62,20 64,18 Z M66,36 L66,30 L72,30 C70,34 68,36 66,36 Z" fill="none" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="footer-name">Student Academics Council</span>
          <span class="footer-subtitle body-muted">Indian Institute of Science Education and Research Kolkata</span>
        </div>

        <div class="footer-links">
          <h4 class="footer-heading heading-sm">Quick Links</h4>
          <ul>
            <li><a href="#hero">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#events">Events</a></li>
            <li><a href="#clubs">Clubs</a></li>
          </ul>
        </div>

        <div class="footer-social">
          <h4 class="footer-heading heading-sm">Connect</h4>
          <div class="footer-social-links">
            <a href="#" aria-label="Instagram">Instagram</a>
            <a href="#" aria-label="Facebook">Facebook</a>
            <a href="#" aria-label="YouTube">YouTube</a>
            <a href="#" aria-label="Email">Email</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="body-sm">
          Built with ♥ by <strong>SAC</strong> IISER Kolkata
        </p>
      </div>
    </div>
  `;

  container.appendChild(footer);
}

/**
 * Post-loader initialization — animations, interactions, etc.
 */
function postLoaderInit() {
  // Ensure app content is visible
  const app = document.getElementById('app');
  if (app) app.style.removeProperty('opacity');

  // Enable scroll-based animations
  initScrollAnimations();

  // Initialize custom cursor (desktop only)
  if (window.innerWidth > 768) {
    const cursor = new CustomCursor();
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) cursor.disable();
      else cursor.enable();
    });
  }

  // Enable body scroll
  document.body.style.overflow = '';

  APP.initialized = true;
  console.log('[SAC] Application initialized successfully');
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

// Handle window load event for final cleanup
window.addEventListener('load', () => {
  // Lazy-load all images with data-src
  lazyLoader.observeAllImages();

  // Observe sections for lazy initialization
  const sections = document.querySelectorAll('.section');
  sections.forEach((section) => {
    lazyLoader.observeSection(section, () => {
      section.classList.add('section--visible');
    });
  });
});

// Expose for debugging
window.__app = APP;
