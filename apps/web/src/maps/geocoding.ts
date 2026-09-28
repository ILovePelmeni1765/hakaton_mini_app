import { api } from '../api';
import type { GeocodeResult } from './types';

interface GeocodeResponse { results: GeocodeResult[] }

export async function geocodeAddress(query: string) {
  const response = await api<GeocodeResponse>(`/maps/geocode?query=${encodeURIComponent(query)}`);
  return response.results;
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const response = await api<GeocodeResponse>(`/maps/reverse?lat=${latitude}&lng=${longitude}`);
  return response.results[0];
}
