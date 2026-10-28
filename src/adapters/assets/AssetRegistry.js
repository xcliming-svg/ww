import slots from '../../../data/assets/slots.json';
/** Stable IDs remain the only boundary between presentation and asset production. */
export class AssetRegistry {
  slots = slots;
  /** @param {string} id */ get(id) {
    return this.slots.find((slot) => slot.assetId === id);
  }
  /** @param {string} id */ url(id) {
    const slot = this.get(id);
    if (!slot?.relativePath || slot.category === 'audio') return null;
    return `${import.meta.env.BASE_URL}${slot.relativePath}`;
  }
}
