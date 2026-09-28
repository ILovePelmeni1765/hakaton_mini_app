import type { ProblemListItem } from '../types';

export type Coordinates = [latitude: number, longitude: number];

export interface MapViewport {
  center: Coordinates;
  zoom: number;
}

export function viewportRadiusKm(zoom: number) {
  return Math.max(0.5, Math.min(100, 40 / Math.pow(2, zoom - 10)));
}

export interface CityMapProvider {
  mount(): Promise<void>;
  renderProblems(problems: ProblemListItem[], selectedId?: string): Promise<void>;
  setLocation(coordinates: Coordinates, zoom?: number): void;
  changeZoom(delta: number): void;
  mountPicker(coordinates: Coordinates, onChange: (coordinates: Coordinates) => void): Promise<void>;
  destroy(): void;
}

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
}
