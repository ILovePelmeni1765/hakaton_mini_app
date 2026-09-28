import { z } from 'zod';
export * from './achievements';
export * from './account';

export const USER_ROLES = ['RESIDENT', 'OPERATOR', 'CONTRACTOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROBLEM_STATUSES = [
  'DRAFT', 'AWAITING_COMMUNITY_CONFIRMATION', 'COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW',
  'NEEDS_MORE_INFO', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED',
  'OPERATOR_VERIFICATION', 'COMMUNITY_VERIFICATION', 'RESOLVED', 'PARTIALLY_RESOLVED',
  'DISPUTED', 'REOPENED', 'REJECTED', 'DUPLICATE',
] as const;
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
export type ProblemPriority = (typeof PRIORITIES)[number];

export const CATEGORIES = [
  'LIGHTING', 'OPEN_MANHOLE', 'ROAD', 'SIDEWALK', 'WASTE', 'PLAYGROUND', 'ACCESSIBILITY',
  'PUBLIC_TRANSPORT', 'SNOW', 'WATER_LEAK', 'ROAD_SIGN', 'FALLEN_TREE', 'OTHER',
] as const;
export type ProblemCategory = (typeof CATEGORIES)[number];

export const CONFIRMATION_TYPES = ['EXISTS', 'NOT_FOUND', 'CHANGED', 'EVIDENCE'] as const;
export type ConfirmationType = (typeof CONFIRMATION_TYPES)[number];
export const RESOLUTION_VOTES = ['FULLY_RESOLVED', 'PARTIALLY_RESOLVED', 'STILL_PRESENT', 'WORSE', 'CANNOT_VERIFY'] as const;
export type ResolutionVoteType = (typeof RESOLUTION_VOTES)[number];

export const createProblemSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES).default('NORMAL'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(3).max(300),
  mediaIds: z.array(z.string()).max(6).default([]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(2).max(3000),
  parentId: z.string().optional(),
  type: z.enum(['RESIDENT', 'CLARIFICATION', 'OFFICIAL', 'CONTRACTOR', 'INFO_REQUEST']).default('RESIDENT'),
  mediaIds: z.array(z.string()).max(4).default([]),
});

export const transitionSchema = z.object({
  to: z.enum(PROBLEM_STATUSES),
  reason: z.string().trim().min(3).max(1000).optional(),
  organizationId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  duplicateOfId: z.string().optional(),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;

export const notificationSettingsSchema = z.object({
  status: z.boolean().default(true),
  comments: z.boolean().default(true),
  missions: z.boolean().default(true),
  nearby: z.boolean().default(false),
  telegram: z.boolean().default(false),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export const evidenceSchema = z.object({ mediaId: z.string().min(1) });

export const statusLabels: Record<ProblemStatus, string> = {
  DRAFT: 'Черновик', AWAITING_COMMUNITY_CONFIRMATION: 'Ждёт подтверждения', COMMUNITY_CONFIRMED: 'Подтверждено жителями',
  OPERATOR_REVIEW: 'Проверка оператором', NEEDS_MORE_INFO: 'Нужно уточнение', ASSIGNED: 'Назначен исполнитель',
  IN_PROGRESS: 'В работе', RESOLUTION_SUBMITTED: 'Отчёт отправлен', OPERATOR_VERIFICATION: 'Проверка отчёта',
  COMMUNITY_VERIFICATION: 'Проверка жителями', RESOLVED: 'Устранено', PARTIALLY_RESOLVED: 'Устранено частично',
  DISPUTED: 'Результат оспорен', REOPENED: 'Открыто повторно', REJECTED: 'Отклонено', DUPLICATE: 'Дубликат',
};

export const categoryLabels: Record<ProblemCategory, string> = {
  LIGHTING: 'Освещение', OPEN_MANHOLE: 'Открытый люк', ROAD: 'Дороги', SIDEWALK: 'Тротуары', WASTE: 'Мусор',
  PLAYGROUND: 'Детские площадки', ACCESSIBILITY: 'Доступность', PUBLIC_TRANSPORT: 'Остановки', SNOW: 'Снег',
  WATER_LEAK: 'Протечка воды', ROAD_SIGN: 'Дорожные знаки', FALLEN_TREE: 'Упавшее дерево', OTHER: 'Другое',
};

export const dangerousCategories: ProblemCategory[] = ['OPEN_MANHOLE', 'WATER_LEAK', 'FALLEN_TREE'];

export const ACTIVE_STATUSES: ProblemStatus[] = PROBLEM_STATUSES.filter(
  (s) => !['RESOLVED', 'REJECTED', 'DUPLICATE'].includes(s),
);
export { searchTerms, matchesSearch } from './search';
export { missionPhase } from './missions';
