import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'release/**',
      'node_modules/**',
      'src/infrastructure/schema-validators.js',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
    languageOptions: { ecmaVersion: 'latest', globals: globals.es2022 },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-empty': 'error',
      'no-duplicate-imports': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-func-assign': 'error',
      'valid-typeof': 'error',
      'constructor-super': 'error',
      'no-unsafe-finally': 'error',
      'no-loss-of-precision': 'error',
    },
  },
  {
    files: ['src/domain/**/*.js'],
    languageOptions: { globals: { structuredClone: 'readonly' } },
    rules: {
      'no-restricted-globals': [
        'error',
        'Date',
        'window',
        'document',
        'Phaser',
        'performance',
        'setTimeout',
        'setInterval',
        'requestAnimationFrame',
        'fetch',
        'crypto',
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the explicit deterministic RNG state.',
        },
      ],
    },
  },
  {
    files: [
      'src/application/**/*.js',
      'src/infrastructure/**/*.js',
      'src/adapters/**/*.js',
      'src/bootstrap/**/*.js',
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/application/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', 'document', 'window', 'Phaser', 'HTMLElement', 'Element'],
    },
  },
  {
    files: ['tools/**/*.mjs', 'desktop/**/*.cjs', '*.js', '*.cjs'],
    languageOptions: { globals: globals.node },
  },
];
