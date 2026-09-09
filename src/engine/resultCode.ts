/**
 * 결과 코드: 서버 없이 팀 결과를 진행자 페이지로 옮기기 위한 짧은 문자열.
 * 형식  R<병동번호>-<base36 패킹>-<체크 문자>
 * 패킹: score(0~9999) * 100000 + timeUsedSec(0~2999) * 10 + stars(1~3)  → 최대 ~1e9, base36 6자리 이내
 */
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 혼동 문자(I,L,O,U) 제외

export interface ResultPayload {
  roomOrder: number;
  score: number;
  timeUsedSec: number;
  stars: number;
}

function checksum(s: string): string {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return ALPHA[h % ALPHA.length];
}

function toAlpha(n: number): string {
  if (n === 0) return ALPHA[0];
  let out = '';
  while (n > 0) {
    out = ALPHA[n % ALPHA.length] + out;
    n = Math.floor(n / ALPHA.length);
  }
  return out;
}

function fromAlpha(s: string): number {
  let n = 0;
  for (const ch of s) {
    const v = ALPHA.indexOf(ch);
    if (v < 0) return NaN;
    n = n * ALPHA.length + v;
  }
  return n;
}

export function encodeResult(p: ResultPayload): string {
  const packed =
    Math.min(9999, Math.max(0, p.score)) * 100000 +
    Math.min(2999, Math.max(0, Math.round(p.timeUsedSec))) * 10 +
    Math.min(9, Math.max(0, p.stars));
  const body = `R${p.roomOrder}-${toAlpha(packed)}`;
  return `${body}-${checksum(body)}`;
}

export function decodeResult(code: string): ResultPayload | null {
  const clean = code.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  const m = clean.match(/^R(\d)-([0-9A-Z]+)-([0-9A-Z])$/);
  if (!m) return null;
  const body = `R${m[1]}-${m[2]}`;
  if (checksum(body) !== m[3]) return null;
  const packed = fromAlpha(m[2]);
  if (!Number.isFinite(packed)) return null;
  const stars = packed % 10;
  const timeUsedSec = Math.floor(packed / 10) % 10000;
  const score = Math.floor(packed / 100000);
  return { roomOrder: Number(m[1]), score, timeUsedSec, stars };
}
