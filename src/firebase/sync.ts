/**
 * 학생 진행 기록 ↔ Firestore 동기화.
 *  - 로그인 시: 클라우드 기록을 불러와 로컬과 합친다 (열린 병동 합집합, 최고 점수는 높은 쪽)
 *  - 이후: 진행이 바뀔 때마다 1.5초 뒤 저장 (연타 방지)
 *  - 병동 탈출 시: results 컬렉션에 결과 1건 추가 (교수자 대시보드용)
 */
import { useGame } from '../store/gameStore';
import { ROOMS } from '../data/loadData';
import { isFirebaseConfigured } from './config';
import { loadProgress, saveProgress, pushResult, watchAuth, logoutStudent, type CloudProgress } from './student';
import type { RoomResult } from '../types';

let unsubStore: (() => void) | null = null;
let unsubAuth: (() => void) | null = null;
let saveTimer = 0;
let lastResultDate: string | null = null;

function snapshot(): CloudProgress {
  const s = useGame.getState();
  return { unlocked: s.unlocked, bestResults: s.bestResults, weak: s.weak, learnedRooms: s.learnedRooms };
}

export function mergeProgress(cloud: CloudProgress) {
  const s = useGame.getState();
  const best: Record<string, RoomResult> = { ...s.bestResults };
  for (const [roomId, r] of Object.entries(cloud.bestResults ?? {})) {
    if (!best[roomId] || (r.escaped && (!best[roomId].escaped || r.score > best[roomId].score))) best[roomId] = r;
  }
  useGame.setState({
    unlocked: Array.from(new Set([...(cloud.unlocked ?? []), ...s.unlocked])),
    bestResults: best,
    weak: { ...(cloud.weak ?? {}), ...s.weak },
    learnedRooms: { ...(cloud.learnedRooms ?? {}), ...s.learnedRooms },
  });
}

/** 로그인 직후 호출 */
export async function startSync() {
  if (!isFirebaseConfigured) return;
  const student = useGame.getState().student;
  if (!student) return;
  stopSync();

  const cloud = await loadProgress(student.studentId).catch(() => null);
  if (cloud) mergeProgress(cloud);
  await saveProgress(student.studentId, snapshot()).catch(() => undefined);
  lastResultDate = useGame.getState().session?.result?.date ?? null;

  unsubStore = useGame.subscribe((state, prev) => {
    const st = state.student;
    if (!st) return;
    const changed =
      state.unlocked !== prev.unlocked ||
      state.bestResults !== prev.bestResults ||
      state.weak !== prev.weak ||
      state.learnedRooms !== prev.learnedRooms;
    if (changed) {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        saveProgress(st.studentId, snapshot()).catch(() => undefined);
      }, 1500);
    }
    // 새 탈출 결과 → results 에 기록
    const r = state.session?.result;
    if (r && r.escaped && r.date !== lastResultDate) {
      lastResultDate = r.date;
      const room = ROOMS.find((x) => x.id === r.roomId);
      pushResult(st, r, {
        roomOrder: room?.order ?? 0,
        roomName: room?.name ?? r.roomId,
        wrongTerms: state.session?.wrongTerms ?? [],
        mode: state.mode,
        team: state.team?.name ?? null,
      }).catch(() => undefined);
    }
  });

  // Firebase 세션이 끊기면(다른 곳에서 로그아웃 등) 로컬 로그인도 해제
  unsubAuth = watchAuth((user) => {
    if (!user && useGame.getState().student) {
      useGame.getState().setStudent(null);
      stopSync();
    }
  });
}

export function stopSync() {
  unsubStore?.();
  unsubStore = null;
  unsubAuth?.();
  unsubAuth = null;
  window.clearTimeout(saveTimer);
}

export async function signOutStudent() {
  stopSync();
  useGame.getState().setStudent(null);
  if (isFirebaseConfigured) await logoutStudent().catch(() => undefined);
}
