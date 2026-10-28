/**
 * Pure, deterministic view projection: a cluster is one logical combat entity.
 * Marker indices never represent individual health, cooldowns or hit targets.
 * @param {{id:string,unitId:string,side:'ally'|'enemy',x:number,y:number,heading:number,hp:number,maxHp:number,combatGrade:number,defenseLevel:number}} entity
 * @param {any} display
 * @param {any} budget
 */
export function buildGroupPresentation(entity, display, budget) {
  const grade = entity.combatGrade,
    counts = display.countsByGrade[entity.unitId];
  if (
    !Number.isInteger(grade) ||
    grade < 0 ||
    grade > 10 ||
    !counts ||
    !Number.isInteger(counts[grade]) ||
    counts[grade] < 1 ||
    counts[grade] > budget.maxMarkersPerEntity
  )
    throw new Error('INVALID_GROUP_GRADE');
  if (
    !Number.isFinite(entity.hp) ||
    !Number.isFinite(entity.maxHp) ||
    entity.maxHp <= 0 ||
    entity.hp < 0 ||
    entity.hp > entity.maxHp
  )
    throw new Error('INVALID_GROUP_HP');
  const fullCount = counts[grade];
  const mode =
    fullCount <= budget.layouts.normal.maxCount ? budget.layouts.normal : budget.layouts.compact;
  const cols = Math.min(mode.maxColumns, Math.ceil(Math.sqrt(fullCount * 1.25)));
  const rows = Math.ceil(fullCount / cols);
  const hpRatio = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
  const remaining = fullCount * hpRatio;
  const markers = Array.from({ length: fullCount }, (_, index) => {
    const row = Math.floor(index / cols);
    const countInRow = Math.min(cols, fullCount - row * cols);
    const col = index - row * cols;
    return {
      index,
      dx: (col - (countInRow - 1) / 2) * mode.markerStepPx,
      dy: (row - (rows - 1) / 2) * mode.markerStepPx,
      alpha: Math.max(0, Math.min(1, remaining - index)),
    };
  });
  const visibleCount = Math.max(1, Math.ceil(remaining));
  let hash = 0;
  for (const ch of entity.id) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0;
  return {
    entityId: entity.id,
    unitId: entity.unitId,
    side: entity.side,
    fullCount,
    combatGrade: grade,
    defenseLevel: entity.defenseLevel,
    origin: { x: entity.x, y: entity.y },
    heading: entity.heading,
    markers,
    markerSizePx: mode.markerSizePx,
    hpRatio,
    fxAnchorIndex: hash % visibleCount,
  };
}
