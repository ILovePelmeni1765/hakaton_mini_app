import { Badge } from '@pulse/ui';
import { statusLabels, type ProblemStatus } from '@pulse/shared';

export function StatusBadge({ status }: { status: ProblemStatus }) {
  const tone = status === 'RESOLVED' ? 'success' : ['DISPUTED', 'REOPENED', 'REJECTED'].includes(status) ? 'danger' : ['ASSIGNED', 'IN_PROGRESS', 'OPERATOR_VERIFICATION'].includes(status) ? 'warning' : 'info';
  return <Badge tone={tone}>{statusLabels[status]}</Badge>;
}
