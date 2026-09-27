import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function fb(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!isFirebaseConfigured) throw new Error('Firebase가 설정되지 않았습니다');
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app: app!, auth: auth!, db: db! };
}

/** 사용자에게 보여줄 오류 메시지 */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': '이미 가입된 학번(또는 이메일)입니다.',
    'auth/invalid-credential': '학번 또는 PIN이 맞지 않습니다.',
    'auth/wrong-password': 'PIN이 맞지 않습니다.',
    'auth/user-not-found': '가입되지 않은 학번입니다.',
    'auth/weak-password': 'PIN은 4자리 이상이어야 합니다.',
    'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 해주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
    'auth/invalid-email': '형식이 올바르지 않습니다.',
    'permission-denied': '권한이 없습니다. 반 코드나 가입 코드를 확인해 주세요.',
  };
  if (map[code]) return map[code];
  const msg = (e as { message?: string })?.message ?? String(e);
  return msg.length > 120 ? '오류가 발생했습니다. 다시 시도해 주세요.' : msg;
}
