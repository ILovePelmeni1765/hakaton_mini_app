import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Bell, BellRing, Check, ChevronRight, Clock3, Lightbulb, Map, ShieldCheck, Sparkles, Target, UserRound, Users } from 'lucide-react';
import { Button, Card, EmptyState } from '@pulse/ui';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api } from '../api';
import { notificationText } from '../notificationText';
import { missionPhase } from '@pulse/shared';
import type { District, Mission, Notification } from '../types';
import { useAppStore } from '../store';
import { useNotifications } from '../notifications';

export function MissionsPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const user = useAppStore((s) => s.user!); const role = user.role; const [showNew, setShowNew] = useState(false); const [newMission, setNewMission] = useState({ title: '', description: '' }); const missions = useQuery({ queryKey: ['missions', user.id], queryFn: () => api<Mission[]>('/missions'), refetchInterval: 60_000, refetchOnWindowFocus: true });
  const join = useMutation({ mutationFn: (id: string) => api(`/missions/${id}/join`, { method: 'POST' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['missions'] }) });
  const create = useMutation({ mutationFn: () => api('/missions', { method: 'POST', json: { ...newMission, target: 50, reward: 40, endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString() } }), onSuccess: () => { setShowNew(false); setNewMission({ title: '', description: '' }); void queryClient.invalidateQueries({ queryKey: ['missions'] }); } });
  const visibleMissions = (missions.data ?? []).map((mission) => ({ ...mission, status: missionPhase(mission) })).filter((mission) => role === 'ADMIN' || mission.status !== 'COMPLETED');
  const activeMissions = visibleMissions.filter((mission) => mission.status === 'ACTIVE');
  const totalTarget = activeMissions.reduce((sum, mission) => sum + mission.target, 0);
  const totalProgress = activeMissions.reduce((sum, mission) => sum + (mission.totalProgress ?? 0), 0);
  return <div className="page page-pad missions-page">
    <header className="page-header"><div><h1>Городские миссии</h1><p>Выберите задание и помогите проверить проблемы в районе.</p></div>{role === 'ADMIN' && <Button onClick={() => setShowNew(!showNew)}>{showNew ? 'Отменить' : 'Создать миссию'}</Button>}</header>
    {role === 'ADMIN' && showNew && <Card className="mission-create"><label>Название<input value={newMission.title} onChange={(e) => setNewMission({ ...newMission, title: e.target.value })} /></label><label>Описание<textarea rows={3} value={newMission.description} onChange={(e) => setNewMission({ ...newMission, description: e.target.value })} /></label><Button disabled={newMission.title.length < 5 || newMission.description.length < 10 || create.isPending} onClick={() => create.mutate()}>Опубликовать миссию</Button></Card>}
    {(join.isError || create.isError) && <p className="form-error" role="alert">{join.error?.message ?? create.error?.message}</p>}
    {missions.isPending && <p role="status">Загружаем миссии…</p>}
    {missions.isError && <div role="alert"><p>Не удалось загрузить миссии.</p><Button variant="secondary" onClick={() => void missions.refetch()}>Повторить</Button></div>}
    {missions.isSuccess && !visibleMissions.length && <EmptyState icon={<Target />} title="Пока нет доступных миссий">Новые задания появятся здесь.</EmptyState>}
    <div className="mission-list">{visibleMissions.map((mission) => {
      const participation = mission.participations?.[0];
      const joined = mission.joined ?? Boolean(participation);
      const progress = mission.totalProgress ?? 0;
      const percent = mission.target > 0 ? Math.min(100, progress / mission.target * 100) : 0;
      const status = mission.status === 'ACTIVE' ? 'Идёт сейчас' : mission.status === 'UPCOMING' ? 'Скоро' : 'Завершена';
      return <article key={mission.id} className="mission-row">
        <div className="mission-row__content">
          <div className="mission-row__heading"><h2>{mission.title}</h2><span className="mission-status">{status}</span></div>
          <p>{mission.description}</p>
          <div className="mission-meta"><span><Users size={16} />Участников: {mission._count?.participations ?? 0}</span><span><Clock3 size={16} />{mission.status === 'UPCOMING' ? `Начало ${format(new Date(mission.startsAt), 'd MMMM', { locale: ru })}` : `До ${format(new Date(mission.endsAt), 'd MMMM', { locale: ru })}`}</span><span>Награда: +{mission.reward} к репутации</span></div>
        </div>
        <div className="mission-row__action">
          <div className="progress-label"><span>Общая цель</span><strong>{progress} / {mission.target}</strong></div>
          <div className="progress" role="progressbar" aria-label={`Общий прогресс: ${mission.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span style={{ width: `${percent}%` }} /></div>
          {joined && <span className="mission-participation"><Check size={16} />Вы участвуете · ваш вклад: {participation?.progress ?? 0}</span>}
          {role === 'ADMIN' ? <span className="mission-admin-note">Участие жителей отображается здесь</span> : mission.status === 'UPCOMING' ? <span className="mission-admin-note">Участие откроется в день начала</span> : joined ? <Button variant="secondary" onClick={() => navigate('/map')}>Открыть карту<ChevronRight /></Button> : <Button disabled={join.isPending} onClick={() => join.mutate(mission.id)}>{join.isPending && join.variables === mission.id ? 'Присоединяемся…' : 'Участвовать'}</Button>}
        </div>
      </article>;
    })}</div>
    {totalTarget > 0 && <p className="mission-summary">Всего в активных миссиях: <strong>{totalProgress} из {totalTarget}</strong> действий.</p>}
  </div>;
}

export function RatingPage() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => api<{ district: District; health: number }>('/dashboard/summary') });
  const district = summary.data?.district;
  const metrics = [{ key: 'cleanliness', label: 'Чистота', icon: Sparkles }, { key: 'safety', label: 'Безопасность', icon: ShieldCheck }, { key: 'lighting', label: 'Освещение', icon: Lightbulb }, { key: 'accessibility', label: 'Доступность', icon: UserRound }, { key: 'roads', label: 'Дороги', icon: Map }, { key: 'improvement', label: 'Благоустройство', icon: Award }] as const;
  const attention = district ? metrics.filter(({ key }) => district[key] < 75).map(({ label }) => label.toLowerCase()) : [];
  return <div className="page page-pad rating-page">
    <header className="page-header"><div><h1>Состояние района</h1><p>Оценка по шести направлениям. Чем выше балл, тем лучше состояние.</p></div></header>
    {summary.isPending && <p role="status">Загружаем показатели…</p>}
    {summary.isError && <div role="alert"><p>Не удалось загрузить показатели.</p><Button variant="ghost" onClick={() => void summary.refetch()}>Повторить</Button></div>}
    {district && <>
      <section className="health-overview" aria-label="Общая оценка района">
        <div className="health-value"><strong>{summary.data?.health}</strong><span>из 100 баллов</span></div>
        <div><h2>{district.name}</h2><p>{attention.length ? `Нужно внимание: ${attention.join(', ')}.` : 'Все направления в стабильном состоянии.'}</p></div>
      </section>
      <div className="metric-grid">{metrics.map(({ key, label, icon: Icon }) => <Card className="metric-card" key={key}>
        <div className="metric-card__heading"><Icon aria-hidden="true" /><h2>{label}</h2></div>
        <div className="metric-card__score"><strong>{district[key]}</strong><span>из 100</span></div>
        <div className="progress" role="meter" aria-label={label} aria-valuenow={district[key]} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${district[key]}%` }} /></div>
        <small>{district[key] >= 75 ? 'Стабильно' : 'Нужно внимание'}</small>
      </Card>)}</div>
      <Card className="explain-card"><h2>Как читать оценку</h2><p>Каждое направление оценивается от 0 до 100 баллов. Общая оценка — среднее значение шести показателей, округлённое до целого. Значение ниже 75 отмечено как требующее внимания.</p></Card>
    </>}
  </div>;
}

export function NotificationsPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const notifications = useNotifications();
  const markRead = (id?: string) => {
    queryClient.setQueriesData<Notification[]>({ queryKey: ['notifications'] }, (items) => items?.map((item) => !id || item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const readAll = useMutation({ mutationFn: () => api('/notifications/read-all', { method: 'POST' }), onSuccess: () => markRead() });
  const open = useMutation({ mutationFn: async (notification: Notification) => { if (!notification.readAt) await api(`/notifications/${notification.id}/read`, { method: 'POST' }); return notification; }, onSuccess: (notification) => { markRead(notification.id); if (notification.problemId) navigate(`/problems/${notification.problemId}`); } });
  return <div className="page page-pad notifications-page"><header className="page-header"><div><h1>Уведомления</h1><p>Непрочитанных: {notifications.data?.filter((notification) => !notification.readAt).length ?? 0}</p></div><Button variant="secondary" disabled={readAll.isPending || !notifications.data?.some((item) => !item.readAt)} onClick={() => readAll.mutate()}><Check />Отметить всё прочитанным</Button></header>
    {notifications.isPending && <p role="status">Загружаем уведомления…</p>}
    {notifications.isError && <div role="alert"><p>Не удалось загрузить уведомления.</p><Button variant="secondary" onClick={() => void notifications.refetch()}>Повторить</Button></div>}
    {(readAll.isError || open.isError) && <p className="form-error" role="alert">{readAll.error?.message ?? open.error?.message}</p>}
    <div className="notification-list">{notifications.data?.map((notification) => <button key={notification.id} className={!notification.readAt ? 'unread' : ''} disabled={open.isPending} onClick={() => open.mutate(notification)}><span className="notification-icon">{!notification.readAt && <i className="notification-unread" aria-label="Не прочитано" />}{notification.type === 'MISSION_NEARBY' ? <Target /> : notification.type === 'RESOLVED' ? <Check /> : <BellRing />}</span><span><strong>{notificationText(notification.title)}</strong><p>{notificationText(notification.body)}</p><small>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ru })}</small></span>{notification.problemId && <ChevronRight className="notification-arrow" aria-hidden="true" />}</button>)}{notifications.isSuccess && !notifications.data.length && <EmptyState icon={<Bell />} title="Здесь спокойно">Новые события по вашим обращениям появятся здесь.</EmptyState>}</div></div>;
}

export { SettingsPage } from './SettingsPage';
