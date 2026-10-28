import theme from '../../../data/ui/theme.json';
import fx from '../../../data/visual/weapon-fx.json';
import layout from '../../../data/ui/layout.json';
import balance from '../../infrastructure/ImplementationBalanceConfig.js';
import display from '../../../data/visual/unit-display.json';
import renderBudget from '../../../data/visual/render-budget.json';
import { buildGroupPresentation } from './UnitGroupMath.js';
/** Rendering only; no collision, projectile travel or damage callback.
 * @param {import('phaser').GameObjects.Graphics} graphics
 * @param {import('../../domain/systems/StepSimulation.js').CombatEvent[]} events
 * @param {number} center @param {number} scale @param {number} elapsedMs @param {number} totalTicks
 * @param {number} playbackDurationMs @param {import('../../domain/systems/StepSimulation.js').Entity[]} entities */
export function drawEffects(graphics, events, center, scale, elapsedMs, totalTicks, playbackDurationMs, entities) {
  if (!totalTicks) return;
  let emitted = 0;
  for (const event of events.slice(-fx.maxActiveEffects)) {
    if (emitted >= fx.maxNewEffectsPerFrame) break;
    const kind = /** @type {Record<string,string>} */ (fx.unitToFx)[event.unitId] ?? 'bullet';
    const style = /** @type {Record<string,{durationMs:number,widthPx:number,impactRadiusPx:number,decorativeTracers:number}>} */ (fx.styles)[kind];
    // The simulated tick is mapped onto the same compressed battle playback timeline.
    const playbackAge = elapsedMs - event.tick / totalTicks * playbackDurationMs;
    if (playbackAge < 0 || playbackAge > style.durationMs) continue;
    emitted += 1;
    const phase = playbackAge / style.durationMs;
    const color = event.side === 'ally' ? theme.friendly : theme.enemy;
    let x = center + event.x * scale, y = center + event.y * scale;
    const tx = center + event.tx * scale, ty = center + event.ty * scale;
    if (event.type === 'fire') {
      const actor = entities.find(e => e.id === event.entityId);
      if (actor && actor.hp > 0) {
        try {
          const group = buildGroupPresentation(actor, display, renderBudget);
          const visible = Math.max(1, Math.ceil(group.fullCount * group.hpRatio));
          const marker = group.markers[(group.fxAnchorIndex + event.tick) % visible];
          x += marker.dx; y += marker.dy;
        } catch { /* Dead actor unavailable in this frame; use logical center. */ }
      }
    }
    const alpha = 1 - phase;
    if (event.type === 'fire') {
      const burst = style.decorativeTracers;
      for (let i = 0; i < burst; i++) {
        const shift = (i - (burst - 1) / 2) * style.widthPx * .8;
        graphics.lineStyle(style.widthPx, color, alpha);
        const ex = x + (tx - x) * Math.min(1, phase * 2);
        const ey = y + (ty - y) * Math.min(1, phase * 2);
        if (kind === 'arc-shell' || kind === 'large-shell' || kind === 'heavy-shell') {
          const cx = (x + ex) / 2, cy = (y + ey) / 2 - style.impactRadiusPx * 1.3 * Math.sin(Math.PI * phase);
          graphics.lineBetween(x + shift, y, cx + shift, cy);
          graphics.lineBetween(cx + shift, cy, ex + shift, ey);
        } else graphics.lineBetween(x + shift, y, ex + shift, ey);
      }
      const splash = /** @type {Record<string,{splash:number}>} */ (balance.units)[event.unitId]?.splash ?? 0;
      const radius = splash > 0 ? Math.max(style.impactRadiusPx, splash * layout.cellSize) : style.impactRadiusPx;
      if (phase > .6) { graphics.lineStyle(1, color, alpha * .7); graphics.strokeCircle(tx, ty, radius * (phase - .6) / .4); }
    } else if (event.type === 'hit') {
      graphics.lineStyle(style.widthPx, color, alpha); graphics.strokeCircle(x, y, style.impactRadiusPx * phase);
    } else {
      graphics.fillStyle(color, alpha * .5); graphics.fillCircle(x, y, style.impactRadiusPx * (1 + phase));
    }
  }
}
