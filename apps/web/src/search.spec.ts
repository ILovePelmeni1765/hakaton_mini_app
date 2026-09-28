import { describe, expect, it } from 'vitest';
import { matchesSearch } from '@pulse/shared';

describe('address search', () => {
  it.each(['Плахотного 8а', 'плахотного,8а', '  ПЛАХОТНОГО,  8А  ', '8а Плахотного'])('finds the same address for %s', (query) => {
    expect(matchesSearch('Нет горячей воды Новосибирск, улица Плахотного, 8а', query)).toBe(true);
  });
  it('requires all meaningful terms', () => {
    expect(matchesSearch('Плахотного, 8а', 'Плахотного 10')).toBe(false);
    expect(matchesSearch('Плахотного, 8а', ' , ')).toBe(true);
  });
});
