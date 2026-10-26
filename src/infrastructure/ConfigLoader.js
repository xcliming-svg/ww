import { validateContent } from './schema-validators.js';
import { validateTechGraph } from '../domain/tech/TechGraph.js';
import { makeDomainConfig } from '../domain/model/ContentConfig.js';
import balance from './BalanceConfig.js';
const modules = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const translations = import.meta.glob('/locales/*.json', { eager: true, import: 'default' });
import desktop from '../../desktop/builder.json';
import registry from '../../data/schemas/registry.json';
/** Validate trusted bundled JSON at startup. Broken configuration stops boot visibly. */
export function loadConfig() {
  const raw = Object.fromEntries([...Object.entries(modules), ...Object.entries(translations)].filter(([p]) => registry.includes(p.slice(1))).map(([p, v]) => [p.slice(1), v]));
  raw['desktop/builder.json'] = desktop;
  if (!validateContent(raw)) throw new Error('CONFIG_INVALID');
  /** @type {import('../domain/model/contracts.js').DomainConfig} */
  const domain = {
    nodes: /** @type {import('../domain/model/contracts.js').TechNode[]} */ (raw['data/tech/nodes.json']),
    layouts: /** @type {Record<string,import('../domain/model/contracts.js').Cell[]|null>} */ (raw['data/formation/layouts.json']),
    costs: /** @type {{costs:Record<string,number|null>}} */ (raw['data/balance/economy.json']).costs,
    upgrades: /** @type {import('../domain/model/contracts.js').UpgradeProfile[]} */ (raw['data/units/upgrade-profiles.json']),
    rules: /** @type {import('../domain/model/contracts.js').Rules} */ (raw['data/rules.json'])
  };
  const issues = validateTechGraph(domain.nodes);
  if (issues.length) throw new Error('CONFIG_INVALID', { cause: issues });
  return makeDomainConfig(domain.nodes, domain.layouts, domain.rules, balance);
}
