import { ESCAPE_SECONDS } from '../data/loadData';

export const SCORE = {
  base: 1000,
  perRemainingSecond: 0.5,
  hintPenalty: 100,
  wrongPenalty: 20,
  speedBonusPerCorrect: 20,
  keypadFailPenaltySec: 60,
};

export interface ScoreInput {
  timeUsedSec: number;
  hintsUsed: number;
  wrong: number;
  speedCorrect: number;
  escaped: boolean;
}

export function computeScore(i: ScoreInput): { score: number; stars: 1 | 2 | 3 } {
  if (!i.escaped) return { score: 0, stars: 1 };
  const remaining = Math.max(0, ESCAPE_SECONDS - i.timeUsedSec);
  let score =
    SCORE.base +
    remaining * SCORE.perRemainingSecond -
    i.hintsUsed * SCORE.hintPenalty -
    i.wrong * SCORE.wrongPenalty +
    i.speedCorrect * SCORE.speedBonusPerCorrect;
  score = Math.max(100, Math.round(score));
  // 기준: 20분 내 탈출·힌트 0~1·오답 소수 → 3성 / 30분 내·힌트 2 → 2성
  const stars: 1 | 2 | 3 = score >= 1700 ? 3 : score >= 1300 ? 2 : 1;
  return { score, stars };
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
