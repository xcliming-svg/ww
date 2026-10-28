import Phaser from 'phaser';
export class TitleScene extends Phaser.Scene {
  /** @param {import('../../application/GameCoordinator.js').GameCoordinator} app */
  constructor(app) {
    super('Title');
    this.app = app;
  }
  create() {
    const sync = () => {
      if (this.app.screen === 'game') this.scene.start('Battlefield');
    };
    const off = this.app.subscribe(sync);
    this.events.once('shutdown', off);
    sync();
  }
}
