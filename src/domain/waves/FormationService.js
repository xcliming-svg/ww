/** @typedef {import('../model/contracts.js').Cell} Cell */
/** @param {Cell} a @param {Cell} b */
export const sameCell = (a, b) => a.row === b.row && a.col === b.col;
/** @param {unknown} cell @param {number} gridSize @returns {cell is Cell} */
function validCell(cell, gridSize) {
  if (!cell || typeof cell !== 'object') return false;
  const c = /** @type {Cell} */ (cell);
  return (
    Number.isInteger(c.row) &&
    Number.isInteger(c.col) &&
    c.row >= 0 &&
    c.col >= 0 &&
    c.row < gridSize &&
    c.col < gridSize
  );
}
/** @param {import('../model/contracts.js').DomainConfig} config @param {string} stage @param {unknown} cell */
export function usableCell(config, stage, cell) {
  return (
    validCell(cell, config.rules.gridSize) &&
    !sameCell(cell, config.rules.hq) &&
    !!config.layouts[stage]?.some((c) => sameCell(c, cell))
  );
}
