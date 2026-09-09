import type { Hotspot, PuzzleHotspot } from '../types';

interface Props {
  solved: PuzzleHotspot[];
  digits: Record<PuzzleHotspot, string>;
  speedDone: boolean;
  onOpen: (h: Hotspot) => void;
}

const LABELS: Record<Hotspot, string> = {
  chart: '📋 환자 차트',
  monitor: '🖥️ 모니터',
  locker: '💊 약품 보관함',
  records: '📁 오염된 기록',
  speaker: '📢 긴급 방송',
  door: '🚪 문 (키패드)',
};


interface HotProps {
  id: Hotspot;
  cx: number;
  cy: number;
  r?: number;
  labelY: number;
  children: React.ReactNode;
  done: boolean;
  digit?: string;
  onOpen: (h: Hotspot) => void;
}

function Hot({ id, cx, cy, r = 46, labelY, children, done, digit, onOpen }: HotProps) {
  return (
    <g
      className={`hotspot ${done ? 'done' : 'pending'}`}
      onClick={() => onOpen(id)}
      role="button"
      aria-label={LABELS[id]}
    >
      {children}
      <circle className="ring" cx={cx} cy={cy} r={r} fill="none" stroke="var(--accent)" strokeWidth={3} />
      <circle className="glow" cx={cx} cy={cy} r={r + 6} fill="none" stroke="var(--accent2)" strokeWidth={2} strokeDasharray="6 6" />
      <text className="label" x={cx} y={labelY} textAnchor="middle">
        {LABELS[id]}
      </text>
      {done && digit !== undefined && (
        <g>
          <circle cx={cx + r - 10} cy={cy - r + 10} r={22} fill="var(--accent)" stroke="#061018" strokeWidth={3} />
          <text className="badge" x={cx + r - 10} y={cy - r + 19} textAnchor="middle">
            {digit}
          </text>
        </g>
      )}
      {done && id === 'speaker' && (
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={22}>✔</text>
      )}
    </g>
  );
}

/** 병동 내부 장면 — 클릭 가능한 오브젝트 6개 */
export default function RoomScene({ solved, digits, speedDone, onOpen }: Props) {
  const isDone = (h: PuzzleHotspot) => solved.includes(h);
  const allDone = solved.length === 4;

  return (
    <svg className="scene" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2740" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2937" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
        <linearGradient id="moon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#93c5fd" stopOpacity="0.35" />
          <stop offset="1" stopColor="#93c5fd" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lamp">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 벽/바닥 */}
      <rect x="0" y="0" width="1200" height="470" fill="url(#wall)" />
      <rect x="0" y="470" width="1200" height="205" fill="url(#floor)" />
      <line x1="0" y1="470" x2="1200" y2="470" stroke="#334155" strokeWidth="3" />
      <rect x="0" y="440" width="1200" height="30" fill="#0d1526" opacity="0.6" />
      {/* 바닥 타일 */}
      {[...Array(9)].map((_, i) => (
        <line key={i} x1={i * 150} y1="470" x2={i * 150 - 120} y2="675" stroke="#1e293b" strokeWidth="2" />
      ))}
      <line x1="0" y1="560" x2="1200" y2="560" stroke="#1e293b" strokeWidth="2" />

      {/* 창문 + 달빛 */}
      <rect x="880" y="70" width="240" height="180" rx="6" fill="#0b1220" stroke="#334155" strokeWidth="6" />
      <line x1="1000" y1="70" x2="1000" y2="250" stroke="#334155" strokeWidth="6" />
      <line x1="880" y1="160" x2="1120" y2="160" stroke="#334155" strokeWidth="6" />
      <circle cx="1060" cy="120" r="26" fill="#cbd5e1" opacity="0.8" />
      <polygon points="880,250 1120,250 1190,470 800,470" fill="url(#moon)" />

      {/* 비상등 */}
      <rect x="560" y="30" width="80" height="26" rx="6" fill="#7f1d1d" />
      <text x="600" y="49" textAnchor="middle" fontSize="15" fill="#fecaca" fontWeight="700">EXIT</text>
      <ellipse cx="600" cy="120" rx="220" ry="90" fill="url(#lamp)" />

      {/* 침대 */}
      <rect x="60" y="400" width="300" height="24" rx="4" fill="#334155" />
      <rect x="70" y="424" width="280" height="60" rx="6" fill="#1e293b" />
      <rect x="60" y="360" width="16" height="130" fill="#475569" />
      <rect x="344" y="370" width="16" height="120" fill="#475569" />
      <rect x="80" y="380" width="70" height="22" rx="6" fill="#cbd5e1" opacity="0.7" />
      <rect x="150" y="386" width="190" height="18" rx="4" fill="#38bdf8" opacity="0.35" />

      {/* 링거 폴대 */}
      <line x1="420" y1="300" x2="420" y2="480" stroke="#64748b" strokeWidth="4" />
      <rect x="405" y="300" width="30" height="50" rx="6" fill="#e2e8f0" opacity="0.6" />
      <path d="M405 480 l-20 0 M420 480 l20 0" stroke="#64748b" strokeWidth="4" />

      {/* 문 + 키패드 */}
      <Hot id="door" cx={735} cy={330} r={110} labelY={455} done={allDone} onOpen={onOpen}>
        <rect x="640" y="150" width="190" height="300" rx="6" fill={allDone ? '#134e4a' : '#1e293b'} stroke="#475569" strokeWidth="5" />
        <rect x="660" y="175" width="150" height="120" rx="4" fill="#0b1220" stroke="#334155" strokeWidth="3" />
        <circle cx="800" cy="320" r="7" fill="#94a3b8" />
        <rect x="838" y="290" width="46" height="70" rx="6" fill="#0b1220" stroke={allDone ? 'var(--ok)' : 'var(--bad)'} strokeWidth="3" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={845 + c * 12} y={300 + r * 14} width="8" height="9" rx="2" fill="#475569" />
          )),
        )}
        <circle cx="861" cy="352" r="4" fill={allDone ? 'var(--ok)' : 'var(--bad)'}>
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
      </Hot>

      {/* 환자 차트 (벽 클립보드) */}
      <Hot id="chart" cx={200} cy={200} r={70} labelY={300} done={isDone('chart')} onOpen={onOpen} digit={digits.chart}>
        <rect x="150" y="130" width="100" height="140" rx="6" fill="#92400e" stroke="#451a03" strokeWidth="3" />
        <rect x="160" y="150" width="80" height="112" fill="#f1f5f9" />
        <rect x="185" y="122" width="30" height="18" rx="4" fill="#94a3b8" />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="170" y1={170 + i * 18} x2={i % 2 ? 215 : 230} y2={170 + i * 18} stroke="#94a3b8" strokeWidth="3" />
        ))}
        <path d="M172 240 l10 12 l20 -24" stroke="#ef4444" strokeWidth="3" fill="none" />
      </Hot>

      {/* 모니터 */}
      <Hot id="monitor" cx={470} cy={210} r={80} labelY={318} done={isDone('monitor')} onOpen={onOpen} digit={digits.monitor}>
        <rect x="385" y="150" width="170" height="115" rx="8" fill="#0b1220" stroke="#475569" strokeWidth="5" />
        <polyline
          points="395,215 420,215 430,190 440,240 450,205 460,215 480,215 490,180 500,250 510,215 545,215"
          fill="none"
          stroke={isDone('monitor') ? 'var(--ok)' : '#22c55e'}
          strokeWidth="3"
        />
        <text x="395" y="170" fontSize="12" fill="#22c55e" fontFamily="monospace">HR 72  SpO2 98</text>
        <rect x="455" y="265" width="30" height="20" fill="#475569" />
        <rect x="430" y="285" width="80" height="8" rx="3" fill="#475569" />
      </Hot>

      {/* 약품 보관함 */}
      <Hot id="locker" cx={1010} cy={370} r={78} labelY={478} done={isDone('locker')} onOpen={onOpen} digit={digits.locker}>
        <rect x="930" y="290" width="160" height="160" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="4" />
        <line x1="1010" y1="290" x2="1010" y2="450" stroke="#475569" strokeWidth="3" />
        <rect x="945" y="305" width="55" height="14" fill="#38bdf8" opacity="0.5" />
        <rect x="1020" y="305" width="55" height="14" fill="#f472b6" opacity="0.5" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={945 + i * 20} y="335" width="14" height="30" rx="3" fill="#e2e8f0" opacity="0.8" />
            <rect x={1020 + i * 20} y="335" width="14" height="30" rx="3" fill="#fbbf24" opacity="0.8" />
            <rect x={945 + i * 20} y="385" width="14" height="30" rx="3" fill="#a3e635" opacity="0.8" />
            <rect x={1020 + i * 20} y="385" width="14" height="30" rx="3" fill="#e2e8f0" opacity="0.8" />
          </g>
        ))}
        <circle cx="1000" cy="372" r="4" fill="#94a3b8" />
        <circle cx="1020" cy="372" r="4" fill="#94a3b8" />
        <rect x="935" y="270" width="150" height="10" fill="#ef4444" opacity="0.7" />
        <text x="1010" y="279" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">MEDICATION</text>
      </Hot>

      {/* 오염된 기록 (파일 캐비닛) */}
      <Hot id="records" cx={560} cy={540} r={70} labelY={640} done={isDone('records')} onOpen={onOpen} digit={digits.records}>
        <rect x="480" y="470" width="160" height="140" rx="6" fill="#334155" stroke="#1e293b" strokeWidth="4" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="490" y={480 + i * 43} width="140" height="36" rx="4" fill="#475569" />
            <rect x="545" y={493 + i * 43} width="30" height="8" rx="3" fill="#94a3b8" />
          </g>
        ))}
        <path d="M600 500 l25 -20 l15 25 l-30 12 z" fill="#ef4444" opacity="0.5" />
        <path d="M500 590 l20 -15 l25 22 l-38 10 z" fill="#7f1d1d" opacity="0.6" />
      </Hot>

      {/* 긴급 방송 스피커 */}
      <Hot id="speaker" cx={1140} cy={40} r={34} labelY={98} done={speedDone} onOpen={onOpen}>
        <rect x="1105" y="18" width="70" height="44" rx="8" fill="#334155" stroke="#475569" strokeWidth="3" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="1115" y1={26 + i * 10} x2="1165" y2={26 + i * 10} stroke="#0b1220" strokeWidth="3" />
        ))}
        {!speedDone && (
          <circle cx="1170" cy="22" r="6" fill="#fbbf24">
            <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite" />
          </circle>
        )}
      </Hot>
    </svg>
  );
}
