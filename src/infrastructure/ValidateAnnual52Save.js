import { validateSave } from './schema-validators.js';
import { isDoctrineChoice } from '../domain/model/Doctrine.js';
/** @param {unknown} input */
export function validateAnnual52Save(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const envelope = /** @type {{state?:any}} */ (input);
  const state = envelope.state;
  if (!state || !state.doctrines ||
    !isDoctrineChoice('primary', state.doctrines.primary) ||
    !isDoctrineChoice('secondary', state.doctrines.secondary) ||
    Object.keys(state.doctrines).sort().join(',') !== 'primary,secondary') return false;
  if (state.checkpoint && (!state.checkpoint.doctrines ||
    !isDoctrineChoice('primary', state.checkpoint.doctrines.primary) ||
    !isDoctrineChoice('secondary', state.checkpoint.doctrines.secondary) ||
    Object.keys(state.checkpoint.doctrines).sort().join(',') !== 'primary,secondary')) return false;
  return validateSave(input);
}
