/**
 * SAC IISER Kolkata — Device Performance Detection
 * Detects device tier to adjust particle count / visual fidelity.
 * The cinematic loader runs on ALL desktop browsers — only the
 * particle count is scaled down on lower-end machines.
 * Fully skipped only for prefers-reduced-motion.
 */

import { DEVICE } from './constants.js';

/**
 * Detects the device performance tier.
 * @returns {string} 'low' | 'mid' | 'high'
 *
 * Low  = prefers-reduced-motion or actual mobile UA → skip cinematic loader
 * Mid  = desktop, moderate specs → cinematic loader with fewer particles
 * High = desktop, 8+ cores, 8+ GB  → full cinematic experience
 */
export function deviceDetect() {
  // Only skip cinematic for accessibility preference
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return DEVICE.LOW;

  // Check for mobile device (actual phones/tablets)
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) return DEVICE.LOW;

  // Check available hardware for fidelity tier
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;

  // High-end: desktop with 8+ cores and 8+ GB RAM
  if (cores >= 8 && memory >= 8) return DEVICE.HIGH;

  // Everything else is mid-range
  return DEVICE.MID;
}

/**
 * Returns the appropriate particle count for the loader based on device tier.
 * @param {string} tier - Device tier from deviceDetect()
 * @returns {number} Particle count
 */
export function getParticleCount(tier) {
  switch (tier) {
    case DEVICE.HIGH:
      return 1200;
    case DEVICE.MID:
      return 400;
    case DEVICE.LOW:
    default:
      return 0;
  }
}

/**
 * Check if we should use the cinematic loader or a simple CSS fallback.
 * @param {string} [tier] - Device tier; if omitted, auto-detects
 * @returns {boolean}
 */
export function supportsCinematicLoader(tier) {
  if (!tier) tier = deviceDetect();
  return tier !== DEVICE.LOW;
}
