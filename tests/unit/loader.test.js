/**
 * SAC IISER Kolkata — Unit Tests
 * Tests for loader, device detection, and utility modules.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  deviceDetect,
  supportsCinematicLoader,
  getParticleCount,
} from '../../src/utils/deviceDetect.js';
import { PARTICLES, DEVICE } from '../../src/utils/constants.js';

describe('deviceDetect', () => {
  it('should return a valid device tier', () => {
    const tier = deviceDetect();
    const validTiers = [DEVICE.LOW, DEVICE.MID, DEVICE.HIGH];
    expect(validTiers).toContain(tier);
  });
});

describe('supportsCinematicLoader', () => {
  it('should return false for LOW tier', () => {
    expect(supportsCinematicLoader(DEVICE.LOW)).toBe(false);
  });

  it('should return true for MID tier', () => {
    expect(supportsCinematicLoader(DEVICE.MID)).toBe(true);
  });

  it('should return true for HIGH tier', () => {
    expect(supportsCinematicLoader(DEVICE.HIGH)).toBe(true);
  });
});

describe('getParticleCount', () => {
  it('should return correct count for HIGH tier', () => {
    expect(getParticleCount(DEVICE.HIGH)).toBe(PARTICLES.COUNT_HIGH);
  });

  it('should return correct count for MID tier', () => {
    expect(getParticleCount(DEVICE.MID)).toBe(PARTICLES.COUNT_MID);
  });

  it('should return 0 for LOW tier', () => {
    expect(getParticleCount(DEVICE.LOW)).toBe(PARTICLES.COUNT_LOW);
  });
});
