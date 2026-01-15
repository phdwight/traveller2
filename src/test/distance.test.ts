import { describe, it, expect } from 'vitest';
import { calculateDistance, calculateTotalDistance, estimateTravelTime } from '../utils/distance';

describe('distance utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // New York to London (approximately 5570 km)
      const nyc: [number, number] = [-74.006, 40.7128];
      const london: [number, number] = [-0.1276, 51.5074];
      
      const distance = calculateDistance(nyc, london);
      
      // Check if distance is approximately correct (within 100 km)
      expect(distance).toBeGreaterThan(5400);
      expect(distance).toBeLessThan(5700);
    });

    it('should return 0 for same coordinates', () => {
      const coord: [number, number] = [0, 0];
      const distance = calculateDistance(coord, coord);
      
      expect(distance).toBe(0);
    });

    it('should handle coordinates at the equator', () => {
      const coord1: [number, number] = [0, 0];
      const coord2: [number, number] = [1, 0];
      
      const distance = calculateDistance(coord1, coord2);
      
      // 1 degree at equator is approximately 111 km
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should return 0 for empty array', () => {
      expect(calculateTotalDistance([])).toBe(0);
    });

    it('should return 0 for single coordinate', () => {
      expect(calculateTotalDistance([[0, 0]])).toBe(0);
    });

    it('should calculate total distance for multiple coordinates', () => {
      const coords: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
      ];
      
      const totalDistance = calculateTotalDistance(coords);
      
      // Should be approximately 111 km + 111 km = 222 km
      expect(totalDistance).toBeGreaterThan(200);
      expect(totalDistance).toBeLessThan(250);
    });
  });

  describe('estimateTravelTime', () => {
    it('should estimate travel time correctly', () => {
      const distance = 120; // 120 km
      const speed = 60; // 60 km/h
      
      const time = estimateTravelTime(distance, speed);
      
      expect(time).toBe(2); // 2 hours
    });

    it('should use default speed of 60 km/h', () => {
      const distance = 120; // 120 km
      
      const time = estimateTravelTime(distance);
      
      expect(time).toBe(2); // 2 hours
    });

    it('should handle 0 distance', () => {
      const time = estimateTravelTime(0);
      
      expect(time).toBe(0);
    });
  });
});
