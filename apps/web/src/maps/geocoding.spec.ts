import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { geocodeAddress, reverseGeocode } from './geocoding';

vi.mock('../api', () => ({ api: vi.fn() }));

const apiMock = vi.mocked(api);

describe('2GIS geocoding client', () => {
  beforeEach(() => apiMock.mockReset());

  it('encodes an address before sending it to the server proxy', async () => {
    apiMock.mockResolvedValue({ results: [] });
    await geocodeAddress('Красный проспект, 10');
    expect(apiMock).toHaveBeenCalledWith('/maps/geocode?query=%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D1%8B%D0%B9%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%2C%2010');
  });

  it('returns the first reverse-geocoded address result', async () => {
    apiMock.mockResolvedValue({ results: [{ address: 'Красный проспект, 10', latitude: 55.03, longitude: 82.92 }] });
    const result = await reverseGeocode(55.03, 82.92);
    expect(apiMock).toHaveBeenCalledWith('/maps/reverse?lat=55.03&lng=82.92');
    expect(result?.address).toBe('Красный проспект, 10');
  });
});
