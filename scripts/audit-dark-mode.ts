#!/usr/bin/env node
/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */
/**
 * Design System Dark Mode Compliance Audit Script
 * Scans all TSX files for missing dark mode variants
 */

import fs from 'fs';
import path from 'path';

interface DarkModeViolation {
  file: string;
  line: number;
  type: 'missing-dark-bg' | 'missing-dark-text' | 'missing-dark-border' | 'hardcoded-color-no-dark';
  violation: string;
  context: string;
  suggestion?: string;
}

interface FileViolations {
  file: string;
  violations: DarkModeViolation[];
  violationCount: number;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: {
    missingDarkBg: number;
    missingDarkText: number;
    missingDarkBorder: number;
    hardcodedColorNoDark: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
}

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

function hasDarkVariant(className: string, property: string): boolean {
  // Check if the className has a dark: variant for the specified property
  const darkPattern = new RegExp(`dark:${property}-`);
  return darkPattern.test(className);
}

function extractClassName(line: string): string | null {
  const match = line.match(/className\s*=\s*["`']([^"`']*)["`']/);
  return match ? match[1] : null;
}

function scanFile(filePath: string): DarkModeViolation[] {
  const violations: DarkModeViolation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const className = extractClassName(line);

    if (!className) {return;}

    // Check for bg- classes without dark:bg-
    const bgMatches = className.match(/\bbg-(white|black|gray|slate|zinc|blue|red|green|yellow|orange|purple|pink)-\d{2,3}\b/g);
    if (bgMatches) {
      bgMatches.forEach(bgClass => {
        if (!hasDarkVariant(className, 'bg')) {
          violations.push({
            file: filePath,
            line: lineNumber,
            type: 'missing-dark-bg',
            violation: bgClass,
            context: line.trim(),
            suggestion: `Add dark:bg-* variant (e.g., dark:bg-gray-800)`,
          });
        }
      });
    }

    // Check for text- color classes without dark:text-
    const textMatches = className.match(/\btext-(white|black|gray|slate|zinc|blue|red|green|yellow|orange|purple|pink)-\d{2,3}\b/g);
    if (textMatches) {
      textMatches.forEach(textClass => {
        if (!hasDarkVariant(className, 'text')) {
          violations.push({
            file: filePath,
            line: lineNumber,
            type: 'missing-dark-text',
            violation: textClass,
            context: line.trim(),
            suggestion: `Add dark:text-* variant (e.g., dark:text-gray-50)`,
          });
        }
      });
    }

    // Check for border- classes without dark:border-
    const borderMatches = className.match(/\bborder-(white|black|gray|slate|zinc|blue|red|green|yellow|orange|purple|pink)-\d{2,3}\b/g);
    if (borderMatches) {
      borderMatches.forEach(borderClass => {
        if (!hasDarkVariant(className, 'border')) {
          violations.push({
            file: filePath,
            line: lineNumber,
            type: 'missing-dark-border',
            violation: borderClass,
            context: line.trim(),
            suggestion: `Add dark:border-* variant (e.g., dark:border-gray-700)`,
          });
        }
      });
    }

    // Check for hardcoded colors in style attributes
    const styleHexMatch = line.match(/style\s*=\s*\{\{[^}]*(color|backgroundColor|borderColor)\s*:\s*['"`]#[0-9A-Fa-f]{3,8}['"`]/);
    if (styleHexMatch && !line.includes('dark:')) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'hardcoded-color-no-dark',
        violation: styleHexMatch[0],
        context: line.trim(),
        suggestion: 'Use Tailwind classes with dark variants instead of inline styles',
      });
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
  
  lines.push('# Design System Dark Mode Compliance Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}\n`);
  
  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Files Scanned | ${report.filesScanned} |`);
  lines.push(`| Files with Violations | ${report.filesWithViolations} |`);
  lines.push(`| Total Violations | ${report.totalViolations} |`);
  lines.push(`| Missing dark:bg- | ${report.violationsByType.missingDarkBg} |`);
  lines.push(`| Missing dark:text- | ${report.violationsByType.missingDarkText} |`);
  lines.push(`| Missing dark:border- | ${report.violationsByType.missingDarkBorder} |`);
  lines.push(`| Hardcoded colors (no dark) | ${report.violationsByType.hardcodedColorNoDark} |`);

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

  lines.push('## Dark Mode Requirements\n');
  lines.push('- All background colors must have dark: variants');
  lines.push('- All text colors must have dark: variants');
  lines.push('- All border colors must have dark: variants');
  lines.push('- Surface elevation must be handled with proper dark mode shades\n');

  lines.push('## Quick Fixes\n');
  lines.push('```tsx');
  lines.push('// ❌ No dark mode');
  lines.push('<div className="bg-white text-gray-900 border-gray-200">Content</div>');
  lines.push('');
  lines.push('// ✅ With dark mode');
  lines.push('<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-700">');
  lines.push('  Content');
  lines.push('</div>');
  lines.push('```\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`✓ Markdown report saved to: ${outputPath}`);
}

async function runAudit(specificFile?: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Design System Dark Mode Compliance Audit');
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
    missingDarkBg: 0,
    missingDarkText: 0,
    missingDarkBorder: 0,
    hardcodedColorNoDark: 0,
  };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'missing-dark-bg') {violationsByType.missingDarkBg++;}
      else if (v.type === 'missing-dark-text') {violationsByType.missingDarkText++;}
      else if (v.type === 'missing-dark-border') {violationsByType.missingDarkBorder++;}
      else if (v.type === 'hardcoded-color-no-dark') {violationsByType.hardcodedColorNoDark++;}
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
  console.log(`  - Missing dark:bg-: ${report.violationsByType.missingDarkBg}`);
  console.log(`  - Missing dark:text-: ${report.violationsByType.missingDarkText}`);
  console.log(`  - Missing dark:border-: ${report.violationsByType.missingDarkBorder}`);
  console.log(`  - Hardcoded colors: ${report.violationsByType.hardcodedColorNoDark}`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log(`\nCompliance Score: ${complianceScore}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${elapsed}s\n`);

  generateJsonReport(report, 'audit-reports/dark-mode-compliance.json');
  generateMarkdownReport(report, 'audit-reports/dark-mode-compliance.md');
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

const specificFile = process.argv[2];
runAudit(specificFile).catch(console.error);
