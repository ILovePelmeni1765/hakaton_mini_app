import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  LogOut,
  MapPin,
  Pencil,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { Button, EmptyState } from '@pulse/ui';
import {
  statusLabels,
  updateProfileSchema,
  type AccountMetricKey,
  type AccountOverview,
  type AchievementProgress,
  type UserRole,
} from '@pulse/shared';
import { api, SOCKET_URL } from '../api';
import { Achievements } from '../components/Achievements';
import { HomeAddress } from '../components/HomeAddress';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store';
import type { User } from '../types';
import './account.css';

interface Profile extends User {
  createdAt: string;
  _count: {
    createdProblems: number;
    confirmations: number;
    resolutionVotes: number;
    subscriptions: number;
  };
  achievementProgress: AchievementProgress[];
  reputationEvents: Array<{ id: string; points: number; reason: string; createdAt: string }>;
}

const roles: Record<
  UserRole,
  {
    label: string;
    description: string;
    primary: string;
    href: string;
    list: string;
    actions: Array<[string, string, string]>;
  }
> = {
  RESIDENT: {
    label: 'Житель',
    description: 'Ваши обращения, вклад в район и данные аккаунта.',
    primary: 'Сообщить о проблеме',
    href: '/problems/new',
    list: '/my-problems',
    actions: [
      ['/my-problems', 'Мои обращения', 'Статусы и результаты ваших сигналов'],
      ['/subscriptions', 'Мои подписки', 'Обращения, за которыми вы следите'],
      ['/missions', 'Городские миссии', 'Задания и ваш вклад в район'],
    ],
  },
  OPERATOR: {
    label: 'Городской оператор',
    description: 'Обращения в работе, сроки и ваши последние действия.',
    primary: 'Открыть очередь',
    href: '/operator/queue',
    list: '/operator/queue',
    actions: [
      ['/operator/queue', 'Очередь обращений', 'Рассмотрение и назначение исполнителей'],
      ['/operator/overdue', 'Просроченные обращения', 'Проверить сроки и ход работ'],
      ['/operator/disputed', 'Спорные результаты', 'Разобраться в замечаниях жителей'],
      ['/operator/contractors', 'Исполнители', 'Организации, принимающие задачи'],
    ],
  },
  CONTRACTOR: {
    label: 'Исполнитель',
    description: 'Задачи вашей организации, ход работ и проверка отчётов.',
    primary: 'Открыть мои задачи',
    href: '/contractor',
    list: '/contractor',
    actions: [
      ['/contractor?tab=ASSIGNED', 'Новые назначения', 'Принять задачу в работу'],
      ['/contractor?tab=IN_PROGRESS', 'В работе', 'Подготовить отчёт и фотографии'],
      [
        '/contractor?tab=OPERATOR_VERIFICATION',
        'Ожидают проверки',
        'Следить за проверкой результата',
      ],
      ['/contractor?tab=REOPENED', 'Возвращены в работу', 'Устранить замечания'],
    ],
  },
  ADMIN: {
    label: 'Администратор',
    description: 'Пользователи, организации, городские миссии и ваши действия.',
    primary: 'Управление пользователями',
    href: '/admin/users',
    list: '/admin',
    actions: [
      ['/admin/users', 'Пользователи и доступ', 'Проверить аккаунты и доступ к сервису'],
      ['/admin', 'Организации', 'Состав и статус организаций'],
      ['/missions', 'Городские миссии', 'Создать и посмотреть задания'],
      ['/operator/audit', 'Журнал действий', 'Проверить историю изменений'],
      ['/operator/analytics', 'Аналитика', 'Обращения по категориям и статусам'],
    ],
  },
};

const metricLabels: Record<AccountMetricKey, string> = {
  created: 'Всего обращений',
  active: 'В работе',
  resolved: 'Решено',
  subscriptions: 'Подписок',
  review: 'На рассмотрении',
  overdue: 'Просрочено',
  disputed: 'Спорных',
  assigned: 'Новых задач',
  inProgress: 'В работе',
  verification: 'На проверке',
  users: 'Активных аккаунтов',
  suspended: 'Заблокировано',
  organizations: 'Проверенных организаций',
  missions: 'Активных миссий',
};

function actionLabel(action: string) {
  if (action.startsWith('STATUS_'))
    return `Статус: ${statusLabels[action.slice(7) as keyof typeof statusLabels] ?? 'обновлён'}`;
  return (
    {
      PROFILE_UPDATED: 'Обновлены данные профиля',
      PROBLEM_CREATED: 'Создано обращение',
      PROBLEM_CLASSIFICATION_UPDATED: 'Изменена категория или приоритет',
      OFFICIAL_RESPONSE: 'Опубликован официальный ответ',
      USER_ACTIVATED: 'Восстановлен доступ',
      USER_SUSPENDED: 'Аккаунт заблокирован',
      MISSION_CREATED: 'Создана миссия',
      EVIDENCE_ADDED: 'Добавлено фотоподтверждение',
    }[action] ?? 'Обновлена запись'
  );
}

export function ProfilePage() {
  const session = useAppStore((state) => state.user!);
  const profile = useQuery({
    queryKey: ['profile', session.id],
    queryFn: ({ signal }) => api<Profile>('/profile', { signal }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/city`, { transports: ['websocket', 'polling'] });
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['account', session.id] });
      void queryClient.invalidateQueries({ queryKey: ['profile', session.id] });
    };
    socket.on('problems:changed', refresh);
    return () => {
      socket.disconnect();
    };
  }, [queryClient, session.id]);
  if (profile.isPending)
    return (
      <div className="page page-pad" role="status">
        Загружаем личный кабинет…
      </div>
    );
  if (profile.isError)
    return (
      <div className="page page-pad" role="alert">
        <h1>Личный кабинет</h1>
        <p>Не удалось загрузить данные. {profile.error.message}</p>
        <Button onClick={() => void profile.refetch()}>Повторить</Button>
      </div>
    );
  return <AccountPage key={session.id} profile={profile.data} />;
}

function AccountPage({ profile }: { profile: Profile }) {
  const [section, setSection] = useState<'overview' | 'personal'>('overview');
  const navigate = useNavigate();
  const clearSession = useAppStore((state) => state.clearSession);
  const overview = useQuery({
    queryKey: ['account', profile.id],
    queryFn: ({ signal }) => api<AccountOverview>('/profile/overview', { signal }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const config = roles[profile.role];
  const resident = profile.role === 'RESIDENT';
  const initials = profile.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <div className="page page-pad account-page">
      <header className="page-header">
        <div>
          <h1>Личный кабинет</h1>
          <p>{config.description}</p>
        </div>
        <Link className="button button--primary" to={config.href}>
          {config.primary}
          <ArrowUpRight size={18} />
        </Link>
      </header>
      <section className="account-identity" aria-label="Ваш аккаунт">
        <span className="avatar account-avatar" aria-hidden="true">
          {initials}
        </span>
        <div className="account-identity__body">
          <h2>{profile.displayName}</h2>
          <div className="account-identity__meta">
            <span className="account-role">
              <ShieldCheck size={15} />
              {config.label}
            </span>
            {profile.organization && (
              <span>
                <Building2 size={15} />
                {profile.organization.name}
              </span>
            )}
            {profile.district && (
              <span>
                <MapPin size={15} />
                {profile.district.name}
              </span>
            )}
          </div>
          <p>В сервисе с {format(new Date(profile.createdAt), 'MMMM yyyy', { locale: ru })}</p>
        </div>
        <Button variant="ghost" onClick={() => setSection('personal')}>
          <Pencil size={16} />
          Редактировать
        </Button>
      </section>
      <div className="account-sections" role="group" aria-label="Разделы личного кабинета">
        <button aria-pressed={section === 'overview'} onClick={() => setSection('overview')}>
          Обзор
        </button>
        <button aria-pressed={section === 'personal'} onClick={() => setSection('personal')}>
          Личные данные
        </button>
        <Link to="/settings">
          <Settings size={16} />
          Настройки уведомлений
        </Link>
      </div>
      {section === 'personal' ? (
        <>
          <PersonalDetails key={profile.id} profile={profile} />
          <HomeAddress key={`address-${profile.id}`} profile={profile} />
        </>
      ) : (
        <>
          {overview.isPending && <p role="status">Загружаем показатели…</p>}
          {overview.isError && (
            <div className="account-error" role="alert">
              <p>Не удалось загрузить показатели кабинета.</p>
              <Button variant="secondary" onClick={() => void overview.refetch()}>
                Повторить загрузку
              </Button>
            </div>
          )}
          {overview.data && (
            <dl className="account-metrics" aria-label="Показатели кабинета">
              {overview.data.metrics.map(({ key, value }) => (
                <div key={key}>
                  <dt>{metricLabels[key]}</dt>
                  <dd
                    className={
                      (key === 'overdue' || key === 'disputed') && value > 0
                        ? 'account-metric--attention'
                        : undefined
                    }
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="account-columns">
            <div className="account-main-column">
              {profile.role !== 'ADMIN' && (
                <section className="account-panel" aria-labelledby="account-work-title">
                  <div className="account-section-heading">
                    <h2 id="account-work-title">
                      {resident ? 'Последние обращения' : 'Требуют внимания'}
                    </h2>
                    <Link to={config.list}>
                      Все
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                  {overview.isPending && <p role="status">Загружаем обращения…</p>}
                  {overview.data &&
                    (overview.data.problems.length ? (
                      <div className="account-problems">
                        {overview.data.problems.map((problem) => (
                          <Link
                            key={problem.id}
                            to={`/problems/${problem.id}`}
                            className="account-problem"
                          >
                            <div>
                              <span className="account-problem__meta">
                                № {problem.number}
                                <StatusBadge status={problem.status} />
                              </span>
                              <h3>{problem.title}</h3>
                              <p>{problem.address}</p>
                              {problem.dueAt && (
                                <small>
                                  Срок:{' '}
                                  {format(new Date(problem.dueAt), 'd MMMM yyyy', { locale: ru })}
                                </small>
                              )}
                            </div>
                            <ChevronRight size={18} aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<ClipboardList />}
                        title={resident ? 'Пока нет обращений' : 'Активных задач пока нет'}
                      >
                        {resident
                          ? 'Сообщите о проблеме — здесь появятся её статус и результат.'
                          : profile.role === 'CONTRACTOR' && !profile.organization
                            ? 'Для получения задач администратор должен назначить вам организацию.'
                            : 'Новые обращения появятся здесь.'}
                      </EmptyState>
                    ))}
                </section>
              )}
              {resident && (
                <section className="account-contribution" aria-label="Ваш вклад">
                  <div className="account-section-heading">
                    <h2>Вклад в район</h2>
                    <Link to="/missions">
                      Миссии
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                  <dl className="account-contribution__stats">
                    <div>
                      <dt>Репутация</dt>
                      <dd>{profile.reputation ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Уровень доверия</dt>
                      <dd>{profile.trustLevel ?? 1}</dd>
                    </div>
                    <div>
                      <dt>Проверено сигналов</dt>
                      <dd>{profile._count.confirmations}</dd>
                    </div>
                    <div>
                      <dt>Проверено результатов</dt>
                      <dd>{profile._count.resolutionVotes}</dd>
                    </div>
                    <div>
                      <dt>Полезных дней</dt>
                      <dd>{profile.usefulStreak ?? 0}</dd>
                    </div>
                  </dl>
                  <Achievements achievements={profile.achievementProgress} />
                </section>
              )}
              {!resident && <Activity activity={overview.data?.activity} />}
            </div>
            <aside className="account-side-column">
              <section className="account-panel">
                <h2>{resident ? 'Мой район' : 'Рабочие разделы'}</h2>
                <nav className="account-actions" aria-label="Действия по роли">
                  {config.actions.map(([href, title, description]) => (
                    <Link key={href} to={href}>
                      <span>
                        <strong>{title}</strong>
                        <small>{description}</small>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  ))}
                </nav>
              </section>
              <section className="account-panel account-access">
                <h2>{profile.role === 'CONTRACTOR' ? 'Моя организация' : 'Доступ и связь'}</h2>
                {profile.role === 'CONTRACTOR' ? (
                  <>
                    <p>
                      <strong>{profile.organization?.name ?? 'Организация не назначена'}</strong>
                    </p>
                    {profile.organization && (
                      <span className="account-verification">
                        <ShieldCheck size={16} />
                        {profile.organization.verified
                          ? 'Организация проверена'
                          : 'Ожидает проверки'}
                      </span>
                    )}
                    <p>
                      Примите задачу, выполните работы и отправьте отчёт. Обращение закрывается
                      после проверки результата.
                    </p>
                  </>
                ) : (
                  <p>
                    {resident
                      ? 'Проверяйте сигналы соседей и результаты работ. Каждое полезное действие отражается в вашем вкладе.'
                      : profile.role === 'OPERATOR'
                        ? 'Рассматривайте обращения, назначайте исполнителей и проверяйте отчёты. Решения сохраняются в истории.'
                        : 'Управляйте доступом пользователей и городскими миссиями. Изменения сохраняются в журнале действий.'}
                  </p>
                )}
                <Link to="/notifications">
                  <Bell size={17} />
                  Мои уведомления
                  <ChevronRight size={16} />
                </Link>
              </section>
              {resident && (
                <section className="account-panel">
                  <h2>История репутации</h2>
                  {profile.reputationEvents.length ? (
                    <div className="account-reputation">
                      {profile.reputationEvents.map((event) => (
                        <div key={event.id}>
                          <strong>
                            {event.points > 0 ? '+' : ''}
                            {event.points}
                          </strong>
                          <div>
                            <p>{event.reason}</p>
                            <time dateTime={event.createdAt}>
                              {format(new Date(event.createdAt), 'd MMMM', { locale: ru })}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Здесь появятся изменения вашей репутации.</p>
                  )}
                </section>
              )}
            </aside>
          </div>
        </>
      )}
      <button
        className="logout-button"
        onClick={() => {
          clearSession();
          navigate('/login', { replace: true });
        }}
      >
        <LogOut size={18} />
        Выйти из аккаунта
      </button>
    </div>
  );
}

function Activity({ activity }: { activity?: AccountOverview['activity'] }) {
  return (
    <section className="account-panel">
      <h2>Мои последние действия</h2>
      {activity && !activity.length && (
        <p>Вы ещё не совершали действий. Их история появится здесь.</p>
      )}
      <ol className="account-activity">
        {activity?.map((event) => (
          <li key={event.id}>
            <div>
              <strong>{actionLabel(event.action)}</strong>
              {event.problem && (
                <Link to={`/problems/${event.problem.id}`}>
                  № {event.problem.number} · {event.problem.title}
                </Link>
              )}
            </div>
            <time dateTime={event.createdAt}>
              {format(new Date(event.createdAt), 'd MMM, HH:mm', { locale: ru })}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PersonalDetails({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const queryClient = useQueryClient();
  const validation = updateProfileSchema.safeParse({ displayName });
  const dirty = displayName.trim() !== profile.displayName;
  const mutation = useMutation({
    mutationFn: () =>
      api<{ id: string; displayName: string }>('/profile', {
        method: 'PATCH',
        json: { displayName: displayName.trim() },
      }),
    onSuccess: (result) => {
      // A response from a previous session must never replace the current identity.
      const session = useAppStore.getState();
      if (session.user?.id !== profile.id || !session.token) return;
      session.setSession(session.token, { ...session.user, displayName: result.displayName });
      setDisplayName(result.displayName);
      queryClient.setQueryData<Profile>(['profile', profile.id], (current) =>
        current ? { ...current, displayName: result.displayName } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['account', profile.id] });
    },
  });
  return (
    <section className="account-panel account-personal" aria-labelledby="personal-title">
      <h2 id="personal-title">
        <UserRound size={20} />
        Личные данные
      </h2>
      <p>Имя видно рядом с вашими обращениями, ответами и действиями.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validation.success && dirty) mutation.mutate();
        }}
      >
        <label htmlFor="account-name">Имя и фамилия</label>
        <input
          id="account-name"
          autoComplete="name"
          value={displayName}
          maxLength={80}
          disabled={mutation.isPending}
          aria-invalid={!validation.success}
          aria-describedby={!validation.success ? 'account-name-error' : undefined}
          onChange={(event) => {
            setDisplayName(event.target.value);
            mutation.reset();
          }}
        />
        {!validation.success && (
          <p id="account-name-error" className="form-error">
            {validation.error.issues[0]?.message}
          </p>
        )}
        <dl className="account-details">
          <div>
            <dt>Электронная почта</dt>
            <dd>
              {profile.email.endsWith('@telegram.local') ? 'Вход через Telegram' : profile.email}
            </dd>
          </div>
          <div>
            <dt>Роль</dt>
            <dd>{roles[profile.role].label}</dd>
          </div>
          <div>
            <dt>Район</dt>
            <dd>{profile.district?.name ?? 'Не указан'}</dd>
          </div>
          {profile.role !== 'RESIDENT' && (
            <div>
              <dt>Организация</dt>
              <dd>{profile.organization?.name ?? 'Не назначена'}</dd>
            </div>
          )}
          <div>
            <dt>Дата регистрации</dt>
            <dd>{format(new Date(profile.createdAt), 'd MMMM yyyy', { locale: ru })}</dd>
          </div>
        </dl>
        <p className="account-details-note">Роль и организация назначаются администратором.</p>
        <div className="account-form-actions">
          <Button type="submit" disabled={!dirty || !validation.success || mutation.isPending}>
            {mutation.isPending ? 'Сохраняем…' : 'Сохранить изменения'}
          </Button>
          {dirty && (
            <Button
              variant="ghost"
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setDisplayName(profile.displayName);
                mutation.reset();
              }}
            >
              Отменить
            </Button>
          )}
          {mutation.isSuccess && !dirty && (
            <span role="status">
              <Check size={18} />
              Изменения сохранены
            </span>
          )}
        </div>
        {mutation.isError && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
      </form>
    </section>
  );
}
