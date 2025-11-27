module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'node_modules',
    'build',
    'coverage',
    'playwright-report',
    '*.config.js',
    '*.config.ts',
    'EXAMPLE_*.tsx',
    'EXAMPLE_*.ts',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react-refresh',
    '@typescript-eslint',
  ],
  rules: {
    // React Refresh rules
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    // TypeScript specific rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',

    // General ESLint rules
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['warn', 'always', { null: 'ignore' }],
    'curly': ['warn', 'all'],
    'brace-style': 'off', // Turned off in favor of prettier
    'comma-dangle': 'off', // Turned off in favor of prettier
    'semi': 'off', // Turned off in favor of prettier
    'quotes': 'off', // Turned off in favor of prettier
    'indent': 'off', // Turned off in favor of prettier

    // Best practices
    'no-duplicate-imports': 'warn',
    'no-unused-expressions': 'off', // TypeScript handles this
    'no-use-before-define': 'off', // TypeScript handles this
    '@typescript-eslint/no-use-before-define': ['warn', {
      functions: false,
      classes: false,
      variables: false,
      typedefs: false
    }],
    'no-case-declarations': 'warn', // Allow case declarations (common pattern)
    '@typescript-eslint/ban-types': ['warn', {
      types: {
        Function: false, // Allow Function type (useful in tests)
      },
      extendDefaults: true,
    }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      // Test files
      files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      globals: {
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      // Config files
      files: ['*.config.js', '*.config.ts', '*.config.mjs', '*.config.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
  ],
};
