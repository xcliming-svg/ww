import theme from '../../../data/ui/theme.json';
import layout from '../../../data/ui/layout.json';
/** @param {import('phaser').GameObjects.Graphics} g @param {string} category @param {number} x @param {number} y @param {number} heading @param {boolean} enemy */
export function drawUnit(g, category, x, y, heading, enemy) {
  const size = layout.cellSize / 4; const color = enemy ? theme.enemy : theme.friendly;
  g.fillStyle(color); g.lineStyle(2, color);
  if (category === 'armor') {
    g.fillRect(Math.round(x - size), Math.round(y - size), size * 2, size * 2); g.lineStyle(2, theme.text); g.lineBetween(x - size - 2, y - size, x - size - 2, y + size); g.lineBetween(x + size + 2, y - size, x + size + 2, y + size);
  } else if (category === 'artillery') {
    g.fillRect(x - size, y - size / 2, size * 2, size); g.fillRect(x - size * 1.5, y - size, size / 2, size * 2); g.fillRect(x + size, y - size, size / 2, size * 2);
    g.lineBetween(x, y, x + Math.cos(heading) * size * 2.5, y + Math.sin(heading) * size * 2.5);
  } else if (category === 'aircraft') {
    g.fillTriangle(x, y - size, x - size * 1.5, y + size, x + size * 1.5, y + size); g.fillRect(x - 2, y - size * 1.5, 4, size * 3);
  } else {
    g.fillCircle(x, y - size / 2, size / 2); g.fillRect(x - size / 2, y, size, size); g.lineBetween(x - size / 2, y + size, x - size, y + size * 1.5); g.lineBetween(x + size / 2, y + size, x + size, y + size * 1.5);
  }
  g.lineStyle(2, theme.text); g.lineBetween(x, y, x + Math.cos(heading) * size * 2, y + Math.sin(heading) * size * 2);
  if (enemy) { g.lineBetween(x - size, y - size * 2, x + size, y - size * 2); }
}
