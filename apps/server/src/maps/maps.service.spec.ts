import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapsService } from './maps.service';

describe('MapsService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('explains how to recover when the server geocoder key is missing', async () => {
    const config = { get: vi.fn().mockReturnValue('') } as unknown as ConfigService;
    const service = new MapsService(config);
    await expect(service.geocode('Красный проспект')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('normalizes 2GIS coordinates to latitude and longitude', async () => {
    const config = { get: vi.fn().mockReturnValue('server-key') } as unknown as ConfigService;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 200 }, result: { items: [{
        point: { lon: 82.9204, lat: 55.0302 },
        full_name: 'Новосибирск, Красный проспект, 10',
      }] } }),
    }));
    const service = new MapsService(config);
    await expect(service.geocode('Красный проспект')).resolves.toEqual({ results: [{
      address: 'Новосибирск, Красный проспект, 10',
      latitude: 55.0302,
      longitude: 82.9204,
    }] });
  });
});
