import { useAppStore } from './store';

export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

export async function api<T>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const token = useAppStore.getState().token;
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
  'ngrok-skip-browser-warning': 'true',
  ...(options.json ? { 'Content-Type': 'application/json' } : {}),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...options.headers,
},
    body: options.json ? JSON.stringify(options.json) : options.body,
  }); } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.', 0);
  }
  if (!response.ok) {
    let message = 'Не удалось выполнить запрос';
    let code: string | undefined;
    try { const body = await response.json() as { message?: string | string[]; code?: string }; message = Array.isArray(body.message) ? body.message.join(', ') : body.message || message; code = body.code; } catch { /* ignore */ }
    if (response.status >= 500) message = 'Сервис временно недоступен. Попробуйте снова через минуту.';
    if (token && token === useAppStore.getState().token && !/^\/auth\/(login|demo|telegram)$/.test(path) && (response.status === 401 || code === 'ACCOUNT_SUSPENDED')) useAppStore.getState().clearSession(message);
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export async function uploadImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Выберите JPEG, PNG или WebP');
  if (file.size > 8 * 1024 * 1024) throw new Error('Файл больше 8 МБ');
  const data = new FormData(); data.append('file', file);
  return api<{ id: string; url: string }>('/uploads/image', { method: 'POST', body: data });
}

export const mediaUrl = (url?: string) => !url ? '' : url.startsWith('/uploads') ? `${API_URL.replace(/\/api$/, '')}${url}` : url;
