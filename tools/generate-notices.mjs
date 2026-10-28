import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const seen = new Set();
/** @type {string[]} */
const notices = [];
/** @param {string} packagePath */
async function collect(packagePath) {
  const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) return;
  seen.add(key);
  const files = (await fs.readdir(path.dirname(packagePath)))
    .filter((name) => /^licen[cs]e(?:\.|$)/i.test(name))
    .sort();
  if (!files.length) throw new Error(`MISSING_LICENSE:${key}`);
  const text = await Promise.all(
    files.map((name) => fs.readFile(path.join(path.dirname(packagePath), name), 'utf8')),
  );
  notices.push(`${key}\n${text.join('\n')}`);
  const resolve = createRequire(packagePath);
  for (const name of Object.keys(pkg.dependencies ?? {}).sort())
    await collect(resolve.resolve(`${name}/package.json`));
}
const root = JSON.parse(await fs.readFile('package.json', 'utf8'));
const resolve = createRequire(path.resolve('package.json'));
for (const name of Object.keys(root.dependencies).sort())
  await collect(resolve.resolve(`${name}/package.json`));
await fs.mkdir('public/licenses', { recursive: true });
await fs.writeFile(
  'public/licenses/THIRD_PARTY_NOTICES.txt',
  'Runtime npm dependencies\n\n' + notices.sort().join('\n\n--------------------\n\n'),
);
console.log(`Runtime dependency notices: ${seen.size} packages`);
