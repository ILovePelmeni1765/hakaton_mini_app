import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DgisGeocoderItem {
  address_name?: string;
  full_name?: string;
  name?: string;
  point?: { lat?: number; lon?: number };
}

interface DgisGeocoderResponse {
  meta?: { code?: number };
  result?: { items?: DgisGeocoderItem[] };
}

@Injectable()
export class MapsService {
  constructor(private readonly config: ConfigService) {}

  geocode(rawQuery: string) {
    const query = this.requireText(rawQuery, 'Укажите адрес или ориентир');
    return this.request({ q: query, location: '82.9204,55.0302', sort: 'distance' });
  }

  reverse(rawLat: string, rawLng: string) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('Координаты указаны неверно');
    }
    return this.request({ lat: String(lat), lon: String(lng) });
  }

  private requireText(value: string | undefined, message: string) {
    const result = value?.trim();
    if (!result) throw new BadRequestException(message);
    if (result.length > 240) throw new BadRequestException('Запрос слишком длинный');
    return result;
  }

  private async request(params: Record<string, string>) {
    const apiKey = this.config.get<string>('DGIS_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('Поиск адресов не настроен. Добавьте DGIS_API_KEY на сервере.');
    }

    const url = new URL('https://catalog.api.2gis.com/3.0/items/geocode');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('fields', 'items.point');
    url.searchParams.set('page_size', '5');
    Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    } catch {
      throw new BadGatewayException('Сервис поиска адресов не ответил. Повторите попытку.');
    }
    if (!response.ok) throw new BadGatewayException('Сервис поиска адресов временно недоступен');

    const payload = await response.json() as DgisGeocoderResponse;
    if (payload.meta?.code !== undefined && payload.meta.code !== 200) {
      throw new BadGatewayException('Сервис поиска адресов отклонил запрос');
    }
    return {
      results: (payload.result?.items ?? []).flatMap((item) => {
        const lat = item.point?.lat;
        const lng = item.point?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        return [{
          address: item.full_name ?? item.address_name ?? item.name ?? params.q ?? `${lat}, ${lng}`,
          latitude: lat as number,
          longitude: lng as number,
        }];
      }),
    };
  }
}
