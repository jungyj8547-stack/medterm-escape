import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { isFirebaseConfigured } from '../firebase/config';
import { loginStudent, registerStudent, updateNickname } from '../firebase/student';
import { friendlyError } from '../firebase/app';
import { startSync, signOutStudent, resetMyProgress } from '../firebase/sync';
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
  const [editingName, setEditingName] = useState(false);

  if (!isFirebaseConfigured) return null;

  if (student) {
    return (
      <div className="panel stack" style={{ marginBottom: 16 }}>
      <div className="row between">
        <div>
          <b>👤 {student.nickname}</b> <span className="muted small">({student.studentId})</span>
          <div className="small muted">🏫 {student.className} · 진행 기록이 자동 저장됩니다</div>
        </div>
        <div className="row">
          <button className="btn small" onClick={() => { setNickname(student.nickname); setError(null); setEditingName(!editingName); }}>내 별명 바꾸기</button>
          <button
            className="btn small ghost"
            onClick={async () => {
              if (await askConfirm('내 기록(열린 병동, 점수, 약한 단어)을 모두 지우고 1F부터 다시 시작할까요? 되돌릴 수 없습니다.', { okLabel: '기록 초기화', danger: true })) {
                await resetMyProgress();
              }
            }}
          >
            내 기록 초기화
          </button>
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
      </div>
      {editingName && <div className="stack"><label className="field">내 별명 (최대 12자)<input className="input" value={nickname} maxLength={12} onChange={e => setNickname(e.target.value)} /></label><div className="row"><button className="btn primary" disabled={busy || !nickname.trim()} onClick={async () => { setBusy(true); setError(null); try { setStudent(await updateNickname(student, nickname)); setEditingName(false); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>별명 저장</button><button className="btn ghost" disabled={busy} onClick={() => { setEditingName(false); setError(null); }}>취소</button></div><p className="small muted">내 계정과 완주 인증서의 이름을 바꿉니다. 팀 배정과 점수는 유지됩니다.</p></div>}
      {error && <div className="feedback bad">{error}</div>}
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
