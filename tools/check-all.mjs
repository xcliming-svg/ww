import { spawnSync } from 'node:child_process';
const commands = [ ['node_modules/eslint/bin/eslint.js', 'src', 'tools', 'desktop', 'eslint.config.js', 'vite.config.js'], ['node_modules/typescript/bin/tsc', '-p', 'jsconfig.json'], ...['syntax', 'schemas', 'graph', 'locales', 'assets', 'deps', 'package'].map(name => ['tools/check.mjs', name]) ];
for (const args of commands) { const result = spawnSync(process.execPath, args, { stdio: 'inherit' }); if (result.status !== 0) process.exit(result.status ?? 1); }
console.log('PASS: all static checks. No browser, gameplay, packaging, or performance run.');
