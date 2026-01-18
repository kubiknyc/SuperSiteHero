# AI-Powered Drawing Management System

**Date:** 2026-01-18
**Status:** Design Complete - Ready for Implementation
**Author:** Brainstorming Session

---

## Executive Summary

A comprehensive drawing management platform for JobSight that transforms how superintendents work with construction drawings. The system automatically processes multipage PDF drawing sets, extracts metadata using AI, creates navigable cross-reference links, enables quantity takeoffs with AI visual search, and generates material lists for procurement.

---

## Feature Overview

### Core Capabilities

1. **PDF Upload & Processing**
   - Upload multipage PDF drawing sets
   - Automatically split into individual sheet documents
   - AI extracts metadata from each sheet's title block

2. **AI Metadata Extraction**
   - Drawing title and number (e.g., "A2.1 - First Floor Plan")
   - Revision date and revision number
   - Discipline (Architectural, Structural, Mechanical, Electrical, Plumbing, Civil)
   - Scale (e.g., 1/4" = 1'-0")
   - Detail callout references (e.g., "See Detail 3/A5.1")

3. **Cross-Reference Linking**
   - AI detects callout bubbles and references on drawings
   - Automatically links to target sheets
   - Tap a callout to jump directly to that detail

4. **Search & Navigation**
   - Full-text search by number, title, discipline, keyword
   - Filter by discipline, revision date, status
   - Quick navigation between linked sheets

5. **Smart Revision Tracking**
   - AI compares old vs new sheets when revisions arrive
   - Highlights what changed between versions
   - Notifies affected team members

6. **Full Offline Access**
   - Download complete drawing sets for field use
   - Works without internet connection
   - Syncs when back online

---

## Takeoff & Estimation

### Measurement Tools

| Type | Use Case | Example |
|------|----------|---------|
| **Linear** | Walls, pipes, conduit, curbs | 150 LF of 4" conduit |
| **Area** | Floors, roofs, paint, drywall | 2,500 SF of drywall |
| **Count** | Doors, fixtures, outlets, equipment | 47 duplex outlets |
| **Volume** | Concrete, excavation, fill | 125 CY of concrete |

### Scale Calibration

- **AI Auto-Detect**: Reads scale from title block automatically
- **Manual Override**: Draw a known dimension to calibrate
- **Per-Sheet Support**: Different sheets can have different scales

### AI Visual Search for Takeoffs

**The Workflow:**
1. Use lasso select tool to draw around any symbol, shape, or text
2. Choose search scope: current sheet, same discipline, or entire drawing set
3. Adjust tolerance slider (strict → fuzzy matching)
4. AI finds all matching items across selected scope
5. Review results in gallery view with confidence scores
6. Exclude false positives by unchecking
7. Assign matches to an assembly
8. Create takeoff line item with verified count

**Use Cases:**
- Count all electrical outlets, switches, fixtures
- Count doors and windows by type
- Count structural columns and footings
- Count HVAC diffusers and registers
- Any repeated symbol or element

### Cost Structure

- **Assembly-Based**: Group related items together
  - Example: "Interior Wall Type A" = framing + drywall + tape/finish + paint + labor
- **Lump Sum Labor**: Labor included in assembly cost as single amount
- **Reusable**: Assemblies can be used across projects

### Cost Data Sources

| Source | Description |
|--------|-------------|
| **Pre-Built Library** | JobSight provides standard assemblies/costs as starting point |
| **Import** | Pull from estimating software (QuickBooks, Sage, etc.) |
| **Subcontractor Bids** | Actual bid amounts override estimates |

### Reports & Export

- Summary totals by category/discipline
- Detailed line-item breakdown (qty × unit cost = extension)
- Bid comparison (estimate vs actual, variance tracking)
- Export to Excel and PDF

---

## Material List Generation

### From Takeoffs to Purchase Lists

1. **Expand Assemblies**: Break assemblies into component materials
2. **Aggregate**: Group identical materials, sum quantities
3. **Apply Waste Factors**: Configurable per item or use defaults
4. **Generate List**: Item name, quantity, unit

### Waste & Overage

- Configurable waste factor per item
- Default waste percentages by material type (e.g., +10% drywall, +5% lumber)
- Shows both net quantity and order quantity
- Adjust per project or use company defaults

### Export & Sharing

| Format | Purpose |
|--------|---------|
| **PDF** | Formatted for printing |
| **Excel** | Editable with formulas |
| **Email** | Send directly to suppliers |
| **CSV** | Import to supplier portals |

---

## Drawing Markup

### Personal Annotations
- Add notes, arrows, highlights
- Saved per user
- Private by default

### Team Collaboration
- Real-time shared markup
- Comments and replies
- See who's viewing/editing

### Formal Workflow Integration
- Markup creates RFIs directly
- Markup creates punch items directly
- Links preserved to source drawing location

### Architectural Tools

Full symbol library including:
- Revision clouds
- Arrows and leaders
- Dimension lines
- Text annotations
- Callout bubbles
- Section markers
- Detail markers
- Stamps (Approved, Rejected, For Review, etc.)

---

## System Integration

### Links Throughout JobSight

Drawings can be attached to:
- RFIs
- Punch items
- Daily reports
- Change orders
- Submittals
- Tasks

### Revision Notifications

When referenced sheets get revised:
- Team members notified automatically
- Shows which RFIs/punch items reference the changed sheet
- Easy navigation to review changes

---

## Technical Architecture

### Data Model

#### New Tables

**drawing_sheets** (individual pages extracted from PDFs)
```sql
CREATE TABLE drawing_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  document_id UUID REFERENCES documents(id),
  source_pdf_id UUID REFERENCES documents(id),

  -- Page identification
  page_number INTEGER NOT NULL,
  sheet_number TEXT, -- e.g., "A2.1"
  title TEXT,

  -- Classification
  discipline TEXT, -- architectural, structural, mechanical, etc.
  scale TEXT, -- e.g., "1/4\" = 1'-0\""

  -- Revision tracking
  revision TEXT,
  revision_date DATE,

  -- AI extraction
  ai_extracted_metadata JSONB,
  ai_confidence_score DECIMAL(3,2),
  ai_processed_at TIMESTAMPTZ,

  -- Images
  thumbnail_url TEXT,
  full_image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- RLS
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Enable RLS
ALTER TABLE drawing_sheets ENABLE ROW LEVEL SECURITY;
```

**sheet_callouts** (cross-references detected on sheets)
```sql
CREATE TABLE sheet_callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_sheet_id UUID NOT NULL REFERENCES drawing_sheets(id),
  target_sheet_id UUID REFERENCES drawing_sheets(id),

  -- Callout details
  callout_text TEXT NOT NULL, -- e.g., "3/A5.1"
  callout_type TEXT, -- detail, section, elevation, etc.

  -- Location on source sheet
  bounding_box JSONB, -- {x, y, width, height}

  -- AI confidence
  ai_confidence DECIMAL(3,2),
  is_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sheet_callouts ENABLE ROW LEVEL SECURITY;
```

**visual_search_patterns** (saved lasso selections for reuse)
```sql
CREATE TABLE visual_search_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Pattern details
  name TEXT NOT NULL,
  description TEXT,
  pattern_image_url TEXT NOT NULL,
  pattern_hash TEXT, -- for deduplication

  -- Search settings
  match_tolerance DECIMAL(3,2) DEFAULT 0.80,
  default_assembly_id UUID REFERENCES assemblies(id),

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visual_search_patterns ENABLE ROW LEVEL SECURITY;
```

**material_lists** (generated from takeoffs)
```sql
CREATE TABLE material_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- List details
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, finalized, exported, ordered

  -- Source
  takeoff_id UUID REFERENCES takeoffs(id),

  -- Content
  items JSONB NOT NULL DEFAULT '[]',
  waste_factors JSONB DEFAULT '{}',
  totals JSONB DEFAULT '{}',

  -- Export history
  export_history JSONB DEFAULT '[]',

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE material_lists ENABLE ROW LEVEL SECURITY;
```

### PDF Processing Pipeline

```
User uploads PDF
       ↓
1. Store original PDF in Supabase Storage
   - Bucket: documents
   - Path: {projectId}/drawings/{timestamp}-{filename}.pdf
       ↓
2. Create document record with status: 'processing'
       ↓
3. Queue background job via Supabase Edge Function
       ↓
4. PDF Split Service (Edge Function: process-drawing-pdf):
   a. Download PDF from Storage
   b. Use pdf-lib to count pages
   c. For each page:
      - Extract page as separate PDF
      - Render to high-res PNG (2400 DPI for AI analysis)
      - Generate thumbnail PNG (300px width)
      - Upload images to Storage
      - Create drawing_sheets record (status: 'pending_ai')
       ↓
5. Queue AI extraction jobs for each sheet
       ↓
6. AI Metadata Extraction (Edge Function: extract-sheet-metadata):
   a. Download sheet PNG
   b. Send to Claude Vision API with prompt:
      "Analyze this construction drawing sheet. Extract:
       1. Sheet number (e.g., A2.1, S-101)
       2. Sheet title
       3. Discipline (Architectural/Structural/Mechanical/Electrical/Plumbing/Civil)
       4. Scale (e.g., 1/4" = 1'-0")
       5. Revision number and date
       6. All detail callouts/references to other sheets
       Return as structured JSON."
   c. Parse response, update drawing_sheets record
   d. Create sheet_callouts records for detected references
       ↓
7. Cross-Reference Resolution (after all sheets processed):
   a. For each unlinked callout, match to actual sheet
   b. Update target_sheet_id in sheet_callouts
   c. Mark is_verified = true for high-confidence matches
       ↓
8. Update document status: 'ready'
       ↓
9. Send notification to user:
   "Drawing set processed - {count} sheets indexed"
```

### AI Visual Search Pipeline

```
User lasso-selects region on drawing
       ↓
1. Capture Selection (Client-side):
   a. Get Konva canvas selection coordinates
   b. Add tolerance buffer (10% padding)
   c. Export region as PNG via canvas.toDataURL()
       ↓
2. Generate Pattern Signature (Edge Function: describe-pattern):
   a. Send cropped image to Claude Vision:
      "Describe this construction drawing symbol/element
       precisely for matching purposes. Include:
       - Shape characteristics
       - Any text or numbers
       - Typical usage context
       Return concise description."
   b. Generate image hash for caching
   c. Store in visual_search_patterns if user saves
       ↓
3. Search Sheets (Edge Function: find-pattern-matches):
   a. Determine scope (sheet/discipline/all)
   b. For each sheet in scope (batch of 5 for efficiency):
      - Send sheet image + pattern description to Claude Vision:
        "Find all instances of this element: {description}
         Return JSON array of matches with:
         - bounding_box: {x, y, width, height} as percentages
         - confidence: 0.0-1.0"
   c. Filter by tolerance threshold
   d. Return aggregated results
       ↓
4. Display Results (Client-side):
   a. Show gallery view of matches
   b. Display total count prominently
   c. Group by sheet with navigation links
   d. Show confidence scores
       ↓
5. Review Workflow (Client-side):
   a. User unchecks false positives
   b. Selects assembly to assign
   c. Clicks "Create Takeoff Item"
       ↓
6. Create Takeoff (API):
   a. Create takeoff_items record
   b. Link to assembly
   c. Store match locations for reference
   d. Invalidate related queries
```

### Material List Generation Pipeline

```
User selects takeoff items to export
       ↓
1. Load Takeoff Data:
   a. Fetch selected takeoff items
   b. Fetch associated assemblies
   c. Fetch company waste factor defaults
       ↓
2. Expand Assemblies:
   a. For each takeoff item:
      - Get assembly components
      - Apply quantity formula: item_qty × component_qty
   b. Result: flat list of materials with quantities
       ↓
3. Aggregate Materials:
   a. Group by material identifier
   b. Sum quantities per material
   c. Preserve source links (which takeoff items)
       ↓
4. Apply Waste Factors:
   a. For each material:
      - Check item-specific waste factor
      - Fall back to company default
      - Calculate: order_qty = net_qty × (1 + waste_factor)
       ↓
5. Generate Material List Record:
   a. Create material_lists record
   b. Store items array with all details
   c. Calculate totals by category
       ↓
6. Export (on user request):
   a. PDF: Generate formatted document
   b. Excel: Create XLSX with formulas
   c. Email: Send to specified addresses
   d. CSV: Generate for supplier portal import
   e. Log export in export_history
```

---

## UI Components

### New Components to Build

```
src/features/drawing-sheets/
├── components/
│   ├── DrawingSetUpload.tsx        # Multipage PDF upload
│   ├── ProcessingProgress.tsx      # Show extraction progress
│   ├── SheetGrid.tsx               # Grid view of all sheets
│   ├── SheetViewer.tsx             # Single sheet with callout links
│   ├── CalloutOverlay.tsx          # Clickable callout bubbles
│   ├── SheetSearch.tsx             # Search/filter sheets
│   ├── RevisionDiff.tsx            # Side-by-side revision comparison
│   └── SheetNavigator.tsx          # Breadcrumb + back/forward nav
├── hooks/
│   ├── useDrawingSheets.ts         # Query sheets
│   ├── useSheetCallouts.ts         # Query callouts
│   ├── useSheetProcessing.ts       # Track processing status
│   └── useSheetNavigation.ts       # Navigation history
└── pages/
    ├── DrawingSetsPage.tsx         # List all drawing sets
    └── SheetViewerPage.tsx         # View single sheet

src/features/visual-search/
├── components/
│   ├── LassoSelectTool.tsx         # Lasso selection on canvas
│   ├── PatternSearchPanel.tsx      # Configure and run search
│   ├── MatchGallery.tsx            # Display search results
│   ├── MatchReviewList.tsx         # Review/exclude matches
│   ├── ToleranceSlider.tsx         # Adjust match tolerance
│   └── SavedPatternsLibrary.tsx    # Reuse previous patterns
├── hooks/
│   ├── useVisualSearch.ts          # Execute search
│   ├── useLassoSelection.ts        # Canvas selection logic
│   └── useSavedPatterns.ts         # Pattern CRUD
└── utils/
    └── patternMatching.ts          # Client-side utilities

src/features/material-lists/
├── components/
│   ├── MaterialListGenerator.tsx   # Main generation UI
│   ├── MaterialListTable.tsx       # Display/edit list
│   ├── WasteFactorEditor.tsx       # Configure waste factors
│   ├── ExportDialog.tsx            # Export options
│   └── SupplierEmailComposer.tsx   # Email to suppliers
├── hooks/
│   ├── useMaterialLists.ts         # Query lists
│   ├── useMaterialListMutations.ts # CRUD operations
│   └── useExportMaterialList.ts    # Export functionality
└── utils/
    └── materialAggregation.ts      # Aggregation logic
```

### Edge Functions to Build

```
supabase/functions/
├── process-drawing-pdf/
│   └── index.ts                    # Split PDF, create sheets
├── extract-sheet-metadata/
│   └── index.ts                    # AI metadata extraction
├── resolve-sheet-callouts/
│   └── index.ts                    # Link callouts to sheets
├── describe-pattern/
│   └── index.ts                    # Generate pattern description
├── find-pattern-matches/
│   └── index.ts                    # Search for matches
├── compare-sheet-revisions/
│   └── index.ts                    # Smart diff between versions
└── export-material-list/
    └── index.ts                    # Generate PDF/Excel exports
```

---

## Implementation Phases

### Phase 1: Core Drawing Processing (Foundation)
- [ ] Create database tables and RLS policies
- [ ] Build PDF upload component
- [ ] Implement PDF splitting Edge Function
- [ ] Implement AI metadata extraction Edge Function
- [ ] Build sheet grid and viewer components
- [ ] Add basic search and filtering

### Phase 2: Cross-Reference Linking
- [ ] Implement callout detection in AI extraction
- [ ] Build callout resolution service
- [ ] Create clickable callout overlay component
- [ ] Add sheet navigation history
- [ ] Implement deep linking to specific sheets

### Phase 3: AI Visual Search
- [ ] Build lasso selection tool on Konva canvas
- [ ] Implement pattern description Edge Function
- [ ] Implement pattern matching Edge Function
- [ ] Build match gallery and review UI
- [ ] Add tolerance slider and scope selection
- [ ] Create takeoff item from matches

### Phase 4: Material List Generation
- [ ] Build material aggregation utilities
- [ ] Implement waste factor configuration
- [ ] Create material list table component
- [ ] Build export functionality (PDF, Excel, CSV)
- [ ] Add email to suppliers feature

### Phase 5: Revision Tracking
- [ ] Implement smart diff Edge Function
- [ ] Build revision comparison UI
- [ ] Add revision notification system
- [ ] Track which items reference changed sheets

### Phase 6: Offline & Polish
- [ ] Add offline support for downloaded sheets
- [ ] Implement progressive loading for large sets
- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Documentation and testing

---

## Dependencies

### NPM Packages (New)

```json
{
  "pdf-lib": "^1.17.1",        // PDF manipulation (split pages)
  "sharp": "^0.33.0",          // Image processing (thumbnails)
  "konva": "^9.3.0",           // Already exists - canvas drawing
  "react-konva": "^18.2.0",    // Already exists - React bindings
  "xlsx": "^0.18.5",           // Excel export
  "jspdf": "^2.5.1"            // PDF generation for exports
}
```

### External Services

| Service | Purpose | Cost Model |
|---------|---------|------------|
| Claude Vision API | Metadata extraction, pattern matching | Per-image pricing |
| Supabase Storage | Store PDFs, images, thumbnails | Included in plan |
| Supabase Edge Functions | Background processing | Included in plan |

### Estimated Claude API Costs

| Operation | Images per Call | Est. Cost |
|-----------|----------------|-----------|
| Sheet metadata extraction | 1 | ~$0.01-0.03 |
| Pattern description | 1 | ~$0.01 |
| Pattern search (5 sheets) | 6 | ~$0.05-0.10 |
| Revision comparison | 2 | ~$0.02-0.05 |

For a 50-page drawing set:
- Initial processing: ~$1-2
- Visual search (10 patterns): ~$1-2
- Total per project: ~$2-5

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Sheet extraction accuracy | >95% metadata fields correct |
| Callout linking accuracy | >90% correctly linked |
| Visual search precision | >85% true positives |
| Processing time (50 pages) | <5 minutes |
| User adoption | 80% of users upload drawings within 30 days |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI extraction errors | Human review/correction UI, confidence thresholds |
| Large PDF processing time | Background processing, progress indicators |
| API costs spike | Usage monitoring, rate limiting, caching |
| Offline sync complexity | Progressive download, prioritize recent sheets |
| False positives in visual search | Review workflow, adjustable tolerance |

---

## Open Questions for Implementation

1. **Storage limits**: How much storage per project for high-res sheet images?
2. **Concurrent processing**: How many sheets to process in parallel?
3. **Caching strategy**: How long to cache pattern search results?
4. **Mobile experience**: Touch-optimized lasso selection?
5. **Revision workflow**: Auto-process new PDFs or require user action?

---

## Appendix: Sample AI Prompts

### Sheet Metadata Extraction
```
Analyze this construction drawing sheet image. Extract the following information from the title block and sheet content:

1. Sheet Number: The alphanumeric identifier (e.g., A2.1, S-101, M-001)
2. Sheet Title: The descriptive name of the sheet
3. Discipline: One of [Architectural, Structural, Mechanical, Electrical, Plumbing, Civil, Landscape, Fire Protection, Other]
4. Scale: The drawing scale (e.g., "1/4\" = 1'-0\"", "1:100", "NTS")
5. Revision: Current revision number or letter
6. Revision Date: Date of current revision
7. Detail Callouts: List all references to other sheets (e.g., "SEE DETAIL 3/A5.1", "SECTION A-A, SEE S-201")

Return as JSON:
{
  "sheet_number": string,
  "title": string,
  "discipline": string,
  "scale": string | null,
  "revision": string | null,
  "revision_date": string | null,
  "callouts": [
    {
      "text": string,
      "type": "detail" | "section" | "elevation" | "reference",
      "target_sheet": string | null
    }
  ],
  "confidence": number (0-1)
}
```

### Pattern Description
```
Describe this construction drawing symbol/element precisely for matching purposes.

Include:
- Overall shape (circle, rectangle, triangle, irregular)
- Any internal elements (lines, text, numbers)
- Approximate proportions
- Common construction meaning if recognizable

Keep description concise (2-3 sentences) but specific enough to identify similar symbols.
```

### Pattern Matching
```
Search this construction drawing sheet for all instances matching this element:

Element description: {description}

For each match found, return:
- bounding_box: {x, y, width, height} as percentages of image dimensions (0-100)
- confidence: 0.0-1.0 indicating match certainty

Return JSON array:
[
  {
    "bounding_box": {"x": number, "y": number, "width": number, "height": number},
    "confidence": number
  }
]

If no matches found, return empty array: []
```

---

*Document generated from brainstorming session on 2026-01-18*
