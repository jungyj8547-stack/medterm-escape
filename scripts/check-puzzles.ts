// 퍼즐 생성기 검증: 8병동 × 여러 시드에서 커버리지/재현성 확인
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { generateRoomPuzzles, coverageReport } from '../src/engine/puzzleGen';
import type { Room } from '../src/types';

const dir = join(process.cwd(), 'data', 'rooms');
const rooms: Room[] = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))).sort((a, b) => a.order - b.order);

let ok = true;
for (const room of rooms) {
  for (const seed of [1, 42, 20260909]) {
    const weak = new Set(room.terms.slice(0, 5).map((t) => t.id));
    const p1 = generateRoomPuzzles(room, rooms, weak, seed);
    const p2 = generateRoomPuzzles(room, rooms, weak, seed);
    const same = JSON.stringify(p1) === JSON.stringify(p2);
    const rep = coverageReport(room, p1);
    const sizes = `b${p1.builder.length} d${p1.diagnosis.length} m${p1.matching.length} o${p1.odd.length} s${p1.speed.length}`;
    const weakInBuilder = p1.builder.filter((i) => weak.has(i.termId)).length;
    const flag = !same || rep.min < 1 || p1.builder.length < 6 ? '  <-- PROBLEM' : '';
    if (flag) ok = false;
    console.log(`${room.id} seed=${seed} code=${p1.code} ${sizes} cov.min=${rep.min} avg=${rep.avg.toFixed(2)} weakInBuilder=${weakInBuilder}/5 same=${same}${flag}`);
  }
}
console.log(ok ? '\nALL OK' : '\nFAILED');
process.exit(ok ? 0 : 1);
