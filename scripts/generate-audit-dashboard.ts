#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * Generate Design System Audit Dashboard
 * Combines all audit reports into an interactive HTML dashboard
 */

import fs from 'fs';
import path from 'path';

interface AuditReport {
  timestamp: string;
  totalFiles: number;
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsByType: Record<string, number>;
  topViolators?: Array<{ file: string; violationCount: number }>;
}

interface DashboardData {
  generatedAt: string;
  reports: {
    colors?: AuditReport;
    typography?: AuditReport;
    touchTargets?: AuditReport;
    darkMode?: AuditReport;
  };
  overallScore: number;
  totalViolations: number;
  filesScanned: number;
}

function loadReport(reportPath: string): AuditReport | null {
  try {
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`⚠️  Could not load ${reportPath}: ${error}`);
  }
  return null;
}

function calculateOverallScore(reports: DashboardData['reports']): number {
  const scores: number[] = [];

  Object.values(reports).forEach(report => {
    if (report && report.filesScanned > 0) {
      const score = ((report.filesScanned - report.filesWithViolations) / report.filesScanned) * 100;
      scores.push(score);
    }
  });

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

function generateHTML(data: DashboardData): string {
  const {colors, typography, touchTargets, darkMode} = data.reports;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System Compliance Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      color: #1a202c;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    header {
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      color: white;
      padding: 3rem 0;
      margin-bottom: 3rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    .subtitle { opacity: 0.9; font-size: 1.125rem; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; margin-bottom: 3rem; }
    .card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2d3748;
    }
    .score-badge {
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 1.125rem;
    }
    .score-excellent { background: #10b981; color: white; }
    .score-good { background: #3b82f6; color: white; }
    .score-warning { background: #f59e0b; color: white; }
    .score-critical { background: #ef4444; color: white; }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; font-size: 0.875rem; }
    .metric-value { font-weight: 600; color: #1f2937; }
    .violation-badge {
      background: #fef2f2;
      color: #991b1b;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .overall-score {
      text-align: center;
      background: white;
      border-radius: 16px;
      padding: 3rem;
      margin-bottom: 3rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .overall-score-value {
      font-size: 5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 1rem 0;
    }
    .overall-score-label {
      font-size: 1.5rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 1rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #3b82f6);
      transition: width 1s ease-out;
    }
    .top-violators {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .top-violators h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #1f2937;
    }
    .violator-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }
    .violator-item:last-child { border-bottom: none; }
    .violator-file { color: #4b5563; flex: 1; }
    .violator-count {
      background: #fee2e2;
      color: #991b1b;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-weight: 600;
      margin-left: 1rem;
    }
    .timestamp {
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
      margin-top: 2rem;
    }
    @media (max-width: 768px) {
      .dashboard-grid { grid-template-columns: 1fr; }
      .overall-score-value { font-size: 3rem; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Design System Compliance Dashboard</h1>
      <p class="subtitle">JobSight Construction Field Management</p>
    </div>
  </header>

  <div class="container">
    <div class="overall-score">
      <div class="overall-score-label">Overall Compliance Score</div>
      <div class="overall-score-value">${data.overallScore.toFixed(1)}%</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${data.overallScore}%"></div>
      </div>
      <p style="margin-top: 1rem; color: #6b7280;">
        ${data.filesScanned} files scanned · ${data.totalViolations} total violations
      </p>
    </div>

    <div class="dashboard-grid">
      ${generateColorCard(colors)}
      ${generateTypographyCard(typography)}
      ${generateTouchTargetsCard(touchTargets)}
      ${generateDarkModeCard(darkMode)}
    </div>

    ${generateTopViolators(data.reports)}

    <div class="timestamp">
      Generated: ${new Date(data.generatedAt).toLocaleString()}
    </div>
  </div>
</body>
</html>`;
}

function getScoreClass(score: number): string {
  if (score >= 90) {return 'score-excellent';}
  if (score >= 70) {return 'score-good';}
  if (score >= 50) {return 'score-warning';}
  return 'score-critical';
}

function generateColorCard(report: AuditReport | undefined): string {
  if (!report) {return '<div class="card"><p>Color audit not available</p></div>';}
  
  const score = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100);
  
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">🎨 Color System</h3>
        <span class="score-badge ${getScoreClass(score)}">${score.toFixed(1)}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Files with violations</span>
        <span class="violation-badge">${report.filesWithViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total violations</span>
        <span class="metric-value">${report.totalViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Hard-coded classes</span>
        <span class="metric-value">${report.violationsByType.hardCodedClass || 0}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Missing dark variants</span>
        <span class="metric-value">${report.violationsByType.missingDarkVariant || 0}</span>
      </div>
    </div>
  `;
}

function generateTypographyCard(report: AuditReport | undefined): string {
  if (!report) {return '<div class="card"><p>Typography audit not available</p></div>';}
  
  const score = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100);
  
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📝 Typography</h3>
        <span class="score-badge ${getScoreClass(score)}">${score.toFixed(1)}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Files with violations</span>
        <span class="violation-badge">${report.filesWithViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total violations</span>
        <span class="metric-value">${report.totalViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Inline font styles</span>
        <span class="metric-value">${(report.violationsByType.inlineFontSize || 0) + (report.violationsByType.inlineFontWeight || 0)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Headings without classes</span>
        <span class="metric-value">${report.violationsByType.headingWithoutClass || 0}</span>
      </div>
    </div>
  `;
}

function generateTouchTargetsCard(report: AuditReport | undefined): string {
  if (!report) {return '<div class="card"><p>Touch targets audit not available</p></div>';}
  
  const score = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100);
  
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">👆 Touch Targets</h3>
        <span class="score-badge ${getScoreClass(score)}">${score.toFixed(1)}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Files with violations</span>
        <span class="violation-badge">${report.filesWithViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total violations</span>
        <span class="metric-value">${report.totalViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Small buttons/inputs</span>
        <span class="metric-value">${(report.violationsByType.smallButton || 0) + (report.violationsByType.smallInput || 0)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Missing ARIA labels</span>
        <span class="metric-value">${report.violationsByType.missingAriaLabel || 0}</span>
      </div>
    </div>
  `;
}

function generateDarkModeCard(report: AuditReport | undefined): string {
  if (!report) {return '<div class="card"><p>Dark mode audit not available</p></div>';}
  
  const score = ((report.filesScanned - report.filesWithViolations) / report.filesScanned * 100);
  
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">🌙 Dark Mode</h3>
        <span class="score-badge ${getScoreClass(score)}">${score.toFixed(1)}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Files with violations</span>
        <span class="violation-badge">${report.filesWithViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total violations</span>
        <span class="metric-value">${report.totalViolations}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Missing dark:bg-</span>
        <span class="metric-value">${report.violationsByType.missingDarkBg || 0}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Missing dark:text-</span>
        <span class="metric-value">${report.violationsByType.missingDarkText || 0}</span>
      </div>
    </div>
  `;
}

function generateTopViolators(reports: DashboardData['reports']): string {
  const allViolators: Array<{ file: string; violations: number; category: string }> = [];

  Object.entries(reports).forEach(([category, report]) => {
    if (report?.topViolators) {
      report.topViolators.slice(0, 5).forEach(v => {
        allViolators.push({
          file: v.file,
          violations: v.violationCount,
          category,
        });
      });
    }
  });

  allViolators.sort((a, b) => b.violations - a.violations);
  const top10 = allViolators.slice(0, 10);

  if (top10.length === 0) {
    return '<div class="top-violators"><h2>🎉 No violations found!</h2></div>';
  }

  return `
    <div class="top-violators">
      <h2>Top 10 Files Needing Attention</h2>
      ${top10.map(v => `
        <div class="violator-item">
          <span class="violator-file">${v.file}</span>
          <span class="violator-count">${v.violations} violations</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function generateDashboard(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Generating Design System Audit Dashboard');
  console.log('═══════════════════════════════════════════════════\n');

  // Load all audit reports
  const colors = loadReport('audit-reports/color-compliance.json');
  const typography = loadReport('audit-reports/typography-compliance.json');
  const touchTargets = loadReport('audit-reports/touch-targets-compliance.json');
  const darkMode = loadReport('audit-reports/dark-mode-compliance.json');

  const reports = { colors, typography, touchTargets, darkMode };

  // Calculate total violations and files scanned
  let totalViolations = 0;
  let filesScanned = 0;

  Object.values(reports).forEach(report => {
    if (report) {
      totalViolations += report.totalViolations;
      filesScanned = Math.max(filesScanned, report.filesScanned);
    }
  });

  const data: DashboardData = {
    generatedAt: new Date().toISOString(),
    reports,
    overallScore: calculateOverallScore(reports),
    totalViolations,
    filesScanned,
  };

  // Generate HTML
  const html = generateHTML(data);

  // Save dashboard
  const outputPath = 'audit-reports/design-system-audit-dashboard.html';
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);

  console.log(`✓ Dashboard generated: ${outputPath}`);
  console.log(`\nOverall Compliance Score: ${data.overallScore.toFixed(1)}%`);
  console.log(`Total Violations: ${totalViolations}`);
  console.log(`\n═══════════════════════════════════════════════════\n`);
}

generateDashboard().catch(console.error);
