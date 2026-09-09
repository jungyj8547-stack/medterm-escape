import { useEffect, useRef, useState } from 'react';
import type { SpeedItem } from '../types';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';
import { SCORE } from '../engine/scoring';

const PER_QUESTION_MS = 10000;

interface Props {
  items: SpeedItem[];
  onClose: () => void;
}

export default function SpeedRound({ items, onClose }: Props) {
  const finishSpeed = useGame((s) => s.finishSpeed);
  const speedDone = useGame((s) => s.session?.speedDone ?? false);
  const speedCorrect = useGame((s) => s.session?.speedCorrect ?? 0);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [leftMs, setLeftMs] = useState(PER_QUESTION_MS);
  const startedAt = useRef(0);
  const [finished, setFinished] = useState(false);

  const item = items[idx];

  useEffect(() => {
    if (!started || finished || picked !== null) return;
    startedAt.current = Date.now();
    setLeftMs(PER_QUESTION_MS);
    const id = window.setInterval(() => {
      const left = PER_QUESTION_MS - (Date.now() - startedAt.current);
      setLeftMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        sfx.wrong();
        setPicked('__timeout__');
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [started, idx, picked, finished]);

  useEffect(() => {
    if (picked === null || finished) return;
    const t = window.setTimeout(() => {
      if (idx + 1 >= items.length) {
        setFinished(true);
        finishSpeed(correct);
        sfx.fragment();
      } else {
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [picked, idx, items.length, correct, finishSpeed, finished]);

  if (speedDone && !started) {
    return (
      <div className="center stack">
        <div style={{ fontSize: 40 }}>📢</div>
        <p>이미 긴급 방송에 응답했습니다.</p>
        <p className="accent mono">정답 {speedCorrect} / {items.length} · 보너스 +{speedCorrect * SCORE.speedBonusPerCorrect}점</p>
        <button className="btn" onClick={onClose}>닫기</button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="center stack">
        <div style={{ fontSize: 40 }}>📢</div>
        <h3>긴급 방송 — 스피드 라운드</h3>
        <p className="muted">
          용어 {items.length}개가 10초 간격으로 방송됩니다. 알맞은 한글 뜻을 빠르게 고르세요.
          <br />
          정답 1개당 <b className="accent">+{SCORE.speedBonusPerCorrect}점</b> 보너스. 오답 감점은 없지만, 한 번만 참여할 수 있습니다.
        </p>
        <button className="btn primary big" onClick={() => { sfx.alarm(); setStarted(true); }}>응답 시작</button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="center stack">
        <div style={{ fontSize: 40 }}>📡</div>
        <h3>방송 종료</h3>
        <p className="accent mono" style={{ fontSize: 22 }}>정답 {correct} / {items.length}</p>
        <p>보너스 <b>+{correct * SCORE.speedBonusPerCorrect}점</b></p>
        <button className="btn primary" onClick={onClose}>닫기</button>
      </div>
    );
  }

  const pick = (opt: string) => {
    if (picked !== null) return;
    if (opt === item.answer) {
      sfx.correct();
      setCorrect((c) => c + 1);
    } else {
      sfx.wrong();
    }
    setPicked(opt);
  };

  return (
    <div>
      <div className="row between">
        <span className="speed-score">문제 {idx + 1} / {items.length}</span>
        <span className="speed-score">정답 {correct}</span>
      </div>
      <div className="speed-timer">
        <div style={{ width: `${(leftMs / PER_QUESTION_MS) * 100}%` }} />
      </div>
      <div className="speed-term">{item.term}</div>
      <div className="options">
        {item.options.map((opt) => (
          <button
            key={opt}
            className={`opt ${picked !== null && opt === item.answer ? 'correct' : ''} ${picked === opt && opt !== item.answer ? 'wrong' : ''}`}
            disabled={picked !== null}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
