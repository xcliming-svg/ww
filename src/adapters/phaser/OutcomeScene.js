import Phaser from 'phaser';
export class OutcomeScene extends Phaser.Scene {
  /** @param {import('../../application/GameCoordinator.js').GameCoordinator} app */
  constructor(app) {
    super('Outcome');
    this.app = app;
  }
  create() {
    const sync = () => {
      if (this.app.screen === 'title') this.scene.start('Title');
      else if (this.app.state?.phase === 'preparation') this.scene.start('Battlefield');
    };
    const off = this.app.subscribe(sync);
    this.events.once('shutdown', off);
    sync();
  }
}
