import { failure, success } from '../domain/util/Result.js';
import { expectedInvestments } from '../domain/economy/InvestmentLedger.js';
import { revealChildren } from '../domain/tech/TechGraph.js';
import compatibility from '../../data/save/compatibility.json';
import legacyCosts from '../../data/balance/candidate-v10.json';
import v11 from '../../data/balance/candidate-v11.json';
/** Validate original schema and checksum before migrating fields.
 * @param {unknown} raw @returns {import('../domain/model/contracts.js').Result<Record<string,unknown>>} */
export function migrateEnvelope(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return failure('SAVE_CORRUPT');
  const envelope = /** @type {Record<string,unknown>} */ (raw);
  if (![1, 2, 3].includes(/** @type {number} */ (envelope.schemaVersion))) return failure('SAVE_VERSION');
  return success(envelope);
}
/** @param {import('../domain/model/contracts.js').SaveEnvelope} envelope @param {import('../domain/model/contracts.js').DomainConfig} config */
export function compatibleConfig(envelope, config) {
  if (envelope.schemaVersion === config.rules.schemaVersion && envelope.configVersion === config.rules.configVersion) return true;
  const entry = compatibility.migrations.find(m => m.schemaVersion === envelope.schemaVersion && m.fromConfig === envelope.configVersion && m.toConfig === config.rules.configVersion);
  if (!entry) return false;
  const source = entry.costSource === legacyCosts.id ? legacyCosts : entry.costSource === v11.id ? v11 : null;
  return source !== null && Object.keys(config.costs).length === Object.keys(source.costs).length &&
    Object.entries(source.costs).every(([id, cost]) => ['hq', 'barracks'].includes(id) || config.costs[id] === cost) &&
    config.upgrades.every(p => JSON.stringify(p.costs) === JSON.stringify(source.upgradeCostFactors));
}
/** @param {import('../domain/model/contracts.js').GameState} state @param {number} version @param {import('../domain/model/contracts.js').DomainConfig} config */
export function migrateState(state, version, config) {
  const next = structuredClone(state);
  if (version === 3) return next;
  /** @param {import('../domain/model/contracts.js').GameState} old */
  function transform(old) {
    old.legacyFreeNodeIds = ['hq', 'barracks', 'rifleR'];
    old.revealedNodeIds = ['hq'];
    for (const id of [...old.buildingIds, ...old.researchIds]) {
      if (!old.revealedNodeIds.includes(id)) old.revealedNodeIds.push(id);
      revealChildren(old, id, config.nodes);
    }
    for (const id of old.acknowledgedNodeIds) if (!old.revealedNodeIds.includes(id)) old.revealedNodeIds.push(id);
    if (version === 1) {
      const oldConfig = { ...config, costs: legacyCosts.costs };
      old.investments = expectedInvestments(old, oldConfig);
    }
  }
  transform(next);
  if (next.checkpoint) transform(next.checkpoint);
  return next;
}
