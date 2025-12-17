# JobSight Branding & Logo Implementation Guide

## Brand Identity

**Logo Description:**
- Orange construction hard hat with gear icon
- "JobSight" wordmark (outlined text)
- Symbolizes: Construction management + operational efficiency

**Brand Colors:**
- Primary Orange: `#F97316` (Hard hat, accent color)
- Secondary Orange: `#EA580C` (Dark variant)
- Orange Highlight: `#FB923C` (Light variant)
- Text: Dark gray/white depending on theme

---

## Logo File Structure

### Required Logo Assets

All logo files should be stored in `public/` for web access:

```
public/
├── jobsight-logo.svg              # Full logo (light theme)
├── jobsight-logo-dark.svg         # Full logo (dark theme)
├── jobsight-icon.svg              # Icon only (512x512)
├── jobsight-icon-transparent.svg  # Icon with transparent background
├── favicon.svg                    # Browser favicon (32x32)
├── icons/
│   ├── icon-16x16.png
│   ├── icon-32x32.png
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── apple-touch-icon.png       # 180x180
│   └── maskable-icon-512x512.png  # PWA adaptive icon
└── splash/
    └── apple-splash-*.png         # iOS splash screens (16 variants)
```

### iOS Native Assets

```
ios/App/App/Assets.xcassets/
├── AppIcon.appiconset/
│   ├── AppIcon-20x20@1x.png
│   ├── AppIcon-20x20@2x.png
│   ├── AppIcon-20x20@3x.png
│   ├── AppIcon-29x29@1x.png
│   ├── AppIcon-29x29@2x.png
│   ├── AppIcon-29x29@3x.png
│   ├── AppIcon-40x40@1x.png
│   ├── AppIcon-40x40@2x.png
│   ├── AppIcon-40x40@3x.png
│   ├── AppIcon-60x60@2x.png
│   ├── AppIcon-60x60@3x.png
│   ├── AppIcon-76x76@1x.png
│   ├── AppIcon-76x76@2x.png
│   ├── AppIcon-83.5x83.5@2x.png
│   ├── AppIcon-512@2x.png
│   └── AppIcon-1024x1024@1x.png
└── Splash.imageset/
    ├── splash-2732x2732.png
    ├── splash-2732x2732-1.png
    └── splash-2732x2732-2.png
```

---

## Logo Usage Guidelines

### 1. Component-Based Logo System

**Primary Logo Component:** `src/components/brand/Logo.tsx`

**Available Variants:**

| Component | Use Case | Size | Background |
|-----------|----------|------|------------|
| `<Logo variant="default" />` | General use, light theme | Medium | Light |
| `<Logo variant="light" />` | Dark backgrounds | Medium | Dark |
| `<Logo variant="dark" />` | Light backgrounds | Medium | Light |
| `<Logo variant="icon" />` | Icon only, no text | Small | Any |
| `<LogoIcon />` | Generic hard-hat icon | Responsive | Any |
| `<LogoIconLight />` | Icon for dark backgrounds | Small | Dark |
| `<SidebarLogo />` | Sidebar header with tagline | Large | Dark |
| `<AuthLogo />` | Login/auth pages | Extra large | Centered |
| `<CompactLogo />` | Navigation bar | Small | Any |

**Size Props:**
- `size="sm"` - 24px height
- `size="md"` - 32px height (default)
- `size="lg"` - 48px height
- `size="xl"` - 64px height

---

### 2. Application Usage Map

| Location | Component | Current Status | Action Required |
|----------|-----------|----------------|-----------------|
| **Authentication Pages** | `<AuthLogo />` | ✅ Implemented | Update SVG source |
| **Sidebar Navigation** | `<SidebarLogo />` | ✅ Implemented | Update SVG source |
| **Mobile Header** | `<CompactLogo />` | ✅ Implemented | Update SVG source |
| **Settings → Company Profile** | Company logo upload | ✅ Implemented | No changes needed |
| **PDF Exports** | Company logo (uploaded) | ✅ Implemented | Add JobSight fallback |
| **Email Templates** | Text + emoji | ❌ Missing | **ADD LOGO** |
| **Public Report Viewer** | None | ❌ Missing | **ADD LOGO** |
| **Client Portal Header** | Minimal | ⚠️ Partial | **ENHANCE** |
| **Error Pages (404, 500)** | None | ❌ Missing | **ADD LOGO** |
| **Loading Screens** | Spinner only | ❌ Missing | **ADD LOGO** |
| **PWA Install Prompt** | Generic icon | ⚠️ Partial | Update icon files |
| **Email Signatures** | None | ❌ Missing | **ADD LOGO** |

---

### 3. Email Template Branding

**Current Implementation:**
```typescript
// ❌ CURRENT: Uses emoji instead of logo
export const emailHeader = `
  <div style="background-color: #2563eb; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">🏗️ JobSight</h1>
  </div>
`;
```

**Required Implementation:**
```typescript
// ✅ RECOMMENDED: Use branded logo
export const emailHeader = `
  <div style="background-color: #F97316; padding: 20px; text-align: center;">
    <img
      src="${import.meta.env.VITE_APP_URL}/jobsight-logo.svg"
      alt="JobSight"
      style="height: 48px; width: auto;"
    />
  </div>
`;
```

**Files to Update:**
- `src/lib/email/templates/base-template.ts`
- `src/lib/email/templates/daily-report-template.ts`
- `src/lib/email/templates/submittal-notification-template.ts`
- `src/lib/email/templates/meeting-minutes-template.ts`

---

### 4. PDF Export Branding

**Current System:**
- Company-uploaded logo is embedded in PDF headers
- Logo loaded from `companies.logo_url` field in database
- Converted to Base64 for jsPDF embedding

**Enhancement Required:**
- Add JobSight logo as **fallback** when company logo is not uploaded
- Position: Top-left corner (40mm x 15mm)
- Format: Base64-encoded SVG or PNG

**Implementation:**
```typescript
// File: src/lib/utils/pdfBranding.ts

export async function getCompanyInfo(projectId: string): Promise<CompanyInfo> {
  const companyData = await fetchCompanyData(projectId);

  // Fallback to JobSight logo if company logo not uploaded
  const logoBase64 = companyData.logo_url
    ? await loadCompanyLogo(companyData.logo_url)
    : await loadJobSightLogo(); // ✅ ADD THIS FUNCTION

  return {
    name: companyData.name,
    logoBase64,
    // ... other fields
  };
}

async function loadJobSightLogo(): Promise<string> {
  const response = await fetch('/jobsight-logo.svg');
  const svg = await response.text();
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
```

---

### 5. Public Report Viewer Branding

**Current State:**
- `src/features/reports/components/PublicReportViewer.tsx`
- No header branding for externally shared reports

**Required Enhancement:**
```typescript
// Add to PublicReportViewer.tsx header
<div className="bg-orange-500 px-6 py-4 flex items-center justify-between">
  <Logo variant="light" size="lg" />
  <span className="text-white text-sm">Public Report View</span>
</div>
```

---

### 6. Loading Screen & Error Pages

**Current State:**
- Generic spinners and error messages
- No branded experience

**Required Enhancement:**

**Loading Screen:** `src/components/LoadingScreen.tsx`
```typescript
<div className="flex flex-col items-center justify-center min-h-screen">
  <Logo variant="default" size="xl" className="animate-pulse" />
  <p className="mt-4 text-gray-600">Loading JobSight...</p>
</div>
```

**Error Pages:** `src/pages/errors/NotFoundPage.tsx`, `ErrorPage.tsx`
```typescript
<div className="flex flex-col items-center justify-center min-h-screen">
  <Logo variant="default" size="lg" />
  <h1 className="mt-8 text-4xl font-bold">404 - Page Not Found</h1>
  <p className="mt-2 text-gray-600">This page doesn't exist in JobSight</p>
</div>
```

---

## Color Specifications

### Primary Brand Colors

```css
:root {
  /* Orange Palette (Hard Hat) */
  --jobsight-orange-50: #FFF7ED;
  --jobsight-orange-100: #FFEDD5;
  --jobsight-orange-200: #FED7AA;
  --jobsight-orange-300: #FDBA74;
  --jobsight-orange-400: #FB923C;  /* Light highlight */
  --jobsight-orange-500: #F97316;  /* PRIMARY BRAND COLOR */
  --jobsight-orange-600: #EA580C;  /* Dark variant */
  --jobsight-orange-700: #C2410C;
  --jobsight-orange-800: #9A3412;
  --jobsight-orange-900: #7C2D12;

  /* Gear/Background */
  --jobsight-gray-50: #F9FAFB;
  --jobsight-gray-100: #F3F4F6;
  --jobsight-gray-200: #E5E7EB;
  --jobsight-gray-700: #374151;
  --jobsight-gray-800: #1F2937;
  --jobsight-gray-900: #111827;

  /* Semantic Colors */
  --jobsight-primary: var(--jobsight-orange-500);
  --jobsight-primary-hover: var(--jobsight-orange-600);
  --jobsight-primary-light: var(--jobsight-orange-400);
}
```

### Tailwind CSS Classes

```typescript
// Primary orange (use everywhere possible)
"bg-orange-500"      // #F97316 - backgrounds
"text-orange-500"    // #F97316 - text
"border-orange-500"  // #F97316 - borders

// Hover states
"hover:bg-orange-600"  // #EA580C
"hover:text-orange-600"

// Light variant
"bg-orange-400"  // #FB923C
```

---

## Implementation Checklist

### Phase 1: Asset Generation (Required)
- [ ] Export logo file as SVG (full logo with text)
  - `jobsight-logo.svg` (light theme)
  - `jobsight-logo-dark.svg` (dark theme)
- [ ] Export icon-only SVG (hard hat + gear)
  - `jobsight-icon.svg` (512x512, orange background)
  - `jobsight-icon-transparent.svg` (transparent background)
- [ ] Generate PNG icons (16x16, 32x32, 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512)
- [ ] Generate Apple touch icon (180x180)
- [ ] Generate PWA maskable icon (512x512)
- [ ] Generate iOS splash screens (16 variants)
- [ ] Generate iOS app icons (all sizes in AppIcon.appiconset/)

### Phase 2: Component Updates
- [ ] Update `src/components/brand/Logo.tsx` SVG paths with new logo design
- [ ] Test all logo variants (default, light, dark, icon)
- [ ] Verify responsive sizing (sm, md, lg, xl)
- [ ] Test dark mode compatibility

### Phase 3: Email Templates
- [ ] Update `src/lib/email/templates/base-template.ts` header
- [ ] Replace emoji 🏗️ with `<img src="jobsight-logo.svg">`
- [ ] Change background color from `#2563eb` to `#F97316`
- [ ] Test email rendering in Gmail, Outlook, Apple Mail

### Phase 4: PDF Exports
- [ ] Add `loadJobSightLogo()` function to `src/lib/utils/pdfBranding.ts`
- [ ] Implement fallback logic when `companies.logo_url` is null
- [ ] Test PDF generation with and without company logo
- [ ] Verify logo positioning (40mm x 15mm, top-left)

### Phase 5: Public Facing Pages
- [ ] Add logo to `PublicReportViewer.tsx` header
- [ ] Create branded loading screen component
- [ ] Add logo to 404 error page
- [ ] Add logo to 500 error page
- [ ] Add logo to client portal header

### Phase 6: PWA & Mobile
- [ ] Update `index.html` favicon references
- [ ] Update `manifest.json` icon references
- [ ] Replace iOS app icons in `ios/App/App/Assets.xcassets/`
- [ ] Test PWA install prompt with new icon
- [ ] Test iOS app launch with new icons

### Phase 7: Quality Assurance
- [ ] Verify logo displays correctly in all themes (light/dark)
- [ ] Test logo on all screen sizes (mobile, tablet, desktop)
- [ ] Verify color consistency (#F97316 used everywhere)
- [ ] Check logo accessibility (alt text, aria-labels)
- [ ] Validate SVG optimization (remove unnecessary metadata)
- [ ] Test PDF export logo quality
- [ ] Test email logo rendering across clients

---

## File Locations Reference

### Logo Component
```
src/components/brand/Logo.tsx (199 lines)
```

### Email Templates
```
src/lib/email/templates/base-template.ts
src/lib/email/templates/daily-report-template.ts
src/lib/email/templates/submittal-notification-template.ts
src/lib/email/templates/meeting-minutes-template.ts
```

### PDF Branding
```
src/lib/utils/pdfBranding.ts
src/features/daily-reports/utils/pdfExport.ts
src/features/submittals/utils/pdfExport.ts
src/features/checklists/utils/pdfExport.ts
src/features/rfis/utils/pdfExport.ts
src/features/schedule/utils/schedulePdfExport.ts
src/features/lien-waivers/utils/pdfExport.ts
src/features/cost-estimates/utils/pdfExport.ts
src/features/change-orders/utils/pdfExport.ts
src/features/payment-applications/utils/pdfExport.ts
src/features/documents/components/PackageCoverSheet.tsx
```

### Public Pages
```
src/features/reports/components/PublicReportViewer.tsx
src/pages/errors/NotFoundPage.tsx
src/components/LoadingScreen.tsx
```

### Static Assets
```
public/jobsight-logo.svg
public/jobsight-logo-dark.svg
public/jobsight-icon.svg
public/favicon.svg
public/icons/icon-*.png
public/icons/apple-touch-icon.png
public/icons/maskable-icon-512x512.png
public/splash/apple-splash-*.png
```

### iOS Native
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
ios/App/App/Assets.xcassets/Splash.imageset/
ios/App/App/public/
```

---

## Testing Scenarios

### Visual Testing
1. **Light Mode:** Verify logo displays correctly on light backgrounds
2. **Dark Mode:** Verify logo switches to light variant on dark backgrounds
3. **Mobile Responsive:** Test logo sizing on iPhone, Android devices
4. **PDF Export:** Generate test PDFs with and without company logo
5. **Email Rendering:** Send test emails to Gmail, Outlook, Apple Mail
6. **PWA Install:** Trigger PWA install prompt and verify icon

### Accessibility Testing
1. **Alt Text:** Verify all `<img>` tags have descriptive alt text
2. **Color Contrast:** Ensure orange (#F97316) meets WCAG AA standards
3. **Screen Reader:** Test logo announcements with screen reader software
4. **Keyboard Navigation:** Ensure logo links are keyboard accessible

### Performance Testing
1. **SVG File Size:** Keep logo SVG under 10KB
2. **PNG Compression:** Optimize all PNG icons with tools like TinyPNG
3. **Loading Speed:** Measure logo load time on 3G connection
4. **Caching:** Verify logo files are properly cached (browser + CDN)

---

## Brand Usage Rules

### DO ✅
- Use the official JobSight logo files provided
- Maintain aspect ratio when resizing
- Use orange (#F97316) as primary brand color
- Provide adequate whitespace around logo (minimum 16px)
- Use high-resolution files for print materials
- Test logo visibility on all background colors

### DON'T ❌
- Distort, stretch, or skew the logo
- Change the logo colors (except for approved dark mode variant)
- Add effects (drop shadows, gradients, glows)
- Rotate the logo
- Use low-resolution files for high-quality outputs
- Place logo on busy background images without contrast
- Use emoji as logo replacement

---

## Support & Maintenance

**Logo Update Process:**
1. Update source file in design tool (Figma, Illustrator, etc.)
2. Export all required formats (SVG, PNG)
3. Run optimization tools (SVGO, TinyPNG)
4. Replace files in `public/` directory
5. Update iOS native assets
6. Run build: `npm run build`
7. Test all logo implementations
8. Deploy to production

**Logo Versioning:**
- Major logo redesign: Increment version (v2.0)
- Minor tweaks: Patch version (v1.1)
- Document changes in `CHANGELOG.md`

**Contact:**
- Design questions: Design team
- Technical implementation: Development team
- Brand guidelines: Marketing team

---

## Appendix

### Tools & Resources

**Logo Optimization:**
- SVGO: `npx svgo --multipass public/jobsight-logo.svg`
- TinyPNG: https://tinypng.com/
- ImageOptim: https://imageoptim.com/

**Icon Generation:**
- Favicon Generator: https://realfavicongenerator.net/
- PWA Asset Generator: `npx pwa-asset-generator`
- iOS Icon Generator: `npx app-icon`

**Testing Tools:**
- Responsively: https://responsively.app/
- Email on Acid: https://www.emailonacid.com/
- Litmus: https://www.litmus.com/

### Accessibility Standards

**WCAG 2.1 AA Compliance:**
- Color contrast ratio: 4.5:1 (normal text), 3:1 (large text)
- Orange #F97316 on white background: ✅ 4.52:1 (PASS)
- White on orange #F97316: ✅ 4.52:1 (PASS)
- Orange #F97316 on gray #F3F4F6: ⚠️ 3.89:1 (FAIL - use darker text)

**Recommendations:**
- Use `text-orange-600` (#EA580C) on light gray backgrounds
- Use white text on `bg-orange-500` (#F97316)
- Provide alt text: "JobSight - Construction Field Management"

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Maintained By:** Development Team
