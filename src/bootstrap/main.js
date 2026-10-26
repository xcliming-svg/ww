import Phaser from 'phaser';
import { loadConfig } from '../infrastructure/ConfigLoader.js';
import { createLocalize } from '../infrastructure/Localize.js';
import { SaveRepository } from '../infrastructure/SaveRepository.js';
import { createSaveAdapter, getDesktop } from '../infrastructure/DesktopBridge.js';
import { GameCoordinator } from '../application/GameCoordinator.js';
import { GameShell } from '../adapters/ui/GameShell.js';
import { BootScene } from '../adapters/phaser/BootScene.js';
import { PreloadScene } from '../adapters/phaser/PreloadScene.js';
import { TitleScene } from '../adapters/phaser/TitleScene.js';
import { BattlefieldScene } from '../adapters/phaser/BattlefieldScene.js';
import { OutcomeScene } from '../adapters/phaser/OutcomeScene.js';
import layout from '../../data/ui/layout.json';
import manifest from '../../locales/manifest.json';
import '../adapters/ui/styles.css';
const dictionaries = Object.fromEntries(Object.entries(import.meta.glob('/locales/*.json', { eager: true, import: 'default' })).filter(([p]) => !p.endsWith('/manifest.json')).map(([p, value]) => [p.split('/').at(-1)?.replace('.json', '') ?? '', /** @type {Record<string,string>} */ (value)]));
const t = createLocalize(dictionaries, manifest.defaultLocale, manifest.fallbackLocale);
document.title = t('app.title'); const root = document.getElementById('app');
/** @type {GameCoordinator|null} */ let activeApp = null;
const removeClose = getDesktop()?.onClose(() => { if (activeApp) void activeApp.quit(); else void getDesktop()?.quit(); });
let startupErrorKey = 'error.CONFIG_INVALID';
try {
  if (!root) throw new Error('MISSING_ROOT'); const config = loadConfig();
  startupErrorKey = 'error.STARTUP_FAILED';
  const app = new GameCoordinator(config, new SaveRepository(createSaveAdapter(), config, layout.saveMaxBytes));
  activeApp = app;
  const liveT = (/** @type {string} */ key, /** @type {Record<string,string|number>} */ params = {}) => createLocalize(dictionaries, app.settings.locale, manifest.fallbackLocale)(key, params);
  const shell = new GameShell(root, app, liveT);
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: shell.canvasHost, width: layout.worldSize, height: layout.worldSize, pixelArt: true, antialias: false, backgroundColor: '#eceee2',
    audio: { noAudio: true }, scene: [new BootScene(), new PreloadScene(), new TitleScene(app), new BattlefieldScene(app, liveT), new OutcomeScene(app)] });
  const unload = (/** @type {BeforeUnloadEvent} */ event) => {
    if (app.state && (app.saveStatus === 'hud.unsaved' || app.saveStatus === 'hud.saving' || app.saveStatus === 'hud.saveFailed')) { event.preventDefault(); void app.flushSave(); }
  };
  window.addEventListener('beforeunload', unload);
  if (import.meta.hot) import.meta.hot.dispose(() => { window.removeEventListener('beforeunload', unload); removeClose?.(); shell.dispose(); app.dispose(); game.destroy(true); });
} catch (error) { console.error(error); if (root) root.textContent = t(startupErrorKey); }
