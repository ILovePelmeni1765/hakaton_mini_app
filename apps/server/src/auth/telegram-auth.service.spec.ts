import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TelegramAuthService } from './telegram-auth.service';

function signedInitData(token: string) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'test-query', user: JSON.stringify({ id: 42, first_name: 'Анна' }) });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

describe('TelegramAuthService', () => {
  const token = '123456:test-token';
  const service = new TelegramAuthService({ get: () => token } as any);
  it('accepts signed initData and returns the Telegram user', () => expect(service.verify(signedInitData(token))).toMatchObject({ id: 42, first_name: 'Анна' }));
  it('rejects a modified payload', () => expect(() => service.verify(signedInitData(token).replace('%D0%90%D0%BD%D0%BD%D0%B0', '%D0%95%D0%B2%D0%B0'))).toThrow());
});
