import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      '*.config.cjs',
      'EXAMPLE_*.tsx',
      'EXAMPLE_*.ts',
      // Build artifacts
      'android/**',
      'ios/**',
      '.capacitor/**',
      // Lighthouse config (uses CommonJS)
      '.lighthouserc.js',
      // Supabase generated files
      'supabase/.temp/**',
      // Vendor files in public directory (minified libraries)
      'public/*.min.js',
      'public/*.min.mjs',
      // Docker demo project (separate codebase)
      'welcome-to-docker/**',
    ],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Main configuration for TypeScript/React files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,

      // React Refresh rules - disabled as many files legitimately export components + helpers
      'react-refresh/only-export-components': 'off',

      // React Compiler rules
      'react-compiler/react-compiler': 'error',

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
      '@typescript-eslint/no-require-imports': 'off',

      // General ESLint rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'curly': ['warn', 'all'],

      // Formatting rules turned off in favor of Prettier
      'brace-style': 'off',
      'comma-dangle': 'off',
      'semi': 'off',
      'quotes': 'off',
      'indent': 'off',

      // Best practices
      'no-duplicate-imports': 'warn',
      'no-unused-expressions': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'warn',
        {
          functions: false,
          classes: false,
          variables: false,
          typedefs: false,
        },
      ],
      'no-case-declarations': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Test files configuration (unit tests, integration tests, e2e tests)
  {
    files: [
      '**/__tests__/**/*',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'e2e/**/*.ts',
      'tests/**/*.ts',
      'tests/**/*.tsx',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        page: 'readonly',
      },
    },
    rules: {
      // Relax rules for test files - tests often need flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
      'prefer-const': 'off',
      // Disable React hooks rules for E2E tests - Playwright uses `use` as a fixture callback
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // Config files
  {
    files: ['*.config.js', '*.config.ts', '*.config.mjs', '*.config.cjs'],
    rules: {
      'no-console': 'off',
    },
  },

  // k6 load test files
  {
    files: ['tests/load/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        console: 'readonly',
        open: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // Supabase Edge Functions
  {
    files: ['supabase/functions/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Service Worker
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        navigator: 'readonly',
        clients: 'readonly',
        registration: 'readonly',
        skipWaiting: 'readonly',
        addEventListener: 'readonly',
        importScripts: 'readonly',
        indexedDB: 'readonly',
        IDBKeyRange: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // TypeScript declaration files
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-var': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Files that require React Hooks Compiler rules exemption (Three.js, form reset patterns, mock data with Date)
  {
    files: [
      '**/**/ModelViewer3D.tsx',
      '**/**/VRWalkthrough.tsx',
      '**/**/BackChargeFormDialog.tsx',
      '**/**/NCRFormDialog.tsx',
      '**/**/PhotoLocationFormPage.tsx',
      '**/**/PhotoProgressReportFormPage.tsx',
      '**/**/ProgressPhotoFormPage.tsx',
      '**/**/PhotoProgressReportsPage.tsx',
      '**/**/PhotoComparisonFormPage.tsx',
      '**/**/PhotoReportFormPage.tsx',
      '**/**/PhotoLightbox.tsx',
      '**/**/RemoteMarkupHighlight.tsx',
      '**/**/DrawingSliderComparison.tsx',
      '**/**/SiteInstructionsPage.tsx',
    ],
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      // Disable React Compiler rules
      'react-compiler/react-compiler': 'off',
      // Disable React Hooks v7 compiler-related rules
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },

  // Diagnostic and debug utility files (need console.log)
  {
    files: [
      'src/utils/diagnose-*.ts',
      'src/lib/supabase.ts',
      'src/lib/utils/logger.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // API services and hooks - often work with dynamic data structures
  {
    files: [
      'src/lib/api/**/*.ts',
      'src/features/**/hooks/*.ts',
      'src/features/**/services/*.ts',
      'src/features/**/utils/*.ts',
      'src/hooks/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Offline functionality - uses dynamic IndexedDB/IDB structures
  {
    files: [
      'src/lib/offline/**/*.ts',
      'src/lib/ml/**/*.ts',
      'src/lib/notifications/**/*.ts',
      'src/lib/utils/modelProcessing.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Node.js scripts
  {
    files: ['scripts/**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-undef': 'off',
    },
  }
);
