import { describe, expect, it } from 'vitest';
import { viewportRadiusKm } from './types';

describe('viewportRadiusKm', () => {
  it('narrows the server query as the map zooms in and keeps safe limits', () => {
    expect(viewportRadiusKm(10)).toBe(40);
    expect(viewportRadiusKm(13)).toBe(5);
    expect(viewportRadiusKm(20)).toBe(0.5);
    expect(viewportRadiusKm(1)).toBe(100);
  });
});
