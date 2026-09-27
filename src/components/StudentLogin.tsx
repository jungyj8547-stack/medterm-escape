import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { isFirebaseConfigured } from '../firebase/config';
import { loginStudent, registerStudent } from '../firebase/student';
import { friendlyError } from '../firebase/app';
import { startSync, signOutStudent } from '../firebase/sync';
import { sfx } from '../audio/sfx';
import { askConfirm } from '../components/ConfirmDialog';

/** 타이틀 화면의 학생 로그인/가입 패널 */
export default function StudentLogin({ onDone }: { onDone: () => void }) {
  const student = useGame((s) => s.student);
  const setStudent = useGame((s) => s.setStudent);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isFirebaseConfigured) return null;

  if (student) {
    return (
      <div className="panel row between" style={{ marginBottom: 16 }}>
        <div>
          <b>👤 {student.nickname}</b> <span className="muted small">({student.studentId})</span>
          <div className="small muted">🏫 {student.className} · 진행 기록이 자동 저장됩니다</div>
        </div>
        <button
          className="btn small"
          onClick={async () => {
            if (await askConfirm('로그아웃할까요? 기록은 클라우드에 남아 있고, 다시 로그인하면 이어할 수 있습니다.', { okLabel: '로그아웃' })) {
              await signOutStudent();
            }
          }}
        >
          로그아웃
        </button>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const profile =
        mode === 'login'
          ? await loginStudent(studentId, pin)
          : await registerStudent({ studentId, nickname, pin, joinCode });
      setStudent(profile);
      await startSync();
      sfx.correct();
      onDone();
    } catch (e) {
      sfx.wrong();
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel stack" style={{ marginBottom: 16 }}>
      <div className="row between">
        <h3>{mode === 'login' ? '🔑 학생 로그인' : '📝 처음이면 가입'}</h3>
        <button className="btn small ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {mode === 'login' ? '처음이면 가입하기 →' : '← 이미 가입했어요'}
        </button>
      </div>
      <div className="login-grid">
        {mode === 'register' && (
          <div className="field">
            <label>반 코드 (교수님이 알려준 6자리)</label>
            <input className="input mono" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="예: K7Q2MX" maxLength={6} />
          </div>
        )}
        <div className="field">
          <label>학번</label>
          <input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20261234" inputMode="numeric" />
        </div>
        {mode === 'register' && (
          <div className="field">
            <label>별명 (리더보드에 표시)</label>
            <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 심장왕" maxLength={12} />
          </div>
        )}
        <div className="field">
          <label>PIN (숫자 4~6자리)</label>
          <input
            className="input"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            inputMode="numeric"
            maxLength={6}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
      </div>
      {error && <div className="feedback bad">{error}</div>}
      <div className="row between">
        <span className="small muted">로그인하면 어느 기기에서든 이어할 수 있어요.</span>
        <button className="btn primary" disabled={busy || !studentId || pin.length < 4 || (mode === 'register' && joinCode.length < 6)} onClick={submit}>
          {busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입하고 시작'}
        </button>
      </div>
    </div>
  );
}
