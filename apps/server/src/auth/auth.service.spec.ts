import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { TelegramAuthService } from './telegram-auth.service';
import { hash } from 'bcryptjs';

describe('blocked account login', () => {
  const findUnique = vi.fn(); const findFirst = vi.fn(); const upsert = vi.fn(); const signAsync = vi.fn();
  const prisma = { user: { findUnique, findFirst, upsert }, district: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaService;
  const service = new AuthService(prisma, { signAsync } as unknown as JwtService, { verify: () => ({ id: 1, first_name: 'Тест' }) } as unknown as TelegramAuthService, { get: () => 'true' } as unknown as ConfigService);
  beforeEach(() => vi.clearAllMocks());
  it('explains a ban only after checking the password', async () => {
    findUnique.mockResolvedValue({ id: 'blocked', isActive: false, passwordHash: await hash('correct-password', 4) });
    await expect(service.login('test@example.test', 'incorrect-password')).rejects.toMatchObject({ status: 401, message: 'Неверная почта или пароль' });
    await expect(service.login('test@example.test', 'correct-password')).rejects.toMatchObject({ status: 403, response: { code: 'ACCOUNT_SUSPENDED', message: expect.stringContaining('заблокирован') } });
    expect(signAsync).not.toHaveBeenCalled();
  });
  it('also refuses demo and verified Telegram logins for a blocked account', async () => {
    findFirst.mockResolvedValue({ id: 'blocked', isActive: false });
    upsert.mockResolvedValue({ id: 'blocked', isActive: false });
    await expect(service.demo('RESIDENT')).rejects.toMatchObject({ status: 403 });
    await expect(service.telegramLogin('verified-init-data')).rejects.toMatchObject({ status: 403 });
    expect(signAsync).not.toHaveBeenCalled();
  });
});
