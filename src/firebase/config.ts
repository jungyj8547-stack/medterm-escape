/**
 * Firebase 웹 앱 설정.
 * Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) 에 나오는 firebaseConfig 값을 그대로 넣는다.
 * (이 값들은 공개되어도 되는 식별자다. 접근 제어는 Firestore 보안 규칙이 담당한다)
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyByV-0CDYN8z8h3LgIjDc7U5B0wtjPiW24',
  authDomain: 'medterm-escape.firebaseapp.com',
  projectId: 'medterm-escape',
  storageBucket: 'medterm-escape.firebasestorage.app',
  messagingSenderId: '528416636776',
  appId: '1:528416636776:web:827c0d931ff907eef220dd',
};

/** 설정이 비어 있으면 게임은 로그인 없이(브라우저 저장) 동작한다 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** 학번을 Firebase Auth 이메일로 바꿀 때 쓰는 도메인 (실제 메일은 가지 않는다) */
export const STUDENT_EMAIL_DOMAIN = 'stu.medterm.app';
