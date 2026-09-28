import { describe, expect, it } from 'vitest';
import { notificationText } from './notificationText';

describe('stored notification text', () => {
  it('translates complete legacy status codes without replacing parts of other codes', () => {
    expect(notificationText('Новый статус: ASSIGNED')).toBe('Новый статус: Назначен исполнитель');
    expect(notificationText('Новый статус: PARTIALLY_RESOLVED')).toBe('Новый статус: Устранено частично');
    expect(notificationText('Новый статус: COMMUNITY_VERIFICATION')).toBe('Новый статус: Проверка жителями');
  });
  it('preserves already translated messages and ordinary text', () => {
    expect(notificationText('Новый статус: В работе')).toBe('Новый статус: В работе');
    expect(notificationText('Опубликован отчёт и фотографии результата')).toBe('Опубликован отчёт и фотографии результата');
  });
});
