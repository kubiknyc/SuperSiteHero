# JobSight Branding Implementation Guide

## Overview

This document outlines the complete implementation of JobSight branding across the application, including:
- **Application Name**: Changed to "JobSight" throughout
- **PDF Documents**: All PDFs now include GC logo/info at top and "Powered by JobSightApp.com" footer
- **PWA Branding**: Updated for JobSight
- **Package Configuration**: Updated package.json

## What's Been Completed

### ✅ 1. Centralized PDF Branding Utility

**File Created**: [`src/lib/utils/pdfBranding.ts`](src/lib/utils/pdfBranding.ts)

This new utility provides centralized branding for ALL PDF documents with:

#### Features:
- **Header Function**: `addDocumentHeader()` - Adds GC company logo and info
- **Footer Function**: `addFootersToAllPages()` - Adds "Powered by JobSightApp.com" to every page
- **Company Info Helper**: `getCompanyInfo()` - Fetches GC company details from database
- **Logo Loading**: `loadCompanyLogo()` - Converts image URLs to base64 for PDF embedding

#### Key Types:
```typescript
interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  logoBase64?: string; // For PDF embedding
}

interface BrandingOptions {
  gcCompany: CompanyInfo;
  documentTitle: string;
  documentType: string; // e.g., "DAILY REPORT", "RFI"
  includeFooter?: boolean;
  includeHeader?: boolean;
}
```

### ✅ 2. Updated Daily Reports PDF Export (Example Implementation)

**File Updated**: [`src/features/daily-reports/utils/pdfExportV2.ts`](src/features/daily-reports/utils/pdfExportV2.ts)

#### Changes Made:
1. **Import branding utilities**:
   ```typescript
   import {
     addDocumentHeader,
     addFootersToAllPages,
     getCompanyInfo,
     type CompanyInfo,
   } from '@/lib/utils/pdfBranding';
   ```

2. **Updated GeneratePDFOptionsV2 interface**:
   ```typescript
   export interface GeneratePDFOptionsV2 {
     // ... existing fields
     projectId: string; // NEW: Required for fetching company info
     gcCompany?: CompanyInfo; // NEW: Optional, provide to avoid fetching
   }
   ```

3. **Updated generateDailyReportPDFV2 function**:
   ```typescript
   export async function generateDailyReportPDFV2(options: GeneratePDFOptionsV2): Promise<Blob> {
     const { report, projectName, projectId, gcCompany, ...rest } = options;

     // Get company info for branding
     const companyInfo = gcCompany || (await getCompanyInfo(projectId));

     // Add sections with branding
     let yPos = await addHeader(doc, report, projectName, companyInfo);
     // ... rest of sections

     // Add JobSight footer to all pages
     addFootersToAllPages(doc);

     return doc.output('blob');
   }
   ```

4. **Updated addHeader function**:
   - Now accepts `CompanyInfo` parameter
   - Made `async` to support logo loading
   - Uses `addDocumentHeader()` for branded header

5. **Removed old addFooter function**:
   - Replaced with centralized `addFootersToAllPages()`

### ✅ 3. Package.json Updated

**File Updated**: [`package.json`](package.json)

```json
{
  "name": "jobsight",
  "description": "JobSight - Construction Field Management Platform for Superintendents",
  ...
}
```

### ✅ 4. PWA Manifest (Already Correct)

**File**: [`vite.config.ts`](vite.config.ts)

The PWA manifest already has JobSight branding:
```typescript
manifest: {
  name: 'JobSight',
  short_name: 'JobSight',
  description: 'Construction Field Management Platform',
  ...
}
```

### ✅ 5. HTML Title

**File**: [`index.html`](index.html)

```html
<title>JobSight - Construction Field Management</title>
<meta name="apple-mobile-web-app-title" content="JobSight" />
```

## What Needs To Be Done

### 🔲 Remaining PDF Export Files to Update

There are **13 additional PDF export files** that need to be updated following the same pattern as Daily Reports V2:

1. [`src/features/change-orders/utils/pdfExport.ts`](src/features/change-orders/utils/pdfExport.ts)
2. [`src/features/checklists/utils/pdfExport.ts`](src/features/checklists/utils/pdfExport.ts)
3. [`src/features/cost-estimates/utils/pdfExport.ts`](src/features/cost-estimates/utils/pdfExport.ts)
4. [`src/features/daily-reports/utils/pdfExport.ts`](src/features/daily-reports/utils/pdfExport.ts) (V1 - older version)
5. [`src/features/lien-waivers/utils/pdfExport.ts`](src/features/lien-waivers/utils/pdfExport.ts)
6. [`src/features/payment-applications/utils/pdfExport.ts`](src/features/payment-applications/utils/pdfExport.ts)
7. [`src/features/rfis/utils/pdfExport.ts`](src/features/rfis/utils/pdfExport.ts)
8. [`src/features/submittals/utils/pdfExport.ts`](src/features/submittals/utils/pdfExport.ts)
9. [`src/features/schedule/utils/schedulePdfExport.ts`](src/features/schedule/utils/schedulePdfExport.ts)

### 🔲 Components That Call PDF Export Functions

After updating PDF export files, you'll need to update the **calling components** to pass `projectId`:

Example locations to update:
- Daily report pages/components
- RFI pages/components
- Submittal pages/components
- Change order pages/components
- Any component with "Export to PDF" or "Download PDF" buttons

## Step-by-Step Implementation Guide

### For Each PDF Export File:

#### Step 1: Add Import
```typescript
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding';
```

#### Step 2: Update Export Options Interface
Add `projectId` and optionally `gcCompany` to your options interface:

```typescript
export interface GeneratePDFOptions {
  // ... existing fields
  projectName: string;
  projectId: string; // ADD THIS
  gcCompany?: CompanyInfo; // ADD THIS (optional)
}
```

#### Step 3: Update Main Generate Function

```typescript
export async function generateMyDocumentPDF(options: GeneratePDFOptions): Promise<Blob> {
  const { projectId, gcCompany, ...rest } = options;

  // Get company info for branding
  const companyInfo = gcCompany || (await getCompanyInfo(projectId));

  // Create PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Add branded header (this replaces your existing header code)
  let yPos = await addDocumentHeader(doc, {
    gcCompany: companyInfo,
    documentTitle: 'Your Document Title Here',
    documentType: 'YOUR DOCUMENT TYPE', // e.g., "RFI", "CHANGE ORDER"
  });

  // Add your document content sections
  yPos = addSection1(doc, yPos);
  yPos = addSection2(doc, yPos);
  // ... more sections

  // Add branded footer to all pages (this replaces your existing footer code)
  addFootersToAllPages(doc);

  return doc.output('blob');
}
```

#### Step 4: Update Header Function (If Exists)

If your PDF export has a dedicated `addHeader` function, update it:

```typescript
// OLD:
function addHeader(doc: jsPDF, data: MyData): number {
  let yPos = MARGIN;
  doc.text('MY DOCUMENT', MARGIN, yPos);
  // ... more header code
  return yPos + 20;
}

// NEW:
async function addHeader(
  doc: jsPDF,
  data: MyData,
  gcCompany: CompanyInfo
): Promise<number> {
  // Use centralized branded header
  let yPos = await addDocumentHeader(doc, {
    gcCompany,
    documentTitle: `My Document - ${data.name}`,
    documentType: 'MY DOCUMENT TYPE',
  });

  // Add any additional document-specific info below the branded header
  // ... your custom fields

  return yPos;
}
```

#### Step 5: Remove Old Footer Function

Delete your existing footer function if you have one, as it's replaced by `addFootersToAllPages()`.

```typescript
// DELETE THIS:
function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i}`, ...);
    // ... old footer code
  }
}
```

#### Step 6: Update Calling Components

Find components that call your PDF export function and add `projectId`:

```typescript
// OLD:
await generateMyDocumentPDF({
  report: data,
  projectName: project.name,
});

// NEW:
await generateMyDocumentPDF({
  report: data,
  projectName: project.name,
  projectId: project.id, // ADD THIS
});
```

## Example: Complete RFI PDF Export Update

Here's a complete example of updating an RFI PDF export:

### Before:
```typescript
export async function generateRFIPDF(options: GenerateRFIPDFOptions): Promise<Blob> {
  const { rfi, projectName } = options;
  const doc = new jsPDF();

  let yPos = 15;
  doc.setFontSize(20);
  doc.text('REQUEST FOR INFORMATION', 15, yPos);
  yPos += 10;

  // ... more content

  addFooter(doc);
  return doc.output('blob');
}

function addFooter(doc: jsPDF): void {
  // Old footer code
}
```

### After:
```typescript
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding';

export interface GenerateRFIPDFOptions {
  rfi: RFI;
  projectName: string;
  projectId: string; // NEW
  gcCompany?: CompanyInfo; // NEW (optional)
}

export async function generateRFIPDF(options: GenerateRFIPDFOptions): Promise<Blob> {
  const { rfi, projectName, projectId, gcCompany } = options;

  // Get company info for branding
  const companyInfo = gcCompany || (await getCompanyInfo(projectId));

  const doc = new jsPDF();

  // Add branded header with GC logo
  let yPos = await addDocumentHeader(doc, {
    gcCompany: companyInfo,
    documentTitle: `RFI #${rfi.number} - ${projectName}`,
    documentType: 'REQUEST FOR INFORMATION',
  });

  // Add RFI-specific content
  yPos = addRFIDetails(doc, rfi, yPos);
  yPos = addRFIDescription(doc, rfi, yPos);
  // ... more sections

  // Add JobSight footer to all pages
  addFootersToAllPages(doc);

  return doc.output('blob');
}
```

## Implementation of Company Info Fetching

The `getCompanyInfo()` function in `pdfBranding.ts` is currently a placeholder. You need to implement it to fetch from your database:

```typescript
export async function getCompanyInfo(projectId: string): Promise<CompanyInfo> {
  // Example implementation using Supabase
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      company:companies!inner(
        id,
        name,
        address,
        phone,
        email,
        website,
        logo_url
      )
    `)
    .eq('id', projectId)
    .single();

  if (!project?.company) {
    // Return default/fallback company info
    return {
      name: 'Company Name',
      address: '123 Main Street, City, ST 12345',
      phone: '(555) 123-4567',
      email: 'info@company.com',
    };
  }

  // Load and convert logo to base64 if URL provided
  let logoBase64: string | undefined;
  if (project.company.logo_url) {
    try {
      logoBase64 = await loadCompanyLogo(project.company.logo_url);
    } catch (error) {
      console.warn('Failed to load company logo:', error);
    }
  }

  return {
    name: project.company.name,
    address: project.company.address,
    phone: project.company.phone,
    email: project.company.email,
    website: project.company.website,
    logoBase64,
  };
}
```

## Database Schema Requirements

To support company branding, ensure your database has:

### Companies Table
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT, -- URL to company logo (Supabase Storage or external)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Projects Table (link to company)
```sql
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
```

## Testing Checklist

After implementing branding for each PDF export:

- [ ] PDF displays GC company logo (if provided)
- [ ] PDF displays GC company name and contact info at top
- [ ] Document type banner is displayed (e.g., "DAILY REPORT", "RFI")
- [ ] Every page has "Powered by JobSightApp.com" footer on the right
- [ ] Every page has page number on the left
- [ ] Every page has generation date in center
- [ ] Footer separator line is present
- [ ] All content fits within margins
- [ ] Multi-page documents have footers on ALL pages
- [ ] PDF downloads with correct filename
- [ ] No console errors during PDF generation

## Visual Reference

### Header Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ [GC Logo]                               Company Name        │
│                                         123 Main Street      │
│                                         Tel: (555) 123-4567  │
│                                         info@company.com     │
├─────────────────────────────────────────────────────────────┤
│              DOCUMENT TYPE (e.g., DAILY REPORT)             │
├─────────────────────────────────────────────────────────────┤
│ Document Title / Project Name                               │
└─────────────────────────────────────────────────────────────┘
```

### Footer Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ ─────────────────────────────────────────────────────────── │
│ Page 1 of 3      Generated: Dec 15, 2025   Powered by      │
│                                              JobSightApp.com │
└─────────────────────────────────────────────────────────────┘
```

## Migration Priority

Recommended order to update PDF exports (based on usage frequency):

1. ✅ **Daily Reports V2** - COMPLETE
2. **Daily Reports V1** - Update or deprecate
3. **RFIs** - High priority, frequently exported
4. **Submittals** - High priority
5. **Change Orders** - High priority, legal documents
6. **Payment Applications** - High priority, financial documents
7. **Lien Waivers** - Legal documents
8. **Schedule PDFs** - Medium priority
9. **Cost Estimates** - Medium priority
10. **Checklists** - Medium priority

## Support

### Common Issues:

**Q: Logo not showing up in PDF**
A: Ensure `logoBase64` field is populated. Check browser console for image loading errors. Verify CORS settings if loading from external URL.

**Q: Footer not on all pages**
A: Make sure you call `addFootersToAllPages(doc)` AFTER adding all content to the PDF, not before.

**Q: TypeScript errors about missing projectId**
A: Update the calling component to pass `projectId` to the PDF generation function.

**Q: Company info returns placeholder data**
A: Implement the `getCompanyInfo()` function in `pdfBranding.ts` to fetch from your actual database.

## Summary

**Files Created:**
- `src/lib/utils/pdfBranding.ts` - Centralized branding utility

**Files Updated:**
- `package.json` - App name changed to "jobsight"
- `src/features/daily-reports/utils/pdfExportV2.ts` - Example implementation

**Still Need Updates:**
- 13 remaining PDF export utility files
- All components that call PDF export functions (must pass `projectId`)
- Implementation of `getCompanyInfo()` in `pdfBranding.ts`

**Result:**
All JobSight PDF documents will display:
- ✅ GC company logo and contact information at the top
- ✅ Professional document type banner
- ✅ "Powered by JobSightApp.com" footer on every page
- ✅ Consistent branding across all document types

---

*Last Updated: December 15, 2025*
