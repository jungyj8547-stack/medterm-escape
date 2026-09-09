import { useEffect } from 'react';
import { useGame } from '../store/gameStore';
import { music } from '../audio/music';
import { ROOM_BY_ID, ROOMS, TERM_BY_ID } from '../data/loadData';
import { formatTime, SCORE } from '../engine/scoring';
import { encodeResult } from '../engine/resultCode';
import { sfx } from '../audio/sfx';
import ToastHost, { toast } from '../components/Toast';
import Avatar from '../components/Avatar';
import Confetti from '../components/Confetti';

export default function Debrief() {
  const session = useGame((s) => s.session)!;
  const mode = useGame((s) => s.mode);
  const team = useGame((s) => s.team);
  const startRoom = useGame((s) => s.startRoom);
  const retry = useGame((s) => s.retry);
  const goto = useGame((s) => s.goto);
  const abandonRoom = useGame((s) => s.abandonRoom);
  const room = ROOM_BY_ID[session.roomId];
  const r = session.result;
  const escaped = !!r?.escaped;
  const idx = ROOMS.findIndex((x) => x.id === room.id);
  const nextRoom = ROOMS[idx + 1];

  const reviewIds = Array.from(new Set([...session.wrongTerms, ...session.hintedTerms])).filter((id) => TERM_BY_ID[id]);
  useEffect(() => {
    if (escaped) {
      const t = window.setTimeout(() => music.fanfare(), 80);
      return () => window.clearTimeout(t);
    }
  }, [escaped]);

  const code = r && escaped ? encodeResult({ roomOrder: room.order, score: r.score, timeUsedSec: r.timeUsedSec, stars: r.stars }) : null;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${team?.name ?? ''} ${code}`.trim());
      toast('복사했습니다');
    } catch {
      toast('복사 실패 — 코드를 직접 적어 주세요');
    }
  };

  return (
    <div className={`screen theme-${room.theme}`}>
      <ToastHost />
      {escaped && <Confetti />}
      <div className="container narrow">
        <div className="panel">
          <div className="result-hero">
            <div className="small muted">{room.floor} {room.name}</div>
            <div className="result-avatars">
              <Avatar size={70} pose={escaped ? 'cheer' : 'sad'} />
              {mode === 'team' && <Avatar size={70} pose={escaped ? 'cheer' : 'sad'} shirt="#ec4899" skin="#f9c9a3" />}
            </div>
            {escaped ? (
              <>
                <h2>🔓 탈출 성공!</h2>
                <div className="stars">{'★'.repeat(r!.stars)}{'☆'.repeat(3 - r!.stars)}</div>
                <div className="score">{r!.score}<span className="small muted" style={{ fontSize: 18 }}> 점</span></div>
                <p className="brief muted" style={{ fontSize: 16, marginTop: 10 }}>{room.escapeMessage}</p>
              </>
            ) : (
              <>
                <h2>⏰ 시간 초과</h2>
                <p className="muted">문은 열리지 않았다. 하지만 지금까지 모은 코드 조각은 그대로 남아 있다.</p>
              </>
            )}
          </div>

          {r && (
            <div className="breakdown">
              <div><b>{formatTime(r.timeUsedSec)}</b><span>사용 시간</span></div>
              <div><b>{r.hintsUsed}</b><span>힌트 (-{r.hintsUsed * SCORE.hintPenalty})</span></div>
              <div><b>{r.wrong}</b><span>오답 (-{r.wrong * SCORE.wrongPenalty})</span></div>
              <div><b>{r.speedCorrect}/10</b><span>방송 보너스 (+{r.speedCorrect * SCORE.speedBonusPerCorrect})</span></div>
            </div>
          )}

          {mode === 'team' && code && (
            <div className="stack" style={{ marginBottom: 18 }}>
              <div className="small muted center">팀 <b>{team?.name}</b> 결과 코드 — 진행자에게 제출하세요</div>
              <div className="result-code">{code}</div>
              <button className="btn small" onClick={copy}>📋 팀명 + 코드 복사</button>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <b>복습이 필요한 단어 {reviewIds.length}개</b>
            <div className="small muted" style={{ marginBottom: 8 }}>틀렸거나 힌트를 사용한 단어입니다.</div>
            {reviewIds.length === 0 ? (
              <div className="muted small">없음 — 완벽합니다! 🎉</div>
            ) : (
              <div className="term-chips">
                {reviewIds.map((id) => (
                  <span key={id} className="chip"><b>{TERM_BY_ID[id].term}</b> {TERM_BY_ID[id].korean}</span>
                ))}
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn ghost" onClick={abandonRoom}>안내도로</button>
            <button className="btn" onClick={() => goto('review')}>🃏 복습 카드</button>
            {!escaped && (
              <button className="btn primary" onClick={() => { sfx.click(); retry(); }}>🔁 재도전 (타이머 리셋)</button>
            )}
            {escaped && nextRoom && (
              <button className="btn ok bounce" onClick={() => { sfx.click(); startRoom(nextRoom.id); }}>
                다음: {nextRoom.floor} {nextRoom.name} →
              </button>
            )}
            {escaped && !nextRoom && (
              <button className="btn primary" onClick={abandonRoom}>🚁 옥상 헬기장으로</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
