import { useState, useEffect } from 'react';
import type { Term } from '../types';
import { PartChips } from './Parts';
import { sfx } from '../audio/sfx';

export default function Flashcard({ term, autoFlip = false }: { term: Term; autoFlip?: boolean }) {
  const [flipped, setFlipped] = useState(autoFlip);
  useEffect(() => setFlipped(autoFlip), [term.id, autoFlip]);
  return (
    <div className="card-wrap">
      <div
        className={`card ${flipped ? 'flipped' : ''}`}
        onClick={() => {
          sfx.click();
          setFlipped((f) => !f);
        }}
      >
        <div className="face front">
          <div className="term">{term.term}</div>
          {term.abbr && <div className="abbr">{term.abbr}</div>}
          <div className="hint">카드를 눌러 뒤집기</div>
        </div>
        <div className="face back">
          <div className="small muted">{term.term}{term.abbr ? ` (${term.abbr})` : ''}</div>
          <div className="korean">{term.korean}</div>
          <PartChips parts={term.parts} />
          <div className="desc">{term.desc}</div>
        </div>
      </div>
    </div>
  );
}
