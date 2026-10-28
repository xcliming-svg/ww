import { validateTechGraph } from '../../src/infrastructure/ValidateTechGraph.js';
import { check, finish, data, errors } from './context.mjs';
const nodes = /** @type {import('../../src/domain/model/contracts.js').TechNode[]} */ (data['data/tech/nodes.json']); errors.push(...validateTechGraph(nodes));
check(nodes.length === 28 && nodes.filter(n => n.kind === 'research').length === 12 && nodes.filter(n => n.kind === 'unit').length === 12, '28/12/12 tree counts');
const required = {
  hq: [1, []], barracks: [1, ['hq']], rifleR: [1, ['barracks']], rifle: [1, ['rifleR']],
  mgR: [3, ['barracks']], mortarR: [6, ['barracks']], atR: [9, ['barracks']],
  gunR: [12, ['mortarR']], factory: [15, ['atR']], carR: [16, ['factory']],
  tankR: [21, ['carR']], airfield: [29, ['carR']], fighterR: [30, ['airfield']],
  attackerR: [35, ['airfield']], destroyerR: [37, ['tankR']],
  heavyR: [36, ['tankR']], bomberR: [43, ['attackerR']]
};
for (const [id, [wave, parents]] of Object.entries(required)) {
  const n = nodes.find(node => node.id === id);
  check(n && n.minWave === wave && JSON.stringify(n.parentIds) === JSON.stringify(parents), `Tech gate:${id}`);
}
const hq = nodes.find(n => n.id === 'hq');
check(hq?.revealParentIds.length === 0 && nodes.filter(n => n.revealParentIds.length === 0).length === 1, 'HQ-only starting reveal');
check(JSON.stringify(nodes.filter(n => n.revealParentIds.includes('hq')).map(n => n.id).sort()) === JSON.stringify(['airfield','barracks','factory']), 'HQ reveal frontier');
check(nodes.filter(n => n.kind === 'unit').every(n => n.minWave === 1 && n.revealParentIds.length === 1 && n.revealParentIds[0] === n.parentIds[0]), 'Unit unlock/reveal contract');
const hint = data['data/tech/layout-hints.json'];
check(hint.nodeWidth === hint.nodeHeight && hint.nodeWidth > 0, 'Square node dimensions');
const startup = data['data/balance/candidate-v13-robot-defense.json'];
check(startup.initialSupplies === 160 && startup.costs.hq === 30 && startup.costs.barracks === 30, 'Opening costs');
check(startup.initialSupplies - startup.costs.hq - startup.costs.barracks - startup.costs.rifleR - startup.costs.rifle * 2 === 20, 'Opening two rifle balance');
const stats = data['data/balance/candidate-v13-robot-defense.json'].units;
for (const p of data['data/tech/progression.json']) {
  check(stats[p.from] && stats[p.to], `Missing progression unit:${p.to}`);
  check(stats[p.to].damage * stats[p.to].modifiers[p.focus] / stats[p.to].cooldown > stats[p.from].damage * stats[p.from].modifiers[p.focus] / stats[p.from].cooldown || stats[p.to].hp > stats[p.from].hp || stats[p.to].range > stats[p.from].range, `No progression benefit:${p.to}`);
}
for (const n of nodes.filter(n => n.kind === 'research' && n.parentIds.some(id => nodes.find(p => p.id === id)?.kind === 'research'))) {
  check(data['data/tech/progression.json'].some((/** @type {{to:string}} */ p) => p.to === n.unlocksUnitId), `No progression contract:${n.id}`);
}
finish('graph');
