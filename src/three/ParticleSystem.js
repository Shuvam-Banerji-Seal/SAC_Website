/**
 * SAC IISER Kolkata — Particle System
 * Manages the particle field that morphs from scattered points into the SAC logo.
 * Particles are seeded from sac-logo-particles.svg coordinate data.
 */

import * as THREE from 'three';
import { PARTICLES } from '../utils/constants.js';

function cssColor(varName) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val ? new THREE.Color(val) : null;
}

// GLSL shaders inlined for reliable Vite compatibility
const particleVertexShader = `
attribute float size;
attribute vec3 color;
attribute float targetX;
attribute float targetY;
attribute float targetZ;
attribute float letterId;

uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;

varying vec3 vColor;
varying float vAlpha;
varying float vLetterId;

void main() {
  vColor = color;
  vLetterId = letterId;
  float breath = sin(uTime * 1.5 + letterId * 2.094) * 0.15 + 0.85;
  vAlpha = breath;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float pSize = size * uSize * uPixelRatio;
  pSize *= (1.0 / -mvPosition.z);
  gl_PointSize = pSize;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const particleFragmentShader = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
varying float vLetterId;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  float radius = 0.5;
  float softness = 0.3;
  float alpha = smoothstep(radius, radius - softness, dist);
  float core = smoothstep(radius * 0.3, 0.0, dist);
  vec3 coreColor = mix(vColor, vec3(1.0), core * 0.5);
  vec3 letterShift = vec3(0.0);
  if (vLetterId < 0.5) {
    letterShift = vec3(0.1, 0.05, 0.0);
  } else if (vLetterId < 1.5) {
    letterShift = vec3(0.15, 0.0, 0.15);
  } else {
    letterShift = vec3(0.0, 0.05, 0.1);
  }
  vec3 finalColor = coreColor + letterShift;
  float finalAlpha = alpha * vAlpha * 0.8;
  if (finalAlpha < 0.01) discard;
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

// Lazy-load SVG parsing — we need window.DOMParser
let svgParticleData = null;

/**
 * Parse the particle SVG to extract target coordinates.
 * @returns {Array<{x: number, y: number, letter: string, index: number}>}
 */
function parseSVGParticles() {
  if (svgParticleData) return svgParticleData;

  svgParticleData = [];

  const letters = ['s', 'a', 'c'];
  // Generate procedural target positions if SVG parsing isn't available yet
  // These are approximate positions matching the SVG layout
  const letterPositions = {
    s: generateSShape(35, 60, 16),
    a: generateAShape(67, 55, 14),
    c: generateCShape(90, 40, 12),
  };

  let globalIndex = 0;
  for (const letter of letters) {
    const positions = letterPositions[letter];
    for (let i = 0; i < positions.length; i++) {
      svgParticleData.push({
        x: positions[i][0],
        y: positions[i][1],
        letter,
        index: i,
        globalIndex: globalIndex++,
      });
    }
  }

  return svgParticleData;
}

/**
 * Generate S letter shape coordinates (normalized 0-1).
 */
function generateSShape(cx, cy, scale) {
  const pts = [];
  const s = scale;
  // Top curve
  for (let i = 0; i < 9; i++) {
    const angle = (i / 8) * Math.PI;
    pts.push([
      cx + Math.cos(angle - Math.PI / 2) * s * 1.6,
      cy - s * 0.8 + Math.sin(angle - Math.PI / 2) * s * 0.8,
    ]);
  }
  // Middle bar
  for (let i = 0; i < 5; i++) {
    pts.push([cx - s * 0.2 + (i / 4) * s * 1.6, cy + s * 0.1]);
  }
  // Bottom curve
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI + (i / 8) * Math.PI;
    pts.push([
      cx + Math.cos(angle - Math.PI / 2) * s * 1.6,
      cy + s * 0.6 + Math.sin(angle - Math.PI / 2) * s * 0.8,
    ]);
  }
  // Fill particles
  for (let i = 0; i < 8; i++) {
    pts.push([cx + (Math.random() - 0.5) * s * 1.2, cy + (Math.random() - 0.5) * s * 1.8]);
  }
  return pts;
}

/**
 * Generate A letter shape coordinates (normalized 0-1).
 */
function generateAShape(cx, cy, scale) {
  const pts = [];
  const s = scale;
  // Apex
  pts.push([cx, cy - s * 1.2]);
  // Left diagonal
  for (let i = 1; i < 6; i++) {
    pts.push([cx - (i / 6) * s * 1.4, cy - s * 1.2 + (i / 6) * s * 2.2]);
  }
  // Right diagonal
  for (let i = 1; i < 6; i++) {
    pts.push([cx + (i / 6) * s * 1.4, cy - s * 1.2 + (i / 6) * s * 2.2]);
  }
  // Crossbar
  for (let i = 0; i < 7; i++) {
    pts.push([cx - s * 0.5 + (i / 6) * s, cy - s * 0.1]);
  }
  // Bottom left leg
  for (let i = 0; i < 5; i++) {
    pts.push([cx - s * 0.6 - (i / 4) * s * 0.3, cy + s * 0.3 + (i / 4) * s * 0.8]);
  }
  // Bottom right leg
  for (let i = 0; i < 5; i++) {
    pts.push([cx + s * 0.6 + (i / 4) * s * 0.3, cy + s * 0.3 + (i / 4) * s * 0.8]);
  }
  // Fill
  for (let i = 0; i < 10; i++) {
    pts.push([cx + (Math.random() - 0.5) * s * 1.4, cy + (Math.random() - 0.5) * s * 1.5]);
  }
  return pts;
}

/**
 * Generate C letter shape coordinates (normalized 0-1).
 */
function generateCShape(cx, cy, scale) {
  const pts = [];
  const s = scale;
  // Top arm
  for (let i = 0; i < 6; i++) {
    pts.push([
      cx + Math.cos((i / 5) * Math.PI * 0.5) * s,
      cy - Math.sin((i / 5) * Math.PI * 0.5) * s * 0.7,
    ]);
  }
  // Right side (open)
  for (let i = 0; i < 4; i++) {
    pts.push([cx + s * 0.7, cy + (i / 3) * s * 0.5 - s * 0.3]);
  }
  // Bottom arm
  for (let i = 0; i < 6; i++) {
    pts.push([
      cx + Math.cos(Math.PI - (i / 5) * Math.PI * 0.5) * s,
      cy + s * 0.7 + Math.sin((i / 5) * Math.PI * 0.5) * s * 0.7,
    ]);
  }
  // Left curve
  for (let i = 0; i < 5; i++) {
    pts.push([cx - s * 0.3, cy + s * 0.7 - (i / 4) * s * 1.4]);
  }
  // Fill
  for (let i = 0; i < 8; i++) {
    pts.push([cx + (Math.random() - 0.5) * s * 1.2, cy + (Math.random() - 0.5) * s * 1.5]);
  }
  return pts;
}

/**
 * The ParticleSystem class creates and manages a Three.js Points object
 * representing the particle field.
 */
export class ParticleSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.tier = options.tier || 'high';
    this.particleCount = this._getParticleCount();
    this.points = null;
    this.geometry = null;
    this.material = null;
    this.targetPositions = null; // Normalized target positions
    this.currentPositions = null;
    this.basePositions = null; // Random start positions
    this.letterAssignments = [];

    this._init();
  }

  _getParticleCount() {
    switch (this.tier) {
      case 'high':
        return PARTICLES.COUNT_HIGH;
      case 'mid':
        return PARTICLES.COUNT_MID;
      default:
        return PARTICLES.COUNT_LOW;
    }
  }

  _init() {
    if (this.particleCount === 0) return;

    // Parse SVG data for target positions
    const svgData = parseSVGParticles();

    this.geometry = new THREE.BufferGeometry();

    // Create positions arrays
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const targetX = new Float32Array(this.particleCount);
    const targetY = new Float32Array(this.particleCount);
    const targetZ = new Float32Array(this.particleCount);
    const letterIds = new Float32Array(this.particleCount);

    // Distribute particles across the three letters proportionally
    const sCount = Math.round(this.particleCount * 0.33);
    const aCount = Math.round(this.particleCount * 0.33);

    // Generate random start positions (scattered across viewport)
    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 3;

      // Random start position (scattered in 3D space around center)
      positions[offset] = (Math.random() - 0.5) * 20;
      positions[offset + 1] = (Math.random() - 0.5) * 14;
      positions[offset + 2] = (Math.random() - 0.5) * 4;

      // Assign to a letter based on proportional counts
      let letter;
      if (i < sCount) letter = 's';
      else if (i < sCount + aCount) letter = 'a';
      else letter = 'c';

      // Get target position from SVG data (with wraparound if more particles than SVG points)
      const letterData = svgData.filter((d) => d.letter === letter);
      const targetIdx = i % letterData.length;
      const target = letterData[targetIdx];

      // Convert SVG viewBox coords (0-120) to Three.js world coords (-10 to 10 range)
      targetX[i] = (target.x - 60) * 0.16;
      targetY[i] = -(target.y - 60) * 0.16 + 0.3; // Flip Y and slight upward offset
      targetZ[i] = 0;

      const base = cssColor('--color-particle') || new THREE.Color(0xc4a882);
      const letterClr = cssColor(`--color-particle-${letter}`) || base;
      const mixed = base.clone().lerp(letterClr, 0.3);
      colors[offset] = mixed.r;
      colors[offset + 1] = mixed.g;
      colors[offset + 2] = mixed.b;

      // Size: random between min and max
      sizes[i] = PARTICLES.SIZE_MIN + Math.random() * (PARTICLES.SIZE_MAX - PARTICLES.SIZE_MIN);

      // Letter ID for shader-based color variation
      letterIds[i] = letter === 's' ? 0 : letter === 'a' ? 1 : 2;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Store targets as custom attributes
    this.geometry.setAttribute('targetX', new THREE.BufferAttribute(targetX, 1));
    this.geometry.setAttribute('targetY', new THREE.BufferAttribute(targetY, 1));
    this.geometry.setAttribute('targetZ', new THREE.BufferAttribute(targetZ, 1));
    this.geometry.setAttribute('letterId', new THREE.BufferAttribute(letterIds, 1));

    // Store references for animation
    this.targetPositions = { x: targetX, y: targetY, z: targetZ };
    this.currentPositions = positions;

    // Material with custom shader
    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 3000.0 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.letterAssignments = svgData.map((d) => d.letter);
  }

  /**
   * Get the world positions array for GSAP manipulation during convergence.
   * @returns {Float32Array}
   */
  getPositionArray() {
    return this.geometry.attributes.position.array;
  }

  /**
   * Set positions dirty flag so Three.js knows to update the GPU buffer.
   */
  needsUpdate() {
    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Get target positions as a flat array for GSAP.
   * @returns {Float32Array}
   */
  getTargetPositions() {
    const result = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      result[i * 3] = this.targetPositions.x[i];
      result[i * 3 + 1] = this.targetPositions.y[i];
      result[i * 3 + 2] = this.targetPositions.z[i];
    }
    return result;
  }

  /**
   * Get staggered delays per particle based on letter assignment.
   * S particles: delay 0, A particles: +0.15s, C particles: +0.3s
   * @returns {Float32Array} - Array of delays (normalized 0-1) for use with GSAP
   */
  getStaggeredDelays() {
    const delays = new Float32Array(this.particleCount);
    const sCount = Math.round(this.particleCount * 0.33);
    const aCount = Math.round(this.particleCount * 0.33);

    for (let i = 0; i < this.particleCount; i++) {
      if (i < sCount) delays[i] = 0;
      else if (i < sCount + aCount) delays[i] = 0.15;
      else delays[i] = 0.3;
    }
    return delays;
  }

  /**
   * Update particle positions each frame (for persistent background scene).
   * @param {number} delta
   */
  update(delta) {
    if (!this.material) return;
    this.material.uniforms.uTime.value += delta;
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.points && this.scene) {
      this.scene.remove(this.points);
    }
    this.points = null;
  }
}

export default ParticleSystem;
