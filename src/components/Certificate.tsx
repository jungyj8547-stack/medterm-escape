import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { studentMemberId, type StudentProfile } from '../firebase/student';
import type { Lesson, Score } from '../firebase/classroom';
import { ROOM_BY_ID } from '../data/loadData';
import './Certificate.css';

export default function Certificate({ student, lesson, score }: { student: StudentProfile; lesson: Lesson; score: Score }) {
  const [kind, setKind] = useState<'personal' | 'team' | null>(null);
  const me = lesson.individualRanks.find(r => r.uid === studentMemberId(student));
  const teamIndex = lesson.board.findIndex(t => t.teamId === score.teamId);
  const team = lesson.board[teamIndex];
  const rank = kind === 'team' ? teamIndex + 1 : me?.rank;
  const title = rank && rank <= 3 ? `${kind === 'team' ? '팀' : '개인'} 수업 우수상` : `${kind === 'team' ? '팀 활동' : '병동 탈출'} 인증서`;
  const isTeam = kind === 'team';
  const honors = !!rank && rank <= 3;
  const date = new Date(lesson.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  useEffect(() => {
    if (!kind) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setKind(null); };
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', close); };
  }, [kind]);
  return <>
    <div className="row"><button className="btn" onClick={() => setKind('personal')}>내 개인 인증서 보기</button>{team && <button className="btn" onClick={() => setKind('team')}>우리 팀 인증서 보기</button>}</div>
    {kind && createPortal(<div className="certificate-backdrop" onClick={() => setKind(null)}><div className="modal certificate-modal" role="dialog" aria-modal="true" aria-label={isTeam ? '우리 팀 인증서' : '내 개인 인증서'} onClick={e => e.stopPropagation()}>
      <div className="modal-head"><h3>{isTeam ? '함께 이룬 성취를 축하해요!' : '오늘의 멋진 도전을 축하해요!'}</h3><button autoFocus className="close" aria-label="인증서 닫기" onClick={() => setKind(null)}>×</button></div>
      <div className="modal-body"><article className={`learning-certificate cert-${isTeam ? 'team' : 'personal'}`}>
        {!isTeam && <Confetti />}
        <div className="cert-content">
          <div className="cert-brand">CODE BLUE · {isTeam ? '오늘의 빛나는 성취' : '의학용어 학습'}</div>
          <p className="cert-eyebrow">{isTeam ? '짝짝짝! 우리 팀을 위한 박수' : '한 걸음 더 성장한 오늘, 축하해요!'}</p>
          {isTeam && <div className="cert-ribbon" aria-hidden="true"><div className="cert-medal">★</div></div>}
          <h2 className="cert-headline">{isTeam ? title : '우와, 탈출 성공!'}</h2>
          <p className="cert-subtitle">{isTeam ? '함께 풀고, 함께 성장했어요' : title}</p>
          {!isTeam && <div className="cert-badge" aria-hidden="true">{honors ? rank : '★'}</div>}
          <h3 className="cert-recipient">{isTeam ? team?.name : student.nickname}</h3>
          <p className="cert-ward">{student.className} · {ROOM_BY_ID[lesson.roomId]?.name}</p>
          <div className="cert-metrics">
            <div className="cert-metric"><span>{isTeam ? '팀 순위' : '나의 순위'}</span><strong>{rank ? `${rank}위` : '완료'}</strong></div>
            <div className="cert-metric"><span>{isTeam ? '팀 평균' : '획득 점수'}</span><strong>{isTeam ? team.average.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : score.score.toLocaleString('ko-KR')}점</strong></div>
            <div className="cert-metric"><span>{isTeam ? '완료 인원' : '오늘의 성취'}</span><strong>{isTeam ? `${team.completed} / ${team.members}명` : '탈출 완료'}</strong></div>
          </div>
          <p className="cert-message">{isTeam ? <>각자의 노력으로 만든 우리 팀의 빛나는 결과!<br />오늘의 배움과 도전을 기쁘게 축하합니다.</> : <>낯선 의학용어를 차근차근 풀어낸 당신에게<br />반짝이는 박수와 응원을 보냅니다.</>}</p>
          <p className="cert-date">{date}</p><p className="cert-note">수업 학습 활동의 성취를 기념하는 인증서입니다.</p>
        </div>
        <div className="cert-mascot" aria-hidden="true"><Mascot animal={team?.animal ?? 'rabbit'} /></div>
        <div className="cert-stamp" aria-hidden="true">★<br />{isTeam ? 'TEAM AWARD' : 'YOU DID IT!'}<br />{isTeam ? '함께 이룬 성취' : '멋지게 해냈어요'}</div>
      </article><div className="certificate-actions"><button className="btn primary" onClick={() => window.print()}>인쇄 / PDF로 저장</button><span>인쇄 설정에서 배경 그래픽을 켜면 색상이 함께 출력됩니다.</span></div></div>
    </div></div>, document.body)}
  </>;
}

function Confetti() {
  return <svg className="cert-confetti" viewBox="0 0 850 600" aria-hidden="true"><g fill="#f2adab"><rect x="50" y="45" width="9" height="19" rx="3" transform="rotate(-20 50 45)" /><rect x="730" y="70" width="9" height="22" rx="3" transform="rotate(25 730 70)" /><circle cx="80" cy="160" r="5" /><circle cx="790" cy="230" r="5" /></g><g fill="#a9cbbf"><rect x="130" y="85" width="8" height="18" rx="3" transform="rotate(25 130 85)" /><rect x="770" y="140" width="8" height="18" rx="3" transform="rotate(-25 770 140)" /><circle cx="190" cy="45" r="5" /></g><g fill="#e8c55d"><path d="m90 60 3 9 10 0-8 6 3 9-8-6-8 6 3-9-8-6h10z" /><path d="m780 45 3 9 10 0-8 6 3 9-8-6-8 6 3-9-8-6h10z" /><rect x="700" y="190" width="7" height="18" rx="3" transform="rotate(35 700 190)" /></g><g fill="#b4c5ec"><circle cx="720" cy="40" r="4" /><rect x="60" y="245" width="8" height="18" rx="3" transform="rotate(35 60 245)" /></g></svg>;
}

function Mascot({ animal }: { animal: string }) {
  const rabbit = animal === 'rabbit', bird = animal === 'penguin' || animal === 'chick';
  const color = rabbit ? '#f6cfda' : animal === 'cat' || animal === 'chick' ? '#f2cf8f' : animal === 'fox' ? '#eab18c' : animal === 'penguin' ? '#8ca9ba' : '#c6b3a2';
  return <svg viewBox="0 0 110 130"><ellipse cx="55" cy="120" rx="38" ry="6" fill="#233a4a" opacity=".08" />
    {rabbit ? <><ellipse cx="38" cy="34" rx="12" ry="29" fill={color} transform="rotate(-12 38 34)" /><ellipse cx="74" cy="34" rx="12" ry="29" fill={color} transform="rotate(12 74 34)" /><ellipse cx="38" cy="32" rx="6" ry="21" fill="#ebacc0" transform="rotate(-12 38 32)" /><ellipse cx="74" cy="32" rx="6" ry="21" fill="#ebacc0" transform="rotate(12 74 32)" /></> : !bird && <><path d="M25 75 22 47 45 63M66 63 90 47 85 78" fill={color} /><circle cx="29" cy="65" r="11" fill={color} /><circle cx="81" cy="65" r="11" fill={color} /></>}
    <ellipse cx="55" cy="91" rx="34" ry="29" fill={color} />{animal === 'penguin' && <ellipse cx="55" cy="93" rx="24" ry="23" fill="#fffaf0" />}
    <circle cx="45" cy="81" r="3.5" fill="#526b73" /><circle cx="66" cy="81" r="3.5" fill="#526b73" /><ellipse cx="34" cy="91" rx="6" ry="4" fill="#ecafc0" /><ellipse cx="77" cy="91" rx="6" ry="4" fill="#ecafc0" />
    {bird ? <path d="m50 90 6 7 6-7z" fill="#e6b24c" /> : <path d="m51 91 5 4 5-4M48 99q8 8 16 0" stroke="#526b73" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
    <path d="m84 75 7 4-3 8-6-2z" fill="#e6c15c" /><path d="m89 69 10-8M94 76l12-1M90 84l9 8" stroke="#e6c15c" strokeWidth="3" strokeLinecap="round" /></svg>;
}
