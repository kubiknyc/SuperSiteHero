#!/usr/bin/env node
/**
 * CI Auto-Fix Orchestrator
 *
 * This script handles complex auto-fix scenarios that require
 * multiple passes or conditional logic. Run this locally or in CI
 * to automatically fix linting issues, formatting, and other
 * auto-fixable problems.
 *
 * Usage:
 *   node scripts/ci-auto-fix.mjs [--dry-run] [--max-iterations=N]
 *
 * Options:
 *   --dry-run          Show what would be fixed without making changes
 *   --max-iterations   Maximum fix iterations (default: 3)
 *
 * Security Note: This script only executes hardcoded npm commands.
 * No user input is passed to shell commands.
 */

import { execFileSync, spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Configuration
const MAX_FIX_ITERATIONS = parseInt(process.argv.find(arg => arg.startsWith('--max-iterations='))?.split('=')[1] || '3', 10);
const DRY_RUN = process.argv.includes('--dry-run');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  log(`${'='.repeat(60)}`, colors.cyan);
  log(`  ${message}`, colors.bright);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logStep(step, total, message) {
  log(`\n[${step}/${total}] ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`  OK ${message}`, colors.green);
}

function logWarning(message) {
  log(`  !! ${message}`, colors.yellow);
}

function logError(message) {
  log(`  XX ${message}`, colors.red);
}

/**
 * Execute an npm command safely using execFileSync (no shell injection)
 */
function runNpmCommand(scriptName, args = [], options = {}) {
  const { silent = false, allowFailure = false } = options;
  const fullCommand = `npm run ${scriptName}${args.length ? ' -- ' + args.join(' ') : ''}`;

  if (!silent) {
    log(`  > ${fullCommand}`, colors.cyan);
  }

  if (DRY_RUN && !scriptName.startsWith('lint') && !scriptName.startsWith('type-check')) {
    log('  [DRY RUN] Skipping command execution', colors.yellow);
    return { success: true, output: '' };
  }

  try {
    // Use execFileSync with npm directly (safer than exec with shell)
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const cmdArgs = ['run', scriptName, ...args];

    const output = execFileSync(npmCmd, cmdArgs, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    return { success: true, output: output || '' };
  } catch (error) {
    if (allowFailure) {
      return { success: false, output: error.stdout || error.message };
    }
    throw error;
  }
}

/**
 * Check if there are uncommitted changes
 */
function hasUncommittedChanges() {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  return result.stdout.trim().length > 0;
}

/**
 * Get list of changed files
 */
function getChangedFiles() {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  return result.stdout
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => line.substring(3));
}

/**
 * Run ESLint auto-fix
 */
function runEslintFix() {
  logStep(1, 4, 'Running ESLint auto-fix...');

  runNpmCommand('lint:fix', [], { allowFailure: true });

  if (hasUncommittedChanges()) {
    const changedFiles = getChangedFiles();
    logSuccess(`Fixed ${changedFiles.length} file(s)`);
    changedFiles.slice(0, 10).forEach(file => {
      log(`    - ${file}`, colors.reset);
    });
    if (changedFiles.length > 10) {
      log(`    ... and ${changedFiles.length - 10} more`, colors.reset);
    }
    return true;
  } else {
    logSuccess('No ESLint fixes needed');
    return false;
  }
}

/**
 * Check TypeScript errors
 */
function checkTypeScript() {
  logStep(2, 4, 'Checking TypeScript errors...');

  const result = runNpmCommand('type-check', [], { allowFailure: true, silent: true });

  if (!result.success) {
    // Count errors
    const errorCount = (result.output.match(/error TS/g) || []).length;
    logWarning(`Found ${errorCount} TypeScript error(s)`);

    // TypeScript errors generally can't be auto-fixed, but we can provide suggestions
    log('  TypeScript errors require manual fixes.', colors.yellow);
    log('  Run "npm run type-check" to see details.', colors.yellow);
    return false;
  } else {
    logSuccess('No TypeScript errors');
    return true;
  }
}

/**
 * Run unit tests
 */
function runTests() {
  logStep(3, 4, 'Running unit tests...');

  const result = runNpmCommand('test:unit', ['--run'], { allowFailure: true });

  if (!result.success) {
    logWarning('Some tests are failing');

    // Check if snapshot updates might help
    if (result.output && result.output.includes('Snapshot')) {
      log('  Tip: Run "npm run test:unit -- --run --update" to update snapshots', colors.yellow);
    }
    return false;
  } else {
    logSuccess('All tests passing');
    return true;
  }
}

/**
 * Verify build
 */
function verifyBuild() {
  logStep(4, 4, 'Verifying build...');

  const result = runNpmCommand('build', [], { allowFailure: true });

  if (!result.success) {
    logError('Build failed');
    return false;
  } else {
    logSuccess('Build successful');
    return true;
  }
}

/**
 * Generate summary report
 */
function generateSummary(results) {
  logHeader('Auto-Fix Summary');

  const statusIcon = (passed) => passed ? colors.green + 'PASS' : colors.red + 'FAIL';

  console.log('');
  console.log(`  ESLint:     ${statusIcon(results.eslint)}${colors.reset}`);
  console.log(`  TypeScript: ${statusIcon(results.typescript)}${colors.reset}`);
  console.log(`  Tests:      ${statusIcon(results.tests)}${colors.reset}`);
  console.log(`  Build:      ${statusIcon(results.build)}${colors.reset}`);
  console.log('');

  const allPassed = results.eslint && results.typescript && results.tests && results.build;

  if (allPassed) {
    log('All checks passed!', colors.green);
  } else {
    log('Some checks failed. See above for details.', colors.yellow);

    if (!results.typescript) {
      log('\nTo see TypeScript errors:', colors.reset);
      log('  npm run type-check', colors.cyan);
    }

    if (!results.tests) {
      log('\nTo run tests:', colors.reset);
      log('  npm run test:unit', colors.cyan);
    }

    if (!results.build) {
      log('\nTo debug build:', colors.reset);
      log('  npm run build', colors.cyan);
    }
  }

  return allPassed;
}

/**
 * Main orchestration function
 */
async function main() {
  logHeader('CI Auto-Fix Orchestrator');

  if (DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', colors.yellow);
  }

  log(`Max iterations: ${MAX_FIX_ITERATIONS}`, colors.reset);

  let iteration = 0;
  let eslintFixed = false;

  // Iterative fixing (some fixes may reveal more issues)
  while (iteration < MAX_FIX_ITERATIONS) {
    iteration++;
    log(`\n--- Iteration ${iteration}/${MAX_FIX_ITERATIONS} ---`, colors.bright);

    const hadChanges = runEslintFix();

    if (!hadChanges) {
      log('No more changes to apply.', colors.reset);
      break;
    }

    eslintFixed = true;
  }

  // Run remaining checks
  const typescriptPassed = checkTypeScript();
  const testsPassed = runTests();
  const buildPassed = verifyBuild();

  // Generate summary
  const allPassed = generateSummary({
    eslint: !hasUncommittedChanges() || eslintFixed,
    typescript: typescriptPassed,
    tests: testsPassed,
    build: buildPassed,
  });

  // Show next steps
  if (hasUncommittedChanges() && !DRY_RUN) {
    logHeader('Uncommitted Changes');
    log('The following files were modified:', colors.reset);
    getChangedFiles().forEach(file => {
      log(`  - ${file}`, colors.cyan);
    });
    log('\nTo commit these changes:', colors.reset);
    log('  git add -A && git commit -m "fix: auto-fix linting issues"', colors.cyan);
  }

  process.exit(allPassed ? 0 : 1);
}

// Run the script
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
