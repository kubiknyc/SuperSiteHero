/**
 * Generate iOS PWA Splash Screens
 *
 * This script generates splash screen images for all iOS devices.
 * Uses sharp for image processing.
 *
 * Usage: node scripts/generate-ios-splash.cjs
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Splash screen dimensions for all iOS devices
const splashScreens = [
  // iPhone 16 Pro Max (6.9")
  { width: 1320, height: 2868, name: 'apple-splash-1320-2868.png' },
  // iPhone 15/16 Pro Max, 16 Plus (6.7")
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796.png' },
  // iPhone 15/16 Pro, 16 (6.1" ProMotion)
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556.png' },
  // iPhone 14 Plus, 13/12 Pro Max (6.7")
  { width: 1284, height: 2778, name: 'apple-splash-1284-2778.png' },
  // iPhone 14/13/12 (6.1")
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532.png' },
  // iPhone 13/12 mini (5.4")
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' },
  // iPhone 11 Pro Max, XS Max (6.5")
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' },
  // iPhone 11, XR (6.1" LCD)
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' },
  // iPhone 8 Plus, 7 Plus (5.5")
  { width: 1242, height: 2208, name: 'apple-splash-1242-2208.png' },
  // iPhone 8, 7, 6s (4.7")
  { width: 750, height: 1334, name: 'apple-splash-750-1334.png' },
  // iPhone SE, 5s (4")
  { width: 640, height: 1136, name: 'apple-splash-640-1136.png' },

  // iPad Pro 12.9" - Portrait
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' },
  // iPad Pro 12.9" - Landscape
  { width: 2732, height: 2048, name: 'apple-splash-2732-2048.png' },
  // iPad Pro 11" - Portrait
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' },
  // iPad Pro 11" - Landscape
  { width: 2388, height: 1668, name: 'apple-splash-2388-1668.png' },
  // iPad Air 5/4, iPad 10th - Portrait
  { width: 1640, height: 2360, name: 'apple-splash-1640-2360.png' },
  // iPad Air 5/4, iPad 10th - Landscape
  { width: 2360, height: 1640, name: 'apple-splash-2360-1640.png' },
  // iPad 9th/8th/7th, iPad Air 3, iPad Pro 10.5" - Portrait
  { width: 1668, height: 2224, name: 'apple-splash-1668-2224.png' },
  // iPad 9th/8th/7th, iPad Air 3, iPad Pro 10.5" - Landscape
  { width: 2224, height: 1668, name: 'apple-splash-2224-1668.png' },
  // iPad mini 6 - Portrait
  { width: 1488, height: 2266, name: 'apple-splash-1488-2266.png' },
  // iPad mini 6 - Landscape
  { width: 2266, height: 1488, name: 'apple-splash-2266-1488.png' },
  // iPad 6th/5th, iPad Air 2/1, iPad mini 5/4 - Portrait
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' },
  // iPad 6th/5th, iPad Air 2/1, iPad mini 5/4 - Landscape
  { width: 2048, height: 1536, name: 'apple-splash-2048-1536.png' },
];

// Brand colors
const BACKGROUND_COLOR = '#F97316'; // JobSight orange
const LOGO_COLOR = '#FFFFFF';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '../public/splash');

async function generateSplashScreen(config) {
  const { width, height, name } = config;
  const outputPath = path.join(OUTPUT_DIR, name);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`  Skipping ${name} (already exists)`);
    return;
  }

  // Calculate logo size (20% of smaller dimension)
  const logoSize = Math.round(Math.min(width, height) * 0.2);
  const logoX = Math.round((width - logoSize) / 2);
  const logoY = Math.round((height - logoSize) / 2);

  // Create SVG logo
  const logoSvg = `
    <svg width="${logoSize}" height="${logoSize}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Hard hat icon -->
      <ellipse cx="50" cy="65" rx="40" ry="20" fill="${LOGO_COLOR}" opacity="0.9"/>
      <path d="M15 55 Q15 25 50 20 Q85 25 85 55 L85 60 Q85 65 80 65 L20 65 Q15 65 15 60 Z" fill="${LOGO_COLOR}"/>
      <rect x="20" y="50" width="60" height="8" rx="2" fill="${BACKGROUND_COLOR}" opacity="0.3"/>
      <text x="50" y="92" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="${LOGO_COLOR}">JobSight</text>
    </svg>
  `;

  try {
    // Create splash screen
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: BACKGROUND_COLOR,
      },
    })
      .composite([
        {
          input: Buffer.from(logoSvg),
          top: logoY,
          left: logoX,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`  Created ${name} (${width}x${height})`);
  } catch (error) {
    console.error(`  Error creating ${name}:`, error.message);
  }
}

async function main() {
  console.log('Generating iOS PWA Splash Screens...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}\n`);
  }

  // Generate all splash screens
  for (const config of splashScreens) {
    await generateSplashScreen(config);
  }

  console.log('\nDone! Splash screens generated in public/splash/');
}

main().catch(console.error);
