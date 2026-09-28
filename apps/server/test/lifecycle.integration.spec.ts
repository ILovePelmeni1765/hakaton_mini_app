import { describe, expect, it } from 'vitest';
import { ProblemStateMachineService } from '../src/problems/problem-state-machine.service';
import { canCloseAsResolved, hasCommunityConfirmationThreshold } from '../src/problems/community-policy';

describe('main city-pulse scenario', () => {
  it('moves a streetlight problem from publication to verified resolution', () => {
    const machine = new ProblemStateMachineService(); let status: any = 'AWAITING_COMMUNITY_CONFIRMATION';
    const confirmations = [{ userId: 'resident-2', authorId: 'resident-1', type: 'EXISTS' as const }, { userId: 'resident-3', authorId: 'resident-1', type: 'EVIDENCE' as const }];
    expect(hasCommunityConfirmationThreshold(confirmations)).toBe(true);
    for (const [next, role] of [['COMMUNITY_CONFIRMED', 'ADMIN'], ['OPERATOR_REVIEW', 'OPERATOR'], ['ASSIGNED', 'OPERATOR'], ['IN_PROGRESS', 'CONTRACTOR'], ['RESOLUTION_SUBMITTED', 'CONTRACTOR'], ['OPERATOR_VERIFICATION', 'ADMIN'], ['COMMUNITY_VERIFICATION', 'OPERATOR']] as const) { machine.assertTransition(status, next, role); status = next; }
    expect(canCloseAsResolved([{ userId: 'resident-2', vote: 'FULLY_RESOLVED' }, { userId: 'resident-3', vote: 'FULLY_RESOLVED' }])).toBe(true);
    machine.assertTransition(status, 'RESOLVED', 'OPERATOR'); status = 'RESOLVED';
    expect(status).toBe('RESOLVED');
  });
});
