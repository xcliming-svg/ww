import candidate from '../../data/balance/candidate-v13-robot-defense.json';
import display from '../../data/visual/unit-display.json';
import { annual52Waves } from '../domain/waves/Annual52Content.js';
import { resolveCombatBalance } from '../domain/model/ResolveCombatBalance.js';
// Annual 52 content overrides only campaign inputs, not main grade/damage math.
export default resolveCombatBalance({
  ...candidate,
  id: 'annual52-main-grade-v1',
  initialSupplies: 160,
  enemyPowerPerWave: 0,
  expansionWaves: [1, 4, 8, 20, 34],
  rewards: annual52Waves.map(w => w.reward)
}, display);
