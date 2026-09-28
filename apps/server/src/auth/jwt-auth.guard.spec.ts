import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

function setup(user: unknown) {
  const request: { headers: { authorization: string }; user?: unknown } = { headers: { authorization: 'Bearer verified-token' } };
  const context = { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  const findUnique = vi.fn().mockResolvedValue(user);
  const guard = new JwtAuthGuard({ getAllAndOverride: () => false } as unknown as Reflector, { verifyAsync: async () => ({ sub: 'resident', role: 'ADMIN' }) } as unknown as JwtService, { user: { findUnique } } as unknown as PrismaService);
  return { guard, context, request };
}

describe('restored sessions', () => {
  it('uses the current verified account role rather than a stale JWT role', async () => {
    const user = { id: 'resident', role: 'RESIDENT', isActive: true };
    const { guard, context, request } = setup(user);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });
  it('rejects tokens belonging to a now-blocked user', async () => {
    const { guard, context } = setup({ id: 'resident', isActive: false });
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403, response: { code: 'ACCOUNT_SUSPENDED' } });
  });
  it('rejects a removed account', async () => {
    const { guard, context } = setup(null);
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
  });
});
