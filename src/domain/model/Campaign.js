import { createPreview, validateState } from './GameState.js';
import { success, failure, isAmount } from '../util/Result.js';
import { formationStage, rewardForWave } from '../waves/WavePlanner.js';
/** @typedef {import('../../../data/balance/candidate-v7.json') & {rewards?:number[]}} Balance */
/** @param {import('./contracts.js').DomainConfig} config @param {Balance} balance @param {number} seed @param {string} campaignId */
export function createCampaign(config, balance, seed, campaignId) {
  const state = createPreview(config, campaignId);
  state.mode = 'campaign'; state.supplies = balance.initialSupplies; state.seed = seed; state.rngState = seed; state.hqHp = balance.hqHp;
  state.formationStage = formationStage(1, balance); return state;
}
/** @param {import('./contracts.js').GameState} state @param {import('./contracts.js').DomainConfig} config */
export function startWave(state, config) {
  if (!validateState(state, config)) return failure('INVALID_STATE');
  if (state.phase !== 'preparation') return failure('PHASE_LOCKED');
  if (state.mode !== 'campaign') return failure('RULES_UNRESOLVED');
  if (!state.buildingIds.includes('hq')) return failure('HQ_REQUIRED');
  if (state.wave === 1 && !['1,2', '3,2'].every(cell => state.placements.some(p => p.unitId === 'rifle' && `${p.cell.row},${p.cell.col}` === cell))) return failure('TUTORIAL_REQUIRED');
  const next = structuredClone(state); next.checkpoint = structuredClone({ ...state, checkpoint: null }); next.phase = 'combat';
  return success(next);
}
/** @param {import('./contracts.js').GameState} state @param {ReturnType<import('../systems/StepSimulation.js').simulateBattle>} outcome @param {Balance} balance */
export function resolveWave(state, outcome, balance) {
  if (state.phase !== 'combat' || !state.checkpoint || state.resolutionIds.includes(outcome.resolutionId)) return failure('PHASE_LOCKED');
  if (outcome.outcome === 'invalid' || outcome.outcome === null) return failure('SIMULATION_INVALID');
  if (outcome.resolutionId !== `${state.campaignId}:${state.wave}:${state.seed}`) return failure('INVALID_STATE');
  const next = structuredClone(state); next.placements = []; next.hqHp = outcome.hqHp;
  if (outcome.outcome === 'defeat') { next.phase = 'defeat'; return success(next); }
  if (!isAmount(next.supplies)) return failure('INVALID_STATE');
  const amount = next.supplies + rewardForWave(next.wave, balance);
  if (!isAmount(amount)) return failure('OVERFLOW');
  next.supplies = amount; next.clearedWaveCount = next.wave; next.resolutionIds.push(outcome.resolutionId); next.checkpoint = null;
  next.phase = next.wave === 100 ? 'clear' : 'victory'; return success(next);
}
/** @param {import('./contracts.js').GameState} state @param {Balance} balance */
export function advanceCampaign(state, balance) {
  if (state.phase !== 'victory' || state.wave >= 100) return failure('PHASE_LOCKED');
  const next = structuredClone(state); next.wave += 1; next.phase = 'preparation'; next.placements = [];
  next.hqHp = balance.hqHp; next.formationStage = formationStage(next.wave, balance); next.commandIds = [];
  return success(next);
}
/** @param {import('./contracts.js').GameState} state */
export function retryWave(state) {
  if (state.phase !== 'defeat' || !state.checkpoint) return failure('PHASE_LOCKED');
  return success(structuredClone(state.checkpoint));
}
