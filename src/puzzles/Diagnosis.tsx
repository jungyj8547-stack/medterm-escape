import { useState } from 'react';
import type { DiagnosisItem } from '../types';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';
import HintButton from '../components/HintButton';
import { TERM_BY_ID } from '../data/loadData';

interface Props {
  items: DiagnosisItem[];
  onSolved: () => void;
}

export default function Diagnosis({ items, onSolved }: Props) {
  const progress = useGame((s) => s.session?.progress.monitor ?? 0);
  const setProgress = useGame((s) => s.setProgress);
  const addWrong = useGame((s) => s.addWrong);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [correct, setCorrect] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  const idx = Math.min(progress, items.length - 1);
  const item = items[idx];
  if (progress >= items.length || !item) {
    return (
      <div className="center stack">
        <div style={{ fontSize: 40 }}>🖥️</div>
        <p>모든 환자의 진단이 끝났습니다.</p>
        <button className="btn primary" onClick={onSolved}>코드 조각 획득</button>
      </div>
    );
  }
  const term = TERM_BY_ID[item.termId];

  const pick = (opt: string) => {
    if (correct || wrongPicks.includes(opt)) return;
    if (opt === item.answer) {
      sfx.correct();
      setCorrect(true);
    } else {
      sfx.wrong();
      addWrong(item.termId);
      setWrongPicks([...wrongPicks, opt]);
    }
  };
  const next = () => {
    setWrongPicks([]);
    setCorrect(false);
    setHintLevel(0);
    const n = idx + 1;
    setProgress('monitor', n);
    if (n >= items.length) onSolved();
  };

  return (
    <div>
      <p className="puzzle-intro">
        {item.promptKind === 'abbr' ? '모니터에 약어만 표시됩니다. 어떤 용어의 약어일까요?' : '환자 상태 설명을 읽고 알맞은 의학용어를 고르세요.'}
      </p>
      <div className="puzzle-progress">
        {items.map((_, i) => (
          <span key={i} className={i < idx ? 'done' : i === idx ? 'cur' : ''} />
        ))}
      </div>
      <div className="prompt">
        {item.promptKind === 'abbr' ? (
          <div className="abbr-big">{item.prompt}</div>
        ) : (
          <div>🩺 {item.prompt}</div>
        )}
        <span className="sub">환자 {idx + 1} / {items.length}</span>
      </div>
      <div className="options">
        {item.options.map((opt) => (
          <button
            key={opt}
            className={`opt ${correct && opt === item.answer ? 'correct' : ''} ${wrongPicks.includes(opt) ? 'wrong' : ''}`}
            disabled={correct || wrongPicks.includes(opt)}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      {hintLevel >= 1 && (
        <div className="hint-box">
          💡 한글 뜻: <b>{item.korean}</b>
          {hintLevel >= 2 && <div>💡 첫 글자: <b className="mono">{item.answer[0]}</b> … ({item.answer.split(' ').length}단어)</div>}
          {hintLevel >= 3 && <div>💡 정답: <b>{item.answer}</b></div>}
        </div>
      )}

      {correct && (
        <div className="feedback ok">
          ✅ <b>{item.answer}</b>{term?.abbr ? ` (${term.abbr})` : ''} = {item.korean}
          <div className="small muted" style={{ marginTop: 4 }}>{term?.desc}</div>
        </div>
      )}
      {!correct && wrongPicks.length > 0 && <div className="feedback bad">❌ 아닙니다. 다른 용어를 골라 보세요. (-20점)</div>}

      <div className="puzzle-foot">
        <HintButton level={hintLevel} onHint={setHintLevel} termId={item.termId} disabled={correct} />
        {correct && (
          <button className="btn primary" onClick={next}>{idx + 1 >= items.length ? '완료' : '다음 환자 →'}</button>
        )}
      </div>
    </div>
  );
}
