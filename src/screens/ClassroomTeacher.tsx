import { useEffect, useMemo, useState } from 'react';
import type { ClassInfo, StudentRow } from '../firebase/teacher';
import { configureTeams, saveClassRoom, watchSavedRoom, participationTeams, publishLessonBoard, renameTeam, startClassLesson, watchLesson, watchLessonScores, watchPlan, type Lesson, type Score } from '../firebase/classroom';
import { teamStandings, type TeamPlan } from '../engine/classroom';
import { ROOMS, ROOM_BY_ID } from '../data/loadData';
import { friendlyError } from '../firebase/app';
import { askConfirm } from '../components/ConfirmDialog';
import TeamCard from '../components/TeamCard';

export default function ClassroomTeacher({ classes, students }: { classes: ClassInfo[]; students: StudentRow[] }) {
  const [classId, setClassId] = useState('');
  const [plan, setPlan] = useState<TeamPlan | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [total, setTotal] = useState(30);
  const [count, setCount] = useState(6);
  const [roomId, setRoomId] = useState('r1');
  const [savedRoomId, setSavedRoomId] = useState('');
  useEffect(() => { setRoomId(savedRoomId || 'r1'); }, [classId, savedRoomId]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (plan) { setTotal(plan.totalStudents); setCount(plan.teamCount); } }, [plan?.id, plan?.totalStudents, plan?.teamCount]);
  useEffect(() => { if (!classId && classes.length) setClassId(classes[0].id); }, [classes, classId]);
  useEffect(() => {
    setPlan(null); setLesson(null); setScores([]); setError(''); setSavedRoomId('');
    if (!classId) return;
    const fail = (e: Error) => setError(friendlyError(e));
    const a = watchPlan(classId, setPlan, fail), b = watchLesson(classId, setLesson, fail);
    const c = watchSavedRoom(classId, setSavedRoomId, fail);
    return () => { a(); b(); c(); };
  }, [classId]);
  useEffect(() => {
    setScores([]);
    if (!classId || !lesson) return;
    return watchLessonScores(classId, lesson.id, setScores, e => setError(friendlyError(e)));
  }, [classId, lesson?.id]);
  const scoreKey = JSON.stringify(scores);
  useEffect(() => {
    if (!lesson || lesson.status !== 'active') return;
    // 학생 합류·점수마다 반 문서를 바로 쓰면 학생 카드 뽑기와 충돌하므로 1.5초 모아서 한 번만 갱신한다 (2026-10-14 부하 점검)
    const timer = window.setTimeout(() => {
      void publishLessonBoard(classId, lesson, scores).catch(e => {
        // 학생 합류·제출과 겹쳐 생기는 충돌(aborted, failed-precondition 등)은 다음 변경 때 다시 갱신되므로 조용히 넘긴다 (2026-10-20)
        if (['aborted', 'failed-precondition', 'unavailable', 'deadline-exceeded'].includes((e as { code?: string })?.code ?? '')) return;
        setError(friendlyError(e));
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [classId, lesson?.id, lesson?.status, scoreKey, JSON.stringify(lesson?.members)]);
  const standings = useMemo(() => lesson ? teamStandings(participationTeams(lesson), scores) : [], [lesson, scores]);
  const sortedScores = [...scores].sort((a, b) => b.score - a.score || a.timeUsedSec - b.timeUsedSec);
  const roster = students.filter(s => s.classId === classId);
  const action = async (fn: () => Promise<unknown>) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } };
  return <div className="stack">
    <div className="panel"><h3>반별 수업과 팀 카드</h3>
      <label className="field">수업할 반<select className="input" value={classId} onChange={e => setClassId(e.target.value)}><option value="">반 선택</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <p className="small muted">한 교수자 계정을 공유해도 각 반의 조 편성·병동·점수는 따로 관리됩니다.</p>
      {error && <div className="feedback bad">{error}</div>}
    </div>
    {classId && <>
      <div className="panel stack"><h3>1. 카드 뽑기 준비</h3><p className="small muted">카드를 준비한 뒤 학생이 가입·로그인하여 ‘나의 팀 카드 뽑기’를 눌러야 배정됩니다. 기본 동물 이름과 그림은 20종이며, 학생들과 정한 팀명으로 바꿀 수 있습니다.</p>
        {plan ? <p>총 {plan.totalStudents}명 · {plan.teamCount}개 조 · {plan.nextIndex}명 배정 완료. 같은 카드를 뽑으면 같은 팀입니다.</p> : <p>학생이 가입한 뒤 처음 한 번 팀 카드를 뽑습니다. 조별 정원 차이는 최대 1명입니다.</p>}
        <div className="row" style={{ flexWrap: 'wrap' }}><label>총인원<input className="input" type="number" min="1" max="200" disabled={busy || !!plan?.nextIndex || lesson?.status === 'active'} value={total} onChange={e => setTotal(Number(e.target.value))} /></label><label>조 개수<input className="input" type="number" min="1" max="20" disabled={busy || !!plan?.nextIndex} value={count} onChange={e => setCount(Number(e.target.value))} /></label><button className="btn primary" disabled={busy || !!plan?.nextIndex} onClick={() => action(() => configureTeams(classId, total, count))}>{plan ? '팀 편성 저장 (배정 전)' : '팀 편성 저장'}</button></div>
        {plan && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>{plan.cards.map(card => {
          const memberUids = Object.entries(plan.assignments).filter(([, a]) => a.teamId === card.id).map(([uid]) => uid);
          return <div key={card.id}><TeamCard card={card} /><p className="center small">{memberUids.length}/{card.capacity}명 배정</p><ul>{memberUids.map(uid => { const s = roster.find(s => (s.memberId ?? s.uid) === uid); return <li key={uid}>{s ? `${s.nickname} (${s.studentId})` : '학생 정보 불러오는 중'}</li>; })}</ul><TeamName name={card.name} disabled={busy || lesson?.status === 'active'} save={name => action(() => renameTeam(classId, card.id, name))} /></div>;
        })}</div>}
        {plan && plan.nextIndex > 0 && <p className="small muted">배정된 팀은 유지됩니다. 학생들과 정한 별도 팀명이 있으면 수업 시작 전에 이름을 바꿀 수 있습니다.</p>}
      </div>
      <div className="panel stack"><h3>2. 수업 병동 저장·시작</h3><p className="small muted">병동 저장은 예정 병동만 바꿉니다. 진행 중인 수업은 그대로 유지됩니다. 저장 후 새 수업을 시작하세요.</p>
        <select className="input" value={roomId} onChange={e => setRoomId(e.target.value)}>{ROOMS.map(r => <option key={r.id} value={r.id}>{r.floor} {r.name}</option>)}</select><div className="row"><button className="btn primary" disabled={busy || roomId === savedRoomId} onClick={() => action(() => saveClassRoom(classId, roomId))}>병동 저장</button><span className="small muted">{savedRoomId ? '저장된 병동: ' + ROOM_BY_ID[savedRoomId]?.name : '병동을 선택하고 저장하세요.'}</span></div>
        <p className="small muted">개인 1층 완료 여부와 관계없이 지정 병동에 참여합니다. 이 병동을 끝내면 수업이 종료되며 다음 층으로 넘어가지 않습니다.</p>
        <button className="btn ok" disabled={busy || !plan || !savedRoomId || roomId !== savedRoomId || lesson?.status === 'active'} onClick={async () => {
          if (await askConfirm(`저장한 병동으로 수업을 시작할까요? 기존 팀은 유지되고, 늦게 오는 학생도 마감 전 카드 뽑기로 합류할 수 있습니다.`, { okLabel: '수업 시작' })) await action(() => startClassLesson(classId, roomId));
        }}>{lesson?.status === 'active' ? '수업 진행 중 · 먼저 마감하세요' : !plan ? '먼저 팀 카드를 준비하세요' : !savedRoomId || roomId !== savedRoomId ? '병동 저장 후 시작' : '새 수업 시작'}</button>{plan && !plan.nextIndex && <p className="small muted">현재 배정된 학생은 0명입니다. 수업을 미리 시작해둘 수 있으며 학생이 반 코드로 가입·로그인하여 카드를 뽑으면 합류합니다.</p>}
        {lesson && <><b>{ROOM_BY_ID[lesson.roomId]?.name} · {lesson.status === 'active' ? '진행 중' : '마감됨'}</b><p>{Object.keys(lesson.members).length}명 참여 · {scores.filter(s => s.escaped).length}명 탈출 완료</p>{lesson.status === 'active' && <button className="btn" disabled={busy} onClick={async () => { if (await askConfirm('수업을 마감하고 순위와 인증서를 확정할까요? 합류한 팀원을 기준으로 미완료 학생은 0점으로 계산하고 최종 명단과 순위를 확정합니다.', { okLabel: '수업 마감' })) await action(() => publishLessonBoard(classId, lesson, scores, true)); }}>수업 마감 · 인증서 확정</button>}</>}
      </div>
      {lesson && <div className="panel"><h3>3. 팀 순위와 팀원 점수</h3><p className="small muted">이번 수업의 평균 점수 순입니다. 마감 전에는 늦게 오는 학생도 합류할 수 있으며, 미완료 팀원은 0점입니다. 마감 시 최종 명단이 확정됩니다.</p><div className="table-wrap"><table className="board"><thead><tr><th>순위</th><th>팀</th><th>평균</th><th>총점</th><th>완료</th><th>팀원 · 개인 점수</th></tr></thead><tbody>{standings.map((t, i) => <tr key={t.teamId}><td>{i + 1}</td><td><b>{t.name}</b></td><td>{t.average.toFixed(1)}</td><td>{t.total}</td><td>{t.completed}/{t.members}</td><td>{participationTeams(lesson).find(team => team.id === t.teamId)?.memberUids.map(uid => { const s = roster.find(s => (s.memberId ?? s.uid) === uid), result = scores.find(r => r.uid === uid); return <div key={uid}>{s?.nickname ?? '학생'} ({s?.studentId ?? '-'}) · {result ? `${result.score}점 · ${result.escaped ? '완료' : '미탈출'}` : '미완료 · 0점'}</div>; })}</td></tr>)}</tbody></table></div>
        <h3>개인 순위와 점수</h3><div className="table-wrap"><table className="board"><thead><tr><th>순위</th><th>학생</th><th>학번</th><th>팀</th><th>점수</th><th>상태</th></tr></thead><tbody>{sortedScores.map((r) => <tr key={r.uid}><td>{r.escaped ? 1 + sortedScores.filter(s => s.escaped && (s.score > r.score || (s.score === r.score && s.timeUsedSec < r.timeUsedSec))).length : '-'}</td><td>{roster.find(s => (s.memberId ?? s.uid) === r.uid)?.nickname ?? r.nickname}</td><td>{roster.find(s => (s.memberId ?? s.uid) === r.uid)?.studentId ?? '-'}</td><td>{lesson.teams.find(t => t.id === r.teamId)?.name}</td><td>{r.score}</td><td>{r.escaped ? '탈출 완료' : '미탈출'}</td></tr>)}{Object.keys(lesson.members).filter(uid => !scores.some(s => s.uid === uid)).map(uid => <tr key={uid}><td>-</td><td>{roster.find(s => (s.memberId ?? s.uid) === uid)?.nickname ?? '학생'}</td><td>{roster.find(s => (s.memberId ?? s.uid) === uid)?.studentId ?? '-'}</td><td>{lesson.teams.find(t => t.id === lesson.members[uid])?.name}</td><td>0</td><td>미완료</td></tr>)}</tbody></table></div>
      </div>}
    </>}
  </div>;
}

function TeamName({ name, disabled, save }: { name: string; disabled: boolean; save: (name: string) => Promise<void> }) {
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  return <div className="row"><input className="input" value={value} maxLength={20} disabled={disabled} onChange={e => setValue(e.target.value)} aria-label="팀 이름" /><button className="btn small" disabled={disabled || !value.trim() || value === name} onClick={() => void save(value)}>변경</button></div>;
}



