import { ChevronRight, Clock3, Image as ImageIcon, MapPin, Users } from 'lucide-react';
import { categoryLabels } from '@pulse/shared';
import { Link } from 'react-router-dom';
import { Card } from '@pulse/ui';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import type { ProblemListItem } from '../types';
import { mediaUrl } from '../api';
import { StatusBadge } from './StatusBadge';

export function ProblemCard({ problem, compact = false }: { problem: ProblemListItem; compact?: boolean }) {
  const overdue = problem.dueAt && new Date(problem.dueAt) < new Date() && problem.status !== 'RESOLVED';
  const [imageFailed, setImageFailed] = useState(false);
  const cover = problem.media[0];
  return <Link className="problem-link" to={`/problems/${problem.id}`} aria-label={`${problem.title}, ${problem.address}`}>
    <Card className={`problem-card ${compact ? 'problem-card--compact' : ''}`}>
      <div className="problem-card__media">
        {cover && !imageFailed ? <img className="problem-card__image" src={mediaUrl(cover.url)} alt={cover.alt || problem.title} loading="lazy" onError={() => setImageFailed(true)} /> : <span className="problem-card__placeholder"><ImageIcon size={20} /><small>{cover ? 'Фото недоступно' : 'Без фото'}</small></span>}
      </div>
      <div className="problem-card__body">
        <div className="problem-card__badges"><StatusBadge status={problem.status} /><span className={`priority priority--${problem.priority.toLowerCase()}`}>{problem.priority === 'CRITICAL' ? 'Опасно' : problem.priority === 'HIGH' ? 'Высокий приоритет' : categoryLabels[problem.category]}</span></div>
        <h3>{problem.title}</h3>
        <p className="meta"><MapPin size={15} />{problem.address}</p>
        <div className="problem-card__footer">
          <span title="Подтверждения"><Users size={15} />{problem.confirmationCount} подтвердили</span>
          {problem.dueAt && <span className={overdue ? 'text-danger' : ''}><Clock3 size={15} />{overdue ? 'Просрочено' : format(new Date(problem.dueAt), 'd MMM', { locale: ru })}</span>}
          {!problem.dueAt && <span>{formatDistanceToNowStrict(new Date(problem.updatedAt), { addSuffix: true, locale: ru })}</span>}
        </div>
      </div>
      <ChevronRight className="problem-card__arrow" size={18} aria-hidden="true" />
    </Card>
  </Link>;
}
