/** @typedef {import('../model/contracts.js').TechNode} TechNode */
/** @param {TechNode[]} nodes */
export function validateTechGraph(nodes) {
  const errors = [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (byId.size !== nodes.length) errors.push('duplicate-node');
  const allowed = new Set(['hq>building', 'building>research', 'research>research', 'research>building', 'research>unit']);
  const visiting = new Set(), visited = new Set();
  /** @param {string} id */
  function visit(id) {
    if (visiting.has(id)) { errors.push(`cycle:${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const p of byId.get(id)?.parentIds ?? []) if (byId.has(p)) visit(p);
    visiting.delete(id); visited.add(id);
  }
  for (const n of nodes) {
    if (!Number.isInteger(n.minWave) || n.minWave < 1 || n.minWave > 100) errors.push(`wave:${n.id}`);
    for (const p of n.parentIds) {
      const parent = byId.get(p);
      if (!parent || !allowed.has(`${parent.kind}>${n.kind}`)) errors.push(`edge:${p}>${n.id}`);
    }
    for (const p of n.revealParentIds) if (!byId.has(p) || p === n.id) errors.push(`reveal:${p}>${n.id}`);
    if (n.kind === 'research') {
      const children = nodes.filter(u => u.kind === 'unit' && u.parentIds.includes(n.id));
      if (children.length !== 1 || children[0].id !== n.unlocksUnitId) errors.push(`unlock:${n.id}`);
    }
    if (n.kind === 'unit' && (n.parentIds.length !== 1 || byId.get(n.parentIds[0])?.kind !== 'research' || byId.get(n.producerId ?? '')?.kind !== 'building')) errors.push(`unit:${n.id}`);
    visit(n.id);
  }
  const revealVisiting = new Set(), revealVisited = new Set();
  /** @param {string} id */
  function visitReveal(id) {
    if (revealVisiting.has(id)) { errors.push(`reveal-cycle:${id}`); return; }
    if (revealVisited.has(id)) return;
    revealVisiting.add(id);
    for (const p of byId.get(id)?.revealParentIds ?? []) if (byId.has(p)) visitReveal(p);
    revealVisiting.delete(id); revealVisited.add(id);
  }
  for (const n of nodes) visitReveal(n.id);
  return errors;
}
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
