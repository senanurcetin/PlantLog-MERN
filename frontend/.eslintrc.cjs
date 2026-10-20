module.exports = {
    root: true,
    env: { browser: true, es2022: true },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
    },
    plugins: ['@typescript-eslint', 'react-hooks'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
    ],
    ignorePatterns: ['dist/', 'node_modules/', 'test-artifacts/'],
    rules: {
        // Follow-up migration can tighten any-based handlers incrementally.
        // Keep the existing repository lintable while enforcing React hooks,
        // unused imports/variables, and other recommended TypeScript rules.
        '@typescript-eslint/no-explicit-any': 'off',
    },
};
