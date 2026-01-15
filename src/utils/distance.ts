// Distance calculation utilities using Haversine formula

import type { Coordinates } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate [longitude, latitude]
 * @param coord2 Second coordinate [longitude, latitude]
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance for a route with multiple waypoints
 * @param coords Array of coordinates
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(coords: Coordinates[]): number {
  if (coords.length < 2) return 0;
  
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalDist += calculateDistance(coords[i], coords[i + 1]);
  }
  return totalDist;
}

/**
 * Estimate travel time based on distance
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h (default: 60)
 * @returns Estimated time in hours
 */
export function estimateTravelTime(distanceKm: number, averageSpeedKmh = 60): number {
  return distanceKm / averageSpeedKmh;
}
