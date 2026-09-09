import { useRef } from 'react';
import { useGame } from '../store/gameStore';
import { ROOMS } from '../data/loadData';
import { formatTime } from '../engine/scoring';
import { sfx } from '../audio/sfx';
import ToastHost, { toast } from '../components/Toast';

export default function Lobby() {
  const s = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  const floorsDesc = [...ROOMS].reverse();
  const clearedAll = ROOMS.every((r) => s.bestResults[r.id]?.escaped);

  const enter = (roomId: string) => {
    sfx.click();
    if (s.session && s.session.roomId === roomId && s.session.phase !== 'debrief') {
      s.goto(s.session.phase === 'escape' ? 'room' : s.session.phase === 'learn' ? 'learn' : 'briefing');
      return;
    }
    if (s.session && s.session.phase !== 'debrief' && !confirm('진행 중인 다른 병동이 있습니다. 새로 시작할까요? (기존 진행은 사라집니다)')) return;
    s.startRoom(roomId);
  };

  const exportFile = () => {
    const blob = new Blob([s.exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `medterm-escape-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((t) => toast(s.importProgress(t) ? '진행 상황을 불러왔습니다' : '올바른 진행 파일이 아닙니다'));
  };

  return (
    <div className="screen">
      <ToastHost />
      <div className="container narrow">
        <div className="row between" style={{ marginBottom: 18 }}>
          <div>
            <h2>병원 안내도</h2>
            <div className="small muted">
              {s.mode === 'team' ? `👥 팀: ${s.team?.name} (${s.team?.members}명)` : '🧑‍⚕️ 개인 플레이'} · 옥상 헬기장까지 올라가세요
            </div>
          </div>
          <div className="row">
            <button className="btn small ghost" onClick={() => s.setMuted(!s.muted)}>{s.muted ? '🔇' : '🔊'}</button>
            <button className="btn small ghost" onClick={() => s.goto('title')}>← 타이틀</button>
          </div>
        </div>

        <div className="floors">
          <div className={`floor roof ${clearedAll ? '' : 'locked'}`}>
            <div className="fl">RTF</div>
            <div>
              <div className="name">🚁 옥상 헬기장</div>
              <div className="sub">{clearedAll ? '모든 병동을 통과했습니다. 탈출 성공!' : '8개 병동을 모두 통과하면 열립니다'}</div>
            </div>
            <div className="right">{clearedAll ? '🎉' : '🔒'}</div>
          </div>

          {floorsDesc.map((room) => {
            const unlocked = s.allUnlocked || s.unlocked.includes(room.id);
            const best = s.bestResults[room.id];
            const inProgress = s.session?.roomId === room.id && s.session.phase !== 'debrief';
            return (
              <div
                key={room.id}
                className={`floor theme-${room.theme} ${unlocked ? 'playable' : 'locked'}`}
                onClick={() => unlocked && enter(room.id)}
                role={unlocked ? 'button' : undefined}
              >
                <div className="fl">{room.floor}</div>
                <div>
                  <div className="name">{room.name}</div>
                  <div className="sub">{room.subtitle} · {room.terms.length}단어</div>
                </div>
                <div className="right" style={{ textAlign: 'right' }}>
                  {!unlocked && <span className="muted">🔒 잠김</span>}
                  {unlocked && inProgress && <span className="tag accent">진행 중 · 이어하기</span>}
                  {unlocked && !inProgress && best?.escaped && (
                    <div>
                      <div className="stars">{'★'.repeat(best.stars)}{'☆'.repeat(3 - best.stars)}</div>
                      <div className="small mono muted">{best.score}점 · {formatTime(best.timeUsedSec)}</div>
                    </div>
                  )}
                  {unlocked && !inProgress && !best?.escaped && <span className="accent">▶ 입장</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel" style={{ marginTop: 24 }}>
          <div className="row between">
            <div>
              <b>교수자 옵션</b>
              <div className="small muted">수업 순서에 맞춰 병동을 자유롭게 열 수 있습니다.</div>
            </div>
            <label className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={s.allUnlocked} onChange={s.toggleAllUnlocked} /> 모든 병동 열기
            </label>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn small" onClick={exportFile}>진행 내보내기</button>
            <button className="btn small" onClick={() => fileRef.current?.click()}>진행 가져오기</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
            <a className="btn small ghost" href="#host">진행자 페이지</a>
            <span className="spacer" style={{ flex: 1 }} />
            <button
              className="btn small danger"
              onClick={() => {
                if (confirm('모든 진행 상황(점수, 잠금 해제, 약한 단어)을 초기화할까요?')) s.resetAll();
              }}
            >
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
