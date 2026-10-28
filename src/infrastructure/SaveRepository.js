import { validateSaveV1, validateSaveV2 } from './schema-validators.js';
import { migrateEnvelope, migrateState, compatibleConfig } from './SaveMigrations.js';
import { validateState } from '../domain/model/GameState.js';
import { success, failure } from '../domain/util/Result.js';
import balance from './ImplementationBalanceConfig.js';
import { formationStage } from '../domain/waves/WavePlanner.js';
import { maxHqHp } from '../domain/model/Doctrine.js';
import { validateAnnual52Save } from './ValidateAnnual52Save.js';
/** @param {unknown} value @returns {string} */
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
/** @param {unknown} value */
async function checksum(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export class SaveRepository {
  /** @type {Promise<unknown>} */
  queue = Promise.resolve();
  /** @param {import('../domain/model/contracts.js').SaveAdapter} adapter @param {import('../domain/model/contracts.js').DomainConfig} config @param {number} maxBytes */
  constructor(adapter, config, maxBytes) {
    this.adapter = adapter;
    this.config = config;
    this.maxBytes = maxBytes;
  }
  /** @param {import('../domain/model/contracts.js').GameState} state */
  validSnapshot(state) {
    if (
      !validateState(state, this.config) ||
      state.formationStage !== formationStage(state.wave, balance) ||
      state.hqHp > maxHqHp(state.doctrines)
    )
      return false;
    if (state.phase === 'preparation' && state.hqHp !== maxHqHp(state.doctrines)) return false;
    if (state.placements.some((p) => p.paidCost !== this.config.costs[p.unitId])) return false;
    if (state.checkpoint) {
      if (!this.validSnapshot(state.checkpoint) || state.seed !== state.checkpoint.seed)
        return false;
      for (const key of [
        'supplies',
        'buildingIds',
        'researchIds',
        'upgradeLevels',
        'investments',
        'resolutionIds',
        'clearedWaveCount',
        'revealedNodeIds',
        'acknowledgedNodeIds',
        'legacyFreeNodeIds',
        'doctrines',
      ]) {
        if (
          canonical(state[/** @type {keyof typeof state} */ (key)]) !==
          canonical(state.checkpoint[/** @type {keyof typeof state} */ (key)])
        )
          return false;
      }
    }
    return true;
  }
  /** @param {string} raw @returns {Promise<import('../domain/model/contracts.js').Result<import('../domain/model/contracts.js').GameState>>} */
  async decode(raw) {
    try {
      if (new TextEncoder().encode(raw).length > this.maxBytes) return failure('SAVE_CORRUPT');
      const migrated = migrateEnvelope(JSON.parse(raw));
      if (!migrated.ok) return migrated;
      const validator =
        migrated.data.schemaVersion === 1
          ? validateSaveV1
          : migrated.data.schemaVersion === 2
            ? validateSaveV2
            : validateAnnual52Save;
      if (!validator(migrated.data)) return failure('SAVE_CORRUPT');
      const envelope = /** @type {import('../domain/model/contracts.js').SaveEnvelope} */ (
        migrated.data
      );
      const { checksum: expected, ...payload } = envelope;
      if (expected !== (await checksum(payload))) return failure('SAVE_CORRUPT');
      if (
        !compatibleConfig(envelope, this.config) ||
        envelope.contentVersion !== this.config.rules.contentVersion
      )
        return failure('SAVE_MISMATCH');
      // Preview and campaign cannot masquerade as one another. Combat saves are forbidden.
      const state = migrateState(envelope.state, envelope.schemaVersion, this.config);
      if (state.mode !== 'campaign' || state.phase === 'combat' || !this.validSnapshot(state))
        return failure('SAVE_CORRUPT');
      return success(state);
    } catch {
      return failure('SAVE_CORRUPT');
    }
  }
  /** @param {boolean} [backup] */
  async load(backup = false) {
    await this.queue;
    try {
      const raw = await this.adapter.read(backup);
      return raw === null ? failure('NO_SAVE') : this.decode(raw);
    } catch {
      return failure('SAVE_READ');
    }
  }
  /** @param {import('../domain/model/contracts.js').GameState} state */
  save(state) {
    const snapshot = structuredClone(state);
    const task = this.queue.then(async () => {
      if (
        snapshot.mode !== 'campaign' ||
        snapshot.phase === 'combat' ||
        !this.validSnapshot(snapshot)
      )
        return failure('INVALID_STATE');
      try {
        const payload = {
          schemaVersion: this.config.rules.schemaVersion,
          configVersion: this.config.rules.configVersion,
          contentVersion: this.config.rules.contentVersion,
          savedAt: new Date().toISOString(),
          state: snapshot,
        };
        const envelope = { ...payload, checksum: await checksum(payload) };
        const raw = JSON.stringify(envelope);
        if (!validateAnnual52Save(envelope) || new TextEncoder().encode(raw).length > this.maxBytes)
          return failure('SAVE_CORRUPT');
        const previous = await this.adapter.read();
        const preserveOriginal = previous !== null && !(await this.decode(previous)).ok;
        await this.adapter.write(raw, preserveOriginal);
        return success(undefined);
      } catch {
        return failure('SAVE_WRITE');
      }
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
  async flush() {
    await this.queue;
  }
}
