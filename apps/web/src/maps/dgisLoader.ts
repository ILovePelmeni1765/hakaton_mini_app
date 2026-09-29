import { Clusterer } from '@2gis/mapgl-clusterer';
export interface DgisEvented {
  on(type: string, listener: (event: DgisEvent) => void): this;
  off(type: string, listener: (event: DgisEvent) => void): this;
}

export interface DgisEvent {
  lngLat?: number[];
  target?: {
    id?: number;
    type?: 'cluster' | 'marker';
    data?: { userData?: { problemId?: string } };
  };
}

export interface DgisMapInstance extends DgisEvented {
  destroy(): void;
  getCenter(): number[];
  getZoom(): number;
  setCenter(center: number[], options?: Record<string, unknown>): this;
  setZoom(zoom: number, options?: Record<string, unknown>): this;
  setLanguage?(language: string): this;
}

export interface DgisMarkerInstance extends DgisEvented {
  destroy(): void;
  getCoordinates(): number[];
  setCoordinates(coordinates: number[]): this;
}

export interface DgisClustererInstance extends DgisEvented {
  destroy(): void;
  getClusterExpansionZoom(clusterId: number): number;
  load(markers: DgisClusterMarker[]): void;
}

export interface DgisClusterMarker {
  type: 'html';
  coordinates: number[];
  html: HTMLElement;
  anchor: number[];
  userData: { problemId: string };
  zIndex: number;
}

type MapConstructor = new (container: HTMLElement, options: Record<string, unknown>) => DgisMapInstance;
type HtmlMarkerConstructor = new (map: DgisMapInstance, options: Record<string, unknown>) => DgisMarkerInstance;
type ClustererConstructor = new (map: DgisMapInstance, options: Record<string, unknown>) => DgisClustererInstance;

export interface DgisMapApi {
  Map: MapConstructor;
  HtmlMarker: HtmlMarkerConstructor;
  Clusterer: ClustererConstructor;
}

declare global {
  interface Window {
    mapgl?: DgisMapApi;
  }
}

const MAPGL_SCRIPT = 'https://mapgl.2gis.com/api/js/v1';
let loading: Promise<DgisMapApi> | undefined;

function loadScript(src: string, marker: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-city-map="${marker}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Не удалось загрузить модуль карты ${marker}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error(`Превышено время загрузки модуля карты ${marker}`)), 15_000);
    script.src = src;
    script.async = true;
    script.dataset.cityMap = marker;
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error(`Не удалось загрузить модуль карты ${marker}`)); };
    document.head.append(script);
  });
}

export function load2GisMaps() {
  if (window.mapgl) {
    window.mapgl.Clusterer = Clusterer as unknown as ClustererConstructor;
    return Promise.resolve(window.mapgl);
  }

  if (loading) return loading;

  loading = (async () => {
    await loadScript(MAPGL_SCRIPT, '2gis-mapgl');

    if (!window.mapgl) {
      throw new Error('MapGL загрузился без объекта mapgl');
    }

    window.mapgl.Clusterer = Clusterer as unknown as ClustererConstructor;

    return window.mapgl;
  })().catch((error: unknown) => {
    loading = undefined;
    throw error;
  });

  return loading;
}
