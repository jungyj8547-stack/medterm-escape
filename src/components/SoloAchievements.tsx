import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/gameStore';
import { ROOMS, ALL_TERMS } from '../data/loadData';
import { completionFor, completionStandings, type CompletionEntry } from '../engine/completion';
import { publishCompletion, watchCompletions } from '../firebase/completion';
import { ensureStudentClass, loadProgress, studentMemberId } from '../firebase/student';
import { friendlyError } from '../firebase/app';
import { formatTime } from '../engine/scoring';
import { CertificateConfetti, Mascot } from './Certificate';
import './Certificate.css';

export default function SoloAchievements() {
  const student = useGame(s => s.student), best = useGame(s => s.bestResults), mode = useGame(s => s.mode);
  const completed = completionFor(ROOMS.map(r => r.id), best);
  const count = ROOMS.filter(r => best[r.id]?.escaped).length;
  const [entries, setEntries] = useState<CompletionEntry[]>([]), [error, setError] = useState('');
  const [open, setOpen] = useState(false), [showRank, setShowRank] = useState(false), [name, setName] = useState('학습자');
  useEffect(() => {
    setEntries([]); setError('');
    if (!student) return;
    let stop: (() => void) | undefined, cancelled = false;
    void ensureStudentClass(student).then(async () => {
      if (cancelled) return;
      stop = watchCompletions(student.classId, setEntries, e => setError(friendlyError(e)));
      const saved = await loadProgress(student.studentId);
      if (saved && !cancelled) await publishCompletion(student, saved);
    }).catch(e => { if (!cancelled) setError(friendlyError(e)); });
    return () => { cancelled = true; stop?.(); };
  }, [student?.uid, student?.classId]);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', close); };
  }, [open]);
  const standings = useMemo(() => completionStandings(entries), [entries]);
  const me = student ? standings.find(e => e.memberId === studentMemberId(student)) : undefined;
  if (!student && mode === 'team') return null;
  return <section className="panel stack" style={{ marginBottom: 20, textAlign: 'left' }} aria-label="개인 완주와 랭킹">
    <h3>🏅 개인 완주 · 우리 반 랭킹</h3>
    <p>개인 복습 {count}/{ROOMS.length}개 병동 완료 · 수업 마감 없이 완주 인증서를 받을 수 있어요.</p>
    <p className="small muted">8개 병동의 최고 점수 합계로 완주자끼리 비교합니다. 같은 총점은 합계 사용 시간이 짧은 사람 우선이며, 둘 다 같으면 공동 순위입니다. 반별 수업 점수와는 별도입니다.</p>
    {student ? <p><b>{student.className}</b> · {me ? `내 완주 순위 ${me.rank}위 · ${me.totalScore.toLocaleString()}점` : completed ? '완주 순위를 동기화하고 있어요.' : '완주하면 우리 반 랭킹에 참여합니다.'}</p> : <p className="small muted">로그인 없이도 완주 인증서를 저장할 수 있습니다. 반 랭킹은 학생 계정으로 로그인한 경우에만 참여합니다.</p>}
    {error && <div className="feedback bad">랭킹 연결 확인: {error}<button className="btn small" onClick={async () => { if (!student) return; try { const saved = await loadProgress(student.studentId); if (saved) await publishCompletion(student, saved); setError(''); } catch (e) { setError(friendlyError(e)); } }}>다시 확인</button></div>}
    {completed && !student && <label className="field">인증서에 넣을 이름<input className="input" maxLength={20} value={name} onChange={e => setName(e.target.value)} /></label>}
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {completed && <button className="btn primary" disabled={!student && !name.trim()} onClick={() => setOpen(true)}>🎉 내 완주 인증서 보기</button>}
      {student && <button className="btn" onClick={() => setShowRank(!showRank)}>{showRank ? '랭킹 접기' : '🏆 우리 반 개인 랭킹 보기'}</button>}
    </div>
    {showRank && student && <div className="table-wrap"><table className="board"><thead><tr><th>순위</th><th>별명</th><th>완주 총점</th><th>합계 시간</th></tr></thead><tbody>{standings.map(e => <tr key={e.memberId} className={e.memberId === studentMemberId(student) ? 'top' : ''}><td>{e.rank}위</td><td>{e.nickname}{e.memberId === studentMemberId(student) ? ' (나)' : ''}</td><td>{e.totalScore.toLocaleString()}</td><td>{formatTime(e.totalTimeSec)}</td></tr>)}{!standings.length && <tr><td colSpan={4}>아직 완주자가 없습니다. 첫 완주에 도전해보세요!</td></tr>}</tbody></table></div>}
    {open && completed && createPortal(<div className="certificate-backdrop" onClick={() => setOpen(false)}><div className="modal certificate-modal" role="dialog" aria-modal="true" aria-label="개인 완주 인증서" onClick={e => e.stopPropagation()}><div className="modal-head"><h3>8개 병동 완주를 축하해요!</h3><button autoFocus className="close" aria-label="인증서 닫기" onClick={() => setOpen(false)}>×</button></div><div className="modal-body"><article className="learning-certificate cert-personal"><CertificateConfetti /><div className="cert-content"><div className="cert-brand">CODE BLUE · 의학용어 완주</div><p className="cert-eyebrow">차근차근 쌓은 노력, 멋진 완주를 축하해요!</p><h2 className="cert-headline">우와, 옥상까지 완주!</h2><p className="cert-subtitle">의학용어 개인 완주 인증서</p><div className="cert-badge">★</div><h3 className="cert-recipient">{student?.nickname ?? name.trim()}</h3><p className="cert-ward">{student?.className ?? '개인 학습'} · {ROOMS.length}개 병동 · {ALL_TERMS.length}개 의학용어</p><div className="cert-metrics"><div className="cert-metric"><span>완주 총점</span><strong>{completed.totalScore.toLocaleString()}점</strong></div><div className="cert-metric"><span>통과 병동</span><strong>{completed.roomCount}/{ROOMS.length}</strong></div><div className="cert-metric"><span>우리 반 순위</span><strong>{me ? `${me.rank}위` : '완주'}</strong></div></div><p className="cert-message">첫 병동부터 옥상 헬기장까지 이어온 도전!<br />당신의 배움과 성장을 기쁘게 축하합니다.</p><p className="cert-date">기록 기준일 {new Date(completed.completedAt).toLocaleDateString('ko-KR')}</p><p className="cert-note">개인 복습의 병동별 최고 기록 기준입니다. 순위는 다른 학생의 기록에 따라 바뀔 수 있습니다.</p></div><div className="cert-mascot"><Mascot animal="rabbit" /></div><div className="cert-stamp">★<br />YOU DID IT!<br />8병동 완주</div></article><div className="certificate-actions"><button className="btn primary" onClick={() => window.print()}>인쇄 / PDF로 저장</button><span>인쇄 설정에서 배경 그래픽을 켜면 색상이 함께 출력됩니다.</span></div></div></div></div>, document.body)}
  </section>;
}
