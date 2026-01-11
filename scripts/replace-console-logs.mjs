#!/usr/bin/env node
/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */

/**
 * Script to replace console statements with the centralized logger utility
 *
 * This script:
 * 1. Scans TypeScript/JavaScript files for console statements
 * 2. Adds logger import if not present
 * 3. Replaces console.* calls with logger.* calls
 * 4. Handles special cases (tests, diagnostic utilities)
 *
 * Usage:
 *   node scripts/replace-console-logs.mjs [--dry-run] [--path <directory>]
 *
 * Options:
 *   --dry-run    Preview changes without modifying files
 *   --path       Specific directory to process (default: src)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const pathIndex = args.indexOf('--path');
const targetPath = pathIndex >= 0 ? args[pathIndex + 1] : 'src';

// Files to skip (contain intentional console statements)
const skipFiles = new Set([
  'src/lib/utils/logger.ts',
  'src/__tests__/helpers/render.tsx',
  'src/utils/diagnose-auth.ts', // Diagnostic utility
]);

// Patterns to identify console statements
const consolePattern = /console\.(log|info|warn|error|debug)\(/g;

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  consoleStatementsReplaced: 0,
  filesSkipped: 0,
  errors: 0,
};

/**
 * Check if a file should be processed
 */
function shouldProcessFile(filePath) {
  const relativePath = relative(rootDir, filePath).replace(/\\/g, '/');

  // Skip if in skip list
  if (skipFiles.has(relativePath)) {
    return false;
  }

  // Skip node_modules, dist, build directories
  if (relativePath.includes('node_modules') ||
      relativePath.includes('dist') ||
      relativePath.includes('build') ||
      relativePath.includes('.git')) {
    return false;
  }

  // Only process TypeScript and JavaScript files
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}

/**
 * Calculate relative import path for logger
 */
function getLoggerImportPath(filePath) {
  const relativePath = relative(dirname(filePath), join(rootDir, 'src/lib/utils/logger.ts'))
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

/**
 * Check if file already imports logger
 */
function hasLoggerImport(content) {
  return /import\s+.*logger.*from\s+['"].*logger['"]/.test(content);
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  const importPath = getLoggerImportPath(filePath);
  const loggerImport = `import { logger } from '${importPath}';`;

  // Find the last import statement (handling multiline imports)
  const lines = content.split('\n');
  let lastImportIndex = -1;
  let inMultilineImport = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
      continue;
    }

    // Only count lines that start with 'import ' at the beginning (no indentation for multiline)
    const isImportStart = /^import\s+/i.test(line);

    if (isImportStart) {
      inMultilineImport = true;
      braceCount = 0;
      lastImportIndex = i;

      // Count braces on this line
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Check if this is a complete import on one line
      if (line.includes(';') && braceCount === 0) {
        inMultilineImport = false;
      }
    } else if (inMultilineImport) {
      // Continue tracking multiline import
      lastImportIndex = i;

      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Check if multiline import is complete
      if (line.includes(';') || (trimmedLine.endsWith('}') && braceCount === 0)) {
        inMultilineImport = false;
      }
    } else if (lastImportIndex >= 0) {
      // We've passed all imports, stop looking
      break;
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after last import
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    // No imports found, add at the beginning (after any comments/directives)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && !line.startsWith('*/') && line !== "'use strict'") {
        insertIndex = i;
        break;
      }
    }
    lines.splice(insertIndex, 0, loggerImport);
  }

  return lines.join('\n');
}

/**
 * Replace console statements with logger
 */
function replaceConsoleStatements(content) {
  let replacementCount = 0;

  const replaced = content.replace(
    /console\.(log|info|warn|error|debug)\(/g,
    (match, method) => {
      replacementCount++;
      return `logger.${method}(`;
    }
  );

  return { content: replaced, count: replacementCount };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;

  try {
    const content = readFileSync(filePath, 'utf8');

    // Check if file has console statements
    if (!consolePattern.test(content)) {
      return;
    }

    // Reset regex state
    consolePattern.lastIndex = 0;

    let modifiedContent = content;

    // Add logger import if not present
    if (!hasLoggerImport(modifiedContent)) {
      modifiedContent = addLoggerImport(modifiedContent, filePath);
    }

    // Replace console statements
    const { content: replacedContent, count } = replaceConsoleStatements(modifiedContent);

    if (count > 0) {
      stats.consoleStatementsReplaced += count;
      stats.filesModified++;

      const relativePath = relative(rootDir, filePath);
      console.log(`  ✓ ${relativePath}: ${count} console statement(s) replaced`);

      if (!isDryRun) {
        writeFileSync(filePath, replacedContent, 'utf8');
      }
    }
  } catch (error) {
    stats.errors++;
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        processFile(fullPath);
      } else if (stat.isFile()) {
        stats.filesSkipped++;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔧 Console Statement Replacement Script\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'WRITE MODE'}`);
  console.log(`Target: ${targetPath}\n`);

  const startPath = join(rootDir, targetPath);

  if (!statSync(startPath).isDirectory()) {
    console.error(`Error: ${startPath} is not a directory`);
    process.exit(1);
  }

  console.log('Processing files...\n');
  processDirectory(startPath);

  console.log('\n📊 Summary:');
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Files modified: ${stats.filesModified}`);
  console.log(`  Console statements replaced: ${stats.consoleStatementsReplaced}`);
  console.log(`  Files skipped: ${stats.filesSkipped}`);
  console.log(`  Errors: ${stats.errors}`);

  if (isDryRun) {
    console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Replacement complete!');
  }

  console.log('\n📝 Note: Please review the changes and run type-check and tests:');
  console.log('  npm run type-check');
  console.log('  npm run test');
  console.log('  npm run lint\n');
}

main();
