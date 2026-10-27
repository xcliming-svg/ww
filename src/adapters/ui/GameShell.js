import { el, button } from './elements.js';
import { TechTreeView } from './TechTreeView.js';
import { openModal } from './Modal.js';
import { isUnlocked, isDone } from '../../domain/tech/TechGraph.js';
import { sameCell } from '../../domain/waves/FormationService.js';
import { getDesktop } from '../../infrastructure/DesktopBridge.js';
import { quoteRefund } from '../../domain/economy/RefundService.js';
import layout from '../../../data/ui/layout.json';
import input from '../../../data/ui/input.json';
import tutorial from '../../../data/ui/tutorial.json';
import localeManifest from '../../../locales/manifest.json';
import balance from '../../infrastructure/ImplementationBalanceConfig.js';
import display from '../../../data/visual/unit-display.json';

export class GameShell {
  abort = new AbortController();
  host = el('main', '', 'game-shell');
  canvasHost = el('div', '', 'canvas-host');
  title = el('section', '', 'title-screen');
  body = el('div', '', 'game-body');
  recon = el('div', '', 'recon');
  controls = el('div', '', 'battle-controls');
  toast = el('div', '', 'toast');
  waveLabel = el('span');
  suppliesLabel = el('span');
  hqLabel = el('span');
  timer = el('span');
  modalHost = el('div');
  /** @type {HTMLDialogElement|null} */ infoDialog = null;
  /** @type {HTMLElement|null} */ infoBody = null;
  infoId = '';
  /** @type {ReturnType<typeof setTimeout>|undefined} */ actionTimer;
  /** @type {ReturnType<typeof setTimeout>|undefined} */ toastTimer;
  lastMessage = '';
  /** @type {{nodeId:string,type:string,ms:number,start:number}|null} */ progress = null;
  /** @type {{from:number,to:number,start:number,duration:number}|null} */ moneyTween = null;
  /** @type {number|undefined} */ moneyFrame;
  /** @param {HTMLElement} root @param {import('../../application/GameCoordinator.js').GameCoordinator} app
   * @param {(key:string,params?:Record<string,string|number>)=>string} t */
  constructor(root, app, t) {
    this.root = root; this.app = app; this.t = t;
    this.tree = new TechTreeView(app, t, id => this.openNode(id));
    const left = el('section', '', 'left-panel');
    const stats = el('div', '', 'left-stats'); stats.append(this.waveLabel, this.suppliesLabel);
    left.append(stats, this.tree.host);
    const battle = el('section', '', 'battle-panel');
    this.canvasHost.setAttribute('aria-label', t('battle.canvas'));
    const stage = el('div', '', 'battle-stage'); stage.append(this.canvasHost, this.recon);
    const hp = el('div', '', 'battle-hp'); hp.append(this.hqLabel, this.timer);
    battle.append(hp, stage, this.controls);
    this.body.append(left, battle);
    this.toast.setAttribute('role', 'status'); this.toast.setAttribute('aria-live', 'polite');
    this.host.append(this.title, this.body, this.toast, this.modalHost); root.append(this.host);
    this.host.style.setProperty('--tree-ratio', String(layout.treeRatio));
    this.host.style.setProperty('--battle-ratio', String(layout.battleRatio));
    this.host.style.setProperty('--min-click', `${layout.minClickSize}px`);
    this.host.style.setProperty('--ui-font-size', `${layout.fontSize}px`);
    this.unlisten = app.subscribe(() => this.render());
    this.app.frameListeners.add(this.updateTimer);
    window.addEventListener('keydown', event => {
      if (document.querySelector('dialog[open]')) return;
      if (input.cancel.includes(event.key)) {
        event.preventDefault(); this.openMenu(); return;
      }
      if (input.help.includes(event.key)) { event.preventDefault(); this.help(); return; }
      if (event.target instanceof Element && event.target.closest('button,input,select,textarea')) return;
      if (input.zoomIn.includes(event.key)) { event.preventDefault(); this.tree.setZoom(this.tree.zoom + layout.zoomStep); }
      else if (input.zoomOut.includes(event.key)) { event.preventDefault(); this.tree.setZoom(this.tree.zoom - layout.zoomStep); }
      else if (input.start.includes(event.key) && app.screen === 'game') { event.preventDefault(); this.startOrPause(); }
    }, { signal: this.abort.signal });
    this.host.addEventListener('contextmenu', event => {
      if (document.querySelector('dialog[open]')) return;
      event.preventDefault(); app.cancelTool();
    }, { signal: this.abort.signal });
    this.render();
  }
  /** @returns {boolean} */
  reducedMotion() { return this.app.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  updateTimer = () => {
    const { app, t } = this;
    this.timer.textContent = app.state?.phase === 'combat' ? t('hud.playback', { value: Math.max(0, Math.ceil(app.config.rules.combatSeconds - app.elapsedMs / 1000)) }) : '';
    this.hqLabel.textContent = app.state?.buildingIds.includes('hq') ? t('battle.hqHealth', { value: Math.ceil(app.frame?.hqHp ?? app.state?.hqHp ?? 0), max: balance.hqHp }) : t('battle.hqNotBuilt');
  };
  /** @param {string} content */
  notify(content) {
    this.toast.textContent = content; this.toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove('visible'), layout.toastMs);
  }
  /** @param {number} before @param {number} after @param {number} ms */
  animateSupplies(before, after, ms) {
    if (this.moneyFrame !== undefined) cancelAnimationFrame(this.moneyFrame);
    if (!ms || before === after) { this.moneyTween = null; this.updateSupplies(); return; }
    this.moneyTween = { from: before, to: after, start: performance.now(), duration: ms };
    const update = () => {
      if (!this.moneyTween) return;
      const ratio = Math.min(1, (performance.now() - this.moneyTween.start) / this.moneyTween.duration);
      const value = Math.round(this.moneyTween.from + (this.moneyTween.to - this.moneyTween.from) * ratio);
      this.suppliesLabel.textContent = this.t('hud.supplies', { value });
      if (ratio < 1) this.moneyFrame = requestAnimationFrame(update);
      else { this.moneyTween = null; this.moneyFrame = undefined; this.updateSupplies(); }
    };
    this.moneyFrame = requestAnimationFrame(update);
  }
  updateSupplies() {
    if (!this.moneyTween) this.suppliesLabel.textContent = this.t('hud.supplies', { value: this.app.state?.supplies ?? this.t('ui.unknown') });
  }
  /** Atomically commits state first. UI timing never affects game logic.
   * @param {Omit<import('../../domain/model/contracts.js').PreparationCommand,'commandId'>} command
   * @param {string} nodeId @param {'building'|'research'|'unit'} kind */
  runAction(command, nodeId, kind) {
    if (this.app.animationLock) return;
    const before = this.app.state?.supplies ?? 0;
    if (!this.app.command(command)) { this.notify(this.t(this.app.errorKey)); return; }
    const after = this.app.state?.supplies ?? before;
    const ms = this.reducedMotion() ? 0 : (kind === 'research' ? layout.actionMs.research : kind === 'unit' ? layout.actionMs.unit : layout.actionMs.building);
    if (!ms) { this.animateSupplies(before, after, 0); this.refreshInfo(); return; }
    this.app.animationLock = true; this.progress = { nodeId, type: command.type, ms, start: performance.now() };
    this.animateSupplies(before, after, ms);
    this.refreshInfo(); this.app.emit();
    clearTimeout(this.actionTimer);
    this.actionTimer = setTimeout(() => {
      this.progress = null; this.app.animationLock = false; this.updateSupplies(); this.refreshInfo(); this.app.emit();
    }, ms);
  }
  /** @param {HTMLElement} target @param {string} type @param {string} nodeId */
  styleProgress(target, type, nodeId) {
    if (this.progress && this.progress.type === type && this.progress.nodeId === nodeId) {
      target.classList.add('progress-action'); target.style.setProperty('--progress-ms', `${this.progress.ms}ms`);
      // Rebuilt buttons resume the original timeline after autosave/settings renders.
      const elapsed = Math.max(0, Math.min(this.progress.ms, performance.now() - this.progress.start));
      target.style.setProperty('--progress-delay', `${-elapsed}ms`);
    }
  }
  startOrPause() {
    const state = this.app.state;
    if (!state || this.app.animationLock) return;
    if (state.phase === 'combat') {
      if (!this.app.calculating) { this.app.paused = !this.app.paused; this.app.emit(); }
      return;
    }
    if (state.phase !== 'preparation') return;
    const body = el('div', this.t('battle.startConfirm'));
    const dialog = openModal(this.modalHost, this.t('battle.start'), body, this.t);
    body.append(button(this.t('ui.confirm'), () => { dialog.close(); void this.app.beginCombat(); }, !this.app.startResult().ok));
  }
  openMenu() {
    if (this.app.screen !== 'game' || this.app.menuPaused) return;
    // Hold playback even when combat is still waiting for its save or worker.
    // The user's manual pause is independent and survives closing this menu.
    this.app.menuPaused = true; this.app.emit();
    const body = el('div', '', 'menu-actions');
    const dialog = openModal(this.modalHost, this.t('menu.options'), body, this.t);
    dialog.addEventListener('close', () => {
      this.app.menuPaused = false; this.app.emit();
    }, { once: true });
    body.append(button(this.t('menu.resume'), () => dialog.close()),
      button(this.t('ui.save'), () => { void this.app.flushSave(); dialog.close(); }, this.app.state?.phase === 'combat' || this.app.calculating),
      button(this.t('menu.settings'), () => this.settings()),
      button(this.t('menu.help'), () => this.help()),
      button(this.t('menu.title'), () => { if (this.app.state?.phase === 'combat' || this.app.animationLock) return; dialog.close(); this.app.screen = 'title'; this.app.emit(); }, this.app.state?.phase === 'combat' || this.app.animationLock),
      button(this.t('menu.quit'), () => { dialog.close(); void this.app.quit(); }, !getDesktop() || this.app.state?.phase === 'combat'));
  }
  render() {
    const { app, t } = this; const state = app.state;
    const inGame = app.screen === 'game' && !!state;
    this.body.hidden = !inGame; this.title.hidden = inGame;
    const message = app.errorKey ? t(app.errorKey) : app.noticeKey ? t(app.noticeKey, { name: t(app.noticeNameKey) }) : '';
    if (message && this.lastMessage !== message) this.notify(message);
    this.lastMessage = message;
    if (!inGame) {
      this.title.replaceChildren(el('p', t('app.subtitle')), el('h2', t('app.title')), el('p', t('app.candidate')));
      this.title.append(button(t('menu.new'), () => {
        if (!app.state) { app.newGame(); return; }
        const body = el('div', t('menu.newConfirm')); const dialog = openModal(this.modalHost, t('menu.new'), body, t);
        body.append(button(t('ui.confirm'), () => { dialog.close(); app.newGame(); }));
      }), button(t('menu.continue'), () => { void app.load(); }),
      button(t('ui.recover'), () => { void app.load(true); }),
      button(t('menu.settings'), () => this.settings()), button(t('menu.help'), () => this.help()),
      button(t('menu.credits'), () => openModal(this.modalHost, t('menu.credits'), el('p', t('credits.body')), t)));
      if (app.state) this.title.append(button(t('menu.resume'), () => { app.screen = 'game'; app.emit(); }));
      if (getDesktop()) this.title.append(button(t('menu.quit'), () => { void app.quit(); }));
      return;
    }
    this.waveLabel.textContent = t('hud.wave', { current: state.wave, total: app.config.rules.maxWave });
    this.updateSupplies(); this.updateTimer(); this.tree.render(); this.renderBattle(); this.refreshInfo();
  }
  /** @param {string} id */
  openNode(id) {
    if (!this.app.state || !this.app.state.revealedNodeIds.includes(id)) return;
    this.app.selectNode(id);
    if (this.infoDialog?.open) this.infoDialog.close();
    const node = this.app.config.nodes.find(n => n.id === id); if (!node) return;
    this.infoId = id; this.infoBody = el('div', '', 'node-details');
    this.infoDialog = openModal(this.modalHost, this.t(node.labelKey), this.infoBody, this.t);
    const dialog = this.infoDialog;
    dialog.addEventListener('close', () => {
      if (this.infoDialog === dialog) { this.infoId = ''; this.infoBody = null; this.infoDialog = null; }
    }, { once: true });
    this.refreshInfo();
  }
  refreshInfo() {
    const { app, t } = this; const state = app.state, body = this.infoBody;
    if (!state || !body || !this.infoDialog?.open) return;
    const node = app.config.nodes.find(n => n.id === this.infoId); if (!node) return;
    body.replaceChildren(el('p', t(node.descriptionKey)));
    const unlocked = isUnlocked(node, state, app.config.nodes);
    if (node.minWave > 1) body.append(el('p', t('tree.minWave', { wave: node.minWave }) + ' · ' + t(state.wave >= node.minWave ? 'ui.done' : 'ui.locked')));
    for (const id of node.parentIds) {
      const parent = app.config.nodes.find(n => n.id === id); if (!parent) continue;
      body.append(el('p', t(parent.labelKey) + ' · ' + t(isDone(parent, state) ? 'ui.done' : 'ui.locked'), 'requirement'));
    }
    if (node.producerId) {
      const producer = app.config.nodes.find(n => n.id === node.producerId);
      if (producer) body.append(el('p', t(producer.labelKey) + ' · ' + t(isDone(producer, state) ? 'ui.done' : 'ui.locked'), 'requirement'));
    }
    if (!unlocked) body.append(el('p', t('ui.locked'), 'locked-note'));
    if ((node.kind === 'unit' || !isDone(node, state)) && (app.config.costs[node.id] ?? 0) > (state.supplies ?? 0)) body.append(el('p', t('error.INSUFFICIENT_SUPPLIES'), 'hint'));
    const ready = state.phase === 'preparation' && !app.calculating && !app.animationLock && unlocked;
    const cost = app.config.costs[node.id];
    const costText = cost === null ? t('ui.pendingCost') : t('ui.cost', { value: cost });
    if (node.kind === 'unit') {
      const stats = /** @type {Record<string,typeof balance.units.rifle>} */ (balance.units)[node.id];
      const power = balance.upgradeMultipliers[(state.upgradeLevels[node.id]?.power ?? 0) - 1] ?? 1;
      const defenseLevel = state.upgradeLevels[node.id]?.survive ?? 0;
      const defense = ((1 - 1 / balance.defenseDivisors[defenseLevel]) * 100).toFixed(1);
      const grade = display.allyVisibleToGrade[state.upgradeLevels[node.id]?.power ?? 0];
      const count = /** @type {Record<string,number[]>} */ (display.countsByGrade)[node.id]?.[grade] ?? 0;
      if (stats) body.append(el('p', t('tree.unitStats', { hp: stats.hp, damage: Math.round(stats.damage * power),
        defense, count, grade, range: stats.range, arc: stats.arc, cooldown: stats.cooldown })));
      const empty = app.config.layouts[state.formationStage]?.some(c => !sameCell(c, app.config.rules.hq) && !state.placements.some(p => sameCell(p.cell, c)));
      const placement = button(t('tree.place', { cost: costText }), () => this.runAction({ type: 'place', nodeId: node.id }, node.id, 'unit'), !ready || !empty || cost === null || (state.supplies ?? 0) < cost);
      if (!empty) body.append(el('p', t('battle.noFreeCell'), 'hint'));
      body.append(placement);
    } else if (!isDone(node, state)) {
      const type = node.kind === 'research' ? 'research' : 'build';
      const action = button(t(`tree.${type}`, { cost: costText }), () => this.runAction({ type, nodeId: node.id }, node.id, node.kind === 'research' ? 'research' : 'building'), !ready || cost === null || (state.supplies ?? 0) < cost);
      this.styleProgress(action, type, node.id); body.append(action);
    } else if (this.progress?.nodeId === node.id && ['build', 'research'].includes(this.progress.type)) {
      const completed = button(t('ui.done'), () => undefined, true);
      this.styleProgress(completed, this.progress.type, node.id);
      body.append(completed);
    } else body.append(el('p', t('ui.done')));
    for (const profile of app.config.upgrades.filter(p => (p.nodeKinds ?? ['unit']).includes(node.kind) && p.costs && p.multipliers)) {
      const level = state.upgradeLevels[node.id]?.[profile.id] ?? 0, max = profile.costs?.length ?? 0;
      const upgradeCost = cost === null || !profile.costs || level >= max ? null : Math.ceil(cost * profile.costs[level]);
      const action = button(t('tree.upgrade', { name: t(profile.labelKey), level, max, cost: upgradeCost ?? t('status.maxed') }),
        () => this.runAction({ type: 'upgrade', nodeId: node.id, profileId: profile.id }, node.id, node.kind === 'research' ? 'research' : node.kind === 'unit' ? 'unit' : 'building'),
        !ready || (node.kind !== 'unit' && !isDone(node, state)) || level >= max || upgradeCost === null || (state.supplies ?? 0) < upgradeCost);
      this.styleProgress(action, 'upgrade', node.id); body.append(action);
    }
    const refund = quoteRefund(state, node.id, app.config);
    if (refund.ok) {
      const action = button(t('refund.open', { amount: refund.data.total }), () => this.openRefund(node.id), !ready);
      this.styleProgress(action, 'refund', node.id); body.append(action);
    } else if (this.progress?.nodeId === node.id && this.progress.type === 'refund') {
      const action = button(t('ui.done'), () => undefined, true);
      this.styleProgress(action, 'refund', node.id); body.append(action);
    }
  }
  /** @param {string} nodeId */
  openRefund(nodeId) {
    const { app, t } = this; if (!app.state || app.animationLock || app.calculating) return;
    const result = quoteRefund(app.state, nodeId, app.config);
    if (!result.ok) { this.notify(t(result.messageKey)); return; }
    const quote = result.data, body = el('div');
    body.append(el('p', t('refund.description')), el('p', t('refund.total', { amount: quote.total })));
    const list = el('ul');
    for (const e of app.state.investments.filter(i => quote.investmentIds.includes(i.id))) {
      const name = t(app.config.nodes.find(n => n.id === e.nodeId)?.labelKey ?? 'ui.unknown');
      list.append(el('li', e.kind === 'upgrade' ? t('refund.upgradeItem', { name, profile: t(`upgrade.${e.profileId}`), level: e.level, amount: e.paidCost }) : t('refund.nodeItem', { name, amount: e.paidCost })));
    }
    for (const p of app.state.placements.filter(i => quote.placementIds.includes(i.instanceId))) list.append(el('li', t('refund.placementItem', { name: t(`tech.${p.unitId}.name`), row: p.cell.row + 1, col: p.cell.col + 1, amount: p.paidCost })));
    body.append(list);
    const dialog = openModal(this.modalHost, t('refund.title'), body, t);
    body.append(button(t('refund.confirm', { amount: quote.total }), () => {
      this.runAction({ type: 'refund', nodeId, refundToken: quote.token }, nodeId, app.config.nodes.find(n => n.id === nodeId)?.kind === 'research' ? 'research' : 'building');
      if (!app.errorKey) dialog.close();
    }));
  }
  renderBattle() {
    const { app, t } = this, state = app.state; if (!state) return;
    this.recon.replaceChildren();
    for (const card of app.recon) {
      const item = el('div', `${t(`battle.${card.direction}`)} · ?`, `recon-card recon-${card.direction}`);
      this.recon.append(item);
    }
    this.recon.setAttribute('aria-label', t('battle.reconUnknown'));
    this.controls.replaceChildren();
    if (state.phase === 'preparation') {
      this.controls.append(el('p', t('battle.move'), 'hint'));
      const selected = !!app.selectedInstance;
      if (selected) {
        const selectedUnit = state.placements.find(p => p.instanceId === app.selectedInstance);
        if (selectedUnit) this.controls.append(el('p', t('battle.selectedUnit', { name: t(`tech.${selectedUnit.unitId}.name`) }), 'hint'));
      }
      this.controls.append(button(t('battle.cancel'), () => {
        this.runAction({ type: 'cancel', instanceId: app.selectedInstance }, app.selectedId, 'unit');
        app.selectedInstance = ''; app.emit();
      }, !selected || app.animationLock));
      const allowed = app.startResult();
      this.controls.append(button(t('battle.start'), () => this.startOrPause(), !allowed.ok || app.animationLock));
      if (!allowed.ok) this.controls.append(el('p', t(allowed.messageKey), 'hint'));
      if (state.wave === 1) this.controls.append(el('p', t('tutorial.buyTwo'), 'tutorial-callout'),
        el('p', t('tutorial.purchaseProgress', { count: state.placements.filter(p => p.unitId === 'rifle').length }), 'hint'));
    } else if (state.phase === 'combat') {
      this.controls.append(el('p', t(app.calculating ? 'battle.calculating' : 'battle.playing')),
        button(t(app.paused ? 'battle.resume' : 'battle.pause'), () => this.startOrPause(), app.calculating));
      const speed = el('select');
      for (const v of layout.speeds) { const option = el('option', t('settings.speedValue', { value: v })); option.value = String(v); speed.append(option); }
      speed.value = String(app.settings.speed);
      speed.addEventListener('change', () => { app.settings.speed = Number(speed.value); app.persistSettings(); });
      this.controls.append(speed);
    } else {
      this.controls.append(el('h3', t(`outcome.${state.phase}`)));
      if (state.phase !== 'clear') this.controls.append(button(t(state.phase === 'defeat' ? 'outcome.retry' : 'outcome.next'), () => app.next()));
      else this.controls.append(button(t('menu.title'), () => { app.screen = 'title'; app.emit(); }));
    }
  }
  help() {
    const body = el('div'); body.append(el('p', this.t('help.body')), el('p', this.t('help.keys')));
    const step = el('p'); let index = Math.min(this.app.state?.tutorialStep ?? 0, tutorial.steps.length - 1);
    const draw = () => {
      step.textContent = this.t(tutorial.steps[index]);
      if (this.app.state?.phase === 'preparation' && !this.app.calculating && !this.app.loading && !this.app.quitting && !this.app.animationLock) {
        this.app.state = { ...this.app.state, tutorialStep: index }; this.app.scheduleSave();
      }
    };
    body.append(step, button(this.t('tutorial.previous'), () => { index = Math.max(0, index - 1); draw(); }),
      button(this.t('tutorial.next'), () => { index = Math.min(tutorial.steps.length - 1, index + 1); draw(); }));
    draw(); openModal(this.modalHost, this.t('menu.help'), body, this.t);
  }
  settings() {
    const body = el('div', '', 'settings'), locale = el('select');
    for (const code of localeManifest.supportedLocales) { const option = el('option', this.t(`locale.${code}`)); option.value = code; locale.append(option); }
    const label = el('label', this.t('settings.locale')); label.append(locale); body.append(label);
    locale.value = this.app.settings.locale;
    locale.addEventListener('change', () => { this.app.settings.locale = locale.value; this.app.persistSettings(); });
    const motion = el('input'); motion.type = 'checkbox'; motion.checked = this.app.settings.reducedMotion;
    motion.addEventListener('change', () => { this.app.settings.reducedMotion = motion.checked; this.app.persistSettings(); });
    const motionLabel = el('label', this.t('settings.reducedMotion')); motionLabel.append(motion); body.append(motionLabel);
    const speed = el('select');
    for (const value of layout.speeds) { const option = el('option', this.t('settings.speedValue', { value })); option.value = String(value); speed.append(option); }
    speed.value = String(this.app.settings.speed);
    speed.addEventListener('change', () => { this.app.settings.speed = Number(speed.value); this.app.persistSettings(); });
    const speedLabel = el('label', this.t('settings.speed')); speedLabel.append(speed); body.append(speedLabel);
    for (const key of ['bgmVolume', 'sfxVolume']) {
      const control = el('input'); control.type = 'range'; control.min = '0'; control.max = '1'; control.step = '.05';
      control.value = String(this.app.settings[/** @type {'bgmVolume'|'sfxVolume'} */ (key)]);
      control.addEventListener('input', () => {
        this.app.settings[/** @type {'bgmVolume'|'sfxVolume'} */ (key)] = Number(control.value);
        this.app.persistSettings();
      });
      const volume = el('label', this.t(`settings.${key}`)); volume.append(control); body.append(volume);
    }
    body.append(el('p', this.t('settings.silent')));
    openModal(this.modalHost, this.t('menu.settings'), body, this.t);
  }
  dispose() {
    clearTimeout(this.actionTimer); clearTimeout(this.toastTimer);
    this.app.menuPaused = false;
    if (this.moneyFrame !== undefined) cancelAnimationFrame(this.moneyFrame);
    this.abort.abort(); this.unlisten(); this.tree.dispose();
    this.app.frameListeners.delete(this.updateTimer); this.host.remove();
  }
}
