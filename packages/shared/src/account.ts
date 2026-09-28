import { z } from 'zod';
import type { ProblemStatus, UserRole } from './index';

export const personalAddressSchema = z
  .object({
    address: z
      .string()
      .trim()
      .min(3, 'Укажите адрес')
      .max(300, 'Не больше 300 символов')
      .regex(/^[^<>\u0000-\u001f\u007f]+$/, 'Адрес содержит недопустимые символы'),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();
export type PersonalAddress = z.infer<typeof personalAddressSchema>;

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Введите минимум 2 символа')
      .max(80, 'Не больше 80 символов')
      .regex(/^[^<>\u0000-\u001f\u007f]+$/, 'Имя содержит недопустимые символы')
      .optional(),
    homeAddress: personalAddressSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => value.displayName !== undefined || value.homeAddress !== undefined,
    'Нет изменений для сохранения',
  );
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type AccountMetricKey =
  | 'created'
  | 'active'
  | 'resolved'
  | 'subscriptions'
  | 'review'
  | 'overdue'
  | 'disputed'
  | 'assigned'
  | 'inProgress'
  | 'verification'
  | 'users'
  | 'suspended'
  | 'organizations'
  | 'missions';
export interface AccountOverview {
  role: UserRole;
  metrics: Array<{ key: AccountMetricKey; value: number }>;
  problems: Array<{
    id: string;
    number: number;
    title: string;
    address: string;
    status: ProblemStatus;
    dueAt: string | null;
  }>;
  activity: Array<{
    id: string;
    action: string;
    createdAt: string;
    problem: { id: string; number: number; title: string } | null;
  }>;
}
