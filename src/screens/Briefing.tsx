import { useGame } from '../store/gameStore';
import { ROOM_BY_ID, LEARN_MINUTES, HINTS_PER_ROOM } from '../data/loadData';
import { sfx } from '../audio/sfx';
import Avatar from '../components/Avatar';

export default function Briefing() {
  const session = useGame((s) => s.session)!;
  const setPhase = useGame((s) => s.setPhase);
  const goto = useGame((s) => s.goto);
  const room = ROOM_BY_ID[session.roomId];

  return (
    <div className={`screen theme-${room.theme}`}>
      <div className="container narrow">
        <div className="panel">
          <div className="brief-head">
            <span className="fl">{room.floor}</span>
            <div>
              <h2>{room.name}</h2>
              <div className="muted small">{room.subtitle}</div>
            </div>
          </div>
          <span className="brief-avatar"><Avatar size={80} pose="think" /></span>
          <p className="brief">{room.briefing}</p>

          <div className="brief-steps">
            <div>
              <b>1. 환자 차트 열람</b>
              <span className="small muted">{LEARN_MINUTES}분 · 용어 {room.terms.length}개 플래시카드</span>
            </div>
            <div>
              <b>2. 탈출</b>
              <span className="small muted">40분 · 퍼즐 4개로 코드 조각 수집 → 키패드</span>
            </div>
            <div>
              <b>3. 힌트 {HINTS_PER_ROOM}개</b>
              <span className="small muted">사용 시 -100점 · 오답 -20점</span>
            </div>
          </div>

          <div className="row between" style={{ marginTop: 22 }}>
            <button className="btn ghost" onClick={() => goto('lobby')}>← 안내도</button>
            <button
              className="btn ok big bounce"
              onClick={() => {
                sfx.click();
                setPhase('learn');
              }}
            >
              📋 환자 차트 열람 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
