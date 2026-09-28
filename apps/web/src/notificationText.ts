import { statusLabels, type ProblemStatus } from '@pulse/shared';

// Older notifications contain status codes in their stored body.
export function notificationText(text: string) {
  return text.replace(/\b[A-Z][A-Z_]+\b/g, (code) =>
    Object.hasOwn(statusLabels, code) ? statusLabels[code as ProblemStatus] : code);
}
