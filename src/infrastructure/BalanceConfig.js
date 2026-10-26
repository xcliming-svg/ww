import active from '../../data/balance/active.json';
const candidates = import.meta.glob('/data/balance/candidate-*.json', { eager: true, import: 'default' });
const value = candidates[`/data/balance/${active.candidate}.json`];
if (!value) throw new Error('CONFIG_INVALID');
export default /** @type {import('../../data/balance/candidate-v7.json') & {rewards?:number[]}} */ (value);
