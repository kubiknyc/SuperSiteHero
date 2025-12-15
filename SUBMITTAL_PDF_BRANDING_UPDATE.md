# Submittal PDF Export - JobSight Branding Update

## Summary
Updated the Submittal PDF export functionality to use centralized JobSight branding, following the exact same pattern as RFI PDF exports.

## Changes Made

### 1. `src/features/submittals/utils/pdfExport.ts`

#### Added Imports
```typescript
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding'
```

#### Updated Interface
Added `projectId` and `gcCompany` to `SubmittalPDFData`:
```typescript
export interface SubmittalPDFData {
  submittal: SubmittalWithDetails
  projectInfo?: { ... }
  projectId: string          // ← ADDED
  gcCompany?: CompanyInfo    // ← ADDED
  includeItems?: boolean
  includeReviews?: boolean
  includeAttachments?: boolean
}
```

#### Removed Functions
- **Removed**: `drawHeader()` function
  - Replaced with comment: "// Header function removed - now using centralized JobSight branding from pdfBranding.ts"

- **Removed**: `drawFooter()` function
  - Replaced with comment: "// Footer function removed - now using centralized JobSight branding from pdfBranding.ts"

#### Updated `generateSubmittalPDF()` Function
```typescript
export async function generateSubmittalPDF(data: SubmittalPDFData): Promise<Blob> {
  // Fetch company info for branding
  const gcCompany = data.gcCompany || await getCompanyInfo(data.projectId)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  // Default options
  const options = {
    includeItems: data.includeItems ?? true,
    includeReviews: data.includeReviews ?? true,
    includeAttachments: data.includeAttachments ?? true,
    ...data,
  }

  // Add JobSight branded header with GC logo and info
  const submittal = data.submittal
  const submittalNumber = submittal.submittal_number || 'N/A'
  const submittalDate = formatDate(submittal.date_submitted || submittal.created_at)

  let y = await addDocumentHeader(doc, {
    gcCompany,
    documentTitle: `Submittal #${submittalNumber} - ${submittalDate}`,
    documentType: 'SUBMITTAL',
  })

  // Draw sections
  y = drawProjectInfo(doc, options, y)
  y = drawDatesSection(doc, options, y)
  y = drawSubmittalDetails(doc, options, y)
  y = drawItemsTable(doc, options, y)
  y = drawReviewComments(doc, options, y)
  y = drawReviewHistory(doc, options, y)
  y = drawAttachments(doc, options, y)

  // Add JobSight footer to all pages with "Powered by JobSightApp.com"
  addFootersToAllPages(doc)

  return doc.output('blob')
}
```

### 2. `src/pages/submittals/DedicatedSubmittalDetailPage.tsx`

#### Updated PDF Download Button
Changed from synchronous to async function call with `projectId` parameter:

**Before:**
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => downloadSubmittalPDF({
    submittal,
    includeItems: true,
    includeReviews: true,
    includeAttachments: true
  })}
>
```

**After:**
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={async () => {
    await downloadSubmittalPDF({
      submittal,
      projectId: submittal.project_id,  // ← ADDED
      includeItems: true,
      includeReviews: true,
      includeAttachments: true
    })
  }}
>
```

## Benefits

1. **Consistent Branding**: All PDF exports (RFI, Submittals) now use the same JobSight branding
2. **GC Logo Support**: Displays the General Contractor's logo and company information
3. **Professional Footer**: Adds "Powered by JobSightApp.com" footer to all pages
4. **Centralized Management**: Branding logic is maintained in one place (`pdfBranding.ts`)
5. **Easy Updates**: Future branding changes only need to be made in one location

## PDF Features

The updated Submittal PDF export now includes:

### Header Section
- GC company logo (if available)
- GC company name, address, phone, and email
- Document type banner: "SUBMITTAL"
- Document title: "Submittal #XXX - Date"

### Footer Section (on all pages)
- Page number: "Page X of Y"
- Generated date: "Generated: Month DD, YYYY"
- Branding: "Powered by JobSightApp.com"

## Pattern Consistency

This implementation follows the exact same pattern as RFI PDF exports:
- Same imports from `@/lib/utils/pdfBranding`
- Same interface structure with `projectId` and `gcCompany`
- Same header generation with `addDocumentHeader()`
- Same footer generation with `addFootersToAllPages()`
- Same async/await pattern for fetching company info

## Files Modified

1. `src/features/submittals/utils/pdfExport.ts`
2. `src/pages/submittals/DedicatedSubmittalDetailPage.tsx`

## Testing Recommendations

1. Test PDF export with a submittal that has a company logo
2. Test PDF export with a submittal without a company logo
3. Verify all sections render correctly
4. Verify footer appears on all pages
5. Check that document title includes submittal number and date
6. Verify async operation completes without errors
