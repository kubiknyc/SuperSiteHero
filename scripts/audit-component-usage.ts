#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * Design System Component Usage Audit Script
 * Checks for consistent usage of Card, Typography, and Layout components
 */

import fs from 'fs';
import path from 'path';

interface ComponentViolation {
  file: string;
  line: number;
  type: 'raw-card-div' | 'inline-typography' | 'missing-layout-wrapper' | 'inconsistent-card-structure';
  pattern: string;
  context: string;
  suggestion?: string;
}

interface ComponentUsage {
  file: string;
  cardImports: boolean;
  cardUsage: number;
  rawCardDivs: number;
  typographyUtilities: number;
  inlineTypography: number;
  layoutWrapper: string | null;
  pageType: 'page' | 'component' | 'feature' | 'other';
}

interface FileViolations {
  file: string;
  violations: ComponentViolation[];
  violationCount: number;
}

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: {
    rawCardDiv: number;
    inlineTypography: number;
    missingLayoutWrapper: number;
    inconsistentCardStructure: number;
  };
  componentUsageStats: {
    filesUsingCard: number;
    filesWithRawCardDivs: number;
    filesUsingTypographyUtilities: number;
    filesWithInlineTypography: number;
    pagesWithSmartLayout: number;
    pagesWithoutLayout: number;
  };
  fileViolations: FileViolations[];
  topViolators: FileViolations[];
  layoutWrapperUsage: { [key: string]: number };
}

// Patterns to detect component usage
const patterns = {
  // Card component import
  cardImport: /import\s*\{[^}]*Card[^}]*\}\s*from\s*['"]@\/components\/ui\/card['"]/,
  // Card component usage
  cardUsage: /<Card(?:Header|Title|Description|Content|Footer)?[\s/>]/g,
  // Raw div that looks like a card (rounded + shadow + bg)
  rawCardDiv: /<div[^>]*className\s*=\s*['"`][^'"`]*(?:rounded-(?:lg|xl|2xl))[^'"`]*(?:shadow|bg-(?:white|card))[^'"`]*['"`][^>]*>/g,
  // Typography utility classes
  typographyUtility: /className\s*=\s*['"`][^'"`]*(?:heading-(?:display|page|section|card|subsection|label)|body-(?:base|small)|text-(?:label|caption|secondary|micro))[^'"`]*['"`]/g,
  // Inline typography (text-Xnl font-* combinations)
  inlineTypography: /className\s*=\s*['"`][^'"`]*text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)[^'"`]*font-(?:normal|medium|semibold|bold)[^'"`]*['"`]/g,
  // Layout wrapper components
  smartLayoutImport: /import\s*\{[^}]*SmartLayout[^}]*\}/,
  appLayoutImport: /import\s*\{[^}]*AppLayout[^}]*\}/,
  mobileLayoutImport: /import\s*\{[^}]*MobileLayout[^}]*\}/,
  layoutUsage: /<(?:SmartLayout|AppLayout|AppLayoutV2|MobileLayout|ClientPortalLayout)[^>]*>/,
  // Card structure patterns
  cardWithHeader: /<Card[^>]*>[\s\S]*?<CardHeader/,
  cardWithContent: /<Card[^>]*>[\s\S]*?<CardContent/,
};

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

function determinePageType(filePath: string): 'page' | 'component' | 'feature' | 'other' {
  if (filePath.includes('/pages/') || filePath.endsWith('Page.tsx')) {
    return 'page';
  }
  if (filePath.includes('/features/')) {
    return 'feature';
  }
  if (filePath.includes('/components/')) {
    return 'component';
  }
  return 'other';
}

function detectLayoutWrapper(content: string): string | null {
  if (/<SmartLayout/.test(content)) {return 'SmartLayout';}
  if (/<AppLayoutV2/.test(content)) {return 'AppLayoutV2';}
  if (/<AppLayout[^V]/.test(content)) {return 'AppLayout';}
  if (/<MobileLayout/.test(content)) {return 'MobileLayout';}
  if (/<ClientPortalLayout/.test(content)) {return 'ClientPortalLayout';}
  return null;
}

function analyzeFile(filePath: string): { usage: ComponentUsage, violations: ComponentViolation[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const pageType = determinePageType(filePath);
  const violations: ComponentViolation[] = [];

  // Card analysis
  const cardImports = patterns.cardImport.test(content);
  const cardMatches = content.match(patterns.cardUsage) || [];
  const cardUsage = cardMatches.length;

  // Count raw card divs
  let rawCardDivs = 0;
  lines.forEach((line, index) => {
    patterns.rawCardDiv.lastIndex = 0;
    if (patterns.rawCardDiv.test(line)) {
      rawCardDivs++;
      // Only flag if Card is not imported (could be intentional without Card)
      if (!cardImports) {
        violations.push({
          file: filePath,
          line: index + 1,
          type: 'raw-card-div',
          pattern: line.trim().substring(0, 100),
          context: 'Div styled as card without using Card component',
          suggestion: 'Import and use Card component from @/components/ui/card',
        });
      }
    }
  });

  // Typography analysis
  const typographyMatches = content.match(patterns.typographyUtility) || [];
  const typographyUtilities = typographyMatches.length;

  let inlineTypography = 0;
  lines.forEach((line, index) => {
    patterns.inlineTypography.lastIndex = 0;
    if (patterns.inlineTypography.test(line)) {
      // Exclude if it also has a typography utility
      if (!patterns.typographyUtility.test(line)) {
        inlineTypography++;
        violations.push({
          file: filePath,
          line: index + 1,
          type: 'inline-typography',
          pattern: line.trim().substring(0, 100),
          context: 'Inline typography classes instead of utility',
          suggestion: 'Use typography utilities: heading-page, heading-section, body-base, etc.',
        });
      }
    }
  });

  // Layout wrapper analysis (only for pages)
  const layoutWrapper = detectLayoutWrapper(content);
  if (pageType === 'page' && !layoutWrapper) {
    // Check if it's a simple redirect or error page
    const isSimplePage = content.includes('Navigate') || content.includes('redirect') || content.length < 500;
    if (!isSimplePage) {
      violations.push({
        file: filePath,
        line: 1,
        type: 'missing-layout-wrapper',
        pattern: 'Page component',
        context: 'Page without SmartLayout or AppLayout wrapper',
        suggestion: 'Wrap page content in SmartLayout for consistent layout',
      });
    }
  }

  // Card structure consistency (if using Card, should use CardHeader/CardContent)
  if (cardUsage > 0) {
    const hasProperStructure = patterns.cardWithHeader.test(content) || patterns.cardWithContent.test(content);
    const simpleCardCount = (content.match(/<Card[^>]*>[^<]*<\/Card>/g) || []).length;
    if (simpleCardCount > 0 && !hasProperStructure) {
      violations.push({
        file: filePath,
        line: 1,
        type: 'inconsistent-card-structure',
        pattern: 'Card without proper structure',
        context: `${simpleCardCount} Card(s) without CardHeader/CardContent`,
        suggestion: 'Use CardHeader, CardTitle, CardContent for consistent structure',
      });
    }
  }

  return {
    usage: {
      file: filePath,
      cardImports,
      cardUsage,
      rawCardDivs,
      typographyUtilities,
      inlineTypography,
      layoutWrapper,
      pageType,
    },
    violations,
  };
}

function generateMarkdownReport(report: AuditReport, outputPath: string): void {
  const lines: string[] = [];

  lines.push('# Design System Component Usage Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}\n`);

  lines.push('## Summary\n');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Files Scanned | ${report.filesScanned} |`);
  lines.push(`| Files with Violations | ${report.filesWithViolations} |`);
  lines.push(`| Total Violations | ${report.totalViolations} |`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  lines.push(`| **Compliance Score** | **${complianceScore}%** |\n`);

  lines.push('## Violations by Type\n');
  lines.push('| Type | Count | Description |');
  lines.push('|------|-------|-------------|');
  lines.push(`| Raw Card Divs | ${report.violationsByType.rawCardDiv} | Divs styled as cards without Card component |`);
  lines.push(`| Inline Typography | ${report.violationsByType.inlineTypography} | text-* font-* without typography utilities |`);
  lines.push(`| Missing Layout Wrapper | ${report.violationsByType.missingLayoutWrapper} | Pages without SmartLayout/AppLayout |`);
  lines.push(`| Inconsistent Card Structure | ${report.violationsByType.inconsistentCardStructure} | Cards without proper subcomponents |\n`);

  lines.push('## Component Usage Statistics\n');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Files using Card component | ${report.componentUsageStats.filesUsingCard} |`);
  lines.push(`| Files with raw card divs | ${report.componentUsageStats.filesWithRawCardDivs} |`);
  lines.push(`| Files using typography utilities | ${report.componentUsageStats.filesUsingTypographyUtilities} |`);
  lines.push(`| Files with inline typography | ${report.componentUsageStats.filesWithInlineTypography} |`);
  lines.push(`| Pages with SmartLayout | ${report.componentUsageStats.pagesWithSmartLayout} |`);
  lines.push(`| Pages without layout wrapper | ${report.componentUsageStats.pagesWithoutLayout} |\n`);

  lines.push('## Layout Wrapper Usage\n');
  lines.push('| Wrapper | Usage Count |');
  lines.push('|---------|-------------|');
  Object.entries(report.layoutWrapperUsage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([wrapper, count]) => {
      lines.push(`| ${wrapper} | ${count} |`);
    });
  lines.push('');

  if (report.topViolators.length > 0) {
    lines.push('## Top 20 Files Needing Attention\n');
    lines.push('| File | Violations |');
    lines.push('|------|------------|');
    report.topViolators.slice(0, 20).forEach(file => {
      lines.push(`| ${file.file} | ${file.violationCount} |`);
    });
    lines.push('');
  }

  lines.push('## Recommended Patterns\n');
  lines.push('### Card Component Usage\n');
  lines.push('```tsx');
  lines.push('// BEFORE (raw div)');
  lines.push('<div className="rounded-xl bg-white shadow-sm border p-4">');
  lines.push('  <h3>Title</h3>');
  lines.push('  <p>Content</p>');
  lines.push('</div>');
  lines.push('');
  lines.push('// AFTER (Card component)');
  lines.push('<Card>');
  lines.push('  <CardHeader>');
  lines.push('    <CardTitle>Title</CardTitle>');
  lines.push('  </CardHeader>');
  lines.push('  <CardContent>');
  lines.push('    <p>Content</p>');
  lines.push('  </CardContent>');
  lines.push('</Card>');
  lines.push('```\n');

  lines.push('### Typography Utilities\n');
  lines.push('```tsx');
  lines.push('// BEFORE (inline classes)');
  lines.push('<h1 className="text-3xl font-bold">Page Title</h1>');
  lines.push('<p className="text-sm text-gray-600">Description</p>');
  lines.push('');
  lines.push('// AFTER (typography utilities)');
  lines.push('<h1 className="heading-page">Page Title</h1>');
  lines.push('<p className="text-secondary body-small">Description</p>');
  lines.push('```\n');

  lines.push('### Page Layout Wrapper\n');
  lines.push('```tsx');
  lines.push('// Every page should use SmartLayout');
  lines.push('export default function MyPage() {');
  lines.push('  return (');
  lines.push('    <SmartLayout title="Page Title" subtitle="Description">');
  lines.push('      <div className="p-6 space-y-6">');
  lines.push('        {/* Page content */}');
  lines.push('      </div>');
  lines.push('    </SmartLayout>');
  lines.push('  );');
  lines.push('}');
  lines.push('```\n');

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
  console.log('  Design System Component Usage Audit');
  console.log('═══════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const files = getAllFiles('src');
  console.log(`→ Found ${files.length} files to scan\n`);

  const fileViolations: FileViolations[] = [];
  const componentUsages: ComponentUsage[] = [];
  let totalViolations = 0;
  const layoutWrapperUsage: { [key: string]: number } = {};

  files.forEach((file, index) => {
    const { usage, violations } = analyzeFile(file);
    componentUsages.push(usage);

    if (violations.length > 0) {
      fileViolations.push({ file, violations, violationCount: violations.length });
      totalViolations += violations.length;
    }

    if (usage.layoutWrapper) {
      layoutWrapperUsage[usage.layoutWrapper] = (layoutWrapperUsage[usage.layoutWrapper] || 0) + 1;
    }

    if ((index + 1) % 200 === 0) {
      console.log(`  → Progress: ${index + 1}/${files.length} files scanned`);
    }
  });

  const topViolators = [...fileViolations].sort((a, b) => b.violationCount - a.violationCount);

  const violationsByType = {
    rawCardDiv: 0,
    inlineTypography: 0,
    missingLayoutWrapper: 0,
    inconsistentCardStructure: 0,
  };

  fileViolations.forEach(fv => {
    fv.violations.forEach(v => {
      if (v.type === 'raw-card-div') {violationsByType.rawCardDiv++;}
      else if (v.type === 'inline-typography') {violationsByType.inlineTypography++;}
      else if (v.type === 'missing-layout-wrapper') {violationsByType.missingLayoutWrapper++;}
      else if (v.type === 'inconsistent-card-structure') {violationsByType.inconsistentCardStructure++;}
    });
  });

  const pages = componentUsages.filter(u => u.pageType === 'page');
  const componentUsageStats = {
    filesUsingCard: componentUsages.filter(u => u.cardUsage > 0).length,
    filesWithRawCardDivs: componentUsages.filter(u => u.rawCardDivs > 0).length,
    filesUsingTypographyUtilities: componentUsages.filter(u => u.typographyUtilities > 0).length,
    filesWithInlineTypography: componentUsages.filter(u => u.inlineTypography > 0).length,
    pagesWithSmartLayout: pages.filter(u => u.layoutWrapper === 'SmartLayout').length,
    pagesWithoutLayout: pages.filter(u => !u.layoutWrapper).length,
  };

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    filesScanned: files.length,
    filesWithViolations: fileViolations.length,
    totalViolations,
    violationsByType,
    componentUsageStats,
    fileViolations,
    topViolators,
    layoutWrapperUsage,
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Audit Results');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`Files scanned: ${report.filesScanned}`);
  console.log(`Files with violations: ${report.filesWithViolations}`);
  console.log(`Total violations: ${report.totalViolations}`);
  console.log(`\nViolations by type:`);
  console.log(`  - Raw card divs: ${violationsByType.rawCardDiv}`);
  console.log(`  - Inline typography: ${violationsByType.inlineTypography}`);
  console.log(`  - Missing layout wrapper: ${violationsByType.missingLayoutWrapper}`);
  console.log(`  - Inconsistent card structure: ${violationsByType.inconsistentCardStructure}`);
  console.log(`\nComponent usage:`);
  console.log(`  - Files using Card: ${componentUsageStats.filesUsingCard}`);
  console.log(`  - Files with typography utilities: ${componentUsageStats.filesUsingTypographyUtilities}`);
  console.log(`  - Pages with SmartLayout: ${componentUsageStats.pagesWithSmartLayout}`);
  console.log(`  - Pages without layout: ${componentUsageStats.pagesWithoutLayout}`);

  const complianceScore = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100).toFixed(1);
  console.log(`\nCompliance Score: ${complianceScore}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${elapsed}s\n`);

  generateJsonReport(report, 'audit-reports/component-usage.json');
  generateMarkdownReport(report, 'audit-reports/component-usage.md');

  console.log('\n═══════════════════════════════════════════════════\n');
}

runAudit().catch(console.error);
