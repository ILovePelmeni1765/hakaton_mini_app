import { ConfirmationType, ResolutionVoteType } from '@prisma/client';

export interface ConfirmationPolicyInput { userId: string; type: ConfirmationType; authorId: string }
export function hasCommunityConfirmationThreshold(confirmations: ConfirmationPolicyInput[], threshold = 2) {
  const independent = new Set(confirmations.filter((item) => item.userId !== item.authorId && ['EXISTS', 'EVIDENCE'].includes(item.type)).map((item) => item.userId));
  return independent.size >= threshold;
}

export interface VotePolicyInput { userId: string; vote: ResolutionVoteType }
export function resolutionVoteSummary(votes: VotePolicyInput[]) {
  const unique = new Map(votes.map((item) => [item.userId, item.vote]));
  const decisive = [...unique.values()].filter((vote) => vote !== 'CANNOT_VERIFY');
  return {
    decisive: decisive.length,
    fullyResolved: decisive.filter((vote) => vote === 'FULLY_RESOLVED').length,
    negative: decisive.filter((vote) => ['STILL_PRESENT', 'WORSE'].includes(vote)).length,
    partial: decisive.filter((vote) => vote === 'PARTIALLY_RESOLVED').length,
  };
}

export function canCloseAsResolved(votes: VotePolicyInput[], threshold = 2) {
  const summary = resolutionVoteSummary(votes);
  return summary.decisive >= threshold && summary.fullyResolved >= threshold && summary.negative === 0;
}
