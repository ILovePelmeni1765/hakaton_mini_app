import { describe, expect, it, vi } from 'vitest';
import type { ProblemListItem } from '../types';
import { createProblemMarker } from './markers';

describe('map severity markers', () => {
  const problem = { title: 'Открытый люк', address: 'У школы', priority: 'CRITICAL', status: 'ASSIGNED' } as ProblemListItem;

  it('keeps the critical colour when the work status or selection changes', () => {
    const marker = createProblemMarker(problem, false, vi.fn());
    const selected = createProblemMarker({ ...problem, status: 'IN_PROGRESS' }, true, vi.fn());
    expect(marker.style.getPropertyValue('--marker-color')).toBe('#c63748');
    expect(selected.style.getPropertyValue('--marker-color')).toBe('#c63748');
    expect(selected.getAttribute('aria-label')).toContain('Критическая срочность');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  it('selects the problem once when the centre of the pin is clicked', () => {
    const select = vi.fn();
    const marker = createProblemMarker(problem, false, select);
    marker.querySelector('circle')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(select).toHaveBeenCalledOnce();
  });
});
