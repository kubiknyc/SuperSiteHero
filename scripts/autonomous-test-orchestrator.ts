#!/usr/bin/env tsx
/**
 * Autonomous Test Orchestrator
 *
 * Coordinates all testing phases for complete application coverage:
 * 1. Unit tests (Vitest)
 * 2. Integration tests
 * 3. E2E tests (Playwright)
 * 4. Visual regression tests
 * 5. Performance tests
 * 6. Accessibility tests
 * 7. Security tests
 *
 * Generates comprehensive reports and manages test health
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  phase: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  failures?: number;
  total?: number;
  errors?: string[];
}

interface TestReport {
  timestamp: string;
  overallPassed: boolean;
  phases: TestResult[];
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    averageCoverage: number;
    duration: number;
  };
}

class AutonomousTestOrchestrator {
  private results: TestResult[] = [];
  private startTime = Date.now();
  private reportDir = path.join(process.cwd(), 'test-reports', 'autonomous');

  async init() {
    await fs.mkdir(this.reportDir, { recursive: true });
    console.log('\n🤖 Autonomous Test Orchestrator Starting...\n');
  }

  /**
   * Phase 1: Unit Tests with Coverage
   */
  async runUnitTests(): Promise<TestResult> {
    console.log('📦 Phase 1: Running Unit Tests...');
    const start = Date.now();

    try {
      const { stdout, stderr } = await execAsync('npm run test:unit -- --reporter=json --outputFile=test-reports/autonomous/unit-tests.json', {
        timeout: 300000 // 5 minutes
      });

      // Parse results
      const result: TestResult = {
        phase: 'unit',
        passed: true,
        duration: Date.now() - start
      };

      try {
        const reportFile = path.join(this.reportDir, 'unit-tests.json');
        const reportData = await fs.readFile(reportFile, 'utf-8');
        const testResults = JSON.parse(reportData);

        result.total = testResults.numTotalTests || 0;
        result.failures = testResults.numFailedTests || 0;
        result.passed = result.failures === 0;
      } catch (e) {
        console.warn('Could not parse unit test results');
      }

      console.log(`✅ Unit Tests: ${result.passed ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);
      return result;
    } catch (error: any) {
      const result: TestResult = {
        phase: 'unit',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
      console.log(`❌ Unit Tests: FAILED`);
      return result;
    }
  }

  /**
   * Phase 2: Integration Tests
   */
  async runIntegrationTests(): Promise<TestResult> {
    console.log('🔗 Phase 2: Running Integration Tests...');
    const start = Date.now();

    try {
      // Integration tests targeting API services and stores
      const { stdout } = await execAsync('npm run test:unit -- --run --reporter=json --outputFile=test-reports/autonomous/integration-tests.json src/lib/api src/stores', {
        timeout: 300000
      });

      console.log(`✅ Integration Tests: PASSED`);
      return {
        phase: 'integration',
        passed: true,
        duration: Date.now() - start
      };
    } catch (error: any) {
      console.log(`❌ Integration Tests: FAILED`);
      return {
        phase: 'integration',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  }

  /**
   * Phase 3: E2E Critical Path Tests
   */
  async runCriticalE2ETests(): Promise<TestResult> {
    console.log('🎯 Phase 3: Running Critical E2E Tests...');
    const start = Date.now();

    try {
      // Run only critical user journeys first
      const criticalTests = [
        'auth.spec.ts',
        'projects.spec.ts',
        'daily-reports.spec.ts',
        'documents.spec.ts'
      ];

      const { stdout } = await execAsync(
        `npx playwright test ${criticalTests.join(' ')} --reporter=json --output=test-reports/autonomous/e2e-critical.json`,
        { timeout: 600000 } // 10 minutes
      );

      console.log(`✅ Critical E2E Tests: PASSED`);
      return {
        phase: 'e2e-critical',
        passed: true,
        duration: Date.now() - start
      };
    } catch (error: any) {
      console.log(`❌ Critical E2E Tests: FAILED`);
      return {
        phase: 'e2e-critical',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  }

  /**
   * Phase 4: Complete E2E Test Suite
   */
  async runFullE2ETests(): Promise<TestResult> {
    console.log('🌐 Phase 4: Running Full E2E Test Suite...');
    const start = Date.now();

    try {
      const { stdout } = await execAsync(
        'npm run test:e2e -- --reporter=json --output=test-reports/autonomous/e2e-full.json',
        { timeout: 1800000 } // 30 minutes
      );

      console.log(`✅ Full E2E Tests: PASSED`);
      return {
        phase: 'e2e-full',
        passed: true,
        duration: Date.now() - start
      };
    } catch (error: any) {
      console.log(`❌ Full E2E Tests: FAILED`);
      return {
        phase: 'e2e-full',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  }

  /**
   * Phase 5: Visual Regression Tests
   */
  async runVisualTests(): Promise<TestResult> {
    console.log('👁️  Phase 5: Running Visual Regression Tests...');
    const start = Date.now();

    try {
      const { stdout } = await execAsync(
        'npm run test:visual -- --reporter=json',
        { timeout: 900000 } // 15 minutes
      );

      console.log(`✅ Visual Tests: PASSED`);
      return {
        phase: 'visual',
        passed: true,
        duration: Date.now() - start
      };
    } catch (error: any) {
      console.log(`❌ Visual Tests: FAILED`);
      return {
        phase: 'visual',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  }

  /**
   * Phase 6: Accessibility Tests
   */
  async runAccessibilityTests(): Promise<TestResult> {
    console.log('♿ Phase 6: Running Accessibility Tests...');
    const start = Date.now();

    try {
      const { stdout } = await execAsync(
        'npx playwright test e2e/accessibility --reporter=json',
        { timeout: 600000 }
      );

      console.log(`✅ Accessibility Tests: PASSED`);
      return {
        phase: 'accessibility',
        passed: true,
        duration: Date.now() - start
      };
    } catch (error: any) {
      console.log(`❌ Accessibility Tests: FAILED`);
      return {
        phase: 'accessibility',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  }

  /**
   * Phase 7: Performance Tests
   */
  async runPerformanceTests(): Promise<TestResult> {
    console.log('⚡ Phase 7: Running Performance Tests...');
    const start = Date.now();

    try {
      const { stdout } = await execAsync(
        'npx playwright test e2e/performance --reporter=json',
        { timeout: 600000 }
      );

      console.log(`✅ Performance Tests: PASSED`);
      return {
        phase: 'performance',
        passed: true,
        duration: Date.now() - start
      };
    } catch (error: any) {
      console.log(`❌ Performance Tests: FAILED`);
      return {
        phase: 'performance',
        passed: false,
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  }

  /**
   * Generate Comprehensive Report
   */
  async generateReport(): Promise<TestReport> {
    const duration = Date.now() - this.startTime;
    const totalTests = this.results.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalFailed = this.results.reduce((sum, r) => sum + (r.failures || 0), 0);
    const totalPassed = totalTests - totalFailed;
    const overallPassed = this.results.every(r => r.passed);

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      overallPassed,
      phases: this.results,
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        averageCoverage: 0, // Will be calculated from coverage reports
        duration
      }
    };

    // Save report
    const reportFile = path.join(this.reportDir, `report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    // Generate HTML report
    await this.generateHTMLReport(report);

    return report;
  }

  /**
   * Generate HTML Report
   */
  async generateHTMLReport(report: TestReport) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Autonomous Test Report - ${report.timestamp}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: ${report.overallPassed ? '#10b981' : '#ef4444'};
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .phase {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      border-left: 4px solid ${report.overallPassed ? '#10b981' : '#ef4444'};
    }
    .phase.passed { border-left-color: #10b981; }
    .phase.failed { border-left-color: #ef4444; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .metric {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #1f2937;
    }
    .metric-label {
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 Autonomous Test Report</h1>
    <p>${new Date(report.timestamp).toLocaleString()}</p>
    <h2>${report.overallPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}</h2>
  </div>

  <div class="summary">
    <h2>Summary</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${report.summary.totalTests}</div>
        <div class="metric-label">Total Tests</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #10b981">${report.summary.totalPassed}</div>
        <div class="metric-label">Passed</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #ef4444">${report.summary.totalFailed}</div>
        <div class="metric-label">Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${(report.summary.duration / 1000).toFixed(1)}s</div>
        <div class="metric-label">Duration</div>
      </div>
    </div>
  </div>

  <h2>Test Phases</h2>
  ${report.phases.map(phase => `
    <div class="phase ${phase.passed ? 'passed' : 'failed'}">
      <h3>${phase.passed ? '✅' : '❌'} ${phase.phase.toUpperCase()}</h3>
      <p>Duration: ${(phase.duration / 1000).toFixed(2)}s</p>
      ${phase.total ? `<p>Tests: ${phase.total - (phase.failures || 0)}/${phase.total} passed</p>` : ''}
      ${phase.errors ? `<div style="color: #ef4444;"><pre>${phase.errors.join('\n')}</pre></div>` : ''}
    </div>
  `).join('')}
</body>
</html>
`;

    const htmlFile = path.join(this.reportDir, 'latest-report.html');
    await fs.writeFile(htmlFile, html);
    console.log(`\n📊 HTML Report: ${htmlFile}`);
  }

  /**
   * Main orchestration method
   */
  async run(phases: string[] = ['all']) {
    await this.init();

    const shouldRun = (phase: string) => phases.includes('all') || phases.includes(phase);

    try {
      // Run tests in sequence with smart fail-fast
      if (shouldRun('unit')) {
        const result = await this.runUnitTests();
        this.results.push(result);
        if (!result.passed && phases.includes('critical')) {
          console.log('\n⚠️  Unit tests failed. Skipping remaining phases.\n');
          await this.generateReport();
          process.exit(1);
        }
      }

      if (shouldRun('integration')) {
        const result = await this.runIntegrationTests();
        this.results.push(result);
      }

      if (shouldRun('e2e-critical')) {
        const result = await this.runCriticalE2ETests();
        this.results.push(result);
        if (!result.passed && phases.includes('critical')) {
          console.log('\n⚠️  Critical E2E tests failed. Skipping full E2E suite.\n');
          await this.generateReport();
          process.exit(1);
        }
      }

      if (shouldRun('e2e-full')) {
        const result = await this.runFullE2ETests();
        this.results.push(result);
      }

      if (shouldRun('visual')) {
        const result = await this.runVisualTests();
        this.results.push(result);
      }

      if (shouldRun('accessibility')) {
        const result = await this.runAccessibilityTests();
        this.results.push(result);
      }

      if (shouldRun('performance')) {
        const result = await this.runPerformanceTests();
        this.results.push(result);
      }

      const report = await this.generateReport();

      console.log('\n' + '='.repeat(60));
      console.log('📊 AUTONOMOUS TEST RESULTS');
      console.log('='.repeat(60));
      console.log(`Overall Status: ${report.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Total Tests: ${report.summary.totalTests}`);
      console.log(`Passed: ${report.summary.totalPassed}`);
      console.log(`Failed: ${report.summary.totalFailed}`);
      console.log(`Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
      console.log('='.repeat(60) + '\n');

      process.exit(report.overallPassed ? 0 : 1);
    } catch (error) {
      console.error('Fatal error in test orchestration:', error);
      await this.generateReport();
      process.exit(1);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);
const phases = args.length > 0 ? args : ['all'];

const orchestrator = new AutonomousTestOrchestrator();
orchestrator.run(phases);
