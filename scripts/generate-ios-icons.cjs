/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */
/**
 * iOS Icon Generator for JobSight
 *
 * Generates all required iOS app icons from a source image.
 * Requires: npm install sharp
 *
 * Usage: node scripts/generate-ios-icons.cjs [source-image]
 *
 * If no source image is provided, uses public/icons/icon-1024x1024.png
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS App Icon sizes (as of iOS 17+ / Xcode 15+)
// Modern iOS only requires a single 1024x1024 icon
const IOS_ICONS = [
  { size: 1024, scale: 1, filename: 'AppIcon-512@2x.png' }, // App Store icon
];

// Legacy icon sizes (for older iOS support if needed)
const LEGACY_IOS_ICONS = [
  { size: 20, scale: 1, filename: 'Icon-20.png' },
  { size: 20, scale: 2, filename: 'Icon-20@2x.png' },
  { size: 20, scale: 3, filename: 'Icon-20@3x.png' },
  { size: 29, scale: 1, filename: 'Icon-29.png' },
  { size: 29, scale: 2, filename: 'Icon-29@2x.png' },
  { size: 29, scale: 3, filename: 'Icon-29@3x.png' },
  { size: 40, scale: 1, filename: 'Icon-40.png' },
  { size: 40, scale: 2, filename: 'Icon-40@2x.png' },
  { size: 40, scale: 3, filename: 'Icon-40@3x.png' },
  { size: 60, scale: 2, filename: 'Icon-60@2x.png' },
  { size: 60, scale: 3, filename: 'Icon-60@3x.png' },
  { size: 76, scale: 1, filename: 'Icon-76.png' },
  { size: 76, scale: 2, filename: 'Icon-76@2x.png' },
  { size: 83.5, scale: 2, filename: 'Icon-83.5@2x.png' },
  { size: 1024, scale: 1, filename: 'Icon-1024.png' },
];

// Splash screen sizes
const SPLASH_SCREENS = [
  { width: 2732, height: 2732, scale: 1, filename: 'splash-2732x2732-2.png' },
  { width: 2732, height: 2732, scale: 2, filename: 'splash-2732x2732-1.png' },
  { width: 2732, height: 2732, scale: 3, filename: 'splash-2732x2732.png' },
];

const OUTPUT_DIR = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
const SPLASH_OUTPUT_DIR = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');

async function generateIcons(sourceImage, includeLegacy = false) {
  const icons = includeLegacy ? [...IOS_ICONS, ...LEGACY_IOS_ICONS] : IOS_ICONS;

  console.log(`Generating iOS icons from: ${sourceImage}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const icon of icons) {
    const actualSize = Math.round(icon.size * icon.scale);
    const outputPath = path.join(OUTPUT_DIR, icon.filename);

    try {
      await sharp(sourceImage)
        .resize(actualSize, actualSize, {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .toFile(outputPath);

      console.log(`  Created: ${icon.filename} (${actualSize}x${actualSize})`);
    } catch (error) {
      console.error(`  Error creating ${icon.filename}:`, error.message);
    }
  }

  // Generate Contents.json for the icon set
  const contentsJson = {
    images: icons.map(icon => ({
      filename: icon.filename,
      idiom: 'universal',
      platform: 'ios',
      size: `${icon.size}x${icon.size}`,
    })),
    info: {
      author: 'xcode',
      version: 1,
    },
  };

  const contentsPath = path.join(OUTPUT_DIR, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2));
  console.log(`  Created: Contents.json`);

  console.log('\nIcon generation complete!');
}

async function generateSplashScreens(sourceImage, backgroundColor = '#2563eb') {
  console.log(`\nGenerating splash screens...`);
  console.log(`Output directory: ${SPLASH_OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!fs.existsSync(SPLASH_OUTPUT_DIR)) {
    fs.mkdirSync(SPLASH_OUTPUT_DIR, { recursive: true });
  }

  for (const splash of SPLASH_SCREENS) {
    const outputPath = path.join(SPLASH_OUTPUT_DIR, splash.filename);

    try {
      // Get source image metadata
      const metadata = await sharp(sourceImage).metadata();
      const logoSize = Math.min(splash.width, splash.height) * 0.3; // Logo takes 30% of smallest dimension

      // Create background with logo centered
      const logo = await sharp(sourceImage)
        .resize(Math.round(logoSize), Math.round(logoSize), {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

      await sharp({
        create: {
          width: splash.width,
          height: splash.height,
          channels: 4,
          background: backgroundColor,
        },
      })
        .composite([
          {
            input: logo,
            gravity: 'center',
          },
        ])
        .png()
        .toFile(outputPath);

      console.log(`  Created: ${splash.filename} (${splash.width}x${splash.height})`);
    } catch (error) {
      console.error(`  Error creating ${splash.filename}:`, error.message);
    }
  }

  console.log('\nSplash screen generation complete!');
}

// Main execution
async function main() {
  const sourceImage = process.argv[2] || path.join(__dirname, '../public/icons/icon-1024x1024.png');

  // Check if source image exists
  if (!fs.existsSync(sourceImage)) {
    console.error(`Error: Source image not found: ${sourceImage}`);
    console.log('\nUsage: node scripts/generate-ios-icons.cjs [source-image]');
    console.log('\nDefault source: public/icons/icon-1024x1024.png');
    process.exit(1);
  }

  // Check if iOS project exists
  if (!fs.existsSync(path.join(__dirname, '../ios'))) {
    console.error('Error: iOS project not found. Run "npx cap add ios" first.');
    process.exit(1);
  }

  const includeLegacy = process.argv.includes('--legacy');

  await generateIcons(sourceImage, includeLegacy);
  await generateSplashScreens(sourceImage);

  console.log('\nAll iOS assets generated successfully!');
  console.log('Run "npx cap sync ios" to update the iOS project.');
}

main().catch(console.error);
