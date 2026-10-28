import { inAttackSector } from '../util/Geometry.js';
import { resolveDamageBatch } from './DamageResolver.js';
import { gradeForEnemyWave } from '../waves/WavePlanner.js';
import { doctrineMultipliers } from '../model/Doctrine.js';
/** @typedef {ReturnType<import('../model/ResolveCombatBalance.js').resolveCombatBalance>} Balance */
/** @typedef {{id:string,unitId:string,side:'ally'|'enemy',x:number,y:number,hp:number,maxHp:number,heading:number,cooldown:number,damage:number,range:number,arc:number,speed:number,splash:number,category:string,modifiers:Record<string,number>,combatGrade:number,defenseLevel:number,defenseDivisor:number}} Entity */
/** @typedef {{type:'fire'|'hit'|'death',tick:number,sequence:number,side:'ally'|'enemy',entityId:string,unitId:string,targetId:string|null,x:number,y:number,tx:number,ty:number}} CombatEvent */
/** @typedef {{tick:number,hqHp:number,entities:Entity[],events:CombatEvent[]}} CombatFrame */

/** @param {string} unitId @param {string} id @param {'ally'|'enemy'} side
 * @param {number} x @param {number} y @param {Balance} balance
 * @param {number} damageFactor @param {number} hpFactor @param {number} grade
 * @param {number} defenseLevel @returns {Entity} */
function entity(unitId, id, side, x, y, balance, damageFactor, hpFactor, grade, defenseLevel) {
  const s = balance.units[unitId];
  if (!s) throw new Error('UNKNOWN_UNIT');
  const defenseDivisor = balance.defenseDivisors?.[defenseLevel] ?? 1;
  if (!Number.isFinite(damageFactor) || damageFactor <= 0 ||
    !Number.isFinite(hpFactor) || hpFactor <= 0 ||
    !Number.isFinite(defenseDivisor) || defenseDivisor <= 0) throw new Error('INVALID_COMBAT_MULTIPLIER');
  const maxHp = s.hp * hpFactor;
  return { id, unitId, side, x, y, hp: maxHp, maxHp, heading: Math.atan2(y, x), cooldown: 0,
    damage: s.damage * damageFactor, range: s.range, arc: s.arc * Math.PI / 180, speed: s.speed,
    splash: s.splash, category: s.category, modifiers: s.modifiers, combatGrade: grade,
    defenseLevel, defenseDivisor };
}
/** @param {string} unitId @param {number} grade @param {Balance} balance */
function enemyGradeFactors(unitId, grade, balance) {
  const model = balance.gradeModel;
  if (!model || !Number.isInteger(grade) || grade < 0 || grade > model.maxGrade ||
    !model.countsByGrade[unitId]) throw new Error('INVALID_ENEMY_GRADE');
  const counts = model.countsByGrade[unitId];
  const count = counts[grade], anchor = counts[model.allyAnchorGrade];
  if (!Number.isInteger(count) || count < 1 || count > 24 ||
    !Number.isInteger(anchor) || anchor < 1 || anchor > 24) throw new Error('INVALID_GRADE_COUNTS');
  const massFactor = count / anchor;
  const attackFactor = grade <= model.allyAnchorGrade ? massFactor : model.attackMultipliersG6ToG10[grade - model.allyAnchorGrade - 1];
  if (!Number.isFinite(attackFactor) || attackFactor <= 0) throw new Error('INVALID_GRADE_ATTACK');
  return { massFactor, attackFactor };
}
/** @param {import('../model/contracts.js').GameState} state
 * @param {ReturnType<import('../waves/WavePlanner.js').planWave>} plan @param {Balance} balance */
function createCombat(state, plan, balance) {
  const allies = state.placements.map(p => {
    const powerLevel = state.upgradeLevels[p.unitId]?.power ?? 0;
    const defenseLevel = state.upgradeLevels[p.unitId]?.survive ?? 0;
    if (!Number.isInteger(powerLevel) || powerLevel < 0 || powerLevel > 3 ||
      !Number.isInteger(defenseLevel) || defenseLevel < 0 || defenseLevel > 3) throw new Error('INVALID_UPGRADE_LEVEL');
    const grade = balance.gradeModel?.allyVisibleToGrade[powerLevel] ?? 5 + powerLevel;
    if (!Number.isInteger(grade) || grade < 5 || grade > 8) throw new Error('INVALID_ALLY_GRADE');
    const damageFactor = powerLevel === 0 ? 1 : balance.upgradeMultipliers[powerLevel - 1];
    const bonuses = doctrineMultipliers(state.doctrines, p.unitId);
    const ally = entity(p.unitId, p.instanceId, 'ally', p.cell.col - 2, p.cell.row - 2,
      balance, damageFactor * bonuses.damage, bonuses.hp, grade, defenseLevel);
    // Doctrine matchups are separate from main grade, logical HP pool and defense divisor.
    ally.modifiers = { ...ally.modifiers,
      armor: ally.modifiers.armor * bonuses.armor,
      aircraft: ally.modifiers.aircraft * bonuses.aircraft };
    return ally;
  });
  /** @type {Record<string,number>} */
  const actualDamageByUnit = {};
  return { tick: 0, hqHp: state.hqHp, entities: allies, spawned: new Set(), plan, balance, ended: false,
    outcome: /** @type {'victory'|'defeat'|'invalid'|null} */ (null), events: /** @type {CombatEvent[]} */ ([]),
    rawDamageByUnit: /** @type {Record<string,number>} */ ({}),
    actualDamageByUnit,
    damageByUnit: actualDamageByUnit, // Compatibility alias: always actual dealt damage, never raw/overkill.
    damageToHq: 0 };
}
/** @param {Entity} a @param {{x:number,y:number}} b */
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** @param {ReturnType<typeof createCombat>} combat */
function stepCombat(combat) {
  if (combat.ended) return;
  const { balance } = combat;
  const dt = balance.fixedStepSeconds;
  combat.events = [];
  /** @param {'fire'|'hit'|'death'} type @param {Entity|{id:string,unitId:string,side:'ally'|'enemy',x:number,y:number}} subject
   * @param {{id:string,x:number,y:number}|null} target */
  const emitEvent = (type, subject, target = null) => {
    combat.events.push({ type, tick: combat.tick + 1, sequence: combat.events.length,
      side: subject.side, entityId: subject.id, unitId: subject.unitId, targetId: type === 'fire' ? target?.id ?? null : null,
      x: subject.x, y: subject.y, tx: target?.x ?? subject.x, ty: target?.y ?? subject.y });
  };
  for (const spawn of combat.plan.spawns) {
    if (spawn.tick > combat.tick || combat.spawned.has(spawn.id)) continue;
    const d = balance.spawnDistance, lane = spawn.lane;
    const positions = { north: [lane, -d], south: [lane, d], east: [d, lane], west: [-d, lane] };
    const position = positions[/** @type {keyof typeof positions} */ (spawn.direction)];
    if (!position) { combat.ended = true; combat.outcome = 'invalid'; return; }
    const waveScale = 1 + (combat.plan.wave - 1) * balance.enemyPowerPerWave;
    const grade = balance.gradeModel ? (spawn.combatGrade ?? -1) : 5;
    if (balance.gradeModel && grade !== gradeForEnemyWave(combat.plan.wave, balance.gradeModel)) throw new Error('INVALID_ENEMY_GRADE');
    const factors = balance.gradeModel ? enemyGradeFactors(spawn.unitId, grade, balance) : { massFactor: 1, attackFactor: 1 };
    combat.entities.push(entity(spawn.unitId, spawn.id, 'enemy', position[0], position[1], balance,
      factors.attackFactor * waveScale, factors.massFactor * waveScale, grade, 0));
    combat.spawned.add(spawn.id);
  }
  const alive = combat.entities.filter(e => e.hp > 0);
  const hq = { id: 'hq', unitId: 'hq', side: /** @type {'ally'} */ ('ally'),
    x: 0, y: 0, hp: combat.hqHp, category: 'armor' };
  /** @type {Map<string,{unitId:string,side:string,rawDamage:number}[]>} */
  const damage = new Map();
  for (const actor of alive) {
    actor.cooldown = Math.max(0, actor.cooldown - dt);
    const targets = alive.filter(e => e.side !== actor.side);
    const candidates = actor.side === 'enemy' ? [...targets, hq] : targets;
    const inRange = candidates.filter(target => actor.side === 'enemy'
      ? distance(actor, target) <= actor.range
      : inAttackSector(actor, target, actor.heading, actor.range, actor.arc));
    inRange.sort((a, b) => distance(actor, a) - distance(actor, b) || a.id.localeCompare(b.id, 'en'));
    const target = inRange[0];
    if (!target && actor.side === 'enemy') {
      // Original road AI and speed are unchanged; visual glyphs do not participate.
      const destination = Math.abs(actor.x) > 2 && Math.abs(actor.y) <= 1 ? { x: 0, y: actor.y }
        : Math.abs(actor.y) > 2 && Math.abs(actor.x) <= 1 ? { x: actor.x, y: 0 } : hq;
      const length = distance(actor, destination), travel = Math.min(length, actor.speed * dt);
      if (length > 0) { actor.x += (destination.x - actor.x) / length * travel; actor.y += (destination.y - actor.y) / length * travel; }
      continue;
    }
    if (!target || actor.cooldown > 0) continue;
    const template = balance.units[actor.unitId];
    actor.cooldown = template.cooldown;
    emitEvent('fire', actor, target);
    const affected = actor.splash > 0 ? candidates.filter(e => Math.hypot(e.x - target.x, e.y - target.y) <= actor.splash) : [target];
    for (const hit of affected) {
      const rawDamage = actor.damage * (actor.modifiers[hit.category] ?? 0);
      if (!Number.isFinite(rawDamage) || rawDamage < 0) throw new Error('INVALID_RAW_DAMAGE');
      const entries = damage.get(hit.id) ?? [];
      entries.push({ unitId: actor.unitId, side: actor.side, rawDamage });
      damage.set(hit.id, entries);
      if (actor.side === 'ally') combat.rawDamageByUnit[actor.unitId] = (combat.rawDamageByUnit[actor.unitId] ?? 0) + rawDamage;
    }
  }
  // Batch each logical target once. The HP pool and defense are never per-glyph.
  for (const target of [...alive, hq]) {
    const contributions = damage.get(target.id);
    if (!contributions?.length) continue;
    const resolution = resolveDamageBatch(target.hp, target.id === 'hq' ? 1 : ('defenseDivisor' in target ? target.defenseDivisor : 1), contributions);
    if (resolution.applied === 0) continue;
    target.hp = resolution.hpAfter;
    for (const item of resolution.attribution) if (item.side === 'ally') {
      combat.actualDamageByUnit[item.unitId] = (combat.actualDamageByUnit[item.unitId] ?? 0) + item.actualDamage;
    }
    if (target.id === 'hq') combat.damageToHq += resolution.applied;
    emitEvent('hit', target);
    if (target.hp <= 0) emitEvent('death', target);
  }
  combat.hqHp = hq.hp;
  combat.entities = alive.filter(e => e.hp > 0);
  combat.tick += 1;
  if (combat.hqHp <= 0) { combat.ended = true; combat.outcome = 'defeat'; }
  else if (combat.spawned.size === combat.plan.totalPlanned && !combat.entities.some(e => e.side === 'enemy')) {
    combat.ended = true; combat.outcome = 'victory';
  } else if (combat.tick >= balance.maxTicks) { combat.ended = true; combat.outcome = 'invalid'; }
}
/** Same engine used by renderer worker and Node balance CLI.
 * @param {import('../model/contracts.js').GameState} state
 * @param {ReturnType<import('../waves/WavePlanner.js').planWave>} plan
 * @param {Balance} balance @param {boolean} [record] */
export function simulateBattle(state, plan, balance, record = false) {
  const combat = createCombat(state, plan, balance);
  /** @type {CombatFrame[]} */
  const frames = [];
  /** @type {CombatEvent[]} */
  let pendingEvents = [];
  if (record) frames.push({ tick: 0, hqHp: combat.hqHp, entities: structuredClone(combat.entities), events: [] });
  while (!combat.ended) {
    stepCombat(combat);
    if (record) pendingEvents.push(...combat.events);
    if (record && (combat.tick % balance.frameStride === 0 || combat.ended)) {
      frames.push({ tick: combat.tick, hqHp: combat.hqHp, entities: structuredClone(combat.entities), events: pendingEvents });
      pendingEvents = [];
    }
  }
  return { outcome: combat.outcome, hqHp: combat.hqHp, ticks: combat.tick,
    rawDamageByUnit: combat.rawDamageByUnit, actualDamageByUnit: combat.actualDamageByUnit,
    damageByUnit: combat.actualDamageByUnit, damageToHq: combat.damageToHq, frames,
    resolutionId: `${state.campaignId}:${plan.wave}:${plan.seed}` };
}
