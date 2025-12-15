# Change Order PDF Branding Update - Complete

## Summary
Successfully updated the Change Order PDF export to use JobSight branding, following the exact same pattern as RFI exports.

## Files Modified

### 1. `src/features/change-orders/utils/pdfExport.ts`

**Added Imports:**
```typescript
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding'
```

**Updated Interface:**
```typescript
export interface ChangeOrderPDFData {
  changeOrder: ChangeOrder
  items: ChangeOrderItem[]
  projectId: string              // ✅ Added
  gcCompany?: CompanyInfo        // ✅ Added
  projectInfo?: {
    // ... existing fields
  }
}
```

**Removed Functions:**
- `drawHeader()` - Replaced with centralized branding utility
- `drawFooter()` - Replaced with centralized branding utility

**Updated `generateChangeOrderPDF()` Function:**
- Fetches company information using `getCompanyInfo(data.projectId)`
- Uses `addDocumentHeader()` for branded header with GC logo and info
- Document title format: `CO #123 - January 15, 2024`
- Document type: `CHANGE ORDER`
- Uses `addFootersToAllPages()` for "Powered by JobSightApp.com" footer

### 2. `src/pages/change-orders/ChangeOrderDetailPage.tsx`

**Updated `handleDownloadPDF()` Function:**
```typescript
await downloadChangeOrderPDF({
  changeOrder,
  items: items || [],
  projectId: changeOrder.project_id,  // ✅ Added
  projectInfo: changeOrder.project ? {
    name: changeOrder.project.name,
    number: changeOrder.project.number || undefined,
  } : undefined,
})
```

## Benefits

1. **Consistent Branding**: All PDF exports (RFIs, Change Orders, etc.) now have identical branding
2. **Professional Appearance**: Company logo and contact information prominently displayed
3. **JobSight Attribution**: "Powered by JobSightApp.com" footer on every page
4. **Maintainability**: Single source of truth for PDF branding in `@/lib/utils/pdfBranding.ts`
5. **Easy Updates**: Changes to branding only need to be made in one place

## PDF Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Company Logo]              Company Name                │
│                             123 Main Street             │
│                             Tel: (555) 123-4567         │
│                             email@company.com           │
├─────────────────────────────────────────────────────────┤
│              CHANGE ORDER                               │
├─────────────────────────────────────────────────────────┤
│ CO #123 - January 15, 2024                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Change Order Content]                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Page 1 of 3   Generated: Jan 15, 2024   Powered by    │
│                                          JobSightApp.com│
└─────────────────────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Test PDF export with company logo
- [ ] Test PDF export without company logo
- [ ] Verify multi-page documents have footers on all pages
- [ ] Verify change order details display correctly
- [ ] Verify line items table renders properly
- [ ] Verify signature section appears correctly
- [ ] Test with both CO and PCO number formats

## Next Steps

Consider applying the same branding pattern to other PDF exports:
- [ ] Submittal PDFs
- [ ] Lien Waiver PDFs
- [ ] Cost Estimate PDFs
- [ ] Payment Application PDFs
- [ ] Inspection PDFs
- [ ] Meeting Minutes PDFs
