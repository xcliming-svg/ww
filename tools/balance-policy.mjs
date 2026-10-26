import { dispatchPreparationCommand } from '../src/domain/economy/EconomyService.js';
import { isUnlocked } from '../src/domain/tech/TechGraph.js';
import { DeterministicRng } from '../src/domain/util/DeterministicRng.js';
import { getRecon } from '../src/domain/waves/WavePlanner.js';
import profiles from '../data/simulation/policy-profiles.json' with { type: 'json' };
import { quoteRefund } from '../src/domain/economy/RefundService.js';
/** @typedef {import('../src/domain/model/contracts.js').GameState} GameState */
/** @param {GameState} initial @param {string} policy @param {import('../src/domain/model/contracts.js').DomainConfig} config @param {ReturnType<import('../src/domain/waves/WavePlanner.js').planWave>} plan @param {(cost:number,refund:number)=>void} [recordTransaction] */
export function buildForWave(initial, policy, config, plan, recordTransaction = () => {}) {
  let state = structuredClone(initial); let sequence = 0;
  const reallocate = policy === 'respec';
  if (reallocate) policy = profiles.reallocationPolicies[Math.floor((state.wave - 1) / profiles.reallocationInterval) % profiles.reallocationPolicies.length];
  const rng = new DeterministicRng((state.seed + state.wave) >>> 0);
  const rosters = profiles.profiles;
  const roster = state.wave <= profiles.warmupThroughWave && policy !== 'wrong' ? [profiles.earlyPriorityUnit, profiles.starterUnit] : rosters[/** @type {keyof typeof rosters} */(policy)]; if (!roster) throw new Error('UNKNOWN_POLICY');
  /** @param {Omit<import('../src/domain/model/contracts.js').PreparationCommand,'commandId'>} command */
  function execute(command) {
    const result = dispatchPreparationCommand(state, { ...command, commandId: `${state.wave}:${sequence++}` }, config);
    if (result.ok) { const delta = (state.supplies ?? 0) - (result.data.supplies ?? 0); recordTransaction(Math.max(0, delta), Math.max(0, -delta)); state = result.data; }
    return result.ok;
  }
  if (reallocate && state.wave > 1 && (state.wave - 1) % profiles.reallocationInterval === 0) {
    for (const nodeId of [...state.buildingIds, ...state.researchIds, ...Object.keys(state.upgradeLevels)]) {
      const quote = quoteRefund(state, nodeId, config);
      if (quote.ok) execute({ type: 'refund', nodeId, refundToken: quote.data.token });
    }
  }
  /** @param {string} id */
  function unlock(id) {
    const node = config.nodes.find(n => n.id === id); if (!node) return;
    for (const parent of node.parentIds) unlock(parent);
    if (node.producerId) unlock(node.producerId);
    if (node.kind === 'research' && !state.researchIds.includes(id)) execute({ type: 'research', nodeId: id });
    if (node.kind === 'building' && !state.buildingIds.includes(id)) execute({ type: 'build', nodeId: id });
  }
  const cells = (config.layouts[state.formationStage] ?? []).filter(c => c.row !== 2 || c.col !== 2);
  // Reserve a complete low-cost formation before irreversible growth spending.
  const reserve = cells.length * (config.costs.rifle ?? 0);
  if (policy !== 'wrong') {
    for (const profileId of ['power', 'survive']) {
      const profile = config.upgrades.find(p => p.id === profileId);
      const upgradeCost = Math.ceil((config.costs.rifle ?? 0) * (profile?.costs?.[0] ?? Infinity));
      if ((state.upgradeLevels.rifle?.[profileId] ?? 0) === 0 && (state.supplies ?? 0) >= reserve + upgradeCost) execute({ type: 'upgrade', nodeId: 'rifle', profileId });
    }
  }
  if (state.wave > 1 && (state.supplies ?? 0) > reserve * profiles.reserveTriggerMultiplier) {
    const saved = state; const budget = Math.floor(((state.supplies ?? 0) - reserve) * profiles.growthBudgetFraction); const reserved = (state.supplies ?? 0) - budget;
    state = { ...state, supplies: budget };
    for (const id of [...new Set(['mg', ...roster])]) unlock(id);
    for (const id of roster) for (const profileId of ['power', 'survive']) execute({ type: 'upgrade', nodeId: id, profileId });
    state = { ...state, supplies: (state.supplies ?? 0) + reserved };
    if ((state.supplies ?? 0) < 0) state = saved;
  }
  const directions = getRecon(plan).map(c => c.direction);
  /** @param {import('../src/domain/model/contracts.js').Cell} c */
  const relevant = c => directions.some(d => d === 'north' ? c.row < 2 : d === 'south' ? c.row > 2 : d === 'west' ? c.col < 2 : c.col > 2);
  cells.sort((a, b) => Number(relevant(b)) - Number(relevant(a)) || Math.hypot(a.row - 2, a.col - 2) - Math.hypot(b.row - 2, b.col - 2));
  if (policy === 'wrong') cells.reverse();
  for (const [index, cell] of cells.entries()) {
    let order = state.wave === 1 ? ['rifle'] : [...roster].filter(id => { const n = config.nodes.find(n => n.id === id); return n && isUnlocked(n, state, config.nodes); });
    if (policy !== 'wrong' && state.wave > 1 && state.researchIds.includes('mgR')) { order = order.filter(id => id !== 'rifle'); if (!order.includes('mg')) order.push('mg'); }
    if (['mixed', 'air', 'antiArmor'].includes(policy) || policy === 'recon' && state.wave >= profiles.airResponseWave) order = [...order.slice(index % order.length), ...order.slice(0, index % order.length)];
    if (policy === 'random') {
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    }
    if (!order.includes('rifle')) order.push('rifle');
    if (['recon', 'mixed'].includes(policy) && state.wave >= profiles.airResponseWave) {
      const innerCardinal = Math.abs(cell.row - 2) + Math.abs(cell.col - 2) === 1;
      const outerCardinal = (cell.row === 2 || cell.col === 2) && Math.abs(cell.row - 2) + Math.abs(cell.col - 2) === 2;
      const prefer = innerCardinal ? 'fighter' : outerCardinal ? 'destroyer' : policy === 'mixed' && index % 3 === 0 ? 'tank' : 'gun';
      order = [prefer, ...order.filter(id => id !== prefer)];
    }
    const unit = order.find(id => {
      const node = config.nodes.find(n => n.id === id);
      const remainingReserve = (cells.length - index - 1) * (config.costs.rifle ?? 0);
      return node && isUnlocked(node, state, config.nodes) && (config.costs[id] ?? Infinity) <= (state.supplies ?? 0) - remainingReserve;
    });
    if (unit) execute({ type: 'place', nodeId: unit, cell });
    if (policy === 'wrong' && state.wave > 1 && index >= Math.floor(cells.length / 2)) break;
  }
  return state;
}
