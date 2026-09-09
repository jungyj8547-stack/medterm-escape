/**
 * 원본 xlsx(교육용 후보 200개)와 data/rooms/*.json 을 비교해
 *  - xlsx에 있지만 게임 데이터에 없는 용어
 *  - 게임 데이터에 있지만 xlsx에 없는 용어
 *  - 한글 뜻이 달라진 용어
 * 를 리포트한다. (게임 데이터에는 어근·설명이 추가돼 있으므로 자동 덮어쓰기는 하지 않음)
 *
 * 사용: npm run import:terms -- "<xlsx 경로>"
 */
import * as XLSX from 'xlsx';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('사용법: npm run import:terms -- "<xlsx 경로>"');
  process.exit(1);
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');

const wb = XLSX.read(readFileSync(xlsxPath), { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }).slice(2);
const source = rows
  .filter((r) => r[1])
  .map((r) => ({ term: String(r[1]).trim(), abbr: String(r[2]).trim(), korean: String(r[3]).trim(), area: String(r[4]).trim() }));

const roomsDir = join(process.cwd(), 'data', 'rooms');
const game = readdirSync(roomsDir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => {
    const room = JSON.parse(readFileSync(join(roomsDir, f), 'utf8'));
    return room.terms.map((t: { term: string; korean: string; abbr: string }) => ({ ...t, room: room.name }));
  });

const gameByKey = new Map(game.map((t) => [norm(t.term), t]));
const srcByKey = new Map(source.map((t) => [norm(t.term), t]));

console.log(`원본: ${source.length}개 / 게임 데이터: ${game.length}개\n`);

const missing = source.filter((t) => !gameByKey.has(norm(t.term)));
console.log(`[게임에 없는 원본 용어] ${missing.length}개`);
missing.forEach((t) => console.log(`  - ${t.term} (${t.korean}, ${t.area})`));

const extra = game.filter((t) => !srcByKey.has(norm(t.term)));
console.log(`\n[원본에 없는 게임 용어] ${extra.length}개`);
extra.forEach((t) => console.log(`  - ${t.term} (${t.korean}) @ ${t.room}`));

const changed = game.filter((t) => {
  const s = srcByKey.get(norm(t.term));
  return s && s.korean !== t.korean;
});
console.log(`\n[한글 뜻이 원본과 다른 용어] ${changed.length}개 (게임 데이터에서 의도적으로 수정한 항목 포함)`);
changed.forEach((t) => console.log(`  - ${t.term}: 원본 "${srcByKey.get(norm(t.term))!.korean}" → 게임 "${t.korean}"`));
