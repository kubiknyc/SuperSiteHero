#!/usr/bin/env node
/* eslint-disable security/detect-object-injection */
/**
 * TypeScript Error Parser
 *
 * Parses TypeScript compiler output and categorizes errors
 * for analysis and potential auto-fixing suggestions.
 *
 * Usage:
 *   node scripts/parse-ts-errors.mjs [--json] [--summary]
 *
 * Options:
 *   --json     Output results as JSON
 *   --summary  Show only summary, not individual errors
 *
 * Output:
 *   - Categorized error counts
 *   - File-by-file breakdown
 *   - Suggestions for common fixes
 *
 * Security Note: This script only executes the hardcoded tsc command.
 * No user input is passed to shell commands.
 */

import { execFileSync, spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Parse CLI arguments
const OUTPUT_JSON = process.argv.includes('--json');
const SUMMARY_ONLY = process.argv.includes('--summary');

// Error pattern definitions
const ERROR_PATTERNS = {
  missingImport: {
    pattern: /Cannot find module '([^']+)'/,
    description: 'Missing module import',
    autoFixable: false,
    suggestion: 'Install the missing package or fix the import path',
  },
  typeAssignment: {
    pattern: /Type '([^']+)' is not assignable to type '([^']+)'/,
    description: 'Type mismatch',
    autoFixable: false,
    suggestion: 'Check the expected type and update the value or type annotation',
  },
  missingProperty: {
    pattern: /Property '([^']+)' does not exist on type '([^']+)'/,
    description: 'Missing property',
    autoFixable: false,
    suggestion: 'Add the property to the type or use optional chaining',
  },
  nullUndefined: {
    pattern: /(possibly 'null'|possibly 'undefined'|is possibly 'null' or 'undefined')/,
    description: 'Null/undefined check needed',
    autoFixable: false,
    suggestion: 'Add null check, optional chaining (?.), or null coalescing (??)',
  },
  unusedVariable: {
    pattern: /'([^']+)' is declared but its value is never read/,
    description: 'Unused variable',
    autoFixable: true,
    suggestion: 'Remove the variable or prefix with underscore (_)',
  },
  unusedImport: {
    pattern: /'([^']+)' is declared but never used/,
    description: 'Unused import',
    autoFixable: true,
    suggestion: 'Remove the unused import',
  },
  missingReturn: {
    pattern: /A function whose declared type is neither 'void' nor 'any' must return/,
    description: 'Missing return statement',
    autoFixable: false,
    suggestion: 'Add a return statement or change the return type',
  },
  implicitAny: {
    pattern: /implicitly has an? '([^']+)' type/,
    description: 'Implicit any type',
    autoFixable: false,
    suggestion: 'Add explicit type annotation',
  },
  noOverload: {
    pattern: /No overload matches this call/,
    description: 'Function overload mismatch',
    autoFixable: false,
    suggestion: 'Check the function signature and argument types',
  },
  cannotFind: {
    pattern: /Cannot find name '([^']+)'/,
    description: 'Cannot find name',
    autoFixable: false,
    suggestion: 'Import the name or declare it',
  },
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  if (!OUTPUT_JSON) {
    console.log(`${color}${message}${colors.reset}`);
  }
}

/**
 * Run TypeScript type check and capture output
 */
function runTypeCheck() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  try {
    execFileSync(npmCmd, ['run', 'type-check'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { success: true, output: '' };
  } catch (error) {
    return { success: false, output: error.stdout || error.stderr || '' };
  }
}

/**
 * Parse a single error line from TypeScript output
 */
function parseErrorLine(line) {
  // Format: file(line,col): error TS####: message
  const match = line.match(/^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/);

  if (!match) {
    // Try Windows path format
    const winMatch = line.match(/^(.+?):(\d+):(\d+) - error (TS\d+): (.+)$/);
    if (winMatch) {
      const [, file, lineNum, col, code, message] = winMatch;
      return { file, line: parseInt(lineNum), column: parseInt(col), code, message };
    }
    return null;
  }

  const [, file, lineNum, col, code, message] = match;
  return {
    file,
    line: parseInt(lineNum),
    column: parseInt(col),
    code,
    message,
  };
}

/**
 * Categorize an error based on its message
 */
function categorizeError(error) {
  for (const [category, config] of Object.entries(ERROR_PATTERNS)) {
    if (config.pattern.test(error.message)) {
      return {
        ...error,
        category,
        ...config,
      };
    }
  }

  return {
    ...error,
    category: 'other',
    description: 'Other error',
    autoFixable: false,
    suggestion: 'Review the error message and fix manually',
  };
}

/**
 * Parse TypeScript output and extract errors
 */
function parseTypeScriptOutput(output) {
  const lines = output.split('\n');
  const errors = [];

  for (const line of lines) {
    const parsed = parseErrorLine(line.trim());
    if (parsed) {
      const categorized = categorizeError(parsed);
      errors.push(categorized);
    }
  }

  return errors;
}

/**
 * Generate summary statistics
 */
function generateSummary(errors) {
  const summary = {
    total: errors.length,
    byCategory: {},
    byFile: {},
    byCode: {},
    autoFixable: 0,
  };

  for (const error of errors) {
    // By category
    summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;

    // By file
    summary.byFile[error.file] = (summary.byFile[error.file] || 0) + 1;

    // By error code
    summary.byCode[error.code] = (summary.byCode[error.code] || 0) + 1;

    // Auto-fixable count
    if (error.autoFixable) {
      summary.autoFixable++;
    }
  }

  return summary;
}

/**
 * Print summary to console
 */
function printSummary(summary, errors) {
  log('\n' + '='.repeat(60), colors.cyan);
  log('  TypeScript Error Analysis', colors.bright);
  log('='.repeat(60), colors.cyan);

  log(`\nTotal Errors: ${summary.total}`, summary.total > 0 ? colors.red : colors.green);
  log(`Auto-fixable: ${summary.autoFixable}`, summary.autoFixable > 0 ? colors.yellow : colors.gray);

  // By category
  log('\n--- Errors by Category ---', colors.bright);
  const sortedCategories = Object.entries(summary.byCategory)
    .sort((a, b) => b[1] - a[1]);

  for (const [category, count] of sortedCategories) {
    const config = ERROR_PATTERNS[category] || { description: 'Other' };
    log(`  ${config.description}: ${count}`, colors.reset);
  }

  // By file (top 10)
  log('\n--- Top Files with Errors ---', colors.bright);
  const sortedFiles = Object.entries(summary.byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [file, count] of sortedFiles) {
    // Shorten file path for display
    const shortFile = file.replace(ROOT_DIR, '').replace(/^[/\\]/, '');
    log(`  ${shortFile}: ${count}`, colors.reset);
  }

  if (Object.keys(summary.byFile).length > 10) {
    log(`  ... and ${Object.keys(summary.byFile).length - 10} more files`, colors.gray);
  }

  // Suggestions
  if (!SUMMARY_ONLY && errors.length > 0) {
    log('\n--- Suggestions ---', colors.bright);

    const suggestions = new Set();
    for (const error of errors.slice(0, 20)) {
      if (error.suggestion) {
        suggestions.add(`${error.category}: ${error.suggestion}`);
      }
    }

    for (const suggestion of suggestions) {
      log(`  - ${suggestion}`, colors.yellow);
    }
  }

  log('\n' + '='.repeat(60), colors.cyan);
}

/**
 * Main function
 */
async function main() {
  log('Running TypeScript type check...', colors.cyan);

  const { success, output } = runTypeCheck();

  if (success) {
    log('\nNo TypeScript errors found!', colors.green);

    if (OUTPUT_JSON) {
      console.log(JSON.stringify({
        success: true,
        errors: [],
        summary: { total: 0, byCategory: {}, byFile: {}, byCode: {}, autoFixable: 0 },
      }, null, 2));
    }

    process.exit(0);
  }

  // Parse errors
  const errors = parseTypeScriptOutput(output);
  const summary = generateSummary(errors);

  if (OUTPUT_JSON) {
    const result = {
      success: false,
      errors: SUMMARY_ONLY ? [] : errors,
      summary,
    };
    console.log(JSON.stringify(result, null, 2));

    // Also write to file for CI consumption
    writeFileSync(join(ROOT_DIR, 'ts-errors.json'), JSON.stringify(result, null, 2));
  } else {
    printSummary(summary, errors);

    // Print individual errors if not summary only
    if (!SUMMARY_ONLY && errors.length > 0) {
      log('\n--- Error Details (first 20) ---', colors.bright);
      for (const error of errors.slice(0, 20)) {
        const shortFile = error.file.replace(ROOT_DIR, '').replace(/^[/\\]/, '');
        log(`\n${shortFile}:${error.line}:${error.column}`, colors.cyan);
        log(`  ${error.code}: ${error.message}`, colors.red);
        log(`  Category: ${error.description}`, colors.gray);
        if (error.autoFixable) {
          log(`  [Auto-fixable]`, colors.green);
        }
      }

      if (errors.length > 20) {
        log(`\n... and ${errors.length - 20} more errors`, colors.gray);
      }
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  if (!OUTPUT_JSON) {
    console.error(`Fatal error: ${error.message}`);
  } else {
    console.log(JSON.stringify({ error: error.message }, null, 2));
  }
  process.exit(1);
});
