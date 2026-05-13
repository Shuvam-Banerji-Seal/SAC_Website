/**
 * SAC IISER Kolkata — Three.js Scene Manager
 * Central manager for Three.js renderer, scene, camera, and animation loop.
 * Handles resize events and proper disposal.
 */

import * as THREE from 'three';
import { CAMERA } from '../utils/constants.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.rafId = null;
    this.onUpdate = null; // Callback for each frame
    this._initialized = false;
  }

  /**
   * Initialize the Three.js scene, camera, and renderer.
   * @param {Object} options
   * @param {boolean} [options.alpha=true] - Transparent background
   * @param {boolean} [options.antialias=true] - MSAA antialiasing
   * @param {number} [options.fov=CAMERA.FOV_START] - Field of view
   * @param {string} [options.powerPreference='high-performance']
   */
  init(options = {}) {
    const {
      alpha = true,
      antialias = true,
      fov = CAMERA.FOV_START,
      powerPreference = 'high-performance',
    } = options;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050810, 0.035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      CAMERA.NEAR,
      CAMERA.FAR
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha,
      antialias,
      powerPreference,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x050810, alpha ? 0 : 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Append canvas to provided container or body
    this.container = options.container || document.body;
    this.container.appendChild(this.renderer.domElement);

    // Timer — track delta via performance.now() instead of deprecated THREE.Clock
    this._lastFrameTime = performance.now();

    // Handle resize
    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._initialized = true;
  }

  /**
   * Get the renderer's DOM canvas element.
   * @returns {HTMLCanvasElement}
   */
  get canvas() {
    return this.renderer?.domElement || null;
  }

  /**
   * Set up post-processing using EffectComposer.
   * Call after init() and after adding scene objects.
   * @param {Array} passes - Array of {pass, name} objects to add (after RenderPass)
   */
  setupPostProcessing(passes = []) {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);

    // Base render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Add custom passes
    for (const { pass } of passes) {
      this.composer.addPass(pass);
    }
  }

  /**
   * Start the render loop.
   * @param {Function} [callback] - Called each frame with delta time
   */
  start(callback) {
    this.onUpdate = callback || null;
    this._animate();
  }

  /**
   * Internal animation loop.
   */
  _animate() {
    this.rafId = requestAnimationFrame(() => this._animate());

    const now = performance.now();
    const delta = (now - this._lastFrameTime) / 1000;
    this._lastFrameTime = now;

    if (this.onUpdate) {
      this.onUpdate(delta);
    }

    if (this.composer) {
      this.composer.render(delta);
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Handle window resize.
   */
  resize() {
    if (!this.camera || !this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  /**
   * Set camera field of view with optional animation.
   * @param {number} fov - Target FOV
   * @param {number} [duration=800] - Transition duration in ms
   */
  setFOV(fov, duration = 800) {
    if (!this.camera) return;

    return new Promise((resolve) => {
      const startFOV = this.camera.fov;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out expo
        const eased = 1 - Math.pow(1 - progress, 3);
        this.camera.fov = startFOV + (fov - startFOV) * eased;
        this.camera.updateProjectionMatrix();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Properly dispose all Three.js resources.
   */
  dispose() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    window.removeEventListener('resize', this._onResize);

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    if (this.scene) {
      // Dispose geometries and materials on all children
      this.scene.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        if (obj.texture) {
          obj.texture.dispose();
        }
      });
      this.scene = null;
    }

    this.camera = null;
    this._lastFrameTime = null;
    this._initialized = false;
  }
}

// Singleton instance
const sceneManager = new SceneManager();
export default sceneManager;
export { SceneManager };
