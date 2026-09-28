import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { categoryLabels, type ProblemPriority } from '@pulse/shared';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ProblemListItem } from '../types';
import { StatusBadge } from './StatusBadge';

export const priorityLabels: Record<ProblemPriority, string> = {
  LOW: 'Низкий', NORMAL: 'Обычный', HIGH: 'Высокий', CRITICAL: 'Критический',
};

export function isOverdue(problem: ProblemListItem) {
  return Boolean(problem.dueAt && new Date(problem.dueAt) < new Date()
    && !['RESOLVED', 'REJECTED', 'DUPLICATE'].includes(problem.status));
}

export function WorkItem({ problem, selection, contractor = false }: {
  problem: ProblemListItem; selection?: ReactNode; contractor?: boolean;
}) {
  const overdue = isOverdue(problem);
  return <article className={`work-item ${selection ? 'work-item--selectable' : ''}`}>
    {selection}
    <div className="work-item__heading">
      <h2><Link to={`/problems/${problem.id}`}>№ {problem.number} · {problem.title}</Link></h2>
      <p>{problem.address}</p>
      <span className="work-item__category">{categoryLabels[problem.category]}</span>
    </div>
    <div className="work-item__state">
      <StatusBadge status={problem.status} />
      <span className={`work-priority work-priority--${problem.priority.toLowerCase()}`}>Приоритет: {priorityLabels[problem.priority].toLowerCase()}</span>
    </div>
    <dl className="work-item__facts">
      <div><dt>Срок выполнения</dt><dd className={overdue ? 'text-danger' : undefined}>{problem.dueAt ? format(new Date(problem.dueAt), 'd MMMM yyyy', { locale: ru }) : 'Не назначен'}{overdue && <span className="work-item__overdue">Просрочено</span>}</dd></div>
      {!contractor && <div><dt>Подтверждения жителей</dt><dd>{problem.confirmationCount === 0 ? 'Пока нет' : `${problem.confirmationCount} чел.`}</dd></div>}
    </dl>
    <div className="work-item__footer">
      <span>Обновлено {formatDistanceToNow(new Date(problem.updatedAt), { addSuffix: true, locale: ru })}</span>
      <Link className="work-item__open" to={`/problems/${problem.id}`}>{contractor ? 'Открыть задачу' : 'Открыть обращение'}<ChevronRight size={17} aria-hidden="true" /></Link>
    </div>
  </article>;
}
