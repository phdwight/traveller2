// Easing functions for smooth animations

import type { EasingFunction } from '../types';

/**
 * Cubic ease-in-out easing function
 * Provides smooth acceleration and deceleration
 */
export const easeInOutCubic: EasingFunction = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Quadratic ease-in-out easing function
 * Gentler than cubic
 */
export const easeInOutQuad: EasingFunction = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

/**
 * Sine ease-in-out easing function
 * Very smooth and natural
 */
export const easeInOutSine: EasingFunction = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

/**
 * Linear easing (no easing)
 */
export const linear: EasingFunction = (t: number): number => {
  return t;
};

/**
 * Get easing function by name
 */
export function getEasingFunction(name: string): EasingFunction {
  switch (name) {
    case 'easeInOutQuad':
      return easeInOutQuad;
    case 'easeInOutSine':
      return easeInOutSine;
    case 'linear':
      return linear;
    case 'easeInOutCubic':
    default:
      return easeInOutCubic;
  }
}
