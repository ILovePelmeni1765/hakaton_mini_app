import { useState } from 'react';
import { Accessibility, Award, Camera, Check, CircleCheck, Eye, Flag, Lightbulb, Map, ShieldCheck, Target, Users } from 'lucide-react';
import type { AchievementProgress } from '@pulse/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const icons: Record<string, typeof Award> = { accessibility: Accessibility, award: Award, camera: Camera, 'circle-check': CircleCheck, eye: Eye, flag: Flag, lightbulb: Lightbulb, map: Map, 'shield-check': ShieldCheck, target: Target, users: Users };

export function Achievements({ achievements }: { achievements: AchievementProgress[] }) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'progress'>('all');
  const earned = achievements.filter((item) => item.completed).length;
  const filtered = achievements.filter((item) => filter === 'all' || (filter === 'earned' ? item.completed : !item.completed));
  return <section className="achievements-section" aria-labelledby="achievements-title">
    <div className="achievements-heading"><h2 id="achievements-title">Достижения</h2><span>Получено {earned} из {achievements.length}</span></div>
    <div className="achievement-filters" role="group" aria-label="Фильтр достижений">
      {([{ value: 'all', label: 'Все', count: achievements.length }, { value: 'earned', label: 'Получены', count: earned }, { value: 'progress', label: 'В процессе', count: achievements.length - earned }] as const).map(({ value, label, count }) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}
    </div>
    <div className="achievement-list">{filtered.map((item) => {
      const Icon = icons[item.icon] ?? Award;
      const percent = item.target > 0 ? Math.min(100, Math.round(item.current / item.target * 100)) : 0;
      return <article key={item.code} className={`achievement-item${item.completed ? ' achievement-item--earned' : ''}`}>
        <span className="achievement-symbol"><Icon size={22} aria-hidden="true" /></span>
        <div className="achievement-content">
          <div className="achievement-title"><h3>{item.title}</h3>{item.completed && <span className="achievement-earned"><Check size={14} />Получено</span>}</div>
          <p>{item.description}</p>
          {item.completed ? item.earnedAt && <time className="achievement-date" dateTime={item.earnedAt}>{format(new Date(item.earnedAt), 'd MMMM yyyy', { locale: ru })}</time> : <div className="achievement-progress-row"><div className="progress" role="progressbar" aria-label={`Достижение «${item.title}»`} aria-valuemin={0} aria-valuemax={item.target} aria-valuenow={item.current} aria-valuetext={`${item.current} из ${item.target}`}><span style={{ width: `${percent}%` }} /></div><strong>{item.current} из {item.target}</strong></div>}
        </div>
      </article>;
    })}</div>
    {!filtered.length && <p className="achievement-empty">{filter === 'earned' ? 'Полученных достижений пока нет. Во вкладке «В процессе» показано, как их получить.' : 'Все достижения получены.'}</p>}
  </section>;
}
