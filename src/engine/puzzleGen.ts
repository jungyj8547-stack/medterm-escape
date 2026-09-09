import type {
  BuilderItem,
  DiagnosisItem,
  MatchPair,
  OddItem,
  PuzzleHotspot,
  Room,
  RoomPuzzles,
  SpeedItem,
  Term,
} from '../types';
import { createRng } from './seededRandom';

export const PUZZLE_SIZES = { builder: 6, diagnosis: 6, matching: 8, oddGroups: 5, speed: 10 };

/**
 * 병동 25단어 → 퍼즐 5종 생성.
 *  - 시드가 같으면 항상 같은 퍼즐 (새로고침해도 유지)
 *  - weakIds(학습 단계에서 "모르겠어요"로 표시한 단어)를 우선 출제
 *  - 모든 단어가 최소 1회 이상 출제되도록 커버리지를 추적
 */
export function generateRoomPuzzles(
  room: Room,
  allRooms: Room[],
  weakIds: Set<string>,
  seed: number,
): RoomPuzzles {
  const rng = createRng(seed);
  const terms = room.terms;
  const coverage = new Map<string, number>(terms.map((t) => [t.id, 0]));
  const bump = (t: Term) => coverage.set(t.id, (coverage.get(t.id) ?? 0) + 1);

  // 우선순위: 약한 단어 먼저, 그 안에서는 무작위
  const weakFirst = [
    ...rng.shuffle(terms.filter((t) => weakIds.has(t.id))),
    ...rng.shuffle(terms.filter((t) => !weakIds.has(t.id))),
  ];
  /** 커버리지 낮은 순 → 약한 단어 우선 → 시드 무작위 */
  const byNeed = (pool: Term[]) =>
    pool
      .map((t, i) => ({ t, i }))
      .sort((a, b) => {
        const c = (coverage.get(a.t.id) ?? 0) - (coverage.get(b.t.id) ?? 0);
        if (c !== 0) return c;
        const w = Number(weakIds.has(b.t.id)) - Number(weakIds.has(a.t.id));
        if (w !== 0) return w;
        return a.i - b.i;
      })
      .map((x) => x.t);

  /** 같은 한글 뜻이 겹치지 않게 n개 고르기 */
  const takeUniqueKorean = (pool: Term[], n: number, exclude: Set<string> = new Set()): Term[] => {
    const out: Term[] = [];
    const seen = new Set<string>();
    for (const t of pool) {
      if (out.length >= n) break;
      if (exclude.has(t.id) || seen.has(t.korean)) continue;
      seen.add(t.korean);
      out.push(t);
    }
    return out;
  };

  // 1) 어근 조립 — 약한 단어 우선, 그 다음엔 형태소가 3개 이상인 '조립할 맛이 있는' 단어 우선
  const richness = (t: Term) => (t.parts.length >= 3 ? 1 : 0);
  const builderPool = weakFirst
    .filter((t) => t.parts.length >= 2 && t.parts.length <= 6)
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const w = Number(weakIds.has(b.t.id)) - Number(weakIds.has(a.t.id));
      if (w !== 0) return w;
      const r = richness(b.t) - richness(a.t);
      if (r !== 0) return r;
      return a.i - b.i;
    })
    .map((x) => x.t);
  const builderTerms = builderPool.slice(0, PUZZLE_SIZES.builder);
  const builder: BuilderItem[] = builderTerms.map((t) => {
    bump(t);
    const answer = t.parts.map((p) => p[0]);
    const nDistract = answer.length >= 5 ? 1 : 2;
    const others = rng.shuffle(
      terms
        .filter((o) => o.id !== t.id)
        .flatMap((o) => o.parts)
        .filter((p) => !answer.includes(p[0])),
    );
    const distractors: typeof others = [];
    const seenText = new Set<string>();
    for (const p of others) {
      if (distractors.length >= nDistract) break;
      if (seenText.has(p[0])) continue;
      seenText.add(p[0]);
      distractors.push(p);
    }
    const tiles = rng.shuffle([...t.parts, ...distractors]).map((p) => ({ text: p[0], meaning: p[1], type: p[2] }));
    return { termId: t.id, term: t.term, korean: t.korean, answer, tiles };
  });

  // 2) 진단 내리기 (약어 해독 / 설명 보고 용어 고르기)
  const diagTerms = byNeed(weakFirst).slice(0, PUZZLE_SIZES.diagnosis);
  const diagnosis: DiagnosisItem[] = diagTerms.map((t) => {
    bump(t);
    const useAbbr = t.abbr.length > 0 && rng.next() < 0.65;
    const distractors = takeUniqueKorean(
      rng.shuffle(terms.filter((o) => o.id !== t.id && o.korean !== t.korean)),
      3,
    );
    const options = rng.shuffle([t, ...distractors]).map((o) => o.term);
    return {
      termId: t.id,
      promptKind: useAbbr ? 'abbr' : 'desc',
      prompt: useAbbr ? t.abbr : t.desc,
      options,
      answer: t.term,
      korean: t.korean,
    };
  });

  // 3) 짝 맞추기
  const matchTerms = takeUniqueKorean(byNeed(weakFirst), PUZZLE_SIZES.matching);
  matchTerms.forEach(bump);
  const matching: MatchPair[] = rng
    .shuffle(matchTerms)
    .map((t) => ({ termId: t.id, term: t.term, korean: t.korean }));

  // 4) 오염된 기록 (침입 단어 찾기)
  const otherRooms = allRooms.filter((r) => r.id !== room.id);
  const oddTerms = rng.shuffle(byNeed(weakFirst).slice(0, PUZZLE_SIZES.oddGroups * 4));
  const odd: OddItem[] = [];
  for (let g = 0; g < PUZZLE_SIZES.oddGroups; g++) {
    const group = oddTerms.slice(g * 4, g * 4 + 4);
    if (group.length < 4) break;
    group.forEach(bump);
    const srcRoom = rng.pick(otherRooms);
    const koreanSet = new Set(group.map((t) => t.korean));
    const intruder =
      rng.shuffle(srcRoom.terms).find((t) => !koreanSet.has(t.korean)) ?? srcRoom.terms[0];
    const options = rng.shuffle([...group, intruder]).map((t) => ({ termId: t.id, term: t.term, korean: t.korean }));
    odd.push({ options, answerTermId: intruder.id, intruderRoomName: srcRoom.name });
  }

  // 5) 긴급 방송 (스피드 라운드)
  const speedTerms = takeUniqueKorean(byNeed(weakFirst), PUZZLE_SIZES.speed);
  const speed: SpeedItem[] = rng.shuffle(speedTerms).map((t) => {
    bump(t);
    const distractors = takeUniqueKorean(
      rng.shuffle(terms.filter((o) => o.id !== t.id && o.korean !== t.korean)),
      3,
    );
    const options = rng.shuffle([t, ...distractors]).map((o) => o.korean);
    return { termId: t.id, term: t.term, options, answer: t.korean };
  });

  // 코드 조각: 퍼즐마다 숫자 1개
  const digitsArr: string[] = [];
  while (digitsArr.length < 4) {
    const d = String(rng.int(10));
    if (digitsArr.length === 3 && digitsArr.every((x) => x === d)) continue; // 0000 같은 코드 회피
    digitsArr.push(d);
  }
  const hotspots: PuzzleHotspot[] = ['chart', 'monitor', 'locker', 'records'];
  const digits = Object.fromEntries(hotspots.map((h, i) => [h, digitsArr[i]])) as Record<PuzzleHotspot, string>;

  return { seed, code: digitsArr.join(''), digits, builder, diagnosis, matching, odd, speed };
}

/** 개발/검증용: 커버리지 통계 */
export function coverageReport(room: Room, p: RoomPuzzles): { min: number; avg: number; uncovered: string[] } {
  const count = new Map<string, number>(room.terms.map((t) => [t.id, 0]));
  const add = (id: string) => count.set(id, (count.get(id) ?? 0) + 1);
  p.builder.forEach((i) => add(i.termId));
  p.diagnosis.forEach((i) => add(i.termId));
  p.matching.forEach((i) => add(i.termId));
  p.odd.forEach((i) => i.options.forEach((o) => count.has(o.termId) && add(o.termId)));
  p.speed.forEach((i) => add(i.termId));
  const values = [...count.values()];
  return {
    min: Math.min(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    uncovered: [...count.entries()].filter(([, v]) => v === 0).map(([k]) => k),
  };
}
