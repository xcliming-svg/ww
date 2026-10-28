import { validateState } from '../model/GameState.js';
import { isDone, isUnlocked } from '../tech/TechGraph.js';
import { failure, success, isAmount } from '../util/Result.js';
/** @typedef {{token:string,total:number,permanentTotal:number,placementTotal:number,nodeIds:string[],investmentIds:string[],placementIds:string[],unitIds:string[],profileId:string|null}} RefundQuote */
/** Preview full cascade; only prerequisite/producer edges participate in dependency closure.
 * @param {import('../model/contracts.js').GameState} state @param {string} nodeId @param {import('../model/contracts.js').DomainConfig} config @param {string} [profileId]
 * @returns {import('../model/contracts.js').Result<RefundQuote>} */
export function quoteRefund(state, nodeId, config, profileId) {
  if (!validateState(state, config)) return failure('INVALID_STATE');
  if (state.phase !== 'preparation') return failure('PHASE_LOCKED');
  const node = config.nodes.find((n) => n.id === nodeId);
  if (!node) return failure('UNKNOWN_NODE');
  // HQ teardown remains an explicitly unapproved, non-refundable safety default.
  if (node.id === 'hq' || state.legacyFreeNodeIds.includes(nodeId))
    return failure('REFUND_PROTECTED');
  if (
    (node.kind !== 'unit' && !isDone(node, state)) ||
    (node.kind === 'unit' && !isUnlocked(node, state, config.nodes))
  )
    return failure('NOTHING_TO_REFUND');
  if (
    profileId &&
    !config.upgrades.some(
      (p) => p.id === profileId && (p.nodeKinds ?? ['unit']).includes(node.kind),
    )
  )
    return failure('INVALID_COMMAND');
  const affected = new Set([nodeId]);
  if (!profileId && node.kind !== 'unit') {
    let changed = true;
    while (changed) {
      changed = false;
      for (const child of config.nodes)
        if (
          !affected.has(child.id) &&
          (child.parentIds.some((id) => affected.has(id)) ||
            (child.producerId && affected.has(child.producerId)))
        ) {
          affected.add(child.id);
          changed = true;
        }
    }
  }
  const entries = state.investments.filter(
    (e) => affected.has(e.nodeId) && (!profileId || e.profileId === profileId),
  );
  const placements =
    profileId || node.kind === 'unit' ? [] : state.placements.filter((p) => affected.has(p.unitId));
  if (!entries.length && !placements.length) return failure('NOTHING_TO_REFUND');
  const permanentTotal = entries.reduce((n, e) => n + e.paidCost, 0);
  const placementTotal = placements.reduce((n, p) => n + p.paidCost, 0);
  const total = permanentTotal + placementTotal;
  if (!isAmount(total) || !isAmount(state.supplies) || !isAmount(state.supplies + total))
    return failure('OVERFLOW');
  const quote = {
    total,
    permanentTotal,
    placementTotal,
    nodeIds:
      node.kind === 'unit' || profileId
        ? []
        : config.nodes.filter((n) => affected.has(n.id) && isDone(n, state)).map((n) => n.id),
    investmentIds: entries.map((e) => e.id).sort(),
    placementIds: placements.map((p) => p.instanceId).sort(),
    unitIds: config.nodes.filter((n) => affected.has(n.id)).map((n) => n.id),
    profileId: profileId ?? null,
  };
  const token = JSON.stringify({
    quote,
    supplies: state.supplies,
    commandIds: state.commandIds,
    placements,
  });
  return success({ ...quote, token });
}
/** @param {import('../model/contracts.js').GameState} next @param {RefundQuote} quote */
export function applyRefund(next, quote) {
  next.supplies = (next.supplies ?? 0) + quote.total;
  next.buildingIds = next.buildingIds.filter((id) => !quote.nodeIds.includes(id));
  next.researchIds = next.researchIds.filter((id) => !quote.nodeIds.includes(id));
  next.investments = next.investments.filter((e) => !quote.investmentIds.includes(e.id));
  next.placements = next.placements.filter((p) => !quote.placementIds.includes(p.instanceId));
  // Revealed nodes and acknowledgements are permanent knowledge, not investments.
  for (const id of quote.unitIds) {
    if (quote.profileId) {
      if (next.upgradeLevels[id]) delete next.upgradeLevels[id][quote.profileId];
      if (!Object.keys(next.upgradeLevels[id] ?? {}).length) delete next.upgradeLevels[id];
    } else delete next.upgradeLevels[id];
  }
}
