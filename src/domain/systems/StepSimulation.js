import { inAttackSector } from '../util/Geometry.js';
/** @typedef {import('../../../data/balance/candidate-v7.json')} Balance */
/** @typedef {{id:string,unitId:string,side:'ally'|'enemy',x:number,y:number,hp:number,maxHp:number,heading:number,cooldown:number,damage:number,range:number,arc:number,speed:number,splash:number,category:string,modifiers:Record<string,number>}} Entity */
/** @typedef {{type:'fire'|'hit'|'death',x:number,y:number,tx:number,ty:number,side:string}} CombatEvent */
/** @typedef {{tick:number,hqHp:number,entities:Entity[],events:CombatEvent[]}} CombatFrame */
/** @param {string} unitId @param {string} id @param {'ally'|'enemy'} side @param {number} x @param {number} y @param {Balance} balance @param {number} power @param {number} survival @returns {Entity} */
function entity(unitId, id, side, x, y, balance, power, survival) {
  const s = /** @type {Record<string,Balance['units']['rifle']>} */ (balance.units)[unitId];
  if (!s) throw new Error('UNKNOWN_UNIT');
  return { id, unitId, side, x, y, hp: s.hp * survival, maxHp: s.hp * survival, heading: Math.atan2(y, x), cooldown: 0,
    damage: s.damage * power, range: s.range, arc: s.arc * Math.PI / 180, speed: s.speed, splash: s.splash, category: s.category, modifiers: s.modifiers };
}
/** @param {import('../model/contracts.js').GameState} state @param {ReturnType<import('../waves/WavePlanner.js').planWave>} plan @param {Balance} balance */
export function createCombat(state, plan, balance) {
  const allies = state.placements.map(p => entity(p.unitId, p.instanceId, 'ally', p.cell.col - 2, p.cell.row - 2, balance,
    balance.upgradeMultipliers[(state.upgradeLevels[p.unitId]?.power ?? 0) - 1] ?? 1,
    balance.upgradeMultipliers[(state.upgradeLevels[p.unitId]?.survive ?? 0) - 1] ?? 1));
  return { tick: 0, hqHp: balance.hqHp, entities: allies, spawned: new Set(), plan, balance, ended: false,
    outcome: /** @type {'victory'|'defeat'|'invalid'|null} */ (null), events: /** @type {CombatEvent[]} */ ([]),
    damageByUnit: /** @type {Record<string,number>} */ ({}), damageToHq: 0 };
}
/** @param {Entity} a @param {{x:number,y:number}} b */
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** @param {ReturnType<typeof createCombat>} combat */
export function stepCombat(combat) {
  if (combat.ended) return;
  const { balance } = combat; const dt = balance.fixedStepSeconds; combat.events = [];
  for (const spawn of combat.plan.spawns) {
    if (spawn.tick > combat.tick || combat.spawned.has(spawn.id)) continue;
    const d = balance.spawnDistance; const lane = spawn.lane;
    const positions = { north: [lane, -d], south: [lane, d], east: [d, lane], west: [-d, lane] };
    const position = positions[/** @type {keyof typeof positions} */(spawn.direction)];
    if (!position) { combat.ended = true; combat.outcome = 'invalid'; return; }
    const power = 1 + (combat.plan.wave - 1) * balance.enemyPowerPerWave;
    combat.entities.push(entity(spawn.unitId, spawn.id, 'enemy', position[0], position[1], balance, power, power));
    combat.spawned.add(spawn.id);
  }
  const alive = combat.entities.filter(e => e.hp > 0);
  const hq = { id: 'hq', x: 0, y: 0, hp: combat.hqHp, category: 'armor' };
  /** @type {Map<string,number>} */ const damage = new Map();
  for (const actor of alive) {
    actor.cooldown = Math.max(0, actor.cooldown - dt);
    const targets = alive.filter(e => e.side !== actor.side);
    const candidates = actor.side === 'enemy' ? [...targets, hq] : targets;
    const inRange = candidates.filter(target => actor.side === 'enemy' ? distance(actor, target) <= actor.range : inAttackSector(actor, target, actor.heading, actor.range, actor.arc));
    inRange.sort((a, b) => distance(actor, a) - distance(actor, b) || a.id.localeCompare(b.id, 'en'));
    const target = inRange[0];
    if (!target && actor.side === 'enemy') {
      // Cardinal roads merge at the central HQ. Lane is retained until the inner junction.
      const destination = Math.abs(actor.x) > 2 && Math.abs(actor.y) <= 1 ? { x: 0, y: actor.y } : Math.abs(actor.y) > 2 && Math.abs(actor.x) <= 1 ? { x: actor.x, y: 0 } : hq;
      const length = distance(actor, destination); const travel = Math.min(length, actor.speed * dt);
      if (length > 0) { actor.x += (destination.x - actor.x) / length * travel; actor.y += (destination.y - actor.y) / length * travel; }
      continue;
    }
    if (!target || actor.cooldown > 0) continue;
    const template = /** @type {Record<string,Balance['units']['rifle']>} */ (balance.units)[actor.unitId];
    actor.cooldown = template.cooldown;
    combat.events.push({ type: 'fire', x: actor.x, y: actor.y, tx: target.x, ty: target.y, side: actor.side });
    const affected = actor.splash > 0 ? candidates.filter(e => Math.hypot(e.x - target.x, e.y - target.y) <= actor.splash) : [target];
    for (const hit of affected) {
      const amount = actor.damage * (actor.modifiers[hit.category] ?? 0);
      damage.set(hit.id, (damage.get(hit.id) ?? 0) + amount);
      if (actor.side === 'ally') combat.damageByUnit[actor.unitId] = (combat.damageByUnit[actor.unitId] ?? 0) + Math.min(amount, hit.hp);
      if (hit.id === 'hq') combat.damageToHq += amount;
    }
  }
  // Simultaneous attacks resolve as one batch; HQ destruction always wins a tie.
  for (const e of alive) {
    e.hp = Math.max(0, e.hp - (damage.get(e.id) ?? 0));
    if (damage.has(e.id)) combat.events.push({ type: 'hit', x: e.x, y: e.y, tx: e.x, ty: e.y, side: e.side });
    if (e.hp === 0) combat.events.push({ type: 'death', x: e.x, y: e.y, tx: e.x, ty: e.y, side: e.side });
  }
  combat.hqHp = Math.max(0, combat.hqHp - (damage.get('hq') ?? 0));
  combat.entities = alive.filter(e => e.hp > 0); combat.tick += 1;
  if (combat.hqHp <= 0) { combat.ended = true; combat.outcome = 'defeat'; }
  else if (combat.spawned.size === combat.plan.totalPlanned && !combat.entities.some(e => e.side === 'enemy')) { combat.ended = true; combat.outcome = 'victory'; }
  else if (combat.tick >= balance.maxTicks) { combat.ended = true; combat.outcome = 'invalid'; }
}
/** Same engine used by renderer worker and Node balance CLI. @param {import('../model/contracts.js').GameState} state @param {ReturnType<import('../waves/WavePlanner.js').planWave>} plan @param {Balance} balance @param {boolean} [record] */
export function simulateBattle(state, plan, balance, record = false) {
  const combat = createCombat(state, plan, balance); /** @type {CombatFrame[]} */ const frames = [];
  /** @type {CombatEvent[]} */ let pendingEvents = [];
  if (record) frames.push({ tick: 0, hqHp: combat.hqHp, entities: structuredClone(combat.entities), events: [] });
  while (!combat.ended) {
    stepCombat(combat);
    if (record) pendingEvents.push(...combat.events);
    if (record && (combat.tick % balance.frameStride === 0 || combat.ended)) { frames.push({ tick: combat.tick, hqHp: combat.hqHp, entities: structuredClone(combat.entities), events: pendingEvents }); pendingEvents = []; }
  }
  return { outcome: combat.outcome, hqHp: combat.hqHp, ticks: combat.tick, damageByUnit: combat.damageByUnit, damageToHq: combat.damageToHq, frames, resolutionId: `${state.campaignId}:${plan.wave}:${plan.seed}` };
}
