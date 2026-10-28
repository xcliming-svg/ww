import { validateSave } from './schema-validators.js';
import { isDoctrineChoice } from '../domain/model/Doctrine.js';
// Transitional adapter for existing precompiled schema validator. The canonical
// v3 save schema now allows doctrines; regenerate standalone validators when allowed.
// The original validator still checks every other field, including checkpoint.
/** @param {any} state */
function stripDoctrine(state) {
  if (!state || typeof state !== 'object') return state;
  const out = { ...state }; delete out.doctrines;
  if (out.checkpoint && typeof out.checkpoint === 'object') {
    out.checkpoint = { ...out.checkpoint };
    delete out.checkpoint.doctrines;
  }
  return out;
}
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
  return validateSave({ ...envelope, state: stripDoctrine(state) });
}
