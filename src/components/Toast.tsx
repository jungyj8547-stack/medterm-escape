import { useEffect, useState } from 'react';

let listeners: ((msg: string) => void)[] = [];
export function toast(msg: string) {
  listeners.forEach((l) => l(msg));
}

export default function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t = 0;
    const l = (m: string) => {
      setMsg(m);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2200);
    };
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
      window.clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}
