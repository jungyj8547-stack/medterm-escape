import { useState } from 'react';
import type { BuilderItem } from '../types';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';
import HintButton from '../components/HintButton';
import { PART_LABEL } from '../components/Parts';

interface Props {
  items: BuilderItem[];
  onSolved: () => void;
}

export default function WordBuilder({ items, onSolved }: Props) {
  const progress = useGame((s) => s.session?.progress.chart ?? 0);
  const setProgress = useGame((s) => s.setProgress);
  const addWrong = useGame((s) => s.addWrong);
  const [assembled, setAssembled] = useState<number[]>([]);
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [hintLevel, setHintLevel] = useState(0);

  const idx = Math.min(progress, items.length - 1);
  const item = items[idx];
  const done = progress >= items.length;

  if (done || !item) {
    return (
      <div className="center stack">
        <div style={{ fontSize: 40 }}>📋</div>
        <p>차트를 모두 해독했습니다.</p>
        <button className="btn primary" onClick={onSolved}>코드 조각 획득</button>
      </div>
    );
  }

  const pickTile = (i: number) => {
    if (state === 'ok' || assembled.includes(i)) return;
    sfx.click();
    setAssembled([...assembled, i]);
    setState('idle');
  };
  const unpick = (pos: number) => {
    if (state === 'ok') return;
    sfx.click();
    setAssembled(assembled.filter((_, p) => p !== pos));
    setState('idle');
  };
  const check = () => {
    const built = assembled.map((i) => item.tiles[i].text);
    const ok = built.length === item.answer.length && built.every((t, i) => t === item.answer[i]);
    if (ok) {
      sfx.correct();
      setState('ok');
    } else {
      sfx.wrong();
      addWrong(item.termId);
      setState('bad');
    }
  };
  const next = () => {
    setAssembled([]);
    setState('idle');
    setHintLevel(0);
    const n = idx + 1;
    setProgress('chart', n);
    if (n >= items.length) onSolved();
  };

  const answerParts = item.answer.map((a) => item.tiles.find((t) => t.text === a)!);

  return (
    <div>
      <p className="puzzle-intro">한글 뜻을 보고 형태소 타일을 <b>순서대로</b> 눌러 영어 용어를 조립하세요. 오답 타일도 섞여 있습니다.</p>
      <div className="puzzle-progress">
        {items.map((_, i) => (
          <span key={i} className={i < idx ? 'done' : i === idx ? 'cur' : ''} />
        ))}
      </div>
      <div className="prompt">
        {item.korean}
        <span className="sub">{idx + 1} / {items.length} · 형태소 {item.answer.length}개</span>
      </div>

      <div className="assembly">
        {assembled.length === 0 && <span className="placeholder">여기에 타일이 순서대로 놓입니다</span>}
        {assembled.map((i, pos) => (
          <button key={pos} className={`tile in-assembly ${item.tiles[i].type}`} onClick={() => unpick(pos)} title="빼기">
            {item.tiles[i].text}
          </button>
        ))}
      </div>

      <div className="tiles">
        {item.tiles.map((t, i) => (
          <button
            key={i}
            className={`tile ${t.type} ${assembled.includes(i) ? 'used' : ''}`}
            onClick={() => pickTile(i)}
            title={PART_LABEL[t.type]}
          >
            {t.text}
            <small>{t.meaning}</small>
          </button>
        ))}
      </div>

      {hintLevel >= 1 && (
        <div className="hint-box">
          💡 구조: {answerParts.map((p) => `${PART_LABEL[p.type]}(${p.meaning})`).join(' + ')}
          {hintLevel >= 2 && <div>💡 첫 타일: <b className="mono">{item.answer[0]}</b></div>}
          {hintLevel >= 3 && <div>💡 정답: <b className="mono">{item.answer.join(' + ')}</b> = {item.term}</div>}
        </div>
      )}

      {state === 'ok' && (
        <div className="feedback ok">
          ✅ 정답! <b>{item.term}</b> = {item.korean}
        </div>
      )}
      {state === 'bad' && <div className="feedback bad">❌ 순서나 타일이 다릅니다. 다시 조립해 보세요. (-20점)</div>}

      <div className="puzzle-foot">
        <HintButton level={hintLevel} onHint={setHintLevel} termId={item.termId} disabled={state === 'ok'} />
        <div className="row">
          {state !== 'ok' && (
            <>
              <button className="btn ghost small" onClick={() => { setAssembled([]); setState('idle'); }}>초기화</button>
              <button className="btn primary" disabled={assembled.length === 0} onClick={check}>확인</button>
            </>
          )}
          {state === 'ok' && (
            <button className="btn primary" onClick={next}>{idx + 1 >= items.length ? '완료' : '다음 →'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
