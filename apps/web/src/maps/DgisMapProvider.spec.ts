import { describe, expect, it, vi } from 'vitest';
import { DgisMapProvider } from './DgisMapProvider';
import { load2GisMaps, type DgisEvent } from './dgisLoader';

vi.mock('./dgisLoader', () => ({ load2GisMaps: vi.fn() }));

describe('location picker synchronization', () => {
  it('moves both the marker and camera after an address is selected and reports map clicks in latitude/longitude order', async () => {
    const listeners = new Map<string, (event: DgisEvent) => void>();
    const markerPosition = vi.fn();
    const mapCenter = vi.fn();
    class MapStub {
      on(type: string, listener: (event: DgisEvent) => void) {
        listeners.set(type, listener);
        if (type === 'idle') queueMicrotask(() => listener({}));
        return this;
      }
      off() {
        return this;
      }
      destroy() {}
      getCenter() {
        return [82, 55];
      }
      getZoom() {
        return 13;
      }
      setCenter(point: number[]) {
        mapCenter(point);
        return this;
      }
      setZoom() {
        return this;
      }
    }
    class MarkerStub {
      on() {
        return this;
      }
      off() {
        return this;
      }
      destroy() {}
      getCoordinates() {
        return [82, 55];
      }
      setCoordinates(point: number[]) {
        markerPosition(point);
        return this;
      }
    }
    class ClusterStub {
      on() {
        return this;
      }
      off() {
        return this;
      }
      destroy() {}
      getClusterExpansionZoom() {
        return 16;
      }
      load() {}
    }
    vi.mocked(load2GisMaps).mockResolvedValue({
      Map: MapStub,
      HtmlMarker: MarkerStub,
      Clusterer: ClusterStub,
    });
    const provider = new DgisMapProvider(document.createElement('div'), 'test', [55, 82]);
    const changed = vi.fn();
    await provider.mountPicker([55, 82], changed);
    provider.setPickerLocation([55.04, 82.95]);
    expect(markerPosition).toHaveBeenLastCalledWith([82.95, 55.04]);
    expect(mapCenter).toHaveBeenLastCalledWith([82.95, 55.04]);
    listeners.get('click')?.({ lngLat: [82.97, 55.07] });
    expect(changed).toHaveBeenCalledWith([55.07, 82.97]);
    provider.destroy();
  });
});
