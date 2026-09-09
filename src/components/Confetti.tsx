import { useMemo } from 'react';

const COLORS = ['#ff4b4b', '#ffd23f', '#38d16a', '#1e90ff', '#ff7ac6', '#ff9f1c', '#7c5cff'];

/** CSS만으로 떨어지는 색종이 */
export default function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        dur: 2.5 + Math.random() * 2,
        color: COLORS[i % COLORS.length],
        w: 8 + Math.random() * 8,
        h: 10 + Math.random() * 10,
        rot: Math.random() * 360,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            background: p.color,
            width: p.w,
            height: p.h,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
