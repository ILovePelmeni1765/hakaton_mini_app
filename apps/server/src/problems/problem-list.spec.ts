import { describe, expect, it, vi } from 'vitest';
import { ProblemsService } from './problems.service';
import { ProblemStateMachineService } from './problem-state-machine.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import type { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/current-user.decorator';

describe('resident problem list', () => {
  const user: AuthUser = { id: 'resident', role: 'RESIDENT', email: 'resident@example.test', displayName: 'Житель' };
  it('searches punctuation-separated terms and orders own problems by creation date before limiting', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new ProblemsService({ problem: { findMany } } as unknown as PrismaService, new ProblemStateMachineService(), {} as RealtimeGateway, {} as NotificationsService);
    await service.list(user, { mine: 'true', search: 'Плахотного,  8А' });
    const first = findMany.mock.calls[0]![0];
    await service.list(user, { mine: 'true', search: 'Плахотного 8а' });
    expect(findMany.mock.calls[1]![0]).toEqual(first);
    expect(first.where).toMatchObject({ authorId: user.id, AND: [{ OR: [{ title: { contains: 'плахотного' } }, { address: { contains: 'плахотного' } }] }, { OR: [{ title: { contains: '8а' } }, { address: { contains: '8а' } }] }] });
    expect(first.orderBy).toEqual([{ createdAt: 'desc' }, { number: 'desc' }]);
  });
  it('explains a repeated assignment without internal status codes', () => {
    expect(() => new ProblemStateMachineService().assertTransition('ASSIGNED', 'ASSIGNED', 'OPERATOR')).toThrow('Исполнитель уже назначен');
  });
});
