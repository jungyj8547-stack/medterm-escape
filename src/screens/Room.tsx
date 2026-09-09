import { useCallback, useMemo, useState } from 'react';
import { useGame } from '../store/gameStore';
import { ROOM_BY_ID, ROOMS, HINTS_PER_ROOM } from '../data/loadData';
import { generateRoomPuzzles } from '../engine/puzzleGen';
import type { Hotspot, PuzzleHotspot } from '../types';
import RoomScene from '../components/RoomScene';
import Timer from '../components/Timer';
import Modal from '../components/Modal';
import ToastHost, { toast } from '../components/Toast';
import WordBuilder from '../puzzles/WordBuilder';
import Diagnosis from '../puzzles/Diagnosis';
import Matching from '../puzzles/Matching';
import OddOneOut from '../puzzles/OddOneOut';
import SpeedRound from '../puzzles/SpeedRound';
import Keypad from '../puzzles/Keypad';
import { sfx } from '../audio/sfx';

const TITLES: Record<Hotspot, { icon: string; title: string }> = {
  chart: { icon: '📋', title: '환자 차트 — 어근 조립' },
  monitor: { icon: '🖥️', title: '모니터 — 진단 내리기' },
  locker: { icon: '💊', title: '약품 보관함 — 짝 맞추기' },
  records: { icon: '📁', title: '오염된 기록 — 침입 단어 찾기' },
  speaker: { icon: '📢', title: '긴급 방송 — 스피드 라운드' },
  door: { icon: '🚪', title: '문 — 키패드' },
};

export default function RoomScreen() {
  const session = useGame((s) => s.session)!;
  const solvePuzzle = useGame((s) => s.solvePuzzle);
  const goto = useGame((s) => s.goto);
  const abandonRoom = useGame((s) => s.abandonRoom);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const room = ROOM_BY_ID[session.roomId];
  const [active, setActive] = useState<Hotspot | null>(null);
  const [alarm, setAlarm] = useState(false);
  const [popDigit, setPopDigit] = useState<string | null>(null);

  const puzzles = useMemo(
    () => generateRoomPuzzles(room, ROOMS, new Set(session.weakSnapshot), session.seed),
    [room, session.seed, session.weakSnapshot],
  );

  const onAlarm = useCallback((on: boolean) => setAlarm(on), []);

  // 개발 모드에서만: 테스트/디버깅용으로 퍼즐 데이터를 노출
  if (import.meta.env.DEV) (window as unknown as { __puzzles: unknown }).__puzzles = puzzles;

  const open = (h: Hotspot) => {
    sfx.click();
    if (h === 'door' && session.solved.length < 4) {
      toast(`코드 조각이 부족합니다 (${session.solved.length} / 4)`);
      return;
    }
    setActive(h);
  };

  const solved = (h: PuzzleHotspot) => {
    if (!session.solved.includes(h)) {
      solvePuzzle(h);
      sfx.fragment();
      setPopDigit(puzzles.digits[h]);
      window.setTimeout(() => setPopDigit(null), 1500);
    }
    setActive(null);
  };

  const order: PuzzleHotspot[] = ['chart', 'monitor', 'locker', 'records'];

  return (
    <div className={`room theme-${room.theme}`}>
      {alarm && <div className="alarm-overlay" />}
      <ToastHost />
      {popDigit && (
        <div className="fragment-pop">
          <div className="digit">{popDigit}</div>
          <div className="caption">코드 조각 GET!</div>
        </div>
      )}

      <header className="topbar">
        <div className="room-name">
          <span className="fl">{room.floor}</span>
          {room.name}
        </div>
        <Timer onAlarmChange={onAlarm} />
        <div className="hints" title="남은 힌트">
          {[...Array(HINTS_PER_ROOM)].map((_, i) => (
            <span key={i} className={`bulb ${i < HINTS_PER_ROOM - session.hintsUsed ? 'on' : ''}`}>💡</span>
          ))}
        </div>
        <div className="inventory" title="코드 조각">
          {order.map((h) => (
            <div key={h} className={`slot ${session.solved.includes(h) ? 'filled' : ''}`}>
              {session.solved.includes(h) ? puzzles.digits[h] : '?'}
            </div>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn small ghost" onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</button>
        <button
          className="btn small ghost"
          onClick={() => {
            if (confirm('병동을 나가면 이 병동의 진행이 사라집니다. 나갈까요?')) abandonRoom();
          }}
        >
          나가기
        </button>
      </header>

      <div className="scene-wrap">
        <RoomScene solved={session.solved} digits={puzzles.digits} speedDone={session.speedDone} onOpen={open} />
      </div>
      <div className="room-help">
        ✨ 반짝이는 물건을 눌러 퍼즐을 풀자! 코드 조각 4개를 모으면 문이 열린다.
      </div>

      {active && (
        <Modal
          title={TITLES[active].title}
          icon={TITLES[active].icon}
          onClose={() => setActive(null)}
          right={
            active !== 'door' && active !== 'speaker' && session.solved.includes(active) ? (
              <span className="tag accent">해결됨 · 조각 {puzzles.digits[active]}</span>
            ) : undefined
          }
        >
          {active === 'chart' && <WordBuilder items={puzzles.builder} onSolved={() => solved('chart')} />}
          {active === 'monitor' && <Diagnosis items={puzzles.diagnosis} onSolved={() => solved('monitor')} />}
          {active === 'locker' &&
            (session.solved.includes('locker') ? (
              <SolvedNote digit={puzzles.digits.locker} />
            ) : (
              <Matching pairs={puzzles.matching} onSolved={() => solved('locker')} />
            ))}
          {active === 'records' && <OddOneOut items={puzzles.odd} roomId={room.id} onSolved={() => solved('records')} />}
          {active === 'speaker' && <SpeedRound items={puzzles.speed} onClose={() => setActive(null)} />}
          {active === 'door' && <Keypad code={puzzles.code} onEscaped={() => goto('debrief')} />}
        </Modal>
      )}
    </div>
  );
}

function SolvedNote({ digit }: { digit: string }) {
  return (
    <div className="center stack">
      <div style={{ fontSize: 40 }}>💊</div>
      <p>보관함은 이미 열렸습니다.</p>
      <div className="abbr-big">{digit}</div>
    </div>
  );
}
