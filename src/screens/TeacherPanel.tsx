import { useEffect, useMemo, useState } from 'react';
import { ROOMS, TERM_BY_ID } from '../data/loadData';
import { formatTime } from '../engine/scoring';
import { isFirebaseConfigured } from '../firebase/config';
import { friendlyError } from '../firebase/app';
import {
  createClass,
  currentTeacher,
  deleteClass,
  listClasses,
  loginTeacher,
  logoutTeacher,
  registerTeacher,
  resetStudentPin,
  watchResults,
  watchStudents,
  watchTeacherAuth,
  type ClassInfo,
  type ResultRow,
  type StudentRow,
  type TeacherProfile,
} from '../firebase/teacher';
import { toast } from '../components/Toast';
import { askConfirm } from '../components/ConfirmDialog';

/** 진행자 페이지의 교수자 영역: 로그인 → 반 관리 / 학생 현황 / 결과 */
export default function TeacherPanel() {
  const [teacher, setTeacher] = useState<TeacherProfile | null | undefined>(undefined);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setTeacher(null);
      return;
    }
    return watchTeacherAuth(async (user) => {
      if (!user) return setTeacher(null);
      setTeacher(await currentTeacher(user));
    });
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <div className="panel">
        <b>클라우드(Firebase)가 아직 연결되지 않았습니다.</b>
        <div className="small muted">연결되면 여기서 교수자 로그인, 반 만들기, 학생별 진행 현황과 실시간 결과를 볼 수 있습니다.</div>
      </div>
    );
  }
  if (teacher === undefined) return <div className="panel muted">확인 중…</div>;
  if (!teacher) return <TeacherAuth onLogin={setTeacher} />;
  return <Dashboard teacher={teacher} onLogout={() => setTeacher(null)} />;
}

function TeacherAuth({ onLogin }: { onLogin: (t: TeacherProfile) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = mode === 'login' ? await loginTeacher(email, password) : await registerTeacher(email, password, name, invite);
      onLogin(t);
      toast(`${t.name} 님, 환영합니다`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel stack" style={{ maxWidth: 520 }}>
      <div className="row between">
        <h3>{mode === 'login' ? '👩‍🏫 교수자 로그인' : '👩‍🏫 교수자 가입'}</h3>
        <button className="btn small ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? '가입하기 →' : '← 로그인'}
        </button>
      </div>
      <div className="field"><label>이메일</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></div>
      <div className="field"><label>비밀번호 (6자 이상)</label><input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
      {mode === 'register' && (
        <>
          <div className="field"><label>이름 (학생에게 표시되지 않음)</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>교수자 가입 코드</label><input className="input" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="관리자에게 받은 코드" /></div>
        </>
      )}
      {error && <div className="feedback bad">{error}</div>}
      <button className="btn primary" disabled={busy || !email || password.length < 6} onClick={submit}>
        {busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입'}
      </button>
    </div>
  );
}

function Dashboard({ teacher, onLogout }: { teacher: TeacherProfile; onLogout: () => void }) {
  const [tab, setTab] = useState<'classes' | 'students' | 'results'>('students');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [classFilter, setClassFilter] = useState('');

  const refreshClasses = () => listClasses(teacher.uid).then(setClasses).catch((e) => toast(friendlyError(e)));
  useEffect(() => {
    refreshClasses();
    const u1 = watchStudents(teacher.uid, setStudents);
    const u2 = watchResults(teacher.uid, setResults);
    return () => {
      u1();
      u2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.uid]);

  const classOf = (id: string) => classes.find((c) => c.id === id)?.name ?? '-';
  const filteredStudents = students.filter((s) => !classFilter || s.classId === classFilter).sort((a, b) => a.studentId.localeCompare(b.studentId));
  const filteredResults = results.filter((r) => !classFilter || r.classId === classFilter);

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <b>👩‍🏫 {teacher.name}</b> <span className="muted small">{teacher.email}</span>
        </div>
        <div className="row">
          <select className="input" style={{ width: 'auto', padding: '6px 10px' }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">전체 반</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn small" onClick={async () => { await logoutTeacher(); onLogout(); }}>로그아웃</button>
        </div>
      </div>
      <div className="tabs">
        <button className={tab === 'students' ? 'on' : ''} onClick={() => setTab('students')}>👥 학생 현황 ({filteredStudents.length})</button>
        <button className={tab === 'results' ? 'on' : ''} onClick={() => setTab('results')}>🏆 실시간 결과 ({filteredResults.length})</button>
        <button className={tab === 'classes' ? 'on' : ''} onClick={() => setTab('classes')}>🏫 반 관리 ({classes.length})</button>
      </div>
      {tab === 'classes' && <Classes teacher={teacher} classes={classes} onChange={refreshClasses} />}
      {tab === 'students' && <Students rows={filteredStudents} classOf={classOf} />}
      {tab === 'results' && <Results rows={filteredResults} classOf={classOf} />}
    </div>
  );
}

function Classes({ teacher, classes, onChange }: { teacher: TeacherProfile; classes: ClassInfo[]; onChange: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="stack">
      <div className="panel">
        <b>반 만들기</b>
        <div className="small muted" style={{ marginBottom: 10 }}>반을 만들면 6자리 반 코드가 생깁니다. 학생은 이 코드로 가입합니다.</div>
        <div className="row">
          <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="예: 2026-1 간호학과 2학년 A반" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && createClass(teacher.uid, name).then(() => { setName(''); onChange(); })} />
          <button className="btn primary" disabled={!name.trim()} onClick={() => createClass(teacher.uid, name).then(() => { setName(''); onChange(); toast('반을 만들었습니다'); }).catch((e) => toast(friendlyError(e)))}>만들기</button>
        </div>
      </div>
      <div className="panel">
        <b>내 반</b>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="board">
            <thead><tr><th>반 이름</th><th>반 코드</th><th></th></tr></thead>
            <tbody>
              {classes.length === 0 && <tr><td colSpan={3} className="muted center">아직 반이 없습니다</td></tr>}
              {classes.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td><span className="result-code" style={{ fontSize: 22, padding: '4px 12px', display: 'inline-block' }}>{c.joinCode}</span></td>
                  <td>
                    <button className="btn small" onClick={() => navigator.clipboard?.writeText(c.joinCode).then(() => toast('반 코드를 복사했습니다'))}>복사</button>{' '}
                    <button className="btn small danger" onClick={async () => { if (await askConfirm(`"${c.name}" 반을 삭제할까요? 학생 기록은 남지만 새로 가입할 수 없게 됩니다.`, { okLabel: '삭제', danger: true })) { await deleteClass(c.id); onChange(); } }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Students({ rows, classOf }: { rows: StudentRow[]; classOf: (id: string) => string }) {
  const summary = (s: StudentRow) => {
    const best = s.progress?.bestResults ?? {};
    const cleared = ROOMS.filter((r) => best[r.id]?.escaped);
    const total = cleared.reduce((a, r) => a + (best[r.id]?.score ?? 0), 0);
    const stars = cleared.reduce((a, r) => a + (best[r.id]?.stars ?? 0), 0);
    const top = cleared.length ? cleared[cleared.length - 1].floor : '-';
    const weakCount = Object.keys(s.progress?.weak ?? {}).length;
    return { cleared: cleared.length, total, stars, top, weakCount };
  };
  const exportCsv = () => {
    const head = '학번,별명,반,통과 병동 수,최고 층,총점,별 합계,약한 단어 수';
    const lines = rows.map((s) => { const m = summary(s); return [s.studentId, s.nickname, classOf(s.classId), m.cleared, m.top, m.total, m.stars, m.weakCount].join(','); });
    const blob = new Blob(['﻿' + [head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="panel">
      <div className="row between" style={{ marginBottom: 10 }}>
        <b>학생 현황</b>
        <button className="btn small" onClick={exportCsv} disabled={!rows.length}>CSV 내보내기</button>
      </div>
      <div className="table-wrap">
        <table className="board">
          <thead><tr><th>학번</th><th>별명</th><th>반</th><th>진행</th><th>총점</th><th>별</th><th>약한 단어</th><th>마지막 활동</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="muted center">아직 가입한 학생이 없습니다</td></tr>}
            {rows.map((s) => {
              const m = summary(s);
              const weakTerms = Object.keys(s.progress?.weak ?? {}).map((id) => TERM_BY_ID[id]?.term).filter(Boolean).slice(0, 6).join(', ');
              return (
                <tr key={s.studentId}>
                  <td className="mono">{s.studentId}</td>
                  <td><b>{s.nickname}</b></td>
                  <td className="small">{classOf(s.classId)}</td>
                  <td>{m.cleared} / {ROOMS.length} <span className="muted small">({m.top}까지)</span></td>
                  <td className="mono">{m.total}</td>
                  <td style={{ color: 'var(--warn-dark)' }}>{m.stars}★</td>
                  <td className="small" title={weakTerms}>{m.weakCount}개{weakTerms ? ` · ${weakTerms}` : ''}</td>
                  <td className="small muted">{s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>
                    <button className="btn small" title="학생이 PIN을 잊었을 때. 초기화 후 학생이 같은 학번으로 다시 가입하면 기록이 이어집니다" onClick={async () => { if (await askConfirm(`${s.nickname}(${s.studentId})의 PIN을 초기화할까요? 학생은 같은 학번으로 다시 가입하면 됩니다.`, { okLabel: 'PIN 초기화', danger: true })) { await resetStudentPin(s.studentId).then(() => toast('초기화했습니다. 학생에게 다시 가입하라고 알려주세요')).catch((e) => toast(friendlyError(e))); } }}>PIN 초기화</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Results({ rows, classOf }: { rows: ResultRow[]; classOf: (id: string) => string }) {
  const [roomFilter, setRoomFilter] = useState(0);
  const [view, setView] = useState<'feed' | 'board'>('board');
  const filtered = rows.filter((r) => !roomFilter || r.roomOrder === roomFilter);
  // 리더보드: 학생별(또는 팀별) 병동당 최고 점수 합
  const board = useMemo(() => {
    const map = new Map<string, { name: string; cls: string; best: Record<string, number>; latest: string }>();
    for (const r of filtered) {
      const key = r.mode === 'team' && r.team ? `team:${r.team}` : r.studentId;
      const name = r.mode === 'team' && r.team ? `👥 ${r.team}` : r.nickname;
      const e = map.get(key) ?? { name, cls: classOf(r.classId), best: {}, latest: r.date };
      e.best[r.roomId] = Math.max(e.best[r.roomId] ?? 0, r.score);
      if (r.date > e.latest) e.latest = r.date;
      map.set(key, e);
    }
    return [...map.values()].map((e) => ({ ...e, total: Object.values(e.best).reduce((a, b) => a + b, 0), rooms: Object.keys(e.best).length })).sort((a, b) => b.total - a.total);
  }, [filtered, classOf]);
  const exportCsv = () => {
    const head = '학번,별명,반,병동,점수,별,시간(초),힌트,오답,모드,팀,틀린 단어,일시';
    const lines = rows.map((r) => [r.studentId, r.nickname, classOf(r.classId), r.roomName, r.score, r.stars, r.timeUsedSec, r.hintsUsed, r.wrong, r.mode, r.team ?? '', (r.wrongTerms ?? []).map((id) => TERM_BY_ID[id]?.term ?? id).join(' / '), r.date].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + [head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `results-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="panel">
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row">
          <div className="tabs" style={{ margin: 0 }}>
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>리더보드</button>
            <button className={view === 'feed' ? 'on' : ''} onClick={() => setView('feed')}>탈출 기록</button>
          </div>
          <select className="input" style={{ width: 'auto', padding: '6px 10px' }} value={roomFilter} onChange={(e) => setRoomFilter(Number(e.target.value))}>
            <option value={0}>전체 병동</option>
            {ROOMS.map((r) => <option key={r.id} value={r.order}>{r.floor} {r.name}</option>)}
          </select>
        </div>
        <button className="btn small" onClick={exportCsv} disabled={!rows.length}>CSV 내보내기</button>
      </div>
      <div className="table-wrap">
        {view === 'board' ? (
          <table className="board">
            <thead><tr><th>순위</th><th>이름</th><th>반</th><th>통과 병동</th><th>총점</th></tr></thead>
            <tbody>
              {board.length === 0 && <tr><td colSpan={5} className="muted center">아직 결과가 없습니다. 학생이 탈출하면 여기에 바로 나타납니다.</td></tr>}
              {board.map((e, i) => (
                <tr key={e.name + e.cls} className={i === 0 ? 'top' : ''}><td>{i + 1}</td><td><b>{e.name}</b></td><td className="small">{e.cls}</td><td>{e.rooms}</td><td className="mono">{e.total}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="board">
            <thead><tr><th>일시</th><th>학생</th><th>반</th><th>병동</th><th>점수</th><th>별</th><th>시간</th><th>힌트/오답</th><th>틀린 단어</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="muted center">아직 결과가 없습니다</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="small muted">{new Date(r.date).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><b>{r.nickname}</b> <span className="muted small">{r.studentId}</span>{r.team && <span className="tag" style={{ marginLeft: 4 }}>👥 {r.team}</span>}</td>
                  <td className="small">{classOf(r.classId)}</td>
                  <td className="small">{r.roomName}</td>
                  <td className="mono">{r.score}</td>
                  <td style={{ color: 'var(--warn-dark)' }}>{'★'.repeat(r.stars)}</td>
                  <td className="mono">{formatTime(r.timeUsedSec)}</td>
                  <td className="small">{r.hintsUsed} / {r.wrong}</td>
                  <td className="small muted">{(r.wrongTerms ?? []).map((id) => TERM_BY_ID[id]?.term ?? id).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
