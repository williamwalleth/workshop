module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    "prettier"
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "semi": ["error", "never"]
  },
  globals: {
    module: true
  }
}
