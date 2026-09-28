import type { PersonalAddress, ProblemCategory, ProblemPriority, ProblemStatus, UserRole } from '@pulse/shared';

export interface User {
  homeAddress?: PersonalAddress | null;
  id: string; email: string; displayName: string; role: UserRole; districtId?: string; organizationId?: string;
  reputation?: number; trustLevel?: number; usefulStreak?: number; district?: District; organization?: Organization;
}
export interface District { id: string; name: string; centerLat: number; centerLng: number; cleanliness: number; safety: number; lighting: number; accessibility: number; roads: number; improvement: number }
export interface Organization { id: string; name: string; verified: boolean }
export interface Media { id: string; url: string; kind: 'BEFORE' | 'AFTER' | 'EVIDENCE' | 'COMMENT'; alt: string }
export interface ProblemListItem {
  id: string; number: number; title: string; description: string; category: ProblemCategory; status: ProblemStatus; priority: ProblemPriority;
  latitude: number; longitude: number; address: string; dueAt?: string; createdAt: string; updatedAt: string; confirmationCount: number;
  subscriberCount?: number; isSubscribed?: boolean; distanceKm?: number; district: District; media: Media[]; author: Pick<User, 'id' | 'displayName'> & { trustLevel?: number };
  assignments: Array<{ id: string; status: string; plannedAt?: string; organization: Organization }>;
}
export interface Problem extends ProblemListItem {
  officialResponse?: string; resolvedAt?: string; rejectionReason?: string;
  confirmations: Array<{ id: string; userId: string; type: string; hasPhoto: boolean; user: Pick<User, 'id' | 'displayName' | 'trustLevel'> }>;
  subscriptions: Array<{ userId: string }>;
  comments: Comment[];
  history: Array<{ id: string; fromStatus?: ProblemStatus; toStatus: ProblemStatus; reason?: string; createdAt: string; actor: Pick<User, 'id' | 'displayName' | 'role'> }>;
  reports: Array<{ id: string; summary: string; createdAt: string; media: Media[]; author: Pick<User, 'displayName'>; organization: Organization }>;
  votes: Array<{ id: string; vote: string; comment?: string; createdAt: string; user: Pick<User, 'id' | 'displayName'> }>;
  viewer: { confirmed: boolean; subscribed: boolean; voted: boolean; allowedTransitions: ProblemStatus[] };
}
export interface Comment { id: string; body: string; type: string; parentId?: string; isPinned: boolean; isDeleted: boolean; createdAt: string; author: Pick<User, 'id' | 'displayName' | 'role'> & { organization?: Organization }; media: Media[] }
export interface Summary { district: District; health: number; stats: { active: number; resolved: number; overdue: number; awaitingVerification: number }; mission?: Mission }
export interface Mission { id: string; title: string; description: string; icon: string; target: number; reward: number; startsAt: string; endsAt: string; status: string; totalProgress?: number; joined?: boolean; participations?: Array<{ progress: number }>; _count?: { participations: number } }
export interface Notification { id: string; problemId?: string; type: string; title: string; body: string; readAt?: string; createdAt: string }
