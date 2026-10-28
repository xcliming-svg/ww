import Phaser from 'phaser';
import layout from '../../../data/ui/layout.json';
import theme from '../../../data/ui/theme.json';
import { drawGlyph } from './PixelUnitRenderer.js';
import { buildGroupPresentation } from './UnitGroupMath.js';
import display from '../../../data/visual/unit-display.json';
import renderBudget from '../../../data/visual/render-budget.json';
import { drawEffects } from './FxLayer.js';
import { sameCell, usableCell } from '../../domain/waves/FormationService.js';
export class BattlefieldScene extends Phaser.Scene {
  /** @type {Phaser.GameObjects.Graphics|null} */ graphics = null;
  /** @type {Map<string,Phaser.GameObjects.Image>} */ images = new Map();
  /** @type {Map<string,Phaser.GameObjects.Text>} */ labels = new Map();
  /** @param {import('../../application/GameCoordinator.js').GameCoordinator} app @param {(key:string)=>string} t */
  constructor(app, t) {
    super('Battlefield');
    this.app = app;
    this.t = t;
  }
  /** @type {{pointerId:number,instanceId:string|null,x:number,y:number}|null} */
  dragging = null;
  /** @param {Phaser.Input.Pointer} pointer */
  cellAt(pointer) {
    const center = layout.worldSize / 2,
      scale = layout.cellSize;
    return {
      row: Math.floor((pointer.y - center) / scale + 2.5),
      col: Math.floor((pointer.x - center) / scale + 2.5),
    };
  }
  create() {
    this.graphics = this.add.graphics();
    this.input.on('pointerdown', (/** @type {Phaser.Input.Pointer} */ pointer) => {
      const state = this.app.state;
      if (!state || state.phase !== 'preparation' || this.app.animationLock) return;
      const cell = this.cellAt(pointer);
      if (!usableCell(this.app.config, state.formationStage, cell)) return;
      const instance = state.placements.find((p) => sameCell(p.cell, cell));
      this.dragging = {
        pointerId: pointer.id,
        instanceId: instance?.instanceId ?? null,
        x: pointer.x,
        y: pointer.y,
      };
    });
    this.input.on('pointerup', (/** @type {Phaser.Input.Pointer} */ pointer) => {
      const drag = this.dragging;
      this.dragging = null;
      const state = this.app.state;
      if (
        !drag ||
        pointer.id !== drag.pointerId ||
        !state ||
        state.phase !== 'preparation' ||
        this.app.animationLock
      )
        return;
      const cell = this.cellAt(pointer);
      if (!usableCell(this.app.config, state.formationStage, cell)) return;
      if (Math.hypot(pointer.x - drag.x, pointer.y - drag.y) <= layout.dragThresholdPx) {
        this.app.selectCell(cell);
        return;
      }
      if (!drag.instanceId) return;
      const origin = state.placements.find((p) => p.instanceId === drag.instanceId);
      if (!origin || sameCell(origin.cell, cell)) return;
      const occupied = state.placements.find((p) => sameCell(p.cell, cell));
      this.app.command(
        occupied
          ? { type: 'swap', instanceId: drag.instanceId, otherId: occupied.instanceId }
          : { type: 'move', instanceId: drag.instanceId, cell },
      );
    });
    this.input.on('gameout', () => {
      this.dragging = null;
    });

    const sync = () => {
      if (this.app.screen === 'title') this.scene.start('Title');
      else if (this.app.state && ['victory', 'defeat', 'clear'].includes(this.app.state.phase))
        this.scene.start('Outcome');
    };
    const off = this.app.subscribe(sync);
    this.events.once('shutdown', () => {
      off();
      this.images.clear();
      this.labels.clear();
      this.graphics = null;
    });
    sync();
  }
  /** @param {number} _time @param {number} delta */ update(_time, delta) {
    this.app.update(delta);
    this.draw();
  }
  draw() {
    const g = this.graphics,
      state = this.app.state;
    if (!g || !state) return;
    const center = layout.worldSize / 2,
      scale = layout.cellSize;
    g.clear();
    g.fillStyle(theme.ground);
    g.fillRect(0, 0, layout.worldSize, layout.worldSize);
    g.fillStyle(theme.road);
    g.fillRect(center - scale / 2, 0, scale, layout.worldSize);
    if (state.formationStage !== '3') g.fillRect(0, center - scale / 2, layout.worldSize, scale);
    g.lineStyle(1, theme.grid);
    for (const cell of this.app.config.layouts[state.formationStage] ?? [])
      g.strokeRect(
        center + (cell.col - 2.5) * scale,
        center + (cell.row - 2.5) * scale,
        scale,
        scale,
      );
    if (state.buildingIds.includes('hq')) {
      g.fillStyle(theme.hq);
      g.fillRect(center - scale / 3, center - scale / 3, (scale * 2) / 3, (scale * 2) / 3);
      g.lineStyle(2, theme.ground);
      g.lineBetween(center, center - scale / 4, center, center + scale / 4);
      g.lineBetween(center - scale / 4, center, center + scale / 4, center);
    }
    const frame = state.phase === 'combat' ? this.app.frame : null;
    const entities =
      frame?.entities ??
      state.placements.map((p) => {
        const powerLevel = state.upgradeLevels[p.unitId]?.power ?? 0;
        return {
          id: p.instanceId,
          unitId: p.unitId,
          x: p.cell.col - 2,
          y: p.cell.row - 2,
          heading: Math.atan2(p.cell.row - 2, p.cell.col - 2),
          side: /** @type {'ally'} */ ('ally'),
          hp: 1,
          maxHp: 1,
          defenseLevel: state.upgradeLevels[p.unitId]?.survive ?? 0,
          combatGrade: display.allyVisibleToGrade[powerLevel],
        };
      });
    const seen = new Set();
    for (const unit of entities) {
      let group;
      try {
        group = buildGroupPresentation(unit, display, renderBudget);
      } catch (error) {
        console.error('INVALID_GROUP_PRESENTATION', unit.id, error);
        continue;
      }
      seen.add(unit.id);
      let x = center + unit.x * scale,
        y = center + unit.y * scale;
      const motion = /** @type {Record<string,{radiusPx:number,periodMs:number}>} */ (
        renderBudget.droneMotion
      )[unit.unitId];
      if (!this.app.settings.reducedMotion && frame) {
        if (motion) {
          const angle = (this.app.elapsedMs * Math.PI * 2) / motion.periodMs;
          x += Math.cos(angle) * motion.radiusPx;
          y += Math.sin(angle) * motion.radiusPx;
        } else {
          // Group recoil/shake are visual offsets only; domain coordinates never change.
          const playbackMs = this.app.config.rules.combatSeconds * 1000;
          const ticks = this.app.playback?.ticks ?? 0;
          for (const event of frame.events) {
            if (event.entityId !== unit.id || !ticks) continue;
            const age = this.app.elapsedMs - (event.tick / ticks) * playbackMs;
            if (event.type === 'fire' && age >= 0 && age < renderBudget.groundRecoilMs) {
              const amount = renderBudget.groundRecoilPx * (1 - age / renderBudget.groundRecoilMs);
              x -= Math.cos(unit.heading) * amount;
              y -= Math.sin(unit.heading) * amount;
            }
            if (event.type === 'hit' && age >= 0 && age < renderBudget.hitShakeMs) {
              const amount = renderBudget.hitShakePx * (1 - age / renderBudget.hitShakeMs);
              x += (event.sequence % 2 ? -1 : 1) * amount;
            }
          }
        }
      }
      for (const marker of group.markers)
        if (marker.alpha > 0) {
          drawGlyph(
            g,
            unit.unitId,
            Math.round(x + marker.dx),
            Math.round(y + marker.dy),
            group.markerSizePx,
            unit.heading,
            unit.side === 'enemy',
            marker.alpha,
            group.defenseLevel,
          );
        }
      let label = this.labels.get(unit.id);
      if (!label) {
        label = this.add
          .text(x, y, '', {
            fontFamily: 'GameUI',
            fontSize: `${layout.unitLabelSize}px`,
            color: theme.unitLabel,
            backgroundColor: theme.unitLabelBackground,
          })
          .setOrigin(0.5, 0)
          .setDepth(1);
        this.labels.set(unit.id, label);
      }
      label
        .setText(this.t(`unit.short.${unit.unitId}`))
        .setPosition(Math.round(x), Math.round(y + renderBudget.labelOffsetYPx));
      g.fillStyle(theme.text);
      g.fillRect(x - scale / 3, y + renderBudget.hpBarOffsetYPx, (scale * 2) / 3, 2);
      g.fillStyle(unit.side === 'enemy' ? theme.enemy : theme.friendly);
      g.fillRect(
        x - scale / 3,
        y + renderBudget.hpBarOffsetYPx,
        ((scale * 2) / 3) * group.hpRatio,
        2,
      );
    }
    for (const [id, image] of this.images) {
      image.destroy();
      this.images.delete(id);
    }
    for (const [id, label] of this.labels)
      if (!seen.has(id)) {
        label.destroy();
        this.labels.delete(id);
      }
    if (frame && !this.app.settings.reducedMotion)
      drawEffects(
        g,
        frame.events,
        center,
        scale,
        this.app.elapsedMs,
        this.app.playback?.ticks ?? 0,
        this.app.config.rules.combatSeconds * 1000,
        frame.entities,
      );
  }
}
