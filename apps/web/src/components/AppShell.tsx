import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Building2, ChartNoAxesCombined, ClipboardCheck, ClipboardList, FileClock, LayoutDashboard, LogOut, Map, MapPinPlus, Menu, Settings, ShieldCheck, Target, UserRound, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { platform } from '../platform';
import { useAppStore } from '../store';
import { RoleSwitcher } from './RoleSwitcher';
import { PulseBrandMark } from './PulseBrandMark';
import { useNotifications } from '../notifications';
import { useAppNavigation } from '../navigation';

const residentNav = [
  ['/map', 'Карта', Map], ['/missions', 'Миссии', Target], ['/problems/new', 'Создать', MapPinPlus], ['/my-problems', 'Мои обращения', ClipboardList], ['/profile', 'Личный кабинет', UserRound],
] as const;
const operatorNav = [
  ['/operator', 'Обзор', LayoutDashboard], ['/operator/queue', 'Очередь', ClipboardList], ['/operator/map', 'Карта', Map], ['/operator/overdue', 'Просроченные', FileClock], ['/operator/disputed', 'Спорные', ShieldCheck], ['/operator/contractors', 'Исполнители', Building2], ['/operator/analytics', 'Аналитика', ChartNoAxesCombined], ['/operator/audit', 'Журнал действий', ClipboardCheck], ['/profile', 'Личный кабинет', UserRound],
] as const;
const contractorNav = [['/contractor', 'Мои задачи', ClipboardList], ['/contractor?tab=IN_PROGRESS', 'В работе', ClipboardCheck], ['/contractor?tab=OPERATOR_VERIFICATION', 'Ожидают проверки', FileClock], ['/profile', 'Личный кабинет', UserRound]] as const;
const adminNav = [['/admin', 'Управление', LayoutDashboard], ['/admin/users', 'Пользователи', Users], ['/operator/analytics', 'Аналитика', ChartNoAxesCombined], ['/operator/audit', 'Аудит', ClipboardCheck], ['/profile', 'Личный кабинет', UserRound]] as const;

export function AppShell() {
  const user = useAppStore((s) => s.user)!; const clearSession = useAppStore((s) => s.clearSession); const location = useLocation(); const navigate = useNavigate(); const [menu, setMenu] = useState(false);
  const notifications = useNotifications();
  const navigation = useAppNavigation(user);
  const { goBack, showBack } = navigation;
  const focused = location.pathname === '/problems/new';
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const nav = user.role === 'RESIDENT' ? residentNav : user.role === 'OPERATOR' ? operatorNav : user.role === 'CONTRACTOR' ? contractorNav : adminNav;
  const sidebar = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 960px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)');
    const update = () => { setMobile(media.matches); if (!media.matches) setMenu(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { setMenu(false); }, [location.pathname, location.search, user.id]);
  useEffect(() => {
    if (!menu || !mobile) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLButtonElement>('.sidebar__close')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
      if (event.key !== 'Tab') return;
      const nodes = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled)') ?? []).filter((node) => node.getClientRects().length);
      const first = nodes[0]; const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); menuTrigger.current?.focus(); };
  }, [menu, mobile]);
  useEffect(() => {
    if (focused) return;
    platform.setBackButton(showBack, goBack);
    return () => platform.setBackButton(false);
  }, [focused, showBack, goBack]);
  const initials = user.displayName.split(' ').map((part) => part[0]).slice(0, 2).join('');
  const logout = () => { clearSession(); setMenu(false); navigate('/login', { replace: true }); };
  return <div className={`app-shell app-shell--${user.role.toLowerCase()} ${focused ? 'app-shell--focused' : ''}`}>
    <aside ref={sidebar} id="sidebar-navigation" className={`sidebar ${menu ? 'sidebar--open' : ''}`} role={mobile ? 'dialog' : undefined} aria-modal={mobile && menu ? true : undefined} inert={mobile && !menu} aria-label="Основная навигация">
      <button type="button" className="icon-button sidebar__close" aria-label="Закрыть навигацию" onClick={() => setMenu(false)}><X /></button>
      <div className="brand"><PulseBrandMark className="brand__mark" /><span><strong>Пульс города</strong><small>городская среда</small></span></div>
      <span className="sidebar__caption">Навигация</span>
      <nav>{nav.map(([to, label, Icon]) => {
        const [pathname, search = ''] = to.split('?');
        const current = location.pathname === pathname && (user.role !== 'CONTRACTOR' || new URLSearchParams(location.search).get('tab') === new URLSearchParams(search).get('tab'));
        return <Link key={to} to={to} className={current ? 'active' : undefined} aria-current={current ? 'page' : undefined} onClick={() => setMenu(false)}><Icon size={20} /><span>{label}</span></Link>;
      })}</nav>
      <div className="sidebar__footer"><RoleSwitcher /><NavLink to="/settings"><Settings size={19} />Настройки</NavLink><button className="sidebar__logout" type="button" onClick={logout}><LogOut size={19} />Выйти из аккаунта</button></div>
    </aside>
    {menu && <button className="backdrop" aria-label="Закрыть меню" onClick={() => setMenu(false)} />}
    <div className="app-main" inert={menu && mobile}>
      <header className={`topbar ${showBack && !focused ? 'topbar--with-back' : ''}`}>
        {showBack && !focused && <button type="button" className="icon-button topbar__back" onClick={goBack} aria-label="Назад" title="Назад"><ArrowLeft aria-hidden="true" /><span>Назад</span></button>}
        <button ref={menuTrigger} className="icon-button menu-button" aria-label="Открыть меню" aria-controls="sidebar-navigation" aria-expanded={menu} onClick={() => setMenu(true)}><Menu /></button>
        <div className="topbar__mobile-brand" aria-hidden="true"><PulseBrandMark className="brand__mark" /><strong>Пульс</strong></div>
        <div className="topbar__location"><span>{user.role === 'RESIDENT' ? 'Ваш район' : 'Рабочее пространство'}</span><strong>{user.district?.name || user.organization?.name || 'Новосибирск'}</strong></div>
        <NavLink className="topbar__notification" to="/notifications" aria-label={unreadCount ? `Уведомления: ${unreadCount} непрочитанных` : 'Уведомления'} title={unreadCount ? `Непрочитанных: ${unreadCount}` : 'Уведомления'}><Bell size={19} />{unreadCount > 0 && <i aria-hidden="true" />}</NavLink>
        <NavLink className="topbar__user" to="/profile" aria-label={`Профиль: ${user.displayName}`}><span className="avatar">{initials}</span><div><strong>{user.displayName}</strong><span>{user.role === 'RESIDENT' ? `Уровень доверия ${user.trustLevel ?? 1}` : user.role === 'OPERATOR' ? 'Городской оператор' : user.role === 'CONTRACTOR' ? 'Исполнитель' : 'Администратор'}</span></div></NavLink>
        <button className="icon-button topbar__logout" type="button" onClick={logout} aria-label="Выйти из аккаунта" title="Выйти из аккаунта"><LogOut size={18} /></button>
      </header>
      <div className="demo-data-bar" role="note">Демонстрационные данные</div>
      <main id="main-content"><Outlet context={navigation} /></main>
    </div>
    {user.role === 'RESIDENT' && <nav inert={menu && mobile} className="bottom-nav" aria-label="Мобильная навигация">{residentNav.map(([to, label, Icon]) => <NavLink key={to} to={to} className={to === '/problems/new' ? 'bottom-nav__create' : undefined}><Icon size={21} /><span>{label === 'Создать' ? 'Сообщить' : to === '/profile' ? 'Кабинет' : label}</span></NavLink>)}</nav>}
  </div>;
}
