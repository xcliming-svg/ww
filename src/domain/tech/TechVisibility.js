import { isDone, isUnlocked } from './TechGraph.js';
/** @param {import('../model/contracts.js').DomainConfig} config @param {import('../model/contracts.js').GameState} state */
export function getVisibleTech(config, state) {
  return config.nodes.filter(node => state.revealedNodeIds.includes(node.id)).map(node => {
    const cost = config.costs[node.id];
    const unlocked = isUnlocked(node, state, config.nodes);
    const profiles = config.upgrades.filter(p => p.nodeKinds?.includes(node.kind));
    const maxed = node.kind === 'unit' && profiles.length > 0 && profiles.every(p => p.costs && (state.upgradeLevels[node.id]?.[p.id] ?? 0) === p.costs.length);
    const status = isDone(node, state) ? 'done' : !unlocked ? 'locked' : maxed ? 'maxed' : cost !== null && cost !== undefined && state.supplies !== null && state.supplies >= cost ? 'affordable' : 'available';
    return { node, status, isNew: node.kind !== 'hq' && unlocked && !isDone(node, state) && !state.acknowledgedNodeIds.includes(node.id) };
  });
}
