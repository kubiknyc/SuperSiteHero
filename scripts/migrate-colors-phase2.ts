#!/usr/bin/env tsx
/* eslint-disable security/detect-non-literal-fs-filename */

/**
 * Phase 2 Color Migration Script
 *
 * Handles remaining color violations not covered in Phase 1:
 * - Gray scale variants (gray-100, gray-200, etc.)
 * - Slate colors (slate-900, slate-800, etc.)
 * - Color-specific shades (blue-100, red-500, etc.)
 * - Dark mode variant patterns
 *
 * Usage:
 *   npm run migrate:colors:phase2              # Dry run
 *   npm run migrate:colors:phase2 -- --write   # Apply changes
 */

import * as fs from 'fs';
import * as path from 'path';

interface ColorMapping {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface MigrationResult {
  filePath: string;
  changes: number;
}

// Phase 2 mappings for remaining color patterns
const COLOR_MAPPINGS_PHASE2: ColorMapping[] = [
  // Gray scale backgrounds
  { pattern: /\bbg-gray-100\b/g, replacement: 'bg-muted', description: 'bg-gray-100 → bg-muted' },
  { pattern: /\bbg-gray-200\b/g, replacement: 'bg-muted', description: 'bg-gray-200 → bg-muted' },
  { pattern: /\bbg-gray-800\b/g, replacement: 'bg-surface', description: 'bg-gray-800 → bg-surface (dark)' },
  { pattern: /\bbg-gray-900\b/g, replacement: 'bg-background', description: 'bg-gray-900 → bg-background (dark)' },

  // Gray scale text
  { pattern: /\btext-gray-600\b/g, replacement: 'text-secondary', description: 'text-gray-600 → text-secondary' },
  { pattern: /\btext-gray-800\b/g, replacement: 'text-foreground', description: 'text-gray-800 → text-foreground' },

  // Gray scale borders
  { pattern: /\bborder-gray-100\b/g, replacement: 'border-border', description: 'border-gray-100 → border-border' },

  // Slate colors (commonly used in dark themes)
  { pattern: /\bbg-slate-900\b/g, replacement: 'bg-background', description: 'bg-slate-900 → bg-background (dark)' },
  { pattern: /\bbg-slate-800\b/g, replacement: 'bg-surface', description: 'bg-slate-800 → bg-surface (dark)' },
  { pattern: /\bbg-slate-700\b/g, replacement: 'bg-muted', description: 'bg-slate-700 → bg-muted (dark)' },
  { pattern: /\btext-slate-400\b/g, replacement: 'text-muted', description: 'text-slate-400 → text-muted' },
  { pattern: /\btext-slate-900\b/g, replacement: 'text-foreground', description: 'text-slate-900 → text-foreground' },
  { pattern: /\bborder-slate-600\b/g, replacement: 'border-border', description: 'border-slate-600 → border-border' },

  // Specific color shades that map to semantic tokens
  { pattern: /\btext-red-500\b/g, replacement: 'text-error', description: 'text-red-500 → text-error' },
  { pattern: /\btext-blue-500\b/g, replacement: 'text-primary', description: 'text-blue-500 → text-primary' },
  { pattern: /\btext-green-500\b/g, replacement: 'text-success', description: 'text-green-500 → text-success' },
  { pattern: /\btext-yellow-500\b/g, replacement: 'text-warning', description: 'text-yellow-500 → text-warning' },
  { pattern: /\btext-amber-500\b/g, replacement: 'text-warning', description: 'text-amber-500 → text-warning' },

  { pattern: /\bbg-red-100\b/g, replacement: 'bg-error-light', description: 'bg-red-100 → bg-error-light' },
  { pattern: /\bbg-blue-100\b/g, replacement: 'bg-info-light', description: 'bg-blue-100 → bg-info-light' },
  { pattern: /\bbg-green-100\b/g, replacement: 'bg-success-light', description: 'bg-green-100 → bg-success-light' },
  { pattern: /\bbg-yellow-100\b/g, replacement: 'bg-warning-light', description: 'bg-yellow-100 → bg-warning-light' },

  { pattern: /\bbg-emerald-500\b/g, replacement: 'bg-success', description: 'bg-emerald-500 → bg-success' },

  // Dark mode patterns (preserve existing dark: prefix but fix the color)
  { pattern: /dark:bg-gray-800\b/g, replacement: 'dark:bg-surface', description: 'dark:bg-gray-800 → dark:bg-surface' },
  { pattern: /dark:bg-gray-700\b/g, replacement: 'dark:bg-muted', description: 'dark:bg-gray-700 → dark:bg-muted' },
  { pattern: /dark:text-gray-400\b/g, replacement: 'dark:text-muted', description: 'dark:text-gray-400 → dark:text-muted' },
  { pattern: /dark:border-gray-800\b/g, replacement: 'dark:border-border', description: 'dark:border-gray-800 → dark:border-border' },
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git', '__tests__', 'test-results', 'e2e', 'scripts', 'audit-reports'].includes(file)) {
        return;
      }
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      if ((file.endsWith('.ts') || file.endsWith('.tsx')) &&
          !file.endsWith('.test.ts') &&
          !file.endsWith('.test.tsx') &&
          !file.endsWith('.spec.ts') &&
          !file.endsWith('.spec.tsx') &&
          !file.includes('audit-') &&
          !file.includes('migrate-') &&
          !file.includes('DesignConceptsDemo') && // Exclude design demo files
          !file.includes('DemoPage')) {           // Exclude demo pages
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function migrateFile(filePath: string, write: boolean = false): MigrationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let changes = 0;

  COLOR_MAPPINGS_PHASE2.forEach(mapping => {
    const matches = newContent.match(mapping.pattern);
    if (matches) {
      changes += matches.length;
      newContent = newContent.replace(mapping.pattern, mapping.replacement);
    }
  });

  if (write && changes > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { filePath, changes };
}

async function migrateColorsPhase2() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const srcPath = path.join(process.cwd(), 'src');

  console.log('🎨 Color Migration Phase 2\n');
  console.log(`Mode: ${write ? '✍️  WRITE' : '👀 DRY RUN'}`);
  console.log(`Scanning: ${srcPath}\n`);

  const files = getAllFiles(srcPath);
  console.log(`Found ${files.length} TypeScript files\n`);

  const results: MigrationResult[] = [];
  let processedCount = 0;

  files.forEach((file) => {
    const result = migrateFile(file, write);

    if (result.changes > 0) {
      results.push(result);
    }

    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`Processed ${processedCount}/${files.length} files...`);
    }
  });

  console.log(`\n✅ Processed ${files.length} files\n`);

  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  const filesChanged = results.length;

  console.log('═══════════════════════════════════════════════');
  console.log('                   SUMMARY                     ');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`Total files scanned: ${files.length}`);
  console.log(`Files with changes:  ${filesChanged}`);
  console.log(`Total replacements:  ${totalChanges}\n`);

  if (totalChanges === 0) {
    console.log('✨ No Phase 2 violations found!\n');
    return;
  }

  const topFiles = results
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 10);

  console.log('Top 10 Files with Most Changes:\n');
  topFiles.forEach((result, index) => {
    const relativePath = path.relative(process.cwd(), result.filePath);
    console.log(`${index + 1}. ${relativePath} (${result.changes} changes)`);
  });
  console.log();

  if (!write) {
    console.log('═══════════════════════════════════════════════');
    console.log('           DRY RUN - NO CHANGES MADE           ');
    console.log('═══════════════════════════════════════════════\n');
    console.log('To apply these changes, run:');
    console.log('  npm run migrate:colors:phase2 -- --write\n');
  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('          ✅ CHANGES APPLIED SUCCESSFULLY        ');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('  1. Run type check: npm run type-check');
    console.log('  2. Run audit: npm run audit:colors\n');
  }
}

migrateColorsPhase2().catch(console.error);
