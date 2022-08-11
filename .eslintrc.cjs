module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: { version: 'detect' }
  },
  env: { browser: true },
  ignorePatterns: ['*.glsl', '*.css'],
  rules: {
    // My practice is to use "log" for messages I intend to clean up before merging.
    // All these others reflect the intension that they should be left in the codebase.
    'no-console': [
      2,
      { allow: ['warn', 'error', 'info', 'groupCollapsed', 'groupEnd'] }
    ],
    'no-underscore-dangle': [0],
    '@typescript-eslint/no-empty-function': [0],
    // Non-alphabetical groupings can make more sense.
    'react/sort-comp': [0],
    // Makes punctuation after tab awkward.
    'react/jsx-one-expression-per-line': [0],
    // TODO: Re-enable: https://github.com/hubmapconsortium/vitessce/issues/144
    'react/prop-types': [0],
    // Hit eslint error: SyntaxError: Unexpected token, expected {
    'react/jsx-curly-newline': [0],
    'prefer-template': 'off',
    'class-methods-use-this': 'off',
    semi: [2, 'always'],
    'no-cond-assign': [2, 'except-parens'],
    'no-restricted-syntax': [0],
    'no-await-in-loop': [0],
    'no-bitwise': [0],
    'no-trailing-spaces': [2]
  }
};
