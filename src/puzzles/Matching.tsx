import { useMemo, useState } from 'react';
import type { MatchPair } from '../types';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';
import HintButton from '../components/HintButton';
import { createRng, hashString } from '../engine/seededRandom';

interface Props {
  pairs: MatchPair[];
  onSolved: () => void;
}

export default function Matching({ pairs, onSolved }: Props) {
  const addWrong = useGame((s) => s.addWrong);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState<string | null>(null);

  const right = useMemo(() => {
    const rng = createRng(hashString(pairs.map((p) => p.termId).join('|')));
    return rng.shuffle(pairs);
  }, [pairs]);

  const all = matched.length === pairs.length;

  const pickRight = (termId: string) => {
    if (!selLeft) return;
    if (termId === selLeft) {
      sfx.correct();
      const m = [...matched, termId];
      setMatched(m);
      setSelLeft(null);
      setRevealed(null);
      if (m.length === pairs.length) sfx.fragment();
    } else {
      sfx.wrong();
      addWrong(selLeft);
      setWrongFlash(termId);
      window.setTimeout(() => setWrongFlash(null), 400);
    }
  };

  const onHint = (lv: number) => {
    setHintLevel(lv);
    const first = pairs.find((p) => !matched.includes(p.termId));
    if (first) {
      setRevealed(first.termId);
      setSelLeft(first.termId);
    }
  };

  return (
    <div>
      <p className="puzzle-intro">왼쪽 영어 용어를 누른 뒤 오른쪽에서 알맞은 한글 뜻을 누르세요. 8쌍을 모두 맞추면 보관함이 열립니다.</p>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="tag accent">{matched.length} / {pairs.length} 쌍</span>
        {revealed && (
          <span className="hint-box" style={{ margin: 0, padding: '6px 10px' }}>
            💡 <b>{pairs.find((p) => p.termId === revealed)?.term}</b> = {pairs.find((p) => p.termId === revealed)?.korean}
          </span>
        )}
      </div>
      <div className="match-grid">
        <div className="match-col">
          {pairs.map((p) => (
            <button
              key={p.termId}
              className={`match-btn ${selLeft === p.termId ? 'sel' : ''} ${matched.includes(p.termId) ? 'done' : ''}`}
              onClick={() => {
                sfx.click();
                setSelLeft(selLeft === p.termId ? null : p.termId);
              }}
            >
              {p.term}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((p) => (
            <button
              key={p.termId}
              className={`match-btn ${matched.includes(p.termId) ? 'done' : ''} ${wrongFlash === p.termId ? 'wrong' : ''}`}
              disabled={!selLeft}
              onClick={() => pickRight(p.termId)}
            >
              {p.korean}
            </button>
          ))}
        </div>
      </div>
      {all && <div className="feedback ok">✅ 보관함이 열렸습니다!</div>}
      <div className="puzzle-foot">
        <HintButton level={hintLevel} onHint={onHint} disabled={all} />
        {all && <button className="btn primary" onClick={onSolved}>코드 조각 획득</button>}
      </div>
    </div>
  );
}
