import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, ProblemStatus, UserRole } from '@prisma/client';
import { statusLabels } from '@pulse/shared';

function transitionError(from: ProblemStatus, to: ProblemStatus) {
  if (from === to) return from === 'ASSIGNED' ? 'Исполнитель уже назначен. Откройте обращение, чтобы посмотреть организацию и срок.' : `Обращение уже имеет статус «${statusLabels[from]}». Обновите страницу.`;
  return `Действие недоступно для обращения со статусом «${statusLabels[from]}». Откройте обращение и выберите доступное действие.`;
}

const transitions: Record<ProblemStatus, ProblemStatus[]> = {
  DRAFT: ['AWAITING_COMMUNITY_CONFIRMATION', 'OPERATOR_REVIEW'],
  AWAITING_COMMUNITY_CONFIRMATION: ['COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW', 'REJECTED', 'DUPLICATE'],
  COMMUNITY_CONFIRMED: ['OPERATOR_REVIEW'],
  OPERATOR_REVIEW: ['NEEDS_MORE_INFO', 'ASSIGNED', 'REJECTED', 'DUPLICATE'],
  NEEDS_MORE_INFO: ['OPERATOR_REVIEW', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'REOPENED'],
  RESOLUTION_SUBMITTED: ['OPERATOR_VERIFICATION'],
  OPERATOR_VERIFICATION: ['COMMUNITY_VERIFICATION', 'IN_PROGRESS', 'REJECTED'],
  COMMUNITY_VERIFICATION: ['RESOLVED', 'PARTIALLY_RESOLVED', 'DISPUTED', 'REOPENED'],
  RESOLVED: ['REOPENED'],
  PARTIALLY_RESOLVED: ['REOPENED', 'RESOLVED', 'IN_PROGRESS'],
  DISPUTED: ['REOPENED', 'IN_PROGRESS', 'RESOLVED', 'PARTIALLY_RESOLVED'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'],
  REJECTED: [],
  DUPLICATE: [],
};

const roleTargets: Record<UserRole, ProblemStatus[]> = {
  RESIDENT: ['REOPENED'],
  OPERATOR: ['OPERATOR_REVIEW', 'NEEDS_MORE_INFO', 'ASSIGNED', 'COMMUNITY_VERIFICATION', 'RESOLVED', 'PARTIALLY_RESOLVED', 'DISPUTED', 'REOPENED', 'REJECTED', 'DUPLICATE', 'IN_PROGRESS'],
  CONTRACTOR: ['IN_PROGRESS', 'RESOLUTION_SUBMITTED'],
  ADMIN: Object.keys(transitions) as ProblemStatus[],
};

@Injectable()
export class ProblemStateMachineService {
  async advance(tx: Prisma.TransactionClient, id: string, from: ProblemStatus, steps: Array<{ to: ProblemStatus; reason?: string }>, actorId: string) {
    let previous = from;
    for (const step of steps) {
      if (!this.canTransition(previous, step.to)) throw new BadRequestException(transitionError(previous, step.to));
      previous = step.to;
    }
    const updated = await tx.problem.updateMany({ where: { id, status: from }, data: { status: previous } });
    if (!updated.count) return false;
    previous = from;
    for (const step of steps) {
      await tx.statusHistory.create({ data: { problemId: id, actorId, fromStatus: previous, toStatus: step.to, reason: step.reason } });
      previous = step.to;
    }
    return true;
  }
  canTransition(from: ProblemStatus, to: ProblemStatus) { return transitions[from].includes(to); }
  assertTransition(from: ProblemStatus, to: ProblemStatus, role: UserRole) {
    if (!this.canTransition(from, to)) throw new BadRequestException(transitionError(from, to));
    if (!roleTargets[role].includes(to)) throw new BadRequestException('У вас нет прав на это действие. Обратитесь к городскому оператору.');
  }
  getAllowed(from: ProblemStatus, role: UserRole) { return transitions[from].filter((target) => roleTargets[role].includes(target)); }
}
