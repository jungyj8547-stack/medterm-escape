/**
 * 배경음악 — 외부 파일 없이 WebAudio로 합성하는 칩튠 시퀀서.
 * 트랙: lobby(경쾌), escape(긴장), alarm(escape 고속), win(승리 팡파르, 1회)
 */
import { getAudioContext } from './sfx';

type Track = 'lobby' | 'escape' | 'alarm' | 'none';

// 음표: [MIDI 번호 | null(쉼표), 길이(16분음표 단위)]
type Note = [number | null, number];

interface Pattern {
  bpm: number;
  melody: Note[];
  bass: Note[];
  drums: string; // 16분음표마다 문자: k=kick s=snare h=hat .=쉼
  melodyType: OscillatorType;
  melodyGain: number;
}

const m = (s: string): Note[] =>
  s
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [n, l] = tok.split(':');
      return [n === '-' ? null : NOTE[n] ?? null, Number(l ?? 2)];
    });

// 음이름 → MIDI
const NOTE: Record<string, number> = {};
const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let oct = 1; oct <= 7; oct++) names.forEach((n, i) => (NOTE[`${n}${oct}`] = 12 * (oct + 1) + i));

const PATTERNS: Record<Exclude<Track, 'none'>, Pattern> = {
  lobby: {
    bpm: 124,
    melodyType: 'square',
    melodyGain: 0.05,
    melody: m(`
      E5:2 G5:2 A5:2 G5:2  E5:2 D5:2 C5:2 D5:2  E5:2 G5:2 A5:2 C6:2  B5:2 G5:2 E5:4
      D5:2 F5:2 G5:2 F5:2  D5:2 C5:2 B4:2 C5:2  D5:2 F5:2 G5:2 B5:2  C6:6 -:2
      E5:2 G5:2 A5:2 G5:2  E5:2 D5:2 C5:2 D5:2  E5:2 G5:2 C6:2 E6:2  D6:2 B5:2 G5:4
      A5:2 G5:2 F5:2 E5:2  D5:2 E5:2 F5:2 G5:2  E5:2 C5:2 D5:2 B4:2  C5:8
    `),
    bass: m(`
      C3:2 C3:2 G3:2 C3:2  A2:2 A2:2 E3:2 A2:2  F2:2 F2:2 C3:2 F2:2  G2:2 G2:2 D3:2 G2:2
      C3:2 C3:2 G3:2 C3:2  A2:2 A2:2 E3:2 A2:2  F2:2 F2:2 C3:2 F2:2  G2:2 G2:2 B2:2 G2:2
      C3:2 C3:2 G3:2 C3:2  A2:2 A2:2 E3:2 A2:2  F2:2 F2:2 C3:2 F2:2  G2:2 G2:2 D3:2 G2:2
      F2:2 F2:2 C3:2 F2:2  G2:2 G2:2 D3:2 G2:2  C3:2 C3:2 G3:2 C3:2  C3:4 -:4
    `),
    drums: 'k.h.s.h.k.h.s.h.'.repeat(16),
  },
  escape: {
    bpm: 138,
    melodyType: 'sawtooth',
    melodyGain: 0.035,
    melody: m(`
      A4:2 A4:2 C5:2 A4:2  E5:2 D5:2 C5:2 B4:2  A4:2 A4:2 C5:2 E5:2  G5:2 E5:2 D5:2 C5:2
      F5:2 E5:2 D5:2 C5:2  B4:2 C5:2 D5:2 E5:2  A4:2 -:2 A4:2 -:2  G4:2 A4:2 B4:2 C5:2
      A4:2 A4:2 C5:2 A4:2  E5:2 D5:2 C5:2 B4:2  A4:2 A4:2 C5:2 E5:2  A5:2 G5:2 E5:2 D5:2
      F5:2 E5:2 F5:2 G5:2  E5:2 D5:2 C5:2 B4:2  A4:4 E5:4  A4:8
    `),
    bass: m(`
      A2:2 A2:2 A2:2 A2:2  A2:2 A2:2 G2:2 G2:2  F2:2 F2:2 F2:2 F2:2  E2:2 E2:2 E2:2 E2:2
      A2:2 A2:2 A2:2 A2:2  A2:2 A2:2 G2:2 G2:2  F2:2 F2:2 F2:2 F2:2  E2:2 E2:2 G2:2 G2:2
      A2:2 A2:2 A2:2 A2:2  A2:2 A2:2 G2:2 G2:2  F2:2 F2:2 F2:2 F2:2  E2:2 E2:2 E2:2 E2:2
      F2:2 F2:2 F2:2 F2:2  E2:2 E2:2 E2:2 E2:2  A2:2 A2:2 A2:2 A2:2  A2:4 -:4
    `),
    drums: 'khhhshhhkhhhshhk'.repeat(16),
  },
  alarm: {
    bpm: 168,
    melodyType: 'sawtooth',
    melodyGain: 0.04,
    melody: [],
    bass: [],
    drums: 'khhhshhhkhkhshhh'.repeat(16),
  },
};
// alarm = escape 멜로디/베이스를 빠르게
PATTERNS.alarm.melody = PATTERNS.escape.melody;
PATTERNS.alarm.bass = PATTERNS.escape.bass;

const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

let enabled = true;
let current: Track = 'none';
let master: GainNode | null = null;
let timer = 0;
let nextTime = 0;
let step = 0;
let noiseBuf: AudioBuffer | null = null;

function ensureMaster(ctx: AudioContext) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return master;
}

function osc(ctx: AudioContext, type: OscillatorType, hz: number, t: number, dur: number, gain: number, attack = 0.005) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = hz;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function drum(ctx: AudioContext, kind: string, t: number) {
  if (kind === 'k') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + 0.16);
  } else if (kind === 's' || kind === 'h') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'h' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'h' ? 7000 : 1800;
    const g = ctx.createGain();
    const vol = kind === 'h' ? 0.06 : 0.18;
    const dur = kind === 'h' ? 0.04 : 0.12;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master!);
    src.start(t);
    src.stop(t + dur + 0.01);
  }
}

/** 트랙 전체를 16분음표 단위 이벤트로 펼친다 */
function expand(notes: Note[]): (number | null)[] {
  const out: (number | null)[] = [];
  for (const [n, len] of notes) {
    out.push(n);
    for (let i = 1; i < len; i++) out.push(undefined as unknown as null); // 이어지는 칸은 undefined
  }
  return out;
}
const noteLen = (notes: Note[], idx: number) => {
  let acc = 0;
  for (const [, len] of notes) {
    if (idx < acc + len) return len;
    acc += len;
  }
  return 1;
};

function schedule() {
  const ctx = getAudioContext();
  if (!ctx || current === 'none') return;
  const pat = PATTERNS[current];
  const sixteenth = 60 / pat.bpm / 4;
  const mel = expand(pat.melody);
  const bas = expand(pat.bass);
  const total = Math.max(mel.length, bas.length, pat.drums.length);
  if (ctx.state !== 'running') return; // 사용자 제스처 전에는 대기
  if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05; // 일시정지 후 몰아치기 방지
  while (nextTime < ctx.currentTime + 0.15) {
    const i = step % total;
    const mn = mel[i];
    if (typeof mn === 'number') osc(ctx, pat.melodyType, midiToHz(mn), nextTime, sixteenth * noteLen(pat.melody, i) * 0.9, pat.melodyGain);
    const bn = bas[i];
    if (typeof bn === 'number') osc(ctx, 'triangle', midiToHz(bn), nextTime, sixteenth * noteLen(pat.bass, i) * 0.95, 0.12, 0.01);
    const d = pat.drums[i % pat.drums.length];
    if (d && d !== '.') drum(ctx, d, nextTime);
    if (current === 'alarm' && i % 16 === 0) osc(ctx, 'square', 1760, nextTime, 0.08, 0.02);
    nextTime += sixteenth;
    step++;
  }
}

export const music = {
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) music.stop();
    else if (wanted !== 'none') music.play(wanted);
  },
  isEnabled: () => enabled,
  /** 화면이 원하는 트랙 (꺼져 있어도 기억해 두었다가 켜면 재생) */
  play(track: Track) {
    wanted = track;
    if (!enabled || track === 'none') {
      music.stop();
      return;
    }
    if (track === current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    ensureMaster(ctx);
    // 트랙 전환: 같은 곡의 고속 버전이면 박자 이어가기
    const keepStep = (current === 'escape' && track === 'alarm') || (current === 'alarm' && track === 'escape');
    if (!keepStep) step = 0;
    current = track;
    nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
    if (!timer) timer = window.setInterval(schedule, 40);
  },
  stop() {
    current = 'none';
    if (timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  },
  /** 승리 팡파르 (1회) — 잠시 BGM을 멈추고 재생 */
  fanfare() {
    const ctx = getAudioContext();
    if (!ctx || !enabled) return;
    ensureMaster(ctx);
    const prev = wanted;
    music.stop();
    const t0 = ctx.currentTime + 0.05;
    const seq: [string, number, number][] = [
      ['C5', 0, 0.15], ['E5', 0.15, 0.15], ['G5', 0.3, 0.15], ['C6', 0.45, 0.35],
      ['G5', 0.85, 0.15], ['C6', 1.0, 0.7],
    ];
    seq.forEach(([n, at, dur]) => {
      osc(ctx, 'square', midiToHz(NOTE[n]), t0 + at, dur, 0.07);
      osc(ctx, 'triangle', midiToHz(NOTE[n] - 12), t0 + at, dur, 0.1);
    });
    ['k', 's', 'k', 's', 'k'].forEach((d, i) => drum(ctx, d, t0 + i * 0.15));
    window.setTimeout(() => {
      if (wanted === prev) music.play(prev);
    }, 2000);
  },
};
let wanted: Track = 'none';

// 개발 모드 디버그용
if (import.meta.env.DEV) {
  (window as unknown as { __music: unknown }).__music = {
    ...music,
    debug: () => ({ current, wanted, enabled, step, ctxState: getAudioContext()?.state }),
  };
}
