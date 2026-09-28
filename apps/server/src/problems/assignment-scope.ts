import { PrismaService } from '../prisma/prisma.service';

export async function currentOrganizationProblemIds(
  prisma: PrismaService,
  organizationId?: string | null,
) {
  if (!organizationId) return [];
  const candidates = await prisma.problem.findMany({
    where: { assignments: { some: { organizationId } } },
    select: {
      id: true,
      assignments: { orderBy: { createdAt: 'desc' }, take: 1, select: { organizationId: true } },
    },
  });
  return candidates
    .filter((problem) => problem.assignments[0]?.organizationId === organizationId)
    .map((problem) => problem.id);
}
