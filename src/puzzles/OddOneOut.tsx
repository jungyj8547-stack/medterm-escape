import { useState } from 'react';
import type { OddItem } from '../types';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';
import HintButton from '../components/HintButton';
import { ROOM_BY_ID } from '../data/loadData';

interface Props {
  items: OddItem[];
  roomId: string;
  onSolved: () => void;
}

export default function OddOneOut({ items, roomId, onSolved }: Props) {
  const progress = useGame((s) => s.session?.progress.records ?? 0);
  const setProgress = useGame((s) => s.setProgress);
  const addWrong = useGame((s) => s.addWrong);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [correct, setCorrect] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  const idx = Math.min(progress, items.length - 1);
  const item = items[idx];
  const roomName = ROOM_BY_ID[roomId]?.name ?? '이 병동';

  if (progress >= items.length || !item) {
    return (
      <div className="center stack">
        <div style={{ fontSize: 40 }}>📁</div>
        <p>오염된 기록을 모두 정리했습니다.</p>
        <button className="btn primary" onClick={onSolved}>코드 조각 획득</button>
      </div>
    );
  }

  const pick = (termId: string) => {
    if (correct || wrongPicks.includes(termId)) return;
    if (termId === item.answerTermId) {
      sfx.correct();
      setCorrect(true);
    } else {
      sfx.wrong();
      addWrong(termId);
      setWrongPicks([...wrongPicks, termId]);
    }
  };
  const next = () => {
    setWrongPicks([]);
    setCorrect(false);
    setHintLevel(0);
    const n = idx + 1;
    setProgress('records', n);
    if (n >= items.length) onSolved();
  };

  // 힌트 2단계: 오답 2개 제거
  const eliminated = hintLevel >= 2 ? item.options.filter((o) => o.termId !== item.answerTermId).slice(0, 2).map((o) => o.termId) : [];
  const intruder = item.options.find((o) => o.termId === item.answerTermId)!;

  return (
    <div>
      <p className="puzzle-intro">
        다른 병동의 기록이 섞여 들어왔습니다. 5개 중 <b>{roomName}</b>에서 배운 단어가 <b>아닌</b> 것을 찾아내세요.
      </p>
      <div className="puzzle-progress">
        {items.map((_, i) => (
          <span key={i} className={i < idx ? 'done' : i === idx ? 'cur' : ''} />
        ))}
      </div>
      <div className="prompt">
        기록 #{idx + 1}
        <span className="sub">침입한 단어 1개를 찾으세요 ({idx + 1} / {items.length})</span>
      </div>
      <div className="odd-list">
        {item.options.map((o) => (
          <button
            key={o.termId}
            className={`opt ${correct && o.termId === item.answerTermId ? 'correct' : ''} ${wrongPicks.includes(o.termId) ? 'wrong' : ''}`}
            disabled={correct || wrongPicks.includes(o.termId) || eliminated.includes(o.termId)}
            style={eliminated.includes(o.termId) ? { opacity: 0.25, textDecoration: 'line-through' } : undefined}
            onClick={() => pick(o.termId)}
          >
            <div>{o.term}</div>
            <div className="small muted">{o.korean}</div>
          </button>
        ))}
      </div>

      {hintLevel >= 1 && (
        <div className="hint-box">
          💡 침입한 기록은 <b>{item.intruderRoomName}</b>에서 온 것입니다.
          {hintLevel >= 2 && <div>💡 확실히 아닌 것 2개를 지웠습니다.</div>}
          {hintLevel >= 3 && <div>💡 정답: <b>{intruder.term}</b></div>}
        </div>
      )}

      {correct && (
        <div className="feedback ok">
          ✅ <b>{intruder.term}</b> ({intruder.korean})는 <b>{item.intruderRoomName}</b>의 단어입니다.
        </div>
      )}
      {!correct && wrongPicks.length > 0 && <div className="feedback bad">❌ 그 단어는 이 병동에서 배운 단어입니다. (-20점)</div>}

      <div className="puzzle-foot">
        <HintButton level={hintLevel} onHint={setHintLevel} termId={item.answerTermId} disabled={correct} />
        {correct && (
          <button className="btn primary" onClick={next}>{idx + 1 >= items.length ? '완료' : '다음 기록 →'}</button>
        )}
      </div>
    </div>
  );
}
