import { useEffect, useId, useRef, useState } from 'react';
import { Crosshair, MapPin, Search } from 'lucide-react';
import { Button } from '@pulse/ui';
import type { PersonalAddress } from '@pulse/shared';
import { geocodeAddress, reverseGeocode } from '../maps/geocoding';
import type { Coordinates } from '../maps/types';
import { LocationPicker } from './MapCanvas';
import './address-picker.css';

const cityCenter: Coordinates = [55.0302, 82.9204];

export function AddressPicker({
  value,
  onChange,
  locateOnMount = false,
}: {
  value: PersonalAddress | null;
  onChange(value: PersonalAddress | null): void;
  locateOnMount?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonalAddress[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(0);
  const change = useRef(onChange);
  change.current = onChange;

  // Invalidates geolocation and network callbacks on edits, mode changes and unmount.
  useEffect(() => {
    if (locateOnMount && !value) locate();
    return () => {
      request.current++;
    };
  }, []);

  async function resolvePoint(coordinates: Coordinates, version: number) {
    setBusy('Определяем адрес…');
    const point = { latitude: coordinates[0], longitude: coordinates[1] };
    change.current({ ...point, address: '' });
    try {
      const result = await reverseGeocode(...coordinates);
      if (version !== request.current) return;
      // Keep the chosen point: the geocoder can return a nearby building's coordinates.
      change.current({ ...point, address: result?.address ?? '' });
      if (!result) setMessage('Точка выбрана. Укажите её адрес или ближайший ориентир ниже.');
    } catch {
      if (version !== request.current) return;
      change.current({ ...point, address: '' });
      setMessage('Точка выбрана, но адрес не определился. Укажите адрес или ориентир ниже.');
    } finally {
      if (version === request.current) setBusy('');
    }
  }

  function locate() {
    const version = ++request.current;
    setResults([]);
    setQuery('');
    setMessage('');
    change.current(null);
    if (!navigator.geolocation || !window.isSecureContext) {
      setBusy('');
      setMessage('Геолокация недоступна. Найдите адрес или выберите точку на карте.');
      return;
    }
    setBusy('Определяем местоположение…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (version !== request.current) return;
        void resolvePoint([coords.latitude, coords.longitude], version);
      },
      (error) => {
        if (version !== request.current) return;
        setBusy('');
        setMessage(
          error.code === 1
            ? 'Доступ к геолокации запрещён. Разрешите его в настройках браузера или найдите адрес вручную.'
            : 'Не удалось определить местоположение. Повторите попытку или найдите адрес вручную.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }

  async function search() {
    if (query.trim().length < 3) return;
    const version = ++request.current;
    setBusy('Ищем адрес…');
    setMessage('');
    setResults([]);
    change.current(null);
    try {
      const found = await geocodeAddress(query.trim());
      if (version !== request.current) return;
      setResults(found);
      if (!found.length)
        setMessage('Адрес не найден. Уточните город, улицу и дом или выберите точку на карте.');
    } catch {
      if (version === request.current)
        setMessage('Поиск адресов недоступен. Повторите попытку или выберите точку на карте.');
    } finally {
      if (version === request.current) setBusy('');
    }
  }

  return (
    <div className="address-picker">
      <label htmlFor={`${id}-search`}>Найти адрес</label>
      <div className="address-search">
        <input
          id={`${id}-search`}
          value={query}
          maxLength={240}
          autoComplete="off"
          placeholder="Город, улица, дом"
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            request.current++;
            setQuery(event.target.value);
            setResults([]);
            setBusy('');
            setMessage('');
            change.current(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void search();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={query.trim().length < 3 || Boolean(busy)}
          onClick={() => void search()}
        >
          <Search size={18} />
          Найти
        </Button>
      </div>
      <p id={`${id}-help`} className="address-help">
        Выберите адрес из результатов поиска или отметьте точку на карте.
      </p>
      <div aria-live="polite" aria-atomic="true">
        {busy && <p role="status">{busy}</p>}
        {message && <p className="address-message">{message}</p>}
      </div>
      {results.length > 0 && (
        <ul className="address-results" aria-label="Найденные адреса">
          {results.map((result, index) => (
            <li key={`${result.latitude}:${result.longitude}:${index}`}>
              <button
                type="button"
                onClick={() => {
                  request.current++;
                  setResults([]);
                  setQuery('');
                  setMessage('');
                  change.current(result);
                }}
              >
                <MapPin size={18} />
                <span>{result.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <LocationPicker
        value={value ? [value.latitude, value.longitude] : cityCenter}
        onChange={(coordinates) => {
          const version = ++request.current;
          setResults([]);
          setQuery('');
          setMessage('');
          change.current(null);
          void resolvePoint(coordinates, version);
        }}
      />
      {locateOnMount && (
        <Button type="button" variant="ghost" disabled={Boolean(busy)} onClick={locate}>
          <Crosshair size={18} />
          Определить местоположение ещё раз
        </Button>
      )}
      {value && (
        <div className="address-selected">
          <label htmlFor={`${id}-address`}>Адрес выбранного места</label>
          <input
            id={`${id}-address`}
            value={value.address}
            maxLength={300}
            autoComplete="off"
            disabled={Boolean(busy)}
            placeholder="Улица, дом или ближайший ориентир"
            onChange={(event) => change.current({ ...value, address: event.target.value })}
          />
          <p className="address-help">
            Можно уточнить корпус или ориентир. Чтобы выбрать другое место, используйте поиск или
            карту.
          </p>
        </div>
      )}
    </div>
  );
}
