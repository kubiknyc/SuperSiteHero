#!/usr/bin/env node
/**
 * Design System Status Badge Audit Script
 * Finds all status badge implementations and identifies inconsistencies
 */

import fs from 'fs';
import path from 'path';

interface BadgeComponent {
  file: string;
  name: string;
  type: 'dedicated-component' | 'inline-badge' | 'status-config-object';
  statusValues: string[];
  colorApproach: 'theme-tokens' | 'hardcoded-classes' | 'mixed' | 'unknown';
  lineCount: number;
  hasVariants: boolean;
}

interface StatusConfigPattern {
  file: string;
  line: number;
  configName: string;
  statusKeys: string[];
  colorPattern: string;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  dedicatedBadgeComponents: BadgeComponent[];
  statusConfigPatterns: StatusConfigPattern[];
  inlineBadgeUsages: number;
  uniqueStatusValues: string[];
  colorApproachBreakdown: {
    themeTokens: number;
    hardcodedClasses: number;
    mixed: number;
    unknown: number;
  };
  recommendations: string[];
}

const badgeFilePattern = /(Badge|Status)/i;
// eslint-disable-next-line security/detect-unsafe-regex
const statusConfigObject = /(?:const|let|var)\s+(\w*(?:status|Status|STATE|state|config|Config)\w*)\s*(?::\s*[^=]+)?\s*=\s*\{/g;
const inlineBadge = /<Badge[^>]*variant\s*=\s*['"]([^'"]+)['"][^>]*>/g;
const statusValue = /['"]?(open|closed|pending|in_progress|approved|rejected|completed|draft|submitted|review|active|inactive|cancelled|resolved|on_hold|deferred|overdue|scheduled)['"]?\s*:/gi;

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', 'dist', 'build', '__tests__', '.git'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function analyzeColorApproach(content: string): 'theme-tokens' | 'hardcoded-classes' | 'mixed' | 'unknown' {
  const hasThemeTokens = /(?:bg|text|border)-(?:success|warning|error|info|muted|primary|secondary|destructive)/.test(content);
  const hasHardcodedColors = /(?:bg|text|border)-(?:red|green|blue|yellow|amber|emerald|gray|slate)-\d{2,3}/.test(content);

  if (hasThemeTokens && hasHardcodedColors) {return 'mixed';}
  if (hasThemeTokens) {return 'theme-tokens';}
  if (hasHardcodedColors) {return 'hardcoded-classes';}
  return 'unknown';
}

function extractStatusValues(content: string): string[] {
  const statusValues = new Set<string>();
  let match;

  statusValue.lastIndex = 0;
  while ((match = statusValue.exec(content)) !== null) {
    statusValues.add(match[1].toLowerCase());
  }

  return Array.from(statusValues);
}

function findDedicatedBadgeComponents(files: string[]): BadgeComponent[] {
  const components: BadgeComponent[] = [];

  files.forEach(file => {
    const fileName = path.basename(file);
    if (badgeFilePattern.test(fileName) && file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // eslint-disable-next-line security/detect-unsafe-regex
      const componentMatch = content.match(/(?:export\s+(?:default\s+)?function|const)\s+(\w+)/);
      const componentName = componentMatch ? componentMatch[1] : fileName.replace('.tsx', '');

      const foundStatusValues = extractStatusValues(content);
      const colorApproach = analyzeColorApproach(content);
      const hasVariants = /variant/.test(content);

      components.push({
        file,
        name: componentName,
        type: 'dedicated-component',
        statusValues: foundStatusValues,
        colorApproach,
        lineCount: lines.length,
        hasVariants,
      });
    }
  });

  return components;
}

function findStatusConfigPatterns(files: string[]): StatusConfigPattern[] {
  const configs: StatusConfigPattern[] = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      statusConfigObject.lastIndex = 0;
      const match = statusConfigObject.exec(line);
      if (match) {
        let objectContent = '';
        let braceCount = 0;
        let started = false;

        for (let i = index; i < Math.min(index + 50, lines.length); i++) {
          const currentLine = lines[i];
          for (const char of currentLine) {
            if (char === '{') {
              braceCount++;
              started = true;
            }
            if (started) {objectContent += char;}
            if (char === '}') {braceCount--;}
            if (started && braceCount === 0) {break;}
          }
          if (started && braceCount === 0) {break;}
          if (started) {objectContent += '\n';}
        }

        const statusKeys = extractStatusValues(objectContent);
        const colorPattern = analyzeColorApproach(objectContent);

        if (statusKeys.length > 0) {
          configs.push({
            file,
            line: index + 1,
            configName: match[1],
            statusKeys,
            colorPattern,
          });
        }
      }
    });
  });

  return configs;
}

function countInlineBadgeUsages(files: string[]): number {
  let count = 0;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    inlineBadge.lastIndex = 0;
    while (inlineBadge.exec(content) !== null) {
      count++;
    }
  });

  return count;
}

function generateRecommendations(report: AuditReport): string[] {
  const recommendations: string[] = [];

  if (report.dedicatedBadgeComponents.length > 10) {
    recommendations.push('Found ' + report.dedicatedBadgeComponents.length + ' dedicated badge components. Consider consolidating into a single unified StatusBadge component.');
  }

  if (report.colorApproachBreakdown.mixed > 0 || report.colorApproachBreakdown.hardcodedClasses > report.colorApproachBreakdown.themeTokens) {
    recommendations.push('Many badge components use hardcoded color classes. Migrate to semantic theme tokens (bg-success-light, text-success, etc.)');
  }

  if (report.uniqueStatusValues.length > 20) {
    recommendations.push('Found ' + report.uniqueStatusValues.length + ' unique status values. Consider standardizing to a common set.');
  }

  if (report.statusConfigPatterns.length > 5) {
    recommendations.push('Found ' + report.statusConfigPatterns.length + ' statusConfig objects. Centralize these in a shared status-colors.ts file.');
  }

  return recommendations;
}

function generateMarkdownReport(report: AuditReport, outputPath: string): void {
  const lines: string[] = [];

  lines.push('# Design System Status Badge Audit Report\n');
  lines.push('**Generated:** ' + report.timestamp + '\n');

  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push('| Files Scanned | ' + report.filesScanned + ' |');
  lines.push('| Dedicated Badge Components | ' + report.dedicatedBadgeComponents.length + ' |');
  lines.push('| Status Config Objects | ' + report.statusConfigPatterns.length + ' |');
  lines.push('| Inline Badge Usages | ' + report.inlineBadgeUsages + ' |');
  lines.push('| Unique Status Values | ' + report.uniqueStatusValues.length + ' |\n');

  lines.push('## Color Approach Breakdown\n');
  lines.push('| Approach | Count |');
  lines.push('|----------|-------|');
  lines.push('| Theme Tokens (preferred) | ' + report.colorApproachBreakdown.themeTokens + ' |');
  lines.push('| Hardcoded Classes | ' + report.colorApproachBreakdown.hardcodedClasses + ' |');
  lines.push('| Mixed | ' + report.colorApproachBreakdown.mixed + ' |');
  lines.push('| Unknown | ' + report.colorApproachBreakdown.unknown + ' |\n');

  if (report.dedicatedBadgeComponents.length > 0) {
    lines.push('## Dedicated Badge Components\n');
    lines.push('| File | Name | Color Approach | Status Values |');
    lines.push('|------|------|----------------|---------------|');
    report.dedicatedBadgeComponents.forEach(comp => {
      const statusList = comp.statusValues.slice(0, 5).join(', ') + (comp.statusValues.length > 5 ? '...' : '');
      lines.push('| ' + comp.file + ' | ' + comp.name + ' | ' + comp.colorApproach + ' | ' + statusList + ' |');
    });
    lines.push('');
  }

  if (report.statusConfigPatterns.length > 0) {
    lines.push('## Status Config Objects Found\n');
    lines.push('| File | Config Name | Line | Status Keys | Color Pattern |');
    lines.push('|------|-------------|------|-------------|---------------|');
    report.statusConfigPatterns.forEach(config => {
      const keysList = config.statusKeys.slice(0, 4).join(', ') + (config.statusKeys.length > 4 ? '...' : '');
      lines.push('| ' + config.file + ' | ' + config.configName + ' | ' + config.line + ' | ' + keysList + ' | ' + config.colorPattern + ' |');
    });
    lines.push('');
  }

  if (report.uniqueStatusValues.length > 0) {
    lines.push('## All Unique Status Values Found\n');
    lines.push('```');
    report.uniqueStatusValues.forEach(value => {
      lines.push(value);
    });
    lines.push('```\n');
  }

  if (report.recommendations.length > 0) {
    lines.push('## Recommendations\n');
    report.recommendations.forEach((rec, i) => {
      lines.push((i + 1) + '. ' + rec);
    });
    lines.push('');
  }

  lines.push('## Suggested Unified Status Badge Pattern\n');
  lines.push('```tsx');
  lines.push('// src/components/ui/status-badge.tsx');
  lines.push('import { Badge } from \'@/components/ui/badge\';');
  lines.push('import { statusColors } from \'@/lib/theme/status-colors\';');
  lines.push('');
  lines.push('interface StatusBadgeProps {');
  lines.push('  status: string;');
  lines.push('  domain?: \'rfi\' | \'punch\' | \'submittal\' | \'task\' | \'general\';');
  lines.push('  className?: string;');
  lines.push('}');
  lines.push('');
  lines.push('export function StatusBadge({ status, domain = \'general\', className }: StatusBadgeProps) {');
  lines.push('  const colors = statusColors[domain]?.[status] || statusColors.general[status];');
  lines.push('  return (');
  lines.push('    <Badge className={cn(colors, className)}>');
  lines.push('      {formatStatusLabel(status)}');
  lines.push('    </Badge>');
  lines.push('  );');
  lines.push('}');
  lines.push('```\n');

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
  console.log('Design System Status Badge Audit\n');

  const startTime = Date.now();
  const files = getAllFiles('src');
  console.log('Found ' + files.length + ' files to scan\n');

  console.log('Finding dedicated badge components...');
  const dedicatedBadgeComponents = findDedicatedBadgeComponents(files);
  console.log('Found ' + dedicatedBadgeComponents.length + ' dedicated badge components');

  console.log('Finding status config patterns...');
  const statusConfigPatterns = findStatusConfigPatterns(files);
  console.log('Found ' + statusConfigPatterns.length + ' status config objects');

  console.log('Counting inline badge usages...');
  const inlineBadgeUsages = countInlineBadgeUsages(files);
  console.log('Found ' + inlineBadgeUsages + ' inline badge usages');

  const allStatusValues = new Set<string>();
  dedicatedBadgeComponents.forEach(comp => comp.statusValues.forEach(s => allStatusValues.add(s)));
  statusConfigPatterns.forEach(config => config.statusKeys.forEach(s => allStatusValues.add(s)));

  const colorApproachBreakdown = {
    themeTokens: 0,
    hardcodedClasses: 0,
    mixed: 0,
    unknown: 0,
  };
  dedicatedBadgeComponents.forEach(comp => {
    if (comp.colorApproach === 'theme-tokens') {colorApproachBreakdown.themeTokens++;}
    else if (comp.colorApproach === 'hardcoded-classes') {colorApproachBreakdown.hardcodedClasses++;}
    else if (comp.colorApproach === 'mixed') {colorApproachBreakdown.mixed++;}
    else {colorApproachBreakdown.unknown++;}
  });

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    filesScanned: files.length,
    dedicatedBadgeComponents,
    statusConfigPatterns,
    inlineBadgeUsages,
    uniqueStatusValues: Array.from(allStatusValues).sort(),
    colorApproachBreakdown,
    recommendations: [],
  };

  report.recommendations = generateRecommendations(report);

  console.log('\nAudit Results');
  console.log('Dedicated badge components: ' + report.dedicatedBadgeComponents.length);
  console.log('Status config objects: ' + report.statusConfigPatterns.length);
  console.log('Inline badge usages: ' + report.inlineBadgeUsages);
  console.log('Unique status values: ' + report.uniqueStatusValues.length);
  console.log('\nColor approach breakdown:');
  console.log('  - Theme tokens: ' + report.colorApproachBreakdown.themeTokens);
  console.log('  - Hardcoded classes: ' + report.colorApproachBreakdown.hardcodedClasses);
  console.log('  - Mixed: ' + report.colorApproachBreakdown.mixed);
  console.log('  - Unknown: ' + report.colorApproachBreakdown.unknown);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\nAudit completed in ' + elapsed + 's\n');

  generateJsonReport(report, 'audit-reports/status-badges.json');
  generateMarkdownReport(report, 'audit-reports/status-badges.md');
}

runAudit().catch(console.error);
