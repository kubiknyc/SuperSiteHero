/**
 * Bundle Size Reporter
 *
 * Reports bundle sizes after build and optionally fails if thresholds are exceeded.
 * Run with: npm run build:size
 */

import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIST_DIR = 'dist';
const ASSETS_DIR = join(DIST_DIR, 'assets');

// Size thresholds in KB (can be adjusted)
const THRESHOLDS = {
  // Individual chunk limits
  maxChunkSize: 500,       // 500KB per chunk
  // Total limits
  maxTotalJS: 2000,        // 2MB total JS
  maxTotalCSS: 200,        // 200KB total CSS
  maxInitialJS: 400,       // 400KB initial JS bundle (excluding lazy chunks)
};

// Format bytes to human readable
function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb > 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${kb.toFixed(2)} KB`;
}

// Get file size info
function getFileInfo(filePath) {
  const stats = statSync(filePath);
  return {
    path: filePath,
    size: stats.size,
    sizeFormatted: formatSize(stats.size),
  };
}

// Collect all files in assets directory
function collectAssets() {
  const jsFiles = [];
  const cssFiles = [];
  const otherFiles = [];

  try {
    const files = readdirSync(ASSETS_DIR);

    for (const file of files) {
      const filePath = join(ASSETS_DIR, file);
      const ext = extname(file);
      const info = getFileInfo(filePath);
      info.name = file;

      if (ext === '.js') {
        jsFiles.push(info);
      } else if (ext === '.css') {
        cssFiles.push(info);
      } else {
        otherFiles.push(info);
      }
    }
  } catch (error) {
    console.error('Error reading assets directory:', error.message);
    process.exit(1);
  }

  return { jsFiles, cssFiles, otherFiles };
}

// Check if any thresholds are exceeded
function checkThresholds(jsFiles, cssFiles) {
  const issues = [];

  // Check individual chunk sizes
  for (const file of jsFiles) {
    const sizeKB = file.size / 1024;
    if (sizeKB > THRESHOLDS.maxChunkSize) {
      issues.push({
        type: 'warning',
        message: `Chunk "${file.name}" (${file.sizeFormatted}) exceeds ${THRESHOLDS.maxChunkSize}KB limit`,
      });
    }
  }

  // Check total JS size
  const totalJS = jsFiles.reduce((sum, f) => sum + f.size, 0);
  const totalJSKB = totalJS / 1024;
  if (totalJSKB > THRESHOLDS.maxTotalJS) {
    issues.push({
      type: 'error',
      message: `Total JS (${formatSize(totalJS)}) exceeds ${THRESHOLDS.maxTotalJS}KB limit`,
    });
  }

  // Check total CSS size
  const totalCSS = cssFiles.reduce((sum, f) => sum + f.size, 0);
  const totalCSSKB = totalCSS / 1024;
  if (totalCSSKB > THRESHOLDS.maxTotalCSS) {
    issues.push({
      type: 'warning',
      message: `Total CSS (${formatSize(totalCSS)}) exceeds ${THRESHOLDS.maxTotalCSS}KB limit`,
    });
  }

  // Check initial bundle size (main entry chunks, not lazy-loaded)
  const initialChunks = jsFiles.filter(f =>
    f.name.startsWith('index-') ||
    f.name.includes('react-vendor') ||
    f.name.includes('vendor-') && !f.name.includes('charts') && !f.name.includes('pdf')
  );
  const initialSize = initialChunks.reduce((sum, f) => sum + f.size, 0);
  const initialSizeKB = initialSize / 1024;
  if (initialSizeKB > THRESHOLDS.maxInitialJS) {
    issues.push({
      type: 'warning',
      message: `Initial JS bundle (${formatSize(initialSize)}) exceeds ${THRESHOLDS.maxInitialJS}KB target`,
    });
  }

  return issues;
}

// Main function
function main() {
  console.log('\n📦 Bundle Size Report\n');
  console.log('='.repeat(60));

  const { jsFiles, cssFiles, otherFiles } = collectAssets();

  // Sort by size descending
  jsFiles.sort((a, b) => b.size - a.size);
  cssFiles.sort((a, b) => b.size - a.size);

  // Report JS files
  console.log('\n📜 JavaScript Bundles:');
  console.log('-'.repeat(60));
  for (const file of jsFiles) {
    const sizeKB = file.size / 1024;
    const indicator = sizeKB > THRESHOLDS.maxChunkSize ? '⚠️ ' : '  ';
    console.log(`${indicator}${file.name.padEnd(45)} ${file.sizeFormatted.padStart(12)}`);
  }

  const totalJS = jsFiles.reduce((sum, f) => sum + f.size, 0);
  console.log('-'.repeat(60));
  console.log(`  ${'Total JavaScript:'.padEnd(45)} ${formatSize(totalJS).padStart(12)}`);

  // Report CSS files
  if (cssFiles.length > 0) {
    console.log('\n🎨 CSS Bundles:');
    console.log('-'.repeat(60));
    for (const file of cssFiles) {
      console.log(`  ${file.name.padEnd(45)} ${file.sizeFormatted.padStart(12)}`);
    }
    const totalCSS = cssFiles.reduce((sum, f) => sum + f.size, 0);
    console.log('-'.repeat(60));
    console.log(`  ${'Total CSS:'.padEnd(45)} ${formatSize(totalCSS).padStart(12)}`);
  }

  // Summary
  const totalSize = [...jsFiles, ...cssFiles, ...otherFiles].reduce((sum, f) => sum + f.size, 0);
  console.log('\n📊 Summary:');
  console.log('-'.repeat(60));
  console.log(`  ${'JS Chunks:'.padEnd(20)} ${jsFiles.length}`);
  console.log(`  ${'CSS Files:'.padEnd(20)} ${cssFiles.length}`);
  console.log(`  ${'Total Size:'.padEnd(20)} ${formatSize(totalSize)}`);

  // Check thresholds
  const issues = checkThresholds(jsFiles, cssFiles);

  if (issues.length > 0) {
    console.log('\n⚠️  Threshold Issues:');
    console.log('-'.repeat(60));
    for (const issue of issues) {
      const icon = issue.type === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.message}`);
    }
  } else {
    console.log('\n✅ All bundle size thresholds passed!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 Run "npm run analyze" for detailed bundle visualization\n');

  // Exit with error if there are error-level issues
  const hasErrors = issues.some(i => i.type === 'error');
  if (hasErrors) {
    process.exit(1);
  }
}

main();
