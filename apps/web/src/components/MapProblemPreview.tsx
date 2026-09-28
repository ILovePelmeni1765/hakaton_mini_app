import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon, MapPin, Users, X } from 'lucide-react';
import { categoryLabels } from '@pulse/shared';
import type { ProblemListItem } from '../types';
import { mediaUrl } from '../api';
import { StatusBadge } from './StatusBadge';

export function MapProblemPreview({ problem, onClose }: { problem: ProblemListItem; onClose(): void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const cover = problem.media[0];
  return <section className="problem-sheet" aria-label="Выбранная проблема">
    <header className="map-preview__header">
      <StatusBadge status={problem.status} />
      <button className="icon-button problem-sheet__close" type="button" onClick={onClose} aria-label="Закрыть карточку сигнала"><X size={20} /></button>
    </header>
    <div className="map-preview__body">
      <div className="map-preview__photo">
        {cover && !imageFailed ? <img src={mediaUrl(cover.url)} alt={cover.alt || problem.title} onError={() => setImageFailed(true)} /> : <ImageIcon size={24} aria-label={cover ? 'Фото недоступно' : 'Без фото'} />}
      </div>
      <div className="map-preview__text">
        <h2>{problem.title}</h2>
        <p><MapPin size={16} aria-hidden="true" /><span>{problem.address}</span></p>
      </div>
    </div>
    <div className="map-preview__meta">
      <span className={`priority priority--${problem.priority.toLowerCase()}`}>{problem.priority === 'CRITICAL' ? 'Опасно' : problem.priority === 'HIGH' ? 'Высокий приоритет' : categoryLabels[problem.category]}</span>
      <span><Users size={15} aria-hidden="true" />Подтвердили: {problem.confirmationCount}</span>
    </div>
    <Link className="button button--secondary map-preview__open" to={`/problems/${problem.id}`}>Открыть обращение<ChevronRight size={18} /></Link>
  </section>;
}
