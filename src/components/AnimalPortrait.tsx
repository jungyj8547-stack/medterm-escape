const animals: Record<string, string> = {rabbit:'🐰',cat:'🐱',penguin:'🐧',bear:'🐻',fox:'🦊',panda:'🐼',dog:'🐶',chick:'🐥',koala:'🐨',tiger:'🐯',lion:'🦁',cow:'🐮',pig:'🐷',frog:'🐸',owl:'🦉',hedgehog:'🦔',squirrel:'🐿️',otter:'🦦',dolphin:'🐬',turtle:'🐢'};
export default function AnimalPortrait({animal}:{animal:string}) {
  return <svg viewBox="0 0 160 150" aria-hidden="true" width="100%" height="100%"><text x="80" y="113" textAnchor="middle" fontFamily="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif" fontSize="104">{animals[animal]??'🐰'}</text></svg>;
}
