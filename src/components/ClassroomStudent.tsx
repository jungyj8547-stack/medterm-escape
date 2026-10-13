import { useEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import { ROOM_BY_ID } from '../data/loadData';
import { watchLesson, watchPlan, watchMyLessonScore, watchLessonPoints, drawTeam, type Lesson, type Score } from '../firebase/classroom';
import { teamStandings, type LessonScore, type TeamPlan } from '../engine/classroom';
import { friendlyError } from '../firebase/app';
import TeamCard from './TeamCard';
import Certificate from './Certificate';
import { ensureStudentClass } from '../firebase/student';

export default function ClassroomStudent() {
  const student = useGame(s => s.student);
  const startLesson = useGame(s => s.startLesson);
  const [plan, setPlan] = useState<TeamPlan | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [scoreLoaded, setScoreLoaded] = useState(false);
  const [points, setPoints] = useState<LessonScore[]>([]);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    if (!student) return;
    setPlan(null); setLesson(null); setError('');
    const fail = (e: Error) => setError(friendlyError(e));
    let cancelled = false;
    let a: (() => void) | undefined, b: (() => void) | undefined;
    void ensureStudentClass(student).then(() => {
      if (cancelled) return;
      a = watchPlan(student.classId, setPlan, fail); b = watchLesson(student.classId, setLesson, fail);
    }).catch(fail);
    return () => { cancelled = true; a?.(); b?.(); };
  }, [student?.classId, student?.uid]);
  useEffect(() => {
    setScore(null);
    setScoreLoaded(false);
    setPoints([]);
    if (!student || !lesson) return;
    const fail = (e: Error) => setError(friendlyError(e));
    const a = watchMyLessonScore(student, lesson.id, s => { setScore(s); setScoreLoaded(true); }, fail);
    const b = watchLessonPoints(student.classId, lesson.id, setPoints, fail);
    return () => { a(); b(); };
  }, [student?.uid, lesson?.id]);
  if (!student) return null;
  const teamId = plan?.assignments[student.uid]?.teamId;
  const card = plan?.cards.find(c => c.id === teamId);
  const enrolled = !!lesson?.members[student.uid];
  const board = lesson ? lesson.status === 'closed' ? lesson.board : teamStandings(lesson.teams, points) : [];
  const standing = board.find(t => t.teamId === teamId);
  const finalRank = lesson?.individualRanks.find(r => r.uid === student.uid)?.rank;
  const liveRank = score?.escaped ? 1 + points.filter(p => p.escaped && (p.score > score.score || (p.score === score.score && p.timeUsedSec < score.timeUsedSec))).length : null;
  const rank = lesson?.status === 'closed' ? finalRank : liveRank;
  const teamIndex = board.findIndex(t => t.teamId === teamId);
  const room = lesson ? ROOM_BY_ID[lesson.roomId] : null;
  return <div className="panel stack" style={{ marginBottom: 20 }}>
    <h3>🏫 {student.className} · 우리 반 수업</h3>
    {error && <div className="feedback bad">{error}</div>}
    {!plan && !error && <p className="muted">교수자가 카드 뽑기를 준비하면 이곳에 표시됩니다.</p>}
    {plan && !card && <>
      <p>카드 한 장을 뽑아 우리 반의 팀을 정해보세요. 한 번 배정된 팀은 다시 로그인해도 유지됩니다.</p>
      <TeamCard hidden />
      <button className="btn primary" disabled={drawing || lesson?.status === 'active'} onClick={async () => {
        setDrawing(true); setError('');
        try { await drawTeam(student); } catch (e) { setError(friendlyError(e)); } finally { setDrawing(false); }
      }}>{drawing ? '카드를 뽑고 있어요…' : '나의 팀 카드 뽑기'}</button>
      {lesson?.status === 'active' && <p className="muted">수업이 시작되어 카드 뽑기가 마감되었습니다. 교수자에게 알려주세요.</p>}
    </>}
    {card && <><TeamCard card={card} /><p className="center">친구들과 <strong>{card.name}</strong>으로 활동합니다.</p></>}
    {card && !lesson && <p className="muted">팀 배정 완료! 교수자가 수업 병동을 지정할 때까지 기다려주세요.</p>}
    {lesson && <>
      <b>{room?.floor} {room?.name} · {lesson.status === 'closed' ? '수업 마감' : '수업 진행 중'}</b>
      <p className="small muted">이번 수업은 이 병동 하나를 탈출하면 끝납니다. 개인 복습 기록과 수업 점수는 별도로 관리됩니다.</p>
      {enrolled && !score && lesson.status === 'active' && <button className="btn ok" disabled={!scoreLoaded} onClick={() => startLesson(lesson.roomId, { id: lesson.id, classId: student.classId, teamId: lesson.members[student.uid], teamName: card?.name ?? '우리 팀' })}>{scoreLoaded ? '지정 병동 수업 참여' : '이번 수업 참여 기록 확인 중…'}</button>}
      {!enrolled && <p className="muted">이번 수업 시작 전에 팀 배정을 받지 않아 참여 명단에 없습니다. 교수자에게 문의하세요.</p>}
      {score && <div className="row" style={{ flexWrap: 'wrap' }}><span className="tag">내 점수 {score.score}점</span><span className="tag">개인 {rank ? `${rank}위` : '미탈출'}</span><span className="tag">우리 팀 {teamIndex >= 0 ? `${teamIndex + 1}위` : '집계 중'}</span></div>}
      {standing && <p>팀 평균 <b>{standing.average.toFixed(1)}점</b> · 총점 {standing.total}점 · {standing.completed}/{standing.members}명 완료</p>}
      {lesson.status === 'active' && <p className="small muted">진행 중 순위는 바뀔 수 있습니다. 교수자가 수업을 마감하면 최종 순위와 인증서가 확정됩니다.</p>}
      {lesson.status === 'closed' && score?.escaped && <Certificate student={student} lesson={lesson} score={score} />}
    </>}
  </div>;
}
