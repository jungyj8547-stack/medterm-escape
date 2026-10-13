import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { fb } from './app';
import type { StudentProfile } from './student';
import type { RoomResult } from '../types';
import { lessonTeams, makeTeamPlan, teamStandings, type ClassLesson, type LessonScore, type TeamPlan } from '../engine/classroom';

export interface RankedStudent { uid: string; nickname: string; score: number; rank: number }
export interface Lesson extends ClassLesson {
  members: Record<string, string>;
  individualRanks: RankedStudent[];
}
export interface Score extends LessonScore { nickname: string; lessonId: string; roomId: string; date: string }
const classRef = (id: string) => doc(fb().db, 'classes', id);
const planRef = (id: string) => doc(fb().db, 'classes', id, 'teamDraw', 'state');

export function watchPlan(classId: string, cb: (p: TeamPlan | null) => void, error: (e: Error) => void) {
  return onSnapshot(planRef(classId), s => cb(s.exists() ? s.data() as TeamPlan : null), error);
}
export function watchLesson(classId: string, cb: (l: Lesson | null) => void, error: (e: Error) => void) {
  return onSnapshot(classRef(classId), s => cb(s.exists() ? (s.data().lesson ?? null) : null), error);
}
export async function configureTeams(classId: string, total: number, count: number) {
  const plan = makeTeamPlan(total, count);
  await runTransaction(fb().db, async tx => {
    const old = await tx.get(planRef(classId));
    if (old.exists() && old.data().nextIndex > 0) throw new Error('이미 카드를 뽑은 학생이 있어 조 편성을 변경할 수 없습니다.');
    tx.set(planRef(classId), plan);
  });
}
export async function drawTeam(student: StudentProfile) {
  return runTransaction(fb().db, async tx => {
    const [ps, cs, us] = await Promise.all([
      tx.get(planRef(student.classId)), tx.get(classRef(student.classId)), tx.get(doc(fb().db, 'users', student.studentId)),
    ]);
    if (!us.exists() || us.data().uid !== student.uid || us.data().classId !== student.classId)
      throw new Error('학생 계정의 반 정보를 확인해주세요.');
    if (!ps.exists()) throw new Error('교수자가 아직 카드 뽑기를 준비하지 않았습니다.');
    const plan = ps.data() as TeamPlan;
    if (plan.assignments[student.uid]) return plan.assignments[student.uid].teamId;
    if (cs.data()?.lesson?.status === 'active') throw new Error('수업이 시작되어 팀 배정이 마감되었습니다. 교수자에게 문의하세요.');
    if (plan.nextIndex >= plan.slots.length) throw new Error('설정된 총인원이 모두 배정되었습니다. 교수자에게 문의하세요.');
    const teamId = plan.slots[plan.nextIndex];
    tx.update(planRef(student.classId), {
      nextIndex: plan.nextIndex + 1,
      assignments: { ...plan.assignments, [student.uid]: { teamId } },
    });
    return teamId;
  });
}
export async function startClassLesson(classId: string, roomId: string) {
  await runTransaction(fb().db, async tx => {
    const [ps, cs] = await Promise.all([tx.get(planRef(classId)), tx.get(classRef(classId))]);
    if (!ps.exists()) throw new Error('먼저 조 편성을 설정해주세요.');
    if (cs.data()?.lesson?.status === 'active') throw new Error('진행 중인 수업을 먼저 마감해주세요.');
    const plan = ps.data() as TeamPlan;
    if (!plan.nextIndex) throw new Error('학생이 한 명 이상 카드를 뽑은 뒤 수업을 시작해주세요.');
    const lesson: Lesson = { id: crypto.randomUUID(), roomId, status: 'active', planId: plan.id,
      createdAt: new Date().toISOString(), teams: lessonTeams(plan), board: [],
      members: Object.fromEntries(Object.entries(plan.assignments).map(([uid, a]) => [uid, a.teamId])), individualRanks: [] };
    tx.update(classRef(classId), { lesson });
  });
}
export function watchLessonScores(classId: string, lessonId: string, cb: (scores: Score[]) => void, error: (e: Error) => void) {
  return onSnapshot(collection(fb().db, 'classes', classId, 'lessons', lessonId, 'scores'),
    s => cb(s.docs.map(d => d.data() as Score)), error);
}
export function watchLessonPoints(classId: string, lessonId: string, cb: (scores: LessonScore[]) => void, error: (e: Error) => void) {
  return onSnapshot(collection(fb().db, 'classes', classId, 'lessons', lessonId, 'points'),
    s => cb(s.docs.map(d => d.data() as LessonScore)), error);
}
export function watchMyLessonScore(student: StudentProfile, lessonId: string, cb: (score: Score | null) => void, error: (e: Error) => void) {
  return onSnapshot(doc(fb().db, 'classes', student.classId, 'lessons', lessonId, 'scores', student.uid),
    s => cb(s.exists() ? s.data() as Score : null), error);
}
export async function saveLessonScore(student: StudentProfile, lessonId: string, teamId: string, result: RoomResult) {
  const ref = doc(fb().db, 'classes', student.classId, 'lessons', lessonId, 'scores', student.uid);
  return runTransaction(fb().db, async tx => {
    const [cs, old] = await Promise.all([tx.get(classRef(student.classId)), tx.get(ref)]);
    if (old.exists()) return;
    const lesson = cs.data()?.lesson as Lesson | undefined;
    if (!lesson || lesson.id !== lessonId || lesson.status !== 'active') throw new Error('수업이 마감되어 결과를 제출할 수 없습니다.');
    if (lesson.roomId !== result.roomId || lesson.members[student.uid] !== teamId) throw new Error('수업 또는 팀 정보가 일치하지 않습니다.');
    const score: Score = { uid: student.uid, nickname: student.nickname, lessonId, teamId,
      roomId: result.roomId, score: result.escaped ? result.score : 0, timeUsedSec: result.timeUsedSec,
      escaped: result.escaped, date: result.date };
    tx.set(ref, score);
    tx.set(doc(fb().db, 'classes', student.classId, 'lessons', lessonId, 'points', student.uid), {
      uid: score.uid, teamId: score.teamId, score: score.score, timeUsedSec: score.timeUsedSec, escaped: score.escaped,
    });
  });
}
export async function publishLessonBoard(classId: string, lesson: Lesson, scores: Score[], close = false) {
  const board = teamStandings(lesson.teams, scores);
  const ranked = scores.filter(s => s.escaped && lesson.members[s.uid] === s.teamId)
    .sort((a, b) => b.score - a.score || a.timeUsedSec - b.timeUsedSec || a.uid.localeCompare(b.uid));
  const individualRanks = ranked.map((s) => ({ uid: s.uid, nickname: s.nickname, score: s.score,
    rank: ranked.findIndex(t => t.score === s.score && t.timeUsedSec === s.timeUsedSec) + 1 }));
  await runTransaction(fb().db, async tx => {
    const cs = await tx.get(classRef(classId));
    const current = cs.data()?.lesson as Lesson | undefined;
    if (!current || current.id !== lesson.id || current.status !== 'active') return;
    const next = { ...current, board, individualRanks, status: close ? 'closed' as const : current.status };
    if (JSON.stringify(next) !== JSON.stringify(current)) tx.update(classRef(classId), { lesson: next });
    if (close) tx.set(doc(fb().db, 'classes', classId, 'lessons', lesson.id), next);
  });
}

export async function renameTeam(classId: string, teamId: string, name: string) {
  const label = name.trim().normalize('NFKC');
  if (!label || label.length > 20) throw new Error('팀 이름은 1~20자로 입력하세요.');
  const ref = planRef(classId);
  await runTransaction(fb().db, async tx => {
    const ps = await tx.get(ref), cs = await tx.get(classRef(classId));
    if (!ps.exists()) return;
    if (cs.data()?.lesson?.status === 'active') throw new Error('수업 시작 후에는 팀 이름을 바꿀 수 없습니다.');
    const plan = ps.data() as TeamPlan;
    tx.update(ref, { cards: plan.cards.map(c => c.id === teamId ? { ...c, name: label } : c) });
  });
}
