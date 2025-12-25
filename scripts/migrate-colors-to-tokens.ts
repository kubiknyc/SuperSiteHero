#!/usr/bin/env tsx

/**
 * Automated Color Migration Script
 *
 * This script automatically replaces hard-coded Tailwind color classes
 * with semantic design system tokens from src/lib/theme/tokens.ts
 *
 * Usage:
 *   npm run migrate:colors              # Dry run (preview changes)
 *   npm run migrate:colors -- --write   # Apply changes
 */

import * as fs from 'fs';
import * as path from 'path';

interface ColorMapping {
  pattern: RegExp;
  replacement: string;
  description: string;
  category: 'background' | 'text' | 'border' | 'other';
}

interface MigrationResult {
  filePath: string;
  changes: number;
  replacements: Array<{
    line: number;
    old: string;
    new: string;
  }>;
}

// Semantic color token mappings based on DESIGN_SYSTEM.md
const COLOR_MAPPINGS: ColorMapping[] = [
  // Primary colors (blue)
  { pattern: /\bbg-blue-600\b/g, replacement: 'bg-primary', description: 'Primary background', category: 'background' },
  { pattern: /\bbg-blue-700\b/g, replacement: 'bg-primary-hover', description: 'Primary hover background', category: 'background' },
  { pattern: /\btext-blue-600\b/g, replacement: 'text-primary', description: 'Primary text', category: 'text' },
  { pattern: /\btext-blue-700\b/g, replacement: 'text-primary-hover', description: 'Primary hover text', category: 'text' },
  { pattern: /\bborder-blue-600\b/g, replacement: 'border-primary', description: 'Primary border', category: 'border' },

  // Success colors (green)
  { pattern: /\bbg-green-600\b/g, replacement: 'bg-success', description: 'Success background', category: 'background' },
  { pattern: /\bbg-green-50\b/g, replacement: 'bg-success-light', description: 'Success light background', category: 'background' },
  { pattern: /\btext-green-600\b/g, replacement: 'text-success', description: 'Success text', category: 'text' },
  { pattern: /\btext-green-700\b/g, replacement: 'text-success-dark', description: 'Success dark text', category: 'text' },
  { pattern: /\bborder-green-600\b/g, replacement: 'border-success', description: 'Success border', category: 'border' },

  // Warning colors (yellow/amber)
  { pattern: /\bbg-yellow-500\b/g, replacement: 'bg-warning', description: 'Warning background', category: 'background' },
  { pattern: /\bbg-amber-500\b/g, replacement: 'bg-warning', description: 'Warning background', category: 'background' },
  { pattern: /\bbg-yellow-50\b/g, replacement: 'bg-warning-light', description: 'Warning light background', category: 'background' },
  { pattern: /\bbg-amber-50\b/g, replacement: 'bg-warning-light', description: 'Warning light background', category: 'background' },
  { pattern: /\btext-yellow-600\b/g, replacement: 'text-warning', description: 'Warning text', category: 'text' },
  { pattern: /\btext-amber-600\b/g, replacement: 'text-warning', description: 'Warning text', category: 'text' },
  { pattern: /\bborder-yellow-500\b/g, replacement: 'border-warning', description: 'Warning border', category: 'border' },
  { pattern: /\bborder-amber-500\b/g, replacement: 'border-warning', description: 'Warning border', category: 'border' },

  // Error/Danger colors (red)
  { pattern: /\bbg-red-600\b/g, replacement: 'bg-error', description: 'Error background', category: 'background' },
  { pattern: /\bbg-red-50\b/g, replacement: 'bg-error-light', description: 'Error light background', category: 'background' },
  { pattern: /\btext-red-600\b/g, replacement: 'text-error', description: 'Error text', category: 'text' },
  { pattern: /\btext-red-700\b/g, replacement: 'text-error-dark', description: 'Error dark text', category: 'text' },
  { pattern: /\bborder-red-600\b/g, replacement: 'border-error', description: 'Error border', category: 'border' },

  // Info colors (cyan/sky)
  { pattern: /\bbg-cyan-600\b/g, replacement: 'bg-info', description: 'Info background', category: 'background' },
  { pattern: /\bbg-sky-600\b/g, replacement: 'bg-info', description: 'Info background', category: 'background' },
  { pattern: /\bbg-cyan-50\b/g, replacement: 'bg-info-light', description: 'Info light background', category: 'background' },
  { pattern: /\bbg-sky-50\b/g, replacement: 'bg-info-light', description: 'Info light background', category: 'background' },
  { pattern: /\btext-cyan-600\b/g, replacement: 'text-info', description: 'Info text', category: 'text' },
  { pattern: /\btext-sky-600\b/g, replacement: 'text-info', description: 'Info text', category: 'text' },
  { pattern: /\bborder-cyan-600\b/g, replacement: 'border-info', description: 'Info border', category: 'border' },
  { pattern: /\bborder-sky-600\b/g, replacement: 'border-info', description: 'Info border', category: 'border' },

  // Neutral backgrounds
  { pattern: /\bbg-gray-50\b/g, replacement: 'bg-surface', description: 'Surface background', category: 'background' },
  { pattern: /\bbg-white\b/g, replacement: 'bg-card', description: 'Card background', category: 'background' },
  { pattern: /\bbg-gray-100\b/g, replacement: 'bg-muted', description: 'Muted background', category: 'background' },

  // Text colors
  { pattern: /\btext-gray-900\b/g, replacement: 'text-foreground', description: 'Primary text', category: 'text' },
  { pattern: /\btext-gray-700\b/g, replacement: 'text-secondary', description: 'Secondary text', category: 'text' },
  { pattern: /\btext-gray-500\b/g, replacement: 'text-muted', description: 'Muted text', category: 'text' },
  { pattern: /\btext-gray-400\b/g, replacement: 'text-disabled', description: 'Disabled text', category: 'text' },

  // Borders
  { pattern: /\bborder-gray-200\b/g, replacement: 'border-border', description: 'Default border', category: 'border' },
  { pattern: /\bborder-gray-300\b/g, replacement: 'border-input', description: 'Input border', category: 'border' },
];

// Get all TypeScript/TSX files recursively
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      // Skip these directories
      if (['node_modules', 'dist', 'build', '.git', '__tests__', 'test-results', 'e2e', 'scripts'].includes(file)) {
        return;
      }
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      // Only process .ts and .tsx files (not test files)
      if ((file.endsWith('.ts') || file.endsWith('.tsx')) &&
          !file.endsWith('.test.ts') &&
          !file.endsWith('.test.tsx') &&
          !file.endsWith('.spec.ts') &&
          !file.endsWith('.spec.tsx') &&
          !file.includes('audit-') &&
          !file.includes('migrate-')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

// Migrate colors in a single file
function migrateFile(filePath: string, write: boolean = false): MigrationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  const replacements: MigrationResult['replacements'] = [];

  // Apply all color mappings
  COLOR_MAPPINGS.forEach(mapping => {
    const matches = content.match(mapping.pattern);
    if (matches) {
      // Track line numbers for each replacement
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lineMatches = line.match(mapping.pattern);
        if (lineMatches) {
          lineMatches.forEach(match => {
            replacements.push({
              line: index + 1,
              old: match,
              new: mapping.replacement
            });
          });
        }
      });

      // Apply replacement
      newContent = newContent.replace(mapping.pattern, mapping.replacement);
    }
  });

  // Write changes if requested
  if (write && replacements.length > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return {
    filePath,
    changes: replacements.length,
    replacements
  };
}

// Main migration function
async function migrateColors() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const srcPath = path.join(process.cwd(), 'src');

  console.log('🎨 Color Migration Script\n');
  console.log(`Mode: ${write ? '✍️  WRITE' : '👀 DRY RUN'}`);
  console.log(`Scanning: ${srcPath}\n`);

  // Get all files
  const files = getAllFiles(srcPath);
  console.log(`Found ${files.length} TypeScript files\n`);

  // Process files
  const results: MigrationResult[] = [];
  let processedCount = 0;

  files.forEach((file, index) => {
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

  // Summary
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  const filesChanged = results.length;

  console.log('═══════════════════════════════════════════════');
  console.log('                   SUMMARY                     ');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`Total files scanned: ${files.length}`);
  console.log(`Files with changes:  ${filesChanged}`);
  console.log(`Total replacements:  ${totalChanges}\n`);

  if (totalChanges === 0) {
    console.log('✨ No color violations found! All files are compliant.\n');
    return;
  }

  // Show top 10 files with most changes
  const topFiles = results
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 10);

  console.log('Top 10 Files with Most Changes:\n');
  topFiles.forEach((result, index) => {
    const relativePath = path.relative(process.cwd(), result.filePath);
    console.log(`${index + 1}. ${relativePath}`);
    console.log(`   ${result.changes} replacements\n`);
  });

  // Show category breakdown
  const categoryStats = {
    background: 0,
    text: 0,
    border: 0,
    other: 0
  };

  results.forEach(result => {
    result.replacements.forEach(replacement => {
      const mapping = COLOR_MAPPINGS.find(m =>
        replacement.new === m.replacement
      );
      if (mapping) {
        categoryStats[mapping.category]++;
      }
    });
  });

  console.log('Changes by Category:\n');
  console.log(`  Background: ${categoryStats.background}`);
  console.log(`  Text:       ${categoryStats.text}`);
  console.log(`  Border:     ${categoryStats.border}`);
  console.log(`  Other:      ${categoryStats.other}\n`);

  if (!write) {
    console.log('═══════════════════════════════════════════════');
    console.log('           DRY RUN - NO CHANGES MADE           ');
    console.log('═══════════════════════════════════════════════\n');
    console.log('To apply these changes, run:');
    console.log('  npm run migrate:colors -- --write\n');
  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('          ✅ CHANGES APPLIED SUCCESSFULLY        ');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('  1. Run type check: npm run typecheck');
    console.log('  2. Run tests: npm test');
    console.log('  3. Run audit: npm run audit:colors');
    console.log('  4. Review changes: git diff\n');
  }

  // Generate detailed report
  const reportPath = path.join(process.cwd(), 'audit-reports', 'color-migration-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    mode: write ? 'write' : 'dry-run',
    totalFiles: files.length,
    filesChanged,
    totalChanges,
    categoryStats,
    topFiles: topFiles.map(r => ({
      file: path.relative(process.cwd(), r.filePath),
      changes: r.changes
    })),
    allChanges: results.map(r => ({
      file: path.relative(process.cwd(), r.filePath),
      changes: r.changes,
      replacements: r.replacements
    }))
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Detailed report saved: ${path.relative(process.cwd(), reportPath)}\n`);
}

// Run migration
migrateColors().catch(console.error);
