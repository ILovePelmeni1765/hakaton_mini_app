import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge smoke test', () => {
  it('renders a readable status without color-only meaning', () => {
    const markup = renderToStaticMarkup(<StatusBadge status="COMMUNITY_VERIFICATION" />);
    expect(markup).toContain('Проверка жителями');
    expect(markup).toContain('badge--info');
  });
});
