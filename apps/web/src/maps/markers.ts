import { statusLabels, type ProblemPriority } from '@pulse/shared';
import type { ProblemListItem } from '../types';

export const markerPriorities: Record<ProblemPriority, { color: string; label: string }> = {
  LOW: { color: '#25835c', label: 'Низкая' },
  NORMAL: { color: '#c79b13', label: 'Обычная' },
  HIGH: { color: '#d76616', label: 'Высокая' },
  CRITICAL: { color: '#c63748', label: 'Критическая' },
};

export function createCityMarker() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 44 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('city-marker__pin');
  const pin = document.createElementNS(svg.namespaceURI, 'path');
  pin.setAttribute('d', 'M22 2C12.61 2 5 9.61 5 19C5 30 22 43 22 43S39 30 39 19C39 9.61 31.39 2 22 2Z');
  const dot = document.createElementNS(svg.namespaceURI, 'circle');
  dot.setAttribute('cx', '22');
  dot.setAttribute('cy', '19');
  dot.setAttribute('r', '4.5');
  svg.append(pin, dot);
  return svg;
}

export function createProblemMarker(problem: ProblemListItem, selected: boolean, onSelect: () => void) {
  const button = document.createElement('button');
  const priority = markerPriorities[problem.priority];
  button.type = 'button';
  button.className = `city-marker${selected ? ' city-marker--selected' : ''}`;
  button.style.setProperty('--marker-color', priority.color);
  button.dataset.priority = problem.priority;
  button.setAttribute('aria-label', `${problem.title}. ${problem.address}. ${priority.label} срочность. ${statusLabels[problem.status]}`);
  button.setAttribute('aria-pressed', String(selected));
  button.title = `${problem.title} · ${priority.label} срочность`;
  button.append(createCityMarker());
  button.addEventListener('click', onSelect);
  return button;
}
