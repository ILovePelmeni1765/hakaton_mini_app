import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { AchievementsService } from './achievements.service';
import { missionPhase } from '@pulse/shared';

afterEach(() => vi.useRealTimers());

describe('mission progress', () => {
  it('does not report healthy when the database is unavailable', async () => {
    const $queryRaw = vi.fn().mockRejectedValue(new Error('database offline'));
    const prisma = { $queryRaw } as unknown as PrismaService;
    const dashboard = new DashboardService(prisma, new AchievementsService(prisma));
    await expect(dashboard.health()).rejects.toThrow('database offline');
    $queryRaw.mockResolvedValueOnce([{ value: 1 }]);
    await expect(dashboard.health()).resolves.toMatchObject({ status: 'ok', database: 'ok' });
  });
  it('returns the community total separately from the current user contribution', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'active', status: 'ACTIVE', startsAt: '2026-01-01', endsAt: '2099-01-01', participations: [{ progress: 4 }] },
      { id: 'empty', status: 'ACTIVE', startsAt: '2026-01-01', endsAt: '2099-01-01', participations: [] },
    ]);
    const groupBy = vi.fn().mockResolvedValue([{ missionId: 'active', _sum: { progress: 9 } }]);
    const prisma = { mission: { findMany }, missionParticipation: { groupBy } } as unknown as PrismaService;
    const result = await new DashboardService(prisma, new AchievementsService(prisma)).missions({ id: 'resident' } as AuthUser);

    expect(result).toMatchObject([
      { id: 'active', participations: [{ progress: 4 }], totalProgress: 9 },
      { id: 'empty', participations: [], totalProgress: 0 },
    ]);
    expect(findMany.mock.calls[0]?.[0].include.participations).toEqual({ where: { userId: 'resident' } });
    expect(groupBy.mock.calls[0]?.[0].where).toEqual({ missionId: { in: ['active', 'empty'] } });
  });
  it('filters expired missions for residents but leaves history available to admins', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { mission: { findMany }, missionParticipation: { groupBy: vi.fn().mockResolvedValue([]) } } as unknown as PrismaService;
    const dashboard = new DashboardService(prisma, new AchievementsService(prisma));
    await dashboard.missions({ id: 'resident', role: 'RESIDENT' } as AuthUser);
    expect(findMany.mock.calls[0]![0].where).toEqual({ status: { in: ['ACTIVE', 'UPCOMING'] }, endsAt: { gt: new Date() } });
    await dashboard.missions({ id: 'admin', role: 'ADMIN' } as AuthUser);
    expect(findMany.mock.calls[1]![0].where).toEqual({});
  });
  it('rejects participation in ended and not-yet-started missions, including stale statuses', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    const findUnique = vi.fn(); const upsert = vi.fn().mockResolvedValue({});
    const prisma = { mission: { findUnique }, missionParticipation: { upsert } } as unknown as PrismaService;
    const dashboard = new DashboardService(prisma, new AchievementsService(prisma));
    for (const mission of [
      { status: 'ACTIVE', startsAt: '2026-09-01', endsAt: '2026-09-17T12:00:00Z' },
      { status: 'UPCOMING', startsAt: '2026-09-01', endsAt: '2026-09-09' },
      { status: 'ACTIVE', startsAt: '2026-09-18', endsAt: '2026-09-20' },
    ]) {
      findUnique.mockResolvedValue(mission);
      await expect(dashboard.joinMission('mission', { id: 'resident' } as AuthUser)).rejects.toMatchObject({ status: 400 });
    }
    expect(upsert).not.toHaveBeenCalled();
    const active = { status: 'UPCOMING', startsAt: '2026-09-16', endsAt: '2026-09-20' };
    expect(missionPhase(active)).toBe('ACTIVE');
    findUnique.mockResolvedValue(active);
    await dashboard.joinMission('mission', { id: 'resident' } as AuthUser);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
