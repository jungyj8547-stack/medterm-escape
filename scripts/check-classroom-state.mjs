import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
const dir = path.resolve('data/rooms');
const rooms = await Promise.all((await fs.readdir(dir)).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))));
rooms.sort((a, b) => a.order - b.order);
const output = path.join(os.tmpdir(), 'medterm-classroom-state-check.cjs');
await build({ entryPoints: ['scripts/classroom-state-case.ts'], outfile: output, bundle: true, platform: 'node', format: 'cjs',
  plugins: [{ name: 'actual-room-data', setup(b) { b.onLoad({ filter: /[\\/]data[\\/]loadData\.ts$/ }, () => ({ loader: 'js', contents:
    `export const ROOMS=${JSON.stringify(rooms)};export const ESCAPE_SECONDS=2400;export const HINTS_PER_ROOM=3;` })); } }],
});
await import(pathToFileURL(output).href);
