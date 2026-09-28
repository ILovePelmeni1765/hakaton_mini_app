import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, Building2, CheckCircle2, ChevronRight, ClipboardCheck, LayoutDashboard, Search, ShieldAlert, ShieldCheck, Users, Wrench } from 'lucide-react';
import { Button, EmptyState } from '@pulse/ui';
import { categoryLabels, matchesSearch, statusLabels, type UserRole } from '@pulse/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api } from '../api';
import type { Organization, ProblemListItem, Summary } from '../types';
import { MapCanvas } from '../components/MapCanvas';
import { WorkItem, isOverdue, priorityLabels } from '../components/WorkItem';
import { useAppStore } from '../store';

const roleLabels: Record<UserRole, string> = { RESIDENT: 'Житель', OPERATOR: 'Оператор', CONTRACTOR: 'Исполнитель', ADMIN: 'Администратор' };

function LoadState({ pending, error, retry }: { pending: boolean; error: boolean; retry: () => void }) {
  if (pending) return <p role="status">Загружаем данные…</p>;
  if (error) return <div className="workspace-error" role="alert"><p>Не удалось загрузить данные.</p><Button variant="ghost" onClick={retry}>Повторить</Button></div>;
  return null;
}

export function OperatorOverviewPage() {
  const navigate = useNavigate(); const summary = useQuery({ queryKey: ['summary'], queryFn: () => api<Summary>('/dashboard/summary') }); const queue = useQuery({ queryKey: ['operator-preview'], queryFn: () => api<ProblemListItem[]>('/problems?status=OPERATOR_REVIEW,OPERATOR_VERIFICATION,DISPUTED&limit=200') });
  const stats = [{ label: 'В очереди', value: queue.data?.length ?? '—', icon: ClipboardCheck, tone: 'blue' }, { label: 'Просрочено', value: summary.data?.stats.overdue ?? '—', icon: AlertTriangle, tone: 'red' }, { label: 'Ждут проверки', value: summary.data?.stats.awaitingVerification ?? '—', icon: ShieldCheck, tone: 'violet' }, { label: 'Решено', value: summary.data?.stats.resolved ?? '—', icon: CheckCircle2, tone: 'green' }];
  const critical = queue.data?.filter((problem) => problem.priority === 'CRITICAL') ?? [];
  const statusCounts = Object.entries((queue.data ?? []).reduce<Record<string, number>>((acc, problem) => ({ ...acc, [problem.status]: (acc[problem.status] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  return <div className="page page-pad workspace"><header className="page-header"><div><h1>Городская очередь</h1><p>Проверьте обращения и назначьте исполнителей.</p></div><span className="live-chip"><i />Данные обновляются</span></header><div className="stat-ledger">{stats.map(({ label, value, icon: Icon, tone }) => <div key={label} className={`stat-ledger__item stat-ledger__item--${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div>)}</div><div className="workspace-grid"><section><div className="section-heading"><div><h2>Приоритетная очередь</h2><p>{queue.data?.length ?? 0} записей требуют решения оператора</p></div><Button variant="ghost" onClick={() => navigate('/operator/queue')}>Весь реестр<ChevronRight /></Button></div><div className="work-register"><LoadState pending={queue.isPending} error={queue.isError} retry={() => void queue.refetch()} />{queue.data?.slice(0, 10).map((problem) => <WorkItem key={problem.id} problem={problem} />)}</div></section><aside className="operator-aside"><div className="status-register"><h2>Состав очереди</h2>{statusCounts.map(([problemStatus, count]) => <div key={problemStatus}><span>{statusLabels[problemStatus as keyof typeof statusLabels] ?? problemStatus}</span><strong>{count}</strong></div>)}</div>{critical.length > 0 && <div className="danger-summary"><ShieldAlert /><div><strong>{critical.length} {critical.length === 1 ? 'опасный сигнал' : 'опасных сигнала'}</strong><p>Критический приоритет требует немедленного решения оператора.</p><Button onClick={() => navigate('/operator/queue?priority=CRITICAL')}>Открыть очередь</Button></div></div>}</aside></div></div>;
}

export function OperatorQueuePage({ mode = 'queue' }: { mode?: 'queue' | 'overdue' | 'disputed' | 'map' | 'contractors' }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const priority = params.get('priority') ?? '';
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const queryClient = useQueryClient();
  const queryString = mode === 'disputed' ? 'status=DISPUTED,REOPENED' : mode === 'overdue' ? '' : 'status=OPERATOR_REVIEW,COMMUNITY_CONFIRMED,OPERATOR_VERIFICATION,COMMUNITY_VERIFICATION,NEEDS_MORE_INFO';
  const problems = useQuery({ queryKey: ['operator-queue', mode], queryFn: () => api<ProblemListItem[]>(`/problems?${queryString}&limit=200`) });
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: () => api<Organization[]>('/organizations') });
  const data = useMemo(() => (problems.data ?? []).filter((p) =>
    matchesSearch(`${p.number} ${p.title} ${p.address}`, search)
    && (!priority || p.priority === priority) && (mode !== 'overdue' || isOverdue(p))), [problems.data, search, mode, priority]);
  const assignable = data.filter((p) => ['OPERATOR_REVIEW', 'REOPENED'].includes(p.status));
  const visibleSelection = assignable.filter((p) => selected.includes(p.id)).map((p) => p.id);
  const assign = useMutation({
    mutationFn: async () => {
      const dueAt = new Date(Date.now() + 5 * 86_400_000).toISOString();
      const results = await Promise.allSettled(visibleSelection.map((id) => api(`/problems/${id}/transition`, { method: 'POST', json: { to: 'ASSIGNED', organizationId, dueAt, reason: 'Массовое назначение из очереди' } })));
      return results.map((result, index) => ({ id: visibleSelection[index]!, result }));
    },
    onMutate: () => setAssignmentNotice(''),
    onSuccess: (results) => {
      const failed = results.filter(({ result }) => result.status === 'rejected');
      setSelected(failed.map(({ id }) => id));
      setAssignmentNotice(`Назначено обращений: ${results.length - failed.length}.${failed.map(({ id, result }) => ` № ${data.find((p) => p.id === id)?.number}: ${result.status === 'rejected' && result.reason instanceof Error ? result.reason.message : 'Не удалось назначить. Повторите попытку.'}`).join('')}`);
      for (const key of ['operator-queue', 'operator-preview', 'problems', 'problems-list', 'summary']) void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ['operator-queue'] }); },
  });
  if (mode === 'contractors') return <OrganizationsPage />;
  return <div className="page page-pad workspace">
    <header className="page-header"><div><h1>{mode === 'disputed' ? 'Спорные обращения' : mode === 'overdue' ? 'Просроченные задачи' : mode === 'map' ? 'Операторская карта' : 'Обращения на проверке'}</h1><p>Проверьте подробности обращения, затем выберите дальнейшее действие.</p></div></header>
    <div className="workspace-filters">
      <label className="search-field"><Search aria-hidden="true" /><input aria-label="Поиск обращений" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Номер, адрес или текст" /></label>
      <label className="workspace-select">Приоритет<select value={priority} onChange={(e) => { const next = new URLSearchParams(params); if (e.target.value) next.set('priority', e.target.value); else next.delete('priority'); setParams(next); }}><option value="">Все приоритеты</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <LoadState pending={problems.isPending} error={problems.isError} retry={() => void problems.refetch()} />
    {mode !== 'map' && problems.isSuccess && data.length > 0 && <div className="selection-toolbar">
      {assignable.length > 0 && <label className="work-selection"><input type="checkbox" checked={visibleSelection.length === assignable.length} disabled={assign.isPending} onChange={(e) => setSelected(e.target.checked ? assignable.map((p) => p.id) : [])} /><span>Выбрать доступные для назначения</span></label>}
      <span>Обращений: {data.length}</span>
    </div>}
    {mode !== 'map' && data.length > assignable.length && <p className="assignment-help">Назначить исполнителя можно после проверки оператором или повторного открытия. Для остальных обращений откройте подробности и выберите доступное действие.</p>}
    {visibleSelection.length > 0 && mode !== 'map' && <div className="assignment-bar">
      <strong>Выбрано: {visibleSelection.length}</strong>
      <label className="workspace-select">Исполнитель<select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}><option value="">Выберите организацию</option>{organizations.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <span>Срок выполнения: через 5 дней</span>
      <Button disabled={!organizationId || assign.isPending} onClick={() => assign.mutate()}><Wrench />Назначить исполнителя</Button>
      <button type="button" className="text-button" onClick={() => setSelected([])}>Снять выбор</button>
    </div>}
    {assign.isError && <p role="alert" className="form-error">{assign.error.message}</p>}
    {assignmentNotice && <p role="status" className="assignment-notice">{assignmentNotice}</p>}
    {mode === 'map' ? <div className="operator-map"><MapCanvas problems={data} onSelect={(p) => navigate(`/problems/${p.id}`)} /></div> : <div className="work-register">{data.map((p) => <WorkItem key={p.id} problem={p} selection={assignable.some((item) => item.id === p.id) ? <label className="work-selection work-item__selection"><input type="checkbox" aria-label={`Выбрать обращение № ${p.number}`} disabled={assign.isPending} checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} /></label> : undefined} />)}</div>}
    {problems.isSuccess && !data.length && <EmptyState icon={<Search />} title="Обращения не найдены">{search || priority ? 'Измените запрос или выберите другой приоритет.' : 'Сейчас нет обращений по этим условиям.'}</EmptyState>}
  </div>;
}

function OrganizationsPage() { const organizations = useQuery({ queryKey: ['organizations'], queryFn: () => api<Array<Organization & { _count: { assignments: number } }>>('/organizations') }); return <div className="page page-pad"><header className="page-header"><div><h1>Исполнители</h1><p>Назначения и загрузка городских служб.</p></div></header><div className="organization-register"><div className="organization-register__head"><span>Организация</span><span>Состояние</span><span>Загрузка</span></div>{organizations.data?.map((org) => <div className="organization-row" key={org.id}><span className="organization-icon"><Building2 /></span><div><h2>{org.name}</h2><p>Исполнитель городских задач</p></div><span className="organization-state"><ShieldCheck />Подтверждена</span><strong>{org._count.assignments}<small>задач</small></strong></div>)}</div></div>; }

interface Analytics { byStatus: Array<{ status: string; _count: number }>; byCategory: Array<{ category: string; _count: number }>; districts: Array<{ id: string; name: string; lighting: number; roads: number }>; users: number; organizations: number }
export function AnalyticsPage() { const data = useQuery({ queryKey: ['analytics'], queryFn: () => api<Analytics>('/analytics') }); const total = data.data?.byStatus.reduce((sum, s) => sum + s._count, 0) ?? 0; return <div className="page page-pad workspace"><header className="page-header"><div><h1>Аналитика</h1><p>Обращения по статусам и категориям.</p></div></header><div className="stat-ledger"><div className="stat-ledger__item stat-ledger__item--blue"><BarChart3 /><span>Всего обращений</span><strong>{total}</strong></div><div className="stat-ledger__item stat-ledger__item--green"><Users /><span>Пользователи</span><strong>{data.data?.users ?? '—'}</strong></div><div className="stat-ledger__item stat-ledger__item--violet"><Building2 /><span>Организации</span><strong>{data.data?.organizations ?? '—'}</strong></div></div><div className="analytics-grid"><section className="analytics-register"><h2>По статусам</h2>{data.data?.byStatus.sort((a, b) => b._count - a._count).map((item) => <div className="bar-row" key={item.status}><span>{statusLabels[item.status as keyof typeof statusLabels] ?? item.status}</span><div><i style={{ width: `${item._count / Math.max(1, total) * 100}%` }} /></div><strong>{item._count}</strong></div>)}</section><section className="analytics-register"><h2>По категориям</h2>{data.data?.byCategory.sort((a, b) => b._count - a._count).slice(0, 8).map((item) => <div className="bar-row" key={item.category}><span>{categoryLabels[item.category as keyof typeof categoryLabels] ?? item.category}</span><div><i style={{ width: `${item._count / Math.max(1, total) * 100}%` }} /></div><strong>{item._count}</strong></div>)}</section></div></div>; }

function auditActionLabel(action: string) {
  if (action.startsWith('STATUS_')) return `Изменён статус: ${statusLabels[action.slice(7) as keyof typeof statusLabels] ?? 'обновлено'}`;
  return ({ PROFILE_UPDATED: 'Обновлены данные профиля', PROBLEM_CREATED: 'Создано обращение', PROBLEM_CLASSIFICATION_UPDATED: 'Изменена категория или приоритет', OFFICIAL_RESPONSE: 'Опубликован официальный ответ', USER_ACTIVATED: 'Восстановлен доступ', USER_SUSPENDED: 'Аккаунт заблокирован', MISSION_CREATED: 'Создана миссия' }[action] ?? 'Обновлена запись');
}

interface Audit { id: string; action: string; entityType: string; createdAt: string; metadata?: Record<string, unknown>; actor: { displayName: string; role: UserRole }; problem?: { number: number; title: string } }
export function AuditPage() { const audit = useQuery({ queryKey: ['audit'], queryFn: () => api<Audit[]>('/audit') }); return <div className="page page-pad"><header className="page-header"><div><h1>Журнал действий</h1><p>Административные решения, роли и объекты.</p></div></header><div className="audit-list">{audit.data?.map((event) => <article key={event.id}><span className="audit-icon"><ClipboardCheck /></span><div><strong>{auditActionLabel(event.action)}</strong><p>{event.problem ? `№ ${event.problem.number} · ${event.problem.title}` : ({ User: 'Пользователь', Mission: 'Миссия', Problem: 'Обращение' }[event.entityType] ?? 'Запись журнала')}</p><small>{event.actor.displayName} · {roleLabels[event.actor.role]}</small></div><time>{format(new Date(event.createdAt), 'd MMM, HH:mm', { locale: ru })}</time></article>)}</div></div>; }

export function ContractorDashboardPage() {
  const navigate = useNavigate(); const location = useLocation();
  const tab = new URLSearchParams(location.search).get('tab') ?? '';
  const problems = useQuery({ queryKey: ['contractor', tab], queryFn: () => api<ProblemListItem[]>(`/problems?assigned=true${tab ? `&status=${tab}` : ''}&limit=200`) });
  const tabs = [{ key: '', label: 'Все' }, { key: 'ASSIGNED', label: 'Новые' }, { key: 'IN_PROGRESS', label: 'В работе' }, { key: 'OPERATOR_VERIFICATION', label: 'Ждут проверки' }, { key: 'REOPENED', label: 'Возвращены' }, { key: 'RESOLVED', label: 'Завершены' }];
  return <div className="page page-pad workspace">
    <header className="page-header"><div><h1>Задачи организации</h1><p>Откройте задачу, чтобы принять её в работу или отправить отчёт.</p></div></header>
    <div className="task-tabs" aria-label="Статус задач">{tabs.map((item) => <button key={item.key} aria-pressed={tab === item.key} className={tab === item.key ? 'active' : ''} onClick={() => navigate(`/contractor${item.key ? `?tab=${item.key}` : ''}`)}>{item.label}</button>)}</div>
    <LoadState pending={problems.isPending} error={problems.isError} retry={() => void problems.refetch()} />
    {problems.isSuccess && <p className="workspace-count">Задач: {problems.data.length}</p>}
    <div className="work-register">{problems.data?.map((problem) => <WorkItem key={problem.id} problem={problem} contractor />)}</div>
    {problems.isSuccess && !problems.data.length && <EmptyState icon={<ClipboardCheck />} title="Здесь пока нет задач">Новые назначения появятся здесь.</EmptyState>}
  </div>;
}

interface AdminUser { id: string; displayName: string; email: string; role: UserRole; reputation: number; isActive: boolean; createdAt: string; district?: { name: string }; organization?: { name: string } }
export function AdminPage({ usersOnly = false }: { usersOnly?: boolean }) {
  const queryClient = useQueryClient();
  const currentUserId = useAppStore((state) => state.user?.id);
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => api<AdminUser[]>('/users') });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const visibleUsers = (users.data ?? []).filter((user) => (!role || user.role === role) && `${user.displayName} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = useMutation({ mutationFn: (id: string) => api(`/users/${id}/toggle`, { method: 'POST' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }) });
  return <div className="page page-pad workspace">
    <header className="page-header"><div><h1>{usersOnly ? 'Пользователи' : 'Управление'}</h1><p>{usersOnly ? 'Роли, репутация и доступ к приложению.' : 'Пользователи, организации и история действий.'}</p></div></header>
    {!usersOnly && <div className="admin-register">
      <button type="button" onClick={() => navigate('/admin/users')}><Users /><div><strong>Пользователи</strong><p>Всего: {users.data?.length ?? '—'}</p></div><ChevronRight /></button>
      <button type="button" onClick={() => navigate('/operator/contractors')}><Building2 /><div><strong>Организации</strong><p>Проверенные исполнители</p></div><ChevronRight /></button>
      <button type="button" onClick={() => navigate('/operator/audit')}><ClipboardCheck /><div><strong>Журнал действий</strong><p>История изменений</p></div><ChevronRight /></button>
      <button type="button" onClick={() => navigate('/missions')}><LayoutDashboard /><div><strong>Миссии</strong><p>Городские задания</p></div><ChevronRight /></button>
    </div>}
    {!usersOnly && <h2 className="user-register__title">Пользователи</h2>}
    <div className="workspace-filters">
      <label className="search-field"><Search aria-hidden="true" /><input aria-label="Поиск пользователей" placeholder="Имя или почта" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <label className="workspace-select">Роль<select value={role} onChange={(e) => setRole(e.target.value)}><option value="">Все роли</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <LoadState pending={users.isPending} error={users.isError} retry={() => void users.refetch()} />
    {toggle.isError && <p className="form-error" role="alert">{toggle.error.message}</p>}
    {users.isSuccess && <p className="workspace-count">Найдено пользователей: {visibleUsers.length}</p>}
    <div className="user-register">{visibleUsers.map((user) => <article className="user-record" key={user.id}>
      <div className="user-record__identity"><span className="avatar" aria-hidden="true">{user.displayName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><h2>{user.displayName}</h2><p>{user.email}</p></div></div>
      <dl className="user-record__facts">
        <div><dt>Роль</dt><dd>{roleLabels[user.role]}</dd></div>
        <div><dt>{user.organization ? 'Организация' : 'Район'}</dt><dd>{user.organization?.name ?? user.district?.name ?? 'Не указан'}</dd></div>
        <div><dt>Репутация · баллы</dt><dd>{user.reputation}</dd></div>
      </dl>
      <div className="user-record__access"><span className={user.isActive ? 'user-record__status' : 'user-record__status text-danger'}>{user.isActive ? <CheckCircle2 size={17} aria-hidden="true" /> : <ShieldAlert size={17} aria-hidden="true" />}{user.isActive ? 'Аккаунт активен' : 'Аккаунт заблокирован'}</span>{user.id === currentUserId ? <span className="user-record__self">Ваш аккаунт</span> : <button type="button" className="account-action" disabled={toggle.isPending} onClick={() => toggle.mutate(user.id)}>{user.isActive ? 'Заблокировать' : 'Разблокировать'}</button>}</div>
    </article>)}</div>
    {users.isSuccess && !visibleUsers.length && <EmptyState icon={<Users />} title="Пользователи не найдены">Измените имя или выберите другую роль.</EmptyState>}
  </div>;
}
