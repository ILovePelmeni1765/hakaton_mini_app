import { describe, expect, it } from 'vitest';
import { canCloseAsResolved, hasCommunityConfirmationThreshold, resolutionVoteSummary } from './community-policy';

describe('community confirmation policy', () => {
  it('requires two unique residents and excludes the author', () => {
    const authorId = 'author';
    expect(hasCommunityConfirmationThreshold([
      { userId: authorId, authorId, type: 'EXISTS' },
      { userId: 'resident-2', authorId, type: 'EVIDENCE' },
      { userId: 'resident-2', authorId, type: 'EXISTS' },
    ])).toBe(false);
    expect(hasCommunityConfirmationThreshold([
      { userId: 'resident-2', authorId, type: 'EXISTS' },
      { userId: 'resident-3', authorId, type: 'EVIDENCE' },
    ])).toBe(true);
  });
});

describe('resolution voting policy', () => {
  it('requires two independent positive votes', () => {
    expect(canCloseAsResolved([{ userId: 'a', vote: 'FULLY_RESOLVED' }])).toBe(false);
    expect(canCloseAsResolved([{ userId: 'a', vote: 'FULLY_RESOLVED' }, { userId: 'b', vote: 'FULLY_RESOLVED' }])).toBe(true);
  });
  it('does not count cannot-verify and blocks closure with a negative vote', () => {
    const votes = [{ userId: 'a', vote: 'FULLY_RESOLVED' as const }, { userId: 'b', vote: 'FULLY_RESOLVED' as const }, { userId: 'c', vote: 'STILL_PRESENT' as const }, { userId: 'd', vote: 'CANNOT_VERIFY' as const }];
    expect(resolutionVoteSummary(votes)).toEqual({ decisive: 3, fullyResolved: 2, negative: 1, partial: 0 });
    expect(canCloseAsResolved(votes)).toBe(false);
  });
});
