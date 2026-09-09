import { useEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import { ROOM_BY_ID, LEARN_MINUTES } from '../data/loadData';
import { formatTime } from '../engine/scoring';
import Flashcard from '../components/Flashcard';
import { PartLegend } from '../components/Parts';
import { sfx } from '../audio/sfx';

export default function Learn() {
  const session = useGame((s) => s.session)!;
  const weak = useGame((s) => s.weak);
  const markSeen = useGame((s) => s.markSeen);
  const startEscape = useGame((s) => s.startEscape);
  const goto = useGame((s) => s.goto);
  const room = ROOM_BY_ID[session.roomId];
  const terms = room.terms;

  const firstUnseen = Math.max(0, terms.findIndex((t) => !session.seen.includes(t.id)));
  const [idx, setIdx] = useState(firstUnseen === -1 ? 0 : firstUnseen);
  const [view, setView] = useState<'card' | 'list'>('card');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((Date.now() - session.learnStartedAt) / 1000), 1000);
    return () => window.clearInterval(id);
  }, [session.learnStartedAt]);

  const term = terms[idx];
  const seenCount = terms.filter((t) => session.seen.includes(t.id)).length;
  const allSeen = seenCount >= terms.length;
  const weakCount = terms.filter((t) => weak[t.id]).length;
  const target = LEARN_MINUTES * 60;
  const over = elapsed > target;

  const answer = (known: boolean) => {
    sfx.click();
    markSeen(term.id, known);
    const nextUnseen = terms.findIndex((t, i) => i > idx && !session.seen.includes(t.id) && t.id !== term.id);
    if (nextUnseen !== -1) setIdx(nextUnseen);
    else {
      const anyUnseen = terms.findIndex((t) => !session.seen.includes(t.id) && t.id !== term.id);
      setIdx(anyUnseen !== -1 ? anyUnseen : Math.min(idx + 1, terms.length - 1));
    }
  };

  return (
    <div className={`screen theme-${room.theme}`}>
      <div className="container narrow">
        <div className="learn-top">
          <div>
            <b>📋 {room.name} · 환자 차트 열람</b>
            <div className="small muted">{seenCount} / {terms.length} 열람 · 모르겠어요 {weakCount}개</div>
          </div>
          <div className="row">
            <span className={`timer ${over ? 'warn' : ''}`} style={{ fontSize: 18 }}>
              {formatTime(elapsed)} / {formatTime(target)}
            </span>
            <button className="btn small ghost" onClick={() => setView(view === 'card' ? 'list' : 'card')}>
              {view === 'card' ? '☰ 목록' : '🃏 카드'}
            </button>
          </div>
        </div>
        <div className="progress" style={{ marginBottom: 16 }}>
          <div style={{ width: `${(seenCount / terms.length) * 100}%` }} />
        </div>

        {view === 'card' ? (
          <>
            <div className="row between small muted" style={{ marginBottom: 8 }}>
              <span>{idx + 1} / {terms.length}{session.seen.includes(term.id) ? ' · 열람함' : ''}{weak[term.id] ? ' · 🔴 모르겠어요' : ''}</span>
              <PartLegend />
            </div>
            <Flashcard term={term} />
            <div className="learn-actions">
              <button className="btn danger big" onClick={() => answer(false)}>🤔 모르겠어요</button>
              <button className="btn primary big" onClick={() => answer(true)}>✅ 알아요</button>
            </div>
            <div className="row between" style={{ marginTop: 10 }}>
              <button className="btn small ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← 이전</button>
              <span className="small muted">카드를 눌러 뒤집고, 판단한 뒤 버튼을 누르세요</span>
              <button className="btn small ghost" disabled={idx >= terms.length - 1} onClick={() => setIdx(idx + 1)}>다음 →</button>
            </div>
          </>
        ) : (
          <div className="learn-list">
            {terms.map((t, i) => (
              <button
                key={t.id}
                className={`item ${weak[t.id] ? 'weak' : ''} ${session.seen.includes(t.id) ? 'seen' : ''}`}
                onClick={() => {
                  setIdx(i);
                  setView('card');
                }}
              >
                <span>
                  <b>{t.term}</b>{t.abbr ? <span className="muted"> {t.abbr}</span> : ''}
                  <div className="k">{t.korean}</div>
                </span>
                <span>{weak[t.id] ? '🔴' : session.seen.includes(t.id) ? '✅' : '·'}</span>
              </button>
            ))}
          </div>
        )}

        <div className="panel" style={{ marginTop: 20 }}>
          {allSeen ? (
            <div className="row between">
              <div>
                <b>모든 차트를 열람했습니다.</b>
                <div className="small muted">탈출을 시작하면 40분 타이머가 돌아갑니다. 모르겠어요로 표시한 {weakCount}개 단어가 퍼즐에 우선 출제됩니다.</div>
              </div>
              <button className="btn primary big" onClick={() => { sfx.unlock(); startEscape(); }}>🚪 탈출 시작</button>
            </div>
          ) : (
            <div className="row between">
              <div className="muted small">카드 {terms.length - seenCount}장을 더 열람하면 탈출을 시작할 수 있습니다.</div>
              <button className="btn ghost small" onClick={() => goto('briefing')}>← 브리핑</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
