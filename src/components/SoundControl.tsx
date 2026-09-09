import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/sfx';

/** 🔊 버튼 → 배경음악/효과음 볼륨 슬라이더 팝오버 */
export default function SoundControl({ compact = false }: { compact?: boolean }) {
  const s = useGame();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const allOff = !s.musicOn && s.muted;
  return (
    <div className="sound" ref={ref}>
      <button className="btn small" onClick={() => setOpen(!open)} title="소리 설정">
        {allOff ? '🔇' : '🔊'}
        {compact ? '' : ' 소리'}
      </button>
      {open && (
        <div className="sound-pop">
          <div className="sound-row">
            <label>
              <input type="checkbox" checked={s.musicOn} onChange={(e) => s.setMusicOn(e.target.checked)} /> 🎵 배경음악
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(s.musicVolume * 100)}
              disabled={!s.musicOn}
              onChange={(e) => s.setVolumes({ musicVolume: Number(e.target.value) / 100 })}
            />
            <span>{Math.round(s.musicVolume * 100)}</span>
          </div>
          <div className="sound-row">
            <label>
              <input type="checkbox" checked={!s.muted} onChange={(e) => s.setMuted(!e.target.checked)} /> 🔔 효과음
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(s.sfxVolume * 100)}
              disabled={s.muted}
              onChange={(e) => s.setVolumes({ sfxVolume: Number(e.target.value) / 100 })}
              onMouseUp={() => sfx.correct()}
              onTouchEnd={() => sfx.correct()}
            />
            <span>{Math.round(s.sfxVolume * 100)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
