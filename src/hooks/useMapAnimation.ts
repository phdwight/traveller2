// Custom hook for managing map animation

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Coordinates } from '../types';
import { easeInOutCubic } from '../utils/easing';
import { SoundService } from '../services/SoundService';

interface AnimationOptions {
  speed: number;
  isPaused: boolean;
  onSegmentComplete?: (segment: number) => void;
  onComplete?: () => void;
}

export function useMapAnimation(
  map: mapboxgl.Map | null,
  coords: Coordinates[],
  shouldAnimate: boolean,
  options: AnimationOptions,
  soundService: SoundService
) {
  const animationStateRef = useRef<{
    isPaused: boolean;
    currentFrame: number | null;
  }>({ isPaused: false, currentFrame: null });
  
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Update pause state
  useEffect(() => {
    animationStateRef.current.isPaused = options.isPaused;
  }, [options.isPaused]);

  // Main animation effect
  useEffect(() => {
    if (!shouldAnimate || !map || coords.length < 2) return;

    let animationFrame: number | null = null;
    let marker: mapboxgl.Marker | null = null;
    let routeLayerAdded = false;
    let routeSourceAdded = false;
    let cleanupDone = false;

    // Reset animation state
    animationStateRef.current = { isPaused: false, currentFrame: null };

    // Remove previous route and markers
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Create animated marker at starting position
    marker = new mapboxgl.Marker({ color: '#eab308' })
      .setLngLat(coords[0])
      .addTo(map);

    const progressCoords: Coordinates[] = [coords[0]];
    let currentSegmentIndex = 0;

    // Play start sound
    soundService.play('start');

    function cleanup() {
      if (cleanupDone) return;
      cleanupDone = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (marker) marker.remove();
      if (!map) return;
      if (routeLayerAdded && map.getLayer('route')) map.removeLayer('route');
      if (routeSourceAdded && map.getSource('route')) map.removeSource('route');
    }

    function animateSegment(start: Coordinates, end: Coordinates, onDone: () => void) {
      if (!map) return;
      
      const mapInstance = map; // Capture for closure
      const baseDuration = 3500;
      const duration = baseDuration / options.speed;
      const startTime = performance.now();

      function frame(now: number) {
        // Check if animation is paused
        if (animationStateRef.current.isPaused) {
          animationStateRef.current.currentFrame = requestAnimationFrame(frame);
          return;
        }

        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const smoothT = easeInOutCubic(t);
        
        const lng = start[0] + (end[0] - start[0]) * smoothT;
        const lat = start[1] + (end[1] - start[1]) * smoothT;
        
        marker!.setLngLat([lng, lat]);
        
        // Update route line
        (mapInstance.getSource('route') as mapboxgl.GeoJSONSource)?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [...progressCoords, [lng, lat]] },
          properties: {},
        });

        // Smooth zoom: zoom in at start, hold, then zoom out at end
        let zoom = 8;
        if (t < 0.18) {
          zoom = 8 + 2 * (t / 0.18); // 8 -> 10
        } else if (t > 0.82) {
          zoom = 10 - 2 * ((t - 0.82) / 0.18); // 10 -> 8
        } else {
          zoom = 10;
        }
        
        mapInstance.easeTo({ center: [lng, lat], zoom, duration: 100, essential: true });

        if (t < 1) {
          animationFrame = requestAnimationFrame(frame);
        } else {
          progressCoords.push(end);
          marker!.setLngLat(end);
          
          (mapInstance.getSource('route') as mapboxgl.GeoJSONSource)?.setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: progressCoords },
            properties: {},
          });
          
          soundService.play('segment');
          onDone();
        }
      }

      animationFrame = requestAnimationFrame(frame);
    }

    function animateRoute() {
      if (currentSegmentIndex < coords.length - 1) {
        options.onSegmentComplete?.(currentSegmentIndex + 1);
        
        const start = coords[currentSegmentIndex];
        const end = coords[currentSegmentIndex + 1];
        
        animateSegment(start, end, () => {
          currentSegmentIndex++;
          if (currentSegmentIndex < coords.length - 1) {
            animateRoute();
          } else {
            soundService.play('complete');
            showAllMarkersAndRoute();
            options.onComplete?.();
          }
        });
      }
    }

    function showAllMarkersAndRoute() {
      if (!map) return;
      
      if (marker) marker.remove();
      if (routeLayerAdded && map.getLayer('route')) map.removeLayer('route');
      if (routeSourceAdded && map.getSource('route')) map.removeSource('route');
      
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {},
        },
      });
      
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-dasharray': [2, 4],
        },
      });
      
      const newMarkers: mapboxgl.Marker[] = coords.map((coord) => {
        const m = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat(coord)
          .addTo(map);
        return m;
      });
      
      markersRef.current = newMarkers;
      
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 60, duration: 900 });
    }

    // Start animation: fly to starting point first
    map.flyTo({ center: coords[0], zoom: 10, speed: 1.2 });
    
    const onMoveEnd = () => {
      // Add route source and layer
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
      
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: progressCoords },
          properties: {},
        },
      });
      routeSourceAdded = true;
      
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-dasharray': [2, 3],
        },
      });
      routeLayerAdded = true;
      
      animateRoute();
      map.off('moveend', onMoveEnd);
    };
    
    map.on('moveend', onMoveEnd);

    return cleanup;
  }, [map, coords, shouldAnimate, options, soundService]);

  return {
    markers: markersRef.current,
  };
}

/**
 * Hook to display static markers on the map
 */
export function useStaticMarkers(
  map: mapboxgl.Map | null,
  coords: Coordinates[],
  isAnimating: boolean
) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map || coords.length === 0 || isAnimating) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    
    // Add new markers
    const newMarkers: mapboxgl.Marker[] = coords.map((coord) => {
      const marker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(coord)
        .addTo(map);
      return marker;
    });
    
    markersRef.current = newMarkers;

    // Fly to last marker
    const last = coords[coords.length - 1];
    map.flyTo({ center: last, zoom: 10, speed: 1.2 });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, coords, isAnimating]);

  return markersRef.current;
}
