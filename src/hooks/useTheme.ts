// Custom hook for managing theme state and application

import { useEffect } from 'react';
import type { Theme } from '../types';
import { generateBackgroundTexture } from '../utils/themes';

/**
 * Hook to apply theme colors and background texture to the document
 */
export function useTheme(theme: Theme, themeIdx: number): void {
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Apply background texture
    const bgTexture = generateBackgroundTexture(theme, themeIdx);
    root.style.setProperty('--bg-texture', bgTexture);
  }, [theme, themeIdx]);
}
