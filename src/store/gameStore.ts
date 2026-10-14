import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PuzzleHotspot, RoomResult } from '../types';
import { ESCAPE_SECONDS, HINTS_PER_ROOM, ROOMS } from '../data/loadData';
import { computeScore, SCORE } from '../engine/scoring';
import { randomSeed } from '../engine/seededRandom';
import type { StudentProfile } from '../firebase/student';

export type Screen = 'title' | 'lobby' | 'briefing' | 'learn' | 'room' | 'debrief' | 'host' | 'review' | 'ending';
export type Phase = 'briefing' | 'learn' | 'escape' | 'debrief';

export interface Session {
  lesson?: { id: string; classId: string; teamId: string; teamName: string };
  classWeak?: string[];
  roomId: string;
  seed: number;
  phase: Phase;
  learnStartedAt: number;
  seen: string[];
  weakSnapshot: string[];
  escapeStartedAt: number | null;
  penaltySec: number;
  hintsUsed: number;
  wrong: number;
  solved: PuzzleHotspot[];
  progress: Record<string, number>;
  speedDone: boolean;
  speedCorrect: number;
  keypadFails: number;
  wrongTerms: string[];
  hintedTerms: string[];
  failed: boolean;
  result: RoomResult | null;
}

export interface Team {
  name: string;
  members: number;
}

interface GameState {
  screen: Screen;
  mode: 'solo' | 'team';
  team: Team | null;
  unlocked: string[];
  allUnlocked: boolean;
  bestResults: Record<string, RoomResult>;
  weak: Record<string, true>;
  learnedRooms: Record<string, true>;
  session: Session | null;
  muted: boolean;
  musicOn: boolean;
  musicVolume: number;
  sfxVolume: number;
  student: StudentProfile | null;

  goto: (s: Screen) => void;
  setStudent: (p: StudentProfile | null) => void;
  setMode: (mode: 'solo' | 'team', team?: Team) => void;
  toggleAllUnlocked: () => void;
  setMuted: (m: boolean) => void;
  setMusicOn: (m: boolean) => void;
  setVolumes: (v: { musicVolume?: number; sfxVolume?: number }) => void;

  startRoom: (roomId: string) => void;
  startLesson: (roomId: string, lesson: NonNullable<Session['lesson']>) => void;
  setPhase: (p: Phase) => void;
  markSeen: (termId: string, known: boolean) => void;
  startEscape: () => void;
  useHint: (termId?: string) => boolean;
  addWrong: (termId?: string) => void;
  setProgress: (hotspot: string, idx: number) => void;
  solvePuzzle: (hotspot: PuzzleHotspot) => void;
  finishSpeed: (correct: number) => void;
  keypadAttempt: (input: string, code: string) => boolean;
  timeUp: () => void;
  retry: () => void;
  abandonRoom: () => void;
  clearWeak: (termId: string) => void;
  resetAll: () => void;
  exportProgress: () => string;
  importProgress: (json: string) => boolean;
}

const uniq = (arr: string[]) => Array.from(new Set(arr));

export function remainingSeconds(s: Session | null, now = Date.now()): number {
  if (!s || !s.escapeStartedAt) return ESCAPE_SECONDS;
  const used = (now - s.escapeStartedAt) / 1000 + s.penaltySec;
  return Math.max(0, ESCAPE_SECONDS - used);
}

export function usedSeconds(s: Session | null, now = Date.now()): number {
  return ESCAPE_SECONDS - remainingSeconds(s, now);
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'title',
      mode: 'solo',
      team: null,
      unlocked: [ROOMS[0]?.id ?? 'r1'],
      allUnlocked: false,
      bestResults: {},
      weak: {},
      learnedRooms: {},
      session: null,
      muted: false,
      musicOn: true,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      student: null,

      goto: (screen) => set({ screen }),
      setStudent: (student) => set({ student }),
      setMode: (mode, team) => set({ mode, team: mode === 'team' ? (team ?? null) : null }),
      toggleAllUnlocked: () => set((s) => ({ allUnlocked: !s.allUnlocked })),
      setMuted: (muted) => set({ muted }),
      setMusicOn: (musicOn) => set({ musicOn }),
      setVolumes: (v) => set(v),

      startRoom: (roomId) =>
        set({
          screen: 'briefing',
          session: {
            roomId,
            seed: randomSeed(),
            phase: 'briefing',
            learnStartedAt: Date.now(),
            seen: [],
            weakSnapshot: [],
            escapeStartedAt: null,
            penaltySec: 0,
            hintsUsed: 0,
            wrong: 0,
            solved: [],
            progress: {},
            speedDone: false,
            speedCorrect: 0,
            keypadFails: 0,
            wrongTerms: [],
            hintedTerms: [],
            failed: false,
            result: null,
          },
        }),

      setPhase: (phase) =>
        set((s) => {
          if (!s.session) return {};
          const next: Partial<GameState> = { session: { ...s.session, phase } };
          if (phase === 'learn') next.screen = 'learn';
          if (phase === 'escape') next.screen = 'room';
          if (phase === 'debrief') next.screen = 'debrief';
          if (phase === 'learn' && s.session.phase === 'briefing') {
            next.session = { ...s.session, phase, learnStartedAt: Date.now() };
          }
          return next;
        }),

      startLesson: (roomId, lesson) => {
        get().startRoom(roomId);
        set(s => ({ mode: 'solo', team: null, session: s.session ? { ...s.session, lesson, classWeak: [] } : null }));
      },

      markSeen: (termId, known) =>
        set((s) => {
          if (!s.session) return {};
          if (s.session.lesson) {
            const classWeak = known ? (s.session.classWeak ?? []).filter(id => id !== termId) : uniq([...(s.session.classWeak ?? []), termId]);
            return { session: { ...s.session, classWeak, seen: uniq([...s.session.seen, termId]) } };
          }
          const weak = { ...s.weak };
          if (known) delete weak[termId];
          else weak[termId] = true;
          return { weak, session: { ...s.session, seen: uniq([...s.session.seen, termId]) } };
        }),

      startEscape: () =>
        set((s) => {
          if (!s.session) return {};
          const room = ROOMS.find((r) => r.id === s.session!.roomId);
          const weakSnapshot = s.session.lesson ? (s.session.classWeak ?? []) : room ? room.terms.filter((t) => s.weak[t.id]).map((t) => t.id) : [];
          return {
            screen: 'room',
            learnedRooms: s.session.lesson ? s.learnedRooms : { ...s.learnedRooms, [s.session.roomId]: true },
            session: {
              ...s.session,
              phase: 'escape',
              escapeStartedAt: s.session.escapeStartedAt ?? Date.now(),
              weakSnapshot,
            },
          };
        }),

      useHint: (termId) => {
        const s = get().session;
        if (!s || s.hintsUsed >= HINTS_PER_ROOM) return false;
        set({
          session: {
            ...s,
            hintsUsed: s.hintsUsed + 1,
            hintedTerms: termId ? uniq([...s.hintedTerms, termId]) : s.hintedTerms,
          },
        });
        return true;
      },

      addWrong: (termId) =>
        set((s) => {
          if (!s.session) return {};
          const weak = termId && !s.session.lesson ? { ...s.weak, [termId]: true as const } : s.weak;
          return {
            weak,
            session: {
              ...s.session,
              wrong: s.session.wrong + 1,
              classWeak: s.session.lesson && termId ? uniq([...(s.session.classWeak ?? []), termId]) : s.session.classWeak,
              wrongTerms: termId ? uniq([...s.session.wrongTerms, termId]) : s.session.wrongTerms,
            },
          };
        }),

      setProgress: (hotspot, idx) =>
        set((s) => (s.session ? { session: { ...s.session, progress: { ...s.session.progress, [hotspot]: idx } } } : {})),

      solvePuzzle: (hotspot) =>
        set((s) =>
          s.session ? { session: { ...s.session, solved: uniq([...s.session.solved, hotspot]) as PuzzleHotspot[] } } : {},
        ),

      finishSpeed: (correct) =>
        set((s) => (s.session ? { session: { ...s.session, speedDone: true, speedCorrect: correct } } : {})),

      keypadAttempt: (input, code) => {
        const state = get();
        const s = state.session;
        if (!s) return false;
        if (input === code) {
          const timeUsedSec = Math.round(usedSeconds(s));
          const { score, stars } = computeScore({
            timeUsedSec,
            hintsUsed: s.hintsUsed,
            wrong: s.wrong,
            speedCorrect: s.speedCorrect,
            escaped: true,
          });
          const result: RoomResult = {
            roomId: s.roomId,
            score,
            stars,
            timeUsedSec,
            hintsUsed: s.hintsUsed,
            wrong: s.wrong,
            speedCorrect: s.speedCorrect,
            escaped: true,
            date: new Date().toISOString(),
          };
          const idx = ROOMS.findIndex((r) => r.id === s.roomId);
          const nextRoom = ROOMS[idx + 1];
          const prev = state.bestResults[s.roomId];
          set({
            screen: 'debrief',
            unlocked: s.lesson ? state.unlocked : uniq([...state.unlocked, ...(nextRoom ? [nextRoom.id] : [])]),
            bestResults: s.lesson ? state.bestResults : {
              ...state.bestResults,
              [s.roomId]: !prev || prev.score < score ? result : prev,
            },
            session: { ...s, phase: 'debrief', result },
          });
          return true;
        }
        set({
          session: {
            ...s,
            keypadFails: s.keypadFails + 1,
            wrong: s.wrong + 1,
            penaltySec: s.penaltySec + ((s.keypadFails + 1) % 3 === 0 ? SCORE.keypadFailPenaltySec : 0),
          },
        });
        return false;
      },

      timeUp: () =>
        set((s) => {
          if (!s.session || s.session.failed) return {};
          const result: RoomResult = {
            roomId: s.session.roomId,
            score: 0,
            stars: 1,
            timeUsedSec: ESCAPE_SECONDS,
            hintsUsed: s.session.hintsUsed,
            wrong: s.session.wrong,
            speedCorrect: s.session.speedCorrect,
            escaped: false,
            date: new Date().toISOString(),
          };
          return { screen: 'debrief', session: { ...s.session, failed: true, phase: 'debrief', result } };
        }),

      // 재도전: 퍼즐 진행은 유지, 타이머만 리셋
      retry: () =>
        set((s) =>
          s.session
            ? {
                screen: 'room',
                session: {
                  ...s.session,
                  phase: 'escape',
                  failed: false,
                  result: null,
                  escapeStartedAt: Date.now(),
                  penaltySec: 0,
                  keypadFails: 0,
                },
              }
            : {},
        ),

      abandonRoom: () => set({ session: null, screen: 'lobby' }),
      clearWeak: (termId) =>
        set((s) => {
            if (s.session?.lesson) return { session: { ...s.session, classWeak: (s.session.classWeak ?? []).filter(id => id !== termId) } };
          const weak = { ...s.weak };
          delete weak[termId];
          return { weak };
        }),

      resetAll: () =>
        set({
          screen: 'title',
          unlocked: [ROOMS[0]?.id ?? 'r1'],
          allUnlocked: false,
          bestResults: {},
          weak: {},
          learnedRooms: {},
          session: null,
        }),

      exportProgress: () => {
        const { unlocked, allUnlocked, bestResults, weak, learnedRooms, mode, team } = get();
        return JSON.stringify({ v: 1, unlocked, allUnlocked, bestResults, weak, learnedRooms, mode, team }, null, 2);
      },
      importProgress: (json) => {
        try {
          const d = JSON.parse(json);
          if (!d || d.v !== 1 || !Array.isArray(d.unlocked)) return false;
          const roomIds = new Set(ROOMS.map(r => r.id));
          const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
          const flags = (value: unknown) => record(value) && Object.values(value).every(flag => flag === true);
          if (!d.unlocked.every((id: unknown) => typeof id === 'string' && roomIds.has(id))) return false;
          if (d.allUnlocked !== undefined && typeof d.allUnlocked !== 'boolean') return false;
          if (!flags(d.weak ?? {}) || !flags(d.learnedRooms ?? {}) || !record(d.bestResults ?? {})) return false;
          for (const [id, result] of Object.entries(d.bestResults ?? {})) {
            if (!roomIds.has(id) || !record(result) || result.roomId !== id || typeof result.escaped !== 'boolean') return false;
            if (!Number.isInteger(result.score) || (result.score as number) < 0 || (result.score as number) > 2400) return false;
            if (!Number.isInteger(result.stars) || (result.stars as number) < 1 || (result.stars as number) > 3) return false;
            if (typeof result.timeUsedSec !== 'number' || !Number.isFinite(result.timeUsedSec) || result.timeUsedSec < 0 || result.timeUsedSec > ESCAPE_SECONDS) return false;
          }
          if (d.mode === 'team' && (!record(d.team) || typeof d.team.name !== 'string' || !d.team.name.trim() || !Number.isInteger(d.team.members) || (d.team.members as number) < 1 || (d.team.members as number) > 10)) return false;
          set({
            unlocked: uniq([ROOMS[0]?.id ?? 'r1', ...d.unlocked]),
            allUnlocked: !!d.allUnlocked,
            bestResults: d.bestResults ?? {},
            weak: d.weak ?? {},
            learnedRooms: d.learnedRooms ?? {},
            mode: d.mode === 'team' ? 'team' : 'solo',
            team: d.mode === 'team' ? d.team : null,
            session: null,
            screen: 'lobby',
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'medterm-escape-v1',
      // 화면 위치는 저장하지 않는다 → 새로 열면 항상 타이틀부터 (진행 중인 병동은 '이어하기'로 복귀)
      // 화면 위치와 '모든 병동 열기'(교수자 모드)는 저장하지 않는다 → 새로 열면 항상 타이틀, 잠금 상태로
      partialize: (s) => {
        const { screen: _screen, allUnlocked: _all, ...rest } = s;
        return rest as typeof s;
      },
      // 예전에 저장된 값도 무시
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<GameState>), screen: 'title' as Screen, allUnlocked: false }),
    },
  ),
);
