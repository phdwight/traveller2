// Type definitions for the application

export interface Theme {
  name: string;
  colors: {
    '--color-bg': string;
    '--color-surface': string;
    '--color-primary': string;
    '--color-accent': string;
    '--color-on-surface': string;
    '--color-on-bg': string;
  };
}

export interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

export interface MapboxResponse {
  features: MapboxFeature[];
}

export type Coordinates = [number, number];

export interface AnimationState {
  isPaused: boolean;
  currentFrame: number | null;
}

export type EasingFunction = (t: number) => number;
