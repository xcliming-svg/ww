import { isUnlocked } from '../domain/tech/TechGraph.js';
import {
  createCampaign,
  startWave,
  resolveWave,
  advanceCampaign,
  retryWave,
} from '../domain/model/Campaign.js';
import { dispatchPreparationCommand } from '../domain/economy/EconomyService.js';
import { planWave, getRecon } from '../domain/waves/WavePlanner.js';
import { failure } from '../domain/util/Result.js';
import { chooseDoctrine } from '../domain/model/Doctrine.js';
import { getDesktop } from '../infrastructure/DesktopBridge.js';
import balance from '../infrastructure/ImplementationBalanceConfig.js';
import content from '../../data/waves/content.json';
import layout from '../../data/ui/layout.json';
import localeManifest from '../../locales/manifest.json';
export class GameCoordinator {
  /** @type {Set<()=>void>} */ listeners = new Set();
  /** @type {Set<()=>void>} */ frameListeners = new Set();
  /** @type {import('../domain/model/contracts.js').GameState|null} */ state = null;
  screen = 'title';
  selectedId = 'hq';
  selectedInstance = '';
  selectedUnit = '';
  errorKey = '';
  noticeKey = '';
  noticeNameKey = '';
  saveStatus = 'hud.unsaved';
  calculating = false;
  loading = false;
  quitting = false;
  animationLock = false;
  paused = false;
  menuPaused = false;
  elapsedMs = 0;
  /** @type {ReturnType<import('../domain/systems/StepSimulation.js').simulateBattle>|null} */ playback =
    null;
  /** @type {import('../domain/systems/StepSimulation.js').CombatFrame|null} */ frame = null;
  /** @type {Worker|null} */ worker = null;
  /** @type {ReturnType<typeof setTimeout>|undefined} */ saveTimer;
  /** @type {import('../domain/model/contracts.js').Settings} */ settings = {
    locale: 'ko-KR',
    reducedMotion: false,
    bgmVolume: 0,
    sfxVolume: 0,
    speed: layout.defaultSpeed,
  };
  /** @param {import('../domain/model/contracts.js').DomainConfig} config @param {import('../infrastructure/SaveRepository.js').SaveRepository} saves */
  constructor(config, saves) {
    this.config = config;
    this.saves = saves;
    try {
      const raw = localStorage.getItem('ww.settings.v1');
      if (raw) {
        const value = JSON.parse(raw);
        if (
          value?.version === 1 &&
          localeManifest.supportedLocales.includes(value.settings?.locale) &&
          typeof value.settings.reducedMotion === 'boolean' &&
          layout.speeds.includes(value.settings.speed) &&
          [value.settings.bgmVolume, value.settings.sfxVolume].every(
            (n) => Number.isFinite(n) && n >= 0 && n <= 1,
          )
        )
          this.settings = value.settings;
        else this.errorKey = 'error.SETTINGS_INVALID';
      }
    } catch {
      this.errorKey = 'error.SETTINGS_INVALID';
    }
  }
  persistSettings() {
    try {
      localStorage.setItem(
        'ww.settings.v1',
        JSON.stringify({ version: 1, settings: this.settings }),
      );
    } catch {
      this.errorKey = 'error.SAVE_WRITE';
    }
    this.emit();
  }
  /** @param {()=>void} listener */ subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit() {
    for (const listener of this.listeners) listener();
  }
  get plan() {
    return this.state ? planWave(this.state.wave, this.state.seed, balance, content) : null;
  }
  get recon() {
    return this.plan ? getRecon(this.plan) : [];
  }
  newGame() {
    if (
      this.calculating ||
      this.loading ||
      this.quitting ||
      this.state?.phase === 'combat' ||
      this.animationLock
    )
      return;
    this.worker?.terminate();
    this.worker = null;
    this.playback = null;
    this.frame = null;
    this.calculating = false;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    this.state = createCampaign(this.config, balance, seed, crypto.randomUUID());
    this.screen = 'game';
    this.elapsedMs = 0;
    this.selectedId = 'hq';
    this.selectedUnit = '';
    this.selectedInstance = '';
    this.errorKey = '';
    this.noticeKey = '';
    this.scheduleSave();
    this.emit();
  }
  /** @param {boolean} [backup] */ async load(backup = false) {
    if (
      this.state?.phase === 'combat' ||
      this.calculating ||
      this.loading ||
      this.quitting ||
      this.animationLock
    )
      return;
    this.loading = true;
    if (!backup && this.state && this.saveStatus !== 'hud.saved' && !(await this.flushSave())) {
      this.loading = false;
      this.emit();
      return;
    }
    clearTimeout(this.saveTimer);
    await this.saves.flush();
    const result = await this.saves.load(backup);
    this.loading = false;
    if (result.ok) {
      this.state = result.data;
      this.playback = null;
      this.frame = null;
      this.elapsedMs = 0;
      this.screen = 'game';
      this.selectedId = 'hq';
      this.selectedUnit = '';
      this.selectedInstance = '';
      this.errorKey = '';
      this.noticeKey = '';
      this.saveStatus = 'hud.saved';
    } else this.errorKey = result.messageKey;
    this.emit();
  }
  /** @param {Omit<import('../domain/model/contracts.js').PreparationCommand,'commandId'>} command */
  command(command) {
    if (!this.state) return false;
    if (this.calculating || this.loading || this.quitting || this.animationLock) {
      this.errorKey = 'error.PHASE_LOCKED';
      this.emit();
      return false;
    }
    const result = dispatchPreparationCommand(
      this.state,
      { ...command, commandId: crypto.randomUUID() },
      this.config,
    );
    if (result.ok) {
      this.state = result.data;
      this.errorKey = '';
      this.noticeKey = '';
      if (['build', 'research', 'upgrade'].includes(command.type)) {
        this.noticeKey = 'tree.completed';
        this.noticeNameKey = this.config.nodes.find((n) => n.id === command.nodeId)?.labelKey ?? '';
      }
      if (command.type === 'refund') {
        this.selectedUnit = '';
        this.selectedInstance = '';
        this.noticeKey = 'tree.refunded';
        this.noticeNameKey = this.config.nodes.find((n) => n.id === command.nodeId)?.labelKey ?? '';
      }
      this.scheduleSave();
    } else this.errorKey = result.messageKey;
    this.emit();
    return result.ok;
  }
  /** @param {'primary'|'secondary'} slot @param {string} id */
  selectDoctrine(slot, id) {
    if (!this.state || this.loading || this.calculating || this.quitting || this.animationLock)
      return false;
    const result = chooseDoctrine(this.state, slot, id);
    if (!result.ok) {
      this.errorKey = result.messageKey;
      this.emit();
      return false;
    }
    this.state = result.data;
    this.errorKey = '';
    this.scheduleSave();
    this.emit();
    return true;
  }
  /** @param {string} id */ selectNode(id) {
    this.selectedId = id;
    this.selectedUnit = '';
    this.selectedInstance = '';
    if (this.state?.phase === 'preparation' && !this.animationLock) {
      const node = this.config.nodes.find((n) => n.id === id);
      if (
        node &&
        this.state.revealedNodeIds.includes(id) &&
        isUnlocked(node, this.state, this.config.nodes) &&
        !this.state.acknowledgedNodeIds.includes(id)
      )
        this.command({ type: 'acknowledge', nodeId: id });
      else this.emit();
    } else this.emit();
  }
  /** @param {import('../domain/model/contracts.js').Cell} cell */ selectCell(cell) {
    if (!this.state || this.state.phase !== 'preparation') return;
    const target = this.state.placements.find(
      (p) => p.cell.row === cell.row && p.cell.col === cell.col,
    );
    if (this.selectedUnit) this.command({ type: 'place', nodeId: this.selectedUnit, cell });
    else if (this.selectedInstance) {
      if (target?.instanceId !== this.selectedInstance)
        this.command(
          target
            ? { type: 'swap', instanceId: this.selectedInstance, otherId: target.instanceId }
            : { type: 'move', instanceId: this.selectedInstance, cell },
        );
      this.selectedInstance = '';
      this.emit();
    } else {
      this.selectedInstance = target?.instanceId ?? '';
      this.emit();
    }
  }
  cancelTool() {
    this.selectedUnit = '';
    this.selectedInstance = '';
    this.emit();
  }
  async beginCombat() {
    if (!this.state || this.calculating || this.loading || this.quitting || this.animationLock)
      return;
    const started = startWave(this.state, this.config);
    if (!started.ok) {
      this.errorKey = started.messageKey;
      this.emit();
      return;
    }
    this.calculating = true;
    this.emit();
    if (!(await this.flushSave())) {
      this.calculating = false;
      this.emit();
      return;
    }
    this.state = started.data;
    this.errorKey = '';
    this.selectedUnit = '';
    this.selectedInstance = '';
    this.emit();
    let worker;
    try {
      worker = new Worker(new URL('./combat-worker.js', import.meta.url), { type: 'module' });
    } catch {
      this.calculating = false;
      this.restoreFailedCombat();
      return;
    }
    this.worker = worker;
    worker.onmessage = (event) => {
      if (this.worker !== worker) return;
      worker.terminate();
      this.worker = null;
      this.calculating = false;
      if (!event.data.ok || event.data.result.outcome === 'invalid') {
        this.restoreFailedCombat();
        return;
      }
      this.playback = event.data.result;
      this.elapsedMs = 0;
      this.paused = false;
      this.frame = this.playback?.frames[0] ?? null;
      this.emit();
    };
    const fail = () => {
      if (this.worker !== worker) return;
      worker.terminate();
      this.worker = null;
      this.calculating = false;
      this.restoreFailedCombat();
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    try {
      worker.postMessage({ state: this.state, plan: this.plan, balance });
    } catch {
      fail();
    }
  }
  restoreFailedCombat() {
    if (this.state?.checkpoint) this.state = this.state.checkpoint;
    this.errorKey = 'error.SIMULATION_INVALID';
    this.emit();
  }
  /** @param {number} deltaMs */ update(deltaMs) {
    if (
      !this.playback ||
      this.paused ||
      this.menuPaused ||
      this.state?.phase !== 'combat' ||
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0
    )
      return;
    this.elapsedMs += deltaMs * this.settings.speed;
    const ratio = Math.min(1, this.elapsedMs / (this.config.rules.combatSeconds * 1000));
    const targetTick = Math.floor(ratio * this.playback.ticks);
    const frames = this.playback.frames;
    let left = 0,
      right = frames.length - 1;
    while (left < right) {
      const middle = Math.ceil((left + right) / 2);
      if (frames[middle].tick <= targetTick) left = middle;
      else right = middle - 1;
    }
    this.frame = frames[left] ?? null;
    for (const listener of this.frameListeners) listener();
    if (ratio < 1) return;
    const result = resolveWave(this.state, this.playback, balance);
    this.playback = null;
    if (result.ok) {
      this.state = result.data;
      this.scheduleSave();
    } else this.errorKey = result.messageKey;
    this.emit();
  }
  next() {
    if (!this.state || this.loading || this.calculating || this.quitting || this.animationLock)
      return;
    const result =
      this.state.phase === 'defeat' ? retryWave(this.state) : advanceCampaign(this.state, balance);
    if (result.ok) {
      this.state = result.data;
      this.frame = null;
      this.elapsedMs = 0;
      this.errorKey = '';
      this.noticeKey = '';
      this.scheduleSave();
    } else this.errorKey = result.messageKey;
    this.emit();
  }
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveStatus = 'hud.unsaved';
    this.saveTimer = setTimeout(() => {
      void this.flushSave();
    }, layout.saveDelayMs);
  }
  async flushSave() {
    clearTimeout(this.saveTimer);
    if (!this.state) return true;
    if (this.state.phase === 'combat') {
      await this.saves.flush();
      return true;
    }
    const snapshot = this.state;
    this.saveStatus = 'hud.saving';
    this.emit();
    const result = await this.saves.save(snapshot);
    if (snapshot === this.state) this.saveStatus = result.ok ? 'hud.saved' : 'hud.saveFailed';
    if (!result.ok) this.errorKey = result.messageKey;
    this.emit();
    return result.ok;
  }
  async quit() {
    if (this.quitting || this.loading) return;
    this.quitting = true;
    try {
      if (await this.flushSave()) await getDesktop()?.quit();
    } catch {
      this.errorKey = 'error.QUIT_FAILED';
    } finally {
      this.quitting = false;
      this.emit();
    }
  }
  startResult() {
    return this.state ? startWave(this.state, this.config) : failure('INVALID_STATE');
  }
  dispose() {
    clearTimeout(this.saveTimer);
    this.worker?.terminate();
    this.worker = null;
    this.calculating = false;
    this.listeners.clear();
    this.frameListeners.clear();
  }
}
