/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-unresolved', severity: 'error', from: {}, to: { couldNotResolve: true } },
    {
      name: 'phaser-only-in-presentation',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(adapters/phaser|bootstrap)/' },
      to: { path: '(^|/)node_modules/phaser/' },
    },
    {
      name: 'domain-inward-only',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { pathNot: '^(src/domain/|data/)' },
    },
    {
      name: 'infrastructure-inward-only',
      severity: 'error',
      from: { path: '^src/infrastructure/' },
      to: { path: '^src/(application|adapters|bootstrap)/' },
    },
    {
      name: 'application-no-views',
      severity: 'error',
      from: { path: '^src/application/' },
      to: { path: '^src/(adapters|bootstrap)/|(^|/)node_modules/phaser/' },
    },
    {
      name: 'ui-no-phaser',
      severity: 'error',
      from: { path: '^src/adapters/ui/' },
      to: { path: '^src/(bootstrap|adapters/phaser)/|(^|/)node_modules/phaser/' },
    },
    {
      name: 'phaser-no-dom-view',
      severity: 'error',
      from: { path: '^src/adapters/phaser/' },
      to: { path: '^src/(bootstrap|adapters/ui)/' },
    },
    {
      name: 'assets-data-only',
      severity: 'error',
      from: { path: '^src/adapters/assets/' },
      to: { pathNot: '^(data/assets/|src/adapters/assets/)' },
    },
    {
      name: 'bootstrap-is-entry',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/bootstrap/' },
      to: { path: '^src/bootstrap/' },
    },
    {
      name: 'renderer-no-tools-or-desktop-code',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^(tools/|desktop/.*[.](?:cjs|js)$)|^node:' },
    },
    {
      name: 'desktop-no-renderer',
      severity: 'error',
      from: { path: '^desktop/' },
      to: { path: '^src/' },
    },
    {
      name: 'verification-no-game-execution',
      severity: 'error',
      from: { path: '^tools/verification/' },
      to: { path: '^src/', pathNot: '^src/infrastructure/ValidateTechGraph[.]js$' },
    },
  ],
  options: { doNotFollow: { path: 'node_modules' }, tsPreCompilationDeps: true },
};
