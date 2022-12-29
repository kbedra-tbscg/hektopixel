module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    semi: [1, 'never'],
    'comma-dangle': 'off',
    'no-console': 'off',
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
  },
}
