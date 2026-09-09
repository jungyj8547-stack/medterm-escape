/** 로블록스 풍 블록 캐릭터 (SVG). Avatar = 단독 사용, AvatarBody = 다른 SVG 안에 <g>로 삽입 */
export type Pose = 'idle' | 'cheer' | 'think' | 'sad';

interface BodyProps {
  pose?: Pose;
  skin?: string;
  shirt?: string;
  pants?: string;
}

export function AvatarBody({ pose = 'idle', skin = '#ffd83d', shirt = '#2f6fed', pants = '#3fbf5b' }: BodyProps) {
  const ink = '#1b2a41';
  const armUp = pose === 'cheer';
  const think = pose === 'think';
  return (
    <g className={`avatar-body pose-${pose}`} stroke={ink} strokeWidth={4} strokeLinejoin="round">
      {/* 다리 */}
      <rect x="22" y="112" width="24" height="42" rx="4" fill={pants} />
      <rect x="54" y="112" width="24" height="42" rx="4" fill={pants} />
      {/* 팔 */}
      {armUp ? (
        <>
          <rect x="-4" y="30" width="22" height="46" rx="4" fill={skin} transform="rotate(-20 7 53)" />
          <rect x="82" y="30" width="22" height="46" rx="4" fill={skin} transform="rotate(20 93 53)" />
        </>
      ) : think ? (
        <>
          <rect x="-2" y="62" width="22" height="46" rx="4" fill={skin} />
          <rect x="70" y="40" width="22" height="46" rx="4" fill={skin} transform="rotate(-60 81 63)" />
        </>
      ) : (
        <>
          <rect x="-2" y="62" width="22" height="46" rx="4" fill={skin} />
          <rect x="80" y="62" width="22" height="46" rx="4" fill={skin} />
        </>
      )}
      {/* 몸통 (가운) */}
      <rect x="18" y="60" width="64" height="56" rx="6" fill={shirt} />
      <rect x="26" y="66" width="48" height="44" rx="4" fill="#ffffff" stroke="none" opacity="0.92" />
      <path d="M40 66 l10 14 l10 -14" fill="none" stroke={ink} strokeWidth={3} />
      <circle cx="62" cy="88" r="5" fill="#ff4b4b" stroke="none" />
      <rect x="36" y="94" width="14" height="10" rx="2" fill="#4cc3ff" stroke="none" />
      {/* 머리 */}
      <rect x="20" y="8" width="60" height="52" rx="10" fill={skin} />
      {/* 얼굴 */}
      {pose === 'sad' ? (
        <>
          <line x1="34" y1="28" x2="44" y2="32" strokeWidth={4} strokeLinecap="round" />
          <line x1="66" y1="28" x2="56" y2="32" strokeWidth={4} strokeLinecap="round" />
          <path d="M40 48 q10 -8 20 0" fill="none" strokeWidth={4} strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="38" cy="32" r="4" fill={ink} stroke="none" />
          <circle cx="62" cy="32" r="4" fill={ink} stroke="none" />
          <path d={pose === 'cheer' ? 'M36 42 q14 14 28 0' : 'M38 44 q12 8 24 0'} fill="none" strokeWidth={4} strokeLinecap="round" />
        </>
      )}
      {/* 청진기 */}
      <path d="M30 62 q-8 30 20 36" fill="none" stroke={ink} strokeWidth={3} />
      <circle cx="52" cy="99" r="5" fill="#bfc9d9" />
    </g>
  );
}

export default function Avatar({ size = 120, pose = 'idle', className = '', ...colors }: BodyProps & { size?: number; className?: string }) {
  return (
    <svg
      className={`avatar ${className}`}
      width={size}
      height={size * 1.6}
      viewBox="-8 0 116 160"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <AvatarBody pose={pose} {...colors} />
    </svg>
  );
}
