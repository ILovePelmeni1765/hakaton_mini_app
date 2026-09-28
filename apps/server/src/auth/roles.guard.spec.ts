import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function context(role: string) {
  return { switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', role } }) }), getHandler: () => ({}), getClass: () => ({}) } as any;
}

describe('RolesGuard', () => {
  it('allows the declared role', () => {
    const reflector = { getAllAndOverride: vi.fn(() => ['OPERATOR']) } as any;
    expect(new RolesGuard(reflector).canActivate(context('OPERATOR'))).toBe(true);
  });
  it('blocks a resident from operator actions', () => {
    const reflector = { getAllAndOverride: vi.fn(() => ['OPERATOR']) } as any;
    expect(() => new RolesGuard(reflector).canActivate(context('RESIDENT'))).toThrow(ForbiddenException);
  });
});
