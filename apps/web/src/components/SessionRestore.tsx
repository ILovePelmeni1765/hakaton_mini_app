import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui';
import { api } from '../api';
import { useAppStore } from '../store';
import type { User } from '../types';

export function SessionRestore({ children }: { children: React.ReactNode }) {
  const { token, user, setSession, clearSession } = useAppStore();
  const session = useQuery({ queryKey: ['session', token], queryFn: ({ signal }) => api<User>('/auth/me', { signal }), enabled: Boolean(token && !user), retry: false });
  useEffect(() => {
    if (token && session.data && !user && useAppStore.getState().token === token) setSession(token, session.data);
  }, [token, user, session.data, setSession]);
  if (token && !user) return <main className="page page-pad" aria-label="Восстановление входа">
    {session.isError ? <><p role="alert">{session.error.message}</p><Button onClick={() => void session.refetch()}>Повторить</Button><Button variant="ghost" onClick={() => clearSession()}>Войти в другой аккаунт</Button></> : <p role="status">Восстанавливаем вход…</p>}
  </main>;
  return children;
}
