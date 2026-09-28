import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType, useOutletContext } from 'react-router-dom';
import type { UserRole } from '@pulse/shared';

export const homeFor = (role: UserRole) => role === 'RESIDENT' ? '/map' : role === 'OPERATOR' ? '/operator' : role === 'CONTRACTOR' ? '/contractor' : '/admin';

export interface AppNavigation {
  goBack(): void;
  showBack: boolean;
}

export function useAppNavigation(user: { id: string; role: UserRole }): AppNavigation {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const session = `${user.id}:${user.role}`;
  const home = homeFor(user.role);
  // Only return through routes visited inside this authenticated workspace.
  // A direct link, reload or account switch starts a new navigation boundary.
  const history = useRef({ session, keys: [location.key], index: 0 });

  useLayoutEffect(() => {
    const current = history.current;
    if (current.session !== session) {
      history.current = { session, keys: [location.key], index: 0 };
    } else if (current.keys[current.index] !== location.key) {
      if (navigationType === 'PUSH') {
        current.keys = [...current.keys.slice(0, current.index + 1), location.key];
        current.index += 1;
      } else if (navigationType === 'REPLACE') {
        current.keys[current.index] = location.key;
      } else {
        const index = current.keys.indexOf(location.key);
        history.current = index < 0
          ? { session, keys: [location.key], index: 0 }
          : { ...current, index };
      }
    }
  }, [location.key, navigationType, session]);

  const goBack = useCallback(() => {
    if (history.current.session === session && history.current.index > 0) navigate(-1);
    else navigate(home, { replace: true });
  }, [home, navigate, session]);

  return { goBack, showBack: location.pathname !== home || Boolean(location.search) };
}

export const useAppBack = () => useOutletContext<AppNavigation>().goBack;
