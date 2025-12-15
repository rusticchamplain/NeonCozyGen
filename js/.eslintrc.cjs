module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  overrides: [
    {
      files: ['web/**/*.js'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: '18.2',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
        paths: ['src'],
      },
    },
  },
  plugins: ['react-refresh', 'import', 'jsx-a11y'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
    // Core robustness
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-implicit-coercion': ['warn', { allow: ['!!'] }],
    'prefer-const': 'warn',
    'no-shadow': 'warn',
    'no-var': 'error',
    // React clarity
    'react/jsx-no-useless-fragment': 'warn',
    'react/no-array-index-key': 'warn',
    // Import hygiene
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
        ],
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      },
    ],
    'import/no-cycle': 'warn',
    // Accessibility (keep default recommended, add small adjustments)
    'jsx-a11y/anchor-is-valid': 'warn',
  },
};
