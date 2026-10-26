import { failure, success } from '../domain/util/Result.js';
import { expectedInvestments } from '../domain/economy/InvestmentLedger.js';
import compatibility from '../../data/save/compatibility.json';
import legacyCosts from '../../data/balance/candidate-v10.json';
/** Version gate only. Validate the original checksum before migrating any fields.
 * @param {unknown} raw @returns {import('../domain/model/contracts.js').Result<Record<string,unknown>>} */
export function migrateEnvelope(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return failure('SAVE_CORRUPT');
  const envelope = /** @type {Record<string,unknown>} */ (raw);
  if (envelope.schemaVersion !== 1 && envelope.schemaVersion !== 2) return failure('SAVE_VERSION');
  return success(envelope);
}
/** Explicit price-compatible migration only; unknown balance versions remain incompatible.
 * @param {import('../domain/model/contracts.js').SaveEnvelope} envelope @param {import('../domain/model/contracts.js').DomainConfig} config */
export function compatibleConfig(envelope, config) {
  if (envelope.configVersion === config.rules.configVersion) return true;
  const entry = compatibility.migrations.find(m => m.schemaVersion === envelope.schemaVersion && m.fromConfig === envelope.configVersion && m.toConfig === config.rules.configVersion);
  return entry?.costSource === legacyCosts.id && Object.keys(config.costs).length === Object.keys(legacyCosts.costs).length && Object.entries(legacyCosts.costs).every(([id, cost]) => config.costs[id] === cost) && config.upgrades.every(p => JSON.stringify(p.costs) === JSON.stringify(legacyCosts.upgradeCostFactors));
}
/** v1 had fixed costs, no discounts/refunds, and no investment ledger. Known price compatibility is mandatory at the caller.
 * @param {import('../domain/model/contracts.js').GameState} state @param {number} version @param {import('../domain/model/contracts.js').DomainConfig} config */
export function migrateState(state, version, config) {
  const next = structuredClone(state);
  if (version === 1) {
    next.investments = expectedInvestments(next, config);
    if (next.checkpoint) next.checkpoint.investments = expectedInvestments(next.checkpoint, config);
  }
  return next;
}
