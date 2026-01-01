#!/usr/bin/env tsx
/**
 * Autonomous Test Runner
 *
 * Unified test harness that orchestrates:
 * 1. Environment validation
 * 2. Database preparation (local or remote mode)
 * 3. Test data seeding
 * 4. Application server startup
 * 5. Unit/Integration tests (Vitest)
 * 6. E2E tests (Playwright)
 * 7. Autonomous smoke crawl
 * 8. Artifact collection & cleanup
 *
 * Usage:
 *   npm run test:autonomous                    # Full suite
 *   npm run test:autonomous -- --skip-unit     # Skip unit tests
 *   npm run test:autonomous -- --skip-e2e      # Skip E2E tests
 *   npm run test:autonomous -- --skip-smoke    # Skip smoke crawl
 *   npm run test:autonomous -- --phase critical # Only critical tests
 *   MODE=local npm run test:autonomous         # Use local Supabase
 *   MODE=remote npm run test:autonomous        # Use remote test project
 */

import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs/promises';

import { EnvironmentValidator } from './lib/environment-validator.js';
import { DatabasePreparer } from './lib/database-preparer.js';
import { ServerManager } from './lib/server-manager.js';
import { getProcessManager, killProcessTree } from './lib/process-manager.js';

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_TEST_FAILURE = 1;
const EXIT_ENV_VALIDATION_FAILURE = 2;
const EXIT_PRODUCTION_SAFETY_BLOCK = 3;
const EXIT_SERVER_TIMEOUT = 4;

interface TestResult {
  phase: string;
  passed: boolean;
  duration: number;
  total?: number;
  failures?: number;
  errors?: string[];
}

interface HarnessConfig {
  mode: 'local' | 'remote';
  skipUnit: boolean;
  skipE2E: boolean;
  skipSmoke: boolean;
  skipDbReset: boolean;
  phase: string;
  verbose: boolean;
}

interface TestReport {
  timestamp: string;
  config: HarnessConfig;
  overallPassed: boolean;
  phases: TestResult[];
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    duration: number;
  };
}

class AutonomousTestRunner {
  private config: HarnessConfig;
  private results: TestResult[] = [];
  private startTime = Date.now();
  private serverManager: ServerManager | null = null;
  private reportDir: string;

  constructor(config: HarnessConfig) {
    this.config = config;
    this.reportDir = path.join(process.cwd(), 'test-results', 'autonomous');
  }

  /**
   * Run the complete autonomous test suite
   */
  async run(): Promise<number> {
    const processManager = getProcessManager();

    // Register cleanup handler
    processManager.registerShutdownHandler(async () => {
      console.log(chalk.yellow('\nCleaning up...'));
      await this.cleanup();
    });

    console.log(chalk.blue.bold('\n' + '='.repeat(60)));
    console.log(chalk.blue.bold('     AUTONOMOUS TEST RUNNER'));
    console.log(chalk.blue.bold('='.repeat(60)));
    console.log(`\n  Mode: ${this.config.mode}`);
    console.log(`  Skip Unit: ${this.config.skipUnit}`);
    console.log(`  Skip E2E: ${this.config.skipE2E}`);
    console.log(`  Skip Smoke: ${this.config.skipSmoke}`);
    console.log(`  Phase: ${this.config.phase}`);

    try {
      // Create report directory
      await fs.mkdir(this.reportDir, { recursive: true });

      // Phase 1: Environment Validation
      const envResult = await this.runPhase('Environment Validation', async () => {
        const validator = new EnvironmentValidator();
        const result = await validator.validate({
          nodeMinVersion: '20.0.0',
          requiredEnvVars: [
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY',
            'TEST_USER_EMAIL',
            'TEST_USER_PASSWORD',
          ],
          productionSafetyCheck: true,
          mode: this.config.mode,
        });

        if (!result.valid) {
          if (result.errors.some(e => e.includes('SAFETY BLOCK'))) {
            throw new Error('PRODUCTION_SAFETY_BLOCK');
          }
          throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
        }

        return { passed: true };
      });

      if (!envResult.passed) {
        if (envResult.errors?.includes('PRODUCTION_SAFETY_BLOCK')) {
          return EXIT_PRODUCTION_SAFETY_BLOCK;
        }
        return EXIT_ENV_VALIDATION_FAILURE;
      }

      // Phase 2: Database Preparation
      if (!this.config.skipDbReset) {
        await this.runPhase('Database Preparation', async () => {
          const preparer = new DatabasePreparer(this.config.mode, this.config.verbose);
          const result = await preparer.prepare({
            skipReset: false,
            skipSeed: false,
          });

          if (!result.success) {
            throw new Error(`Database preparation failed: ${result.errors.join(', ')}`);
          }

          // Create test users
          await preparer.createTestUsers();

          return { passed: true };
        });
      }

      // Phase 3: Start Application Server
      const serverResult = await this.runPhase('Start Application Server', async () => {
        this.serverManager = new ServerManager();

        try {
          await this.serverManager.start({
            mode: this.config.mode === 'local' ? 'dev' : 'preview',
            port: 5173,
            waitOnTimeout: 120000, // 2 minutes
          });

          return { passed: true };
        } catch (error) {
          throw new Error(`Server startup failed: ${error}`);
        }
      });

      if (!serverResult.passed) {
        return EXIT_SERVER_TIMEOUT;
      }

      // Phase 4: Unit Tests
      if (!this.config.skipUnit && this.shouldRunPhase('unit')) {
        await this.runPhase('Unit Tests', async () => {
          return this.runVitest();
        });
      }

      // Phase 5: E2E Tests
      if (!this.config.skipE2E && this.shouldRunPhase('e2e')) {
        await this.runPhase('E2E Tests', async () => {
          return this.runPlaywright('e2e', ['--project=chromium']);
        });
      }

      // Phase 6: Autonomous Smoke Crawl
      if (!this.config.skipSmoke && this.shouldRunPhase('smoke')) {
        await this.runPhase('Autonomous Smoke Crawl', async () => {
          return this.runPlaywright('e2e/autonomous', ['--project=smoke-crawl']);
        });
      }

      // Phase 7: Generate Report
      await this.generateReport();

      // Determine exit code
      const allPassed = this.results.every(r => r.passed);

      // Summary
      console.log('\n' + chalk.blue.bold('='.repeat(60)));
      console.log(chalk.blue.bold('     TEST SUMMARY'));
      console.log(chalk.blue.bold('='.repeat(60)));

      for (const result of this.results) {
        const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
        const status = result.passed ? chalk.green('PASSED') : chalk.red('FAILED');
        console.log(`  ${icon} ${result.phase}: ${status} (${(result.duration / 1000).toFixed(1)}s)`);
      }

      const totalDuration = Date.now() - this.startTime;
      console.log('\n' + chalk.blue('─'.repeat(60)));
      console.log(`  Overall: ${allPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
      console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
      console.log(`  Report: ${path.join(this.reportDir, 'latest-report.html')}`);
      console.log(chalk.blue.bold('='.repeat(60) + '\n'));

      return allPassed ? EXIT_SUCCESS : EXIT_TEST_FAILURE;
    } catch (error) {
      console.error(chalk.red('\nFatal error:'), error);
      return EXIT_TEST_FAILURE;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Run a test phase with timing and error handling
   */
  private async runPhase(
    name: string,
    fn: () => Promise<{ passed: boolean; total?: number; failures?: number }>
  ): Promise<TestResult> {
    console.log(chalk.blue(`\n${'─'.repeat(60)}`));
    console.log(chalk.blue.bold(`  PHASE: ${name}`));
    console.log(chalk.blue('─'.repeat(60)));

    const spinner = ora({
      text: `Running ${name}...`,
      color: 'blue',
    }).start();

    const startTime = Date.now();
    let result: TestResult;

    try {
      const phaseResult = await fn();
      const duration = Date.now() - startTime;

      result = {
        phase: name,
        passed: phaseResult.passed,
        duration,
        total: phaseResult.total,
        failures: phaseResult.failures,
      };

      if (phaseResult.passed) {
        spinner.succeed(chalk.green(`${name} completed (${(duration / 1000).toFixed(1)}s)`));
      } else {
        spinner.fail(chalk.red(`${name} failed (${(duration / 1000).toFixed(1)}s)`));
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      result = {
        phase: name,
        passed: false,
        duration,
        errors: [errorMessage],
      };

      spinner.fail(chalk.red(`${name} failed: ${errorMessage}`));
    }

    this.results.push(result);
    return result;
  }

  /**
   * Check if a phase should run based on config
   */
  private shouldRunPhase(phase: string): boolean {
    if (this.config.phase === 'all') return true;
    if (this.config.phase === 'critical') {
      return ['unit', 'e2e'].includes(phase);
    }
    return this.config.phase === phase;
  }

  /**
   * Run Vitest unit tests
   */
  private async runVitest(): Promise<{ passed: boolean; total?: number; failures?: number }> {
    const { execa } = await import('execa');

    try {
      const result = await execa('npx', ['vitest', 'run', '--reporter=verbose'], {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        timeout: 300000, // 5 minutes
        reject: false,
      });

      return {
        passed: result.exitCode === 0,
      };
    } catch (error) {
      return {
        passed: false,
      };
    }
  }

  /**
   * Run Playwright E2E tests
   */
  private async runPlaywright(
    testDir: string,
    args: string[] = []
  ): Promise<{ passed: boolean; total?: number; failures?: number }> {
    const { execa } = await import('execa');

    try {
      const result = await execa(
        'npx',
        ['playwright', 'test', testDir, ...args],
        {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
          timeout: 600000, // 10 minutes
          reject: false,
          env: {
            ...process.env,
            CI: 'true', // Enable CI mode for better error handling
          },
        }
      );

      return {
        passed: result.exitCode === 0,
      };
    } catch (error) {
      return {
        passed: false,
      };
    }
  }

  /**
   * Generate HTML and JSON reports
   */
  private async generateReport(): Promise<void> {
    const duration = Date.now() - this.startTime;
    const totalTests = this.results.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalFailed = this.results.reduce((sum, r) => sum + (r.failures || 0), 0);
    const overallPassed = this.results.every(r => r.passed);

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      config: this.config,
      overallPassed,
      phases: this.results,
      summary: {
        totalTests,
        totalPassed: totalTests - totalFailed,
        totalFailed,
        duration,
      },
    };

    // Ensure report directory exists
    await fs.mkdir(this.reportDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(this.reportDir, `report-${Date.now()}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Save HTML report
    const htmlPath = path.join(this.reportDir, 'latest-report.html');
    await fs.writeFile(htmlPath, this.generateHtmlReport(report));
  }

  /**
   * Generate HTML report content
   */
  private generateHtmlReport(report: TestReport): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autonomous Test Report - ${report.timestamp}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    .header {
      background: ${report.overallPassed ? '#10b981' : '#ef4444'};
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    .header h1 { font-size: 1.8em; margin-bottom: 10px; }
    .header .status { font-size: 1.4em; font-weight: bold; }
    .header .timestamp { opacity: 0.9; font-size: 0.9em; }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h2 { margin-bottom: 15px; color: #374151; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }
    .metric {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .metric-value { font-size: 1.8em; font-weight: bold; color: #1f2937; }
    .metric-label { color: #6b7280; font-size: 0.85em; }
    .phase {
      border-left: 4px solid #e5e7eb;
      padding: 15px;
      margin-bottom: 10px;
      background: #f9fafb;
      border-radius: 0 6px 6px 0;
    }
    .phase.passed { border-left-color: #10b981; }
    .phase.failed { border-left-color: #ef4444; }
    .phase-header { display: flex; justify-content: space-between; align-items: center; }
    .phase-name { font-weight: 600; }
    .phase-status { padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
    .phase-status.passed { background: #d1fae5; color: #065f46; }
    .phase-status.failed { background: #fee2e2; color: #991b1b; }
    .phase-duration { color: #6b7280; font-size: 0.85em; margin-top: 5px; }
    .config { font-size: 0.85em; color: #6b7280; }
    .config code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Autonomous Test Report</h1>
      <div class="status">${report.overallPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}</div>
      <div class="timestamp">${new Date(report.timestamp).toLocaleString()}</div>
    </div>

    <div class="card">
      <h2>Summary</h2>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${report.phases.length}</div>
          <div class="metric-label">Phases</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color: #10b981">${report.phases.filter(p => p.passed).length}</div>
          <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color: #ef4444">${report.phases.filter(p => !p.passed).length}</div>
          <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(report.summary.duration / 1000).toFixed(1)}s</div>
          <div class="metric-label">Duration</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Test Phases</h2>
      ${report.phases.map(phase => `
        <div class="phase ${phase.passed ? 'passed' : 'failed'}">
          <div class="phase-header">
            <span class="phase-name">${phase.phase}</span>
            <span class="phase-status ${phase.passed ? 'passed' : 'failed'}">${phase.passed ? 'PASSED' : 'FAILED'}</span>
          </div>
          <div class="phase-duration">Duration: ${(phase.duration / 1000).toFixed(2)}s</div>
          ${phase.errors ? `<div style="color: #ef4444; margin-top: 10px;"><pre>${phase.errors.join('\n')}</pre></div>` : ''}
        </div>
      `).join('')}
    </div>

    <div class="card">
      <h2>Configuration</h2>
      <div class="config">
        <p>Mode: <code>${report.config.mode}</code></p>
        <p>Skip Unit: <code>${report.config.skipUnit}</code></p>
        <p>Skip E2E: <code>${report.config.skipE2E}</code></p>
        <p>Skip Smoke: <code>${report.config.skipSmoke}</code></p>
        <p>Phase: <code>${report.config.phase}</code></p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    if (this.serverManager) {
      await this.serverManager.stop();
      this.serverManager = null;
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): HarnessConfig {
  const config: HarnessConfig = {
    mode: (process.env.MODE as 'local' | 'remote') || 'local',
    skipUnit: false,
    skipE2E: false,
    skipSmoke: false,
    skipDbReset: false,
    phase: 'all',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--skip-unit':
        config.skipUnit = true;
        break;
      case '--skip-e2e':
        config.skipE2E = true;
        break;
      case '--skip-smoke':
        config.skipSmoke = true;
        break;
      case '--skip-db-reset':
        config.skipDbReset = true;
        break;
      case '--phase':
        config.phase = args[++i] || 'all';
        break;
      case '--mode':
        config.mode = (args[++i] as 'local' | 'remote') || 'local';
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Autonomous Test Runner

Usage: npm run test:autonomous [options]

Options:
  --skip-unit       Skip unit tests
  --skip-e2e        Skip E2E tests
  --skip-smoke      Skip autonomous smoke crawl
  --skip-db-reset   Skip database reset/seeding
  --phase <phase>   Run specific phase (unit, e2e, smoke, critical, all)
  --mode <mode>     Database mode (local, remote)
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

Environment Variables:
  MODE              Database mode (local or remote)
  VITE_SUPABASE_URL Supabase project URL
  VITE_SUPABASE_ANON_KEY Supabase anon key
  SUPABASE_SERVICE_ROLE_KEY Service role key (for remote mode)
  TEST_USER_EMAIL   Test user email
  TEST_USER_PASSWORD Test user password

Examples:
  npm run test:autonomous                    # Full suite
  npm run test:autonomous -- --skip-unit     # Skip unit tests
  MODE=remote npm run test:autonomous        # Use remote test project
        `);
        process.exit(0);
    }
  }

  return config;
}

// Main entry point
const args = process.argv.slice(2);
const config = parseArgs(args);
const runner = new AutonomousTestRunner(config);

runner.run().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
