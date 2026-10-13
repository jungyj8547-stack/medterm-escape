export interface TeamCard {
  id: string;
  name: string;
  animal: string;
  color: string;
  capacity: number;
}

export interface TeamAssignment {
  teamId: string;
}

export interface TeamPlan {
  id: string;
  totalStudents: number;
  teamCount: number;
  cards: TeamCard[];
  slots: string[];
  nextIndex: number;
  assignments: Record<string, TeamAssignment>;
}

export interface LessonTeam extends TeamCard {
  memberUids: string[];
}

export interface LessonScore {
  uid: string;
  teamId: string;
  score: number;
  timeUsedSec: number;
  escaped: boolean;
}

export interface TeamStanding {
  teamId: string;
  name: string;
  animal: string;
  color: string;
  members: number;
  completed: number;
  total: number;
  average: number;
}

export interface ClassLesson {
  id: string;
  roomId: string;
  status: 'active' | 'closed';
  planId: string;
  createdAt: string;
  teams: LessonTeam[];
  board: TeamStanding[];
}

const ANIMALS = [
  ['토끼', 'rabbit', '#f8b8c9'], ['고양이', 'cat', '#f8d49a'],
  ['펭귄', 'penguin', '#a9d7f0'], ['곰', 'bear', '#dabaa3'],
  ['여우', 'fox', '#f8b17f'], ['판다', 'panda', '#c9d5d8'],
  ['강아지', 'dog', '#e8c48e'], ['병아리', 'chick', '#f7dc75'],
] as const;

/** One balanced deck per class. Draws consume one slot atomically in Firestore. */
export function makeTeamPlan(totalStudents: number, teamCount: number, random = Math.random): TeamPlan {
  if (!Number.isInteger(totalStudents) || totalStudents < 1 || totalStudents > 200)
    throw new Error('총인원은 1~200명으로 입력하세요.');
  if (!Number.isInteger(teamCount) || teamCount < 1 || teamCount > Math.min(20, totalStudents))
    throw new Error('조 개수는 총인원 이하인 1~20개로 입력하세요.');
  const cards = Array.from({ length: teamCount }, (_, i) => {
    const [name, animal, color] = ANIMALS[i % ANIMALS.length];
    return { id: `team-${i + 1}`, name: `${i + 1}조 ${name}팀`, animal, color,
      capacity: Math.floor(totalStudents / teamCount) + (i < totalStudents % teamCount ? 1 : 0) };
  });
  const slots = cards.flatMap(t => Array.from({ length: t.capacity }, () => t.id));
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return { id: crypto.randomUUID(), totalStudents, teamCount, cards, slots, nextIndex: 0, assignments: {} };
}

export function lessonTeams(plan: TeamPlan): LessonTeam[] {
  return plan.cards.map(card => ({ ...card,
    memberUids: Object.entries(plan.assignments).filter(([, a]) => a.teamId === card.id).map(([uid]) => uid),
  }));
}

/** Frozen actual roster is the denominator; missing and failed scores remain zero. */
export function teamStandings(teams: LessonTeam[], scores: LessonScore[]): TeamStanding[] {
  return teams.filter(t => t.memberUids.length > 0).map(team => {
    const roster = new Set(team.memberUids);
    const byUid = new Map<string, LessonScore>();
    for (const score of scores) {
      if (!roster.has(score.uid) || score.teamId !== team.id || !score.escaped) continue;
      const old = byUid.get(score.uid);
      if (!old || score.score > old.score) byUid.set(score.uid, score);
    }
    const total = [...byUid.values()].reduce((sum, s) => sum + s.score, 0);
    return { teamId: team.id, name: team.name, animal: team.animal, color: team.color,
      members: roster.size, completed: byUid.size, total, average: total / roster.size };
  }).sort((a, b) => b.average - a.average || b.completed / b.members - a.completed / a.members || a.teamId.localeCompare(b.teamId));
}
