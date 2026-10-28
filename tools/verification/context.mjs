import fs from 'node:fs/promises';
/** @param {string} file @returns {Promise<any>} */
export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
/** @param {string} dir @returns {Promise<string[]>} */
export async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]))).flat().sort();
}
export const sourceFiles = [...await walk('src'), ...await walk('tools'), ...await walk('desktop'),
  'eslint.config.js', 'vite.config.js'].filter(file => /\.(?:js|mjs|cjs)$/.test(file));
export const files = sourceFiles.filter(file => !file.endsWith('schema-validators.js'));
export const registry = /** @type {string[]} */ (await readJson('data/schemas/registry.json'));
export const data = Object.fromEntries(await Promise.all(registry.map(async file => [file, await readJson(file)])));
/** @type {string[]} */
export const errors = [];
/** @param {unknown} condition @param {string} message */
export function check(condition, message) { if (!condition) errors.push(message); }
/** @param {string} name */
export function finish(name) {
  if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1; }
  else console.log(`PASS ${name}: static inspection only`);
}
