import { useEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';
import { SCORE } from '../engine/scoring';

interface Props {
  code: string;
  onEscaped: () => void;
}

export default function Keypad({ code, onEscaped }: Props) {
  const keypadAttempt = useGame((s) => s.keypadAttempt);
  const fails = useGame((s) => s.session?.keypadFails ?? 0);
  const [input, setInput] = useState('');
  const [state, setState] = useState<'idle' | 'err' | 'ok'>('idle');

  const press = (d: string) => {
    if (state === 'ok') return;
    sfx.tick();
    setInput((prev) => (prev.length >= 4 ? prev : prev + d));
    setState('idle');
  };
  const back = () => {
    sfx.tick();
    setInput((prev) => prev.slice(0, -1));
    setState('idle');
  };
  const confirm = () => {
    if (input.length < 4) return;
    if (keypadAttempt(input, code)) {
      setState('ok');
      sfx.unlock();
      window.setTimeout(onEscaped, 900);
    } else {
      sfx.wrong();
      setState('err');
      setInput('');
    }
  };

  // 키보드 입력 지원 (숫자 / Backspace / Enter)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="keypad">
      <p className="puzzle-intro center">모은 코드 조각 4개를 순서대로 입력하세요.<br />차트 → 모니터 → 보관함 → 기록</p>
      <div className={`display ${state}`}>{input.padEnd(4, '·')}</div>
      <div className="keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="key" onClick={() => press(d)}>{d}</button>
        ))}
        <button className="key action" onClick={back}>←</button>
        <button className="key" onClick={() => press('0')}>0</button>
        <button className="key action" style={{ background: 'var(--accent)', color: '#061018' }} onClick={confirm} disabled={input.length < 4}>
          열기
        </button>
      </div>
      {state === 'err' && (
        <div className="feedback bad center">
          ❌ 코드가 틀렸습니다. (실패 {fails}회 · 3회마다 -{SCORE.keypadFailPenaltySec}초)
        </div>
      )}
      {state === 'ok' && <div className="feedback ok center">🔓 잠금 해제!</div>}
    </div>
  );
}
