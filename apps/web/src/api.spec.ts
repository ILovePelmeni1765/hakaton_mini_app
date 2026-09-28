import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { useAppStore } from './store';
import type { User } from './types';

afterEach(() => { vi.unstubAllGlobals(); useAppStore.getState().clearSession(); });

describe('API outage messages', () => {
  it('explains a proxy failure when the API is stopped', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Internal server error', { status: 500 })));
    await expect(api('/auth/demo')).rejects.toMatchObject({ status: 500, message: 'Сервис временно недоступен. Попробуйте снова через минуту.' });
  });
  it('explains a failed connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/auth/demo')).rejects.toMatchObject({ status: 0, message: 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.' });
  });
  it('preserves a rejected login message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Неверная почта или пароль' }), { status: 401 })));
    await expect(api('/auth/login')).rejects.toMatchObject({ status: 401, message: 'Неверная почта или пароль' });
  });
  it('clears a blocked session and preserves the reason for the login screen', async () => {
    useAppStore.getState().setSession('blocked-token', { id: 'resident' } as User);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'ACCOUNT_SUSPENDED', message: 'Ваш аккаунт заблокирован.' }), { status: 403 })));
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 403 });
    expect(useAppStore.getState()).toMatchObject({ token: null, sessionMessage: 'Ваш аккаунт заблокирован.' });
  });
  it('does not clear a new session after an old request returns unauthorized', async () => {
    useAppStore.getState().setSession('old-token', { id: 'old' } as User);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      useAppStore.getState().setSession('new-token', { id: 'new' } as User);
      return new Response('{}', { status: 401 });
    }));
    await expect(api('/profile')).rejects.toMatchObject({ status: 401 });
    expect(useAppStore.getState().token).toBe('new-token');
  });
  it('keeps the saved session through a temporary outage', async () => {
    useAppStore.getState().setSession('saved-token', { id: 'resident' } as User);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 503 });
    expect(useAppStore.getState().token).toBe('saved-token');
  });
});
