/** @typedef {import('../model/contracts.js').TechNode} TechNode */
/** @param {TechNode[]} nodes */
export function validateTechGraph(nodes) {
  const errors = [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (byId.size !== nodes.length) errors.push('duplicate-node');
  const allowed = new Set(['hq>research', 'building>research', 'research>research', 'research>building', 'research>unit']);
  const visiting = new Set(); const visited = new Set();
  /** @param {string} id */
  function visit(id) {
    if (visiting.has(id)) { errors.push(`cycle:${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const p of byId.get(id)?.parentIds ?? []) if (byId.has(p)) visit(p);
    visiting.delete(id); visited.add(id);
  }
  for (const n of nodes) {
    for (const p of n.parentIds) {
      const parent = byId.get(p);
      if (!parent || !allowed.has(`${parent.kind}>${n.kind}`)) errors.push(`edge:${p}>${n.id}`);
    }
    if (n.kind === 'research') {
      const children = nodes.filter(u => u.kind === 'unit' && u.parentIds.includes(n.id));
      if (children.length !== 1 || children[0].id !== n.unlocksUnitId) errors.push(`unlock:${n.id}`);
    }
    if (n.kind === 'unit' && (n.parentIds.length !== 1 || byId.get(n.parentIds[0])?.kind !== 'research' || byId.get(n.producerId ?? '')?.kind !== 'building')) errors.push(`unit:${n.id}`);
    visit(n.id);
  }
  return errors;
}
/** @param {TechNode} node @param {import('../model/contracts.js').GameState} state */
export function isDone(node, state) {
  return node.kind === 'research' ? state.researchIds.includes(node.id) : (node.kind === 'building' || node.kind === 'hq') && state.buildingIds.includes(node.id);
}
/** @param {TechNode} node @param {import('../model/contracts.js').GameState} state @param {TechNode[]} nodes */
export function isUnlocked(node, state, nodes) {
  return node.parentIds.every(id => { const p = nodes.find(n => n.id === id); return p !== undefined && isDone(p, state); }) && (!node.producerId || state.buildingIds.includes(node.producerId));
}
