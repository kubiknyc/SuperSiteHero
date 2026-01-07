#!/usr/bin/env node
/**
 * PWA Icon Generator Script
 *
 * Generates all required PWA icons from the source SVG icon.
 * Requires: sharp (npm install sharp)
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_ICON_SIZE = 180;
const MASKABLE_SIZE = 512;

// Splash screen sizes for iOS (width x height)
const SPLASH_SIZES = [
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732' },  // 12.9" iPad Pro
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388' },  // 11" iPad Pro
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048' },  // 9.7" iPad
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796' },  // iPhone 14 Pro Max
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556' },  // iPhone 14 Pro
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532' },  // iPhone 12/13
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436' },  // iPhone X/XS
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688' },  // iPhone XS Max
  { width: 828, height: 1792, name: 'apple-splash-828-1792' },    // iPhone XR
  { width: 1284, height: 2778, name: 'apple-splash-1284-2778' },  // iPhone 12 Pro Max
  { width: 750, height: 1334, name: 'apple-splash-750-1334' },    // iPhone 8
  { width: 640, height: 1136, name: 'apple-splash-640-1136' },    // iPhone SE
];

const SOURCE_SVG = path.join(__dirname, '../public/icon.svg');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const SPLASH_DIR = path.join(__dirname, '../public/splash');
const SCREENSHOTS_DIR = path.join(__dirname, '../public/screenshots');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    console.log('\n📦 Installing sharp for image processing...\n');
    const { execSync } = require('child_process');
    execSync('npm install sharp', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  // Create output directories
  [ICONS_DIR, SPLASH_DIR, SCREENSHOTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Read source SVG
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error('❌ Source SVG not found:', SOURCE_SVG);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SOURCE_SVG);
  console.log('\n🎨 Generating PWA icons from:', SOURCE_SVG);

  // Generate standard icons
  console.log('\n📱 Generating standard icons...');
  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  // Generate Apple touch icon
  console.log('\n🍎 Generating Apple touch icon...');
  const appleIconPath = path.join(ICONS_DIR, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE)
    .png()
    .toFile(appleIconPath);
  console.log(`  ✓ apple-touch-icon.png (${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE})`);

  // Generate maskable icon (with padding for safe area)
  console.log('\n🎭 Generating maskable icon...');
  const maskablePath = path.join(ICONS_DIR, 'maskable-icon-512x512.png');
  // Maskable icons need ~10% padding on each side (80% icon size)
  const maskableIconSize = Math.floor(MASKABLE_SIZE * 0.8);
  const padding = Math.floor((MASKABLE_SIZE - maskableIconSize) / 2);

  await sharp(svgBuffer)
    .resize(maskableIconSize, maskableIconSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 37, g: 99, b: 235, alpha: 1 } // #2563eb
    })
    .png()
    .toFile(maskablePath);
  console.log(`  ✓ maskable-icon-512x512.png`);

  // Generate splash screens
  console.log('\n🌅 Generating splash screens...');
  for (const splash of SPLASH_SIZES) {
    const outputPath = path.join(SPLASH_DIR, `${splash.name}.png`);

    // Calculate icon size (40% of smaller dimension)
    const iconSize = Math.floor(Math.min(splash.width, splash.height) * 0.3);
    const iconLeft = Math.floor((splash.width - iconSize) / 2);
    const iconTop = Math.floor((splash.height - iconSize) / 2);

    // Create splash screen with centered icon
    const iconBuffer = await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([
        {
          input: iconBuffer,
          left: iconLeft,
          top: iconTop
        }
      ])
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${splash.name}.png`);
  }

  // Create placeholder screenshots
  console.log('\n📸 Creating placeholder screenshots...');

  // Desktop screenshot placeholder
  const desktopPath = path.join(SCREENSHOTS_DIR, 'desktop-dashboard.png');
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: { r: 249, g: 250, b: 251, alpha: 1 } // gray-50
    }
  })
    .png()
    .toFile(desktopPath);
  console.log('  ✓ desktop-dashboard.png (placeholder)');

  // Mobile screenshot placeholder
  const mobilePath = path.join(SCREENSHOTS_DIR, 'mobile-dashboard.png');
  await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 4,
      background: { r: 249, g: 250, b: 251, alpha: 1 }
    }
  })
    .png()
    .toFile(mobilePath);
  console.log('  ✓ mobile-dashboard.png (placeholder)');

  // Generate browserconfig.xml for Microsoft
  console.log('\n🪟 Generating browserconfig.xml...');
  const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/icons/icon-72x72.png"/>
      <square150x150logo src="/icons/icon-152x152.png"/>
      <square310x310logo src="/icons/icon-384x384.png"/>
      <TileColor>#2563eb</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
  fs.writeFileSync(path.join(__dirname, '../public/browserconfig.xml'), browserConfig);
  console.log('  ✓ browserconfig.xml');

  console.log('\n✅ All PWA assets generated successfully!\n');
  console.log('📋 Summary:');
  console.log(`   • ${ICON_SIZES.length} standard icons`);
  console.log('   • 1 Apple touch icon');
  console.log('   • 1 maskable icon');
  console.log(`   • ${SPLASH_SIZES.length} splash screens`);
  console.log('   • 2 placeholder screenshots');
  console.log('   • 1 browserconfig.xml\n');
  console.log('💡 Tip: Replace the placeholder screenshots with actual app screenshots.\n');
}

generateIcons().catch(console.error);
