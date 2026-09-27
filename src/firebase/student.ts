/**
 * 학생 계정: 학번 + PIN.
 *  - Firebase Auth 이메일/비밀번호를 내부적으로 사용 (이메일 = 학번-g{세대}@stu.medterm.app)
 *  - logins/{학번}     : { gen }  — 누구나 읽기 가능. PIN 초기화 시 교수자가 gen을 올린다
 *  - users/{학번}      : 학생 정보 + 진행 기록. 본인과 담당 교수자만 읽기
 *  - classes/{classId} : 반. joinCode로 조회
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  addDoc,
} from 'firebase/firestore';
import { fb } from './app';
import { STUDENT_EMAIL_DOMAIN } from './config';
import type { RoomResult } from '../types';

export interface StudentProfile {
  uid: string;
  studentId: string;
  nickname: string;
  classId: string;
  className: string;
  teacherUid: string;
}

export interface CloudProgress {
  unlocked: string[];
  bestResults: Record<string, RoomResult>;
  weak: Record<string, true>;
  learnedRooms: Record<string, true>;
}

const normalizeId = (s: string) => s.trim().replace(/\s+/g, '');
const emailFor = (studentId: string, gen: number) => `${normalizeId(studentId).toLowerCase()}-g${gen}@${STUDENT_EMAIL_DOMAIN}`;
const passwordFor = (pin: string) => `pin-${pin.trim()}-medterm`; // Firebase 최소 6자 규칙 충족

async function readGen(studentId: string): Promise<number> {
  const { db } = fb();
  const snap = await getDoc(doc(db, 'logins', normalizeId(studentId)));
  return snap.exists() ? (snap.data().gen as number) ?? 0 : 0;
}

export async function findClassByCode(joinCode: string): Promise<{ id: string; name: string; teacherUid: string } | null> {
  const { db } = fb();
  const q = query(collection(db, 'classes'), where('joinCode', '==', joinCode.trim().toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, name: d.data().name, teacherUid: d.data().teacherUid };
}

/** 가입 (또는 PIN 초기화 후 재가입) */
export async function registerStudent(input: { studentId: string; nickname: string; pin: string; joinCode: string }): Promise<StudentProfile> {
  const { auth, db } = fb();
  const studentId = normalizeId(input.studentId);
  if (!/^[0-9A-Za-z_-]{3,20}$/.test(studentId)) throw new Error('학번은 3~20자의 숫자/영문으로 입력하세요.');
  if (!/^\d{4,6}$/.test(input.pin.trim())) throw new Error('PIN은 4~6자리 숫자로 입력하세요.');
  if (!/^[A-Z0-9]{6}$/.test(input.joinCode.trim().toUpperCase())) throw new Error('반 코드는 6자리입니다.');

  // 이미 가입된 학번인지 확인 (logins 는 로그인 전에도 읽을 수 있음). 초기화 대기 상태면 재가입 허용
  const loginRef = doc(db, 'logins', studentId);
  const loginSnap = await getDoc(loginRef);
  const gen = loginSnap.exists() ? (loginSnap.data().gen as number) ?? 0 : 0;
  const resetPending = loginSnap.exists() && loginSnap.data().resetPending === true;
  if (loginSnap.exists() && !resetPending) {
    throw new Error('이미 가입된 학번입니다. PIN을 잊었다면 교수자에게 PIN 초기화를 요청하세요.');
  }

  // 계정을 먼저 만들고(로그인 상태가 되어야 반을 조회할 수 있음), 반 코드가 틀리면 계정을 되돌린다
  const cred = await createUserWithEmailAndPassword(auth, emailFor(studentId, gen), passwordFor(input.pin));
  const uid = cred.user.uid;
  let cls: Awaited<ReturnType<typeof findClassByCode>> = null;
  try {
    cls = await findClassByCode(input.joinCode);
  } catch {
    cls = null;
  }
  if (!cls) {
    await cred.user.delete().catch(() => undefined);
    throw new Error('반 코드를 찾을 수 없습니다. 교수자에게 확인하세요.');
  }

  const profile: StudentProfile = {
    uid,
    studentId,
    nickname: input.nickname.trim() || studentId,
    classId: cls.id,
    className: cls.name,
    teacherUid: cls.teacherUid,
  };
  const userRef = doc(db, 'users', studentId);
  const existing = resetPending ? await getDoc(userRef).catch(() => null) : null;
  const prevProgress = existing?.exists() ? existing.data().progress : undefined;
  await setDoc(
    userRef,
    {
      uid,
      studentId,
      nickname: profile.nickname,
      classId: cls.id,
      className: cls.name,
      teacherUid: cls.teacherUid,
      progress: prevProgress ?? { unlocked: [], bestResults: {}, weak: {}, learnedRooms: {} },
      updatedAt: serverTimestamp(),
      createdAt: existing?.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(loginRef, { gen, resetPending: false, uid }, { merge: true });
  return profile;
}

export async function loginStudent(studentId: string, pin: string): Promise<StudentProfile> {
  const { auth } = fb();
  const id = normalizeId(studentId);
  const gen = await readGen(id);
  await signInWithEmailAndPassword(auth, emailFor(id, gen), passwordFor(pin));
  const profile = await loadProfile(id);
  if (!profile) throw new Error('학생 정보를 찾을 수 없습니다.');
  return profile;
}

export async function loadProfile(studentId: string): Promise<StudentProfile | null> {
  const { db } = fb();
  const snap = await getDoc(doc(db, 'users', normalizeId(studentId)));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { uid: d.uid, studentId: d.studentId, nickname: d.nickname, classId: d.classId, className: d.className, teacherUid: d.teacherUid };
}

export async function loadProgress(studentId: string): Promise<CloudProgress | null> {
  const { db } = fb();
  const snap = await getDoc(doc(db, 'users', normalizeId(studentId)));
  if (!snap.exists()) return null;
  const p = snap.data().progress ?? {};
  return { unlocked: p.unlocked ?? [], bestResults: p.bestResults ?? {}, weak: p.weak ?? {}, learnedRooms: p.learnedRooms ?? {} };
}

export async function saveProgress(studentId: string, progress: CloudProgress): Promise<void> {
  const { db } = fb();
  await updateDoc(doc(db, 'users', normalizeId(studentId)), { progress, updatedAt: serverTimestamp() });
}

export async function pushResult(profile: StudentProfile, r: RoomResult, extra: { roomOrder: number; roomName: string; wrongTerms: string[]; mode: string; team: string | null }) {
  const { db } = fb();
  await addDoc(collection(db, 'results'), {
    uid: profile.uid,
    studentId: profile.studentId,
    nickname: profile.nickname,
    classId: profile.classId,
    teacherUid: profile.teacherUid,
    roomId: r.roomId,
    roomOrder: extra.roomOrder,
    roomName: extra.roomName,
    score: r.score,
    stars: r.stars,
    timeUsedSec: r.timeUsedSec,
    hintsUsed: r.hintsUsed,
    wrong: r.wrong,
    speedCorrect: r.speedCorrect,
    escaped: r.escaped,
    wrongTerms: extra.wrongTerms,
    mode: extra.mode,
    team: extra.team,
    date: r.date,
    createdAt: serverTimestamp(),
  });
}

export async function logoutStudent() {
  const { auth } = fb();
  await signOut(auth);
}

export function watchAuth(cb: (user: User | null) => void) {
  const { auth } = fb();
  return onAuthStateChanged(auth, cb);
}
