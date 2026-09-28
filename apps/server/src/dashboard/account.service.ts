import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, ProblemStatus } from '@prisma/client';
import { updateProfileSchema, type AccountOverview } from '@pulse/shared';
import { AuthUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { currentOrganizationProblemIds } from '../problems/assignment-scope';

const closed: ProblemStatus[] = ['RESOLVED', 'REJECTED', 'DUPLICATE'];
const review: ProblemStatus[] = [
  'COMMUNITY_CONFIRMED',
  'OPERATOR_REVIEW',
  'RESOLUTION_SUBMITTED',
  'OPERATOR_VERIFICATION',
];
const verification: ProblemStatus[] = [
  'RESOLUTION_SUBMITTED',
  'OPERATOR_VERIFICATION',
  'COMMUNITY_VERIFICATION',
];

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async update(user: AuthUser, input: unknown) {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join('. '));
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: user.id },
        data: {
          ...parsed.data,
          homeAddress: parsed.data.homeAddress === null ? Prisma.DbNull : parsed.data.homeAddress,
        },
        select: { id: true, displayName: true, homeAddress: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'PROFILE_UPDATED',
          entityType: 'User',
          entityId: user.id,
        },
      });
      return result;
    });
  }

  async overview(user: AuthUser): Promise<AccountOverview> {
    const now = new Date();
    const scope: Prisma.ProblemWhereInput = {};
    if (user.role === 'RESIDENT') scope.authorId = user.id;
    if (user.role === 'CONTRACTOR') {
      // A historical assignment must not expose a task reassigned to another organization.
      scope.id = { in: await currentOrganizationProblemIds(this.prisma, user.organizationId) };
    }
    const count = (where: Prisma.ProblemWhereInput) =>
      this.prisma.problem.count({ where: { AND: [scope, where] } });
    const metric = async (
      key: AccountOverview['metrics'][number]['key'],
      value: Promise<number>,
    ) => ({ key, value: await value });
    const metricQueries =
      user.role === 'RESIDENT'
        ? [
            metric('created', count({})),
            metric('active', count({ status: { notIn: closed } })),
            metric('resolved', count({ status: 'RESOLVED' })),
            metric(
              'subscriptions',
              this.prisma.problemSubscription.count({ where: { userId: user.id } }),
            ),
          ]
        : user.role === 'OPERATOR'
          ? [
              metric('review', count({ status: { in: review } })),
              metric('overdue', count({ dueAt: { lt: now }, status: { notIn: closed } })),
              metric('disputed', count({ status: 'DISPUTED' })),
              metric('resolved', count({ status: 'RESOLVED' })),
            ]
          : user.role === 'CONTRACTOR'
            ? [
                metric('assigned', count({ status: 'ASSIGNED' })),
                metric('inProgress', count({ status: 'IN_PROGRESS' })),
                metric('verification', count({ status: { in: verification } })),
                metric('resolved', count({ status: 'RESOLVED' })),
              ]
            : [
                metric('users', this.prisma.user.count({ where: { isActive: true } })),
                metric('suspended', this.prisma.user.count({ where: { isActive: false } })),
                metric(
                  'organizations',
                  this.prisma.organization.count({ where: { verified: true } }),
                ),
                metric(
                  'missions',
                  this.prisma.mission.count({
                    where: {
                      status: { in: ['ACTIVE', 'UPCOMING'] },
                      startsAt: { lte: now },
                      endsAt: { gt: now },
                    },
                  }),
                ),
              ];
    const [metrics, problems, activity] = await Promise.all([
      Promise.all(metricQueries),
      user.role === 'ADMIN'
        ? Promise.resolve([])
        : this.prisma.problem.findMany({
            where: { AND: [scope, user.role === 'RESIDENT' ? {} : { status: { notIn: closed } }] },
            select: {
              id: true,
              number: true,
              title: true,
              address: true,
              status: true,
              dueAt: true,
            },
            orderBy:
              user.role === 'RESIDENT'
                ? [{ updatedAt: 'desc' }]
                : [
                    { dueAt: { sort: 'asc', nulls: 'last' } },
                    { priority: 'desc' },
                    { updatedAt: 'desc' },
                  ],
            take: 5,
          }),
      this.prisma.auditLog.findMany({
        where: { actorId: user.id },
        select: {
          id: true,
          action: true,
          createdAt: true,
          problem: { select: { id: true, number: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);
    return {
      role: user.role,
      metrics,
      problems: problems.map((problem) => ({
        ...problem,
        dueAt: problem.dueAt?.toISOString() ?? null,
      })),
      activity: activity.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    };
  }
}
