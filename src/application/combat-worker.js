import { simulateBattle } from '../domain/systems/StepSimulation.js';
/** @param {MessageEvent<{state:import('../domain/model/contracts.js').GameState,plan:ReturnType<import('../domain/waves/WavePlanner.js').planWave>,balance:import('../../data/balance/candidate-v7.json')}>} event */
self.onmessage = event => {
  try { self.postMessage({ ok: true, result: simulateBattle(event.data.state, event.data.plan, event.data.balance, true) }); }
  catch (error) { console.error(error); self.postMessage({ ok: false }); }
};
