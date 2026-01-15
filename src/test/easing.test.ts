import { describe, it, expect } from 'vitest';
import { easeInOutCubic, easeInOutQuad, easeInOutSine, linear, getEasingFunction } from '../utils/easing';

describe('easing functions', () => {
  describe('easeInOutCubic', () => {
    it('should return 0 at start', () => {
      expect(easeInOutCubic(0)).toBe(0);
    });

    it('should return 1 at end', () => {
      expect(easeInOutCubic(1)).toBe(1);
    });

    it('should return 0.5 at midpoint', () => {
      expect(easeInOutCubic(0.5)).toBe(0.5);
    });

    it('should be smooth in first half', () => {
      const t1 = easeInOutCubic(0.25);
      const t2 = easeInOutCubic(0.5);
      
      // Should accelerate
      expect(t1).toBeLessThan(0.25);
      expect(t2).toBe(0.5);
    });

    it('should be smooth in second half', () => {
      const t1 = easeInOutCubic(0.5);
      const t2 = easeInOutCubic(0.75);
      
      // Should decelerate
      expect(t2).toBeGreaterThan(0.75);
      expect(t1).toBe(0.5);
    });
  });

  describe('easeInOutQuad', () => {
    it('should return 0 at start', () => {
      expect(easeInOutQuad(0)).toBe(0);
    });

    it('should return 1 at end', () => {
      expect(easeInOutQuad(1)).toBe(1);
    });

    it('should return 0.5 at midpoint', () => {
      expect(easeInOutQuad(0.5)).toBe(0.5);
    });
  });

  describe('easeInOutSine', () => {
    it('should return 0 at start', () => {
      expect(easeInOutSine(0)).toBeCloseTo(0, 10);
    });

    it('should return 1 at end', () => {
      expect(easeInOutSine(1)).toBeCloseTo(1, 10);
    });

    it('should return 0.5 at midpoint', () => {
      expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 10);
    });
  });

  describe('linear', () => {
    it('should return input unchanged', () => {
      expect(linear(0)).toBe(0);
      expect(linear(0.25)).toBe(0.25);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(0.75)).toBe(0.75);
      expect(linear(1)).toBe(1);
    });
  });

  describe('getEasingFunction', () => {
    it('should return easeInOutCubic for "easeInOutCubic"', () => {
      expect(getEasingFunction('easeInOutCubic')).toBe(easeInOutCubic);
    });

    it('should return easeInOutQuad for "easeInOutQuad"', () => {
      expect(getEasingFunction('easeInOutQuad')).toBe(easeInOutQuad);
    });

    it('should return easeInOutSine for "easeInOutSine"', () => {
      expect(getEasingFunction('easeInOutSine')).toBe(easeInOutSine);
    });

    it('should return linear for "linear"', () => {
      expect(getEasingFunction('linear')).toBe(linear);
    });

    it('should return easeInOutCubic for unknown names', () => {
      expect(getEasingFunction('unknown')).toBe(easeInOutCubic);
    });
  });
});
