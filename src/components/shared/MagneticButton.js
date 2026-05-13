/**
 * SAC IISER Kolkata — Magnetic Button Component
 * The button attracts the cursor toward it on hover for a tactile feel.
 */

import { gsap } from 'gsap';

export class MagneticButton {
  constructor(element, options = {}) {
    this.el = element;
    this.strength = options.strength || 0.3;
    this.threshold = options.threshold || 100; // px distance threshold
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);

    this._init();
  }

  _init() {
    this.el.style.transition = 'transform 0.15s ease-out';
    this.el.addEventListener('mouseenter', () => {
      document.addEventListener('mousemove', this._onMouseMove);
    });
    this.el.addEventListener('mouseleave', this._onMouseLeave);
  }

  _onMouseMove(e) {
    const rect = this.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.threshold) {
      const force = (1 - dist / this.threshold) * this.strength;
      const tx = dx * force;
      const ty = dy * force;
      gsap.to(this.el, {
        x: tx,
        y: ty,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }

  _onMouseLeave() {
    document.removeEventListener('mousemove', this._onMouseMove);
    gsap.to(this.el, {
      x: 0,
      y: 0,
      duration: 0.4,
      ease: 'elastic.out(1, 0.5)',
    });
  }

  /**
   * Initialize all [data-magnetic] buttons on the page.
   */
  static initAll() {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      new MagneticButton(el, { strength: 0.25 });
    });
  }
}

export default MagneticButton;
