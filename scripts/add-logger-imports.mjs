#!/usr/bin/env node

/**
 * Script to add logger imports to files that use logger but don't import it
 *
 * Usage:
 *   node scripts/add-logger-imports.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const skipFiles = new Set([
  'src/lib/utils/logger.ts',
  'src/__tests__/helpers/render.tsx',
  'src/utils/diagnose-auth.ts',
]);

const stats = {
  filesScanned: 0,
  importsAdded: 0,
  filesSkipped: 0,
};

function shouldProcessFile(filePath) {
  const relativePath = relative(rootDir, filePath).replace(/\\/g, '/');

  if (skipFiles.has(relativePath) ||
      relativePath.includes('node_modules') ||
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

function usesLogger(content) {
  return /\blogger\.(log|info|warn|error|debug|tagged|group|table|time|timeEnd|assert)\(/.test(content);
}

function getLoggerImportPath(filePath) {
  const relativePath = relative(dirname(filePath), join(rootDir, 'src/lib/utils/logger.ts'))
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function addLoggerImport(content, filePath) {
  const importPath = getLoggerImportPath(filePath);
  const loggerImport = `import { logger } from '${importPath}';\n`;

  const lines = content.split('\n');

  // Find the position of the last top-level import statement
  let lastImportLine = -1;
  let insideBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comments
    if (trimmed.includes('/*')) insideBlockComment = true;
    if (trimmed.includes('*/')) {
      insideBlockComment = false;
      continue;
    }

    // Skip lines inside comments
    if (insideBlockComment || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      continue;
    }

    // Check for import statement at the start of the line (not indented)
    if (/^import\s/.test(line)) {
      lastImportLine = i;

      // If it's a multiline import, find where it ends
      if (!line.includes(';') && !line.includes(' from ')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes(';') || lines[j].includes(' from ')) {
            lastImportLine = j;
            i = j;
            break;
          }
        }
      }
    }
    // If we hit non-import code (not a comment, not empty), stop
    else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && lastImportLine >= 0) {
      break;
    }
  }

  if (lastImportLine >= 0) {
    // Insert after the last import
    lines.splice(lastImportLine + 1, 0, loggerImport);
  } else {
    // No imports found - insert after file header comments
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Skip initial comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '*/') {
        continue;
      }
      insertIndex = i;
      break;
    }
    lines.splice(insertIndex, 0, loggerImport);
  }

  return lines.join('\n');
}

function processFile(filePath) {
  stats.filesScanned++;

  try {
    const content = readFileSync(filePath, 'utf8');

    // Check if file uses logger but doesn't import it
    if (!usesLogger(content) || hasLoggerImport(content)) {
      return;
    }

    const modifiedContent = addLoggerImport(content, filePath);
    const relativePath = relative(rootDir, filePath);

    stats.importsAdded++;
    console.log(`  ✓ ${relativePath}: Added logger import`);

    if (!isDryRun) {
      writeFileSync(filePath, modifiedContent, 'utf8');
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
  console.log('\n🔧 Logger Import Addition Script\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'WRITE MODE'}\n`);

  const startPath = join(rootDir, 'src');

  console.log('Processing files...\n');
  processDirectory(startPath);

  console.log('\n📊 Summary:');
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Imports added: ${stats.importsAdded}`);
  console.log(`  Files skipped: ${stats.filesSkipped}`);

  if (isDryRun) {
    console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Import addition complete!');
  }

  console.log('\n📝 Next steps:');
  console.log('  npm run type-check');
  console.log('  npm run lint');
  console.log('  npm run test\n');
}

main();
