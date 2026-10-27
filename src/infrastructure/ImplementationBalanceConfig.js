import candidate from '../../data/balance/candidate-v13-robot-defense.json';
import display from '../../data/visual/unit-display.json';
import { resolveCombatBalance } from './ResolveCombatBalance.js';
/** Implementation-only candidate; active.json remains the historical reference. */
export default resolveCombatBalance(candidate, display);
