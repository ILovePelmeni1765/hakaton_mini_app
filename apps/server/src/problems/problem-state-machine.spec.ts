import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { ProblemStateMachineService } from './problem-state-machine.service';

describe('ProblemStateMachineService', () => {
  const machine = new ProblemStateMachineService();

  it('allows the complete verified lifecycle', () => {
    const sequence = ['DRAFT', 'AWAITING_COMMUNITY_CONFIRMATION', 'COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'OPERATOR_VERIFICATION', 'COMMUNITY_VERIFICATION', 'RESOLVED'] as const;
    for (let index = 0; index < sequence.length - 1; index += 1) expect(machine.canTransition(sequence[index]!, sequence[index + 1]!)).toBe(true);
  });

  it('never lets a contractor close a problem', () => {
    expect(() => machine.assertTransition('COMMUNITY_VERIFICATION', 'RESOLVED', 'CONTRACTOR')).toThrow();
  });

  it('rejects status skipping', () => {
    expect(() => machine.assertTransition('ASSIGNED', 'RESOLVED', 'OPERATOR')).toThrow(/Действие недоступно/);
  });

  it('records every automatic step and does not duplicate history after a concurrent change', async () => {
    const updateMany = vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const create = vi.fn();
    const tx = { problem: { updateMany }, statusHistory: { create } } as unknown as Prisma.TransactionClient;
    const steps = [{ to: 'COMMUNITY_CONFIRMED' as const }, { to: 'OPERATOR_REVIEW' as const }];
    expect(await machine.advance(tx, 'problem', 'AWAITING_COMMUNITY_CONFIRMATION', steps, 'resident')).toBe(true);
    expect(create.mock.calls.map(([input]) => [input.data.fromStatus, input.data.toStatus])).toEqual([
      ['AWAITING_COMMUNITY_CONFIRMATION', 'COMMUNITY_CONFIRMED'], ['COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW'],
    ]);
    expect(await machine.advance(tx, 'problem', 'AWAITING_COMMUNITY_CONFIRMATION', steps, 'resident')).toBe(false);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
