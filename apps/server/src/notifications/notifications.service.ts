import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { notificationSettingsSchema } from '@pulse/shared';

export interface NotificationProvider { send(userId: string, title: string, body: string): Promise<void>; }

@Injectable()
export class NotificationsService implements NotificationProvider {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway, private readonly config: ConfigService) {}
  async send(userId: string, title: string, body: string, type: NotificationType = 'COMMENT', problemId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationSettings: true } });
    if (!user) return;
    const settings = notificationSettingsSchema.parse(user.notificationSettings);
    const enabled = type === 'COMMENT' ? settings.comments : type === 'MISSION_NEARBY' ? settings.missions : settings.status;
    if (!enabled) return;
    const notification = await this.prisma.notification.create({ data: { userId, title, body, type, problemId } });
    this.realtime.emitUser(userId, 'notification:new', notification);
    // Telegram bot transport is intentionally optional; without a token the in-app notification remains authoritative.
    if (this.config.get('TELEGRAM_BOT_TOKEN')) { /* Future queue-backed bot delivery. */ }
  }
  async notifyProblem(problemId: string, title: string, body: string, type: NotificationType, excludeUserId?: string) {
    const recipients = await this.prisma.problemSubscription.findMany({ where: { problemId, userId: { not: excludeUserId } }, select: { userId: true } });
    await Promise.all(recipients.map(({ userId }) => this.send(userId, title, body, type, problemId)));
  }
}
