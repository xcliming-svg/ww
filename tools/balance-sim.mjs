import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { makeDomainConfig } from '../src/domain/model/ContentConfig.js';
import { createCampaign, startWave, resolveWave, advanceCampaign } from '../src/domain/model/Campaign.js';
import { planWave } from '../src/domain/waves/WavePlanner.js';
import { simulateBattle } from '../src/domain/systems/StepSimulation.js';
import { buildForWave } from './balance-policy.mjs';
import { resolveCombatBalance } from '../src/infrastructure/ResolveCombatBalance.js';
/** @param {string} file */ const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const valueFlags = new Set(['--seeds', '--start-seed', '--config', '--out', '--policies', '--waves']);
const switchFlags = new Set(['--resume', '--paired', '--trace']); const seenFlags = new Set();
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (seenFlags.has(flag) || !valueFlags.has(flag) && !switchFlags.has(flag)) throw new Error(`INVALID_OPTION:${flag}`);
  seenFlags.add(flag);
  if (valueFlags.has(flag) && (!process.argv[++i] || process.argv[i].startsWith('--'))) throw new Error(`MISSING_VALUE:${flag}`);
}
/** @param {string} name @param {string} fallback */ const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const samples = Number(arg('--seeds', '1000')); const offset = Number(arg('--start-seed', '1'));
if (!Number.isInteger(samples) || samples < 1 || samples > 5000 || !Number.isInteger(offset) || offset < 0 || offset + samples - 1 > 0xffffffff) throw new Error('SEED_LIMIT');
if (arg('--waves', '1-100') !== '1-100') throw new Error('FULL_CAMPAIGN_RANGE_REQUIRED');
const activeCandidate = await read('data/balance/active.json');
const configPath = arg('--config', `data/balance/${activeCandidate.candidate}.json`);
const balanceText = await fs.readFile(configPath, 'utf8');
const rawBalance = JSON.parse(balanceText);
const displayPath = 'data/visual/unit-display.json';
const displayText = rawBalance.gradeModel ? await fs.readFile(displayPath, 'utf8') : null;
const balance = displayText ? resolveCombatBalance(rawBalance, JSON.parse(displayText)) : rawBalance;
const configHash = createHash('sha256').update(balanceText)
  .update(displayText === null ? '' : '\n'+displayPath+'\n'+displayText).digest('hex');
/** @param {string} directory @returns {Promise<string[]>} */
async function sourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? sourceFiles(`${directory}/${e.name}`) : Promise.resolve([`${directory}/${e.name}`])))).flat().sort();
}
const engineFiles = await sourceFiles('src/domain');
const engineDigest = createHash('sha256');
for (const file of engineFiles) engineDigest.update(file).update(await fs.readFile(file));
if (displayText !== null) engineDigest.update('src/infrastructure/ResolveCombatBalance.js').update(await fs.readFile('src/infrastructure/ResolveCombatBalance.js')); 
const engineHash = engineDigest.digest('hex');
const policyHash = createHash('sha256').update(await fs.readFile('tools/balance-policy.mjs')).update(await fs.readFile('data/simulation/policy-profiles.json')).digest('hex');
const contentHash = createHash('sha256').update(await fs.readFile('data/waves/content.json')).digest('hex');
const content = await read('data/waves/content.json');
const config = makeDomainConfig(await read('data/tech/nodes.json'), await read('data/formation/layouts.json'), await read('data/rules.json'), balance);
const policyProfiles = await read('data/simulation/policy-profiles.json');
const available = policyProfiles.policies;
const requested = arg('--policies', 'all'); const policies = requested === 'all' ? available : requested.split(',');
if (policies.some((/** @type {string} */ p) => !available.includes(p)) || new Set(policies).size !== policies.length) throw new Error('UNKNOWN_POLICY');
const options = { paired: process.argv.includes('--paired') };
const output = arg('--out', `docs/balance-reports/${balance.id}-${offset}-${samples}.json`);
/** @typedef {{wave:number,stage:string,code:string}} SimulationFailure */
/** @type {{policy:string,seed:number,reached:number,cleared:boolean,firstDefeat:number|null,hqHp:number,balance:number,spent:number,grossSpent:number,refunded:number,income:number,invalid:number,failure:SimulationFailure|null,opening:{supplies:number|null,units:number}|null,deciles:number[],unitCounts:Record<string,number>,damageByUnit:Record<string,number>}[]} */
let rows = [];
/** @type {{seed:number,wave:number,kind:string,baseline:string|null,variant:string|null,hqDelta:number}[]} */
let pairs = [];
if (process.argv.includes('--resume')) {
  const previous = await read(output);
  if (previous.configHash !== configHash || previous.engineHash !== engineHash || previous.policyHash !== policyHash || previous.contentHash !== contentHash || previous.samples !== samples || previous.offset !== offset || JSON.stringify(previous.policies) !== JSON.stringify(policies) || JSON.stringify(previous.options) !== JSON.stringify(options)) throw new Error('RESUME_MISMATCH');
  rows = previous.rows; pairs = previous.pairs ?? [];
}
/** @param {number} wins @param {number} n */
function wilson(wins, n) { if (!n) return [0, 1]; const z = 1.96; const p = wins / n; const den = 1 + z * z / n; const center = (p + z * z / (2 * n)) / den; const delta = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den; return [center - delta, center + delta]; }
async function writeReport() {
  const summary = policies.map((/** @type {string} */ policy) => {
    const selected = rows.filter(r => r.policy === policy); const wins = selected.filter(r => r.cleared).length;
    return { policy, n: selected.length, cleared: wins, completionRate: selected.length ? wins / selected.length : null, wilson95: wilson(wins, selected.length),
      averageReached: selected.reduce((s, r) => s + r.reached, 0) / (selected.length || 1), maxReached: Math.max(0, ...selected.map(r => r.reached)),
      invalid: selected.reduce((s, r) => s + r.invalid, 0), minimumBalance: selected.length ? Math.min(...selected.map(r => r.balance)) : null,
      decileSurvivors: Array.from({ length: 10 }, (_, i) => selected.filter(r => r.reached >= (i + 1) * 10).length) };
  });
  const report = { candidate: balance.id, configHash, engineHash, policyHash, contentHash, configVersion: config.rules.configVersion, contentVersion: config.rules.contentVersion, policyVersion: policyProfiles.version, options, samples, offset, policies, status: rows.length === samples * policies.length ? 'complete' : 'partial', generatedAt: new Date().toISOString(), summary, pairs, rows };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(`${output}.tmp`, JSON.stringify(report, null, 2)); await fs.rename(`${output}.tmp`, output);
  await fs.writeFile(output.replace(/\.json$/, '.md'), `# ${balance.id} 오프라인 밸런스 리포트\n\n설정 SHA256: ${configHash}\n\n정책별 요청 N=${samples}, seed ${offset}..${offset + samples - 1}. 상태: ${report.status}. 브라우저/재미/성능 검증 아님.\n\n| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n` + summary.map((/** @type {{policy:string,n:number,cleared:number,averageReached:number,maxReached:number,invalid:number}} */s) => `| ${s.policy} | ${s.n} | ${s.cleared} | ${s.averageReached.toFixed(2)} | ${s.maxReached} | ${s.invalid} |`).join('\n') + `\n\n재현: npm run balance:simulate -- --config ${configPath} --seeds ${samples} --start-seed ${offset} --policies ${requested}${options.paired ? ' --paired' : ''} --out ${output}\n`);
  return summary;
}
for (const policy of policies) {
  for (let seed = offset; seed < offset + samples; seed += 1) {
    if (rows.some(r => r.policy === policy && r.seed === seed)) continue;
    let state = createCampaign(config, balance, seed, `sim-${seed}`);
    const row = { policy, seed, reached: 0, cleared: false, firstDefeat: /** @type {number|null} */ (null), hqHp: balance.hqHp, balance: balance.initialSupplies, spent: 0, grossSpent: 0, refunded: 0, income: balance.initialSupplies, invalid: 0, failure: /** @type {SimulationFailure|null} */ (null), opening: /** @type {{supplies:number|null,units:number}|null} */ (null), deciles: /** @type {number[]} */ ([]), unitCounts: /** @type {Record<string,number>} */ ({}), damageByUnit: /** @type {Record<string,number>} */ ({}) };
    for (let wave = 1; wave <= config.rules.maxWave; wave += 1) {
      const plan = planWave(wave, seed, balance, content); const before = state.supplies ?? 0;
      state = buildForWave(state, policy, config, plan, (cost, refund) => { row.grossSpent += cost; row.refunded += refund; }); row.spent += before - (state.supplies ?? 0);
      row.balance = state.supplies ?? 0;
      for (const p of state.placements) row.unitCounts[p.unitId] = (row.unitCounts[p.unitId] ?? 0) + 1;
      if (wave === 1) row.opening = { supplies: state.supplies, units: state.placements.length };
      const started = startWave(state, config);
      if (!started.ok) { row.invalid++; row.failure = { wave, stage: 'start', code: started.errorCode }; break; }
      const result = simulateBattle(started.data, plan, balance); row.hqHp = result.hqHp;
      if (policy === 'recon' && wave % 10 === 0 && process.argv.includes('--paired')) {
        const swapped = structuredClone(started.data); const count = swapped.placements.length;
        if (count > 1) for (let i = 0; i < Math.floor(count / 2); i++) [swapped.placements[i].cell, swapped.placements[count - 1 - i].cell] = [swapped.placements[count - 1 - i].cell, swapped.placements[i].cell];
        const geometry = simulateBattle(swapped, plan, balance);
        pairs.push({ seed, wave, kind: 'same-roster-position-swap', baseline: result.outcome, variant: geometry.outcome, hqDelta: geometry.hqHp - result.hqHp });
        const unupgraded = structuredClone(started.data); unupgraded.upgradeLevels = {};
        const growth = simulateBattle(unupgraded, plan, balance);
        pairs.push({ seed, wave, kind: 'same-position-without-upgrades', baseline: result.outcome, variant: growth.outcome, hqDelta: growth.hqHp - result.hqHp });
      }
      if (process.argv.includes('--trace')) console.log(JSON.stringify({ policy, seed, wave, supplies: state.supplies, upgrades: state.upgradeLevels, placements: state.placements, spawns: plan.spawns, result: { outcome: result.outcome, hp: result.hqHp, ticks: result.ticks, damage: result.damageByUnit } }));
      for (const [id, amount] of Object.entries(result.damageByUnit)) row.damageByUnit[id] = (row.damageByUnit[id] ?? 0) + amount;
      const resolved = resolveWave(started.data, result, balance);
      if (!resolved.ok) { row.invalid++; row.failure = { wave, stage: 'resolve', code: resolved.errorCode }; break; }
      state = resolved.data; row.balance = state.supplies ?? 0;
      if (state.phase === 'defeat') { row.firstDefeat = wave; break; }
      row.income += plan.reward; row.reached = wave;
      if (wave % 10 === 0) row.deciles.push(row.balance);
      if (state.phase === 'clear') { row.cleared = true; break; }
      const advanced = advanceCampaign(state, balance);
      if (!advanced.ok) { row.invalid++; row.failure = { wave, stage: 'advance', code: advanced.errorCode }; break; } state = advanced.data;
    }
    rows.push(row);
    if ((seed - offset + 1) % 100 === 0) { await writeReport(); console.log(`${policy}: ${seed - offset + 1}/${samples}`); }
  }
  const summary = await writeReport(); console.log(summary.find((/** @type {{policy:string}} */s) => s.policy === policy));
}
