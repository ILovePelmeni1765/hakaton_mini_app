import { describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '@pulse/shared';
import type { PrismaService } from '../prisma/prisma.service';
import { AchievementsService } from './achievements.service';

const earnedAt = new Date('2026-09-12T00:00:00Z');
function fixture(lighting: Date[] = []) {
  const prisma = {
    problem: { count: vi.fn().mockResolvedValue(0) },
    problemConfirmation: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue(lighting.map((createdAt) => ({ createdAt }))) },
    achievement: { upsert: vi.fn().mockImplementation(async ({ where }: { where: { code: string } }) => ({ id: where.code })) },
    userAchievement: { createMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn().mockResolvedValue({ earnedAt }) },
  };
  const profile = { _count: { createdProblems: 0, confirmations: 0, resolutionVotes: 0, missionParticipations: 0 }, achievements: [] as Array<{ earnedAt: Date; achievement: { code: string } }> };
  return { prisma, profile, service: new AchievementsService(prisma as unknown as PrismaService) };
}

describe('achievement progress', () => {
  it('shows the entire catalogue to a new resident without awarding anything', async () => {
    const { prisma, profile, service } = fixture();
    const result = await service.progress('resident', profile);
    expect(result).toHaveLength(14);
    expect(result.every((item) => !item.completed && item.current === 0 && item.earnedAt === null)).toBe(true);
    expect(prisma.achievement.upsert).not.toHaveBeenCalled();
    expect(prisma.problem.count).toHaveBeenCalledWith({ where: { category: 'ACCESSIBILITY', OR: [{ authorId: 'resident' }, { confirmations: { some: { userId: 'resident' } } }] } });
    expect(prisma.problemConfirmation.count).toHaveBeenCalledWith({ where: { userId: 'resident', hasPhoto: true } });
  });

  it('awards reached thresholds once and keeps partial progress for the next milestone', async () => {
    const { prisma, profile, service } = fixture();
    profile._count.createdProblems = 6;
    profile._count.confirmations = 4;
    const result = await service.progress('resident', profile);
    expect(result.find((item) => item.code === 'CITY_REPORTER')).toMatchObject({ current: 5, target: 5, completed: true, earnedAt: earnedAt.toISOString() });
    expect(result.find((item) => item.code === 'RELIABLE_WITNESS')).toMatchObject({ current: 4, target: 5, completed: false });
    expect(result.find((item) => item.code === 'CITY_OBSERVER')).toMatchObject({ current: 6, target: 20, completed: false });
    expect(prisma.userAchievement.createMany).toHaveBeenCalledWith({ data: [{ userId: 'resident', achievementId: 'CITY_REPORTER' }], skipDuplicates: true });
    profile.achievements = result.filter((item) => item.completed).map((item) => ({ achievement: { code: item.code }, earnedAt }));
    prisma.userAchievement.createMany.mockClear();
    await service.progress('resident', profile);
    expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
  });

  it('preserves previously earned awards even if the underlying records change', async () => {
    const { prisma, profile, service } = fixture();
    profile.achievements = [{ achievement: { code: 'NIGHT_WATCH' }, earnedAt }];
    const result = await service.progress('resident', profile);
    expect(result.find((item) => item.code === 'NIGHT_WATCH')).toMatchObject({ completed: true, current: 1, earnedAt: earnedAt.toISOString() });
    expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    expect(new Set(ACHIEVEMENTS.map((item) => item.code)).size).toBe(ACHIEVEMENTS.length);
  });

  it('uses the district time for night checks and excludes the daytime boundaries', async () => {
    const day = fixture([new Date('2026-09-12T12:59:00Z'), new Date('2026-09-11T23:00:00Z')]);
    expect((await day.service.progress('resident', day.profile)).find((item) => item.code === 'NIGHT_WATCH')?.completed).toBe(false);
    const night = fixture([new Date('2026-09-12T13:00:00Z'), new Date('2026-09-11T22:59:00Z')]);
    expect((await night.service.progress('resident', night.profile)).find((item) => item.code === 'NIGHT_WATCH')?.completed).toBe(true);
  });
});
