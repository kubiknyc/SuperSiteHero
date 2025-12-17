# JobSight Logo Implementation Plan

## Overview

This document provides a step-by-step implementation plan for deploying the new JobSight logo throughout the application.

**Goal:** Replace all existing logos and ensure consistent branding across web app, iOS app, PWA, emails, and PDF exports.

---

## Phase 1: Asset Preparation & Generation

### Step 1.1: Extract Logo from Source File

**Source File:** `jobsight-logo.png` (provided by client)

**Required Exports:**

1. **Full Logo SVG (with text)**
   ```
   Filename: jobsight-logo.svg
   Size: 200x240px viewBox (or proportional)
   Elements: Hard hat + gear + "JobSight" text
   Background: Transparent
   Format: Optimized SVG
   ```

2. **Full Logo SVG (dark mode)**
   ```
   Filename: jobsight-logo-dark.svg
   Size: 200x240px viewBox
   Elements: Same as above
   Colors: White hard hat, orange "Job" text, white "Sight" text
   Background: Transparent
   Format: Optimized SVG
   ```

3. **Icon-only SVG (no text)**
   ```
   Filename: jobsight-icon.svg
   Size: 512x512px viewBox
   Elements: Hard hat + gear only
   Background: Orange (#F97316) square
   Format: Optimized SVG
   ```

4. **Icon-only SVG (transparent)**
   ```
   Filename: jobsight-icon-transparent.svg
   Size: 512x512px viewBox
   Elements: Hard hat + gear only
   Background: Transparent
   Format: Optimized SVG
   ```

5. **Favicon SVG**
   ```
   Filename: favicon.svg
   Size: 32x32px viewBox
   Elements: Simplified hard hat icon
   Background: Transparent
   Format: Optimized SVG
   ```

### Step 1.2: Generate PNG Icons

**Tool:** Use online converter or CLI tool

**Option A: Online Tool**
- Use: https://cloudconvert.com/svg-to-png
- Upload: `jobsight-icon.svg`
- Generate sizes: 16, 32, 72, 96, 128, 144, 152, 192, 384, 512

**Option B: CLI Tool (Recommended)**
```bash
# Install ImageMagick
npm install -g sharp-cli

# Generate all sizes
sharp -i jobsight-icon.svg -o icon-16x16.png resize 16 16
sharp -i jobsight-icon.svg -o icon-32x32.png resize 32 32
sharp -i jobsight-icon.svg -o icon-72x72.png resize 72 72
sharp -i jobsight-icon.svg -o icon-96x96.png resize 96 96
sharp -i jobsight-icon.svg -o icon-128x128.png resize 128 128
sharp -i jobsight-icon.svg -o icon-144x144.png resize 144 144
sharp -i jobsight-icon.svg -o icon-152x152.png resize 152 152
sharp -i jobsight-icon.svg -o icon-192x192.png resize 192 192
sharp -i jobsight-icon.svg -o icon-384x384.png resize 384 384
sharp -i jobsight-icon.svg -o icon-512x512.png resize 512 512
```

**Option C: Automated Script**
```bash
# Create script: scripts/generate-icons.js
node scripts/generate-icons.js
```

### Step 1.3: Generate Apple-Specific Icons

**Apple Touch Icon (180x180)**
```bash
sharp -i jobsight-icon.svg -o apple-touch-icon.png resize 180 180
```

**PWA Maskable Icon (512x512 with safe zone)**
```bash
# Icon should have 20% padding on all sides
# Safe zone: 410x410 centered in 512x512 canvas
sharp -i jobsight-icon.svg -o maskable-icon-512x512.png resize 410 410 --extend 51
```

### Step 1.4: Generate iOS App Icons

**Required Sizes:**
```
20x20 @1x, @2x, @3x
29x29 @1x, @2x, @3x
40x40 @1x, @2x, @3x
60x60 @2x, @3x
76x76 @1x, @2x
83.5x83.5 @2x
512x512 @2x
1024x1024 @1x
```

**Automated Generation:**
```bash
# Option 1: Use app-icon CLI
npx app-icon generate -i jobsight-icon.svg

# Option 2: Use iOS Icon Generator
# https://appicon.co/
# Upload: jobsight-icon.svg
# Platform: iOS
# Download: AppIcon.appiconset.zip
# Extract to: ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

### Step 1.5: Generate iOS Splash Screens

**Required Sizes (16 variants):**
```
640x1136    (iPhone 5/SE)
750x1334    (iPhone 6/7/8)
828x1792    (iPhone XR)
1125x2436   (iPhone X/XS)
1242x2208   (iPhone 6+/7+/8+)
1242x2688   (iPhone XS Max)
1536x2048   (iPad Pro 9.7")
1668x2224   (iPad Pro 10.5")
1668x2388   (iPad Pro 11")
2048x2732   (iPad Pro 12.9")
```

**Automated Generation:**
```bash
# Use PWA Asset Generator
npx pwa-asset-generator jobsight-icon.svg public/splash \
  --splash-only \
  --portrait-only \
  --background "#F97316" \
  --type png
```

### Step 1.6: Optimize All Assets

**SVG Optimization:**
```bash
# Install SVGO
npm install -g svgo

# Optimize all SVG files
svgo --multipass public/jobsight-logo.svg
svgo --multipass public/jobsight-logo-dark.svg
svgo --multipass public/jobsight-icon.svg
svgo --multipass public/favicon.svg
```

**PNG Optimization:**
```bash
# Option 1: Use TinyPNG (web interface)
# https://tinypng.com/

# Option 2: Use ImageOptim (Mac only)
# Drag & drop all PNG files

# Option 3: Use pngquant CLI
npm install -g pngquant-bin
find public/icons -name "*.png" -exec pngquant --force --ext .png {} \;
```

---

## Phase 2: File Deployment

### Step 2.1: Deploy to Public Directory

```bash
# Create icons directory if not exists
mkdir -p public/icons
mkdir -p public/splash

# Copy SVG files
cp jobsight-logo.svg public/
cp jobsight-logo-dark.svg public/
cp jobsight-icon.svg public/
cp jobsight-icon-transparent.svg public/
cp favicon.svg public/

# Copy PNG icons
cp icon-*.png public/icons/
cp apple-touch-icon.png public/icons/
cp maskable-icon-512x512.png public/icons/
```

### Step 2.2: Deploy to iOS Native App

```bash
# iOS App Icons
cp -r AppIcon.appiconset/* ios/App/App/Assets.xcassets/AppIcon.appiconset/

# iOS Splash Screens
cp -r Splash.imageset/* ios/App/App/Assets.xcassets/Splash.imageset/

# Mirror public directory
cp -r public/* ios/App/App/public/
```

### Step 2.3: Update index.html References

**File:** `index.html`

**Update favicon:**
```html
<!-- Before -->
<link rel="icon" type="image/svg+xml" href="/icon.svg" />

<!-- After -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
```

**Update Apple touch icon:**
```html
<!-- Before -->
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

<!-- After (already correct) -->
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
```

**Update theme colors:**
```html
<!-- Verify these are set to JobSight orange -->
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F97316" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#EA580C" />
```

### Step 2.4: Update manifest.json

**File:** `public/manifest.json`

```json
{
  "name": "JobSight",
  "short_name": "JobSight",
  "description": "Construction Field Management",
  "theme_color": "#F97316",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/maskable-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

## Phase 3: Component Code Updates

### Step 3.1: Update Logo Component

**File:** `src/components/brand/Logo.tsx`

**Current Implementation:**
- Component uses inline SVG with hardcoded paths
- 199 lines of SVG code

**Option A: Keep Inline SVG (Recommended)**

Extract the SVG path data from `jobsight-logo.svg` and replace the existing SVG paths in Logo.tsx.

**Steps:**
1. Open `public/jobsight-logo.svg` in text editor
2. Copy all `<path>`, `<circle>`, `<rect>` elements
3. Replace existing SVG elements in Logo.tsx
4. Update viewBox if dimensions changed
5. Test all variants (default, light, dark, icon)

**Option B: Use Image Import**

Replace inline SVG with image imports:

```typescript
import logoLight from '@/assets/jobsight-logo.svg';
import logoDark from '@/assets/jobsight-logo-dark.svg';
import logoIcon from '@/assets/jobsight-icon.svg';

export function Logo({ variant = 'default', size = 'md', className }: LogoProps) {
  const src = variant === 'light' ? logoLight
            : variant === 'dark' ? logoDark
            : variant === 'icon' ? logoIcon
            : logoLight;

  return (
    <img
      src={src}
      alt="JobSight"
      className={cn(sizeClasses[size], className)}
    />
  );
}
```

**Recommendation:** Keep Option A (inline SVG) for better performance and customization.

### Step 3.2: Test Logo Component

```typescript
// Create test file: src/components/brand/Logo.test.tsx

import { render, screen } from '@testing-library/react';
import { Logo, LogoIcon, SidebarLogo, AuthLogo } from './Logo';

describe('Logo Component', () => {
  it('renders default logo variant', () => {
    render(<Logo variant="default" />);
    expect(screen.getByAltText('JobSight')).toBeInTheDocument();
  });

  it('renders light logo variant', () => {
    render(<Logo variant="light" />);
    // Check for light variant classes or SVG attributes
  });

  it('renders dark logo variant', () => {
    render(<Logo variant="dark" />);
  });

  it('renders icon-only variant', () => {
    render(<Logo variant="icon" />);
  });

  it('applies size classes correctly', () => {
    const { container } = render(<Logo size="xl" />);
    expect(container.firstChild).toHaveClass('h-16'); // xl size
  });
});
```

---

## Phase 4: Email Template Updates

### Step 4.1: Update Base Email Template

**File:** `src/lib/email/templates/base-template.ts`

**Current Implementation:**
```typescript
const emailHeader = `
  <div style="background-color: #2563eb; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">🏗️ JobSight</h1>
  </div>
`;
```

**New Implementation:**
```typescript
const emailHeader = `
  <div style="background-color: #F97316; padding: 20px; text-align: center;">
    <img
      src="${import.meta.env.VITE_APP_URL}/jobsight-logo.svg"
      alt="JobSight - Construction Field Management"
      style="height: 48px; width: auto; display: inline-block;"
    />
  </div>
`;
```

### Step 4.2: Update All Email Templates

**Files to Update:**
- `src/lib/email/templates/daily-report-template.ts`
- `src/lib/email/templates/submittal-notification-template.ts`
- `src/lib/email/templates/meeting-minutes-template.ts`
- `src/lib/email/templates/rfi-notification-template.ts`
- Any other templates in `src/lib/email/templates/`

**Search & Replace:**
```bash
# Find all email templates using emoji
grep -r "🏗️" src/lib/email/templates/

# Replace with logo reference
# Manually update each file or use sed:
sed -i 's/🏗️ JobSight/<img src="${import.meta.env.VITE_APP_URL}\/jobsight-logo.svg" alt="JobSight" style="height: 48px;">/g' src/lib/email/templates/*.ts
```

### Step 4.3: Test Email Rendering

**Create Test Script:** `scripts/test-email-template.ts`

```typescript
import { sendTestEmail } from '@/lib/email/emailService';
import { dailyReportTemplate } from '@/lib/email/templates/daily-report-template';

async function testEmailTemplate() {
  const html = dailyReportTemplate({
    projectName: 'Test Project',
    reportDate: new Date().toISOString(),
    weatherConditions: 'Sunny, 75°F',
    workPerformed: 'Logo branding test',
  });

  await sendTestEmail({
    to: 'test@example.com',
    subject: 'Email Template Test - JobSight Logo',
    html,
  });

  console.log('Test email sent successfully');
}

testEmailTemplate();
```

**Run Test:**
```bash
npx tsx scripts/test-email-template.ts
```

**Verify in Email Clients:**
- Gmail (web & mobile)
- Outlook (web & desktop)
- Apple Mail (macOS & iOS)
- Yahoo Mail
- ProtonMail

---

## Phase 5: PDF Export Enhancements

### Step 5.1: Add JobSight Logo Fallback

**File:** `src/lib/utils/pdfBranding.ts`

**Add Function:**
```typescript
/**
 * Load JobSight logo as Base64 for PDF embedding
 * Used as fallback when company logo is not uploaded
 */
export async function loadJobSightLogo(): Promise<string> {
  try {
    const response = await fetch('/jobsight-logo.svg');
    if (!response.ok) {
      throw new Error('Failed to load JobSight logo');
    }

    const svgText = await response.text();

    // Convert SVG to Base64
    const base64 = btoa(unescape(encodeURIComponent(svgText)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('Error loading JobSight logo:', error);
    throw error;
  }
}
```

**Update getCompanyInfo Function:**
```typescript
export async function getCompanyInfo(projectId: string): Promise<CompanyInfo> {
  try {
    // Get project → company_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('company_id, name')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Get company data including logo
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url, address, city, state, zip_code, phone, email')
      .eq('id', project.company_id)
      .single();

    if (companyError) throw companyError;

    // Load company logo or fallback to JobSight logo
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

    // Return minimal company info with JobSight logo as ultimate fallback
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
```

### Step 5.2: Test PDF Generation

**Test Script:** `scripts/test-pdf-generation.ts`

```typescript
import { generateDailyReportPDF } from '@/features/daily-reports/utils/pdfExport';

async function testPDFGeneration() {
  // Test with company logo
  const pdfWithCompanyLogo = await generateDailyReportPDF({
    projectId: 'test-project-id',
    reportId: 'test-report-id',
  });

  // Test without company logo (should fallback to JobSight logo)
  const pdfWithJobSightLogo = await generateDailyReportPDF({
    projectId: 'test-project-without-logo',
    reportId: 'test-report-id',
  });

  console.log('PDF generation tests completed');
}

testPDFGeneration();
```

---

## Phase 6: Public Facing Pages

### Step 6.1: Update Public Report Viewer

**File:** `src/features/reports/components/PublicReportViewer.tsx`

**Add Header:**
```typescript
import { Logo } from '@/components/brand/Logo';

export function PublicReportViewer({ reportId }: PublicReportViewerProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with branding */}
      <header className="bg-orange-500 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Logo variant="light" size="lg" />
          <div className="text-white">
            <p className="text-sm font-medium">Public Report View</p>
            <p className="text-xs opacity-90">Shared by JobSight</p>
          </div>
        </div>
      </header>

      {/* Report content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ... existing report content ... */}
      </main>

      {/* Footer with branding */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Logo variant="light" size="sm" className="mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Powered by JobSight - Construction Field Management
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### Step 6.2: Create Branded Loading Screen

**File:** `src/components/LoadingScreen.tsx`

```typescript
import { Logo } from '@/components/brand/Logo';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      <Logo
        variant="default"
        size="xl"
        className="animate-pulse mb-4"
      />
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">
        Loading JobSight...
      </p>
    </div>
  );
}
```

**Usage:**
```typescript
// In App.tsx or main router
import { Suspense } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

<Suspense fallback={<LoadingScreen />}>
  {/* App routes */}
</Suspense>
```

### Step 6.3: Update Error Pages

**File:** `src/pages/errors/NotFoundPage.tsx`

```typescript
import { Logo } from '@/components/brand/Logo';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Logo variant="default" size="lg" className="mb-8" />

      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        The page you're looking for doesn't exist in JobSight.
        It may have been moved or deleted.
      </p>

      <Link
        to="/"
        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
```

**File:** `src/pages/errors/ErrorPage.tsx`

```typescript
import { Logo } from '@/components/brand/Logo';
import { Link } from 'react-router-dom';

export function ErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Logo variant="default" size="lg" className="mb-8" />

      <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">Server Error</h2>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Something went wrong on our end. Please try again later.
      </p>

      <Link
        to="/"
        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
```

---

## Phase 7: iOS Native App Integration

### Step 7.1: Update iOS Info.plist

**File:** `ios/App/App/Info.plist`

Verify app name and bundle identifier:

```xml
<key>CFBundleDisplayName</key>
<string>JobSight</string>
<key>CFBundleName</key>
<string>JobSight</string>
<key>CFBundleIdentifier</key>
<string>com.jobsight.app</string>
```

### Step 7.2: Update iOS Capacitor Config

**File:** `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jobsight.app',
  appName: 'JobSight',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F97316', // JobSight orange
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#FFFFFF',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
```

### Step 7.3: Rebuild iOS App

```bash
# Sync web assets to iOS
npm run build
npx cap sync ios

# Open in Xcode
npx cap open ios

# In Xcode:
# 1. Verify AppIcon.appiconset has all images
# 2. Verify Splash.imageset has all images
# 3. Clean build folder (Cmd+Shift+K)
# 4. Build for device (Cmd+B)
# 5. Test on simulator or physical device
```

---

## Phase 8: Quality Assurance

### Step 8.1: Visual Testing Checklist

- [ ] **Web App - Light Mode**
  - [ ] Logo displays correctly on login page
  - [ ] Logo displays correctly in sidebar
  - [ ] Logo displays correctly in navigation header
  - [ ] Logo sizing is consistent across pages
  - [ ] Logo colors match brand guide (#F97316)

- [ ] **Web App - Dark Mode**
  - [ ] Logo switches to light variant
  - [ ] Logo is visible on dark backgrounds
  - [ ] Logo colors are appropriate for dark theme

- [ ] **Mobile Responsive**
  - [ ] Logo displays correctly on iPhone (Safari)
  - [ ] Logo displays correctly on Android (Chrome)
  - [ ] Logo sizing is appropriate for small screens
  - [ ] Logo doesn't overflow or clip

- [ ] **PWA**
  - [ ] App icon displays correctly in PWA install prompt
  - [ ] App icon displays correctly on home screen (iOS/Android)
  - [ ] Splash screen shows logo during app launch
  - [ ] Favicon displays correctly in browser tabs

- [ ] **iOS Native App**
  - [ ] App icon displays correctly on iOS home screen
  - [ ] Splash screen shows logo during launch
  - [ ] App name "JobSight" displays correctly
  - [ ] Logo in-app matches web version

- [ ] **PDF Exports**
  - [ ] Logo displays in PDF header (company logo uploaded)
  - [ ] JobSight logo displays as fallback (no company logo)
  - [ ] Logo sizing is correct (40mm x 15mm)
  - [ ] Logo quality is high resolution

- [ ] **Email Templates**
  - [ ] Logo displays in email header (Gmail)
  - [ ] Logo displays in email header (Outlook)
  - [ ] Logo displays in email header (Apple Mail)
  - [ ] Logo is properly sized (48px height)
  - [ ] Logo loads from correct URL

- [ ] **Public Pages**
  - [ ] Logo displays on public report viewer
  - [ ] Logo displays on 404 error page
  - [ ] Logo displays on 500 error page
  - [ ] Logo displays on loading screen

### Step 8.2: Accessibility Testing Checklist

- [ ] **Alt Text**
  - [ ] All `<img>` tags have descriptive alt text
  - [ ] Alt text reads "JobSight" or "JobSight - Construction Field Management"
  - [ ] SVG components have `<title>` elements

- [ ] **Color Contrast**
  - [ ] Orange (#F97316) on white background: ✅ WCAG AA (4.52:1)
  - [ ] White on orange (#F97316) background: ✅ WCAG AA (4.52:1)
  - [ ] Logo is visible on all background colors used

- [ ] **Screen Reader**
  - [ ] Logo is announced correctly by NVDA (Windows)
  - [ ] Logo is announced correctly by JAWS (Windows)
  - [ ] Logo is announced correctly by VoiceOver (macOS/iOS)
  - [ ] Logo links are keyboard accessible

- [ ] **Keyboard Navigation**
  - [ ] Logo link can be focused with Tab key
  - [ ] Logo link can be activated with Enter/Space
  - [ ] Focus indicator is visible on logo link

### Step 8.3: Performance Testing Checklist

- [ ] **File Sizes**
  - [ ] `jobsight-logo.svg` is under 10KB
  - [ ] All PNG icons are optimized (TinyPNG)
  - [ ] Total icon package is under 500KB

- [ ] **Loading Speed**
  - [ ] Logo loads in under 100ms on 4G connection
  - [ ] Logo loads in under 500ms on 3G connection
  - [ ] Logo is cached correctly (browser + CDN)

- [ ] **Lighthouse Scores**
  - [ ] Performance: 90+ (logo doesn't impact score)
  - [ ] Accessibility: 100 (logo has proper alt text)
  - [ ] Best Practices: 100 (logo follows standards)
  - [ ] SEO: 100 (logo metadata is correct)

### Step 8.4: Cross-Browser Testing Checklist

- [ ] **Desktop Browsers**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)

- [ ] **Mobile Browsers**
  - [ ] Chrome Mobile (Android)
  - [ ] Safari Mobile (iOS)
  - [ ] Firefox Mobile
  - [ ] Samsung Internet

- [ ] **Email Clients**
  - [ ] Gmail (web)
  - [ ] Gmail (mobile app)
  - [ ] Outlook (desktop)
  - [ ] Outlook (web)
  - [ ] Apple Mail (macOS)
  - [ ] Apple Mail (iOS)

---

## Phase 9: Deployment

### Step 9.1: Pre-Deployment Checklist

- [ ] All logo files are optimized
- [ ] All logo files are committed to Git
- [ ] Component code is updated and tested
- [ ] Email templates are updated and tested
- [ ] PDF exports are updated and tested
- [ ] iOS app is rebuilt and tested
- [ ] All QA tests pass
- [ ] No console errors related to logo loading
- [ ] No broken image icons (404 errors)

### Step 9.2: Deployment Steps

```bash
# 1. Commit all changes
git add .
git commit -m "Update JobSight branding with new logo across all platforms"

# 2. Build for production
npm run build

# 3. Test production build locally
npm run preview

# 4. Deploy to staging environment
npm run deploy:staging

# 5. Run smoke tests on staging
npm run test:e2e

# 6. Deploy to production
npm run deploy:production

# 7. Sync iOS app
npx cap sync ios
npx cap open ios
# Build and deploy via Xcode or App Store Connect
```

### Step 9.3: Post-Deployment Verification

- [ ] Visit production URL and verify logo displays
- [ ] Check PWA install prompt shows correct icon
- [ ] Send test email and verify logo displays
- [ ] Generate test PDF and verify logo displays
- [ ] Check public report viewer shows logo
- [ ] Verify error pages show logo
- [ ] Check iOS app store listing shows correct icon
- [ ] Monitor error logs for logo-related issues

---

## Rollback Plan

If issues are discovered after deployment:

### Step 1: Identify Issue
- Check error logs
- Verify which component/feature is broken
- Determine if issue is critical (app unusable) or minor (visual only)

### Step 2: Rollback Code
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <previous-commit-hash>
git push --force origin main
```

### Step 3: Redeploy
```bash
npm run build
npm run deploy:production
```

### Step 4: Restore iOS App
```bash
# Sync previous version
npx cap sync ios

# Rebuild and redeploy via Xcode
npx cap open ios
```

---

## Support & Troubleshooting

### Common Issues

**Issue: Logo not displaying in emails**
- **Cause:** Email client blocking external images
- **Solution:** Ensure logo URL is absolute (https://) and hosted on trusted domain

**Issue: Logo appears blurry on iOS**
- **Cause:** Missing @2x or @3x retina variants
- **Solution:** Regenerate iOS app icons with all required sizes

**Issue: Logo too large/small on mobile**
- **Cause:** Fixed sizing instead of responsive sizing
- **Solution:** Use responsive size classes (w-full, max-w-*)

**Issue: Logo not caching correctly**
- **Cause:** Missing cache headers
- **Solution:** Configure CDN/server to cache SVG/PNG files for 1 year

**Issue: SVG logo not displaying in older browsers**
- **Cause:** Browser doesn't support SVG
- **Solution:** Provide PNG fallback using `<picture>` element

---

## Timeline Estimate

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1: Asset Generation | 2-4 hours | Design team |
| Phase 2: File Deployment | 1 hour | Phase 1 complete |
| Phase 3: Component Updates | 2-3 hours | Phase 2 complete |
| Phase 4: Email Templates | 1-2 hours | Phase 2 complete |
| Phase 5: PDF Exports | 2-3 hours | Phase 2 complete |
| Phase 6: Public Pages | 2-3 hours | Phase 3 complete |
| Phase 7: iOS Integration | 2-4 hours | Phase 1, 2 complete |
| Phase 8: QA Testing | 4-6 hours | All phases complete |
| Phase 9: Deployment | 1-2 hours | Phase 8 complete |
| **Total** | **17-28 hours** | - |

**Recommended Approach:** Execute phases 3-6 in parallel to save time.

---

## Success Metrics

After deployment, track these metrics to measure success:

- **Visual Consistency:** Logo displays correctly in 100% of tested locations
- **Performance:** No increase in page load time (logo files are optimized)
- **Accessibility:** Lighthouse accessibility score remains 100
- **User Feedback:** No user complaints about logo visibility or branding
- **Email Open Rate:** Monitor if branded emails improve open rates
- **App Store Rating:** Monitor iOS app rating after icon update
- **PWA Install Rate:** Monitor if new app icon improves PWA installs

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Owner:** Development Team
**Status:** Ready for Implementation
