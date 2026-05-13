/**
 * SAC IISER Kolkata — Global Constants & Configuration
 * Central configuration for animation timings, device thresholds, etc.
 */

// ===== Device Performance Thresholds =====
export const DEVICE = {
  LOW: 'low',
  MID: 'mid',
  HIGH: 'high',
};

// ===== Animation Defaults =====
export const ANIM = {
  DURATION_INSTANT: 100,
  DURATION_FAST: 200,
  DURATION_NORMAL: 400,
  DURATION_SLOW: 800,
  DURATION_DRAMATIC: 1600,

  EASE_OUT_EXPO: [0.16, 1, 0.3, 1],
  EASE_IN_EXPO: [0.7, 0, 0.84, 0],
  EASE_ELASTIC: [0.34, 1.56, 0.64, 1],
  EASE_CINEMATIC: [0.25, 0.46, 0.45, 0.94],
  EASE_GENTLE: [0.4, 0, 0.2, 1],
};

// ===== Particle System Config =====
export const PARTICLES = {
  COUNT_HIGH: 1200,
  COUNT_MID: 400,
  COUNT_LOW: 0, // Skip on low-end
  SIZE_MIN: 0.005,
  SIZE_MAX: 0.02,
  CONVERGENCE_SPEED: 2.5,
  SCATTER_SPEED: 3.0,
};

// ===== Loader Timing =====
export const LOADER = {
  SKIP_DELAY: 1500, // ms before user can skip
  TOTAL_DURATION: 4200, // ms total loader sequence
  BEAT_1_END: 500,
  BEAT_2_END: 1500,
  BEAT_3_END: 2500,
  BEAT_4_END: 3200,
  BEAT_5_END: 4000,
};

// ===== Scroll Triggers =====
export const SCROLL = {
  HERO_TRIGGER: 0.3, // Start hero animations at 30% viewport
  SECTION_TRIGGER: 0.2, // Start section animations at 20% viewport
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
};

// ===== Three.js Camera Settings =====
export const CAMERA = {
  FOV_START: 75,
  FOV_END: 55,
  NEAR: 0.1,
  FAR: 1000,
};

// ===== DOM Selectors =====
export const SELECTORS = {
  LOADER_OVERLAY: '#loader-overlay',
  APP: '#app',
  CANVAS: '#loader-canvas',
};
