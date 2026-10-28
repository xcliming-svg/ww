/** @param {{x:number,y:number}} origin @param {{x:number,y:number}} target @param {number} heading @param {number} range @param {number} arc */
export function inAttackSector(origin, target, heading, range, arc) {
  if (![origin.x, origin.y, target.x, target.y, heading, range, arc].every(Number.isFinite) || range <= 0 || arc <= 0 || arc > Math.PI * 2) return false;
  const dx = target.x - origin.x; const dy = target.y - origin.y;
  const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - heading), Math.cos(Math.atan2(dy, dx) - heading));
  return dx * dx + dy * dy <= range * range && Math.abs(delta) <= arc / 2;
}
