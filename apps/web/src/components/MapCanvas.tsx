import { LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProblemListItem } from '../types';
import { DgisMapProvider } from '../maps/DgisMapProvider';
import type { Coordinates, MapViewport } from '../maps/types';

const apiKey = import.meta.env.VITE_DGIS_MAPS_API_KEY?.trim();

function MapSetupState({ retry, compact = false }: { retry?: () => void; compact?: boolean }) {
  const message = apiKey
    ? 'Не удалось загрузить карту. Проверьте соединение и повторите попытку.'
    : compact
      ? 'Найдите адрес через поиск выше или используйте местоположение, если оно доступно.'
      : 'Выберите сигнал в реестре: адрес, статус и действия остаются доступны.';
  return (
    <div className={`map-setup${compact ? ' map-setup--compact' : ''}`} role="status">
      <div>
        <strong>Интерактивная карта временно недоступна</strong>
        <span>{message}</span>
      </div>
      {retry && <button className="button button--quiet button--small" type="button" onClick={retry}><RotateCcw size={16} /> Повторить</button>}
    </div>
  );
}

export function MapCanvas({ problems, selectedId, onSelect, onViewportChange, center = [55.0302, 82.9204], locate }: {
  problems: ProblemListItem[];
  selectedId?: string;
  onSelect(problem: ProblemListItem): void;
  onViewportChange?(viewport: MapViewport): void;
  center?: Coordinates;
  locate?: Coordinates | null;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<DgisMapProvider | null>(null);
  const selectRef = useRef(onSelect);
  const viewportRef = useRef(onViewportChange);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(apiKey ? 'loading' : 'idle');
  const [attempt, setAttempt] = useState(0);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  selectRef.current = onSelect;
  viewportRef.current = onViewportChange;

  useEffect(() => {
    if (!elementRef.current || !apiKey) return;
    let active = true;
    setStatus('loading');
    const provider = new DgisMapProvider(
      elementRef.current,
      apiKey,
      center,
      (problem) => selectRef.current(problem),
      (viewport) => viewportRef.current?.(viewport),
    );
    providerRef.current = provider;
    provider.mount()
      .then(() => provider.renderProblems(problems, selectedId))
      .then(() => active && setStatus('ready'))
      .catch(() => active && setStatus('error'));
    return () => { active = false; provider.destroy(); providerRef.current = null; };
  }, [attempt]);

  useEffect(() => {
    if (status === 'ready') void providerRef.current?.renderProblems(problems, selectedId);
  }, [problems, selectedId, status]);

  useEffect(() => {
    if (locate) providerRef.current?.setLocation(locate, 16);
  }, [locate, status]);

  const locateUser = () => {
    setLocationError('');
    if (!navigator.geolocation || !window.isSecureContext) { setLocationError('Геолокация недоступна. Найдите место по адресу.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      providerRef.current?.setLocation([coords.latitude, coords.longitude], 16);
      setLocating(false);
    }, (error) => { setLocating(false); setLocationError(error.code === 1 ? 'Разрешите доступ к местоположению в настройках браузера или введите адрес.' : 'Не удалось определить местоположение. Повторите попытку или введите адрес.'); }, { enableHighAccuracy: true, timeout: 6000 });
  };

  return (
    <div className="map-frame">
      <div ref={elementRef} className="map-canvas" role="application" aria-label="Карта городских сигналов 2ГИС" />
      {(status === 'idle' || status === 'error') && <MapSetupState retry={apiKey ? () => setAttempt((value) => value + 1) : undefined} />}
      {status === 'loading' && <div className="map-loading" role="status"><span className="spinner" /> Загружаем карту</div>}
      {locationError && <p className="map-location-message" role="alert">{locationError}</p>}
      {status === 'ready' && (
        <div className="map-controls" aria-label="Управление картой">
          <button type="button" onClick={() => providerRef.current?.changeZoom(1)} aria-label="Приблизить карту" title="Приблизить карту"><Plus size={18} /></button>
          <button type="button" onClick={() => providerRef.current?.changeZoom(-1)} aria-label="Отдалить карту" title="Отдалить карту"><Minus size={18} /></button>
          <button type="button" className="map-locate" onClick={locateUser} disabled={locating} aria-label="Показать моё местоположение"><LocateFixed size={18} /><span>{locating ? 'Ищем…' : 'Где я'}</span></button>
        </div>
      )}
    </div>
  );
}

export function LocationPicker({ value, onChange }: { value: Coordinates; onChange(value: Coordinates): void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<DgisMapProvider | null>(null);
  const callbackRef = useRef(onChange);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(apiKey ? 'loading' : 'idle');
  const [attempt, setAttempt] = useState(0);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!elementRef.current || !apiKey) return;
    let active = true;
    setStatus('loading');
    const provider = new DgisMapProvider(elementRef.current, apiKey, value);
    providerRef.current = provider;
    provider.mountPicker(value, (coordinates) => callbackRef.current(coordinates))
      .then(() => active && setStatus('ready'))
      .catch(() => active && setStatus('error'));
    return () => { active = false; provider.destroy(); providerRef.current = null; };
  }, [attempt]);

  useEffect(() => {
    if (status === 'ready') providerRef.current?.setPickerLocation(value);
  }, [value[0], value[1], status]);

  return (
    <div className="location-picker-frame">
      <div ref={elementRef} className="location-picker" role="application" aria-label="Выбор точки проблемы на карте 2ГИС" />
      {(status === 'idle' || status === 'error') && <MapSetupState compact retry={apiKey ? () => setAttempt((value) => value + 1) : undefined} />}
      {status === 'loading' && <div className="map-loading" role="status"><span className="spinner" /> Загружаем карту</div>}
    </div>
  );
}
