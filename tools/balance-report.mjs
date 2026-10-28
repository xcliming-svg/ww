import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const file = process.argv[2]; if (!file) throw new Error('REPORT_PATH_REQUIRED');
const report = JSON.parse(await fs.readFile(file, 'utf8'));
if (report.status !== 'complete') throw new Error('REPORT_INCOMPLETE');
/** @param {number[]} values */
function entropy(values) { const total = values.reduce((a, b) => a + b, 0); return total ? -values.filter(n => n > 0).reduce((sum, n) => sum + n / total * Math.log2(n / total), 0) : 0; }
const accountingErrors = report.rows.filter((/** @type {{income:number,spent:number,balance:number,grossSpent?:number,refunded?:number}} */ r) => r.income - r.spent !== r.balance || r.grossSpent !== undefined && (r.grossSpent - (r.refunded ?? 0) !== r.spent)).length;
const policies = report.summary.map((/** @type {any} */ s) => {
  const rows = report.rows.filter((/** @type {{policy:string}} */ r) => r.policy === s.policy);
  /** @type {Record<string,number>} */ const counts = {};
  for (const row of rows) for (const [unit, count] of Object.entries(row.unitCounts)) counts[unit] = (counts[unit] ?? 0) + Number(count);
  return { ...s, compositionEntropy: entropy(Object.values(counts)), unitCounts: counts,
    refundedTotal: rows.reduce((/** @type {number} */ sum, /** @type {{refunded?:number}} */ r) => sum + (r.refunded ?? 0), 0),
    economyByDecile: Array.from({ length: 10 }, (_, i) => {
      const balances = rows.flatMap((/** @type {{deciles:number[]}} */ r) => r.deciles[i] === undefined ? [] : [r.deciles[i]]);
      return { wave: (i + 1) * 10, n: balances.length, minimum: balances.length ? Math.min(...balances) : null, maximum: balances.length ? Math.max(...balances) : null, mean: balances.length ? balances.reduce((/** @type {number} */ a, /** @type {number} */ b) => a + b, 0) / balances.length : null };
    }),
    finalBalanceMean: rows.reduce((/** @type {number} */ sum, /** @type {{balance:number}} */ r) => sum + r.balance, 0) / rows.length };
});
const pairSummary = ['same-roster-position-swap', 'same-position-without-upgrades'].map(kind => {
  const rows = report.pairs.filter((/** @type {{kind:string}} */ r) => r.kind === kind);
  return { kind, n: rows.length, outcomeDifferences: rows.filter((/** @type {{baseline:string,variant:string}} */ r) => r.baseline !== r.variant).length,
    hqDifferences: rows.filter((/** @type {{hqDelta:number}} */ r) => r.hqDelta !== 0).length,
    averageHqDelta: rows.reduce((/** @type {number} */ total, /** @type {{hqDelta:number}} */ r) => total + r.hqDelta, 0) / (rows.length || 1) };
});
const criteria = JSON.parse(await fs.readFile('data/simulation/criteria.json', 'utf8'));
const invalidPairs = report.pairs.filter((/** @type {{baseline:string|null,variant:string|null}} */ p) => !['victory', 'defeat'].includes(p.baseline ?? '') || !['victory', 'defeat'].includes(p.variant ?? '')).length;
const checks = [
  { id: 'sample-size', pass: policies.every((/** @type {any} */ p) => p.n >= criteria.minimumSeeds) },
  ...Object.entries(criteria.completionRate).map(([policy, rate]) => ({ id: `completion-${policy}`, pass: policies.some((/** @type {any} */ p) => p.policy === policy && p.completionRate >= Number(rate)) })),
  { id: 'wrong-formation', pass: policies.some((/** @type {any} */ p) => p.policy === 'wrong' && p.completionRate <= criteria.wrongMaximumRate) },
  { id: 'invalid-results', pass: policies.every((/** @type {any} */ p) => p.invalid <= criteria.maximumInvalid) },
  { id: 'invalid-paired-results', pass: invalidPairs <= criteria.maximumInvalid },
  { id: 'accounting', pass: accountingErrors <= criteria.maximumAccountingErrors },
  { id: 'nonnegative-balance', pass: policies.every((/** @type {any} */ p) => p.minimumBalance >= 0) },
  { id: 'position-effect', pass: pairSummary[0].hqDifferences >= criteria.minimumPositionDifferences },
  { id: 'upgrade-effect', pass: pairSummary[1].hqDifferences >= criteria.minimumUpgradeDifferences }
];
const respec = policies.find((/** @type {any} */ p) => p.policy === 'respec');
if (respec) checks.push({ id: 'refund-policy-exercised', pass: respec.refundedTotal > 0 });
const result = { source: file, configHash: report.configHash, engineHash: report.engineHash, policyHash: report.policyHash, contentHash: report.contentHash, accountingErrors, policies, pairSummary,
  invalidPairs, criteria, checks, calibrationPassed: checks.every(c => c.pass),
  limits: ['Automated first-attempt policies, not human play', 'No browser/performance validation', 'Numerical targets are engineering interpretations of the user difficulty choice', 'Unit selection entropy is not proof of strategic diversity', 'Damage by unit is credited from applied damage after simultaneous overkill attribution'] };
const target = file.replace(/\.json$/, '-analysis.json');
await fs.writeFile(target, JSON.stringify(result, null, 2));
await fs.writeFile(target.replace(/\.json$/, '.md'), `# ${report.candidate} 정량 분석\n\n정책별 독립 seed ${report.samples}개. 회계 불일치 ${accountingErrors}건. 아래는 첫 시도 계산 결과이며 실제 재미/브라우저/실기 검증이 아니다.\n\n| 정책 | N | 100 완주 | 평균 도달 | 편성 엔트로피 | 평균 최종 잔액 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n` + policies.map((/** @type {any} */ p) => `| ${p.policy} | ${p.n} | ${p.cleared} | ${p.averageReached.toFixed(2)} | ${p.compositionEntropy.toFixed(3)} | ${p.finalBalanceMean.toFixed(1)} |`).join('\n') + '\n\n' + pairSummary.map(p => `${p.kind}: N=${p.n}, 승패 차이 ${p.outcomeDifferences}, HQ 차이 ${p.hqDifferences}, 평균 HQ 차이 ${p.averageHqDelta.toFixed(2)}.`).join('\n\n') + '\n\n측정 기준: ' + criteria.source + '. 숫자 임계치는 사용자 난이도 선택의 내부 해석이다.\n\n' + checks.map(c => `- [${c.pass ? 'x' : ' '}] ${c.id}`).join('\n') + '\n\n엔트로피는 전략 다양성/체감 재미를 증명하지 않는다.\n');
if (process.argv.includes('--snapshot')) {
  /** @param {string} dir @returns {Promise<string[]>} */
  async function walk(dir) { return (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : Promise.resolve([`${dir}/${e.name}`])))).flat().sort(); }
  const engineFiles = await walk('src/domain'); const digest = createHash('sha256');
  for (const p of engineFiles) digest.update(p).update(await fs.readFile(p));
  const balanceText = await fs.readFile(`data/balance/${report.candidate}.json`, 'utf8');
  const v13 = !!JSON.parse(balanceText).gradeModel;
  const displayPath = 'data/visual/unit-display.json';
  const displayText = v13 ? await fs.readFile(displayPath, 'utf8') : null;
  const candidateHash = createHash('sha256').update(balanceText)
    .update(displayText === null ? '' : '\n'+displayPath+'\n'+displayText).digest('hex');
  if (digest.digest('hex') !== report.engineHash ||
    createHash('sha256').update(await fs.readFile('tools/balance-policy.mjs')).update(await fs.readFile('data/simulation/policy-profiles.json')).digest('hex') !== report.policyHash ||
    candidateHash !== report.configHash ||
    createHash('sha256').update(await fs.readFile('data/waves/content.json')).digest('hex') !== report.contentHash) throw new Error('SOURCE_CHANGED');
  const names = [...engineFiles, 'tools/balance-policy.mjs', 'tools/balance-sim.mjs', 'tools/balance-report.mjs',
    'data/simulation/criteria.json', 'data/simulation/policy-profiles.json', `data/balance/${report.candidate}.json`,
    'data/waves/content.json', 'data/tech/nodes.json', 'data/rules.json', 'data/formation/layouts.json',
    ...(v13 ? [displayPath] : [])];
  const snapshot = Object.fromEntries(await Promise.all(names.map(async p => [p, await fs.readFile(p, 'utf8')])));
  await fs.writeFile(path.join(path.dirname(file), `${path.basename(file, '.json')}-source.json`), JSON.stringify({ engineHash: report.engineHash, policyHash: report.policyHash, files: snapshot }, null, 2));
}
console.log(JSON.stringify({ target, calibrationPassed: result.calibrationPassed, checks, accountingErrors, pairSummary, clears: policies.map((/** @type {any} */ p) => ({ policy: p.policy, n: p.n, cleared: p.cleared })) }, null, 2));
