/** 외부 파일 없이 WebAudio로 합성한 효과음 */
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, when = 0) {
  const c = ac();
  if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.setValueAtTime(gain, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur + 0.02);
}

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
  },
  isMuted: () => muted,
  click: () => tone(880, 0.05, 'square', 0.03),
  correct: () => {
    tone(660, 0.12, 'sine', 0.08);
    tone(990, 0.18, 'sine', 0.08, 0.1);
  },
  wrong: () => {
    tone(200, 0.2, 'sawtooth', 0.06);
    tone(150, 0.25, 'sawtooth', 0.06, 0.12);
  },
  fragment: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.08, i * 0.08));
  },
  unlock: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.1));
    tone(1319, 0.6, 'sine', 0.08, 0.5);
  },
  alarm: () => {
    tone(1200, 0.15, 'square', 0.05);
    tone(900, 0.15, 'square', 0.05, 0.18);
  },
  tick: () => tone(1500, 0.03, 'square', 0.02),
  fail: () => {
    [440, 415, 392, 349].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.07, i * 0.3));
  },
};
