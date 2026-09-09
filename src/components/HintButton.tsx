import { useGame } from '../store/gameStore';
import { HINTS_PER_ROOM } from '../data/loadData';
import { sfx } from '../audio/sfx';

export const HINT_LABELS = ['💡 힌트 (어근/뜻)', '💡 힌트 (첫 글자)', '💡 힌트 (정답 공개)'];

interface Props {
  level: number; // 현재 문제에서 이미 사용한 힌트 단계 0..3
  onHint: (nextLevel: number) => void;
  termId?: string;
  disabled?: boolean;
}

export default function HintButton({ level, onHint, termId, disabled }: Props) {
  const hintsUsed = useGame((s) => s.session?.hintsUsed ?? 0);
  const useHint = useGame((s) => s.useHint);
  const left = HINTS_PER_ROOM - hintsUsed;
  const maxed = level >= 3;
  return (
    <button
      className="btn small"
      disabled={disabled || left <= 0 || maxed}
      onClick={() => {
        if (useHint(termId)) {
          sfx.click();
          onHint(level + 1);
        }
      }}
      title={left <= 0 ? '힌트를 모두 사용했습니다' : `힌트 사용 시 -100점 (남은 힌트 ${left})`}
    >
      {maxed ? '힌트 모두 사용' : HINT_LABELS[level]} <span className="muted">({left})</span>
    </button>
  );
}
