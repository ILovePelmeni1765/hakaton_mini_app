export function missionPhase(mission: { status: string; startsAt: Date | string; endsAt: Date | string }, now = new Date()): 'ACTIVE' | 'UPCOMING' | 'COMPLETED' {
  if (!['ACTIVE', 'UPCOMING'].includes(mission.status) || new Date(mission.endsAt) <= now) return 'COMPLETED';
  return new Date(mission.startsAt) > now ? 'UPCOMING' : 'ACTIVE';
}
