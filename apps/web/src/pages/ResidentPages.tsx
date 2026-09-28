import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, CircleCheck, Crosshair, Filter, Layers3, List, Map as MapIcon, MapPin, MapPinPlus, Search, SearchX, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react';
import { Button, Card, EmptyState } from '@pulse/ui';
import { categoryLabels, CATEGORIES, matchesSearch, missionPhase, PROBLEM_STATUSES, statusLabels } from '@pulse/shared';
import { api } from '../api';
import type { Mission, ProblemListItem, Summary } from '../types';
import { MapCanvas } from '../components/MapCanvas';
import { MapProblemPreview } from '../components/MapProblemPreview';
import { ProblemCard } from '../components/ProblemCard';
import { StatusBadge } from '../components/StatusBadge';
import { geocodeAddress } from '../maps/geocoding';
import { viewportRadiusKm, type MapViewport } from '../maps/types';

export function ResidentHomePage() {
  const mapConfigured = Boolean(import.meta.env.VITE_DGIS_MAPS_API_KEY?.trim());
  const [view, setView] = useState<'map' | 'list'>(() => mapConfigured || window.innerWidth > 760 ? 'map' : 'list');
  const [selected, setSelected] = useState<ProblemListItem>();
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [locate, setLocate] = useState<[number, number] | null>(null);
  const [viewport, setViewport] = useState<MapViewport>();
  const navigate = useNavigate();
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => api<Summary>('/dashboard/summary'), refetchInterval: 60_000 });
  const viewportQuery = viewport ? `&lat=${viewport.center[0]}&lng=${viewport.center[1]}&radius=${viewportRadiusKm(viewport.zoom).toFixed(2)}` : '';
  const problems = useQuery({ queryKey: ['problems', status, category, viewport?.center, viewport?.zoom], queryFn: () => api<ProblemListItem[]>(`/problems?limit=120${status ? `&status=${status}` : ''}${category ? `&category=${category}` : ''}${viewportQuery}`) });
  const visible = useMemo(() => (problems.data ?? []).filter((problem) => matchesSearch(`${problem.title} ${problem.address}`, search)), [problems.data, search]);

  const selectProblem = (problem: ProblemListItem) => {
    setSelected(problem);
    setLocate([problem.latitude, problem.longitude]);
    setView('map');
  };
  const locateMe = () => {
    setSearchError('');
    if (!navigator.geolocation || !window.isSecureContext) { setSearchError('Геолокация недоступна в этом браузере или соединении. Найдите место по адресу.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocate([position.coords.latitude, position.coords.longitude]); setView('map'); setLocating(false); },
      (error) => { setSearchError(error.code === 1 ? 'Доступ к местоположению запрещён. Разрешите его в настройках браузера или введите адрес.' : 'Не удалось определить местоположение. Попробуйте ещё раз или введите адрес.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };
  const submitSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearchError('');
    if (!search.trim() || visible.length > 0) return;
    setSearching(true);
    try {
      const [result] = await geocodeAddress(search);
      if (!result) setSearchError('Адрес не найден. Уточните улицу или ориентир.');
      else { setLocate([result.latitude, result.longitude]); setView('map'); }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Не удалось выполнить поиск адреса');
    } finally {
      setSearching(false);
    }
  };

  return <div className="resident-home">
    <header className="home-head page-pad">
      <div><h1>Сигналы рядом</h1><p><span className="live-dot" />{summary.data?.stats.active ?? '—'} активных · {summary.data?.stats.awaitingVerification ?? 0} ждут проверки</p></div>
      <Button onClick={() => navigate('/problems/new')}><MapPinPlus size={18} />Сообщить о проблеме</Button>
      <div className="segmented home-view-toggle" aria-label="Режим отображения"><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><MapIcon size={17} />Карта</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={17} />Список</button></div>
    </header>
    <section className={`resident-workbench resident-workbench--${view}`}>
      <aside className="resident-register" aria-label="Реестр городских сигналов">
        <form className="register-search" onSubmit={(event) => void submitSearch(event)}>
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Адрес, ориентир или проблема" aria-label="Поиск" />{search && <button type="button" onClick={() => { setSearch(''); setSearchError(''); }} aria-label="Очистить поиск"><X size={16} /></button>}</label>
          <button className={`filter-button ${status || category ? 'active' : ''}`} type="button" onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}><SlidersHorizontal size={18} /><span>Фильтры</span></button>
          <button className="filter-button locate-button" type="button" onClick={locateMe} disabled={locating} aria-label="Моё местоположение" title="Показать моё местоположение на карте"><Crosshair size={19} /><span>{locating ? 'Определяем…' : 'Где я на карте'}</span></button>
        </form>
        {searchError && <div className="register-message register-message--error" role="alert">{searchError}</div>}
        {searching && <div className="register-message" role="status">Ищем адрес на карте…</div>}
        {locating && <div className="register-message" role="status">Определяем местоположение…</div>}
        {filterOpen && <div className="register-filters">
          <label>Категория<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Все категории</option>{CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
          <label>Статус<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все активные</option>{PROBLEM_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
          <button type="button" className="text-button" onClick={() => { setCategory(''); setStatus(''); }}>Сбросить</button>
        </div>}
        <div className="register-count"><strong>{visible.length}</strong> сигналов по условиям</div>
        <div className="register-list" role="list">
          {visible.map((problem) => <button key={problem.id} type="button" role="listitem" className={`register-row${selected?.id === problem.id ? ' register-row--selected' : ''}`} onClick={() => selectProblem(problem)}>
            <span className={`queue-priority queue-priority--${problem.priority.toLowerCase()}`} />
            <span className="register-row__content"><span><strong>№ {problem.number}</strong><StatusBadge status={problem.status} /></span><b>{problem.title}</b><small><MapPin size={13} />{problem.address}</small><small><Users size={13} />{problem.confirmationCount} подтвердили · {categoryLabels[problem.category]}</small></span>
          </button>)}
          {!visible.length && !problems.isLoading && <EmptyState icon={<SearchX />} title="Ничего не найдено">Измените фильтры или найдите адрес на карте.</EmptyState>}
          {problems.isLoading && <div className="register-loading" aria-label="Загрузка"><span /><span /><span /></div>}
        </div>
      </aside>
      <div className="resident-map">
        <MapCanvas problems={visible} selectedId={selected?.id} onSelect={selectProblem} onViewportChange={setViewport} locate={locate} center={summary.data ? [summary.data.district.centerLat, summary.data.district.centerLng] : undefined} />
        {selected && <MapProblemPreview key={selected.id} problem={selected} onClose={() => setSelected(undefined)} />}
        <Button className="map-create" onClick={() => navigate('/problems/new')}><MapPinPlus size={19} />Сообщить</Button>
      </div>
    </section>
    <section className="home-followup page-pad" aria-label="Состояние района и полезные действия">
      <div className="district-ledger"><div><h2>Состояние района</h2><strong>{summary.data?.health ?? '—'}<small> / 100</small></strong></div><p>{summary.data ? summary.data.health >= 75 ? 'Большинство показателей в норме.' : 'Некоторым направлениям нужно внимание.' : 'Загружаем показатели района…'}</p><Link to="/rating">Посмотреть показатели<ChevronRight size={18} /></Link></div>
      {summary.data?.mission && missionPhase(summary.data.mission) === 'ACTIVE' && <MissionMini mission={summary.data.mission} onOpen={() => navigate('/missions')} />}
      <nav className="quick-register" aria-label="Полезные действия"><button onClick={() => navigate('/problems?status=AWAITING_COMMUNITY_CONFIRMATION')}><Users /><span><strong>Подтвердить сигнал</strong><small>Помочь проверить факт</small></span><ChevronRight aria-hidden="true" /></button><button onClick={() => navigate('/problems?status=COMMUNITY_VERIFICATION')}><ShieldCheck /><span><strong>Проверить результат</strong><small>{summary.data?.stats.awaitingVerification ?? 0} рядом</small></span><ChevronRight aria-hidden="true" /></button><button onClick={() => navigate('/my-problems')}><Layers3 /><span><strong>Мои обращения</strong><small>Следить за ходом</small></span><ChevronRight aria-hidden="true" /></button></nav>
    </section>
  </div>;
}

function MissionMini({ mission, onOpen }: { mission: Mission; onOpen(): void }) {
  const percent = Math.min(100, Math.round(((mission.totalProgress ?? 0) / mission.target) * 100));
  return <div className="mission-ledger"><div className="mission-ledger__body"><h2>{mission.title}</h2><p>{mission.description}</p><div className="progress" aria-label={`Выполнено ${percent}%`}><span style={{ width: `${percent}%` }} /></div><small>{mission.totalProgress ?? 0} из {mission.target} · +{mission.reward} репутации</small></div><Button variant="secondary" onClick={onOpen}>Открыть миссию<ChevronRight size={18} /></Button></div>;
}

export function ProblemListPage({ mode }: { mode?: 'mine' | 'subscriptions' }) {
  const [params, setParams] = useSearchParams(); const [filters, setFilters] = useState(false); const status = params.get('status') ?? ''; const category = params.get('category') ?? ''; const search = params.get('search') ?? '';
  const query = new URLSearchParams(); if (mode === 'mine') query.set('mine', 'true'); if (mode === 'subscriptions') query.set('subscribed', 'true'); if (status) query.set('status', status); if (category) query.set('category', category); if (search) query.set('search', search);
  const problems = useQuery({ queryKey: ['problems-list', mode, params.toString()], queryFn: () => api<ProblemListItem[]>(`/problems?${query}`) });
  const title = mode === 'mine' ? 'Мои обращения' : mode === 'subscriptions' ? 'Мои подписки' : 'Проблемы города';
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next); };
  return <div className="page page-pad"><header className="page-header"><div><h1>{title}</h1><p>{problems.data?.length ?? 0} обращений по выбранным условиям</p></div><Button variant="secondary" onClick={() => setFilters(!filters)}><Filter size={18} />Фильтры<ChevronDown size={16} /></Button></header>
    <div className="list-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => update('search', event.target.value)} placeholder="Поиск" /></label>{filters && <><select aria-label="Категория" value={category} onChange={(event) => update('category', event.target.value)}><option value="">Все категории</option>{CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select><select aria-label="Статус" value={status} onChange={(event) => update('status', event.target.value)}><option value="">Все статусы</option>{PROBLEM_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></>}</div>
    {problems.isLoading ? <LoadingCards /> : problems.error ? <Card className="error-card"><AlertTriangle />{problems.error.message}</Card> : <div className="problem-grid problem-grid--page">{problems.data?.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}{!problems.data?.length && <EmptyState icon={<CircleCheck />} title="Пока пусто">Здесь появятся обращения, соответствующие выбранным условиям.</EmptyState>}</div>}
  </div>;
}

function LoadingCards() { return <div className="problem-grid problem-grid--page" aria-label="Загрузка"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>; }
