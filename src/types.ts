export type PartType = 'p' | 'r' | 's' | 'w';
export type Part = [string, string, PartType]; // [형태소, 뜻, 종류]

export interface Term {
  id: string;
  term: string;
  abbr: string;
  korean: string;
  system: string;
  parts: Part[];
  desc: string;
}

export interface Room {
  id: string;
  order: number;
  floor: string;
  name: string;
  subtitle: string;
  theme: string;
  briefing: string;
  escapeMessage: string;
  terms: Term[];
}

export type PuzzleHotspot = 'chart' | 'monitor' | 'locker' | 'records';
export type Hotspot = PuzzleHotspot | 'speaker' | 'door';
export const PUZZLE_HOTSPOTS: PuzzleHotspot[] = ['chart', 'monitor', 'locker', 'records'];

export interface BuilderItem {
  termId: string;
  term: string;
  korean: string;
  answer: string[]; // 정답 순서의 타일
  tiles: { text: string; meaning: string; type: PartType }[]; // 섞인 타일(오답 포함)
}

export interface DiagnosisItem {
  termId: string;
  promptKind: 'abbr' | 'desc';
  prompt: string;
  options: string[]; // 영어 용어 4개
  answer: string;
  korean: string;
}

export interface MatchPair {
  termId: string;
  term: string;
  korean: string;
}

export interface OddItem {
  options: { termId: string; term: string; korean: string }[];
  answerTermId: string;
  intruderRoomName: string;
}

export interface SpeedItem {
  termId: string;
  term: string;
  options: string[]; // 한글 뜻 4개
  answer: string;
}

export interface RoomPuzzles {
  seed: number;
  code: string; // 4자리
  digits: Record<PuzzleHotspot, string>;
  builder: BuilderItem[];
  diagnosis: DiagnosisItem[];
  matching: MatchPair[];
  odd: OddItem[];
  speed: SpeedItem[];
}

export interface RoomResult {
  roomId: string;
  score: number;
  stars: 1 | 2 | 3;
  timeUsedSec: number;
  hintsUsed: number;
  wrong: number;
  speedCorrect: number;
  escaped: boolean;
  date: string;
}
