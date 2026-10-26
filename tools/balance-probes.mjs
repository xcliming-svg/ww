import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createCampaign } from '../src/domain/model/Campaign.js';
import { makeDomainConfig } from '../src/domain/model/ContentConfig.js';
import { simulateBattle } from '../src/domain/systems/StepSimulation.js';
import { DeterministicRng } from '../src/domain/util/DeterministicRng.js';
/** @param {string} p */ const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const probes = await read('data/simulation/probes.json');
if (process.argv.length > 3 || process.argv[2] && !/^candidate-v\d+$/.test(process.argv[2])) throw new Error('INVALID_CANDIDATE');
if (!Number.isInteger(probes.seeds) || probes.seeds < 1 || probes.seeds > 5000) throw new Error('SEED_LIMIT');
const active = await read('data/balance/active.json'); const candidatePath = `data/balance/${process.argv[2] ?? active.candidate}.json`;
const balance = await read(candidatePath);
const config = makeDomainConfig(await read('data/tech/nodes.json'), await read('data/formation/layouts.json'), await read('data/rules.json'), balance);
/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) { return (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : Promise.resolve([`${dir}/${e.name}`])))).flat().sort(); }
const engineDigest = createHash('sha256'); for (const p of await walk('src/domain')) engineDigest.update(p).update(await fs.readFile(p));
const rows = [];
for (const unitId of Object.keys(balance.units)) for (const enemyUnit of probes.enemyUnits) {
  let wins = 0, hq = 0, damage = 0, invalid = 0;
  for (let seed = probes.startSeed; seed < probes.startSeed + probes.seeds; seed++) {
    // Controlled combat-only fixture: four equal slots, no growth, same enemy schedule for every unit.
    // Research/purchases and campaign economics are measured separately by balance-sim.
    const state = createCampaign(config, balance, seed, `probe-${seed}`);
    state.placements = probes.cells.map((/** @type {{row:number,col:number}} */ cell, /** @type {number} */ i) => ({ instanceId: `a${i}`, unitId, cell, paidCost: balance.costs[unitId] }));
    const rng = new DeterministicRng(seed);
    const spawns = Array.from({ length: probes.enemyCount }, (_, i) => ({ id: `e${i}`, unitId: enemyUnit,
      direction: probes.directions[Math.floor(rng.next() * probes.directions.length)], lane: Math.floor(rng.next() * 3) - 1,
      tick: Math.round(Math.floor(i / (probes.enemyCount / probes.spawnGroups)) * balance.spawnInterval / balance.fixedStepSeconds) }));
    const plan = { wave: probes.wave, seed, formationStage: '9', spawns, totalPlanned: spawns.length, reward: 0 };
    const result = simulateBattle(state, plan, balance);
    if (result.outcome === 'victory') wins++;
    if (result.outcome === 'invalid') invalid++;
    hq += result.hqHp; damage += result.damageByUnit[unitId] ?? 0;
  }
  rows.push({ unitId, enemyUnit, n: probes.seeds, wins, invalid, deploymentCost: probes.cells.length * balance.costs[unitId], meanHq: hq / probes.seeds, meanDamage: damage / probes.seeds });
  console.log(`${unitId} vs ${enemyUnit}: ${wins}/${probes.seeds}, invalid=${invalid}`);
}
const report = { version: probes.version, probes, candidate: balance.id, engineHash: engineDigest.digest('hex'), configHash: createHash('sha256').update(await fs.readFile(candidatePath)).digest('hex'), rows,
  limits: ['Combat-only fixture with equal slot counts, different deployment costs', 'No research economy or upgrades in this fixture', 'Not a campaign completion rate or a human playtest'] };
const output = `docs/balance-reports/${config.rules.configVersion}-roles-${probes.seeds}`;
await fs.writeFile(`${output}.json`, JSON.stringify(report, null, 2));
await fs.writeFile(`${output}.md`, `# 병과 역할 통제 측정\n\n동일 ${probes.cells.length}칸, 무강화, 적 ${probes.enemyCount}기, ${probes.wave}웨이브 배율. 병과마다 배치 비용이 다르다. 캠페인 승률/동일 비용 효율/인간 플레이 결과가 아니다. 각 조합 동일 시드 ${probes.seeds}개.\n\n| 아군 | 적 | 비용 | 승리/N | 평균 HQ | 평균 가한 피해 | 무효 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: |\n` + rows.map(r => `| ${r.unitId} | ${r.enemyUnit} | ${r.deploymentCost} | ${r.wins}/${r.n} | ${r.meanHq.toFixed(2)} | ${r.meanDamage.toFixed(2)} | ${r.invalid} |`).join('\n') + '\n');
