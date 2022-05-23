module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  plugins: ["react"],
  settings: {
    'react': { version: 'detect' },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.jsx']
      }
    }
  },
  rules: {
    // My practice is to use "log" for messages I intend to clean up before merging.
    // All these others reflect the intension that they should be left in the codebase.
    'no-console': [2, { 'allow': ['warn', 'error', 'info', 'groupCollapsed', 'groupEnd'] }],
    // Non-alphabetical groupings can make more sense.
    'react/sort-comp': [0],
    // Makes punctuation after tab awkward.
    'react/jsx-one-expression-per-line': [0],
    // TODO: Re-enable: https://github.com/hubmapconsortium/vitessce/issues/144
    'react/prop-types': [0],
    // Hit eslint error: SyntaxError: Unexpected token, expected {
    'import/prefer-default-export': [0],
    'react/jsx-curly-newline': [0],
    // For some locations, just having a dev dependency is sufficient.
    'import/no-extraneous-dependencies': [2, { 'devDependencies': ['tests/**/*.js'] }],
    'no-underscore-dangle': [0],
    // https://github.com/benmosher/eslint-plugin-import/issues/1615#issuecomment-577500405
    'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'never', jsx: 'never' }],
  }
}
