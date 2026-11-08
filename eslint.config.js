const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['src/build.js', 'src/data.js', 'src/illustrations.js', 'src/art.js', 'src/icons.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  { files: ['src/main.js'], languageOptions: { sourceType: 'script', globals: globals.browser } },
];
