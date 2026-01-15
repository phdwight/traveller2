// Custom hook for managing geocoding

import { useState, useEffect } from 'react';
import { GeocodingService } from '../services/GeocodingService';
import type { Coordinates, MapboxFeature } from '../types';

export function useGeocoding(accessToken: string | undefined) {
  const [service] = useState(() => new GeocodingService(accessToken || ''));

  return service;
}

/**
 * Hook to geocode places to coordinates
 */
export function useGeocodedCoordinates(places: string[], geocodingService: GeocodingService) {
  const [coords, setCoords] = useState<Coordinates[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (places.length === 0) {
      setCoords([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchCoords() {
      const results = await geocodingService.geocodeMultiple(places);
      if (!cancelled) {
        setCoords(results);
        setLoading(false);
      }
    }

    fetchCoords();

    return () => {
      cancelled = true;
    };
  }, [places, geocodingService]);

  return { coords, loading };
}

/**
 * Hook to get autocomplete suggestions
 */
export function useSuggestions(input: string, geocodingService: GeocodingService) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      const results = await geocodingService.getSuggestions(input);
      if (!cancelled) {
        setSuggestions(results);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [input, geocodingService]);

  return suggestions;
}
