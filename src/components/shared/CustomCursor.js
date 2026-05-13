/**
 * SAC IISER Kolkata — Custom Cursor Component
 * Replaces the default cursor with a custom animated dot + ring.
 */

import { gsap } from 'gsap';

export class CustomCursor {
  constructor() {
    this.dot = null;
    this.ring = null;
    this.isVisible = true;
    this._init();
  }

  _init() {
    // Create cursor DOM elements
    this.dot = document.createElement('div');
    this.dot.className = 'custom-cursor__dot';
    this.dot.setAttribute('aria-hidden', 'true');

    this.ring = document.createElement('div');
    this.ring.className = 'custom-cursor__ring';
    this.ring.setAttribute('aria-hidden', 'true');

    document.body.appendChild(this.dot);
    document.body.appendChild(this.ring);

    // Track mouse
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseenter', () => {
      this.isVisible = true;
    });
    document.addEventListener('mouseleave', () => {
      this.isVisible = false;
    });

    // Hover effects on interactive elements
    document.addEventListener('mouseover', this._onHoverStart);
    document.addEventListener('mouseout', this._onHoverEnd);
  }

  _onMouseMove = (e) => {
    if (!this.isVisible) return;
    gsap.to(this.dot, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.1,
      ease: 'power2.out',
    });
    gsap.to(this.ring, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  _onHoverStart = (e) => {
    const target = e.target;
    if (
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.closest('a') ||
      target.closest('button') ||
      target.classList.contains('club-card')
    ) {
      gsap.to(this.ring, { scale: 2, opacity: 0.5, duration: 0.2 });
      gsap.to(this.dot, { scale: 0.5, duration: 0.2 });
    }
  };

  _onHoverEnd = () => {
    gsap.to(this.ring, { scale: 1, opacity: 1, duration: 0.3 });
    gsap.to(this.dot, { scale: 1, duration: 0.3 });
  };

  /**
   * Disable the custom cursor (e.g., on mobile).
   */
  disable() {
    if (this.dot) this.dot.style.display = 'none';
    if (this.ring) this.ring.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Enable the custom cursor.
   */
  enable() {
    if (this.dot) this.dot.style.display = '';
    if (this.ring) this.ring.style.display = '';
    this.isVisible = true;
  }
}
