/**
 * 교수자 계정과 반 관리.
 *  - teachers/{uid}  : 교수자. 가입 시 inviteCode가 config/teacher.inviteCode와 같아야 규칙이 허용
 *  - classes/{id}    : { name, teacherUid, joinCode }
 *  - users, results  : teacherUid == 내 uid 인 문서만 읽기
 */
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { fb } from './app';

export interface TeacherProfile {
  uid: string;
  email: string;
  name: string;
}
export interface ClassInfo {
  id: string;
  name: string;
  joinCode: string;
  createdAt?: unknown;
}
export interface StudentRow {
  studentId: string;
  nickname: string;
  classId: string;
  className: string;
  uid: string;
  progress: { unlocked: string[]; bestResults: Record<string, { score: number; stars: number; timeUsedSec: number; escaped: boolean }>; weak: Record<string, true> };
  updatedAt?: { toDate?: () => Date };
}
export interface ResultRow {
  id: string;
  studentId: string;
  nickname: string;
  classId: string;
  roomId: string;
  roomOrder: number;
  roomName: string;
  score: number;
  stars: number;
  timeUsedSec: number;
  hintsUsed: number;
  wrong: number;
  wrongTerms: string[];
  mode: string;
  team: string | null;
  date: string;
}

const JOIN_ALPHA = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const makeJoinCode = () => Array.from({ length: 6 }, () => JOIN_ALPHA[Math.floor(Math.random() * JOIN_ALPHA.length)]).join('');

export async function registerTeacher(email: string, password: string, name: string, inviteCode: string): Promise<TeacherProfile> {
  const { auth, db } = fb();
  let cred;
  let createdNow = false;
  try {
    cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    createdNow = true;
  } catch (e) {
    // 이전에 가입 코드가 틀려 계정만 남은 경우: 비밀번호가 맞으면 이어서 교수자 등록
    if ((e as { code?: string })?.code !== 'auth/email-already-in-use') throw e;
    cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const exists = await getDoc(doc(db, 'teachers', cred.user.uid));
    if (exists.exists()) throw new Error('이미 가입된 교수자입니다. 로그인해 주세요.');
  }
  const uid = cred.user.uid;
  try {
    await setDoc(doc(db, 'teachers', uid), { email: email.trim(), name: name.trim() || email, inviteCode: inviteCode.trim(), createdAt: serverTimestamp() });
  } catch {
    // 가입 코드가 틀리면 규칙이 거부 → 방금 만든 계정은 지우고, 기존 계정이면 로그아웃만
    if (createdNow) await cred.user.delete().catch(() => undefined);
    await signOut(auth).catch(() => undefined);
    throw new Error('교수자 가입 코드가 맞지 않습니다.');
  }
  return { uid, email: email.trim(), name: name.trim() || email };
}

export async function loginTeacher(email: string, password: string): Promise<TeacherProfile> {
  const { auth, db } = fb();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const snap = await getDoc(doc(db, 'teachers', cred.user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    throw new Error('교수자 계정이 아닙니다.');
  }
  return { uid: cred.user.uid, email: snap.data().email, name: snap.data().name };
}

export async function currentTeacher(user: User): Promise<TeacherProfile | null> {
  const { db } = fb();
  const snap = await getDoc(doc(db, 'teachers', user.uid));
  if (!snap.exists()) return null;
  return { uid: user.uid, email: snap.data().email, name: snap.data().name };
}

export async function logoutTeacher() {
  const { auth } = fb();
  await signOut(auth);
}

export function watchTeacherAuth(cb: (user: User | null) => void) {
  const { auth } = fb();
  return onAuthStateChanged(auth, cb);
}

export async function listClasses(teacherUid: string): Promise<ClassInfo[]> {
  const { db } = fb();
  const snap = await getDocs(query(collection(db, 'classes'), where('teacherUid', '==', teacherUid)));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, joinCode: d.data().joinCode, createdAt: d.data().createdAt }));
}

export async function createClass(teacherUid: string, name: string): Promise<ClassInfo> {
  const { db } = fb();
  const joinCode = makeJoinCode();
  const ref = await addDoc(collection(db, 'classes'), { name: name.trim(), teacherUid, joinCode, createdAt: serverTimestamp() });
  return { id: ref.id, name: name.trim(), joinCode };
}

export async function deleteClass(classId: string) {
  const { db } = fb();
  await deleteDoc(doc(db, 'classes', classId));
}

/** 내 반 학생 목록 (실시간) */
export function watchStudents(teacherUid: string, cb: (rows: StudentRow[]) => void) {
  const { db } = fb();
  return onSnapshot(query(collection(db, 'users'), where('teacherUid', '==', teacherUid)), (snap) => {
    cb(snap.docs.map((d) => d.data() as StudentRow));
  });
}

/** 내 반 결과 (실시간, 최신순) */
export function watchResults(teacherUid: string, cb: (rows: ResultRow[]) => void) {
  const { db } = fb();
  return onSnapshot(query(collection(db, 'results'), where('teacherUid', '==', teacherUid)), (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ResultRow, 'id'>) }));
    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    cb(rows);
  });
}

/** PIN 초기화: 다음 가입 때 새 계정으로 같은 학번을 쓸 수 있게 세대를 올린다 */
export async function resetStudentPin(studentId: string) {
  const { db } = fb();
  const ref = doc(db, 'logins', studentId);
  const snap = await getDoc(ref);
  const gen = snap.exists() ? (snap.data().gen as number) ?? 0 : 0;
  await setDoc(ref, { gen: gen + 1, resetPending: true }, { merge: true });
}

/** 학생을 다른 반으로 옮기기 / 별명 수정 */
export async function updateStudent(studentId: string, patch: { nickname?: string; classId?: string; className?: string }) {
  const { db } = fb();
  await updateDoc(doc(db, 'users', studentId), patch);
}
