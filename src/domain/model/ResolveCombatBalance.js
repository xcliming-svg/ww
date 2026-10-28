/**
 * Combines the independent combat candidate and the single visual grade-count
 * source. No IO, rendering, random state or mutation of either input.
 * @param {any} candidate
 * @param {any} display
 */
export function resolveCombatBalance(candidate, display) {
  if (!candidate || !candidate.gradeModel || !display || display.schemaVersion !== 2) throw new Error('INVALID_GRADE_MODEL');
  const model = candidate.gradeModel;
  if (model.minGrade !== 0 || model.maxGrade !== 10 || model.allyAnchorGrade !== 5 ||
    !Number.isInteger(model.enemyWavesPerGrade) || model.enemyWavesPerGrade < 1 ||
    model.enemyHpUsesTroopMass !== true || model.enemyDamageBelowAnchorUsesTroopMass !== true ||
    JSON.stringify(display.allyVisibleToGrade) !== '[5,6,7,8]' ||
    !Array.isArray(model.attackMultipliersG6ToG10) || model.attackMultipliersG6ToG10.length !== 5 ||
    model.attackMultipliersG6ToG10.some((/** @type {number} */ n) => !Number.isFinite(n) || n <= 0) ||
    !Array.isArray(candidate.defenseDivisors) || candidate.defenseDivisors.length !== 4 ||
    candidate.defenseDivisors[0] !== 1 || candidate.defenseDivisors.some((/** @type {number} */ n) => !Number.isFinite(n) || n <= 0)) throw new Error('INVALID_GRADE_MODEL');
  /** @type {Record<string,number[]>} */
  const countsByGrade = {};
  const ids = Object.keys(candidate.units);
  if (Object.keys(display.countsByGrade ?? {}).length !== ids.length ||
    display.maxMarkersPerEntity !== 24 || display.minGrade !== 0 || display.maxGrade !== 10) throw new Error('INVALID_GRADE_COUNTS');
  for (const id of ids) {
    const counts = display.countsByGrade[id];
    if (!Array.isArray(counts) || counts.length !== 11 ||
      counts.some((n, i) => !Number.isInteger(n) || n < 1 || n > 24 || (i && n < counts[i - 1]))) throw new Error('INVALID_GRADE_COUNTS');
    countsByGrade[id] = [...counts];
  }
  return {
    ...candidate,
    defenseDivisors: [...candidate.defenseDivisors],
    gradeModel: {
      ...model,
      attackMultipliersG6ToG10: [...model.attackMultipliersG6ToG10],
      countsByGrade,
      allyVisibleToGrade: [...display.allyVisibleToGrade]
    }
  };
}
