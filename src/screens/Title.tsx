import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { ROOMS, ALL_TERMS } from '../data/loadData';
import { sfx } from '../audio/sfx';
import Avatar from '../components/Avatar';
import SoundControl from '../components/SoundControl';

export default function Title() {
  const setMode = useGame((s) => s.setMode);
  const goto = useGame((s) => s.goto);
  const session = useGame((s) => s.session);
  const team = useGame((s) => s.team);
  const [teamForm, setTeamForm] = useState(false);
  const [name, setName] = useState(team?.name ?? '');
  const [members, setMembers] = useState(team?.members ?? 4);

  const startSolo = () => {
    sfx.click();
    setMode('solo');
    goto('lobby');
  };
  const startTeam = () => {
    if (!name.trim()) return;
    sfx.click();
    setMode('team', { name: name.trim(), members });
    goto('lobby');
  };

  return (
    <div className="screen">
      <div className="container narrow">
        <div className="title-hero">
          <div className="code">🚨 CODE BLUE · LOCKDOWN 🚨</div>
          <h1>코드 블루<br /><span>봉쇄 병원 탈출</span></h1>
          <p>의학용어 {ALL_TERMS.length}개 · 병동 {ROOMS.length}개 · 옥상 헬기장까지 탈출하라!</p>
          <div className="title-avatars">
            <Avatar size={90} pose="think" shirt="#2f6fed" />
            <Avatar size={100} pose="cheer" shirt="#ec4899" skin="#f9c9a3" />
            <Avatar size={90} pose="idle" shirt="#22c55e" skin="#c68642" />
          </div>
        </div>

        {session && (
          <div className="panel row between" style={{ marginBottom: 16 }}>
            <div>
              <b>진행 중인 병동이 있습니다</b>
              <div className="small muted">{ROOMS.find((r) => r.id === session.roomId)?.name} · {session.phase === 'escape' ? '탈출 진행 중' : session.phase === 'learn' ? '학습 단계' : '브리핑'}</div>
            </div>
            <button className="btn primary" onClick={() => goto(session.phase === 'escape' ? 'room' : session.phase === 'learn' ? 'learn' : session.phase === 'debrief' ? 'debrief' : 'briefing')}>이어하기</button>
          </div>
        )}

        {!teamForm ? (
          <div className="mode-grid">
            <button className="mode-card" onClick={startSolo}>
              <div className="emoji">🧑‍⚕️</div>
              <h3>개인 플레이</h3>
              <p className="muted small">혼자 학습하고 탈출합니다. 진행 상황은 이 브라우저에 저장됩니다.</p>
            </button>
            <button className="mode-card team" onClick={() => setTeamForm(true)}>
              <div className="emoji">👥</div>
              <h3>팀 플레이</h3>
              <p className="muted small">한 기기로 팀이 함께 풉니다. 탈출 후 결과 코드를 진행자에게 제출합니다.</p>
            </button>
          </div>
        ) : (
          <div className="panel stack">
            <h3>팀 등록</h3>
            <div className="field">
              <label>팀 이름</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 3조 심장팀" maxLength={20} autoFocus />
            </div>
            <div className="field">
              <label>인원</label>
              <input className="input" type="number" min={1} max={10} value={members} onChange={(e) => setMembers(Number(e.target.value) || 1)} />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setTeamForm(false)}>뒤로</button>
              <button className="btn ok" disabled={!name.trim()} onClick={startTeam}>입장 GO!</button>
            </div>
          </div>
        )}

        <div className="center row" style={{ marginTop: 28, justifyContent: 'center' }}>
          <SoundControl />
          <a href="#host" className="muted small">진행자 페이지 →</a>
        </div>

        <div className="panel" style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 10 }}>🎮 게임 방법</h3>
          <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', lineHeight: 1.8, fontSize: 15 }}>
            <li><b style={{ color: 'var(--text)' }}>환자 차트 열람 (18분)</b> — 병동의 의학용어 25개를 플래시카드로 익힙니다. "모르겠어요"로 표시한 단어는 퍼즐에 우선 출제됩니다.</li>
            <li><b style={{ color: 'var(--text)' }}>탈출 (40분)</b> — 병동 안 오브젝트 4개의 퍼즐을 풀어 코드 조각을 모으고, 4자리 코드로 문을 엽니다.</li>
            <li><b style={{ color: 'var(--text)' }}>힌트 3개</b> — 막히면 힌트를 쓸 수 있지만 100점씩 깎입니다. 오답은 20점.</li>
            <li><b style={{ color: 'var(--text)' }}>긴급 방송</b> — 스피드 라운드에 응답하면 보너스 점수를 얻습니다.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
