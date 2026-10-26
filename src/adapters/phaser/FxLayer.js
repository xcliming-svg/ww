import theme from '../../../data/ui/theme.json';
/** @param {import('phaser').GameObjects.Graphics} graphics @param {import('../../domain/systems/StepSimulation.js').CombatEvent[]} events @param {number} center @param {number} scale */
export function drawEffects(graphics, events, center, scale) {
  for (const event of events) {
    const x = center + event.x * scale, y = center + event.y * scale;
    graphics.lineStyle(1, event.side === 'ally' ? theme.friendly : theme.enemy, .9);
    if (event.type === 'fire') graphics.lineBetween(x, y, center + event.tx * scale, center + event.ty * scale);
    else { graphics.fillStyle(theme.enemy, .6); graphics.fillRect(x - 4, y - 4, 8, 8); }
  }
}
