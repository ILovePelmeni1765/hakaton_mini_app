import { load } from '@2gis/mapgl';
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

type MapConstructor = new (
  container: HTMLElement,
  options: Record<string, unknown>,
) => DgisMapInstance;

type HtmlMarkerConstructor = new (
  map: DgisMapInstance,
  options: Record<string, unknown>,
) => DgisMarkerInstance;

type ClustererConstructor = new (
  map: DgisMapInstance,
  options: Record<string, unknown>,
) => DgisClustererInstance;

export interface DgisMapApi {
  Map: MapConstructor;
  HtmlMarker: HtmlMarkerConstructor;
  Clusterer: ClustererConstructor;
}

let loading: Promise<DgisMapApi> | undefined;

export function load2GisMaps(): Promise<DgisMapApi> {
  if (loading) return loading;

  loading = load()
    .then((mapgl) => ({
      Map: mapgl.Map as unknown as MapConstructor,
      HtmlMarker: mapgl.HtmlMarker as unknown as HtmlMarkerConstructor,
      Clusterer: Clusterer as unknown as ClustererConstructor,
    }))
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });

  return loading;
}