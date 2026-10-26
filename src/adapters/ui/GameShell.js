import { el, button } from './elements.js';
import { TechTreeView } from './TechTreeView.js';
import { openModal } from './Modal.js';
import { isUnlocked, isDone } from '../../domain/tech/TechGraph.js';
import { sameCell, usableCell } from '../../domain/waves/FormationService.js';
import { getDesktop } from '../../infrastructure/DesktopBridge.js';
import layout from '../../../data/ui/layout.json';
import input from '../../../data/ui/input.json';
import tutorial from '../../../data/ui/tutorial.json';
import localeManifest from '../../../locales/manifest.json';
import balance from '../../infrastructure/BalanceConfig.js';
import { quoteRefund } from '../../domain/economy/RefundService.js';
export class GameShell {
  abort = new AbortController(); host = el('main', '', 'game-shell'); canvasHost = el('div', '', 'canvas-host');
  title = el('section', '', 'title-screen'); hud = el('header', '', 'hud'); body = el('div', '', 'game-body');
  details = el('details', '', 'tech-details'); recon = el('div', '', 'recon'); grid = el('div', '', 'formation'); controls = el('div', '', 'battle-controls'); status = el('div', '', 'message');
  timer = el('span'); hqLabel = el('span'); modalHost = el('div'); tree; unlisten; collapsed = false;
  /** @param {HTMLElement} root @param {import('../../application/GameCoordinator.js').GameCoordinator} app @param {(key:string,params?:Record<string,string|number>)=>string} t */
  constructor(root, app, t) {
    this.root = root; this.app = app; this.t = t; this.tree = new TechTreeView(app, t);
    this.details.open = true; this.details.addEventListener('toggle', () => { this.collapsed = !this.details.open; });
    const left = el('section', '', 'left-panel'); left.append(this.tree.host, this.details);
    const battle = el('section', '', 'battle-panel'); this.canvasHost.setAttribute('aria-label', t('battle.canvas'));
    battle.append(el('h2', t('battle.title')), this.recon, this.canvasHost, this.grid, this.controls);
    this.body.append(left, battle); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    this.host.append(this.hud, this.title, this.body, this.status, this.modalHost); root.append(this.host);
    this.host.style.setProperty('--tree-ratio', String(layout.treeRatio)); this.host.style.setProperty('--battle-ratio', String(layout.battleRatio));
    this.host.style.setProperty('--min-click', `${layout.minClickSize}px`); this.host.style.setProperty('--ui-font-size', `${layout.fontSize}px`);
    this.unlisten = app.subscribe(() => this.render()); this.app.frameListeners.add(this.updateTimer);
    window.addEventListener('keydown', event => {
      if (document.querySelector('dialog[open]')) return;
      if (input.help.includes(event.key)) { event.preventDefault(); this.help(); }
      else if (input.cancel.includes(event.key)) { event.preventDefault(); if (app.state?.phase === 'combat') { if (!app.calculating) { app.paused = !app.paused; app.emit(); } } else app.cancelTool(); }
      else if (event.target instanceof Element && event.target.closest('button,input,select,textarea')) return;
      else if (input.zoomIn.includes(event.key)) { event.preventDefault(); this.tree.setZoom(this.tree.zoom + layout.zoomStep); }
      else if (input.zoomOut.includes(event.key)) { event.preventDefault(); this.tree.setZoom(this.tree.zoom - layout.zoomStep); }
      else if (input.start.includes(event.key) && app.screen === 'game') { event.preventDefault(); this.startOrPause(); }
    }, { signal: this.abort.signal });
    this.host.addEventListener('contextmenu', event => { if (document.querySelector('dialog[open]')) return; event.preventDefault(); app.cancelTool(); }, { signal: this.abort.signal });
    this.render();
  }
  updateTimer = () => {
    this.timer.textContent = this.t('hud.playback', { value: Math.max(0, Math.ceil(this.app.config.rules.combatSeconds - this.app.elapsedMs / 1000)) });
    this.hqLabel.textContent = this.t('hud.hq', { value: Math.ceil(this.app.frame?.hqHp ?? this.app.state?.hqHp ?? 0) });
  };
  startOrPause() {
    if (this.app.state?.phase === 'combat') { this.app.paused = !this.app.paused; this.app.emit(); return; }
    const body = el('div'); const dialog = openModal(this.modalHost, this.t('battle.start'), body, this.t);
    body.append(button(this.t('ui.confirm'), () => { dialog.close(); void this.app.beginCombat(); }, !this.app.startResult().ok));
  }
  render() {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusId = focused?.id; const focusText = focused instanceof HTMLButtonElement ? focused.textContent : null;
    const { app, t } = this; const state = app.state; const inGame = app.screen === 'game' && state !== null;
    this.title.hidden = inGame; this.body.hidden = !inGame; this.hud.replaceChildren();
    this.hud.append(el('h1', t('app.title')));
    if (inGame) {
      this.hud.append(el('span', t('hud.wave', { current: state.wave, total: app.config.rules.maxWave })), el('span', t('hud.supplies', { value: state.supplies ?? t('ui.unknown') })), this.hqLabel, this.timer, el('span', t(app.saveStatus)));
      this.hud.append(button(t('ui.save'), () => { void app.flushSave(); }, state.phase === 'combat' || app.calculating), button(t('menu.title'), () => { app.screen = 'title'; app.emit(); }, state.phase === 'combat' || app.calculating));
    }
    this.hud.append(button(t('menu.settings'), () => this.settings()), button(t('menu.help'), () => this.help()));
    this.status.textContent = app.errorKey ? t(app.errorKey) : app.noticeKey ? t(app.noticeKey, { name: t(app.noticeNameKey) }) : '';
    if (!inGame) {
      this.title.replaceChildren(el('p', t('app.subtitle')), el('h2', t('app.title')), el('p', t('app.candidate')));
      this.title.append(button(t('menu.new'), () => {
        if (!app.state) { app.newGame(); return; }
        const body = el('div', t('menu.newConfirm')); const dialog = openModal(this.modalHost, t('menu.new'), body, t);
        body.append(button(t('ui.confirm'), () => { dialog.close(); app.newGame(); }));
      }), button(t('menu.continue'), () => { void app.load(); }), button(t('ui.recover'), () => { void app.load(true); }), button(t('menu.credits'), () => openModal(this.modalHost, t('menu.credits'), el('p', t('credits.body')), t)));
      if (app.state) this.title.append(button(t('menu.resume'), () => { app.screen = 'game'; app.emit(); }));
      if (getDesktop()) this.title.append(button(t('menu.quit'), () => { void app.quit(); }));
      return;
    }
    this.updateTimer(); this.tree.render(); this.renderDetails(); this.renderBattle();
    if (focused && !focused.isConnected) {
      const replacement = focusId ? document.getElementById(focusId) : [...this.host.querySelectorAll('button')].find(b => b.textContent === focusText && !b.disabled);
      replacement?.focus({ preventScroll: true });
    }
  }
  renderDetails() {
    const { app, t } = this; const state = app.state; if (!state) return;
    const node = app.config.nodes.find(n => n.id === app.selectedId); if (!node) return;
    this.details.replaceChildren(el('summary', t('tree.details')), el('h3', t(node.labelKey)), el('p', t(node.descriptionKey)));
    this.details.open = !this.collapsed;
    const ready = state.phase === 'preparation' && !app.calculating && isUnlocked(node, state, app.config.nodes); const cost = app.config.costs[node.id];
    const costText = cost === null ? t('ui.pendingCost') : t('ui.cost', { value: cost });
    for (const id of node.parentIds) { const parent = app.config.nodes.find(n => n.id === id); if (parent) this.details.append(button(t(parent.labelKey) + ' · ' + t(isDone(parent, state) ? 'ui.done' : 'ui.locked'), () => app.selectNode(id))); }
    if (node.kind === 'unit') {
      const stats = /** @type {Record<string,typeof balance.units.rifle>} */ (balance.units)[node.id];
      const power = balance.upgradeMultipliers[(state.upgradeLevels[node.id]?.power ?? 0) - 1] ?? 1;
      const survive = balance.upgradeMultipliers[(state.upgradeLevels[node.id]?.survive ?? 0) - 1] ?? 1;
      if (stats) this.details.append(el('p', t('tree.unitStats', { hp: Math.round(stats.hp * survive), damage: Math.round(stats.damage * power), range: stats.range, arc: stats.arc, cooldown: stats.cooldown })));
      this.details.append(button(t('tree.place', { cost: costText }), () => { app.selectedUnit = node.id; app.selectedInstance = ''; app.emit(); }, !ready || cost === null || (state.supplies ?? 0) < cost));
      for (const profile of app.config.upgrades) {
        const level = state.upgradeLevels[node.id]?.[profile.id] ?? 0; const max = profile.costs?.length ?? 0; const upgradeCost = cost === null || !profile.costs ? null : Math.ceil(cost * (profile.costs[level] ?? 0));
        this.details.append(button(t('tree.upgrade', { name: t(profile.labelKey), level, max, cost: level >= max ? t('status.maxed') : upgradeCost ?? t('ui.unknown') }), () => app.command({ type: 'upgrade', nodeId: node.id, profileId: profile.id }), !ready || level >= max || upgradeCost === null || (state.supplies ?? 0) < upgradeCost));
      }
    } else if (!isDone(node, state) && node.kind !== 'hq') {
      const type = node.kind === 'building' ? 'build' : 'research';
      this.details.append(button(t(`tree.${type}`, { cost: costText }), () => { if (!app.command({ type, nodeId: node.id })) return; const child = app.config.nodes.find(n => n.parentIds.includes(node.id)); if (child) this.tree.center(child.id); }, !ready || cost === null || (state.supplies ?? 0) < cost));
    } else this.details.append(el('p', t('ui.done')));
    const refund = quoteRefund(state, node.id, app.config);
    if (refund.ok) this.details.append(button(t('refund.open', { amount: refund.data.total }), () => this.refund(node.id), !ready));
    const goals = app.config.nodes.filter(n => n.parentIds.includes(node.id) && isUnlocked(n, state, app.config.nodes) && !isDone(n, state));
    if (goals.length) {
      this.details.append(el('h4', t('tree.nextGoals')));
      for (const goal of goals) this.details.append(button(t(goal.labelKey), () => app.selectNode(goal.id)), el('p', t(goal.descriptionKey), 'hint'));
    }
  }
  /** @param {string} nodeId */
  refund(nodeId) {
    const { app, t } = this; if (!app.state || app.calculating || app.loading) return;
    const result = quoteRefund(app.state, nodeId, app.config);
    if (!result.ok) { app.errorKey = result.messageKey; app.emit(); return; }
    const quote = result.data; const body = el('div');
    body.append(el('p', t('refund.description')), el('p', t('refund.total', { amount: quote.total })));
    const list = el('ul');
    for (const entry of app.state.investments.filter(e => quote.investmentIds.includes(e.id))) {
      const name = t(app.config.nodes.find(n => n.id === entry.nodeId)?.labelKey ?? 'ui.unknown');
      list.append(el('li', entry.kind === 'upgrade' ? t('refund.upgradeItem', { name, profile: t(`upgrade.${entry.profileId}`), level: entry.level, amount: entry.paidCost }) : t('refund.nodeItem', { name, amount: entry.paidCost })));
    }
    for (const placement of app.state.placements.filter(p => quote.placementIds.includes(p.instanceId))) list.append(el('li', t('refund.placementItem', { name: t(`tech.${placement.unitId}.name`), row: placement.cell.row + 1, col: placement.cell.col + 1, amount: placement.paidCost })));
    body.append(list); const dialog = openModal(this.modalHost, t('refund.title'), body, t);
    body.append(button(t('refund.confirm', { amount: quote.total }), () => {
      if (app.command({ type: 'refund', nodeId, refundToken: quote.token })) dialog.close();
      else body.append(el('p', t(app.errorKey), 'message'));
    }));
  }
  renderBattle() {
    const { app, t } = this; const state = app.state; if (!state) return;
    this.recon.replaceChildren();
    for (const card of app.recon) this.recon.append(el('div', `${t(`battle.${card.direction}`)} · ${t('ui.unknown')}`, 'recon-card'));
    this.recon.setAttribute('aria-label', t('battle.reconUnknown'));
    this.grid.replaceChildren(); const size = app.config.rules.gridSize;
    this.grid.style.gridTemplateColumns = `repeat(${size},1fr)`;
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      const cell = { row, col }; const placement = state.placements.find(p => sameCell(p.cell, cell));
      const hq = sameCell(cell, app.config.rules.hq); const usable = usableCell(app.config, state.formationStage, cell);
      const label = hq ? t('battle.hq') : placement ? t(`tech.${placement.unitId}.name`) : t(usable ? 'battle.empty' : 'battle.disabled');
      const b = button(label, () => app.selectCell(cell), !usable || state.phase !== 'preparation'); b.setAttribute('aria-label', t('battle.cell', { row: row + 1, col: col + 1, status: label }));
      b.id = `formation-${row}-${col}`;
      b.className = `cell${hq ? ' hq' : ''}${placement ? ' occupied' : ''}${placement?.instanceId === app.selectedInstance ? ' selected' : ''}`;
      if (placement && state.phase === 'preparation') {
        b.draggable = true; b.addEventListener('dragstart', event => { app.selectedUnit = ''; app.selectedInstance = placement.instanceId; event.dataTransfer?.setData('text/plain', placement.instanceId); });
      }
      b.addEventListener('dragover', event => { if (usable && state.phase === 'preparation') event.preventDefault(); });
      b.addEventListener('drop', event => { event.preventDefault(); app.selectCell(cell); }); this.grid.append(b);
    }
    this.controls.replaceChildren();
    if (state.phase === 'preparation') {
      this.controls.append(el('p', app.selectedUnit ? t('battle.selection', { name: t(`tech.${app.selectedUnit}.name`) }) : t('battle.noSelection'), 'hint'), el('p', t('battle.move'), 'hint'));
      this.controls.append(button(t('battle.cancel'), () => { app.command({ type: 'cancel', instanceId: app.selectedInstance }); app.selectedInstance = ''; app.emit(); }, !app.selectedInstance));
      const allowed = app.startResult(); this.controls.append(button(t('battle.start'), () => this.startOrPause(), !allowed.ok));
      if (!allowed.ok) this.controls.append(el('p', t(allowed.messageKey), 'hint'));
      if (state.wave === 1) this.controls.append(el('p', t('tutorial.buyTwo'), 'tutorial-callout'), el('p', t('tutorial.purchaseProgress', { count: state.placements.filter(p => p.unitId === 'rifle').length }), 'hint'));
    } else if (state.phase === 'combat') {
      this.controls.append(el('p', t(app.calculating ? 'battle.calculating' : 'battle.playing')), button(t(app.paused ? 'battle.resume' : 'battle.pause'), () => this.startOrPause(), app.calculating));
    } else {
      this.controls.append(el('h3', t(`outcome.${state.phase}`)));
      if (state.phase !== 'clear') this.controls.append(button(t(state.phase === 'defeat' ? 'outcome.retry' : 'outcome.next'), () => app.next()));
      else this.controls.append(button(t('menu.title'), () => { app.screen = 'title'; app.emit(); }));
    }
  }
  help() {
    const body = el('div'); body.append(el('p', this.t('help.body')), el('p', this.t('help.keys')));
    const step = el('p'); let index = Math.min(this.app.state?.tutorialStep ?? 0, tutorial.steps.length - 1);
    const draw = () => { step.textContent = this.t(tutorial.steps[index]); if (this.app.state?.phase === 'preparation' && !this.app.calculating && !this.app.loading && !this.app.quitting) { this.app.state = { ...this.app.state, tutorialStep: index }; this.app.scheduleSave(); } };
    body.append(step, button(this.t('tutorial.previous'), () => { index = Math.max(0, index - 1); draw(); }), button(this.t('tutorial.next'), () => { index = Math.min(tutorial.steps.length - 1, index + 1); draw(); }));
    draw(); openModal(this.modalHost, this.t('menu.help'), body, this.t);
  }
  settings() {
    const body = el('div', '', 'settings'); const locale = el('select');
    for (const code of localeManifest.supportedLocales) { const option = el('option', this.t(`locale.${code}`)); option.value = code; locale.append(option); }
    const label = el('label', this.t('settings.locale')); label.append(locale); body.append(label);
    locale.value = this.app.settings.locale; locale.addEventListener('change', () => { this.app.settings.locale = locale.value; this.app.persistSettings(); });
    const motion = el('input'); motion.type = 'checkbox'; motion.checked = this.app.settings.reducedMotion;
    motion.addEventListener('change', () => { this.app.settings.reducedMotion = motion.checked; this.app.persistSettings(); });
    const motionLabel = el('label', this.t('settings.reducedMotion')); motionLabel.append(motion); body.append(motionLabel);
    const speed = el('select'); for (const value of layout.speeds) { const option = el('option', this.t('settings.speedValue', { value })); option.value = String(value); speed.append(option); }
    speed.value = String(this.app.settings.speed); speed.addEventListener('change', () => { this.app.settings.speed = Number(speed.value); this.app.persistSettings(); });
    const speedLabel = el('label', this.t('settings.speed')); speedLabel.append(speed); body.append(speedLabel);
    for (const key of ['bgmVolume', 'sfxVolume']) {
      const control = el('input'); control.type = 'range'; control.min = '0'; control.max = '1'; control.step = '.05'; control.value = String(this.app.settings[/** @type {'bgmVolume'|'sfxVolume'} */ (key)]);
      control.addEventListener('input', () => { this.app.settings[/** @type {'bgmVolume'|'sfxVolume'} */ (key)] = Number(control.value); this.app.persistSettings(); });
      const volume = el('label', this.t(`settings.${key}`)); volume.append(control); body.append(volume);
    }
    body.append(el('p', this.t('settings.silent'))); openModal(this.modalHost, this.t('menu.settings'), body, this.t);
  }
  dispose() { this.abort.abort(); this.unlisten(); this.tree.dispose(); this.app.frameListeners.delete(this.updateTimer); this.host.remove(); }
}
