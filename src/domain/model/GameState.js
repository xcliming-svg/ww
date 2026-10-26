import { isAmount } from '../util/Result.js';
import { isUnlocked } from '../tech/TechGraph.js';
import { usableCell } from '../waves/FormationService.js';
import { validInvestments } from '../economy/InvestmentLedger.js';
/** @param {import('./contracts.js').DomainConfig} config @param {string} campaignId @returns {import('./contracts.js').GameState} */
export function createPreview(config, campaignId) {
  return { mode: 'preview', phase: 'preparation', campaignId, wave: 1, seed: 0, rngState: 0, supplies: null,
    formationStage: config.rules.preview.formationStage, buildingIds: [...config.rules.preview.buildingIds],
    researchIds: [...config.rules.preview.researchIds], upgradeLevels: {}, investments: [], placements: [], commandIds: [], acknowledgedNodeIds: [], tutorialStep: 0,
    clearedWaveCount: 0, resolutionIds: [], hqHp: 0, checkpoint: null };
}
/** Structural + semantic guard. Caller supplies schema validation for unknown JSON first.
 * @param {import('./contracts.js').GameState} state @param {import('./contracts.js').DomainConfig} config */
export function validateState(state, config) {
  if (!state || !['preview', 'campaign'].includes(state.mode) || !['preparation', 'combat', 'victory', 'defeat', 'clear'].includes(state.phase)) return false;
  if (!Number.isSafeInteger(state.wave) || state.wave < 1 || state.wave > config.rules.maxWave || !state.campaignId) return false;
  if (![state.seed, state.rngState].every(n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff)) return false;
  if (state.mode === 'preview' ? state.supplies !== null : !isAmount(state.supplies)) return false;
  if (![state.buildingIds, state.researchIds, state.placements, state.commandIds, state.acknowledgedNodeIds].every(Array.isArray)) return false;
  if (!config.layouts[state.formationStage] || !state.upgradeLevels || typeof state.upgradeLevels !== 'object') return false;
  if (!Array.isArray(state.resolutionIds) || new Set(state.resolutionIds).size !== state.resolutionIds.length || !Number.isInteger(state.clearedWaveCount) || state.clearedWaveCount < 0 || state.clearedWaveCount > config.rules.maxWave || !Number.isFinite(state.hqHp) || state.hqHp < 0) return false;
  if (state.mode === 'campaign') {
    const resolved = ['victory', 'clear'].includes(state.phase);
    if (state.clearedWaveCount !== state.wave - (resolved ? 0 : 1) || state.resolutionIds.length !== state.clearedWaveCount) return false;
    if (state.phase === 'clear' && state.wave !== config.rules.maxWave || state.phase === 'victory' && state.wave >= config.rules.maxWave) return false;
    if (['combat', 'defeat'].includes(state.phase) !== (state.checkpoint !== null)) return false;
    if (state.phase === 'defeat' ? state.hqHp !== 0 : state.hqHp <= 0) return false;
    for (let wave = 1; wave <= state.clearedWaveCount; wave++) if (!state.resolutionIds.includes(`${state.campaignId}:${wave}:${state.seed}`)) return false;
    if ((resolved || state.phase === 'defeat') && state.placements.length) return false;
  }
  if (state.checkpoint && (state.checkpoint.checkpoint !== null || state.checkpoint.phase !== 'preparation' || state.checkpoint.wave !== state.wave || state.checkpoint.campaignId !== state.campaignId || !validateState(state.checkpoint, config))) return false;
  for (const list of [state.buildingIds, state.researchIds, state.commandIds, state.acknowledgedNodeIds]) if (new Set(list).size !== list.length) return false;
  if (config.rules.preview.buildingIds.some(id => !state.buildingIds.includes(id)) || config.rules.preview.researchIds.some(id => !state.researchIds.includes(id)) || !Number.isInteger(state.tutorialStep) || state.tutorialStep < 0) return false;
  for (const id of [...state.buildingIds, ...state.researchIds]) {
    const node = config.nodes.find(n => n.id === id);
    if (!node || (state.researchIds.includes(id) ? node.kind !== 'research' : !['hq', 'building'].includes(node.kind)) || !isUnlocked(node, state, config.nodes)) return false;
  }
  if (state.acknowledgedNodeIds.some(id => !config.nodes.some(n => n.id === id))) return false;
  const cells = new Set(); const instances = new Set();
  for (const p of state.placements) {
    const unit = config.nodes.find(n => n.id === p.unitId && n.kind === 'unit');
    if (!unit || !isUnlocked(unit, state, config.nodes) || !p.instanceId || !isAmount(p.paidCost) || !usableCell(config, state.formationStage, p.cell)) return false;
    const key = `${p.cell.row},${p.cell.col}`;
    if (cells.has(key) || instances.has(p.instanceId)) return false;
    cells.add(key); instances.add(p.instanceId);
  }
  for (const [unitId, levels] of Object.entries(state.upgradeLevels)) {
    const unit = config.nodes.find(n => n.id === unitId && n.kind === 'unit');
    if (!unit || !isUnlocked(unit, state, config.nodes) || !levels || Array.isArray(levels) || typeof levels !== 'object') return false;
    for (const [id, level] of Object.entries(levels)) {
      const profile = config.upgrades.find(p => p.id === id);
      if (!profile || !Number.isSafeInteger(level) || level < 0 || level > (profile.costs?.length ?? 0)) return false;
    }
  }
  return validInvestments(state, config);
}
