import theme from '../../../data/ui/theme.json';
import defenseStyles from '../../../data/visual/defense-styles.json';

const walkers = new Set(['car', 'tank', 'heavy', 'destroyer']);
const drones = new Set(['fighter', 'attacker', 'bomber']);
const artillery = new Set(['mortar', 'gun']);
/** Draw one decorative marker, not a logical unit.
 * @param {import('phaser').GameObjects.Graphics} g @param {string} unitId
 * @param {number} x @param {number} y @param {number} size
 * @param {number} heading @param {boolean} enemy @param {number} alpha @param {number} defenseLevel */
export function drawGlyph(g, unitId, x, y, size, heading, enemy, alpha, defenseLevel) {
  if (alpha <= 0) return;
  const color = enemy ? theme.enemy : theme.friendly;
  const r = size / 2;
  g.fillStyle(color, alpha);
  if (drones.has(unitId)) {
    g.fillTriangle(x, y - r, x - r, y + r, x + r, y + r);
    if (unitId === 'bomber') g.fillRect(x - r / 2, y - r / 2, r, size);
    if (unitId === 'attacker') g.fillRect(x - r, y, size, size / 3);
  } else if (walkers.has(unitId)) {
    g.fillRect(x - r, y - r * 0.7, size, size * 0.75);
    if (unitId === 'heavy') g.fillRect(x - r, y + r * 0.15, size, size * 0.35);
    if (unitId === 'destroyer') g.fillTriangle(x - r, y - r, x + r, y, x - r, y + r);
    if (unitId === 'tank') g.fillCircle(x, y - r * 0.25, r * 0.45);
  } else {
    g.fillCircle(x, y - r * 0.35, r * 0.55);
    g.fillRect(x - r * 0.65, y, size * 0.65, size * 0.5);
    if (artillery.has(unitId)) g.fillRect(x, y, r, size * 0.3);
    if (unitId === 'at') g.fillRect(x - r * 0.85, y - r * 0.9, size * 0.8, size * 0.25);
    if (unitId === 'mg') g.fillRect(x, y - r * 0.2, r, size * 0.25);
  }
  // Even at 3–4px the type silhouette is supplemented by a single group label.
  if (unitId === 'gun' || unitId === 'mortar' || unitId === 'at') {
    g.lineStyle(0.6, theme.text, alpha);
    g.lineBetween(x, y, x + Math.cos(heading) * r, y + Math.sin(heading) * r);
  }
  const armor = defenseStyles.levels[defenseLevel];
  if (armor && armor.outlineWidthPx > 0) {
    g.lineStyle(armor.outlineWidthPx, theme.text, alpha * armor.outlineAlpha);
    g.strokeRect(x - r, y - r, size, size);
    if (armor.reinforcedHatch) g.lineBetween(x - r, y + r, x + r, y - r);
  }
}
