#!/usr/bin/env node
/**
 * Design System Color Compliance Audit Script
 * Scans all TSX files for color violations
 */

import fs from 'fs';
import path from 'path';

interface ColorViolation {
  file: string;
  line: number;
  type: 'hard-coded-class' | 'inline-hex' | 'missing-dark-variant';
  violation: string;
  context: string;
  suggestion?: string;
}

interface FileViolations {
  file: string;
  violations: ColorViolation[];
  violationCount: number;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: {
    hardCodedClass: number;
    inlineHex: number;
    missingDarkVariant: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
}

const patterns = {
  hardCodedColors: /\b(bg|text|border|ring|divide|outline|decoration|accent|fill|stroke|from|via|to|shadow)-(blue|indigo|purple|pink|red|orange|yellow|green|teal|cyan|sky|violet|fuchsia|rose|amber|lime|emerald|slate|gray|zinc|neutral|stone)-(\d{2,3})\b/g,
  inlineHex: /style\s*=\s*\{\{[^}]*(?:color|backgroundColor|borderColor|background)\s*:\s*['"`]#([0-9A-Fa-f]{3,8})['"`]/g,
  missingDarkVariant: /className\s*=\s*["`']([^"`']*\b(bg|text|border)-(white|black|gray|slate|zinc|neutral|stone|blue|indigo|purple|pink|red|orange|yellow|green|teal|cyan|sky|violet|fuchsia|rose|amber|lime|emerald)-(\d{2,3})[^"`']*)["`']/g,
};

const semanticTokens: Record<string, string> = {
  'bg-blue': 'bg-primary',
  'text-blue': 'text-primary',
  'border-blue': 'border-primary',
  'bg-gray': 'bg-muted or bg-card',
  'text-gray': 'text-muted-foreground',
  'bg-green': 'bg-success',
  'text-green': 'text-success',
  'bg-red': 'bg-destructive',
  'text-red': 'text-destructive',
  'bg-yellow': 'bg-warning',
  'text-yellow': 'text-warning',
};

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip node_modules, dist, build, and __tests__ directories
      if (!['node_modules', 'dist', 'build', '__tests__'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      // Include only .ts and .tsx files, but exclude test files
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

function hasDarkVariant(className: string, colorClass: string): boolean {
  const darkPattern = new RegExp(`dark:${colorClass.replace(/\d+$/, '\\d+')}`);
  return darkPattern.test(className);
}

function getColorSuggestion(match: string): string {
  const prefix = match.split('-')[0];
  const color = match.split('-')[1];
  const key = `${prefix}-${color}`;
  return semanticTokens[key] || 'Use semantic token from tokens.ts';
}

function scanFile(filePath: string): ColorViolation[] {
  const violations: ColorViolation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    // Check for hard-coded color classes
    let match;
    while ((match = patterns.hardCodedColors.exec(line)) !== null) {
      const violation = match[0];
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(line.length, match.index + violation.length + 20);

      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'hard-coded-class',
        violation,
        context: line.substring(contextStart, contextEnd),
        suggestion: getColorSuggestion(violation),
      });
    }

    // Check for inline hex colors
    patterns.inlineHex.lastIndex = 0;
    while ((match = patterns.inlineHex.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'inline-hex',
        violation: match[0],
        context: line.trim(),
        suggestion: 'Use semantic color tokens from tokens.ts',
      });
    }

    // Check for missing dark variants
    patterns.missingDarkVariant.lastIndex = 0;
    while ((match = patterns.missingDarkVariant.exec(line)) !== null) {
      const fullClassName = match[1];
      const colorClass = match[0].match(/(bg|text|border)-\w+-\d+/)?.[0];

      if (colorClass && !hasDarkVariant(fullClassName, colorClass)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'missing-dark-variant',
          violation: colorClass,
          context: line.trim(),
          suggestion: `Add dark:${colorClass.replace(/\d+$/, 'X')} variant`,
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
  
  lines.push('# Design System Color Compliance Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}\n`);
  
  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Files Scanned | ${report.filesScanned} |`);
  lines.push(`| Files with Violations | ${report.filesWithViolations} |`);
  lines.push(`| Total Violations | ${report.totalViolations} |`);
  lines.push(`| Hard-coded Color Classes | ${report.violationsByType.hardCodedClass} |`);
  lines.push(`| Inline Hex Colors | ${report.violationsByType.inlineHex} |`);
  lines.push(`| Missing Dark Variants | ${report.violationsByType.missingDarkVariant} |`);

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

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`✓ Markdown report saved to: ${outputPath}`);
}

async function runAudit(specificFile?: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Design System Color Compliance Audit');
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
  const violationsByType = { hardCodedClass: 0, inlineHex: 0, missingDarkVariant: 0 };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'hard-coded-class') {violationsByType.hardCodedClass++;}
      else if (v.type === 'inline-hex') {violationsByType.inlineHex++;}
      else if (v.type === 'missing-dark-variant') {violationsByType.missingDarkVariant++;}
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
  console.log(`  - Hard-coded classes: ${report.violationsByType.hardCodedClass}`);
  console.log(`  - Inline hex colors: ${report.violationsByType.inlineHex}`);
  console.log(`  - Missing dark variants: ${report.violationsByType.missingDarkVariant}`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log(`\nCompliance Score: ${complianceScore}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${elapsed}s\n`);

  generateJsonReport(report, 'audit-reports/color-compliance.json');
  generateMarkdownReport(report, 'audit-reports/color-compliance.md');
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

const specificFile = process.argv[2];
runAudit(specificFile).catch(console.error);
