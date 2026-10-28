import fs from 'node:fs/promises';
import path from 'node:path';

// Usage: node tools/import-annual52.mjs C:/GPT-Workspace/ww.tmp/WW_52W_EXPERIMENTAL_CANDIDATE_G_PER_NODE_RANK.json
// This is a deterministic data conversion, not a battle simulation or build.
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('SOURCE_G_JSON_REQUIRED');
const source = JSON.parse(await fs.readFile(path.resolve(sourcePath), 'utf8'));
if (
  !Array.isArray(source.waves) ||
  source.waves.length !== 52 ||
  !Array.isArray(source.nodes) ||
  source.nodes.length !== 28
)
  throw new Error('INVALID_G_SOURCE');
const knownUnits = new Set(Object.keys(source.units ?? {}));
const stages = [1, 4, 8, 20, 34];
/** @param {number} wave */
const expectedStage = (wave) =>
  ['3', '5', '9', '13', '25'][stages.filter((w) => w <= wave).length - 1];
/** @type {{wave:number,quarter:number,quarterFinale:boolean,special:boolean,formationStage:string,reward:number,spawns:{id:string,unitId:string,tick:number,direction:string,lane:number}[],objective:{brief:string,options:{id:string,label:string}[]}}[]} */
const waves = source.waves.map((/** @type {any} */ w, /** @type {number} */ index) => {
  const wave = index + 1;
  if (
    w.wave !== wave ||
    w.formationStage !== expectedStage(wave) ||
    !Array.isArray(w.spawns) ||
    !Array.isArray(w.directionPool) ||
    !Number.isSafeInteger(w.reward) ||
    w.reward < 0 ||
    new Set(w.spawns.map((/** @type {any} */ s) => s.id)).size !== w.spawns.length
  )
    throw new Error(`INVALID_G_WAVE:${wave}`);
  /** @type {{id:string,unitId:string,tick:number,direction:string,lane:number}[]} */
  const spawns = w.spawns.map((/** @type {any} */ s, /** @type {number} */ j) => {
    const direction = w.directionPool[s.directionIndex];
    if (
      s.id !== `e${j}` ||
      !knownUnits.has(s.unitId) ||
      s.tick !== j * 24 ||
      !['north', 'south', 'east', 'west'].includes(direction) ||
      ![-1, 0, 1].includes(s.lane)
    )
      throw new Error(`INVALID_G_SPAWN:${wave}:${j}`);
    return { id: s.id, unitId: s.unitId, tick: s.tick, direction, lane: s.lane };
  });
  return {
    wave,
    quarter: w.quarter,
    quarterFinale: w.quarterFinale,
    special: w.special,
    formationStage: w.formationStage,
    reward: w.reward,
    spawns,
    objective: {
      brief: w.objective.brief,
      options: w.objective.options.map((/** @type {any} */ o) => ({ id: o.id, label: o.label })),
    },
  };
});
if (
  waves.reduce((n, w) => n + w.spawns.length, 0) !== 1664 ||
  waves.reduce((n, w) => n + w.reward, 0) !== 79250 ||
  waves[0].spawns.length !== 10 ||
  waves[51].spawns.length !== 54 ||
  waves[51].spawns.at(-1)?.tick !== 1272
)
  throw new Error('G_TOTAL_MISMATCH');
const target = path.resolve('src/domain/waves/Annual52Content.js');
await fs.writeFile(
  target,
  '// Generated from WW_52W_EXPERIMENTAL_CANDIDATE_G_PER_NODE_RANK.json (2026-10-27).\n' +
    '// G per-node ranks deliberately omitted: main uses wave-wide 0..10 combat grades.\n' +
    '// Immutable domain data; no Phaser/DOM/seed dependency.\n' +
    'export const annual52Waves = ' +
    JSON.stringify(waves, null, 2) +
    ';\n',
);
console.log('Imported 52 waves, 1664 spawns, reward total 79250; no G ranks copied.');
