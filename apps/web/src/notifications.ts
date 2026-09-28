import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useAppStore } from './store';
import type { Notification } from './types';

export function useNotifications(enabled = true) {
  const userId = useAppStore((state) => state.user?.id);
  return useQuery({ queryKey: ['notifications', userId], queryFn: ({ signal }) => api<Notification[]>('/notifications', { signal }), enabled: Boolean(userId) && enabled, refetchInterval: 30_000, refetchOnWindowFocus: true });
}
