/** @param {import('./contracts.js').TechNode[]} nodes @param {import('./contracts.js').DomainConfig['layouts']} layouts @param {import('./contracts.js').Rules} rules @param {import('../../../data/balance/candidate-v7.json')} balance @returns {import('./contracts.js').DomainConfig} */
export function makeDomainConfig(nodes, layouts, rules, balance) {
  return { nodes, layouts, rules, costs: balance.costs,
    upgrades: ['power', 'survive'].map(id => ({ id, labelKey: `upgrade.${id}`, costs: balance.upgradeCostFactors, multipliers: id === 'power' ? balance.upgradeMultipliers : balance.defenseDivisors ?? balance.upgradeMultipliers, effectKind: id === 'survive' ? 'damage-divisor' : 'damage-multiplier', nodeKinds: ['unit'] })) };
}
