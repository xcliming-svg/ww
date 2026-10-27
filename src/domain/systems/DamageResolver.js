/**
 * Resolves simultaneous contributions against one logical HP pool.
 * Protection is applied once, after raw contributions are summed.
 * @param {number} hp
 * @param {number} divisor
 * @param {{unitId:string,side:string,rawDamage:number}[]} contributions
 */
export function resolveDamageBatch(hp, divisor, contributions) {
  if (!Number.isFinite(hp) || hp < 0 || !Number.isFinite(divisor) || divisor <= 0) throw new Error('INVALID_DAMAGE_TARGET');
  let rawTotal = 0;
  for (const item of contributions) {
    if (!Number.isFinite(item.rawDamage) || item.rawDamage < 0) throw new Error('INVALID_RAW_DAMAGE');
    rawTotal += item.rawDamage;
  }
  if (!Number.isFinite(rawTotal)) throw new Error('INVALID_RAW_DAMAGE');
  const mitigatedTotal = rawTotal / divisor;
  const applied = Math.min(hp, mitigatedTotal);
  return { rawTotal, mitigatedTotal, applied, hpAfter: hp - applied,
    attribution: rawTotal === 0 ? [] : contributions.map(item => ({
      ...item, actualDamage: applied * (item.rawDamage / rawTotal)
    }))
  };
}
