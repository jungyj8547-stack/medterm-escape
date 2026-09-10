import { useEffect } from 'react';
import { useGame } from '../store/gameStore';
import { ROOMS } from '../data/loadData';
import { formatTime } from '../engine/scoring';
import { music } from '../audio/music';
import Avatar from '../components/Avatar';
import Confetti from '../components/Confetti';

/** 옥상 헬기장 — 최종 탈출 엔딩 */
export default function Ending() {
  const goto = useGame((s) => s.goto);
  const best = useGame((s) => s.bestResults);
  const mode = useGame((s) => s.mode);
  const team = useGame((s) => s.team);

  const cleared = ROOMS.filter((r) => best[r.id]?.escaped);
  const total = cleared.reduce((a, r) => a + best[r.id].score, 0);
  const stars = cleared.reduce((a, r) => a + best[r.id].stars, 0);
  const allCleared = cleared.length === ROOMS.length;

  useEffect(() => {
    const t = window.setTimeout(() => music.fanfare(), 100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="screen ending">
      <Confetti count={90} />
      <div className="container narrow">
        <div className="ending-sky">
          <svg className="heli" viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g stroke="#1b2a41" strokeWidth="4" strokeLinejoin="round">
              <rect className="rotor" x="30" y="14" width="200" height="8" rx="4" fill="#9aa8bb" />
              <rect x="126" y="20" width="10" height="16" fill="#5b6b82" />
              <rect x="60" y="36" width="130" height="56" rx="22" fill="#ff4b4b" />
              <rect x="150" y="46" width="34" height="30" rx="8" fill="#dff4ff" />
              <rect x="10" y="52" width="60" height="12" rx="6" fill="#ff4b4b" />
              <rect x="4" y="40" width="10" height="34" rx="4" fill="#9aa8bb" />
              <line x1="80" y1="92" x2="80" y2="106" />
              <line x1="170" y1="92" x2="170" y2="106" />
              <rect x="60" y="104" width="130" height="8" rx="4" fill="#1b2a41" />
              <path d="M104 52 h30 M100 66 h34" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
          <div className="ending-avatars">
            <Avatar size={80} pose="cheer" />
            <Avatar size={90} pose="cheer" shirt="#ec4899" skin="#f9c9a3" />
            <Avatar size={80} pose="cheer" shirt="#22c55e" skin="#c68642" />
          </div>
        </div>

        <div className="panel center">
          <div className="small muted">RTF 옥상 헬기장</div>
          <h2 style={{ fontSize: 40, margin: '6px 0' }}>🚁 봉쇄 병원 탈출 성공!</h2>
          <p className="brief" style={{ fontSize: 17 }}>
            {allCleared
              ? '8개 병동, 200개의 의학용어를 모두 통과했다. 헬기의 바람이 얼굴을 때린다. 당신은 자유다!'
              : `${cleared.length}개 병동을 통과한 상태로 헬기장에 올라왔다. (교수자 모드) 남은 병동 ${ROOMS.length - cleared.length}개도 정복해 보자.`}
          </p>
          {mode === 'team' && team && <div className="tag accent" style={{ marginTop: 8 }}>👥 {team.name}</div>}

          <div className="breakdown" style={{ marginTop: 18 }}>
            <div><b>{total.toLocaleString()}</b><span>총점</span></div>
            <div><b>{stars} / {ROOMS.length * 3}</b><span>별 합계</span></div>
            <div><b>{cleared.length} / {ROOMS.length}</b><span>통과한 병동</span></div>
          </div>

          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="board">
              <thead>
                <tr><th>층</th><th>병동</th><th>점수</th><th>시간</th><th>별</th></tr>
              </thead>
              <tbody>
                {ROOMS.map((r) => {
                  const b = best[r.id];
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.floor}</td>
                      <td>{r.name}</td>
                      <td className="mono">{b?.escaped ? b.score : '—'}</td>
                      <td className="mono">{b?.escaped ? formatTime(b.timeUsedSec) : '—'}</td>
                      <td style={{ color: 'var(--warn-dark)' }}>{b?.escaped ? '★'.repeat(b.stars) : <span className="muted">미통과</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="btn" onClick={() => goto('lobby')}>🏥 안내도로</button>
            <button className="btn primary" onClick={() => goto('title')}>🏠 타이틀로</button>
          </div>
        </div>
      </div>
    </div>
  );
}
