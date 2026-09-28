import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';

describe('saved notification preferences', () => {
  it('suppresses disabled comments while keeping status events', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'notification' });
    const emitUser = vi.fn();
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue({ notificationSettings: { comments: false } }) }, notification: { create } } as unknown as PrismaService;
    const service = new NotificationsService(prisma, { emitUser } as unknown as RealtimeGateway, new ConfigService());
    await service.send('resident', 'Комментарий', 'Текст', 'COMMENT');
    expect(create).not.toHaveBeenCalled();
    expect(emitUser).not.toHaveBeenCalled();
    await service.send('resident', 'Статус', 'Текст', 'ASSIGNED');
    expect(create).toHaveBeenCalledOnce();
    expect(emitUser).toHaveBeenCalledWith('resident', 'notification:new', { id: 'notification' });
  });

  it('honors mission preferences separately from comments', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'notification' });
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue({ notificationSettings: { missions: false, status: false, comments: true } }) }, notification: { create } } as unknown as PrismaService;
    const service = new NotificationsService(prisma, { emitUser: vi.fn() } as unknown as RealtimeGateway, new ConfigService());
    await service.send('resident', 'Миссия', 'Текст', 'MISSION_NEARBY');
    await service.send('resident', 'Статус', 'Текст', 'RESOLVED');
    expect(create).not.toHaveBeenCalled();
    await service.send('resident', 'Комментарий', 'Текст', 'COMMENT');
    expect(create).toHaveBeenCalledOnce();
  });
});
