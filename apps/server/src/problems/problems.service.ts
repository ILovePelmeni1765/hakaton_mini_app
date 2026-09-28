import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommentType, Prisma, ProblemStatus, UserRole } from '@prisma/client';
import { dangerousCategories, searchTerms, statusLabels } from '@pulse/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/current-user.decorator';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ProblemStateMachineService } from './problem-state-machine.service';
import { CommentDto, ConfirmationDto, CreateProblemDto, EvidenceDto, OfficialResponseDto, ResolutionReportDto, ResolutionVoteDto, TransitionDto, UpdateProblemDto } from './problems.dto';
import { canCloseAsResolved } from './community-policy';
import { currentOrganizationProblemIds } from './assignment-scope';

const problemInclude = {
  author: { select: { id: true, displayName: true, reputation: true, trustLevel: true } },
  district: true,
  media: true,
  confirmations: { include: { user: { select: { id: true, displayName: true, trustLevel: true } } }, orderBy: { createdAt: 'desc' as const } },
  subscriptions: { select: { userId: true } },
  assignments: { include: { organization: true, employee: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' as const } },
  reports: { include: { media: true, author: { select: { displayName: true } }, organization: true }, orderBy: { createdAt: 'desc' as const } },
  votes: { include: { user: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' as const } },
  comments: { where: { isDeleted: false }, include: { author: { select: { id: true, displayName: true, role: true, organization: { select: { name: true, verified: true } } } }, media: true }, orderBy: [{ isPinned: 'desc' as const }, { createdAt: 'asc' as const }] },
  history: { include: { actor: { select: { id: true, displayName: true, role: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProblemInclude;

function clean(value: string) { return value.replace(/[<>]/g, '').trim(); }
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371; const p = Math.PI / 180;
  const dLat = (bLat - aLat) * p; const dLng = (bLng - aLng) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machine: ProblemStateMachineService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, query: Record<string, string | undefined>) {
    const where: Prisma.ProblemWhereInput = {};
    if (query.status) where.status = { in: query.status.split(',') as ProblemStatus[] };
    if (query.category) where.category = { in: query.category.split(',') as any };
    if (query.priority) where.priority = { in: query.priority.split(',') as any };
    if (query.mine === 'true') where.authorId = user.id;
    if (query.assigned === 'true') where.id = { in: await currentOrganizationProblemIds(this.prisma, user.organizationId) };
    if (query.subscribed === 'true') where.subscriptions = { some: { userId: user.id } };
    if (query.search) where.AND = searchTerms(clean(query.search)).map((term) => ({ OR: [{ title: { contains: term, mode: 'insensitive' } }, { address: { contains: term, mode: 'insensitive' } }] }));
    const problems = await this.prisma.problem.findMany({
      where,
      include: {
        district: true,
        media: { take: 1, orderBy: { createdAt: 'asc' } },
        author: { select: { id: true, displayName: true } },
        confirmations: { where: { type: { in: ['EXISTS', 'EVIDENCE'] } }, select: { id: true } },
        subscriptions: { select: { userId: true } },
        assignments: { include: { organization: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: query.mine === 'true' ? [{ createdAt: 'desc' }, { number: 'desc' }] : [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: Math.min(Number(query.limit ?? 100), 200),
    });
    const lat = Number(query.lat); const lng = Number(query.lng); const radius = Number(query.radius ?? 100);
    return problems
      .map((p) => ({ ...p, confirmationCount: p.confirmations.length, subscriberCount: p.subscriptions.length, isSubscribed: p.subscriptions.some((s) => s.userId === user.id), distanceKm: Number.isFinite(lat + lng) ? distanceKm(lat, lng, p.latitude, p.longitude) : null }))
      .filter((p) => p.distanceKm === null || p.distanceKm <= radius);
  }

  async one(id: string, user: AuthUser) {
    const problem = await this.prisma.problem.findUnique({ where: { id }, include: problemInclude });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    return { ...problem, confirmationCount: problem.confirmations.filter((c) => ['EXISTS', 'EVIDENCE'].includes(c.type)).length, subscriberCount: problem.subscriptions.length, viewer: { confirmed: problem.confirmations.some((c) => c.userId === user.id), subscribed: problem.subscriptions.some((s) => s.userId === user.id), voted: problem.votes.some((v) => v.userId === user.id), allowedTransitions: this.machine.getAllowed(problem.status, user.role as UserRole) } };
  }

  async similar(category: string, lat: number, lng: number, radiusMeters = 300) {
    const candidates = await this.prisma.problem.findMany({ where: { category: category as any, status: { notIn: ['RESOLVED', 'REJECTED', 'DUPLICATE'] } }, include: { media: { take: 1 }, confirmations: { select: { id: true } } }, take: 80 });
    return candidates.map((p) => ({ ...p, distanceMeters: Math.round(distanceKm(lat, lng, p.latitude, p.longitude) * 1000), confirmationCount: p.confirmations.length })).filter((p) => p.distanceMeters <= radiusMeters).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  async create(dto: CreateProblemDto, user: AuthUser) {
    if (user.role !== 'RESIDENT' && user.role !== 'ADMIN') throw new ForbiddenException('Обращения создают жители');
    if (!user.districtId) throw new BadRequestException('Для пользователя не выбран район');
    const dangerous = dangerousCategories.includes(dto.category as any);
    const status: ProblemStatus = dangerous ? 'OPERATOR_REVIEW' : 'AWAITING_COMMUNITY_CONFIRMATION';
    const { mediaIds, ...problemData } = dto;
    const problem = await this.prisma.$transaction(async (tx) => {
      const created = await tx.problem.create({ data: { ...problemData, title: clean(dto.title), description: clean(dto.description), address: clean(dto.address), authorId: user.id, districtId: user.districtId!, status, priority: dangerous ? 'CRITICAL' : dto.priority } });
      await this.attachMedia(tx, mediaIds, user.id, { problemId: created.id, kind: 'BEFORE', alt: `До устранения: ${clean(dto.title)}` });
      await tx.problemSubscription.create({ data: { problemId: created.id, userId: user.id } });
      await tx.statusHistory.create({ data: { problemId: created.id, actorId: user.id, toStatus: status, reason: dangerous ? 'Опасная категория направлена оператору немедленно' : 'Обращение опубликовано' } });
      await tx.auditLog.create({ data: { actorId: user.id, problemId: created.id, action: 'PROBLEM_CREATED', entityType: 'Problem', entityId: created.id } });
      return created;
    });
    this.realtime.emitProblem(problem.id, 'problem:created', problem);
    return this.one(problem.id, user);
  }

  async confirm(id: string, dto: ConfirmationDto, user: AuthUser) {
    if (user.role !== 'RESIDENT') throw new ForbiddenException('Подтверждение доступно жителям');
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    if (!['AWAITING_COMMUNITY_CONFIRMATION', 'COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW'].includes(problem.status)) throw new BadRequestException('На этом этапе подтверждение недоступно');
    if (problem.authorId === user.id) {
      if (dto.type !== 'CHANGED') throw new BadRequestException('Подтвердить обращение может другой житель. Вы можете сообщить об изменении ситуации.');
      await this.comment(id, { body: 'Ситуация изменилась. Автор сообщил об изменении на месте.', type: 'CLARIFICATION', mediaIds: dto.mediaId ? [dto.mediaId] : [] }, user);
      return this.one(id, user);
    }
    const recent = await this.prisma.problemConfirmation.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= 20) throw new BadRequestException('Слишком много действий. Попробуйте позже');
    const trust = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { trustLevel: true } });
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.attachMedia(tx, dto.mediaId ? [dto.mediaId] : [], user.id, { problemId: id, kind: 'EVIDENCE', alt: 'Фотоподтверждение жителя' });
        await tx.problemConfirmation.create({ data: { problemId: id, userId: user.id, type: dto.type, hasPhoto: Boolean(dto.mediaId), trustWeight: 1 + (dto.mediaId ? 0.5 : 0) + Math.min(trust.trustLevel, 5) * 0.1 } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Вы уже оценили эту проблему');
      throw error;
    }
    if (['EXISTS', 'EVIDENCE'].includes(dto.type)) {
      await this.prisma.$transaction([this.prisma.user.update({ where: { id: user.id }, data: { reputation: { increment: dto.mediaId ? 5 : 3 } } }), this.prisma.reputationEvent.create({ data: { userId: user.id, problemId: id, points: dto.mediaId ? 5 : 3, reason: dto.mediaId ? 'Подтверждение с фотографией' : 'Независимое подтверждение' } })]);
      const count = await this.prisma.problemConfirmation.count({ where: { problemId: id, type: { in: ['EXISTS', 'EVIDENCE'] } } });
      if (count >= 2 && problem.status === 'AWAITING_COMMUNITY_CONFIRMATION') {
        await this.prisma.$transaction((tx) => this.machine.advance(tx, id, 'AWAITING_COMMUNITY_CONFIRMATION', [
          { to: 'COMMUNITY_CONFIRMED', reason: 'Получено два независимых подтверждения' },
          { to: 'OPERATOR_REVIEW', reason: 'Автоматически передано городскому оператору' },
        ], user.id));
      }
    }
    await this.notifications.send(problem.authorId, 'Проблему проверил житель', dto.type === 'EXISTS' ? 'Ещё один житель подтвердил проблему' : 'Появилась новая оценка ситуации', 'CONFIRMATION', id);
    this.realtime.emitProblem(id, 'problem:confirmation', { userId: user.id, type: dto.type });
    return this.one(id, user);
  }

  async transition(id: string, dto: TransitionDto, user: AuthUser) {
    const problem = await this.prisma.problem.findUnique({ where: { id }, include: { assignments: { orderBy: { createdAt: 'desc' }, take: 1 }, votes: true } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    this.machine.assertTransition(problem.status, dto.to, user.role as UserRole);
    if (user.role === 'CONTRACTOR' && problem.assignments[0]?.organizationId !== user.organizationId) throw new ForbiddenException('Задача назначена другой организации');
    if (dto.to === 'ASSIGNED' && (!dto.organizationId || !dto.dueAt)) throw new BadRequestException('Укажите исполнителя и срок');
    if (['REJECTED', 'DUPLICATE', 'NEEDS_MORE_INFO'].includes(dto.to) && !dto.reason) throw new BadRequestException('Для этого действия необходимо объяснение');
    if (dto.to === 'DUPLICATE' && !dto.duplicateOfId) throw new BadRequestException('Укажите основное обращение');
    if (dto.to === 'RESOLVED') {
      if (!canCloseAsResolved(problem.votes)) throw new BadRequestException('Нужно минимум два независимых подтверждения устранения');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.problem.update({ where: { id }, data: { dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined, resolvedAt: dto.to === 'RESOLVED' ? new Date() : undefined, rejectionReason: dto.to === 'REJECTED' ? clean(dto.reason ?? '') : undefined, duplicateOfId: dto.to === 'DUPLICATE' ? dto.duplicateOfId : undefined } });
      if (!await this.machine.advance(tx, id, problem.status, [{ to: dto.to, reason: dto.reason ? clean(dto.reason) : undefined }], user.id)) throw new BadRequestException('Статус уже изменился. Обновите обращение.');
      if (dto.to === 'ASSIGNED') await tx.assignment.create({ data: { problemId: id, organizationId: dto.organizationId!, plannedAt: new Date(dto.dueAt!), status: 'ASSIGNED', note: dto.reason ? clean(dto.reason) : undefined } });
      if (dto.to === 'IN_PROGRESS' && problem.assignments[0]) await tx.assignment.update({ where: { id: problem.assignments[0].id }, data: { status: user.role === 'CONTRACTOR' ? 'IN_PROGRESS' : 'RETURNED', employeeId: user.role === 'CONTRACTOR' ? user.id : undefined } });
      await tx.auditLog.create({ data: { actorId: user.id, problemId: id, action: `STATUS_${dto.to}`, entityType: 'Problem', entityId: id, metadata: { from: problem.status, reason: dto.reason } } });
    });
    if (dto.to === 'RESOLVED') await this.applyResolutionRewards(id);
    await this.notifications.notifyProblem(id, 'Статус обращения изменился', `Новый статус: ${statusLabels[dto.to]}`, dto.to === 'RESOLVED' ? 'RESOLVED' : dto.to === 'ASSIGNED' ? 'ASSIGNED' : dto.to === 'COMMUNITY_VERIFICATION' ? 'COMMUNITY_VERIFICATION' : 'OPERATOR_ACCEPTED', user.id);
    this.realtime.emitProblem(id, 'problem:status', { from: problem.status, to: dto.to });
    return this.one(id, user);
  }

  async updateMetadata(id: string, dto: UpdateProblemDto, user: AuthUser) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.problem.update({ where: { id }, data: dto });
      await tx.auditLog.create({ data: { actorId: user.id, problemId: id, action: 'PROBLEM_CLASSIFICATION_UPDATED', entityType: 'Problem', entityId: id, metadata: { before: { category: problem.category, priority: problem.priority }, after: { category: dto.category ?? null, priority: dto.priority ?? null } } } });
      return result;
    });
    this.realtime.emitProblem(id, 'problem:metadata', updated);
    return this.one(id, user);
  }

  async subscribe(id: string, user: AuthUser) {
    const current = await this.prisma.problemSubscription.findUnique({ where: { problemId_userId: { problemId: id, userId: user.id } } });
    if (current) { await this.prisma.problemSubscription.delete({ where: { id: current.id } }); return { subscribed: false }; }
    await this.prisma.problemSubscription.create({ data: { problemId: id, userId: user.id } });
    return { subscribed: true };
  }

  async comment(id: string, dto: CommentDto, user: AuthUser) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    const body = clean(dto.body);
    if (body.length < 2) throw new BadRequestException('Добавьте текст сообщения');
    if (dto.parentId && !await this.prisma.comment.findFirst({ where: { id: dto.parentId, problemId: id, isDeleted: false } })) throw new BadRequestException('Сообщение для ответа удалено или относится к другому обращению');
    let type: CommentType = dto.type === 'CLARIFICATION' ? 'CLARIFICATION' : 'RESIDENT';
    if (user.role === 'OPERATOR' || user.role === 'ADMIN') type = dto.type === 'INFO_REQUEST' ? 'INFO_REQUEST' : dto.type === 'OFFICIAL' ? 'OFFICIAL' : 'RESIDENT';
    if (user.role === 'CONTRACTOR') type = 'CONTRACTOR';
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({ data: { problemId: id, authorId: user.id, body, parentId: dto.parentId, type, isPinned: type === 'OFFICIAL' } });
      await this.attachMedia(tx, dto.mediaIds ?? [], user.id, { commentId: created.id, kind: 'COMMENT' });
      return tx.comment.findUniqueOrThrow({ where: { id: created.id }, include: { author: { select: { id: true, displayName: true, role: true, organization: { select: { name: true, verified: true } } } }, media: true } });
    });
    this.realtime.emitProblem(id, 'comment:new', comment);
    await this.notifications.notifyProblem(id, 'Новое сообщение', `${user.displayName}: ${clean(dto.body).slice(0, 100)}`, 'COMMENT', user.id);
    return comment;
  }

  async deleteComment(problemId: string, commentId: string, user: AuthUser) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.problemId !== problemId) throw new NotFoundException('Комментарий не найден');
    if (comment.authorId !== user.id && user.role !== 'ADMIN') throw new ForbiddenException('Можно удалить только свой комментарий');
    await this.prisma.comment.update({ where: { id: commentId }, data: { isDeleted: true, body: 'Сообщение удалено' } });
    this.realtime.emitProblem(problemId, 'comment:deleted', { commentId });
    return { ok: true };
  }

  async addEvidence(id: string, dto: EvidenceDto, user: AuthUser) {
    if (user.role !== 'RESIDENT') throw new ForbiddenException('Доказательства добавляют жители');
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    await this.prisma.$transaction(async (tx) => {
      await this.attachMedia(tx, [dto.mediaId], user.id, { problemId: id, kind: 'EVIDENCE', alt: `Состояние на месте: ${problem.title}` });
      await tx.auditLog.create({ data: { actorId: user.id, problemId: id, action: 'EVIDENCE_ADDED', entityType: 'ProblemMedia', entityId: dto.mediaId } });
    });
    this.realtime.emitProblem(id, 'problem:evidence', { mediaId: dto.mediaId });
    await this.notifications.notifyProblem(id, 'Добавлено фото с места', `${user.displayName} дополнил обращение фотографией`, 'COMMENT', user.id);
    return this.one(id, user);
  }

  private async attachMedia(tx: Prisma.TransactionClient, ids: string[], uploadedById: string, data: Prisma.ProblemMediaUncheckedUpdateManyInput) {
    if (!ids.length) return;
    const result = await tx.problemMedia.updateMany({ where: { id: { in: ids }, uploadedById, problemId: null, commentId: null, reportId: null }, data });
    if (result.count !== ids.length) throw new BadRequestException('Фото уже прикреплено или недоступно. Выберите файл заново.');
  }

  async reportComment(problemId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.problemId !== problemId) throw new NotFoundException('Комментарий не найден');
    await this.prisma.comment.update({ where: { id: commentId }, data: { reportCount: { increment: 1 } } });
    return { ok: true };
  }

  async officialResponse(id: string, dto: OfficialResponseDto, user: AuthUser) {
    const body = clean(dto.body);
    await this.prisma.problem.update({ where: { id }, data: { officialResponse: body } });
    await this.prisma.comment.create({ data: { problemId: id, authorId: user.id, type: 'OFFICIAL', body, isPinned: true } });
    await this.prisma.auditLog.create({ data: { actorId: user.id, problemId: id, action: 'OFFICIAL_RESPONSE', entityType: 'Problem', entityId: id } });
    this.realtime.emitProblem(id, 'comment:new', { type: 'OFFICIAL', body });
    return this.one(id, user);
  }

  async resolutionReport(id: string, dto: ResolutionReportDto, user: AuthUser) {
    if (!user.organizationId) throw new ForbiddenException('Не указана организация исполнителя');
    const problem = await this.prisma.problem.findUnique({ where: { id }, include: { assignments: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    if (problem.status !== 'IN_PROGRESS') throw new BadRequestException('Отчёт можно отправить только по задаче в работе');
    if (problem.assignments[0]?.organizationId !== user.organizationId) throw new ForbiddenException('Задача назначена другой организации');
    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.resolutionReport.create({ data: { problemId: id, authorId: user.id, organizationId: user.organizationId!, summary: clean(dto.summary) } });
      await this.attachMedia(tx, dto.mediaIds, user.id, { reportId: created.id, kind: 'AFTER', alt: `После работ: ${problem.title}` });
      if (!await this.machine.advance(tx, id, 'IN_PROGRESS', [
        { to: 'RESOLUTION_SUBMITTED', reason: 'Исполнитель отправил отчёт' },
        { to: 'OPERATOR_VERIFICATION', reason: 'Отчёт передан оператору' },
      ], user.id)) throw new BadRequestException('Статус уже изменился. Обновите обращение.');
      await tx.assignment.update({ where: { id: problem.assignments[0]!.id }, data: { status: 'COMPLETED' } });
      return created;
    });
    this.realtime.emitProblem(id, 'problem:report', report);
    await this.notifications.notifyProblem(id, 'Исполнитель завершил работы', 'Опубликован отчёт и фотографии результата', 'REPORT_SUBMITTED', user.id);
    return this.one(id, user);
  }

  async vote(id: string, dto: ResolutionVoteDto, user: AuthUser) {
    if (user.role !== 'RESIDENT') throw new ForbiddenException('Общественная проверка доступна жителям');
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Проблема не найдена');
    if (problem.status !== 'COMMUNITY_VERIFICATION') throw new BadRequestException('Общественная проверка ещё не началась');
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.attachMedia(tx, dto.mediaId ? [dto.mediaId] : [], user.id, { problemId: id, kind: 'EVIDENCE', alt: 'Фотография общественной проверки' });
        const media = dto.mediaId ? await tx.problemMedia.findUnique({ where: { id: dto.mediaId } }) : undefined;
        await tx.resolutionVote.create({ data: { problemId: id, userId: user.id, vote: dto.vote, comment: dto.comment ? clean(dto.comment) : undefined, photoUrl: media?.url } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Вы уже проверили результат');
      throw error;
    }
    if (dto.vote !== 'CANNOT_VERIFY') await this.prisma.$transaction([this.prisma.user.update({ where: { id: user.id }, data: { reputation: { increment: 6 } } }), this.prisma.reputationEvent.create({ data: { userId: user.id, problemId: id, points: 6, reason: 'Проверка результата работ' } })]);
    const votes = await this.prisma.resolutionVote.groupBy({ by: ['vote'], where: { problemId: id }, _count: true });
    this.realtime.emitProblem(id, 'problem:vote', { votes });
    return { votes, detail: await this.one(id, user) };
  }

  private async applyResolutionRewards(problemId: string) {
    const participants = await this.prisma.problemConfirmation.findMany({ where: { problemId, type: { in: ['EXISTS', 'EVIDENCE'] } }, select: { userId: true } });
    const problem = await this.prisma.problem.findUniqueOrThrow({ where: { id: problemId }, select: { authorId: true, districtId: true } });
    const userIds = [...new Set([problem.authorId, ...participants.map((p) => p.userId)])];
    await this.prisma.$transaction([
      ...userIds.flatMap((userId) => [this.prisma.user.update({ where: { id: userId }, data: { reputation: { increment: 10 } } }), this.prisma.reputationEvent.create({ data: { userId, problemId, points: 10, reason: 'Проблема фактически устранена' } })]),
      this.prisma.district.update({ where: { id: problem.districtId }, data: { lighting: { increment: 1 }, improvement: { increment: 1 } } }),
    ]);
  }
}
