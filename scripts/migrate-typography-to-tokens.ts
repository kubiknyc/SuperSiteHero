#!/usr/bin/env tsx
/* eslint-disable security/detect-non-literal-fs-filename */

/**
 * Automated Typography Migration Script
 *
 * This script automatically replaces inline typography styles with
 * semantic design system utility classes from DESIGN_SYSTEM.md
 *
 * Usage:
 *   npm run migrate:typography              # Dry run (preview changes)
 *   npm run migrate:typography -- --write   # Apply changes
 */

import * as fs from 'fs';
import * as path from 'path';

interface TypographyMapping {
  pattern: RegExp;
  replacement: string;
  description: string;
  category: 'heading' | 'inline-style' | 'body-text';
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

// Typography mappings based on DESIGN_SYSTEM.md
const TYPOGRAPHY_MAPPINGS: TypographyMapping[] = [
  // Heading elements without classes - add semantic classes
  // Page-level headings (h1)
  {
    pattern: /<h1(\s+className="[^"]*")>/g,
    replacement: '<h1$1 className="heading-page">',
    description: 'Add heading-page class to h1 if it has className',
    category: 'heading'
  },
  {
    pattern: /<h1>/g,
    replacement: '<h1 className="heading-page">',
    description: 'Add heading-page class to h1',
    category: 'heading'
  },

  // Section headings (h2)
  {
    pattern: /<h2(\s+className="[^"]*")>/g,
    replacement: '<h2$1 className="heading-section">',
    description: 'Add heading-section class to h2 if it has className',
    category: 'heading'
  },
  {
    pattern: /<h2>/g,
    replacement: '<h2 className="heading-section">',
    description: 'Add heading-section class to h2',
    category: 'heading'
  },

  // Subsection headings (h3)
  {
    pattern: /<h3(\s+className="[^"]*")>/g,
    replacement: '<h3$1 className="heading-subsection">',
    description: 'Add heading-subsection class to h3 if it has className',
    category: 'heading'
  },
  {
    pattern: /<h3>/g,
    replacement: '<h3 className="heading-subsection">',
    description: 'Add heading-subsection class to h3',
    category: 'heading'
  },

  // Card headings (h4)
  {
    pattern: /<h4(\s+className="[^"]*")>/g,
    replacement: '<h4$1 className="heading-card">',
    description: 'Add heading-card class to h4 if it has className',
    category: 'heading'
  },
  {
    pattern: /<h4>/g,
    replacement: '<h4 className="heading-card">',
    description: 'Add heading-card class to h4',
    category: 'heading'
  },

  // Inline fontSize styles
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]2\.25rem['"]\s*\}\}/g,
    replacement: 'className="text-4xl"',
    description: 'Replace fontSize: 2.25rem with text-4xl',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.875rem['"]\s*\}\}/g,
    replacement: 'className="text-3xl"',
    description: 'Replace fontSize: 1.875rem with text-3xl',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.5rem['"]\s*\}\}/g,
    replacement: 'className="text-2xl"',
    description: 'Replace fontSize: 1.5rem with text-2xl',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.25rem['"]\s*\}\}/g,
    replacement: 'className="text-xl"',
    description: 'Replace fontSize: 1.25rem with text-xl',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.125rem['"]\s*\}\}/g,
    replacement: 'className="text-lg"',
    description: 'Replace fontSize: 1.125rem with text-lg',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1rem['"]\s*\}\}/g,
    replacement: 'className="text-base"',
    description: 'Replace fontSize: 1rem with text-base',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]0\.875rem['"]\s*\}\}/g,
    replacement: 'className="text-sm"',
    description: 'Replace fontSize: 0.875rem with text-sm',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]0\.75rem['"]\s*\}\}/g,
    replacement: 'className="text-xs"',
    description: 'Replace fontSize: 0.75rem with text-xs',
    category: 'inline-style'
  },

  // Inline fontWeight styles
  {
    pattern: /style=\{\{\s*fontWeight:\s*['"]700['"]\s*\}\}/g,
    replacement: 'className="font-bold"',
    description: 'Replace fontWeight: 700 with font-bold',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontWeight:\s*['"]600['"]\s*\}\}/g,
    replacement: 'className="font-semibold"',
    description: 'Replace fontWeight: 600 with font-semibold',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontWeight:\s*['"]500['"]\s*\}\}/g,
    replacement: 'className="font-medium"',
    description: 'Replace fontWeight: 500 with font-medium',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontWeight:\s*['"]400['"]\s*\}\}/g,
    replacement: 'className="font-normal"',
    description: 'Replace fontWeight: 400 with font-normal',
    category: 'inline-style'
  },

  // Combined styles (fontSize + fontWeight)
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]2\.25rem['"],\s*fontWeight:\s*['"]700['"]\s*\}\}/g,
    replacement: 'className="text-4xl font-bold"',
    description: 'Replace fontSize: 2.25rem + fontWeight: 700 with text-4xl font-bold',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.875rem['"],\s*fontWeight:\s*['"]700['"]\s*\}\}/g,
    replacement: 'className="text-3xl font-bold"',
    description: 'Replace fontSize: 1.875rem + fontWeight: 700 with text-3xl font-bold',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.5rem['"],\s*fontWeight:\s*['"]600['"]\s*\}\}/g,
    replacement: 'className="text-2xl font-semibold"',
    description: 'Replace fontSize: 1.5rem + fontWeight: 600 with text-2xl font-semibold',
    category: 'inline-style'
  },
  {
    pattern: /style=\{\{\s*fontSize:\s*['"]1\.25rem['"],\s*fontWeight:\s*['"]600['"]\s*\}\}/g,
    replacement: 'className="text-xl font-semibold"',
    description: 'Replace fontSize: 1.25rem + fontWeight: 600 with text-xl font-semibold',
    category: 'inline-style'
  },
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

// Migrate typography in a single file
function migrateFile(filePath: string, write: boolean = false): MigrationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  const replacements: MigrationResult['replacements'] = [];

  // Apply all typography mappings
  TYPOGRAPHY_MAPPINGS.forEach(mapping => {
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
async function migrateTypography() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const srcPath = path.join(process.cwd(), 'src');

  console.log('📝 Typography Migration Script\n');
  console.log(`Mode: ${write ? '✍️  WRITE' : '👀 DRY RUN'}`);
  console.log(`Scanning: ${srcPath}\n`);

  // Get all files
  const files = getAllFiles(srcPath);
  console.log(`Found ${files.length} TypeScript files\n`);

  // Process files
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
    console.log('✨ No typography violations found! All files are compliant.\n');
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
    heading: 0,
    'inline-style': 0,
    'body-text': 0
  };

  results.forEach(result => {
    result.replacements.forEach(replacement => {
      const mapping = TYPOGRAPHY_MAPPINGS.find(m =>
        replacement.new.includes(m.replacement)
      );
      if (mapping) {
        categoryStats[mapping.category]++;
      }
    });
  });

  console.log('Changes by Category:\n');
  console.log(`  Headings:      ${categoryStats.heading}`);
  console.log(`  Inline Styles: ${categoryStats['inline-style']}`);
  console.log(`  Body Text:     ${categoryStats['body-text']}\n`);

  if (!write) {
    console.log('═══════════════════════════════════════════════');
    console.log('           DRY RUN - NO CHANGES MADE           ');
    console.log('═══════════════════════════════════════════════\n');
    console.log('To apply these changes, run:');
    console.log('  npm run migrate:typography -- --write\n');
  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('          ✅ CHANGES APPLIED SUCCESSFULLY        ');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('  1. Run type check: npm run type-check');
    console.log('  2. Run tests: npm test');
    console.log('  3. Run audit: npm run audit:typography');
    console.log('  4. Review changes: git diff\n');
  }

  // Generate detailed report
  const reportPath = path.join(process.cwd(), 'audit-reports', 'typography-migration-report.json');
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
migrateTypography().catch(console.error);
