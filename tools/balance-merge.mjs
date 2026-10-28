import fs from 'node:fs/promises';
const [output, ...inputs] = process.argv.slice(2);
if (!output?.endsWith('.json') || inputs.length < 2 || inputs.includes(output))
  throw new Error('OUTPUT_AND_REPORTS_REQUIRED');
const reports = await Promise.all(
  inputs.map(async (p) => JSON.parse(await fs.readFile(p, 'utf8'))),
);
const base = reports[0];
const keys = [
  'candidate',
  'configHash',
  'engineHash',
  'policyHash',
  'contentHash',
  'configVersion',
  'contentVersion',
  'policyVersion',
  'samples',
  'offset',
];
for (const report of reports)
  if (
    report.status !== 'complete' ||
    keys.some((key) => report[key] !== base[key]) ||
    JSON.stringify(report.options) !== JSON.stringify(base.options)
  )
    throw new Error('INCOMPATIBLE_REPORTS');
const policies = reports.flatMap((r) => r.policies);
if (new Set(policies).size !== policies.length) throw new Error('DUPLICATE_POLICY');
const rows = reports.flatMap((r) => r.rows);
for (const policy of policies) {
  const selected = rows.filter((r) => r.policy === policy);
  if (
    selected.length !== base.samples ||
    new Set(selected.map((r) => r.seed)).size !== base.samples ||
    selected.some((r) => r.seed < base.offset || r.seed >= base.offset + base.samples)
  )
    throw new Error('SEED_COVERAGE');
}
const result = {
  ...base,
  policies,
  inputs,
  summary: reports.flatMap((r) => r.summary),
  pairs: reports.flatMap((r) => r.pairs),
  rows,
};
// Each source report remains unchanged. Refuse to overwrite an existing merged artifact.
await fs.writeFile(output, JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, policies, campaigns: rows.length, status: result.status }));
