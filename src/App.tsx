import { useEffect, useState } from 'react';
import { useGame } from './store/gameStore';
import { sfx } from './audio/sfx';
import Title from './screens/Title';
import Lobby from './screens/Lobby';
import Briefing from './screens/Briefing';
import Learn from './screens/Learn';
import RoomScreen from './screens/Room';
import Debrief from './screens/Debrief';
import Review from './screens/Review';
import Host from './screens/Host';

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const screen = useGame((s) => s.screen);
  const session = useGame((s) => s.session);
  const muted = useGame((s) => s.muted);

  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted]);

  // #reset 으로 접속하면 저장된 진행을 모두 지우고 타이틀로
  useEffect(() => {
    if (hash === '#reset') {
      useGame.getState().resetAll();
      window.history.replaceState(null, '', window.location.pathname);
      window.location.reload();
    }
  }, [hash]);

  if (hash === '#host') return <Host />;

  // 세션이 없는데 세션 화면이면 로비로
  const needsSession = ['briefing', 'learn', 'room', 'debrief', 'review'].includes(screen);
  if (needsSession && !session) return <Lobby />;

  switch (screen) {
    case 'title':
      return <Title />;
    case 'lobby':
      return <Lobby />;
    case 'briefing':
      return <Briefing />;
    case 'learn':
      return <Learn />;
    case 'room':
      return <RoomScreen />;
    case 'debrief':
      return <Debrief />;
    case 'review':
      return <Review />;
    default:
      return <Title />;
  }
}
