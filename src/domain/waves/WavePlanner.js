import { DeterministicRng } from '../util/DeterministicRng.js';
/** @typedef {import('../../../data/balance/candidate-v7.json') & {rewards?:number[]}} Balance */
/** @typedef {import('../../../data/waves/content.json')} Content */
/** @param {number} wave @param {Balance} balance */
export function formationStage(wave, balance) {
  const stages = ['3', '5', '9', '13', '25'];
  return stages[balance.expansionWaves.filter(w => w <= wave).length - 1];
}
/** @param {number} wave @param {Balance} balance */
export function rewardForWave(wave, balance) {
  return balance.rewards?.[wave - 1] ?? balance.rewardBase + wave * balance.rewardPerWave;
}
/** Same seed + wave always produces identical immutable input. No build policy in this function.
 * @param {number} wave @param {number} seed @param {Balance} balance @param {Content} content */
export function planWave(wave, seed, balance, content) {
  if (!Number.isInteger(wave) || wave < 1 || wave > content.maxWave) throw new Error('INVALID_WAVE');
  const rng = new DeterministicRng((seed ^ Math.imul(wave, 2654435761)) >>> 0);
  const stage = formationStage(wave, balance);
  const directions = content.directions.slice(0, stage === '3' ? 2 : 4);
  const tier = content.unlockEnemies.filter(t => t.wave <= wave).at(-1);
  if (!tier) throw new Error('INVALID_CONTENT');
  const count = balance.enemyCountBase + Math.floor((wave - 1) / balance.enemyCountWaveInterval) * balance.enemyCountGrowth;
  const spawns = Array.from({ length: count }, (_, index) => ({ id: `e${index}`, unitId: tier.ids[Math.floor(rng.next() * tier.ids.length)],
    direction: directions[(index + (['3', '5'].includes(stage) ? 0 : Math.floor(rng.next() * directions.length))) % directions.length],
    tick: Math.round(Math.floor(index / directions.length) * balance.spawnInterval / balance.fixedStepSeconds),
    lane: stage === '3' ? 0 : (Math.floor(rng.next() * 3) - 1) }));
  return { wave, seed, formationStage: stage, spawns, totalPlanned: spawns.length, reward: rewardForWave(wave, balance) };
}
/** Direction only: do not leak count, unit class, or time. @param {ReturnType<typeof planWave>} plan */
export function getRecon(plan) { return [...new Set(plan.spawns.map(s => s.direction))].map(direction => ({ direction, unknownClass: true, unknownCount: true })); }
