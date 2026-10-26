import Phaser from 'phaser';
import { AssetRegistry } from '../assets/AssetRegistry.js';
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }
  preload() {
    const registry = new AssetRegistry();
    for (const slot of registry.slots) {
      const url = registry.url(slot.assetId);
      if (url && !['font', 'audio'].includes(slot.category)) this.load.image(slot.assetId, url);
    }
    this.load.on('loaderror', (/** @type {{key:string}} */ file) => console.warn(`Asset fallback: ${file.key}`));
    this.events.once('shutdown', () => this.load.removeAllListeners('loaderror'));
  }
  create() { void document.fonts.ready.then(() => { if (this.scene.isActive()) this.scene.start('Title'); }); }
}
