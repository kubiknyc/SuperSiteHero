#!/usr/bin/env node
/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */
/**
 * Design System Grid Pattern Audit Script
 * Detects inconsistent breakpoint usage and non-standard grid configurations
 */

import fs from 'fs';
import path from 'path';

interface GridViolation {
  file: string;
  line: number;
  type: 'inconsistent-breakpoint' | 'non-standard-gap' | 'missing-mobile-first' | 'mixed-breakpoints';
  pattern: string;
  context: string;
  suggestion?: string;
}

interface GridPattern {
  file: string;
  line: number;
  pattern: string;
  breakpoints: string[];
  columns: string[];
  gap?: string;
}

interface FileViolations {
  file: string;
  violations: GridViolation[];
  violationCount: number;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: {
    inconsistentBreakpoint: number;
    nonStandardGap: number;
    missingMobileFirst: number;
    mixedBreakpoints: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
  allGridPatterns: GridPattern[];
  breakpointUsage: { [key: string]: number };
  gapUsage: { [key: string]: number };
  standardPatterns: string[];
}

// Standard grid patterns to recommend
const standardPatterns = {
  // 4-column stats grid
  statsFour: 'grid grid-cols-2 md:grid-cols-4 gap-4',
  // 2-column form grid
  formTwo: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  // 3-column card grid
  cardsThree: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  // 2-column card grid
  cardsTwo: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  // Master-detail layout
  masterDetail: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
};

// Standard breakpoints and their expected usage
const standardBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];
const preferredBreakpoints = {
  statsGrid: 'md',    // Stats should switch at md
  formGrid: 'md',     // Forms should switch at md
  cardGrid: ['sm', 'lg'], // Cards can use sm for 2-col, lg for 3-col
};

// Standard gap values
const standardGaps = ['gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8'];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', 'dist', 'build', '__tests__', '.git'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.tsx') &&
          !file.endsWith('.test.tsx') &&
          !file.endsWith('.spec.tsx') &&
          !file.includes('stories')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function extractGridPatterns(content: string, filePath: string): GridPattern[] {
  const patterns: GridPattern[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Look for grid class patterns
    const gridMatch = line.match(/className\s*=\s*['"`]([^'"`]*grid[^'"`]*)['"`]/);
    if (gridMatch) {
      const classString = gridMatch[1];

      // Extract breakpoints used
      const breakpoints: string[] = [];
      const breakpointMatches = classString.matchAll(/(sm|md|lg|xl|2xl):/g);
      for (const match of breakpointMatches) {
        if (!breakpoints.includes(match[1])) {
          breakpoints.push(match[1]);
        }
      }

      // Extract column configurations
      const columns: string[] = [];
      const colMatches = classString.matchAll(/(?:(sm|md|lg|xl|2xl):)?grid-cols-(\d+)/g);
      for (const match of colMatches) {
        columns.push(match[0]);
      }

      // Extract gap
      const gapMatch = classString.match(/gap-(\d+)/);
      const gap = gapMatch ? `gap-${gapMatch[1]}` : undefined;

      if (columns.length > 0) {
        patterns.push({
          file: filePath,
          line: index + 1,
          pattern: classString,
          breakpoints,
          columns,
          gap,
        });
      }
    }
  });

  return patterns;
}

function analyzeViolations(pattern: GridPattern): GridViolation[] {
  const violations: GridViolation[] = [];
  const { file, line, pattern: classString, breakpoints, columns, gap } = pattern;

  // Check for missing mobile-first (should start with grid-cols-1)
  if (columns.length > 0 && !columns[0].startsWith('grid-cols-1') && !columns[0].includes(':')) {
    // Check if there's no base column count
    const hasBaseColumn = columns.some(c => !c.includes(':'));
    if (!hasBaseColumn) {
      violations.push({
        file,
        line,
        type: 'missing-mobile-first',
        pattern: classString,
        context: columns.join(' '),
        suggestion: 'Add grid-cols-1 as base for mobile-first design',
      });
    }
  }

  // Check for mixed breakpoint usage (e.g., using both md and lg for similar purposes)
  if (breakpoints.includes('md') && breakpoints.includes('lg')) {
    // This might be intentional for progressive enhancement, but flag for review
    const mdCols = columns.find(c => c.includes('md:'));
    const lgCols = columns.find(c => c.includes('lg:'));
    if (mdCols && lgCols) {
      const mdCount = mdCols.match(/grid-cols-(\d+)/)?.[1];
      const lgCount = lgCols.match(/grid-cols-(\d+)/)?.[1];
      // If md and lg have same column count, it's redundant
      if (mdCount === lgCount) {
        violations.push({
          file,
          line,
          type: 'mixed-breakpoints',
          pattern: classString,
          context: `${mdCols} and ${lgCols}`,
          suggestion: 'Remove redundant breakpoint - md and lg have same column count',
        });
      }
    }
  }

  // Check for non-standard gap values
  if (gap && !standardGaps.includes(gap)) {
    violations.push({
      file,
      line,
      type: 'non-standard-gap',
      pattern: classString,
      context: gap,
      suggestion: `Use standard gap values: ${standardGaps.join(', ')}`,
    });
  }

  // Check for inconsistent breakpoint choices
  // If it's a 4-column grid, it should use md breakpoint
  if (columns.some(c => c.includes('grid-cols-4'))) {
    if (!breakpoints.includes('md') && breakpoints.includes('lg')) {
      violations.push({
        file,
        line,
        type: 'inconsistent-breakpoint',
        pattern: classString,
        context: 'Stats-style 4-column grid using lg instead of md',
        suggestion: 'Use md:grid-cols-4 for 4-column grids (stats/metrics)',
      });
    }
  }

  return violations;
}

function calculateUsageStats(patterns: GridPattern[]): { breakpoints: { [key: string]: number }, gaps: { [key: string]: number } } {
  const breakpoints: { [key: string]: number } = {};
  const gaps: { [key: string]: number } = {};

  patterns.forEach(pattern => {
    pattern.breakpoints.forEach(bp => {
      breakpoints[bp] = (breakpoints[bp] || 0) + 1;
    });
    if (pattern.gap) {
      gaps[pattern.gap] = (gaps[pattern.gap] || 0) + 1;
    }
  });

  return { breakpoints, gaps };
}

function generateMarkdownReport(report: AuditReport, outputPath: string): void {
  const lines: string[] = [];

  lines.push('# Design System Grid Pattern Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}\n`);

  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Files Scanned | ${report.filesScanned} |`);
  lines.push(`| Files with Violations | ${report.filesWithViolations} |`);
  lines.push(`| Total Violations | ${report.totalViolations} |`);
  lines.push(`| Total Grid Patterns Found | ${report.allGridPatterns.length} |`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  lines.push(`| **Compliance Score** | **${complianceScore}%** |\n`);

  lines.push('## Violations by Type\n');
  lines.push('| Type | Count |');
  lines.push('|------|-------|');
  lines.push(`| Missing Mobile-First | ${report.violationsByType.missingMobileFirst} |`);
  lines.push(`| Inconsistent Breakpoint | ${report.violationsByType.inconsistentBreakpoint} |`);
  lines.push(`| Mixed Breakpoints | ${report.violationsByType.mixedBreakpoints} |`);
  lines.push(`| Non-Standard Gap | ${report.violationsByType.nonStandardGap} |\n`);

  lines.push('## Breakpoint Usage\n');
  lines.push('| Breakpoint | Usage Count |');
  lines.push('|------------|-------------|');
  Object.entries(report.breakpointUsage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([bp, count]) => {
      lines.push(`| ${bp} | ${count} |`);
    });
  lines.push('');

  lines.push('## Gap Usage\n');
  lines.push('| Gap | Usage Count |');
  lines.push('|-----|-------------|');
  Object.entries(report.gapUsage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([gap, count]) => {
      lines.push(`| ${gap} | ${count} |`);
    });
  lines.push('');

  if (report.topViolators.length > 0) {
    lines.push('## Top 15 Files Needing Attention\n');
    lines.push('| File | Violations |');
    lines.push('|------|------------|');
    report.topViolators.slice(0, 15).forEach(file => {
      lines.push(`| ${file.file} | ${file.violationCount} |`);
    });
    lines.push('');
  }

  lines.push('## Standard Grid Patterns (Recommended)\n');
  lines.push('```tsx');
  lines.push('// Stats/Metrics Grid (4 columns)');
  lines.push(`<div className="${standardPatterns.statsFour}">`);
  lines.push('');
  lines.push('// Form Fields Grid (2 columns)');
  lines.push(`<div className="${standardPatterns.formTwo}">`);
  lines.push('');
  lines.push('// Card Grid (3 columns)');
  lines.push(`<div className="${standardPatterns.cardsThree}">`);
  lines.push('');
  lines.push('// Card Grid (2 columns)');
  lines.push(`<div className="${standardPatterns.cardsTwo}">`);
  lines.push('');
  lines.push('// Master-Detail Layout');
  lines.push(`<div className="${standardPatterns.masterDetail}">`);
  lines.push('```\n');

  lines.push('## Breakpoint Guidelines\n');
  lines.push('| Use Case | Recommended Breakpoint |');
  lines.push('|----------|----------------------|');
  lines.push('| Stats/Metrics (4 cols) | md:grid-cols-4 |');
  lines.push('| Form Fields (2 cols) | md:grid-cols-2 |');
  lines.push('| Card Grid (2 cols) | sm:grid-cols-2 or md:grid-cols-2 |');
  lines.push('| Card Grid (3 cols) | sm:grid-cols-2 lg:grid-cols-3 |');
  lines.push('| Sidebar Layout | lg:grid-cols-3 or lg:grid-cols-4 |\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`✓ Markdown report saved to: ${outputPath}`);
}

function generateJsonReport(report: AuditReport, outputPath: string): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✓ JSON report saved to: ${outputPath}`);
}

async function runAudit(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Design System Grid Pattern Audit');
  console.log('═══════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const files = getAllFiles('src');
  console.log(`→ Found ${files.length} files to scan\n`);

  const allGridPatterns: GridPattern[] = [];
  const fileViolations: FileViolations[] = [];
  let totalViolations = 0;

  files.forEach((file, index) => {
    const content = fs.readFileSync(file, 'utf-8');
    const patterns = extractGridPatterns(content, file);
    allGridPatterns.push(...patterns);

    const violations: GridViolation[] = [];
    patterns.forEach(pattern => {
      violations.push(...analyzeViolations(pattern));
    });

    if (violations.length > 0) {
      fileViolations.push({ file, violations, violationCount: violations.length });
      totalViolations += violations.length;
    }

    if ((index + 1) % 200 === 0) {
      console.log(`  → Progress: ${index + 1}/${files.length} files scanned`);
    }
  });

  const { breakpoints: breakpointUsage, gaps: gapUsage } = calculateUsageStats(allGridPatterns);
  const topViolators = [...fileViolations].sort((a, b) => b.violationCount - a.violationCount);

  const violationsByType = {
    inconsistentBreakpoint: 0,
    nonStandardGap: 0,
    missingMobileFirst: 0,
    mixedBreakpoints: 0,
  };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'inconsistent-breakpoint') {violationsByType.inconsistentBreakpoint++;}
      else if (v.type === 'non-standard-gap') {violationsByType.nonStandardGap++;}
      else if (v.type === 'missing-mobile-first') {violationsByType.missingMobileFirst++;}
      else if (v.type === 'mixed-breakpoints') {violationsByType.mixedBreakpoints++;}
    });
  });

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    filesScanned: files.length,
    filesWithViolations: fileViolations.length,
    totalViolations,
    violationsByType,
    fileViolations,
    topViolators,
    allGridPatterns,
    breakpointUsage,
    gapUsage,
    standardPatterns: Object.values(standardPatterns),
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Audit Results');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`Files scanned: ${report.filesScanned}`);
  console.log(`Files with violations: ${report.filesWithViolations}`);
  console.log(`Total violations: ${report.totalViolations}`);
  console.log(`Total grid patterns found: ${report.allGridPatterns.length}`);
  console.log(`\nViolations by type:`);
  console.log(`  - Missing mobile-first: ${violationsByType.missingMobileFirst}`);
  console.log(`  - Inconsistent breakpoint: ${violationsByType.inconsistentBreakpoint}`);
  console.log(`  - Mixed breakpoints: ${violationsByType.mixedBreakpoints}`);
  console.log(`  - Non-standard gap: ${violationsByType.nonStandardGap}`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log(`\nCompliance Score: ${complianceScore}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${elapsed}s\n`);

  generateJsonReport(report, 'audit-reports/grid-patterns.json');
  generateMarkdownReport(report, 'audit-reports/grid-patterns.md');

  console.log('\n═══════════════════════════════════════════════════\n');
}

runAudit().catch(console.error);
