import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { generateRoomPuzzles, coverageReport } from '../src/engine/puzzleGen';
import type { Room } from '../src/types';

const dir = process.argv[2];
const rooms: Room[] = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8'))).sort((a, b) => a.order - b.order);
const allIds = new Set<string>(); const allTerms = new Map<string, string>();
let total = 0;
for (const r of rooms) {
  const issues: string[] = [];
  const koreans = new Map<string, string[]>();
  for (const t of r.terms) {
    total++;
    if (allIds.has(t.id)) issues.push(`중복 id ${t.id}`); allIds.add(t.id);
    const k = t.term.toLowerCase(); if (allTerms.has(k)) issues.push(`다른 병동과 중복 용어: ${t.term} (${allTerms.get(k)})`); allTerms.set(k, r.name);
    koreans.set(t.korean, [...(koreans.get(t.korean) ?? []), t.term]);
    if (!Array.isArray(t.parts) || t.parts.length < 1) issues.push(`parts 없음: ${t.term}`);
    for (const p of t.parts) if (!['p','r','s','w'].includes(p[2])) issues.push(`parts 종류 오류 ${t.term}: ${p[2]}`);
    if (!t.desc) issues.push(`desc 없음: ${t.term}`);
  }
  for (const [k, v] of koreans) if (v.length > 1) issues.push(`같은 병동 내 한글 뜻 중복 "${k}": ${v.join(' / ')}`);
  const few = r.terms.filter(t => t.parts.length < 2).map(t => t.term);
  const p = generateRoomPuzzles(r, rooms, new Set(), 42);
  const cov = coverageReport(r, p);
  console.log(`${r.id} ${r.floor} ${r.name} (${r.theme}) — 용어 ${r.terms.length}개 | 퍼즐 b${p.builder.length} d${p.diagnosis.length} m${p.matching.length} o${p.odd.length} s${p.speed.length} | 커버리지 min ${cov.min} avg ${cov.avg.toFixed(2)}${few.length ? ` | parts 1개(조립 제외): ${few.join(', ')}` : ''}`);
  issues.forEach(i => console.log('   ⚠ ' + i));
}
console.log('총 용어', total);
