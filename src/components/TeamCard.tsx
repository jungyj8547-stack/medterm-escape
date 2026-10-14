import type { TeamCard as Card } from '../engine/classroom';
import AnimalPortrait from './AnimalPortrait';

/** Code-native character illustration; the same card identity is shared by a team. */
export default function TeamCard({ card, hidden = false }: { card?: Card; hidden?: boolean }) {
  const color = card?.color ?? '#b6d7ed';
  const animal = card?.animal ?? 'cat';
  return <div className="panel center" style={{ maxWidth: 230, margin: '12px auto', border: `3px solid ${color}` }}>
    {!hidden && <div style={{width:160,height:145,margin:'auto',borderRadius:24,background:color+'33'}} role="img" aria-label={`${card?.name} 카드`}><AnimalPortrait animal={animal} /></div>}
    {hidden &&
    <svg viewBox="0 0 180 160" width="160" height="145" role="img" aria-label={hidden ? '뒤집힌 팀 카드' : `${card?.name} 카드`}>
      <rect x="8" y="5" width="164" height="150" rx="24" fill={color} opacity=".2" />
      {hidden ? <text x="90" y="102" textAnchor="middle" fontSize="70" fill="#327d98">?</text> : <>
        {animal === 'rabbit' ? <><ellipse cx="65" cy="44" rx="15" ry="36" fill={color} /><ellipse cx="115" cy="44" rx="15" ry="36" fill={color} /></>
          : animal === 'chick' ? <path d="M79 30 Q84 12 92 29 Q104 12 107 34" fill={color} />
          : <><ellipse cx="48" cy="49" rx="20" ry="24" fill={color} /><ellipse cx="132" cy="49" rx="20" ry="24" fill={color} /></>}
        <ellipse cx="90" cy="91" rx="57" ry="48" fill={color} />
        {animal === 'panda' && <><ellipse cx="69" cy="82" rx="15" ry="20" fill="#536773" /><ellipse cx="111" cy="82" rx="15" ry="20" fill="#536773" /></>}
        <ellipse cx="70" cy="86" rx="5" ry="7" fill="#33414c" /><ellipse cx="110" cy="86" rx="5" ry="7" fill="#33414c" />
        <ellipse cx="57" cy="105" rx="10" ry="6" fill="#ef90a5" opacity=".7" /><ellipse cx="123" cy="105" rx="10" ry="6" fill="#ef90a5" opacity=".7" />
        <path d="M85 102 Q90 110 95 102 M90 108 Q84 118 78 112 M90 108 Q96 118 102 112" fill="none" stroke="#33414c" strokeWidth="3" strokeLinecap="round" />
      </>}
    </svg>}<b>{hidden ? '어떤 팀이 나올까요?' : card?.name}</b>
  </div>;
}
