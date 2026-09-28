import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { Button, Card } from '@pulse/ui';
import type { NotificationSettings } from '@pulse/shared';
import { api } from '../api';
import { useAppStore } from '../store';

export function SettingsPage() {
  const userId = useAppStore((state) => state.user!.id);
  const query = useQuery({ queryKey: ['settings', userId], queryFn: () => api<NotificationSettings>('/profile/settings') });
  if (query.isPending) return <div className="page page-pad" role="status">Загружаем настройки…</div>;
  if (query.isError) return <div className="page page-pad" role="alert"><p>{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></div>;
  return <SettingsForm key={userId} initial={query.data} userId={userId} />;
}

function SettingsForm({ initial, userId }: { initial: NotificationSettings; userId: string }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const mutation = useMutation({
    mutationFn: () => api<NotificationSettings>('/profile/settings', { method: 'PATCH', json: settings }),
    onSuccess: (result) => { setSaved(result); queryClient.setQueryData(['settings', userId], result); },
  });
  const dirty = Object.keys(settings).some((key) => settings[key as keyof NotificationSettings] !== saved[key as keyof NotificationSettings]);
  const labels: Record<keyof NotificationSettings, string> = { status: 'Изменения статуса и срока', comments: 'Ответы в обсуждениях', missions: 'Новые миссии рядом', nearby: 'Проблемы в радиусе 500 м', telegram: 'Дублировать в Telegram' };
  return <div className="page page-pad settings-page"><header className="page-header"><div><h1>Настройки</h1><p>Выберите, какие уведомления получать.</p></div></header><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><Card><h2><Bell />Уведомления</h2>{(Object.keys(labels) as Array<keyof NotificationSettings>).map((key) => <label className="toggle-row" key={key}><span><strong>{labels[key]}</strong><small>{key === 'telegram' || key === 'nearby' ? 'Этот канал пока недоступен' : 'В центре уведомлений'}</small></span><input type="checkbox" checked={settings[key]} disabled={mutation.isPending || key === 'telegram' || key === 'nearby'} onChange={() => { mutation.reset(); setSettings({ ...settings, [key]: !settings[key] }); }} /><i /></label>)}</Card><div className="settings-actions"><Button type="submit" disabled={!dirty || mutation.isPending}>{mutation.isPending ? 'Сохраняем…' : 'Сохранить настройки'}</Button>{mutation.isSuccess && !dirty && <span role="status"><Check />Настройки сохранены</span>}{dirty && <small>Есть несохранённые изменения</small>}</div>{mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}</form><Card><h2>Конфиденциальность</h2><p>Фотографии очищаются от данных о месте съёмки. В публичном профиле не показывается электронная почта.</p></Card></div>;
}
