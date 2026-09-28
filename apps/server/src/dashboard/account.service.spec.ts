import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AccountService } from './account.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';

const resident: AuthUser = {
  id: 'resident',
  role: 'RESIDENT',
  email: 'r@example.test',
  displayName: 'Житель',
};
function setup() {
  const db = {
    problem: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    problemSubscription: { count: vi.fn().mockResolvedValue(0) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    user: {
      count: vi.fn().mockResolvedValue(3),
      update: vi.fn().mockResolvedValue({ id: 'resident', displayName: 'Новое имя' }),
    },
    organization: { count: vi.fn().mockResolvedValue(2) },
    mission: { count: vi.fn().mockResolvedValue(1) },
  };
  const prisma = {
    ...db,
    $transaction: vi.fn(async (run: (tx: typeof db) => Promise<unknown>) => run(db)),
  };
  return { db, prisma, service: new AccountService(prisma as unknown as PrismaService) };
}

describe('personal account boundaries', () => {
  it('scopes every resident metric, recent problem and activity to the authenticated user', async () => {
    const { service, db } = setup();
    const result = await service.overview(resident);
    expect(result.role).toBe('RESIDENT');
    for (const [query] of db.problem.count.mock.calls)
      expect(query.where.AND[0]).toEqual({ authorId: resident.id });
    expect(db.problem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ authorId: resident.id }, {}] } }),
    );
    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { actorId: resident.id } }),
    );
    expect(db.problemSubscription.count).toHaveBeenCalledWith({ where: { userId: resident.id } });
    expect(db.user.count).not.toHaveBeenCalled();
  });

  it('returns an empty organization scope when a contractor has no organization', async () => {
    const { service, db } = setup();
    await service.overview({ ...resident, role: 'CONTRACTOR' });
    for (const [query] of db.problem.count.mock.calls)
      expect(query.where.AND[0]).toEqual({ id: { in: [] } });
    expect(db.problem.findMany).toHaveBeenCalledOnce();
  });

  it('excludes reassigned tasks from contractor metrics and recent problems', async () => {
    const { service, db } = setup();
    db.problem.findMany.mockResolvedValueOnce([
      { id: 'current', assignments: [{ organizationId: 'own' }] },
      { id: 'reassigned', assignments: [{ organizationId: 'other' }] },
    ]);
    await service.overview({ ...resident, role: 'CONTRACTOR', organizationId: 'own' });
    for (const [query] of db.problem.count.mock.calls)
      expect(query.where.AND[0]).toEqual({ id: { in: ['current'] } });
    expect(db.problem.findMany.mock.calls[1]?.[0].where.AND[0]).toEqual({
      id: { in: ['current'] },
    });
  });

  it('uses operator queues and admin counters without exposing other users activity', async () => {
    const { service, db } = setup();
    const operator = await service.overview({ ...resident, role: 'OPERATOR' });
    expect(operator.metrics.map((item) => item.key)).toEqual([
      'review',
      'overdue',
      'disputed',
      'resolved',
    ]);
    const admin = await service.overview({ ...resident, role: 'ADMIN' });
    expect(admin.metrics).toEqual([
      { key: 'users', value: 3 },
      { key: 'suspended', value: 3 },
      { key: 'organizations', value: 2 },
      { key: 'missions', value: 1 },
    ]);
    expect(admin.problems).toEqual([]);
    for (const [query] of db.auditLog.findMany.mock.calls)
      expect(query.where).toEqual({ actorId: resident.id });
  });

  it('updates only the current display name and records an audit event atomically', async () => {
    const { service, db, prisma } = setup();
    await service.update(resident, { displayName: '  Новое имя  ' });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'resident' },
      data: { displayName: 'Новое имя' },
      select: { id: true, displayName: true, homeAddress: true },
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'resident',
        action: 'PROFILE_UPDATED',
        entityType: 'User',
        entityId: 'resident',
      },
    });
  });

  it.each([
    {},
    { displayName: ' ' },
    { displayName: 'x'.repeat(81) },
    { displayName: '<script>' },
    { displayName: 'Имя', role: 'ADMIN' },
    { displayName: 'Имя', id: 'another-user' },
    { displayName: 'Имя', organizationId: 'other' },
    { homeAddress: { address: 'Красный проспект, 10', latitude: 91, longitude: 82 } },
    { homeAddress: { address: 'Красный проспект, 10', latitude: 55, longitude: -181 } },
    { homeAddress: { address: 'Красный проспект, 10', latitude: '55', longitude: 82 } },
    { homeAddress: { address: 'Красный проспект, 10' } },
    { homeAddress: { address: '  ', latitude: 55, longitude: 82 } },
    { homeAddress: { address: '<script>', latitude: 55, longitude: 82 } },
    { homeAddress: { address: 'Адрес', latitude: 55, longitude: 82, userId: 'other' } },
    { homeAddress: null, id: 'other' },
  ])('rejects malformed or privileged profile updates: %j', async (input) => {
    const { service, db } = setup();
    await expect(service.update(resident, input)).rejects.toMatchObject({ status: 400 });
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('saves a home address only for the authenticated user without changing the name', async () => {
    const { service, db } = setup();
    await service.update(resident, {
      homeAddress: { address: '  Красный проспект, 10  ', latitude: 55.03, longitude: 82.92 },
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: resident.id },
      data: { homeAddress: { address: 'Красный проспект, 10', latitude: 55.03, longitude: 82.92 } },
      select: { id: true, displayName: true, homeAddress: true },
    });
    expect(db.auditLog.create).toHaveBeenCalledOnce();
  });

  it('clears the address as a database null', async () => {
    const { service, db } = setup();
    await service.update(resident, { homeAddress: null });
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: resident.id },
        data: { homeAddress: Prisma.DbNull },
      }),
    );
  });
});
