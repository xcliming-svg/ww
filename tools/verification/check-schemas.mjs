import Ajv from 'ajv';
import { check, finish, data, registry, walk, readJson as read } from './context.mjs';
import { readLiteral, readDefaultProperty } from './source.mjs';
const annual52Waves = await readLiteral('src/domain/waves/Annual52Content.js', 'annual52Waves');
const doctrineChoices = await readLiteral('src/domain/model/Doctrine.js', 'doctrineChoices');
const annualBalance = {
  expansionWaves: await readDefaultProperty(
    'src/infrastructure/ImplementationBalanceConfig.js',
    'expansionWaves',
  ),
  enemyPowerPerWave: await readDefaultProperty(
    'src/infrastructure/ImplementationBalanceConfig.js',
    'enemyPowerPerWave',
  ),
  initialSupplies: await readDefaultProperty(
    'src/infrastructure/ImplementationBalanceConfig.js',
    'initialSupplies',
  ),
  rewards: annual52Waves.map((/** @type {any} */ w) => w.reward),
};
const ajv = new Ajv({ allErrors: true, strict: true });
const contentSchema = await read('data/schemas/content.schema.json');
const validate = ajv.compile(contentSchema);
check(validate(data), JSON.stringify(validate.errors));
for (const file of [
  'data/schemas/save-v1.schema.json',
  'data/schemas/save-v2.schema.json',
  'data/schemas/save.schema.json',
]) {
  const schema = await read(file);
  check(ajv.validateSchema(schema), `Invalid schema: ${file}`);
  ajv.compile(schema);
}
const allData = [...(await walk('data')), ...(await walk('locales'))].filter(
  (p) => p.endsWith('.json') && !p.includes('/schemas/'),
);
for (const p of allData) check(registry.includes(p), `Unregistered JSON: ${p}`);
const candidate = data['data/balance/candidate-v13-robot-defense.json'];
if (candidate.rewards)
  check(
    candidate.rewards.length === 100 &&
      candidate.rewards.every((/** @type {number} */ r) => Number.isSafeInteger(r) && r >= 0),
    'Reward coverage/range',
  );
check(
  candidate.fixedStepSeconds > 0 && candidate.maxTicks > 0 && candidate.spawnInterval >= 0,
  'Invalid simulation boundaries',
);
check(
  candidate.upgradeMultipliers.length === candidate.upgradeCostFactors.length,
  'Upgrade length mismatch',
);
check(
  candidate.expansionWaves.length === 5 &&
    candidate.expansionWaves[0] === 1 &&
    candidate.expansionWaves.every(
      (/** @type {number} */ w, /** @type {number} */ i) =>
        Number.isInteger(w) &&
        w >= 1 &&
        w <= 100 &&
        (i === 0 || w > candidate.expansionWaves[i - 1]),
    ),
  'Expansion wave order',
);
for (const [id, unit] of Object.entries(candidate.units)) {
  const s = /** @type {Record<string,any>} */ (unit);
  check(
    s.hp > 0 &&
      s.damage > 0 &&
      s.cooldown > 0 &&
      s.range > 0 &&
      s.arc > 0 &&
      s.arc <= 360 &&
      s.speed > 0,
    `Invalid unit boundaries:${id}`,
  );
  check(
    ['infantry', 'armor', 'aircraft'].every((k) => s.modifiers[k] > 0),
    `Missing category interaction:${id}`,
  );
  check(candidate.costs[id] === s.cost, `Unit cost mismatch:${id}`);
}
const layouts = data['data/formation/layouts.json'];
const stages = Object.keys(layouts).sort((a, b) => Number(a) - Number(b));
for (let wave = 1; wave <= data['data/rules.json'].maxWave; wave++) {
  const stage =
    stages[candidate.expansionWaves.filter((/** @type {number} */ w) => w <= wave).length - 1];
  const available =
    wave === 1
      ? candidate.initialSupplies
      : (candidate.rewards?.[wave - 2] ??
        candidate.rewardBase + (wave - 1) * candidate.rewardPerWave);
  check(
    available >= (layouts[stage].length - 1) * candidate.costs.rifle,
    `Base formation not affordable after refunds:wave${wave}`,
  );
}
for (const [stage, cells] of Object.entries(layouts)) {
  if (cells === null) continue;
  const list = /** @type {{row:number,col:number}[]} */ (cells);
  check(list.length === Number(stage), `Formation count:${stage}`);
  check(
    new Set(list.map((c) => `${c.row},${c.col}`)).size === list.length,
    `Formation duplicates:${stage}`,
  );
  check(
    list.some((c) => c.row === 2 && c.col === 2),
    `Missing HQ:${stage}`,
  );
}
const content = data['data/waves/content.json'];
check(
  content.maxWave === 52 &&
    data['data/rules.json'].maxWave === 52 &&
    content.unlockEnemies[0].wave === 1,
  'Annual wave coverage',
);
for (const tier of content.unlockEnemies)
  for (const id of tier.ids) check(candidate.units[id], `Enemy missing:${id}`);
check(
  annual52Waves.length === 52 &&
    annual52Waves.reduce(
      (/** @type {number} */ n, /** @type {any} */ w) => n + w.spawns.length,
      0,
    ) === 1664,
  'Annual spawn coverage',
);
check(
  JSON.stringify(annualBalance.expansionWaves) === '[1,4,8,20,34]' &&
    annualBalance.enemyPowerPerWave === 0 &&
    annualBalance.rewards.length === 52 &&
    annualBalance.initialSupplies === 160,
  'Active annual balance profile',
);
check(
  annual52Waves.reduce((/** @type {number} */ n, /** @type {any} */ w) => n + w.reward, 0) ===
    79250 && annual52Waves[51]?.reward === 3300,
  'Annual rewards',
);
check(
  annual52Waves[0]?.spawns.length === 10 &&
    annual52Waves[51]?.spawns.length === 54 &&
    annual52Waves[51]?.spawns.at(-1)?.tick === 1272,
  'Annual W1/W52 signatures',
);
check(
  JSON.stringify(doctrineChoices.primary.map((/** @type {any} */ x) => x.id)) ===
    '["artillery","armor"]' &&
    JSON.stringify(doctrineChoices.secondary.map((/** @type {any} */ x) => x.id)) ===
      '["airDefense","antiArmor","fortification"]',
  'Annual doctrine choices',
);
for (const [i, weekly] of annual52Waves.entries()) {
  check(
    weekly.wave === i + 1 &&
      weekly.formationStage === (i < 3 ? '3' : i < 7 ? '5' : i < 19 ? '9' : i < 33 ? '13' : '25'),
    `Annual stage:${i + 1}`,
  );
  check(
    weekly.spawns.length > 0 &&
      new Set(weekly.spawns.map((/** @type {any} */ s) => s.id)).size === weekly.spawns.length,
    `Annual spawn identity:${i + 1}`,
  );
  check(
    weekly.spawns.every(
      (/** @type {any} */ s, /** @type {number} */ j) =>
        s.tick === j * 24 &&
        ['north', 'south', 'east', 'west'].includes(s.direction) &&
        [-1, 0, 1].includes(s.lane) &&
        /** @type {Record<string,any>} */ (candidate.units)[s.unitId],
    ),
    `Annual spawn content:${i + 1}`,
  );
}
finish('schemas');
