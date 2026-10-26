import fs from 'node:fs/promises';
const [input, output, selection] = process.argv.slice(2);
if (!input || !output?.endsWith('.json') || input === output || !selection) throw new Error('INPUT_OUTPUT_POLICIES_REQUIRED');
const report = JSON.parse(await fs.readFile(input, 'utf8')); const policies = selection.split(',');
if (new Set(policies).size !== policies.length || policies.some(p => !report.policies.includes(p))) throw new Error('INVALID_POLICIES');
const rows = report.rows.filter((/** @type {{policy:string}} */ r) => policies.includes(r.policy));
const summary = report.summary.filter((/** @type {{policy:string}} */ r) => policies.includes(r.policy));
for (const policy of policies) {
  const selected = rows.filter((/** @type {{policy:string}} */ r) => r.policy === policy);
  if (selected.length !== report.samples || new Set(selected.map((/** @type {{seed:number}} */ r) => r.seed)).size !== report.samples || selected.some((/** @type {{seed:number}} */ r) => r.seed < report.offset || r.seed >= report.offset + report.samples)) throw new Error('INCOMPLETE_POLICY');
}
const result = { ...report, status: 'complete', inputs: [input], policies, rows, summary, pairs: policies.includes('recon') ? report.pairs : [] };
await fs.writeFile(output, JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, policies, campaigns: rows.length }));
