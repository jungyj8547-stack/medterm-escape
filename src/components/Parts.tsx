import type { Part } from '../types';

export const PART_LABEL: Record<string, string> = { p: '접두사', r: '어근', s: '접미사', w: '단어' };

export function PartChips({ parts, withMeaning = true }: { parts: Part[]; withMeaning?: boolean }) {
  return (
    <div className="parts">
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span className="plus">+</span>}
          <span className={`part ${p[2]}`} title={PART_LABEL[p[2]]}>
            {p[0]}
            {withMeaning && <span style={{ fontFamily: 'var(--font)', fontWeight: 500, opacity: 0.85 }}> {p[1]}</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

export function PartLegend() {
  return (
    <div className="legend">
      <span><span className="part p">접두사</span></span>
      <span><span className="part r">어근</span></span>
      <span><span className="part s">접미사</span></span>
      <span><span className="part w">단어</span></span>
    </div>
  );
}
