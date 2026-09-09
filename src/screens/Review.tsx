import { useMemo, useState } from 'react';
import { useGame } from '../store/gameStore';
import { ROOM_BY_ID, TERM_BY_ID } from '../data/loadData';
import Flashcard from '../components/Flashcard';
import { sfx } from '../audio/sfx';

export default function Review() {
  const session = useGame((s) => s.session)!;
  const weak = useGame((s) => s.weak);
  const clearWeak = useGame((s) => s.clearWeak);
  const goto = useGame((s) => s.goto);
  const room = ROOM_BY_ID[session.roomId];

  const ids = useMemo(() => {
    const set = new Set<string>([...session.wrongTerms, ...session.hintedTerms, ...room.terms.filter((t) => weak[t.id]).map((t) => t.id)]);
    const list = [...set].filter((id) => TERM_BY_ID[id]);
    return list.length ? list : room.terms.map((t) => t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.roomId]);

  const [idx, setIdx] = useState(0);
  const term = TERM_BY_ID[ids[idx]];

  return (
    <div className={`screen theme-${room.theme}`}>
      <div className="container narrow">
        <div className="learn-top">
          <div>
            <b>🃏 복습 카드 · {room.name}</b>
            <div className="small muted">{idx + 1} / {ids.length}{weak[term.id] ? ' · 🔴 약한 단어' : ''}</div>
          </div>
          <button className="btn small ghost" onClick={() => goto('debrief')}>← 결과로</button>
        </div>
        <Flashcard term={term} autoFlip />
        <div className="row between" style={{ marginTop: 14 }}>
          <button className="btn" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← 이전</button>
          {weak[term.id] ? (
            <button className="btn primary" onClick={() => { sfx.correct(); clearWeak(term.id); }}>✅ 이제 알아요</button>
          ) : (
            <span className="tag">알고 있는 단어</span>
          )}
          <button className="btn" disabled={idx >= ids.length - 1} onClick={() => setIdx(idx + 1)}>다음 →</button>
        </div>
      </div>
    </div>
  );
}
