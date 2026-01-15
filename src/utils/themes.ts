// Theme data and utilities

import type { Theme } from '../types';

export const themes: Theme[] = [
  {
    name: 'Sunset Coast',
    colors: {
      '--color-bg': '#F79B72',
      '--color-surface': '#2A4759',
      '--color-primary': '#2A4759',
      '--color-accent': '#F3C623',
      '--color-on-surface': '#F3F3F3',
      '--color-on-bg': '#2A4759',
    },
  },
  {
    name: 'Citrus Sky',
    colors: {
      '--color-bg': '#F4F6FF',
      '--color-surface': '#F3C623',
      '--color-primary': '#10375C',
      '--color-accent': '#EB8317',
      '--color-on-surface': '#10375C',
      '--color-on-bg': '#10375C',
    },
  },
  {
    name: 'Vivid Night',
    colors: {
      '--color-bg': '#2A004E',
      '--color-surface': '#500073',
      '--color-primary': '#C62300',
      '--color-accent': '#F14A00',
      '--color-on-surface': '#FFF',
      '--color-on-bg': '#FFF',
    },
  },
  {
    name: 'Golden Sunrise',
    colors: {
      '--color-bg': '#FFF085',
      '--color-surface': '#FCB454',
      '--color-primary': '#FF9B17',
      '--color-accent': '#F16767',
      '--color-on-surface': '#10375C',
      '--color-on-bg': '#10375C',
    },
  },
  {
    name: 'Fresh Grove',
    colors: {
      '--color-bg': '#DDEB9D',
      '--color-surface': '#A0C878',
      '--color-primary': '#143D60',
      '--color-accent': '#EB5B00',
      '--color-on-surface': '#143D60',
      '--color-on-bg': '#143D60',
    },
  },
  {
    name: 'Spring Picnic',
    colors: {
      '--color-bg': '#C7DB9C',
      '--color-surface': '#FFF0BD',
      '--color-primary': '#E50046',
      '--color-accent': '#FDAB9E',
      '--color-on-surface': '#E50046',
      '--color-on-bg': '#143D60',
    },
  },
];

/**
 * Get default theme index based on time of day
 * Returns 0 (first theme) if theme name is not found
 */
export function getDefaultThemeIdx(): number {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  
  let themeName: string;
  
  // 5:01am = 301, 9:00am = 540, 9:01am = 541, 17:00 = 1020, 17:01 = 1021, 19:00 = 1140
  if (mins >= 301 && mins <= 540) {
    themeName = 'Golden Sunrise';
  } else if (mins >= 541 && mins <= 1020) {
    themeName = 'Citrus Sky';
  } else if (mins >= 1021 && mins <= 1140) {
    themeName = 'Sunset Coast';
  } else {
    themeName = 'Vivid Night';
  }
  
  const idx = themes.findIndex(t => t.name === themeName);
  return idx !== -1 ? idx : 0; // Return 0 if theme not found
}

/**
 * Generate background texture SVG for a theme
 */
export function generateBackgroundTexture(theme: Theme, themeIdx: number): string {
  const bgColor = theme.colors['--color-bg'];
  const accent = theme.colors['--color-accent'];
  
  const svg = `
    <svg width='180' height='180' xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <filter id='fibers' x='0' y='0'>
          <feTurbulence type='turbulence' baseFrequency='0.012' numOctaves='2' seed='${themeIdx + 7}'/>
          <feDisplacementMap in2='SourceGraphic' in='turb' scale='8' xChannelSelector='R' yChannelSelector='G'/>
        </filter>
        <filter id='speckle' x='0' y='0'>
          <feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' seed='${themeIdx + 13}'/>
          <feColorMatrix type='matrix' values='0 0 0 0 0.7  0 0 0 0 0.7  0 0 0 0 0.7  0 0 0 0.13 0'/>
        </filter>
      </defs>
      <rect width='180' height='180' fill='${bgColor}'/>
      <rect width='180' height='180' filter='url(%23fibers)' fill='${accent}' fill-opacity='0.08'/>
      <rect width='180' height='180' filter='url(%23speckle)' fill='${accent}' fill-opacity='0.10'/>
    </svg>
  `;
  
  return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`;
}
