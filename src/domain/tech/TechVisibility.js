import { isDone, isUnlocked } from './TechGraph.js';
/** @param {import('../model/contracts.js').DomainConfig} config @param {import('../model/contracts.js').GameState} state */
export function getVisibleTech(config, state) {
  return config.nodes.filter(node => node.parentIds.length === 0 || isDone(node, state) || node.parentIds.some(id => {
    const parent = config.nodes.find(n => n.id === id); return parent && isDone(parent, state);
  })).map(node => {
    const cost = config.costs[node.id]; const unlocked = isUnlocked(node, state, config.nodes);
    const maxed = node.kind === 'unit' && config.upgrades.length > 0 && config.upgrades.every(p => p.costs && (state.upgradeLevels[node.id]?.[p.id] ?? 0) === p.costs.length);
    const status = maxed ? 'maxed' : isDone(node, state) ? 'done' : !unlocked ? 'locked' : cost !== null && cost !== undefined && state.supplies !== null && state.supplies >= cost ? 'affordable' : 'available';
    return { node, status, isNew: unlocked && !isDone(node, state) && !state.acknowledgedNodeIds.includes(node.id) };
  });
}
