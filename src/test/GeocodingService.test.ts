import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeocodingService } from '../services/GeocodingService';

// Mock fetch
global.fetch = vi.fn();

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService('test-token');
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with access token', () => {
      expect(service).toBeInstanceOf(GeocodingService);
    });
  });

  describe('geocode', () => {
    it('should return null when token is missing', async () => {
      const noTokenService = new GeocodingService('');
      const result = await noTokenService.geocode('London');
      expect(result).toBeNull();
    });

    it('should geocode a place and return coordinates', async () => {
      const mockResponse = {
        features: [
          { center: [-0.1276, 51.5074] }
        ]
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.geocode('London');

      expect(result).toEqual([-0.1276, 51.5074]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('London')
      );
    });

    it('should return null when no results found', async () => {
      const mockResponse = { features: [] };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.geocode('NonexistentPlace');

      expect(result).toBeNull();
    });

    it('should handle fetch errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await service.geocode('London');

      expect(result).toBeNull();
    });
  });

  describe('geocodeMultiple', () => {
    it('should geocode multiple places in parallel', async () => {
      const mockResponse1 = { features: [{ center: [1, 2] }] };
      const mockResponse2 = { features: [{ center: [3, 4] }] };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const result = await service.geocodeMultiple(['Place1', 'Place2']);

      expect(result).toEqual([[1, 2], [3, 4]]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should filter out null results', async () => {
      const mockResponse1 = { features: [{ center: [1, 2] }] };
      const mockResponse2 = { features: [] };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const result = await service.geocodeMultiple(['Place1', 'Place2']);

      expect(result).toEqual([[1, 2]]);
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for empty query', async () => {
      const result = await service.getSuggestions('');
      expect(result).toEqual([]);
    });

    it('should return empty array when token is missing', async () => {
      const noTokenService = new GeocodingService('');
      const result = await noTokenService.getSuggestions('test');
      expect(result).toEqual([]);
    });

    it('should fetch and return suggestions', async () => {
      const mockSuggestions = [
        { id: '1', place_name: 'London', center: [1, 2] as [number, number] },
        { id: '2', place_name: 'Paris', center: [3, 4] as [number, number] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: mockSuggestions }),
      });

      const result = await service.getSuggestions('test');

      expect(result).toEqual(mockSuggestions);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('autocomplete=true')
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await service.getSuggestions('test');

      expect(result).toEqual([]);
    });
  });
});
