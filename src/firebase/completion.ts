import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { fb } from './app';
import { ROOMS } from '../data/loadData';
import { completionFor, type CompletionEntry } from '../engine/completion';
import { ensureStudentClass, studentMemberId, type CloudProgress, type StudentProfile } from './student';

export async function publishCompletion(student: StudentProfile, progress: CloudProgress) {
  await ensureStudentClass(student);
  const ref = doc(fb().db, 'classes', student.classId, 'completions', studentMemberId(student));
  const completion = completionFor(ROOMS.map(r => r.id), progress.bestResults);
  if (completion) await setDoc(ref, { ...completion, memberId: studentMemberId(student), nickname: student.nickname });
  else await deleteDoc(ref);
}

export function watchCompletions(classId: string, cb: (entries: CompletionEntry[]) => void, fail: (e: Error) => void) {
  return onSnapshot(collection(fb().db, 'classes', classId, 'completions'), snap => cb(snap.docs.map(d => d.data() as CompletionEntry)), fail);
}
