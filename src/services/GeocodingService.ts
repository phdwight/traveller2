// Service for geocoding operations using Mapbox API

import type { Coordinates, MapboxResponse, MapboxFeature } from '../types';

export class GeocodingService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Geocode a place name to coordinates
   */
  async geocode(placeName: string): Promise<Coordinates | null> {
    if (!this.accessToken) {
      console.warn('Mapbox token is missing');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?access_token=${this.accessToken}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: MapboxResponse = await response.json();
      
      if (data.features && data.features[0]) {
        return data.features[0].center;
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding place:', error);
      return null;
    }
  }

  /**
   * Geocode multiple places to coordinates
   */
  async geocodeMultiple(places: string[]): Promise<Coordinates[]> {
    const coordPromises = places.map((place) => this.geocode(place));
    const coords = await Promise.all(coordPromises);

    // Filter out any null results while preserving the Coordinates[] type
    return coords.filter(
      (coord): coord is Coordinates => coord !== null
    );
  }

  /**
   * Get autocomplete suggestions for a query
   */
  async getSuggestions(query: string): Promise<MapboxFeature[]> {
    if (!query.trim() || !this.accessToken) {
      return [];
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MapboxResponse = await response.json();
      return data.features || [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }
}
