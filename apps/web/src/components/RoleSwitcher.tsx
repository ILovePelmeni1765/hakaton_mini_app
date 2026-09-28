import { ChevronDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAppStore } from '../store';
import type { User } from '../types';
import type { UserRole } from '@pulse/shared';
import { useNavigate } from 'react-router-dom';

export function RoleSwitcher() {
  const setSession = useAppStore((s) => s.setSession); const queryClient = useQueryClient(); const navigate = useNavigate();
  const mutation = useMutation({ mutationFn: (role: UserRole) => api<{ accessToken: string; user: User }>('/auth/demo', { method: 'POST', json: { role } }), onSuccess: ({ accessToken, user }) => { setSession(accessToken, user); queryClient.clear(); navigate(user.role === 'RESIDENT' ? '/map' : user.role === 'OPERATOR' ? '/operator' : user.role === 'CONTRACTOR' ? '/contractor' : '/admin'); } });
  if (!import.meta.env.DEV) return null;
  return <label className="role-switcher"><span>Демо-роль</span><div><select aria-label="Переключить демонстрационную роль" value={useAppStore.getState().user?.role} onChange={(e) => mutation.mutate(e.target.value as UserRole)} disabled={mutation.isPending}><option value="RESIDENT">Житель</option><option value="OPERATOR">Оператор</option><option value="CONTRACTOR">Исполнитель</option><option value="ADMIN">Администратор</option></select><ChevronDown size={16} /></div></label>;
}
