/** Silent implementation; never touches an audio device or fetches absent files. */
export class AudioAdapter {
  volume = { bgm: 0, sfx: 0 };
  /** @param {number} bgm @param {number} sfx */
  setVolume(bgm, sfx) {
    if (![bgm, sfx].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return false;
    this.volume = { bgm, sfx }; return true;
  }
  /** @param {string} _assetId */
  play(_assetId) { return false; }
  dispose() { this.volume = { bgm: 0, sfx: 0 }; }
}
