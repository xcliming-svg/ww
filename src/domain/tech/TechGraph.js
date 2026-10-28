/** @typedef {import('../model/contracts.js').TechNode} TechNode */
/** @param {TechNode} node @param {import('../model/contracts.js').GameState} state */
export function isDone(node, state) {
  return node.kind === 'research' ? state.researchIds.includes(node.id) : (node.kind === 'building' || node.kind === 'hq') && state.buildingIds.includes(node.id);
}
/** @param {TechNode} node @param {import('../model/contracts.js').GameState} state @param {TechNode[]} nodes */
export function isUnlocked(node, state, nodes) {
  if (state.legacyFreeNodeIds.length && isDone(node, state)) return true;
  return state.wave >= node.minWave && node.parentIds.every(id => {
    const p = nodes.find(n => n.id === id);
    return p !== undefined && isDone(p, state);
  }) && (!node.producerId || state.buildingIds.includes(node.producerId));
}
/** Permanently reveal only immediate children of an activated node.
 * @param {import('../model/contracts.js').GameState} state @param {string} id @param {TechNode[]} nodes */
export function revealChildren(state, id, nodes) {
  for (const node of nodes) if (node.revealParentIds.includes(id) && !state.revealedNodeIds.includes(node.id)) state.revealedNodeIds.push(node.id);
}
