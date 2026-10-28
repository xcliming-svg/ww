import fs from 'node:fs/promises';
import { check, finish, data, files } from './context.mjs';
const manifest = data['locales/manifest.json'];
const base = data[`locales/${manifest.fallbackLocale}.json`];
const used = new Set();
/** @param {unknown} value @param {string} [key] */
function collect(value, key = '') {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, key);
  } else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) collect(v, k);
  else if (
    typeof value === 'string' &&
    ((key.endsWith('Key') && !['costKey', 'baseStatKey', 'fpsKey', 'paletteKey'].includes(key)) ||
      value.startsWith('tutorial.'))
  )
    used.add(value);
}
for (const [p, value] of Object.entries(data)) if (!p.startsWith('locales/')) collect(value);
for (const file of files.filter((p) => p.startsWith('src/'))) {
  const source = await fs.readFile(file, 'utf8');
  for (const m of source.matchAll(/\b(?:t|failure)\(\s*['"]([^'"]+)['"]/g))
    used.add(m[0].startsWith('failure') ? `error.${m[1]}` : m[1]);
  for (const m of source.matchAll(
    /['"]((?:error|hud|battle|menu|ui|outcome|tutorial)\.[A-Za-z0-9_.-]+)['"]/g,
  ))
    used.add(m[1]);
  for (const m of source.matchAll(
    /`((?:kind|status|tech|tree|battle|settings|locale|outcome|unit\.short)\.)\$\{/g,
  ))
    for (const key of Object.keys(base)) if (key.startsWith(m[1])) used.add(key);
}
for (const key of used) check(typeof base[key] === 'string', `Missing locale: ${key}`);
for (const locale of manifest.supportedLocales) {
  const dict = data[`locales/${locale}.json`];
  check(dict, `Unregistered locale:${locale}`);
  if (!dict) continue;
  for (const key of Object.keys(base)) {
    check(typeof dict[key] === 'string', `Missing ${locale}:${key}`);
    check(!/\?{2,}|\ufffd/.test(dict[key] ?? ''), `Corrupted locale encoding:${locale}:${key}`);
    check(
      JSON.stringify((base[key].match(/\{\w+\}/g) ?? []).sort()) ===
        JSON.stringify((dict[key]?.match(/\{\w+\}/g) ?? []).sort()),
      `Placeholder mismatch:${locale}:${key}`,
    );
  }
}
const unused = Object.keys(base).filter((k) => !used.has(k));
check(unused.length === 0, `Unused locale keys: ${unused.join(', ')}`);
finish('locales');
