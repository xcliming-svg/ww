import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { check, finish, data } from './context.mjs';
const slots = data['data/assets/slots.json']; const ids = new Set(slots.map((/** @type {{assetId:string}} */ s) => s.assetId)); check(ids.size === slots.length, 'Duplicate asset IDs');
for (const n of data['data/tech/nodes.json']) check(ids.has(n.assetId), `Missing tech slot:${n.id}`);
for (const unit of data['data/units/templates.json']) for (const side of ['unit', 'enemy']) for (const frame of ['idle', 'attack', 'hit', 'death']) check(ids.has(`${side}.${unit.id}.${frame}`), `Missing animation slot:${side}.${unit.id}.${frame}`);
for (const slot of slots) {
  if (slot.relativePath) { check(!slot.relativePath.includes('..') && !/^https?:|^[\\/]/.test(slot.relativePath), `Unsafe path:${slot.assetId}`); try { await fs.access(`public/${slot.relativePath}`); } catch { check(false, `Missing asset:${slot.relativePath}`); } }
  else check(slot.fallbackKind, `Missing fallback:${slot.assetId}`);
  check(data['data/assets/licenses.json'].items.some((/** @type {{id:string}} */ item) => item.id === slot.attributionId), `Missing attribution:${slot.assetId}`);
}
for (const item of data['data/assets/licenses.json'].items) for (const entry of item.files) check(createHash('sha256').update(await fs.readFile(entry.path)).digest('hex') === entry.sha256, `Asset hash mismatch:${entry.path}`);
const font = await fs.readFile('public/assets/fonts/NotoSansKR-variable.ttf'); check(font.readUInt32BE(0) === 65536 || font.toString('ascii', 0, 4) === 'OTTO', 'Invalid font signature');
check((await fs.readFile('public/assets/fonts/OFL.txt', 'utf8')).includes('SIL OPEN FONT LICENSE Version 1.1'), 'Missing OFL');
finish('assets');
