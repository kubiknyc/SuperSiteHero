#!/usr/bin/env node
/**
 * Design System Color Consistency Audit Script
 * Scans all TSX files for color violations (hardcoded hex, non-semantic colors)
 */

import fs from 'fs';
import path from 'path';

interface ColorViolation {
  file: string;
  line: number;
  type: 'hardcoded-hex' | 'inline-style-color' | 'non-semantic-tailwind' | 'hardcoded-rgb' | 'hardcoded-hsl';
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
    hardcodedHex: number;
    inlineStyleColor: number;
    nonSemanticTailwind: number;
    hardcodedRgb: number;
    hardcodedHsl: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
  uniqueColors: string[];
}

// Patterns to detect color violations
const colorPatterns = {
  // eslint-disable-next-line security/detect-unsafe-regex
  hardcodedHex: /#([0-9a-fA-F]{3}){1,2}\b/g,
  inlineStyleColor: /style\s*=\s*\{\{[^}]*(color|backgroundColor|borderColor|fill|stroke)\s*:\s*['"`]?([^'"`},]+)['"`]?/gi,
  nonSemanticTailwind: /(?:text|bg|border|fill|stroke)-(red|blue|green|yellow|orange|purple|pink|indigo|cyan|teal|lime|amber|emerald|violet|fuchsia|rose|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
  hardcodedRgb: /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/gi,
  hardcodedHsl: /hsla?\s*\(\s*\d+\s*,/gi,
};

const excludePatterns = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
  /tailwind\.config/,
  /theme\/tokens/,
  /index\.css$/,
  /\.css$/,
  /node_modules/,
  /dist/,
  /build/,
  /GanttChart/,
  /Chart\.tsx/,
  /Recharts/,
  /markup/i,
  /drawing/i,
  /canvas/i,
  /signature/i,
  /ColorPicker/,
  /design-concepts/,
  /blueprint-samples/,
  /Demo\.tsx/,
];

const semanticColors = [
  'primary', 'secondary', 'accent', 'muted', 'foreground', 'background',
  'destructive', 'success', 'warning', 'error', 'info',
  'card', 'popover', 'border', 'input', 'ring',
  'success-light', 'warning-light', 'error-light', 'info-light',
  'safety-orange', 'steel-gray', 'concrete', 'caution-yellow', 'rebar-rust',
];

function shouldExcludeFile(filePath: string): boolean {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function isSemanticColor(className: string): boolean {
  return semanticColors.some(semantic => className.includes(semantic));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', 'dist', 'build', '__tests__', '.git'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !shouldExcludeFile(filePath)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function scanFile(filePath: string): ColorViolation[] {
  const violations: ColorViolation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  if (content.includes('// Color definitions') || content.includes('colors:')) {
    return violations;
  }

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('import ')) {
      return;
    }

    let match;
    colorPatterns.hardcodedHex.lastIndex = 0;
    while ((match = colorPatterns.hardcodedHex.exec(line)) !== null) {
      if (!line.includes('var(--') && !line.trim().startsWith('//')) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'hardcoded-hex',
          violation: match[0],
          context: line.trim().substring(0, 120),
          suggestion: 'Use semantic color tokens (text-primary, bg-success, etc.)',
        });
      }
    }

    colorPatterns.inlineStyleColor.lastIndex = 0;
    while ((match = colorPatterns.inlineStyleColor.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'inline-style-color',
        violation: match[0],
        context: line.trim().substring(0, 120),
        suggestion: 'Use Tailwind classes with semantic colors instead of inline styles',
      });
    }

    colorPatterns.nonSemanticTailwind.lastIndex = 0;
    while ((match = colorPatterns.nonSemanticTailwind.exec(line)) !== null) {
      if (!isSemanticColor(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'non-semantic-tailwind',
          violation: match[0],
          context: line.trim().substring(0, 120),
          suggestion: 'Consider using semantic colors (text-success, bg-warning, etc.) instead of specific colors',
        });
      }
    }

    colorPatterns.hardcodedRgb.lastIndex = 0;
    while ((match = colorPatterns.hardcodedRgb.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'hardcoded-rgb',
        violation: match[0],
        context: line.trim().substring(0, 120),
        suggestion: 'Use CSS variables or semantic color tokens',
      });
    }

    colorPatterns.hardcodedHsl.lastIndex = 0;
    while ((match = colorPatterns.hardcodedHsl.exec(line)) !== null) {
      if (!line.includes('--') && !line.includes('var(')) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'hardcoded-hsl',
          violation: match[0],
          context: line.trim().substring(0, 120),
          suggestion: 'Use CSS variables or semantic color tokens',
        });
      }
    }
  });

  return violations;
}

function extractUniqueColors(fileViolations: FileViolations[]): string[] {
  const colors = new Set<string>();

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'hardcoded-hex') {
        colors.add(v.violation.toLowerCase());
      }
    });
  });

  return Array.from(colors).sort();
}

function generateMarkdownReport(report: AuditReport, outputPath: string): void {
  const lines: string[] = [];

  lines.push('# Design System Color Consistency Audit Report\n');
  lines.push('**Generated:** ' + report.timestamp + '\n');

  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push('| Total Files Scanned | ' + report.filesScanned + ' |');
  lines.push('| Files with Violations | ' + report.filesWithViolations + ' |');
  lines.push('| Total Violations | ' + report.totalViolations + ' |');
  lines.push('| Hardcoded Hex Colors | ' + report.violationsByType.hardcodedHex + ' |');
  lines.push('| Inline Style Colors | ' + report.violationsByType.inlineStyleColor + ' |');
  lines.push('| Non-Semantic Tailwind | ' + report.violationsByType.nonSemanticTailwind + ' |');
  lines.push('| Hardcoded RGB | ' + report.violationsByType.hardcodedRgb + ' |');
  lines.push('| Hardcoded HSL | ' + report.violationsByType.hardcodedHsl + ' |');

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  lines.push('| **Compliance Score** | **' + complianceScore + '%** |\n');

  if (report.topViolators.length > 0) {
    lines.push('## Top 20 Files Needing Attention\n');
    lines.push('| File | Violations |');
    lines.push('|------|------------|');
    report.topViolators.slice(0, 20).forEach(file => {
      lines.push('| ' + file.file + ' | ' + file.violationCount + ' |');
    });
    lines.push('');
  }

  if (report.uniqueColors.length > 0) {
    lines.push('## Unique Hardcoded Hex Colors Found\n');
    lines.push('These colors should be mapped to semantic tokens:\n');
    lines.push('```');
    report.uniqueColors.slice(0, 50).forEach(color => {
      lines.push(color);
    });
    if (report.uniqueColors.length > 50) {
      lines.push('... and ' + (report.uniqueColors.length - 50) + ' more');
    }
    lines.push('```\n');
  }

  lines.push('## Quick Fix Examples\n');
  lines.push('```tsx');
  lines.push('// BEFORE (hardcoded hex)');
  lines.push('<div style={{ color: \'#10b981\' }}>Success</div>');
  lines.push('');
  lines.push('// AFTER (semantic token)');
  lines.push('<div className="text-success">Success</div>');
  lines.push('```\n');

  lines.push('## Semantic Color Reference\n');
  lines.push('| Semantic Token | Use Case |');
  lines.push('|----------------|----------|');
  lines.push('| text-primary, bg-primary | Primary brand color |');
  lines.push('| text-success, bg-success-light | Success states, approvals |');
  lines.push('| text-warning, bg-warning-light | Warnings, pending states |');
  lines.push('| text-destructive, bg-error-light | Errors, rejections |');
  lines.push('| text-info, bg-info-light | Informational states |');
  lines.push('| text-muted, text-secondary | Secondary/muted text |');
  lines.push('| bg-muted, bg-card | Surface colors |');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log('Markdown report saved to: ' + outputPath);
}

function generateJsonReport(report: AuditReport, outputPath: string): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log('JSON report saved to: ' + outputPath);
}

async function runAudit(): Promise<void> {
  console.log('Design System Color Consistency Audit\n');

  const startTime = Date.now();
  const files = getAllFiles('src');
  console.log('Found ' + files.length + ' files to scan\n');

  const fileViolations: FileViolations[] = [];
  let totalViolations = 0;

  files.forEach((file, index) => {
    const violations = scanFile(file);

    if (violations.length > 0) {
      fileViolations.push({ file, violations, violationCount: violations.length });
      totalViolations += violations.length;
    }

    if ((index + 1) % 100 === 0) {
      console.log('Progress: ' + (index + 1) + '/' + files.length + ' files scanned');
    }
  });

  const topViolators = [...fileViolations].sort((a, b) => b.violationCount - a.violationCount);
  const violationsByType = {
    hardcodedHex: 0,
    inlineStyleColor: 0,
    nonSemanticTailwind: 0,
    hardcodedRgb: 0,
    hardcodedHsl: 0,
  };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'hardcoded-hex') {violationsByType.hardcodedHex++;}
      else if (v.type === 'inline-style-color') {violationsByType.inlineStyleColor++;}
      else if (v.type === 'non-semantic-tailwind') {violationsByType.nonSemanticTailwind++;}
      else if (v.type === 'hardcoded-rgb') {violationsByType.hardcodedRgb++;}
      else if (v.type === 'hardcoded-hsl') {violationsByType.hardcodedHsl++;}
    });
  });

  const uniqueColors = extractUniqueColors(fileViolations);

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    filesScanned: files.length,
    filesWithViolations: fileViolations.length,
    totalViolations,
    violationsByType,
    fileViolations,
    topViolators,
    uniqueColors,
  };

  console.log('\nAudit Results');
  console.log('Files scanned: ' + report.filesScanned);
  console.log('Files with violations: ' + report.filesWithViolations);
  console.log('Total violations: ' + report.totalViolations);
  console.log('  - Hardcoded hex: ' + report.violationsByType.hardcodedHex);
  console.log('  - Inline style colors: ' + report.violationsByType.inlineStyleColor);
  console.log('  - Non-semantic Tailwind: ' + report.violationsByType.nonSemanticTailwind);
  console.log('  - Hardcoded RGB: ' + report.violationsByType.hardcodedRgb);
  console.log('  - Hardcoded HSL: ' + report.violationsByType.hardcodedHsl);
  console.log('Unique hardcoded hex colors: ' + uniqueColors.length);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log('\nCompliance Score: ' + complianceScore + '%');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\nAudit completed in ' + elapsed + 's\n');

  generateJsonReport(report, 'audit-reports/color-consistency.json');
  generateMarkdownReport(report, 'audit-reports/color-consistency.md');
}

runAudit().catch(console.error);
