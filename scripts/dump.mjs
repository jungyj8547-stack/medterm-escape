import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
const f = process.argv[2];
const wb = XLSX.read(readFileSync(f), { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).slice(2);
const bySys = {};
for (const r of rows) { if (!r[1]) continue; (bySys[r[4]] ||= []).push(r); }
for (const [k, v] of Object.entries(bySys)) {
  console.log(`\n### ${k} (${v.length})`);
  v.forEach(r => console.log(`${r[0]}\t${r[1]}\t${r[2]}\t${r[3]}\t${r[5]}\t${r[9]}`));
}
