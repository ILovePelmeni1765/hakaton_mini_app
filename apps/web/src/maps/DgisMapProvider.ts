import { createCityMarker, createProblemMarker } from './markers';
import type { ProblemListItem } from '../types';
import { load2GisMaps, type DgisClustererInstance, type DgisEvent, type DgisMapApi, type DgisMapInstance, type DgisMarkerInstance } from './dgisLoader';
import type { CityMapProvider, Coordinates, MapViewport } from './types';

export class DgisMapProvider implements CityMapProvider {
  private api?: DgisMapApi;
  private map?: DgisMapInstance;
  private clusterer?: DgisClustererInstance;
  private pickerMarker?: DgisMarkerInstance;
  private moveListener?: (event: DgisEvent) => void;
  private zoom = 13;
  private disposed = false;
  private cancelInitialRender?: () => void;

  constructor(
    private readonly element: HTMLElement,
    private readonly apiKey: string,
    private readonly center: Coordinates,
    private readonly onSelect?: (problem: ProblemListItem) => void,
    private readonly onViewportChange?: (viewport: MapViewport) => void,
  ) {}

  async mount() {
    const api = await load2GisMaps();
    if (this.disposed) return;
    this.api = api;
    this.map = new this.api.Map(this.element, {
      key: this.apiKey,
      center: this.toDgis(this.center),
      zoom: this.zoom,
      zoomControl: false,
      floorControl: false,
      scaleControl: false,
      enableTrackResize: true,
      disablePitchByUserInteraction: true,
      disableRotationByUserInteraction: true,
    });
    const initialRender = this.waitForInitialRender();
    this.map.setLanguage?.('ru');
    await initialRender;
    if (this.disposed) return;

    if (this.onViewportChange) {
      this.moveListener = () => {
        if (!this.map) return;
        const mapCenter = this.map.getCenter();
        const longitude = mapCenter[0] ?? this.center[1];
        const latitude = mapCenter[1] ?? this.center[0];
        const zoom = this.map.getZoom();
        this.zoom = zoom;
        this.onViewportChange?.({
          center: [Number(latitude.toFixed(4)), Number(longitude.toFixed(4))],
          zoom: Number(zoom.toFixed(1)),
        });
      };
      this.map.on('moveend', this.moveListener);
    }
  }

  async renderProblems(problems: ProblemListItem[], selectedId?: string) {
    if (!this.api || !this.map) return;
    this.clusterer?.destroy();

    const byId = new Map(problems.map((problem) => [problem.id, problem]));
    this.clusterer = new this.api.Clusterer(this.map, {
      radius: 64,
      disableClusteringAtZoom: 17,
      clusterStyle: (count: number) => ({
        type: 'html',
        html: this.createClusterElement(count),
        anchor: [20, 20],
      }),
    });
    this.clusterer.load(problems.map((problem) => ({
      type: 'html',
      coordinates: this.toDgis([problem.latitude, problem.longitude]),
      html: createProblemMarker(problem, selectedId === problem.id, () => this.onSelect?.(problem)),
      anchor: [22, 43],
      userData: { problemId: problem.id },
      zIndex: selectedId === problem.id ? 2 : 1,
    })));
    this.clusterer.on('click', (event) => {
      if (event.target?.type === 'cluster' && event.target.id !== undefined && event.lngLat) {
        this.map?.setCenter(event.lngLat, { duration: 350 });
        this.map?.setZoom(this.clusterer?.getClusterExpansionZoom(event.target.id) ?? this.zoom + 1, { duration: 350 });
        return;
      }
      const problemId = event.target?.data?.userData?.problemId;
      const problem = problemId ? byId.get(problemId) : undefined;
      if (problem) this.onSelect?.(problem);
    });
  }

  setLocation(coordinates: Coordinates, zoom = 16) {
    this.zoom = zoom;
    this.map?.setCenter(this.toDgis(coordinates), { duration: 450 });
    this.map?.setZoom(zoom, { duration: 450 });
  }

  changeZoom(delta: number) {
    this.zoom = Math.min(19, Math.max(3, (this.map?.getZoom() ?? this.zoom) + delta));
    this.map?.setZoom(this.zoom, { duration: 180 });
  }

  setPickerLocation(coordinates: Coordinates) {
    this.pickerMarker?.setCoordinates(this.toDgis(coordinates));
    this.setLocation(coordinates);
  }

  async mountPicker(coordinates: Coordinates, onChange: (coordinates: Coordinates) => void) {
    await this.mount();
    if (!this.api || !this.map) return;

    const marker = document.createElement('span');
    marker.className = 'city-marker city-marker--selected';
    marker.setAttribute('aria-hidden', 'true');
    marker.append(createCityMarker());
    this.pickerMarker = new this.api.HtmlMarker(this.map, {
      coordinates: this.toDgis(coordinates),
      html: marker,
      anchor: [22, 43],
      interactive: false,
      zIndex: 1000,
    });
    this.map.on('click', (event) => {
      if (!event.lngLat) return;
      this.pickerMarker?.setCoordinates(event.lngLat);
      onChange(this.fromDgis(event.lngLat));
    });
  }

  destroy() {
    this.disposed = true;
    this.cancelInitialRender?.();
    if (this.moveListener) this.map?.off('moveend', this.moveListener);
    this.clusterer?.destroy();
    this.pickerMarker?.destroy();
    this.map?.destroy();
    this.clusterer = undefined;
    this.pickerMarker = undefined;
    this.map = undefined;
  }

  private createClusterElement(count: number) {
    const element = document.createElement('span');
    element.className = 'city-cluster';
    element.textContent = String(count);
    element.setAttribute('aria-label', `${count} сигналов рядом`);
    return element;
  }

  private waitForInitialRender() {
    const map = this.map;
    if (!map) return Promise.reject(new Error('Карта 2ГИС не создана'));
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => finish(() => reject(new Error('Карта 2ГИС не успела загрузиться'))), 20_000);
      const onIdle = () => finish(resolve);
      const onStyleError = () => finish(() => reject(new Error('2ГИС не смог загрузить стиль карты')));
      const finish = (done: () => void) => {
        this.cancelInitialRender = undefined;
        window.clearTimeout(timeout);
        map.off('idle', onIdle);
        map.off('styleloaderror', onStyleError);
        done();
      };
      this.cancelInitialRender = () => finish(resolve);
      map.on('idle', onIdle);
      map.on('styleloaderror', onStyleError);
    });
  }

  private toDgis([latitude, longitude]: Coordinates) {
    return [longitude, latitude];
  }

  private fromDgis([longitude, latitude]: number[]): Coordinates {
    return [latitude ?? this.center[0], longitude ?? this.center[1]];
  }
}
