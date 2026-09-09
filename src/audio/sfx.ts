/** 외부 파일 없이 WebAudio로 합성한 효과음 */
let ctx: AudioContext | null = null;
let muted = false;

export function getAudioContext(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, when = 0, slideTo?: number) {
  const c = getAudioContext();
  if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + when);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + when + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + when);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur + 0.02);
}

function noise(dur: number, gain = 0.15, when = 0, freq = 2000) {
  const c = getAudioContext();
  if (!c || muted) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + when);
}

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
  },
  isMuted: () => muted,
  /** 뽁 — 버튼/타일 클릭 */
  click: () => tone(600, 0.07, 'sine', 0.12, 0, 900),
  /** 딩동 — 정답 */
  correct: () => {
    tone(784, 0.12, 'square', 0.08);
    tone(1175, 0.22, 'square', 0.08, 0.1);
    tone(1568, 0.3, 'sine', 0.1, 0.2);
  },
  /** 부저 — 오답 */
  wrong: () => {
    tone(220, 0.18, 'sawtooth', 0.1, 0, 180);
    tone(160, 0.28, 'sawtooth', 0.1, 0.15, 120);
  },
  /** 반짝 — 코드 조각 획득 */
  fragment: () => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.07));
    noise(0.25, 0.08, 0.3, 6000);
  },
  /** 팡파르 — 문 열림 */
  unlock: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'square', 0.1, i * 0.1));
    tone(1319, 0.7, 'sine', 0.12, 0.5);
    tone(659, 0.7, 'triangle', 0.12, 0.5);
    noise(0.4, 0.1, 0.5, 3000);
  },
  /** 삐-삐 — 경보 */
  alarm: () => {
    tone(1200, 0.15, 'square', 0.07);
    tone(900, 0.15, 'square', 0.07, 0.18);
  },
  tick: () => tone(1500, 0.04, 'square', 0.05),
  /** 뚜-뚜-뚜 — 실패 */
  fail: () => {
    [440, 415, 392, 349].forEach((f, i) => tone(f, 0.38, 'sawtooth', 0.1, i * 0.3));
  },
  /** 카드 뒤집기 */
  flip: () => noise(0.12, 0.12, 0, 1200),
  /** 슉 — 화면 전환 */
  whoosh: () => noise(0.25, 0.1, 0, 800),
};
