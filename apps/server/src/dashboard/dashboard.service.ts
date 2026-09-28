import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/current-user.decorator';
import { AchievementsService } from './achievements.service';
import { missionPhase, notificationSettingsSchema, type NotificationSettings } from '@pulse/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly achievements: AchievementsService) {}

  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'ok', service: 'Пульс города', time: new Date().toISOString() };
  }

  async summary(user: AuthUser) {
    const now = new Date();
    const district = user.districtId ? await this.prisma.district.findUnique({ where: { id: user.districtId } }) : await this.prisma.district.findFirst();
    const where = district ? { districtId: district.id } : {};
    const [active, resolved, overdue, awaitingVerification, mission] = await Promise.all([
      this.prisma.problem.count({ where: { ...where, status: { notIn: ['RESOLVED', 'REJECTED', 'DUPLICATE'] } } }),
      this.prisma.problem.count({ where: { ...where, status: 'RESOLVED' } }),
      this.prisma.problem.count({ where: { ...where, dueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'REJECTED', 'DUPLICATE'] } } }),
      this.prisma.problem.count({ where: { ...where, status: 'COMMUNITY_VERIFICATION' } }),
      this.prisma.mission.findFirst({ where: { status: { in: ['ACTIVE', 'UPCOMING'] }, startsAt: { lte: now }, endsAt: { gt: now }, OR: [{ districtId: district?.id }, { districtId: null }] }, include: { participations: true }, orderBy: { endsAt: 'asc' } }),
    ]);
    const healthValues = district ? [district.cleanliness, district.safety, district.lighting, district.accessibility, district.roads, district.improvement] : [0];
    return { district, health: Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length), stats: { active, resolved, overdue, awaitingVerification }, mission: mission ? { ...mission, totalProgress: mission.participations.reduce((sum, p) => sum + p.progress, 0), joined: mission.participations.some((p) => p.userId === user.id) } : null };
  }

  organizations() { return this.prisma.organization.findMany({ where: { verified: true }, include: { _count: { select: { assignments: true } } }, orderBy: { name: 'asc' } }); }

  async missions(user: AuthUser) {
    const now = new Date();
    const missions = await this.prisma.mission.findMany({ where: user.role === 'ADMIN' ? {} : { status: { in: ['ACTIVE', 'UPCOMING'] }, endsAt: { gt: now } }, include: { district: true, participations: { where: { userId: user.id } }, _count: { select: { participations: true } } }, orderBy: { endsAt: 'asc' } });
    const totals = await this.prisma.missionParticipation.groupBy({
      by: ['missionId'],
      where: { missionId: { in: missions.map((mission) => mission.id) } },
      _sum: { progress: true },
    });
    const progressByMission = new Map(totals.map((total) => [total.missionId, total._sum.progress ?? 0]));
    return missions.map((mission) => ({ ...mission, status: missionPhase(mission, now), totalProgress: progressByMission.get(mission.id) ?? 0 }));
  }

  async joinMission(id: string, user: AuthUser) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Миссия не найдена');
    const phase = missionPhase(mission);
    if (phase !== 'ACTIVE') throw new BadRequestException(phase === 'UPCOMING' ? 'Миссия ещё не началась. Присоединиться можно после её начала.' : 'Миссия уже завершена. Выберите другое задание.');
    return this.prisma.missionParticipation.upsert({ where: { missionId_userId: { missionId: id, userId: user.id } }, update: {}, create: { missionId: id, userId: user.id } });
  }

  async profile(user: AuthUser) {
    const profile = await this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, displayName: true, email: true, homeAddress: true, role: true, reputation: true, trustLevel: true, usefulStreak: true, district: true, organization: true, createdAt: true, achievements: { include: { achievement: true }, orderBy: { earnedAt: 'desc' } }, reputationEvents: { take: 10, orderBy: { createdAt: 'desc' } }, _count: { select: { createdProblems: true, confirmations: true, resolutionVotes: true, subscriptions: true, missionParticipations: true } } } });
    if (!profile) throw new NotFoundException('Профиль не найден');
    return { ...profile, achievementProgress: profile.role === 'RESIDENT' ? await this.achievements.progress(user.id, profile) : [] };
  }

  async settings(user: AuthUser) {
    const profile = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { notificationSettings: true } });
    return notificationSettingsSchema.parse(profile.notificationSettings);
  }

  async saveSettings(user: AuthUser, settings: NotificationSettings) {
    const notificationSettings = notificationSettingsSchema.parse(settings);
    await this.prisma.user.update({ where: { id: user.id }, data: { notificationSettings } });
    return notificationSettings;
  }

  notifications(user: AuthUser) { return this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async readNotification(id: string, user: AuthUser) { await this.prisma.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: new Date() } }); return { ok: true }; }
  async readAll(user: AuthUser) { await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } }); return { ok: true }; }

  async analytics() {
    const [byStatus, byCategory, districts, users, organizations] = await Promise.all([
      this.prisma.problem.groupBy({ by: ['status'], _count: true }), this.prisma.problem.groupBy({ by: ['category'], _count: true }),
      this.prisma.district.findMany(), this.prisma.user.count(), this.prisma.organization.count(),
    ]);
    return { byStatus, byCategory, districts, users, organizations };
  }

  audit() { return this.prisma.auditLog.findMany({ include: { actor: { select: { displayName: true, role: true } }, problem: { select: { number: true, title: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  users() { return this.prisma.user.findMany({ select: { id: true, displayName: true, email: true, role: true, reputation: true, isActive: true, district: true, organization: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }

  async toggleUser(id: string, actor: AuthUser) {
    if (id === actor.id) throw new NotFoundException('Нельзя отключить текущего администратора');
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Пользователь не найден');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { isActive: !target.isActive } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: user.isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED', entityType: 'User', entityId: id } });
      return { id: user.id, isActive: user.isActive };
    });
  }

  async createMission(dto: { title: string; description: string; target: number; reward: number; endsAt: string }, actor: AuthUser) {
    const city = await this.prisma.city.findFirstOrThrow();
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.create({ data: { cityId: city.id, title: dto.title.replace(/[<>]/g, '').trim(), description: dto.description.replace(/[<>]/g, '').trim(), target: dto.target, reward: dto.reward, startsAt: new Date(), endsAt: new Date(dto.endsAt), status: 'ACTIVE' } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'MISSION_CREATED', entityType: 'Mission', entityId: mission.id } });
      return mission;
    });
  }
}
