import { useGame } from '../store/gameStore';
import { ROOMS } from '../data/loadData';
import { formatTime } from '../engine/scoring';
import { sfx } from '../audio/sfx';
import ToastHost from '../components/Toast';
import Avatar from '../components/Avatar';

export default function Lobby() {
  const s = useGame();
  const floorsDesc = [...ROOMS].reverse();
  const clearedAll = ROOMS.every((r) => s.bestResults[r.id]?.escaped);
  // 캐릭터 마커: 진행 중인 병동 > 아직 클리어하지 않은 가장 낮은 열린 병동
  const markerRoom =
    (s.session && s.session.phase !== 'debrief' ? s.session.roomId : null) ??
    ROOMS.find((r) => (s.allUnlocked || s.unlocked.includes(r.id)) && !s.bestResults[r.id]?.escaped)?.id ??
    ROOMS[ROOMS.length - 1].id;

  const enter = (roomId: string) => {
    sfx.click();
    if (s.session && s.session.roomId === roomId && s.session.phase !== 'debrief') {
      s.goto(s.session.phase === 'escape' ? 'room' : s.session.phase === 'learn' ? 'learn' : 'briefing');
      return;
    }
    if (s.session && s.session.phase !== 'debrief' && !confirm('진행 중인 다른 병동이 있습니다. 새로 시작할까요? (기존 진행은 사라집니다)')) return;
    s.startRoom(roomId);
  };

  return (
    <div className="screen">
      <ToastHost />
      <div className="container narrow">
        <div className="row between" style={{ marginBottom: 18 }}>
          <div>
            <h2>🏥 병원 안내도</h2>
            <div className="small muted">
              {s.mode === 'team' ? `👥 팀: ${s.team?.name} (${s.team?.members}명)` : '🧑‍⚕️ 개인 플레이'} · 옥상 헬기장까지 올라가세요
            </div>
          </div>
          <div className="row">
            <button className="btn small ghost" title="배경음악" onClick={() => s.setMusicOn(!s.musicOn)}>{s.musicOn ? '🎵' : '🎵✕'}</button>
            <button className="btn small ghost" title="효과음" onClick={() => s.setMuted(!s.muted)}>{s.muted ? '🔇' : '🔊'}</button>
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
                className={`floor theme-${room.theme} ${unlocked ? 'playable' : 'locked'} ${best?.escaped ? 'cleared' : ''}`}
                onClick={() => unlocked && enter(room.id)}
                role={unlocked ? 'button' : undefined}
              >
                {markerRoom === room.id && !clearedAll && (
                  <span className="marker"><Avatar size={44} pose="idle" /></span>
                )}
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
                  {unlocked && !inProgress && !best?.escaped && <span className="btn small primary">▶ 입장</span>}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
