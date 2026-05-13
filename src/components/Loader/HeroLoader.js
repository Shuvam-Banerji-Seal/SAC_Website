/**
 * SAC IISER Kolkata — Cinematic Hero Loader
 *
 * 5-beat cinematic opening:
 * Beat 1 (0–0.5s): Void
 * Beat 2 (0.5–1.5s): Particle Emergence
 * Beat 3 (1.5–2.5s): Convergence → logo
 * Beat 4 (2.5–3.2s): Logo Crystallization + bloom
 * Beat 5 (3.2–4.0s): Camera Push + iris dissolve
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { SceneManager } from '../../three/SceneManager.js';
import ParticleSystem from '../../three/ParticleSystem.js';
import { setupPostProcessing } from '../../three/PostProcessing.js';
import { deviceDetect, supportsCinematicLoader } from '../../utils/deviceDetect.js';
import { LOADER, CAMERA } from '../../utils/constants.js';

export class HeroLoader {
  constructor() {
    this.sceneManager = null;
    this.particleSystem = null;
    this.timeline = null;
    this.tier = deviceDetect();
    this.cinematic = supportsCinematicLoader();
    this.disposed = false;
    this._resolve = null;
    this._forceTimer = null;
  }

  async play() {
    this._setupOverlay();
    console.log('[Loader] tier:', this.tier, 'cinematic:', this.cinematic);

    if (!this.cinematic) {
      this._fallbackFade();
      return;
    }

    try {
      await this._initThree();
    } catch (err) {
      console.warn('[Loader] Three.js init failed, using fallback:', err);
      this._fallbackFade();
      return;
    }

    if (!this.particleSystem || this.particleSystem.particleCount === 0) {
      console.log('[Loader] No particles, using fallback');
      this._fallbackFade();
      return;
    }

    console.log('[Loader] Building timeline...');
    this._buildTimeline();
    this._startRenderLoop();
    console.log('[Loader] Timeline built, duration:', this.timeline.totalDuration());

    return new Promise((resolve) => {
      this._resolve = resolve;
      this.timeline.eventCallback('onComplete', () => {
        console.log('[Loader] Timeline completed, transitioning out');
        this._transitionOut();
      });

      setTimeout(() => {
        this._setupSkip();
      }, LOADER.SKIP_DELAY);
    });
  }

  _setupOverlay() {
    const el = document.createElement('div');
    el.id = 'loader-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="grain-overlay"></div><span class="loader-skip-hint">Click to skip</span>';
    document.body.prepend(el);
  }

  async _initThree() {
    const container = document.getElementById('loader-overlay');
    if (!container) throw new Error('loader-overlay not found');

    this.sceneManager = new SceneManager();
    this.sceneManager.init({
      container,
      fov: CAMERA.FOV_START,
    });

    if (!this.sceneManager.renderer) throw new Error('Renderer creation failed');

    const lights = [
      new THREE.AmbientLight(0x222244, 0.5),
      new THREE.PointLight(0x06b6d4, 1.5, 20),
      new THREE.PointLight(0x4f8ef7, 0.8, 15),
    ];
    lights[1].position.set(0, 0, 8);
    lights[2].position.set(-3, 2, 6);
    lights.forEach((l) => this.sceneManager.scene.add(l));

    this.particleSystem = new ParticleSystem(this.sceneManager.scene, {
      tier: this.tier,
    });

    await setupPostProcessing(this.sceneManager, {
      bloom: this.tier === 'high',
      vignette: true,
      bloomStrength: this.tier === 'high' ? 1.5 : 0.8,
      bloomRadius: this.tier === 'high' ? 0.4 : 0.2,
      bloomThreshold: this.tier === 'high' ? 0.2 : 0.3,
    });
  }

  _buildTimeline() {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    const { particleCount } = this.particleSystem;
    const targets = this.particleSystem.getTargetPositions();
    const delays = this.particleSystem.getStaggeredDelays();

    const dummy = { t: 0 };

    tl.to(
      dummy,
      {
        t: 1,
        duration: 0.5,
        onUpdate: () => {
          if (this.particleSystem) this.particleSystem.update(0.016);
        },
      },
      'beat1'
    );

    tl.to(
      dummy,
      {
        t: 1,
        duration: 1.0,
        onUpdate: () => {
          if (!this.particleSystem) return;
          const pos = this.particleSystem.getPositionArray();
          for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            pos[idx] += (Math.random() - 0.5) * 0.003;
            pos[idx + 1] += (Math.random() - 0.5) * 0.003;
          }
          this.particleSystem.needsUpdate();
        },
      },
      'beat2'
    );

    tl.call(
      () => {
        this._convergeStart = performance.now();
      },
      null,
      'beat3'
    ).to(dummy, {
      t: 1,
      duration: 1.0,
      onUpdate: () => {
        if (!this.particleSystem) return;
        const elapsed = (performance.now() - this._convergeStart) / 1000;
        const progress = Math.min(elapsed / 1.0, 1);
        const pos = this.particleSystem.getPositionArray();
        for (let i = 0; i < particleCount; i++) {
          const offset = i * 3;
          const raw = (progress - delays[i]) / (1 - 0.6);
          const p = Math.max(0, Math.min(1, 1 - Math.pow(1 - raw, 3)));
          pos[offset] += (targets[offset] - pos[offset]) * p * 0.06;
          pos[offset + 1] += (targets[offset + 1] - pos[offset + 1]) * p * 0.06;
          pos[offset + 2] += (targets[offset + 2] - pos[offset + 2]) * p * 0.06;
        }
        this.particleSystem.needsUpdate();
      },
      onComplete: () => {
        this._convergeStart = null;
      },
    });

    tl.call(
      () => {
        this._crystalStart = performance.now();
        this._pulseBloom(2.5);
      },
      null,
      'beat4'
    ).to(dummy, {
      t: 1,
      duration: 0.7,
      onUpdate: () => {
        if (!this.particleSystem) return;
        const elapsed = (performance.now() - this._crystalStart) / 1000;
        const t = Math.min(elapsed / 0.7, 1);
        const ease = gsap.parseEase('elastic.out(1, 0.5)')(t);
        const pos = this.particleSystem.getPositionArray();
        for (let i = 0; i < particleCount; i++) {
          const offset = i * 3;
          pos[offset] += (targets[offset] - pos[offset]) * ease * 0.12;
          pos[offset + 1] += (targets[offset + 1] - pos[offset + 1]) * ease * 0.12;
        }
        this.particleSystem.needsUpdate();
      },
      onComplete: () => {
        this._crystalStart = null;
      },
    });

    tl.call(
      () => {
        this._pushStart = performance.now();
        if (this.sceneManager.camera) {
          gsap.to(this.sceneManager.camera, {
            fov: CAMERA.FOV_END,
            duration: 0.8,
            ease: 'power2.inOut',
            onUpdate: () => this.sceneManager.camera?.updateProjectionMatrix(),
          });
        }
        this._pulseBloom(3.0);
      },
      null,
      'beat5'
    ).to(dummy, {
      t: 1,
      duration: 0.8,
      onUpdate: () => {
        if (!this.particleSystem) return;
        const elapsed = (performance.now() - this._pushStart) / 1000;
        const progress = Math.min(elapsed / 0.8, 1);
        if (progress > 0.85) {
          const scatter = (progress - 0.85) / 0.15;
          const pos = this.particleSystem.getPositionArray();
          for (let i = 0; i < particleCount; i++) {
            const offset = i * 3;
            const angle = (i / particleCount) * Math.PI * 2;
            pos[offset] += Math.cos(angle) * scatter * 0.04;
            pos[offset + 1] += Math.sin(angle) * scatter * 0.04;
          }
          this.particleSystem.needsUpdate();
        }
      },
      onComplete: () => {
        this._pushStart = null;
      },
    });

    tl.call(() => this._cleanup(), null, '+=0.1');
    this.timeline = tl;
  }

  _pulseBloom(targetStrength) {
    if (!this.sceneManager?.composer) return;
    const pass = this.sceneManager.composer.passes.find(
      (p) => p.name === 'bloom' || p.constructor?.name === 'UnrealBloomPass'
    );
    if (!pass) return;
    gsap.to(pass, {
      strength: targetStrength,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    });
  }

  _startRenderLoop() {
    const tick = () => {
      if (this.disposed) return;
      this.sceneManager.rafId = requestAnimationFrame(tick);
      if (this.particleSystem) this.particleSystem.update(0.016);
      if (this.sceneManager.composer) {
        this.sceneManager.composer.render();
      } else if (
        this.sceneManager.renderer &&
        this.sceneManager.scene &&
        this.sceneManager.camera
      ) {
        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
      }
    };
    tick();
  }

  _fallbackFade() {
    const overlay = document.getElementById('loader-overlay');
    if (!overlay) return;
    console.log('[Loader] Using CSS fallback');
    overlay.innerHTML = `
      <div class="fallback-loader">
        <div class="fallback-logo-wrap">
          <svg class="fallback-logo" viewBox="0 0 120 120" width="100" height="100">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#4f8ef7" stroke-width="1.2" opacity=".3"/>
            <path d="M24,28 C24,18 32,12 42,12 C52,12 58,18 58,28 L58,38 C58,44 54,48 48,48 C42,48 36,44 34,38 L30,38 C32,44 38,50 48,50 C58,50 64,44 64,36 C64,24 56,16 44,16 C32,16 26,22 26,32 L26,34 C26,42 30,48 38,48 C44,48 50,44 52,38 L56,38 C54,44 50,48 42,48 C34,48 28,44 28,36 Z" fill="#f1f5f9"/>
            <path d="M70,16 L76,48 L94,48 L84,72 L76,72 L66,44 L56,44 L46,72 L38,72 L48,48 L66,48 L70,16 Z M66,36 L62,24 C60,20 58,20 56,24 L52,36 C54,38 56,38 58,36 Z" fill="#f1f5f9"/>
            <path d="M66,18 C76,18 84,24 84,36 C84,48 76,54 66,54 L62,54 C64,50 66,46 66,42 L66,20 C66,22 65,24 64,26 L60,26 C60,24 62,20 64,18 Z M66,36 L66,30 L72,30 C70,34 68,36 66,36 Z" fill="none" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="fallback-spinner"><div class="fallback-spinner-ring"></div></div>
        <p class="fallback-text">Student Academics Council</p>
      </div>`;
    const fadeIn = (sel) => overlay.querySelector(sel)?.style.setProperty('opacity', '0');
    fadeIn('.fallback-logo-wrap');
    fadeIn('.fallback-spinner');
    fadeIn('.fallback-text');
    requestAnimationFrame(() => {
      overlay.querySelector('.fallback-logo-wrap')?.style.setProperty('opacity', '1');
      overlay.querySelector('.fallback-spinner')?.style.setProperty('opacity', '1');
      overlay.querySelector('.fallback-text')?.style.setProperty('opacity', '1');
    });
    setTimeout(() => this._transitionOut(), LOADER.TOTAL_DURATION);
  }

  _transitionOut() {
    const overlay = document.getElementById('loader-overlay');
    if (!overlay) return;

    const mask = document.createElement('div');
    mask.className = 'loader-mask';
    document.body.prepend(mask);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => mask.classList.add('reveal'));
    });

    setTimeout(() => {
      if (overlay?.parentNode) overlay.parentNode.removeChild(overlay);
      if (mask?.parentNode) mask.parentNode.removeChild(mask);
      document.getElementById('app')?.style.removeProperty('opacity');
      window.dispatchEvent(new CustomEvent('loaderComplete'));
      this.dispose();
      if (this._resolve) {
        this._resolve();
        this._resolve = null;
      }
    }, 900);
  }

  _setupSkip() {
    const handler = () => {
      this.timeline?.pause();
      this._transitionOut();
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
  }

  dispose() {
    this.disposed = true;
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    if (this.particleSystem) {
      this.particleSystem.dispose();
      this.particleSystem = null;
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }
  }

  _cleanup() {
    this.dispose();
  }
}

let loaderInstance = null;

export function getLoader() {
  if (!loaderInstance) loaderInstance = new HeroLoader();
  return loaderInstance;
}

export async function playLoader() {
  return getLoader().play();
}
