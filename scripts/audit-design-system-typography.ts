#!/usr/bin/env node
/**
 * Design System Typography Compliance Audit Script
 * Scans all TSX files for typography violations
 */

import fs from 'fs';
import path from 'path';

interface TypographyViolation {
  file: string;
  line: number;
  type: 'inline-font-size' | 'inline-font-weight' | 'inline-line-height' | 'heading-without-class' | 'missing-typography-class';
  violation: string;
  context: string;
  suggestion?: string;
}

interface FileViolations {
  file: string;
  violations: TypographyViolation[];
  violationCount: number;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: {
    inlineFontSize: number;
    inlineFontWeight: number;
    inlineLineHeight: number;
    headingWithoutClass: number;
    missingTypographyClass: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
}

const patterns = {
  inlineFontSize: /style\s*=\s*\{\{[^}]*fontSize\s*:\s*['"`]?([^'"`},]+)['"`]?/g,
  inlineFontWeight: /style\s*=\s*\{\{[^}]*fontWeight\s*:\s*['"`]?([^'"`},]+)['"`]?/g,
  inlineLineHeight: /style\s*=\s*\{\{[^}]*lineHeight\s*:\s*['"`]?([^'"`},]+)['"`]?/g,
  headingWithoutClass: /<(h[1-6])[^>]*(?!className=['"`][^'"`]*heading-)[^>]*>/g,
  bodyTextWithoutClass: /<(p|span|div)[^>]*className=['"`]([^'"`]*)["`'][^>]*>/g,
};

const typographyUtilities = [
  'heading-display',
  'heading-page',
  'heading-section',
  'heading-card',
  'heading-label',
  'body-base',
  'body-small',
  'text-label',
  'text-caption',
  'text-micro',
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', 'dist', 'build', '__tests__'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if ((file.endsWith('.ts') || file.endsWith('.tsx')) &&
          !file.endsWith('.test.ts') &&
          !file.endsWith('.test.tsx') &&
          !file.endsWith('.spec.ts') &&
          !file.endsWith('.spec.tsx')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function getSourceFiles(specificFile?: string): string[] {
  if (specificFile) {
    return [specificFile];
  }

  return getAllFiles('src');
}

function hasTypographyClass(className: string | null): boolean {
  if (!className) {return false;}
  return typographyUtilities.some(util => className.includes(util));
}

function scanFile(filePath: string): TypographyViolation[] {
  const violations: TypographyViolation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    // Check for inline fontSize
    let match;
    patterns.inlineFontSize.lastIndex = 0;
    while ((match = patterns.inlineFontSize.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'inline-font-size',
        violation: match[0],
        context: line.trim(),
        suggestion: 'Use typography utilities (heading-*, body-*, text-*)',
      });
    }

    // Check for inline fontWeight
    patterns.inlineFontWeight.lastIndex = 0;
    while ((match = patterns.inlineFontWeight.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'inline-font-weight',
        violation: match[0],
        context: line.trim(),
        suggestion: 'Use typography utilities instead of inline fontWeight',
      });
    }

    // Check for inline lineHeight
    patterns.inlineLineHeight.lastIndex = 0;
    while ((match = patterns.inlineLineHeight.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'inline-line-height',
        violation: match[0],
        context: line.trim(),
        suggestion: 'Use typography utilities with built-in line heights',
      });
    }

    // Check for headings without typography classes
    patterns.headingWithoutClass.lastIndex = 0;
    while ((match = patterns.headingWithoutClass.exec(line)) !== null) {
      const tag = match[1];
      const classNameMatch = line.match(/className=['"`]([^'"`]*)["`']/);
      const className = classNameMatch ? classNameMatch[1] : null;

      if (!hasTypographyClass(className)) {
        const suggestedClass = {
          'h1': 'heading-display or heading-page',
          'h2': 'heading-page or heading-section',
          'h3': 'heading-section',
          'h4': 'heading-card',
          'h5': 'heading-label',
          'h6': 'heading-label',
        }[tag];

        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'heading-without-class',
          violation: match[0],
          context: line.trim(),
          suggestion: `Add ${suggestedClass} class to <${tag}>`,
        });
      }
    }
  });

  return violations;
}

function generateJsonReport(report: AuditReport, outputPath: string): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✓ JSON report saved to: ${outputPath}`);
}

function generateMarkdownReport(report: AuditReport, outputPath: string): void {
  const lines: string[] = [];
  
  lines.push('# Design System Typography Compliance Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}\n`);
  
  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Files Scanned | ${report.filesScanned} |`);
  lines.push(`| Files with Violations | ${report.filesWithViolations} |`);
  lines.push(`| Total Violations | ${report.totalViolations} |`);
  lines.push(`| Inline fontSize | ${report.violationsByType.inlineFontSize} |`);
  lines.push(`| Inline fontWeight | ${report.violationsByType.inlineFontWeight} |`);
  lines.push(`| Inline lineHeight | ${report.violationsByType.inlineLineHeight} |`);
  lines.push(`| Headings without utilities | ${report.violationsByType.headingWithoutClass} |`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  lines.push(`| **Compliance Score** | **${complianceScore}%** |\n`);

  if (report.topViolators.length > 0) {
    lines.push('## Top 10 Files Needing Attention\n');
    lines.push('| File | Violations |');
    lines.push('|------|------------|');
    report.topViolators.slice(0, 10).forEach(file => {
      lines.push(`| ${file.file} | ${file.violationCount} |`);
    });
    lines.push('');
  }

  lines.push('## Quick Fix Examples\n');
  lines.push('```tsx');
  lines.push('// ❌ BEFORE');
  lines.push('<h1 style={{ fontSize: \'2.25rem\', fontWeight: \'700\' }}>Dashboard</h1>');
  lines.push('');
  lines.push('// ✅ AFTER');
  lines.push('<h1 className="heading-page">Dashboard</h1>');
  lines.push('```\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`✓ Markdown report saved to: ${outputPath}`);
}

async function runAudit(specificFile?: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Design System Typography Compliance Audit');
  console.log('═══════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const files = getSourceFiles(specificFile);
  console.log(`→ Found ${files.length} files to scan\n`);

  const fileViolations: FileViolations[] = [];
  let totalViolations = 0;

  files.forEach((file, index) => {
    const violations = scanFile(file);

    if (violations.length > 0) {
      fileViolations.push({ file, violations, violationCount: violations.length });
      totalViolations += violations.length;
      console.log(`  ✗ ${file} (${violations.length} violations)`);
    } else {
      console.log(`  ✓ ${file}`);
    }

    if ((index + 1) % 50 === 0) {
      console.log(`  → Progress: ${index + 1}/${files.length} files scanned`);
    }
  });

  const topViolators = [...fileViolations].sort((a, b) => b.violationCount - a.violationCount);
  const violationsByType = {
    inlineFontSize: 0,
    inlineFontWeight: 0,
    inlineLineHeight: 0,
    headingWithoutClass: 0,
    missingTypographyClass: 0,
  };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'inline-font-size') {violationsByType.inlineFontSize++;}
      else if (v.type === 'inline-font-weight') {violationsByType.inlineFontWeight++;}
      else if (v.type === 'inline-line-height') {violationsByType.inlineLineHeight++;}
      else if (v.type === 'heading-without-class') {violationsByType.headingWithoutClass++;}
      else if (v.type === 'missing-typography-class') {violationsByType.missingTypographyClass++;}
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
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Audit Results');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`Files scanned: ${report.filesScanned}`);
  console.log(`Files with violations: ${report.filesWithViolations}`);
  console.log(`Total violations: ${report.totalViolations}`);
  console.log(`  - Inline fontSize: ${report.violationsByType.inlineFontSize}`);
  console.log(`  - Inline fontWeight: ${report.violationsByType.inlineFontWeight}`);
  console.log(`  - Inline lineHeight: ${report.violationsByType.inlineLineHeight}`);
  console.log(`  - Headings without utilities: ${report.violationsByType.headingWithoutClass}`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log(`\nCompliance Score: ${complianceScore}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${elapsed}s\n`);

  generateJsonReport(report, 'audit-reports/typography-compliance.json');
  generateMarkdownReport(report, 'audit-reports/typography-compliance.md');
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

const specificFile = process.argv[2];
runAudit(specificFile).catch(console.error);
