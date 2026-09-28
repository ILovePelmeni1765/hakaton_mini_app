import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { ArgumentsHost } from '@nestjs/common';
import { DatabaseUnavailableFilter } from './database-unavailable.filter';

describe('database availability', () => {
  it.each(['P1001', 'P1002', 'P1017', 'P2024'])('returns a recoverable 503 for %s without connection details', (code) => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
    new DatabaseUnavailableFilter().catch(new Prisma.PrismaClientKnownRequestError('private connection details', { code, clientVersion: 'test' }), host);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ statusCode: 503, code: 'DATABASE_UNAVAILABLE', message: 'Сервис временно недоступен. Попробуйте снова через минуту.' });
  });
});
