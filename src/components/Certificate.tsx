import { useState } from 'react';
import type { StudentProfile } from '../firebase/student';
import type { Lesson, Score } from '../firebase/classroom';
import { ROOM_BY_ID } from '../data/loadData';

export default function Certificate({ student, lesson, score }: { student: StudentProfile; lesson: Lesson; score: Score }) {
  const [kind, setKind] = useState<'personal' | 'team' | null>(null);
  const me = lesson.individualRanks.find(r => r.uid === student.uid);
  const teamIndex = lesson.board.findIndex(t => t.teamId === score.teamId);
  const team = lesson.board[teamIndex];
  const rank = kind === 'team' ? teamIndex + 1 : me?.rank;
  const title = rank && rank <= 3 ? `${kind === 'team' ? '팀' : '개인'} 수업 우수상` : `${kind === 'team' ? '팀 활동' : '병동 탈출'} 인증서`;
  return <>
    <div className="row"><button className="btn" onClick={() => setKind('personal')}>내 개인 인증서 보기</button>{team && <button className="btn" onClick={() => setKind('team')}>우리 팀 인증서 보기</button>}</div>
    {kind && <div className="modal-backdrop certificate-backdrop" role="presentation"><div className="modal" role="dialog" aria-label="학습 인증서">
      <div className="modal-head"><h3>나의 인증서</h3><button className="close" onClick={() => setKind(null)}>×</button></div>
      <div className="modal-body"><article className="learning-certificate" style={{ border: '3px solid var(--accent)', padding: 30, textAlign: 'center', background: 'white', color: '#183442' }}>
        <p>코드 블루 · 의학용어 학습</p><h2>{title}</h2><h3>{kind === 'team' ? team?.name : student.nickname}</h3>
        <p>{student.className} · {ROOM_BY_ID[lesson.roomId]?.name}</p>
        <p>{rank ? `${rank}위 · ` : ''}{kind === 'team' ? `평균 ${team.average.toFixed(1)}점 · ${team.completed}/${team.members}명 완료` : `${score.score}점 · 병동 탈출 완료`}</p>
        <p>{new Date(lesson.createdAt).toLocaleDateString('ko-KR')}</p><p className="small">수업 학습 활동의 성취를 기념하는 인증서입니다.</p>
      </article><button className="btn primary" onClick={() => window.print()}>인쇄 / PDF로 저장</button></div>
    </div></div>}
  </>;
}
