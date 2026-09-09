import type { Hotspot, PuzzleHotspot } from '../types';
import { AvatarBody } from './Avatar';

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

const INK = '#1b2a41';

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
    <g className={`hotspot ${done ? 'done' : 'pending'}`} onClick={() => onOpen(id)} role="button" aria-label={LABELS[id]}>
      <g className="obj">{children}</g>
      <circle className="ring" cx={cx} cy={cy} r={r} fill="none" stroke="var(--warn)" strokeWidth={6} />
      <text className="label" x={cx} y={labelY} textAnchor="middle">
        {LABELS[id]}
      </text>
      {done && digit !== undefined && (
        <g>
          <circle cx={cx + r - 8} cy={cy - r + 8} r={24} fill="var(--warn)" stroke={INK} strokeWidth={4} />
          <text className="badge" x={cx + r - 8} y={cy - r + 18} textAnchor="middle">
            {digit}
          </text>
        </g>
      )}
      {done && id === 'speaker' && (
        <g>
          <circle cx={cx + 30} cy={cy - 20} r={16} fill="var(--ok)" stroke={INK} strokeWidth={3} />
          <path d={`M${cx + 22} ${cy - 20} l6 6 l10 -12`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/** 병동 내부 장면 — 로블록스 풍 카툰 병실. 클릭 가능한 오브젝트 6개 + 블록 캐릭터 */
export default function RoomScene({ solved, digits, speedDone, onOpen }: Props) {
  const isDone = (h: PuzzleHotspot) => solved.includes(h);
  const allDone = solved.length === 4;

  return (
    <svg className="scene" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="tiles" width="100" height="60" patternUnits="userSpaceOnUse">
          <rect width="100" height="60" fill="#e9eef5" />
          <rect x="0" y="0" width="50" height="30" fill="#f7f9fc" />
          <rect x="50" y="30" width="50" height="30" fill="#f7f9fc" />
        </pattern>
        <pattern id="stripes" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="var(--accent-light)" />
          <rect width="20" height="40" fill="rgba(255,255,255,0.35)" />
        </pattern>
      </defs>

      {/* 벽 */}
      <rect x="0" y="0" width="1200" height="450" fill="url(#stripes)" />
      <rect x="0" y="420" width="1200" height="32" fill="var(--accent)" stroke={INK} strokeWidth="4" />
      {/* 바닥 */}
      <rect x="0" y="450" width="1200" height="225" fill="url(#tiles)" />
      <line x1="0" y1="452" x2="1200" y2="452" stroke={INK} strokeWidth="5" />

      {/* 창문 (밤) */}
      <g>
        <rect x="880" y="60" width="250" height="190" rx="14" fill="#1e3a8a" stroke={INK} strokeWidth="6" />
        <line x1="1005" y1="60" x2="1005" y2="250" stroke={INK} strokeWidth="6" />
        <line x1="880" y1="155" x2="1130" y2="155" stroke={INK} strokeWidth="6" />
        <circle cx="1070" cy="110" r="26" fill="#fff5b8" stroke={INK} strokeWidth="4" />
        {[
          [910, 90], [950, 130], [1100, 200], [930, 210], [1040, 190],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 6} l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 z`} fill="#fff" />
        ))}
        <rect x="870" y="250" width="270" height="12" rx="4" fill="#fff" stroke={INK} strokeWidth="4" />
      </g>

      {/* 비상등 */}
      <g>
        <rect x="555" y="24" width="90" height="34" rx="8" fill="var(--bad)" stroke={INK} strokeWidth="4" />
        <text x="600" y="48" textAnchor="middle" fontSize="18" fill="#fff" fontFamily="var(--display)">EXIT</text>
      </g>

      {/* 침대 */}
      <g>
        <rect x="50" y="330" width="34" height="150" rx="6" fill="#4cc3ff" stroke={INK} strokeWidth="4" />
        <rect x="330" y="360" width="34" height="120" rx="6" fill="#4cc3ff" stroke={INK} strokeWidth="4" />
        <rect x="70" y="400" width="290" height="40" rx="8" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="150" y="380" width="200" height="30" rx="8" fill="var(--accent)" stroke={INK} strokeWidth="4" />
        <rect x="84" y="372" width="60" height="30" rx="8" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="70" y="440" width="290" height="20" rx="4" fill="#dbe4ef" stroke={INK} strokeWidth="4" />
      </g>

      {/* 링거 폴대 */}
      <g>
        <line x1="420" y1="290" x2="420" y2="470" stroke={INK} strokeWidth="6" />
        <rect x="402" y="285" width="36" height="56" rx="8" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="408" y="300" width="24" height="34" rx="4" fill="#ffd6e8" />
        <path d="M395 470 h50" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* 캐릭터 */}
      <g transform="translate(238 300) scale(1.05)">
        <g className="sprite">
          <AvatarBody pose={allDone ? 'cheer' : 'idle'} />
        </g>
      </g>

      {/* 문 + 키패드 */}
      <Hot id="door" cx={735} cy={330} r={112} labelY={462} done={allDone} onOpen={onOpen}>
        <rect x="628" y="140" width="214" height="316" rx="14" fill={allDone ? 'var(--ok)' : '#ff9f1c'} stroke={INK} strokeWidth="6" />
        <rect x="656" y="170" width="158" height="120" rx="10" fill="#dff4ff" stroke={INK} strokeWidth="4" />
        <line x1="735" y1="170" x2="735" y2="290" stroke={INK} strokeWidth="4" />
        <circle cx="806" cy="330" r="10" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="848" y="286" width="54" height="80" rx="10" fill="#fff" stroke={INK} strokeWidth="4" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={856 + c * 14} y={296 + r * 16} width="10" height="11" rx="3" fill={INK} />
          )),
        )}
        <circle cx="875" cy="354" r="6" fill={allDone ? 'var(--ok)' : 'var(--bad)'} stroke={INK} strokeWidth="2">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
      </Hot>

      {/* 환자 차트 */}
      <Hot id="chart" cx={200} cy={195} r={72} labelY={300} done={isDone('chart')} onOpen={onOpen} digit={digits.chart}>
        <rect x="145" y="125" width="110" height="145" rx="12" fill="#c68642" stroke={INK} strokeWidth="5" />
        <rect x="158" y="150" width="84" height="110" rx="6" fill="#fff" stroke={INK} strokeWidth="3" />
        <rect x="182" y="114" width="36" height="24" rx="8" fill="#9aa8bb" stroke={INK} strokeWidth="4" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="168" y={166 + i * 20} width={i % 2 ? 44 : 62} height="8" rx="4" fill="#dbe4ef" />
        ))}
        <path d="M170 240 l10 12 l22 -24" stroke="var(--bad)" strokeWidth="5" fill="none" strokeLinecap="round" />
      </Hot>

      {/* 모니터 */}
      <Hot id="monitor" cx={470} cy={205} r={84} labelY={322} done={isDone('monitor')} onOpen={onOpen} digit={digits.monitor}>
        <rect x="378" y="140" width="184" height="130" rx="14" fill="#fff" stroke={INK} strokeWidth="6" />
        <rect x="392" y="154" width="156" height="102" rx="8" fill={INK} />
        <polyline
          points="400,215 425,215 435,190 445,240 455,205 465,215 485,215 495,180 505,250 515,215 540,215"
          fill="none"
          stroke={isDone('monitor') ? 'var(--ok)' : '#5ef58a'}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <text x="402" y="172" fontSize="12" fill="#5ef58a" fontFamily="monospace">HR 72  SpO2 98</text>
        <rect x="455" y="270" width="30" height="22" fill="#9aa8bb" stroke={INK} strokeWidth="4" />
        <rect x="425" y="290" width="90" height="12" rx="6" fill="#9aa8bb" stroke={INK} strokeWidth="4" />
      </Hot>

      {/* 약품 보관함 */}
      <Hot id="locker" cx={1010} cy={372} r={82} labelY={484} done={isDone('locker')} onOpen={onOpen} digit={digits.locker}>
        <rect x="922" y="284" width="176" height="176" rx="14" fill="#fff" stroke={INK} strokeWidth="6" />
        <rect x="932" y="262" width="156" height="26" rx="8" fill="var(--bad)" stroke={INK} strokeWidth="4" />
        <path d="M1006 268 v14 M999 275 h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <line x1="1010" y1="284" x2="1010" y2="460" stroke={INK} strokeWidth="4" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={938 + i * 22} y="308" width="16" height="34" rx="6" fill="#4cc3ff" stroke={INK} strokeWidth="3" />
            <rect x={1024 + i * 22} y="308" width="16" height="34" rx="6" fill="#ffd23f" stroke={INK} strokeWidth="3" />
            <rect x={938 + i * 22} y="362" width="16" height="34" rx="6" fill="#38d16a" stroke={INK} strokeWidth="3" />
            <rect x={1024 + i * 22} y="362" width="16" height="34" rx="6" fill="#ff7ac6" stroke={INK} strokeWidth="3" />
          </g>
        ))}
        <circle cx="998" cy="420" r="6" fill={INK} />
        <circle cx="1022" cy="420" r="6" fill={INK} />
      </Hot>

      {/* 오염된 기록 (파일 캐비닛) */}
      <Hot id="records" cx={560} cy={545} r={74} labelY={648} done={isDone('records')} onOpen={onOpen} digit={digits.records}>
        <rect x="474" y="468" width="172" height="150" rx="12" fill="#8b5cf6" stroke={INK} strokeWidth="6" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="488" y={482 + i * 44} width="144" height="34" rx="8" fill="#e6dcff" stroke={INK} strokeWidth="3" />
            <rect x="545" y={495 + i * 44} width="30" height="8" rx="4" fill={INK} />
          </g>
        ))}
        <path d="M600 490 l26 -22 l16 28 l-32 12 z" fill="#ff4b4b" stroke={INK} strokeWidth="3" />
        <path d="M494 596 l22 -16 l26 24 l-40 10 z" fill="#ff4b4b" stroke={INK} strokeWidth="3" />
      </Hot>

      {/* 긴급 방송 스피커 */}
      <Hot id="speaker" cx={1140} cy={40} r={38} labelY={102} done={speedDone} onOpen={onOpen}>
        <rect x="1100" y="14" width="80" height="52" rx="12" fill="#fff" stroke={INK} strokeWidth="5" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="1112" y={24 + i * 13} width="56" height="6" rx="3" fill={INK} />
        ))}
        {!speedDone && (
          <g>
            <path d="M1092 30 q-10 10 0 20" fill="none" stroke="var(--bad)" strokeWidth="4" strokeLinecap="round">
              <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
            </path>
            <path d="M1082 22 q-18 18 0 36" fill="none" stroke="var(--bad)" strokeWidth="4" strokeLinecap="round">
              <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
            </path>
          </g>
        )}
      </Hot>
    </svg>
  );
}
