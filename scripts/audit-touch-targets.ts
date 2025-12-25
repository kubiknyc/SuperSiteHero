#!/usr/bin/env node
/**
 * Design System Touch Target Compliance Audit Script
 * Scans all TSX files for touch target violations (WCAG 2.1 Level AA requires 44px minimum)
 */

import fs from 'fs';
import path from 'path';

interface TouchTargetViolation {
  file: string;
  line: number;
  type: 'small-button' | 'clickable-badge' | 'icon-button' | 'small-input' | 'missing-aria-label' | 'missing-touch-wrapper';
  violation: string;
  context: string;
  suggestion?: string;
}

interface FileViolations {
  file: string;
  violations: TouchTargetViolation[];
  violationCount: number;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: {
    smallButton: number;
    clickableBadge: number;
    iconButton: number;
    smallInput: number;
    missingAriaLabel: number;
    missingTouchWrapper: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
}

const patterns = {
  // Buttons with height < 44px
  smallButton: /<Button[^>]*className=['"`]([^'"`]*h-\[(1|2|3)[0-9]px\]|h-[1-9]|h-10)[^'"`]*['"`]/g,
  
  // Clickable Badge without TouchWrapper
  clickableBadge: /<Badge[^>]*onClick/g,
  
  // Icon-only buttons without proper sizing or aria-label
  iconButton: /<button[^>]*>\s*<[A-Z]\w*Icon/g,
  
  // Input fields that might be too small
  smallInput: /<input[^>]*className=['"`]([^'"`]*h-\[(1|2|3)[0-9]px\]|h-[1-9])[^'"`]*['"`]/g,
  
  // Interactive elements without aria-label
  missingAriaLabel: /<(button|a)[^>]*>\s*<[A-Z]\w*Icon[^>]*\/?\s*>\s*<\/\1>/g,
};

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

function hasAriaLabel(line: string): boolean {
  return /aria-label\s*=/.test(line);
}

function hasTouchWrapper(content: string, lineIndex: number): boolean {
  // Look backwards up to 3 lines to see if there's a TouchWrapper
  const lines = content.split('\n');
  for (let i = Math.max(0, lineIndex - 3); i < lineIndex; i++) {
    if (lines[i].includes('<TouchWrapper')) {
      return true;
    }
  }
  return false;
}

function scanFile(filePath: string): TouchTargetViolation[] {
  const violations: TouchTargetViolation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    // Check for small buttons
    let match;
    patterns.smallButton.lastIndex = 0;
    while ((match = patterns.smallButton.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'small-button',
        violation: match[0],
        context: line.trim(),
        suggestion: 'Use min-h-[44px] min-w-[44px] for touch targets',
      });
    }

    // Check for clickable badges without TouchWrapper
    patterns.clickableBadge.lastIndex = 0;
    while ((match = patterns.clickableBadge.exec(line)) !== null) {
      if (!hasTouchWrapper(content, lineIndex)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'clickable-badge',
          violation: match[0],
          context: line.trim(),
          suggestion: 'Wrap clickable Badge with <TouchWrapper>',
        });
      }
    }

    // Check for icon buttons without aria-label
    patterns.iconButton.lastIndex = 0;
    while ((match = patterns.iconButton.exec(line)) !== null) {
      if (!hasAriaLabel(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'icon-button',
          violation: match[0],
          context: line.trim(),
          suggestion: 'Add aria-label="descriptive text" to icon-only buttons',
        });
      }
    }

    // Check for small input fields
    patterns.smallInput.lastIndex = 0;
    while ((match = patterns.smallInput.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineNumber,
        type: 'small-input',
        violation: match[0],
        context: line.trim(),
        suggestion: 'Use min-h-[44px] for input fields on mobile',
      });
    }

    // Check for interactive elements without aria-label
    patterns.missingAriaLabel.lastIndex = 0;
    while ((match = patterns.missingAriaLabel.exec(line)) !== null) {
      if (!hasAriaLabel(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'missing-aria-label',
          violation: match[0],
          context: line.trim(),
          suggestion: 'Add aria-label for accessibility',
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
  
  lines.push('# Design System Touch Target Compliance Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}\n`);
  
  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Files Scanned | ${report.filesScanned} |`);
  lines.push(`| Files with Violations | ${report.filesWithViolations} |`);
  lines.push(`| Total Violations | ${report.totalViolations} |`);
  lines.push(`| Small Buttons (< 44px) | ${report.violationsByType.smallButton} |`);
  lines.push(`| Clickable Badges | ${report.violationsByType.clickableBadge} |`);
  lines.push(`| Icon Buttons | ${report.violationsByType.iconButton} |`);
  lines.push(`| Small Inputs | ${report.violationsByType.smallInput} |`);
  lines.push(`| Missing ARIA Labels | ${report.violationsByType.missingAriaLabel} |`);

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

  lines.push('## WCAG 2.1 Level AA Requirements\n');
  lines.push('- **Minimum touch target size:** 44px × 44px');
  lines.push('- **Glove mode (field workers):** 60px × 60px');
  lines.push('- **Spacing between targets:** 8px minimum\n');

  lines.push('## Quick Fixes\n');
  lines.push('```tsx');
  lines.push('// ❌ Small button');
  lines.push('<button className="h-8 px-2">Click</button>');
  lines.push('');
  lines.push('// ✅ Touch-friendly button');
  lines.push('<button className="min-h-[44px] min-w-[44px] px-4">Click</button>');
  lines.push('');
  lines.push('// ❌ Clickable badge');
  lines.push('<Badge onClick={handleClick}>Status</Badge>');
  lines.push('');
  lines.push('// ✅ With TouchWrapper');
  lines.push('<TouchWrapper><Badge onClick={handleClick}>Status</Badge></TouchWrapper>');
  lines.push('```\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`✓ Markdown report saved to: ${outputPath}`);
}

async function runAudit(specificFile?: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Design System Touch Target Compliance Audit');
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
    smallButton: 0,
    clickableBadge: 0,
    iconButton: 0,
    smallInput: 0,
    missingAriaLabel: 0,
    missingTouchWrapper: 0,
  };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'small-button') {violationsByType.smallButton++;}
      else if (v.type === 'clickable-badge') {violationsByType.clickableBadge++;}
      else if (v.type === 'icon-button') {violationsByType.iconButton++;}
      else if (v.type === 'small-input') {violationsByType.smallInput++;}
      else if (v.type === 'missing-aria-label') {violationsByType.missingAriaLabel++;}
      else if (v.type === 'missing-touch-wrapper') {violationsByType.missingTouchWrapper++;}
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
  console.log(`  - Small buttons: ${report.violationsByType.smallButton}`);
  console.log(`  - Clickable badges: ${report.violationsByType.clickableBadge}`);
  console.log(`  - Icon buttons: ${report.violationsByType.iconButton}`);
  console.log(`  - Small inputs: ${report.violationsByType.smallInput}`);
  console.log(`  - Missing ARIA labels: ${report.violationsByType.missingAriaLabel}`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log(`\nCompliance Score: ${complianceScore}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${elapsed}s\n`);

  generateJsonReport(report, 'audit-reports/touch-targets-compliance.json');
  generateMarkdownReport(report, 'audit-reports/touch-targets-compliance.md');
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

const specificFile = process.argv[2];
runAudit(specificFile).catch(console.error);
