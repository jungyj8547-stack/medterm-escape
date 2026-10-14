import type { RoomResult } from '../types';

export interface Completion {
  totalScore: number;
  totalTimeSec: number;
  stars: number;
  completedAt: string;
  roomCount: number;
}
export interface CompletionEntry extends Completion { memberId: string; nickname: string }

export function completionFor(roomIds: string[], best: Record<string, RoomResult>): Completion | null {
  if (!roomIds.length) return null;
  const results = roomIds.map(id => best[id]);
  if (results.some((r, i) => r?.escaped !== true || r.roomId !== roomIds[i]
    || !Number.isInteger(r.score) || r.score < 0 || r.score > 2400
    || !Number.isInteger(r.timeUsedSec) || r.timeUsedSec < 0 || r.timeUsedSec > 2400
    || !Number.isInteger(r.stars) || r.stars < 1 || r.stars > 3
    || !Number.isFinite(Date.parse(r.date)))) return null;
  return {
    totalScore: results.reduce((n, r) => n + r.score, 0),
    totalTimeSec: results.reduce((n, r) => n + r.timeUsedSec, 0),
    stars: results.reduce((n, r) => n + r.stars, 0),
    completedAt: new Date(Math.max(...results.map(r => Date.parse(r.date)))).toISOString(),
    roomCount: roomIds.length,
  };
}

export function completionStandings(entries: CompletionEntry[]) {
  const sorted = [...entries].sort((a, b) => b.totalScore - a.totalScore || a.totalTimeSec - b.totalTimeSec || a.memberId.localeCompare(b.memberId));
  return sorted.map(e => ({ ...e, rank: 1 + sorted.filter(other => other.totalScore > e.totalScore || (other.totalScore === e.totalScore && other.totalTimeSec < e.totalTimeSec)).length }));
}
