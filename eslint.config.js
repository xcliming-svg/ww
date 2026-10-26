import globals from 'globals';
export default [{ ignores: ['dist/**', 'release/**', 'node_modules/**', 'src/infrastructure/schema-validators.js'] }, {
  files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
  languageOptions: { ecmaVersion: 'latest', globals: { ...globals.browser, ...globals.node } },
  rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], 'no-undef': 'error',
    'no-unreachable': 'error', 'no-constant-condition': 'error', 'eqeqeq': 'error',
    'no-eval': 'error', 'no-empty': 'error', 'no-duplicate-imports': 'error' }
}];
