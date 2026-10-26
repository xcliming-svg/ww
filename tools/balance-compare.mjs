import fs from 'node:fs/promises';
const [beforePath, afterPath] = process.argv.slice(2); if (!beforePath || !afterPath) throw new Error('BEFORE_AFTER_PATHS_REQUIRED');
const before = JSON.parse(await fs.readFile(beforePath, 'utf8')), after = JSON.parse(await fs.readFile(afterPath, 'utf8'));
const paired = before.offset === after.offset && before.samples === after.samples && before.engineHash === after.engineHash && before.policyHash === after.policyHash && !!before.engineHash;
const rows = after.summary.map((/** @type {any} */ current) => {
  const previous = before.summary.find((/** @type {any} */ p) => p.policy === current.policy);
  return { policy: current.policy, beforeN: previous?.n ?? 0, afterN: current.n, clearRateChange: previous ? current.completionRate - previous.completionRate : null, meanReachedChange: previous ? current.averageReached - previous.averageReached : null };
});
console.log(JSON.stringify({ before: beforePath, after: afterPath, paired, note: paired ? 'Same seeds and policy/engine; candidate/content may differ.' : 'Descriptive comparison only: sample/source differs or is unrecorded.', rows }, null, 2));
