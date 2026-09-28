export type AchievementMetric = 'signals' | 'confirmations' | 'results' | 'usefulActions' | 'accessibility' | 'nightLighting' | 'resolvedSignals' | 'photoConfirmations' | 'missions';

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
}

export interface AchievementProgress extends AchievementDefinition {
  current: number;
  completed: boolean;
  earnedAt: string | null;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { code: 'FIRST_SIGNAL', title: 'Первый сигнал', description: 'Создайте первое обращение о городской проблеме.', icon: 'flag', metric: 'signals', target: 1 },
  { code: 'RELIABLE_WITNESS', title: 'Надёжный свидетель', description: 'Проверьте 5 сигналов других жителей.', icon: 'shield-check', metric: 'confirmations', target: 5 },
  { code: 'CHECKED_PERSONALLY', title: 'Проверено лично', description: 'Проверьте результат работ по 3 обращениям.', icon: 'eye', metric: 'results', target: 3 },
  { code: 'DISTRICT_GUARDIAN', title: 'Хранитель района', description: 'Выполните 50 действий: создавайте обращения, проверяйте сигналы и результаты.', icon: 'map', metric: 'usefulActions', target: 50 },
  { code: 'NO_BARRIERS', title: 'Без барьеров', description: 'Создайте или проверьте 3 разных сигнала о доступности среды.', icon: 'accessibility', metric: 'accessibility', target: 3 },
  { code: 'NIGHT_WATCH', title: 'Ночной дозор', description: 'Проверьте сигнал об освещении с 20:00 до 06:00 по времени Новосибирска.', icon: 'lightbulb', metric: 'nightLighting', target: 1 },
  { code: 'PROBLEM_SOLVED', title: 'Проблема решена', description: 'Дождитесь устранения проблемы по вашему обращению.', icon: 'circle-check', metric: 'resolvedSignals', target: 1 },
  { code: 'CITY_REPORTER', title: 'Внимательный житель', description: 'Создайте 5 обращений о городских проблемах.', icon: 'flag', metric: 'signals', target: 5 },
  { code: 'CITY_OBSERVER', title: 'Город под наблюдением', description: 'Создайте 20 обращений о городских проблемах.', icon: 'map', metric: 'signals', target: 20 },
  { code: 'NEIGHBOR_SUPPORT', title: 'Опора соседей', description: 'Проверьте 20 сигналов других жителей.', icon: 'users', metric: 'confirmations', target: 20 },
  { code: 'RESULT_EXPERT', title: 'Контроль качества', description: 'Проверьте результат работ по 10 обращениям.', icon: 'eye', metric: 'results', target: 10 },
  { code: 'PHOTO_WITNESS', title: 'Факты в кадре', description: 'Добавьте фотографии к 3 проверкам сигналов.', icon: 'camera', metric: 'photoConfirmations', target: 3 },
  { code: 'MISSION_PARTICIPANT', title: 'В команде', description: 'Присоединитесь к городской миссии.', icon: 'target', metric: 'missions', target: 1 },
  { code: 'ACTIVE_CITIZEN', title: 'Первые десять', description: 'Выполните 10 действий: создавайте обращения, проверяйте сигналы и результаты.', icon: 'award', metric: 'usefulActions', target: 10 },
];
