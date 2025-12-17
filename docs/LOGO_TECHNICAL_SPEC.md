# JobSight Logo - Technical Implementation Specification

## Overview

This document provides technical specifications, code snippets, and implementation templates for the JobSight logo deployment.

---

## 1. SVG Extraction & Conversion

### Step 1.1: Extract SVG from PNG Source

**Source File:** `jobsight-logo.png` (provided by client)

**Option A: Use Online Converter**
1. Go to: https://www.pngtosvg.com/ or https://convertio.co/png-svg/
2. Upload: `jobsight-logo.png`
3. Convert to SVG
4. Download optimized SVG

**Option B: Use Vector Trace Tool**
1. Open in Adobe Illustrator or Inkscape
2. Import PNG: File → Place → jobsight-logo.png
3. Trace bitmap: Object → Image Trace → Make
4. Expand: Object → Expand
5. Export as SVG: File → Export → SVG
6. Settings:
   - SVG Profile: SVG 1.1
   - Type: Convert to outline
   - Decimal places: 2
   - Minify: Yes

**Option C: Use CLI Tool (Recommended for consistency)**
```bash
# Install potrace (bitmap tracing utility)
npm install -g potrace

# Convert PNG to SVG
potrace jobsight-logo.png -s -o jobsight-logo.svg

# Optimize SVG
npx svgo --multipass jobsight-logo.svg
```

### Step 1.2: SVG Structure Analysis

**Expected SVG Structure:**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
  <!-- Hard hat shape (orange) -->
  <path
    d="M100,80 C120,80 140,90 150,105 L150,130 C150,145 125,160 100,160 C75,160 50,145 50,130 L50,105 C60,90 80,80 100,80 Z"
    fill="#F97316"
  />

  <!-- Hard hat brim (darker orange) -->
  <ellipse cx="100" cy="130" rx="50" ry="8" fill="#EA580C" />

  <!-- Hard hat highlight (light orange) -->
  <path
    d="M90,95 C95,92 105,92 110,95 L110,100 C110,102 105,105 100,105 C95,105 90,102 90,100 Z"
    fill="#FB923C"
    opacity="0.6"
  />

  <!-- Gear icon background -->
  <circle cx="100" cy="120" r="20" fill="#FFFFFF" opacity="0.3" />

  <!-- Gear teeth (simplified) -->
  <path
    d="M100,100 L102,108 L110,110 L102,112 L100,120 L98,112 L90,110 L98,108 Z"
    fill="#FFFFFF"
  />

  <!-- JobSight text -->
  <g id="text-logo">
    <!-- "Job" in orange -->
    <text x="100" y="180" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#F97316" text-anchor="middle">
      Job
    </text>

    <!-- "Sight" in dark gray -->
    <text x="100" y="210" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#374151" text-anchor="middle">
      Sight
    </text>
  </g>
</svg>
```

**Note:** The actual SVG will have more detailed paths based on the provided logo image.

### Step 1.3: Create Dark Mode Variant

Create `jobsight-logo-dark.svg` by modifying colors:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
  <!-- Hard hat shape (white) -->
  <path d="..." fill="#FFFFFF" />

  <!-- Hard hat brim (light gray) -->
  <ellipse cx="100" cy="130" rx="50" ry="8" fill="#F3F4F6" />

  <!-- Gear icon background -->
  <circle cx="100" cy="120" r="20" fill="#1F2937" opacity="0.5" />

  <!-- Gear teeth -->
  <path d="..." fill="#1F2937" />

  <!-- JobSight text -->
  <g id="text-logo">
    <!-- "Job" in orange (keeps brand color) -->
    <text x="100" y="180" fill="#F97316">Job</text>

    <!-- "Sight" in white -->
    <text x="100" y="210" fill="#FFFFFF">Sight</text>
  </g>
</svg>
```

### Step 1.4: Create Icon-Only Variant

Create `jobsight-icon.svg` (no text, just hard hat + gear):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Orange background square -->
  <rect width="512" height="512" fill="#F97316" />

  <!-- Hard hat (scaled and centered) -->
  <path
    d="M256,180 C..."
    fill="#FFFFFF"
    transform="translate(156, 100) scale(2.5)"
  />

  <!-- Gear icon -->
  <path
    d="M..."
    fill="#FFFFFF"
    opacity="0.9"
    transform="translate(156, 100) scale(2.5)"
  />
</svg>
```

---

## 2. Logo Component Code

### Step 2.1: Read Current Logo Component

**File:** `src/components/brand/Logo.tsx`

```typescript
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'default' | 'light' | 'dark' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

export function Logo({ variant = 'default', size = 'md', className }: LogoProps) {
  // TODO: Replace SVG paths with actual logo
  return (
    <svg
      viewBox="0 0 200 240"
      className={cn(sizeClasses[size], 'w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {variant === 'icon' ? (
        // Icon only (no text)
        <g>
          {/* PASTE ICON SVG PATHS HERE */}
        </g>
      ) : variant === 'light' ? (
        // Light variant (for dark backgrounds)
        <g>
          {/* PASTE DARK MODE SVG PATHS HERE */}
        </g>
      ) : (
        // Default/Dark variant (for light backgrounds)
        <g>
          {/* PASTE DEFAULT SVG PATHS HERE */}
        </g>
      )}
    </svg>
  );
}
```

### Step 2.2: Updated Logo Component Template

**Complete implementation with all variants:**

```typescript
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'default' | 'light' | 'dark' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6',    // 24px
  md: 'h-8',    // 32px
  lg: 'h-12',   // 48px
  xl: 'h-16',   // 64px
};

/**
 * JobSight Logo Component
 *
 * @param variant - Logo variant (default, light, dark, icon)
 * @param size - Logo size (sm, md, lg, xl)
 * @param className - Additional CSS classes
 */
export function Logo({ variant = 'default', size = 'md', className }: LogoProps) {
  const viewBox = variant === 'icon' ? '0 0 512 512' : '0 0 200 240';

  return (
    <svg
      viewBox={viewBox}
      className={cn(sizeClasses[size], 'w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="JobSight"
      role="img"
    >
      <title>JobSight</title>
      {renderLogoContent(variant)}
    </svg>
  );
}

function renderLogoContent(variant: 'default' | 'light' | 'dark' | 'icon') {
  if (variant === 'icon') {
    return (
      <g>
        {/* Orange background */}
        <rect width="512" height="512" fill="#F97316" />

        {/* Hard hat icon (white) */}
        <path
          d="[EXTRACTED_HARD_HAT_PATH]"
          fill="#FFFFFF"
        />

        {/* Gear icon (white) */}
        <path
          d="[EXTRACTED_GEAR_PATH]"
          fill="#FFFFFF"
          opacity="0.9"
        />
      </g>
    );
  }

  if (variant === 'light') {
    return (
      <g>
        {/* Hard hat (white) */}
        <path
          d="[EXTRACTED_HARD_HAT_PATH]"
          fill="#FFFFFF"
        />

        {/* Hard hat brim (light gray) */}
        <ellipse
          cx="100"
          cy="130"
          rx="50"
          ry="8"
          fill="#F3F4F6"
        />

        {/* Gear icon */}
        <path
          d="[EXTRACTED_GEAR_PATH]"
          fill="#1F2937"
        />

        {/* "Job" text (orange) */}
        <text
          x="100"
          y="180"
          fontFamily="Arial, sans-serif"
          fontSize="24"
          fontWeight="bold"
          fill="#F97316"
          textAnchor="middle"
        >
          Job
        </text>

        {/* "Sight" text (white) */}
        <text
          x="100"
          y="210"
          fontFamily="Arial, sans-serif"
          fontSize="24"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          Sight
        </text>
      </g>
    );
  }

  // Default and dark variants
  return (
    <g>
      {/* Hard hat (orange) */}
      <path
        d="[EXTRACTED_HARD_HAT_PATH]"
        fill="#F97316"
      />

      {/* Hard hat brim (dark orange) */}
      <ellipse
        cx="100"
        cy="130"
        rx="50"
        ry="8"
        fill="#EA580C"
      />

      {/* Hard hat highlight (light orange) */}
      <path
        d="[EXTRACTED_HIGHLIGHT_PATH]"
        fill="#FB923C"
        opacity="0.6"
      />

      {/* Gear icon background */}
      <circle
        cx="100"
        cy="120"
        r="20"
        fill="#FFFFFF"
        opacity="0.3"
      />

      {/* Gear teeth */}
      <path
        d="[EXTRACTED_GEAR_PATH]"
        fill="#FFFFFF"
      />

      {/* "Job" text (orange) */}
      <text
        x="100"
        y="180"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="#F97316"
        textAnchor="middle"
      >
        Job
      </text>

      {/* "Sight" text (dark gray) */}
      <text
        x="100"
        y="210"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="#374151"
        textAnchor="middle"
      >
        Sight
      </text>
    </g>
  );
}

/**
 * Logo Icon Only (Hard Hat + Gear)
 */
export function LogoIcon({ className }: { className?: string }) {
  return <Logo variant="icon" size="md" className={className} />;
}

/**
 * Logo Icon for Dark Backgrounds
 */
export function LogoIconLight({ className }: { className?: string }) {
  return <Logo variant="light" size="sm" className={className} />;
}

/**
 * Sidebar Logo with Tagline
 */
export function SidebarLogo() {
  return (
    <div className="flex items-center space-x-3 px-4 py-5">
      <Logo variant="light" size="lg" />
      <div className="text-white">
        <p className="text-xs text-gray-400">Field Management</p>
      </div>
    </div>
  );
}

/**
 * Auth Page Logo (Login, Register)
 */
export function AuthLogo() {
  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <Logo variant="default" size="xl" />
      </div>
    </div>
  );
}

/**
 * Compact Logo for Navigation
 */
export function CompactLogo({ className }: { className?: string }) {
  return <Logo variant="default" size="sm" className={className} />;
}
```

---

## 3. Email Template Code

### Step 3.1: Update Base Email Template

**File:** `src/lib/email/templates/base-template.ts`

**Current Code:**
```typescript
export function createEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <!-- Header -->
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🏗️ JobSight</h1>
      </div>

      <!-- Content -->
      <div style="padding: 20px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
        <p>© 2025 JobSight. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}
```

**Updated Code:**
```typescript
export function createEmailTemplate(content: string): string {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://app.jobsight.com';
  const logoUrl = `${appUrl}/jobsight-logo.svg`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
      <!-- Header with Logo -->
      <div style="background-color: #F97316; padding: 24px; text-align: center;">
        <img
          src="${logoUrl}"
          alt="JobSight - Construction Field Management"
          style="height: 48px; width: auto; display: inline-block; vertical-align: middle;"
        />
      </div>

      <!-- Content -->
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 32px; border-radius: 8px; margin-top: 20px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="max-width: 600px; margin: 20px auto; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0 0 8px 0;">
          <strong style="color: #F97316;">JobSight</strong> - Construction Field Management
        </p>
        <p style="margin: 0;">
          © 2025 JobSight. All rights reserved.
        </p>
        <p style="margin: 8px 0 0 0;">
          <a href="${appUrl}" style="color: #F97316; text-decoration: none;">Visit Dashboard</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
```

### Step 3.2: Email Template with Inline Logo (Fallback)

For email clients that block external images, provide inline Base64 logo:

```typescript
export function createEmailTemplateWithInlineLogo(content: string): string {
  // Read logo SVG and convert to Base64
  const logoBase64 = 'data:image/svg+xml;base64,[BASE64_ENCODED_SVG]';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <!-- Header with Inline Logo -->
      <div style="background-color: #F97316; padding: 24px; text-align: center;">
        <img
          src="${logoBase64}"
          alt="JobSight"
          style="height: 48px; width: auto;"
        />
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        ${content}
      </div>
    </body>
    </html>
  `;
}
```

**Generate Base64 Logo:**
```typescript
// Utility function to generate Base64 logo
export async function getLogoBase64(): Promise<string> {
  const response = await fetch('/jobsight-logo.svg');
  const svgText = await response.text();
  const base64 = btoa(unescape(encodeURIComponent(svgText)));
  return `data:image/svg+xml;base64,${base64}`;
}
```

---

## 4. PDF Branding Code

### Step 4.1: Update PDF Branding Utility

**File:** `src/lib/utils/pdfBranding.ts`

**Add JobSight Logo Loader:**

```typescript
import { supabase } from '@/lib/supabase';

export interface CompanyInfo {
  name: string;
  logoBase64?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  projectName: string;
}

/**
 * Load JobSight logo as Base64 for PDF embedding
 * Used as fallback when company logo is not uploaded
 */
export async function loadJobSightLogo(): Promise<string> {
  try {
    // Option 1: Fetch from public directory
    const response = await fetch('/jobsight-logo.svg');
    if (!response.ok) {
      throw new Error('Failed to fetch JobSight logo');
    }

    const svgText = await response.text();

    // Convert SVG to Base64
    const base64 = btoa(unescape(encodeURIComponent(svgText)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('Error loading JobSight logo:', error);

    // Option 2: Fallback to inline SVG (if fetch fails)
    return getInlineJobSightLogo();
  }
}

/**
 * Get inline JobSight logo as Base64 (fallback)
 */
function getInlineJobSightLogo(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
      <!-- Hard hat (orange) -->
      <path d="[EXTRACTED_PATH]" fill="#F97316" />

      <!-- Gear icon -->
      <path d="[EXTRACTED_PATH]" fill="#FFFFFF" />

      <!-- JobSight text -->
      <text x="100" y="180" fill="#F97316">Job</text>
      <text x="100" y="210" fill="#374151">Sight</text>
    </svg>
  `;

  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Load company logo from URL
 */
export async function loadCompanyLogo(logoUrl: string): Promise<string> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error('Failed to load company logo');
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading company logo:', error);
    throw error;
  }
}

/**
 * Get company info with logo for PDF generation
 * Falls back to JobSight logo if company logo not available
 */
export async function getCompanyInfo(projectId: string): Promise<CompanyInfo> {
  try {
    // 1. Get project → company_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('company_id, name')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // 2. Get company data including logo
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url, address, city, state, zip_code, phone, email')
      .eq('id', project.company_id)
      .single();

    if (companyError) throw companyError;

    // 3. Load logo (company logo or JobSight logo)
    let logoBase64: string | undefined;

    if (company.logo_url) {
      try {
        logoBase64 = await loadCompanyLogo(company.logo_url);
      } catch (error) {
        console.warn('Failed to load company logo, using JobSight logo:', error);
        logoBase64 = await loadJobSightLogo();
      }
    } else {
      // No company logo uploaded, use JobSight logo
      logoBase64 = await loadJobSightLogo();
    }

    return {
      name: company.name || 'Unknown Company',
      logoBase64,
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zipCode: company.zip_code || '',
      phone: company.phone || '',
      email: company.email || '',
      projectName: project.name,
    };
  } catch (error) {
    console.error('Error getting company info:', error);

    // Return minimal info with JobSight logo as ultimate fallback
    return {
      name: 'JobSight',
      logoBase64: await loadJobSightLogo(),
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      projectName: 'Unknown Project',
    };
  }
}

/**
 * Add logo to PDF header
 */
export function addPDFHeader(
  doc: jsPDF,
  companyInfo: CompanyInfo,
  title: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add logo (top-left, 40mm x 15mm)
  if (companyInfo.logoBase64) {
    try {
      doc.addImage(companyInfo.logoBase64, 'SVG', 10, 10, 40, 15);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      // Continue without logo
    }
  }

  // Add company name (top-center)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth / 2, 15, { align: 'center' });

  // Add title (top-center, below company name)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageWidth / 2, 22, { align: 'center' });

  // Add horizontal line
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 28, pageWidth - 10, 28);
}
```

---

## 5. Icon Generation Scripts

### Step 5.1: Automated Icon Generation Script

**File:** `scripts/generate-icons.js`

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = 'public/jobsight-icon.svg';
const outputDir = 'public/icons';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PNG icons from SVG...\n');

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);

    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 249, g: 115, b: 22, alpha: 1 }, // #F97316
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputFile);

      console.log(`✓ Generated: ${outputFile}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  // Generate Apple touch icon (180x180)
  const appleTouchIcon = path.join(outputDir, 'apple-touch-icon.png');
  try {
    await sharp(inputFile)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 249, g: 115, b: 22, alpha: 1 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(appleTouchIcon);

    console.log(`✓ Generated: ${appleTouchIcon}`);
  } catch (error) {
    console.error('✗ Failed to generate Apple touch icon:', error.message);
  }

  // Generate PWA maskable icon (512x512 with padding)
  const maskableIcon = path.join(outputDir, 'maskable-icon-512x512.png');
  try {
    // Create 410x410 icon with 51px padding on all sides (20% safe zone)
    await sharp(inputFile)
      .resize(410, 410, { fit: 'contain' })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 249, g: 115, b: 22, alpha: 1 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(maskableIcon);

    console.log(`✓ Generated: ${maskableIcon}`);
  } catch (error) {
    console.error('✗ Failed to generate maskable icon:', error.message);
  }

  console.log('\n✓ Icon generation complete!');
}

generateIcons().catch(console.error);
```

**Usage:**
```bash
npm install sharp
node scripts/generate-icons.js
```

### Step 5.2: iOS Icon Generation Script

**File:** `scripts/generate-ios-icons.js`

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iosSizes = [
  { name: 'AppIcon-20x20@1x.png', size: 20 },
  { name: 'AppIcon-20x20@2x.png', size: 40 },
  { name: 'AppIcon-20x20@3x.png', size: 60 },
  { name: 'AppIcon-29x29@1x.png', size: 29 },
  { name: 'AppIcon-29x29@2x.png', size: 58 },
  { name: 'AppIcon-29x29@3x.png', size: 87 },
  { name: 'AppIcon-40x40@1x.png', size: 40 },
  { name: 'AppIcon-40x40@2x.png', size: 80 },
  { name: 'AppIcon-40x40@3x.png', size: 120 },
  { name: 'AppIcon-60x60@2x.png', size: 120 },
  { name: 'AppIcon-60x60@3x.png', size: 180 },
  { name: 'AppIcon-76x76@1x.png', size: 76 },
  { name: 'AppIcon-76x76@2x.png', size: 152 },
  { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
  { name: 'AppIcon-512@2x.png', size: 1024 },
  { name: 'AppIcon-1024x1024@1x.png', size: 1024 },
];

const inputFile = 'public/jobsight-icon.svg';
const outputDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIOSIcons() {
  console.log('Generating iOS app icons...\n');

  for (const { name, size } of iosSizes) {
    const outputFile = path.join(outputDir, name);

    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 249, g: 115, b: 22, alpha: 1 },
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputFile);

      console.log(`✓ Generated: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate Contents.json
  const contents = {
    images: iosSizes.map(({ name, size }) => ({
      filename: name,
      idiom: getIdiom(size),
      scale: getScale(name),
      size: getSize(size),
    })),
    info: {
      author: 'xcode',
      version: 1,
    },
  };

  const contentsFile = path.join(outputDir, 'Contents.json');
  fs.writeFileSync(contentsFile, JSON.stringify(contents, null, 2));
  console.log(`\n✓ Generated: Contents.json`);

  console.log('\n✓ iOS icon generation complete!');
}

function getIdiom(size) {
  if (size >= 1024) return 'ios-marketing';
  if (size >= 167) return 'ipad';
  return 'iphone';
}

function getScale(name) {
  if (name.includes('@3x')) return '3x';
  if (name.includes('@2x')) return '2x';
  return '1x';
}

function getSize(size) {
  const baseSize = size <= 60 ? size : size / 2;
  return `${baseSize}x${baseSize}`;
}

generateIOSIcons().catch(console.error);
```

---

## 6. Testing Code

### Step 6.1: Logo Component Tests

**File:** `src/components/brand/Logo.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Logo,
  LogoIcon,
  LogoIconLight,
  SidebarLogo,
  AuthLogo,
  CompactLogo,
} from './Logo';

describe('Logo Component', () => {
  describe('Logo Variants', () => {
    it('renders default variant', () => {
      const { container } = render(<Logo variant="default" />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 200 240');
    });

    it('renders light variant', () => {
      const { container } = render(<Logo variant="light" />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      // Check for light variant specific elements
      expect(container.querySelector('[fill="#FFFFFF"]')).toBeInTheDocument();
    });

    it('renders dark variant', () => {
      const { container } = render(<Logo variant="dark" />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      // Check for orange primary color
      expect(container.querySelector('[fill="#F97316"]')).toBeInTheDocument();
    });

    it('renders icon-only variant', () => {
      const { container } = render(<Logo variant="icon" />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 512 512');
      // Icon variant should not have text
      expect(container.querySelector('text')).not.toBeInTheDocument();
    });
  });

  describe('Logo Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Logo size="sm" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('h-6');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<Logo size="md" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('h-8');
    });

    it('renders large size', () => {
      const { container } = render(<Logo size="lg" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('h-12');
    });

    it('renders extra large size', () => {
      const { container } = render(<Logo size="xl" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('h-16');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('aria-label', 'JobSight');
    });

    it('has role="img"', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('role', 'img');
    });

    it('has title element', () => {
      const { container } = render(<Logo />);
      const title = container.querySelector('title');

      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('JobSight');
    });
  });

  describe('Helper Components', () => {
    it('renders LogoIcon', () => {
      const { container } = render(<LogoIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
    });

    it('renders LogoIconLight', () => {
      const { container } = render(<LogoIconLight />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('h-6'); // Small size
    });

    it('renders SidebarLogo with tagline', () => {
      render(<SidebarLogo />);

      expect(screen.getByText('Field Management')).toBeInTheDocument();
    });

    it('renders AuthLogo', () => {
      const { container } = render(<AuthLogo />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('h-16'); // XL size
    });

    it('renders CompactLogo', () => {
      const { container } = render(<CompactLogo />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('h-6'); // SM size
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<Logo className="custom-class" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('custom-class');
    });

    it('maintains default classes with custom className', () => {
      const { container } = render(<Logo size="lg" className="custom-class" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('h-12'); // Size class
      expect(svg).toHaveClass('w-auto'); // Width class
      expect(svg).toHaveClass('custom-class'); // Custom class
    });
  });
});
```

### Step 6.2: Email Template Test

**File:** `scripts/test-email-template.ts`

```typescript
import { createEmailTemplate } from '@/lib/email/templates/base-template';
import { sendEmail } from '@/lib/email/emailService';

async function testEmailTemplate() {
  console.log('Testing email template with JobSight logo...\n');

  const testContent = `
    <h2 style="color: #111827; margin-bottom: 16px;">Test Email</h2>
    <p style="color: #374151; line-height: 1.6;">
      This is a test email to verify the JobSight logo displays correctly in email clients.
    </p>
    <p style="color: #374151; line-height: 1.6;">
      The logo should appear in the orange header above.
    </p>
  `;

  const html = createEmailTemplate(testContent);

  try {
    await sendEmail({
      to: 'test@example.com',
      subject: 'JobSight Logo Test - Email Template',
      html,
    });

    console.log('✓ Test email sent successfully');
    console.log('\nPlease check the following email clients:');
    console.log('  - Gmail (web & mobile)');
    console.log('  - Outlook (web & desktop)');
    console.log('  - Apple Mail (macOS & iOS)');
    console.log('\nVerify that:');
    console.log('  1. Logo displays in header');
    console.log('  2. Logo is properly sized (48px height)');
    console.log('  3. Orange background (#F97316) displays correctly');
    console.log('  4. Footer shows JobSight branding');
  } catch (error) {
    console.error('✗ Failed to send test email:', error);
  }
}

testEmailTemplate();
```

---

## 7. Deployment Checklist

### Pre-Deployment Verification

```bash
#!/bin/bash

echo "JobSight Logo Deployment - Pre-flight Checklist"
echo "================================================"
echo ""

# Check SVG files exist
echo "Checking logo files..."
if [ -f "public/jobsight-logo.svg" ]; then
  echo "✓ jobsight-logo.svg exists"
else
  echo "✗ jobsight-logo.svg MISSING"
  exit 1
fi

if [ -f "public/jobsight-logo-dark.svg" ]; then
  echo "✓ jobsight-logo-dark.svg exists"
else
  echo "✗ jobsight-logo-dark.svg MISSING"
  exit 1
fi

if [ -f "public/jobsight-icon.svg" ]; then
  echo "✓ jobsight-icon.svg exists"
else
  echo "✗ jobsight-icon.svg MISSING"
  exit 1
fi

# Check PNG icons
echo ""
echo "Checking PNG icons..."
ICON_SIZES=(16 32 72 96 128 144 152 192 384 512)
MISSING_ICONS=0

for size in "${ICON_SIZES[@]}"; do
  if [ -f "public/icons/icon-${size}x${size}.png" ]; then
    echo "✓ icon-${size}x${size}.png exists"
  else
    echo "✗ icon-${size}x${size}.png MISSING"
    MISSING_ICONS=$((MISSING_ICONS+1))
  fi
done

if [ $MISSING_ICONS -gt 0 ]; then
  echo ""
  echo "✗ $MISSING_ICONS icon(s) missing. Run: node scripts/generate-icons.js"
  exit 1
fi

# Run TypeScript type check
echo ""
echo "Running type check..."
npm run typecheck
if [ $? -eq 0 ]; then
  echo "✓ TypeScript type check passed"
else
  echo "✗ TypeScript type check failed"
  exit 1
fi

# Run tests
echo ""
echo "Running tests..."
npm test -- --run
if [ $? -eq 0 ]; then
  echo "✓ All tests passed"
else
  echo "✗ Tests failed"
  exit 1
fi

# Build production
echo ""
echo "Building production bundle..."
npm run build
if [ $? -eq 0 ]; then
  echo "✓ Production build successful"
else
  echo "✗ Production build failed"
  exit 1
fi

echo ""
echo "================================================"
echo "✓ Pre-deployment checks complete!"
echo "Ready to deploy."
```

---

## 8. Rollback Procedure

### Emergency Rollback Script

```bash
#!/bin/bash

echo "JobSight Logo Rollback Procedure"
echo "================================="
echo ""
echo "WARNING: This will revert all logo changes."
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled."
  exit 1
fi

# Get previous commit hash
PREVIOUS_COMMIT=$(git log --oneline | grep -i "before logo update" | head -1 | awk '{print $1}')

if [ -z "$PREVIOUS_COMMIT" ]; then
  echo "✗ Could not find previous commit. Please specify manually."
  read -p "Enter commit hash to rollback to: " PREVIOUS_COMMIT
fi

echo "Rolling back to commit: $PREVIOUS_COMMIT"

# Revert logo files
git checkout $PREVIOUS_COMMIT -- public/jobsight-logo.svg
git checkout $PREVIOUS_COMMIT -- public/jobsight-logo-dark.svg
git checkout $PREVIOUS_COMMIT -- public/jobsight-icon.svg
git checkout $PREVIOUS_COMMIT -- public/icons/
git checkout $PREVIOUS_COMMIT -- src/components/brand/Logo.tsx
git checkout $PREVIOUS_COMMIT -- src/lib/email/templates/base-template.ts

echo "✓ Files reverted to previous version"

# Rebuild
echo "Rebuilding..."
npm run build

echo ""
echo "✓ Rollback complete"
echo "Next steps:"
echo "  1. Test the application"
echo "  2. Commit rollback: git commit -m \"Rollback logo changes\""
echo "  3. Deploy: npm run deploy"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Development Team
