import { useEffect, useRef, useState } from 'react';
import { useGame, remainingSeconds } from '../store/gameStore';
import { formatTime } from '../engine/scoring';
import { sfx } from '../audio/sfx';

export const ALARM_AT = 5 * 60;

export default function Timer({ onAlarmChange }: { onAlarmChange?: (on: boolean) => void }) {
  const session = useGame((s) => s.session);
  const timeUp = useGame((s) => s.timeUp);
  const [remain, setRemain] = useState(() => remainingSeconds(session));
  const alarmRef = useRef(false);
  const lastBeep = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const r = remainingSeconds(useGame.getState().session);
      setRemain(r);
      const alarm = r <= ALARM_AT && r > 0;
      if (alarm !== alarmRef.current) {
        alarmRef.current = alarm;
        onAlarmChange?.(alarm);
      }
      if (alarm && Date.now() - lastBeep.current > 10000) {
        lastBeep.current = Date.now();
        sfx.alarm();
      }
      if (r <= 0) {
        const s = useGame.getState().session;
        if (s && s.phase === 'escape' && !s.failed) {
          sfx.fail();
          timeUp();
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [onAlarmChange, timeUp]);

  const cls = remain <= 60 ? 'danger' : remain <= ALARM_AT ? 'warn' : '';
  return (
    <div className={`timer ${cls}`} title="남은 시간">
      ⏱ {formatTime(remain)}
    </div>
  );
}
