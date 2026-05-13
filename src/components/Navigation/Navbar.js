/**
 * SAC IISER Kolkata — Navigation Bar Component
 * Fixed, transparent initially, becomes frosted-glass dark on scroll.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeToggle } from '../shared/ThemeToggle.js';

gsap.registerPlugin(ScrollTrigger);

export class Navbar {
  constructor() {
    this.nav = null;
    this.isMobileMenuOpen = false;
    this._init();
  }

  _init() {
    this._createNavbar();
    this._setupScrollBehavior();
    this._setupMobileMenu();
    this._setupSmoothScroll();
  }

  _createNavbar() {
    this.nav = document.createElement('nav');
    this.nav.className = 'navbar';
    this.nav.setAttribute('role', 'navigation');
    this.nav.setAttribute('aria-label', 'Main navigation');

    this.nav.innerHTML = `
      <div class="navbar-container container">
        <a href="#" class="navbar-logo" aria-label="SAC IISER Kolkata Home">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="32" height="32" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.25"/>
            <path d="M24,28 C24,18 32,12 42,12 C52,12 58,18 58,28 L58,38 C58,44 54,48 48,48 C42,48 36,44 34,38 L30,38 C32,44 38,50 48,50 C58,50 64,44 64,36 C64,24 56,16 44,16 C32,16 26,22 26,32 L26,34 C26,42 30,48 38,48 C44,48 50,44 52,38 L56,38 C54,44 50,48 42,48 C34,48 28,44 28,36 Z" fill="currentColor"/>
            <path d="M70,16 L76,48 L94,48 L84,72 L76,72 L66,44 L56,44 L46,72 L38,72 L48,48 L66,48 L70,16 Z M66,36 L62,24 C60,20 58,20 56,24 L52,36 C54,38 56,38 58,36 Z" fill="currentColor"/>
            <path d="M66,18 C76,18 84,24 84,36 C84,48 76,54 66,54 L62,54 C64,50 66,46 66,42 L66,20 C66,22 65,24 64,26 L60,26 C60,24 62,20 64,18 Z M66,36 L66,30 L72,30 C70,34 68,36 66,36 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="navbar-logo-text">SAC</span>
        </a>

        <div class="navbar-actions">
          <ul class="navbar-links">
            <li><a href="#hero" data-nav-link>Home</a></li>
            <li><a href="#about" data-nav-link>About</a></li>
            <li><a href="#events" data-nav-link>Events</a></li>
            <li><a href="#clubs" data-nav-link>Clubs</a></li>
            <li><a href="#team" data-nav-link>Team</a></li>
            <li><a href="#contact" data-nav-link>Contact</a></li>
          </ul>
          <div id="theme-toggle-mount"></div>
          <button class="navbar-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
            <span class="navbar-toggle-line"></span>
            <span class="navbar-toggle-line"></span>
            <span class="navbar-toggle-line"></span>
          </button>
        </div>
      </div>
    `;

    document.body.prepend(this.nav);

    const mount = document.getElementById('theme-toggle-mount');
    if (mount) mount.replaceWith(ThemeToggle());
  }

  _setupScrollBehavior() {
    ScrollTrigger.create({
      start: 'top -1',
      end: 'bottom top',
      onUpdate: (self) => {
        if (self.direction === 1 && self.scroll() > 50) {
          this.nav.classList.add('navbar--scrolled');
        } else if (self.direction === -1 || self.scroll() <= 50) {
          this.nav.classList.remove('navbar--scrolled');
        }
      },
    });

    // Simpler approach: toggle class on scroll
    window.addEventListener(
      'scroll',
      () => {
        if (window.pageYOffset > 80) {
          this.nav.classList.add('navbar--scrolled');
        } else {
          this.nav.classList.remove('navbar--scrolled');
        }
      },
      { passive: true }
    );
  }

  _setupMobileMenu() {
    const toggle = this.nav.querySelector('.navbar-toggle');
    const links = this.nav.querySelector('.navbar-links');

    toggle.addEventListener('click', () => {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
      toggle.classList.toggle('navbar-toggle--active');
      links.classList.toggle('navbar-links--open');
      toggle.setAttribute('aria-expanded', this.isMobileMenuOpen);
    });

    // Close menu on link click
    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        this.isMobileMenuOpen = false;
        toggle.classList.remove('navbar-toggle--active');
        links.classList.remove('navbar-links--open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (this.isMobileMenuOpen && !this.nav.contains(e.target)) {
        this.isMobileMenuOpen = false;
        toggle.classList.remove('navbar-toggle--active');
        links.classList.remove('navbar-links--open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  _setupSmoothScroll() {
    this.nav.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const offset =
            parseInt(
              window.getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
            ) || 72;
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

          window.scrollTo({
            top,
            behavior: 'smooth',
          });
        }
      });
    });
  }
}
