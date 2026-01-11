#!/usr/bin/env node
/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */

/**
 * Script to replace console statements with the centralized logger utility
 *
 * This is a SIMPLER approach that:
 * 1. Only replaces console.* with logger.* (doesn't add imports)
 * 2. Reports which files need logger imports
 * 3. Then you can run eslint --fix to auto-add the imports
 *
 * Usage:
 *   node scripts/cleanup-console-logs.mjs [--dry-run]
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

// Files to skip
const skipFiles = new Set([
  'src/lib/utils/logger.ts',
  'src/__tests__/helpers/render.tsx',
  'src/utils/diagnose-auth.ts',
]);

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  consoleStatementsReplaced: 0,
  filesSkipped: 0,
  filesNeedingImport: [],
};

function shouldProcessFile(filePath) {
  const relativePath = relative(rootDir, filePath).replace(/\\/g, '/');

  if (skipFiles.has(relativePath)) {
    return false;
  }

  if (relativePath.includes('node_modules') ||
      relativePath.includes('dist') ||
      relativePath.includes('build') ||
      relativePath.includes('.git')) {
    return false;
  }

  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}

function hasLoggerImport(content) {
  return /import\s+.*logger.*from\s+['"].*logger['"]/.test(content);
}

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

function processFile(filePath) {
  stats.filesScanned++;

  try {
    const content = readFileSync(filePath, 'utf8');

    // Check if file has console statements
    if (!/console\.(log|info|warn|error|debug)\(/.test(content)) {
      return;
    }

    // Replace console statements
    const { content: replacedContent, count } = replaceConsoleStatements(content);

    if (count > 0) {
      stats.consoleStatementsReplaced += count;
      stats.filesModified++;

      const relativePath = relative(rootDir, filePath);

      // Check if logger import exists
      const needsImport = !hasLoggerImport(replacedContent);
      if (needsImport) {
        stats.filesNeedingImport.push(relativePath);
      }

      console.log(`  ✓ ${relativePath}: ${count} console statement(s) replaced${needsImport ? ' [needs import]' : ''}`);

      if (!isDryRun) {
        writeFileSync(filePath, replacedContent, 'utf8');
      }
    }
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
  }
}

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

function main() {
  console.log('\n🔧 Console Statement Cleanup Script\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'WRITE MODE'}\n`);

  const startPath = join(rootDir, 'src');

  console.log('Processing files...\n');
  processDirectory(startPath);

  console.log('\n📊 Summary:');
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Files modified: ${stats.filesModified}`);
  console.log(`  Console statements replaced: ${stats.consoleStatementsReplaced}`);
  console.log(`  Files needing logger import: ${stats.filesNeedingImport.length}`);
  console.log(`  Files skipped: ${stats.filesSkipped}`);

  if (isDryRun) {
    console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Replacement complete!');

    if (stats.filesNeedingImport.length > 0) {
      console.log('\n⚠️  The following files need logger imports added:');
      console.log('   (You can add them manually or use an IDE auto-import feature)\n');
      stats.filesNeedingImport.slice(0, 10).forEach(file => {
        console.log(`   - ${file}`);
      });
      if (stats.filesNeedingImport.length > 10) {
        console.log(`   ... and ${stats.filesNeedingImport.length - 10} more`);
      }
    }
  }

  console.log('\n📝 Next steps:');
  console.log('  1. Add logger imports to files that need them');
  console.log('  2. npm run type-check');
  console.log('  3. npm run lint');
  console.log('  4. npm run test\n');
}

main();
