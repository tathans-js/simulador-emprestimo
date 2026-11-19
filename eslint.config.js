'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    rules: {
      complexity: ['warn', 8],
      'max-lines-per-function': ['warn', 40],
      'max-depth': ['warn', 3],
      'no-magic-numbers': ['warn', { ignore: [0, 1, -1], ignoreArrayIndexes: true, enforceConst: true }],
      eqeqeq: 'error',
    },
  },
];
