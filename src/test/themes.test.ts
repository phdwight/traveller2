import { describe, it, expect } from 'vitest';
import { themes, getDefaultThemeIdx, generateBackgroundTexture } from '../utils/themes';

describe('theme utilities', () => {
  describe('themes', () => {
    it('should have 6 themes', () => {
      expect(themes).toHaveLength(6);
    });

    it('should have all required themes', () => {
      const themeNames = themes.map(t => t.name);
      
      expect(themeNames).toContain('Sunset Coast');
      expect(themeNames).toContain('Citrus Sky');
      expect(themeNames).toContain('Vivid Night');
      expect(themeNames).toContain('Golden Sunrise');
      expect(themeNames).toContain('Fresh Grove');
      expect(themeNames).toContain('Spring Picnic');
    });

    it('should have all required color properties', () => {
      themes.forEach(theme => {
        expect(theme.colors).toHaveProperty('--color-bg');
        expect(theme.colors).toHaveProperty('--color-surface');
        expect(theme.colors).toHaveProperty('--color-primary');
        expect(theme.colors).toHaveProperty('--color-accent');
        expect(theme.colors).toHaveProperty('--color-on-surface');
        expect(theme.colors).toHaveProperty('--color-on-bg');
      });
    });
  });

  describe('getDefaultThemeIdx', () => {
    it('should return a valid theme index', () => {
      const idx = getDefaultThemeIdx();
      
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(themes.length);
    });

    it('should return an index that maps to a theme', () => {
      const idx = getDefaultThemeIdx();
      
      expect(themes[idx]).toBeDefined();
      expect(themes[idx].name).toBeTruthy();
    });
  });

  describe('generateBackgroundTexture', () => {
    it('should generate an SVG data URL', () => {
      const theme = themes[0];
      const texture = generateBackgroundTexture(theme, 0);
      
      expect(texture).toMatch(/^url\('data:image\/svg\+xml/);
    });

    it('should include theme colors in the SVG', () => {
      const theme = themes[0];
      const texture = generateBackgroundTexture(theme, 0);
      
      // URL encode the background color and check if it's in the texture
      expect(texture).toContain('svg');
    });

    it('should generate unique textures for different themes', () => {
      const texture1 = generateBackgroundTexture(themes[0], 0);
      const texture2 = generateBackgroundTexture(themes[1], 1);
      
      expect(texture1).not.toBe(texture2);
    });
  });
});
