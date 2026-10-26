/** @typedef {import('../model/contracts.js').Investment} Investment */
/** Reconstructs the fixed-price v1 format only after its content/config version is verified.
 * @param {import('../model/contracts.js').GameState} state @param {import('../model/contracts.js').DomainConfig} config @returns {Investment[]} */
export function expectedInvestments(state, config) {
  /** @type {Investment[]} */ const entries = [];
  for (const [kind, ids, free] of /** @type {['building'|'research',string[],string[]][]} */ ([['building', state.buildingIds, config.rules.preview.buildingIds], ['research', state.researchIds, config.rules.preview.researchIds]])) {
    for (const nodeId of ids) if (!free.includes(nodeId)) entries.push({ id: `${kind}:${nodeId}`, kind, nodeId, profileId: null, level: 0, paidCost: config.costs[nodeId] ?? NaN });
  }
  for (const [nodeId, levels] of Object.entries(state.upgradeLevels)) for (const [profileId, level] of Object.entries(levels)) {
    const profile = config.upgrades.find(p => p.id === profileId);
    for (let i = 1; i <= level; i++) entries.push({ id: `upgrade:${nodeId}:${profileId}:${i}`, kind: 'upgrade', nodeId, profileId, level: i, paidCost: Math.ceil((config.costs[nodeId] ?? NaN) * (profile?.costs?.[i - 1] ?? NaN)) });
  }
  return entries;
}
/** @param {import('../model/contracts.js').GameState} state @param {import('../model/contracts.js').DomainConfig} config */
export function validInvestments(state, config) {
  if (!Array.isArray(state.investments)) return false;
  const actual = new Map(state.investments.map(e => [e.id, e]));
  if (actual.size !== state.investments.length) return false;
  const expected = expectedInvestments(state, config);
  return expected.length === state.investments.length && expected.every(a => { const b = actual.get(a.id); return b && a.nodeId === b.nodeId && a.kind === b.kind && a.profileId === b.profileId && a.level === b.level && a.paidCost === b.paidCost; });
}
