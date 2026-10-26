import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import Ajv from 'ajv';
import { validateTechGraph } from '../src/domain/tech/TechGraph.js';
/** @param {string} file */ const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : Promise.resolve([`${dir}/${e.name}`]))); return nested.flat();
}
const sourceFiles = [...await walk('src'), ...await walk('tools'), ...await walk('desktop'), 'eslint.config.js', 'vite.config.js'].filter(p => /\.(?:js|mjs|cjs)$/.test(p));
const files = sourceFiles.filter(p => !p.endsWith('schema-validators.js'));
const mode = process.argv[2]; /** @type {string[]} */ const errors = [];
/** @param {unknown} condition @param {string} message */ const check = (condition, message) => { if (!condition) errors.push(message); };
const registry = /** @type {string[]} */ (await read('data/schemas/registry.json'));
const data = Object.fromEntries(await Promise.all(registry.map(async p => [p, await read(p)])));
if (mode === 'syntax') {
  for (const file of sourceFiles) { const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); check(result.status === 0, `${file}: ${result.stderr}`); }
}
if (mode === 'schemas') {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(await read('data/schemas/content.schema.json')); check(validate(data), JSON.stringify(validate.errors));
  ajv.compile(await read('data/schemas/save.schema.json'));
  ajv.compile(await read('data/schemas/save-v1.schema.json'));
  const allData = [...await walk('data'), ...await walk('locales')].filter(p => p.endsWith('.json') && !p.includes('/schemas/'));
  for (const p of allData) check(registry.includes(p), `Unregistered JSON: ${p}`);
  const candidate = data[`data/balance/${data['data/balance/active.json'].candidate}.json`];
  if (candidate.rewards) check(candidate.rewards.length === 100 && candidate.rewards.every((/** @type {number} */ r) => Number.isSafeInteger(r) && r >= 0), 'Reward coverage/range');
  check(candidate.fixedStepSeconds > 0 && candidate.maxTicks > 0 && candidate.spawnInterval >= 0, 'Invalid simulation boundaries');
  check(candidate.upgradeMultipliers.length === candidate.upgradeCostFactors.length, 'Upgrade length mismatch');
  check(candidate.expansionWaves.length === 5 && candidate.expansionWaves[0] === 1 && candidate.expansionWaves.every((/** @type {number} */ w, /** @type {number} */ i) => Number.isInteger(w) && w >= 1 && w <= 100 && (i === 0 || w > candidate.expansionWaves[i - 1])), 'Expansion wave order');
  for (const [id, unit] of Object.entries(candidate.units)) {
    const s = /** @type {Record<string,any>} */ (unit);
    check(s.hp > 0 && s.damage > 0 && s.cooldown > 0 && s.range > 0 && s.arc > 0 && s.arc <= 360 && s.speed > 0, `Invalid unit boundaries:${id}`);
    check(['infantry', 'armor', 'aircraft'].every(k => s.modifiers[k] > 0), `Missing category interaction:${id}`);
    check(candidate.costs[id] === s.cost, `Unit cost mismatch:${id}`);
  }
  const layouts = data['data/formation/layouts.json'];
  const stages = Object.keys(layouts).sort((a, b) => Number(a) - Number(b));
  for (let wave = 1; wave <= data['data/rules.json'].maxWave; wave++) {
    const stage = stages[candidate.expansionWaves.filter((/** @type {number} */ w) => w <= wave).length - 1];
    const available = wave === 1 ? candidate.initialSupplies : candidate.rewards?.[wave - 2] ?? candidate.rewardBase + (wave - 1) * candidate.rewardPerWave;
    check(available >= (layouts[stage].length - 1) * candidate.costs.rifle, `Base formation not affordable after refunds:wave${wave}`);
  }
  for (const [stage, cells] of Object.entries(layouts)) {
    if (cells === null) continue; const list = /** @type {{row:number,col:number}[]} */ (cells);
    check(list.length === Number(stage), `Formation count:${stage}`); check(new Set(list.map(c => `${c.row},${c.col}`)).size === list.length, `Formation duplicates:${stage}`);
    check(list.some(c => c.row === 2 && c.col === 2), `Missing HQ:${stage}`);
  }
  const content = data['data/waves/content.json']; check(content.maxWave === 100 && content.unlockEnemies[0].wave === 1, 'Wave coverage');
  for (const tier of content.unlockEnemies) for (const id of tier.ids) check(candidate.units[id], `Enemy missing:${id}`);
}
if (mode === 'graph') {
  const nodes = /** @type {import('../src/domain/model/contracts.js').TechNode[]} */ (data['data/tech/nodes.json']); errors.push(...validateTechGraph(nodes));
  check(nodes.length === 28 && nodes.filter(n => n.kind === 'research').length === 12 && nodes.filter(n => n.kind === 'unit').length === 12, '28/12/12 tree counts');
  const stats = data[`data/balance/${data['data/balance/active.json'].candidate}.json`].units;
  for (const p of data['data/tech/progression.json']) {
    check(stats[p.from] && stats[p.to], `Missing progression unit:${p.to}`);
    check(stats[p.to].damage * stats[p.to].modifiers[p.focus] / stats[p.to].cooldown > stats[p.from].damage * stats[p.from].modifiers[p.focus] / stats[p.from].cooldown || stats[p.to].hp > stats[p.from].hp || stats[p.to].range > stats[p.from].range, `No progression benefit:${p.to}`);
  }
  for (const n of nodes.filter(n => n.kind === 'research' && n.parentIds.some(id => nodes.find(p => p.id === id)?.kind === 'research'))) {
    check(data['data/tech/progression.json'].some((/** @type {{to:string}} */ p) => p.to === n.unlocksUnitId), `No progression contract:${n.id}`);
  }
}
if (mode === 'locales') {
  const manifest = data['locales/manifest.json']; const base = data[`locales/${manifest.fallbackLocale}.json`]; const used = new Set();
  /** @param {unknown} value @param {string} [key] */
  function collect(value, key = '') {
    if (Array.isArray(value)) { for (const item of value) collect(item, key); }
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) collect(v, k);
    else if (typeof value === 'string' && (key.endsWith('Key') && !['costKey', 'baseStatKey', 'fpsKey', 'paletteKey'].includes(key) || value.startsWith('tutorial.'))) used.add(value);
  }
  for (const [p, value] of Object.entries(data)) if (!p.startsWith('locales/')) collect(value);
  for (const file of files.filter(p => p.startsWith('src/'))) {
    const source = await fs.readFile(file, 'utf8');
    for (const m of source.matchAll(/\b(?:t|failure)\(\s*['"]([^'"]+)['"]/g)) used.add(m[0].startsWith('failure') ? `error.${m[1]}` : m[1]);
    for (const m of source.matchAll(/['"]((?:error|hud|battle|menu|ui|outcome|tutorial)\.[A-Za-z0-9_.-]+)['"]/g)) used.add(m[1]);
    for (const m of source.matchAll(/`((?:kind|status|tech|tree|battle|settings|locale|outcome|unit\.short)\.)\$\{/g)) for (const key of Object.keys(base)) if (key.startsWith(m[1])) used.add(key);
  }
  for (const key of used) check(typeof base[key] === 'string', `Missing locale: ${key}`);
  for (const locale of manifest.supportedLocales) {
    const dict = data[`locales/${locale}.json`]; check(dict, `Unregistered locale:${locale}`); if (!dict) continue;
    for (const key of Object.keys(base)) {
      check(typeof dict[key] === 'string', `Missing ${locale}:${key}`);
      check(!/\?{2,}|\ufffd/.test(dict[key] ?? ''), `Corrupted locale encoding:${locale}:${key}`);
      check(JSON.stringify((base[key].match(/\{\w+\}/g) ?? []).sort()) === JSON.stringify((dict[key]?.match(/\{\w+\}/g) ?? []).sort()), `Placeholder mismatch:${locale}:${key}`);
    }
  }
  const unused = Object.keys(base).filter(k => !used.has(k));
  check(unused.length === 0, `Unused locale keys: ${unused.join(', ')}`);
}
if (mode === 'assets') {
  const slots = data['data/assets/slots.json']; const ids = new Set(slots.map((/** @type {{assetId:string}} */ s) => s.assetId)); check(ids.size === slots.length, 'Duplicate asset IDs');
  for (const n of data['data/tech/nodes.json']) check(ids.has(n.assetId), `Missing tech slot:${n.id}`);
  for (const unit of data['data/units/templates.json']) for (const side of ['unit', 'enemy']) for (const frame of ['idle', 'attack', 'hit', 'death']) check(ids.has(`${side}.${unit.id}.${frame}`), `Missing animation slot:${side}.${unit.id}.${frame}`);
  for (const slot of slots) {
    if (slot.relativePath) { check(!slot.relativePath.includes('..') && !/^https?:|^[\\/]/.test(slot.relativePath), `Unsafe path:${slot.assetId}`); try { await fs.access(`public/${slot.relativePath}`); } catch { check(false, `Missing asset:${slot.relativePath}`); } }
    else check(slot.fallbackKind, `Missing fallback:${slot.assetId}`);
    check(data['data/assets/licenses.json'].items.some((/** @type {{id:string}} */ item) => item.id === slot.attributionId), `Missing attribution:${slot.assetId}`);
  }
  for (const item of data['data/assets/licenses.json'].items) for (const entry of item.files) check(createHash('sha256').update(await fs.readFile(entry.path)).digest('hex') === entry.sha256, `Asset hash mismatch:${entry.path}`);
  const font = await fs.readFile('public/assets/fonts/NotoSansKR-variable.ttf'); check(font.readUInt32BE(0) === 65536 || font.toString('ascii', 0, 4) === 'OTTO', 'Invalid font signature');
  check((await fs.readFile('public/assets/fonts/OFL.txt', 'utf8')).includes('SIL OPEN FONT LICENSE Version 1.1'), 'Missing OFL');
}
if (mode === 'deps') {
  /** @type {Map<string,string[]>} */ const edges = new Map();
  for (const file of files) {
    const source = await fs.readFile(file, 'utf8'); const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    /** @type {string[]} */
    const imports = [];
    /** @param {import('typescript').Node} node */ function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (file.startsWith('src/domain/') && ts.isIdentifier(node) && ['window', 'document', 'Phaser', 'setTimeout', 'requestAnimationFrame'].includes(node.text)) check(false, `Domain platform reference:${file}:${node.text}`);
      if (file.startsWith('src/domain/') && ts.isPropertyAccessExpression(node) && ['Math.random', 'Date.now'].includes(node.getText(ast))) check(false, `Nondeterministic domain reference:${file}`);
      ts.forEachChild(node, visit);
    } visit(ast);
    const paths = imports.filter(p => p.startsWith('.')).map(p => path.posix.normalize(path.posix.join(path.posix.dirname(file), p)));
    for (const p of paths) try { await fs.access(p); } catch { check(false, `Missing import:${file} -> ${p}`); }
    edges.set(file, paths.filter(p => /\.(?:js|mjs|cjs)$/.test(p)));
    if (file.startsWith('src/domain/')) check(imports.every(p => p.startsWith('.') && !/(adapters|application|infrastructure)/.test(p)), `Domain layer violation:${file}`);
  }
  const seen = new Set(), active = new Set();
  /** @param {string} file */ function visit(file) { if (active.has(file)) { check(false, `Dependency cycle:${file}`); return; } if (seen.has(file)) return; active.add(file); for (const child of edges.get(file) ?? []) visit(child); active.delete(file); seen.add(file); }
  for (const file of files) visit(file);
}
if (mode === 'package') {
  const pkg = await read('package.json'), lock = await read('package-lock.json');
  check(pkg.dependencies.phaser === '4.2.1', 'Phaser version'); check(lock.packages[''].dependencies.phaser === pkg.dependencies.phaser, 'Lockfile dependency mismatch');
  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) check(/^\d+\.\d+\.\d+$/.test(String(version)), `Unpinned dependency:${version}`);
  const desktop = await fs.readFile('desktop/main.cjs', 'utf8');
  for (const expression of ['contextIsolation: true', 'nodeIntegration: false', 'sandbox: true', 'assertSender', 'will-navigate', 'setWindowOpenHandler']) check(desktop.includes(expression), `Missing desktop guard:${expression}`);
  for (const file of files.filter(p => p.startsWith('src/'))) {
    const text = await fs.readFile(file, 'utf8'); check(!/(?:fetch\(|from\s*|import\()['"]https?:\/\//.test(text), `Runtime remote dependency:${file}`); check(!/steamworks|greenworks|steam-cloud/i.test(text), `Forbidden service:${file}`);
  }
  const builder = data['desktop/builder.json']; check(builder.asar && builder.files.includes('dist/**/*') && builder.extraResources.some((/** @type {{from:string}} */ r) => r.from.endsWith('OFL.txt')), 'Package content/license contract');
  check((await fs.readFile('index.html', 'utf8')).includes('Content-Security-Policy'), 'Missing CSP');
  const notices = await fs.readFile('public/licenses/THIRD_PARTY_NOTICES.txt', 'utf8');
  for (const [name, version] of Object.entries(pkg.dependencies)) check(notices.includes(`${name}@${version}`), `Missing runtime notice:${name}`);
  check(builder.extraResources.some((/** @type {{from:string}} */ r) => r.from === 'public/licenses/THIRD_PARTY_NOTICES.txt'), 'Missing bundled runtime notices');
}
if (!['syntax', 'schemas', 'graph', 'locales', 'assets', 'deps', 'package'].includes(mode)) throw new Error('UNKNOWN_CHECK');
if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1; }
else console.log(`PASS ${mode}: static inspection only`);
