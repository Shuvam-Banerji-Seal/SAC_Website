/**
 * SAC IISER Kolkata — Three.js Post-Processing
 * Sets up bloom, vignette, and other post-processing passes for cinematic quality.
 */

import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Configure post-processing passes and attach to the SceneManager's composer.
 * @param {SceneManager} sceneManager
 * @param {Object} options
 * @param {boolean} [options.bloom=true] - Enable UnrealBloomPass
 * @param {boolean} [options.vignette=true] - Enable vignette shader pass
 * @param {number} [options.bloomStrength=1.5]
 * @returns {EffectComposer} The configured composer
 */
export async function setupPostProcessing(sceneManager, options = {}) {
  const {
    bloom = true,
    vignette = true,
    bloomStrength = 1.5,
    bloomRadius = 0.4,
    bloomThreshold = 0.2,
  } = options;

  if (!sceneManager.renderer || !sceneManager.scene || !sceneManager.camera) {
    console.warn('[PostProcessing] SceneManager not initialized');
    return null;
  }

  const passes = [];

  // Bloom pass for the glow/particle effect
  if (bloom) {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    passes.push({ name: 'bloom', pass: bloomPass });
  }

  // Vignette shader pass for cinematic edge darkening
  if (vignette) {
    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        offset: { value: 0.95 },
        darkness: { value: 0.6 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float offset;
        uniform float darkness;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(tDiffuse, vUv);
          float dist = distance(vUv, vec2(0.5));
          float vignette = smoothstep(offset, offset - 0.5, dist);
          tex.rgb = mix(tex.rgb, tex.rgb * (1.0 - darkness), vignette);
          gl_FragColor = tex;
        }
      `,
    };

    const vignettePass = new ShaderPass(vignetteShader);
    passes.push({ name: 'vignette', pass: vignettePass });
  }

  // Apply passes to the scene manager composer
  if (passes.length > 0) {
    sceneManager.setupPostProcessing(passes);
  }

  return sceneManager.composer;
}

/**
 * Update post-processing settings at runtime.
 * @param {EffectComposer} composer
 * @param {string} passName
 * @param {Object} settings
 */
export function updatePostProcessingPass(composer, passName, settings) {
  if (!composer) return;

  for (const pass of composer.passes) {
    if (pass.name === passName || pass.constructor.name === passName) {
      Object.assign(pass.uniforms || pass, settings);
      break;
    }
  }
}
