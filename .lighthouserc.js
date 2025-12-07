/**
 * Lighthouse CI Configuration
 *
 * Performance budgets and testing configuration for Lighthouse CI
 *
 * Install:
 *   npm install -D @lhci/cli
 *
 * Run locally:
 *   npm run build
 *   npx lhci autorun
 *
 * Run specific URL:
 *   npx lhci autorun --collect.url=http://localhost:5173/projects
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/login',
        'http://localhost:5173/projects',
        'http://localhost:5173/daily-reports',
        'http://localhost:5173/documents',
      ],
      // Number of runs per URL (median is used)
      numberOfRuns: 3,
      // Build static site before testing
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      // Collect settings
      settings: {
        // Emulate mobile device
        preset: 'desktop',
        // Throttling (optional, simulates slower connection)
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        // Skip certain audits for authenticated pages
        skipAudits: [
          'uses-http2',
          'redirects-http',
        ],
      },
    },
    assert: {
      // Performance budgets and assertions
      assertions: {
        // Overall category scores (0-1 scale)
        'categories:performance': ['error', { minScore: 0.9 }], // 90+
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95+
        'categories:best-practices': ['error', { minScore: 0.9 }], // 90+
        'categories:seo': ['warn', { minScore: 0.9 }], // 90+ (warning only)

        // Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }], // 2s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1
        'total-blocking-time': ['warn', { maxNumericValue: 300 }], // 300ms
        'speed-index': ['warn', { maxNumericValue: 3000 }], // 3s

        // Resource Sizes
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'resource-summary:document:size': ['warn', { maxNumericValue: 50000 }], // 50KB
        'resource-summary:font:size': ['warn', { maxNumericValue: 200000 }], // 200KB
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }], // 2MB

        // Network
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }], // 4s
        'bootup-time': ['warn', { maxNumericValue: 3000 }], // 3s
        'uses-optimized-images': ['warn', { minScore: 0.9 }],
        'uses-text-compression': ['warn', { minScore: 0.9 }],
        'uses-responsive-images': ['warn', { minScore: 0.9 }],

        // Accessibility
        'color-contrast': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        'label': ['error', { minScore: 1 }],
        'aria-valid-attr': ['error', { minScore: 1 }],
        'button-name': ['error', { minScore: 1 }],
        'link-name': ['error', { minScore: 1 }],

        // Best Practices
        'errors-in-console': ['warn', { maxNumericValue: 0 }],
        'no-vulnerable-libraries': ['error', { minScore: 1 }],
        'uses-https': 'off', // Skip for localhost
        'is-on-https': 'off', // Skip for localhost
      },
    },
    upload: {
      // Upload results to temporary public storage (optional)
      target: 'temporary-public-storage',
      // Or use Lighthouse CI server (recommended for teams)
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: 'your-build-token',
    },
    server: {
      // Optional: Local LHCI server configuration
      // port: 9001,
      // storage: {
      //   storageMethod: 'sql',
      //   sqlDialect: 'sqlite',
      //   sqlDatabasePath: './lhci.db',
      // },
    },
  },
};

/**
 * Performance Budget Guidelines:
 *
 * Time to Interactive (TTI):
 * - Fast: < 3.8s
 * - Moderate: 3.9s - 7.3s
 * - Slow: > 7.3s
 *
 * First Contentful Paint (FCP):
 * - Fast: < 1.8s
 * - Moderate: 1.8s - 3.0s
 * - Slow: > 3.0s
 *
 * Largest Contentful Paint (LCP):
 * - Good: < 2.5s
 * - Needs Improvement: 2.5s - 4.0s
 * - Poor: > 4.0s
 *
 * Cumulative Layout Shift (CLS):
 * - Good: < 0.1
 * - Needs Improvement: 0.1 - 0.25
 * - Poor: > 0.25
 *
 * Total Blocking Time (TBT):
 * - Fast: < 300ms
 * - Moderate: 300ms - 600ms
 * - Slow: > 600ms
 *
 * Bundle Sizes (compressed):
 * - JavaScript: < 500KB
 * - CSS: < 100KB
 * - Images: < 1MB (total)
 * - Total: < 2MB
 */
