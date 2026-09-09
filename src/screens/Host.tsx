import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/gameStore';
import { ROOMS } from '../data/loadData';
import { decodeResult } from '../engine/resultCode';
import { formatTime } from '../engine/scoring';
import ToastHost, { toast } from '../components/Toast';
import { sfx } from '../audio/sfx';

interface Entry {
  id: string;
  team: string;
  roomOrder: number;
  score: number;
  timeUsedSec: number;
  stars: number;
  code: string;
  at: string;
}

const KEY = 'medterm-host-v1';
const load = (): Entry[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export default function Host() {
  const [tab, setTab] = useState<'board' | 'timer' | 'settings'>('board');
  return (
    <div className="screen">
      <ToastHost />
      <div className="container">
        <div className="row between" style={{ marginBottom: 14 }}>
          <div>
            <h2>진행자 페이지</h2>
            <div className="small muted">코드 블루: 봉쇄 병원 탈출 · 수업용</div>
          </div>
          <a className="btn small ghost" href="#" onClick={() => (window.location.hash = '')}>← 게임으로</a>
        </div>
        <div className="tabs">
          <button className={tab === 'board' ? 'on' : ''} onClick={() => setTab('board')}>🏆 리더보드</button>
          <button className={tab === 'timer' ? 'on' : ''} onClick={() => setTab('timer')}>⏱ 대형 타이머</button>
          <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>⚙️ 교수자 설정</button>
        </div>
        {tab === 'board' && <Board />}
        {tab === 'timer' && <BigTimer />}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  );
}

function Board() {
  const [entries, setEntries] = useState<Entry[]>(load);
  const [team, setTeam] = useState('');
  const [code, setCode] = useState('');
  const [filter, setFilter] = useState<number>(0);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(entries)), [entries]);

  const add = () => {
    const d = decodeResult(code);
    if (!d) {
      toast('코드가 올바르지 않습니다. 다시 확인해 주세요.');
      return;
    }
    if (!team.trim()) {
      toast('팀 이름을 입력하세요');
      return;
    }
    const e: Entry = { id: `${Date.now()}`, team: team.trim(), code: code.trim().toUpperCase(), at: new Date().toISOString(), ...d };
    setEntries([...entries, e]);
    setCode('');
    toast(`${e.team} · ${e.score}점 등록`);
  };

  const rows = entries
    .filter((e) => filter === 0 || e.roomOrder === filter)
    .sort((a, b) => b.score - a.score || a.timeUsedSec - b.timeUsedSec);

  const exportCsv = () => {
    const head = '팀,병동,점수,시간(초),별,코드,등록시각';
    const lines = entries.map((e) => [e.team, ROOMS[e.roomOrder - 1]?.name ?? e.roomOrder, e.score, e.timeUsedSec, e.stars, e.code, e.at].join(','));
    const blob = new Blob(['﻿' + [head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <div className="panel">
        <b>결과 코드 등록</b>
        <div className="small muted" style={{ marginBottom: 10 }}>팀이 탈출 후 화면에 표시된 코드(예: R3-2K7QX-M)를 입력하세요.</div>
        <div className="row">
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="팀 이름" value={team} onChange={(e) => setTeam(e.target.value)} />
          <input
            className="input mono"
            style={{ flex: 1, minWidth: 180, textTransform: 'uppercase' }}
            placeholder="결과 코드"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn primary" onClick={add}>등록</button>
        </div>
      </div>

      <div className="panel">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row">
            <b>리더보드</b>
            <select className="input" style={{ width: 'auto', padding: '6px 10px' }} value={filter} onChange={(e) => setFilter(Number(e.target.value))}>
              <option value={0}>전체 병동</option>
              {ROOMS.map((r) => (
                <option key={r.id} value={r.order}>{r.floor} {r.name}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <button className="btn small" onClick={exportCsv} disabled={!entries.length}>CSV 내보내기</button>
            <button className="btn small danger" disabled={!entries.length} onClick={() => confirm('리더보드를 비울까요?') && setEntries([])}>비우기</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="board">
            <thead>
              <tr><th>순위</th><th>팀</th><th>병동</th><th>점수</th><th>시간</th><th>별</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="muted center">아직 등록된 결과가 없습니다</td></tr>
              )}
              {rows.map((e, i) => (
                <tr key={e.id} className={i === 0 ? 'top' : ''}>
                  <td>{i + 1}</td>
                  <td><b>{e.team}</b></td>
                  <td className="small">{ROOMS[e.roomOrder - 1]?.name ?? `R${e.roomOrder}`}</td>
                  <td className="mono">{e.score}</td>
                  <td className="mono">{formatTime(e.timeUsedSec)}</td>
                  <td style={{ color: 'var(--warn)' }}>{'★'.repeat(e.stars)}</td>
                  <td><button className="close" title="삭제" onClick={() => setEntries(entries.filter((x) => x.id !== e.id))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const s = useGame();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const blob = new Blob([s.exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `medterm-escape-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((t) => toast(s.importProgress(t) ? '진행 상황을 불러왔습니다' : '올바른 진행 파일이 아닙니다'));
  };

  return (
    <div className="stack">
      <div className="panel">
        <div className="row between">
          <div>
            <b>병동 잠금 해제</b>
            <div className="small muted">기본은 1F부터 차례로 열립니다. 수업 순서에 맞춰 모든 병동을 열 수 있습니다. (이 브라우저에만 적용)</div>
          </div>
          <label className="row" style={{ cursor: 'pointer', fontFamily: 'var(--display)' }}>
            <input type="checkbox" checked={s.allUnlocked} onChange={s.toggleAllUnlocked} /> 모든 병동 열기
          </label>
        </div>
      </div>
      <div className="panel">
        <b>학생 진행 데이터</b>
        <div className="small muted" style={{ marginBottom: 12 }}>이 브라우저에 저장된 진행(잠금 해제, 점수, 약한 단어)을 파일로 백업하거나 불러옵니다.</div>
        <div className="row">
          <button className="btn small" onClick={exportFile}>진행 내보내기</button>
          <button className="btn small" onClick={() => fileRef.current?.click()}>진행 가져오기</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          <span style={{ flex: 1 }} />
          <button
            className="btn small danger"
            onClick={() => {
              if (confirm('이 브라우저의 모든 진행 상황(점수, 잠금 해제, 약한 단어)을 초기화할까요?')) {
                s.resetAll();
                toast('초기화했습니다');
              }
            }}
          >
            진행 초기화
          </button>
        </div>
      </div>
      <div className="panel small muted">
        학생 기기에서 처음부터 시작하게 하려면 주소 뒤에 <b className="mono">#reset</b>을 붙여 접속하게 하세요. 예: <span className="mono">http://주소/#reset</span>
      </div>
    </div>
  );
}

function BigTimer() {
  const [total, setTotal] = useState(40 * 60);
  const [left, setLeft] = useState(40 * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);
  const [custom, setCustom] = useState(40);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        setRunning(false);
        sfx.fail();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  };
  const reset = (sec: number) => {
    setRunning(false);
    setTotal(sec);
    setLeft(sec);
  };

  return (
    <div className="panel center stack">
      <div className={`big-timer ${left <= 300 && left > 0 && running ? 'danger' : ''}`}>{formatTime(left)}</div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {!running ? (
          <button className="btn primary big" onClick={start} disabled={left <= 0}>▶ 시작</button>
        ) : (
          <button className="btn big" onClick={() => { setRunning(false); setLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))); }}>⏸ 일시정지</button>
        )}
        <button className="btn big" onClick={() => reset(total)}>↺ 리셋</button>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn small" onClick={() => reset(18 * 60)}>학습 18:00</button>
        <button className="btn small" onClick={() => reset(40 * 60)}>탈출 40:00</button>
        <span className="row small">
          <input className="input" type="number" min={1} max={120} style={{ width: 80 }} value={custom} onChange={(e) => setCustom(Number(e.target.value) || 1)} />
          분
          <button className="btn small" onClick={() => reset(custom * 60)}>설정</button>
        </span>
      </div>
      <div className="small muted">프로젝터에 띄워 두면 모든 팀이 같은 시간을 봅니다. 5분 남으면 붉게 깜빡입니다.</div>
    </div>
  );
}
