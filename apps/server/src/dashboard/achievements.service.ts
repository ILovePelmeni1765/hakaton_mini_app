import { Injectable } from '@nestjs/common';
import { ACHIEVEMENTS, type AchievementMetric, type AchievementProgress } from '@pulse/shared';
import { PrismaService } from '../prisma/prisma.service';

interface ProfileContribution {
  _count: { createdProblems: number; confirmations: number; resolutionVotes: number; missionParticipations: number };
  achievements: Array<{ earnedAt: Date; achievement: { code: string } }>;
}

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async progress(userId: string, profile: ProfileContribution): Promise<AchievementProgress[]> {
    const [accessibility, resolvedSignals, photoConfirmations, lighting] = await Promise.all([
      this.prisma.problem.count({ where: { category: 'ACCESSIBILITY', OR: [{ authorId: userId }, { confirmations: { some: { userId } } }] } }),
      this.prisma.problem.count({ where: { authorId: userId, status: 'RESOLVED' } }),
      this.prisma.problemConfirmation.count({ where: { userId, hasPhoto: true } }),
      this.prisma.problemConfirmation.findMany({ where: { userId, problem: { category: 'LIGHTING' } }, select: { createdAt: true } }),
    ]);
    const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Novosibirsk', hour: '2-digit', hourCycle: 'h23' });
    const counts: Record<AchievementMetric, number> = {
      signals: profile._count.createdProblems,
      confirmations: profile._count.confirmations,
      results: profile._count.resolutionVotes,
      usefulActions: profile._count.createdProblems + profile._count.confirmations + profile._count.resolutionVotes,
      accessibility,
      resolvedSignals,
      photoConfirmations,
      nightLighting: lighting.filter(({ createdAt }) => { const hour = Number(hourFormatter.format(createdAt)); return hour >= 20 || hour < 6; }).length,
      missions: profile._count.missionParticipations,
    };
    const earned = new Map(profile.achievements.map(({ achievement, earnedAt }) => [achievement.code, earnedAt]));

    return Promise.all(ACHIEVEMENTS.map(async (definition) => {
      let earnedAt = earned.get(definition.code);
      if (!earnedAt && counts[definition.metric] >= definition.target) {
        const { code, title, description, icon } = definition;
        const achievement = await this.prisma.achievement.upsert({ where: { code }, create: { code, title, description, icon }, update: { title, description, icon } });
        await this.prisma.userAchievement.createMany({ data: [{ userId, achievementId: achievement.id }], skipDuplicates: true });
        const award = await this.prisma.userAchievement.findUniqueOrThrow({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
        });
        earnedAt = award.earnedAt;
      }
      return { ...definition, current: earnedAt ? definition.target : Math.min(definition.target, counts[definition.metric]), completed: Boolean(earnedAt), earnedAt: earnedAt?.toISOString() ?? null };
    }));
  }
}
