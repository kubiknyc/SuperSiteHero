# DrawingIndexPanel Component

A collapsible sidebar panel for quick sheet navigation in construction drawing sets. Automatically groups drawings by discipline and provides search/filter functionality.

## Features

- **Automatic Discipline Grouping**: Groups sheets by prefix (A=Architectural, S=Structural, M=Mechanical, etc.)
- **Collapsible Groups**: Click discipline headers to expand/collapse sections
- **Search/Filter**: Real-time search by sheet number or title
- **Current Sheet Highlight**: Visual indicator showing which sheet is currently active
- **Sheet Count Badges**: Display count of sheets per discipline
- **Click to Navigate**: Navigate to any sheet with a single click
- **Responsive Design**:
  - Desktop: Fixed sidebar panel
  - Mobile: Slide-out panel with backdrop overlay
- **Smart Sheet Parsing**: Automatically extracts sheet numbers, titles, and disciplines from filenames

## Installation

The component is already exported from the documents feature:

```typescript
import { DrawingIndexPanel } from '@/features/documents/components'
```

## Props

```typescript
interface DrawingIndexPanelProps {
  // Array of document objects (drawings in the set)
  documents: Document[]

  // ID of currently viewed document (for highlighting)
  currentDocumentId?: string

  // Current page number (reserved for future multi-page navigation)
  currentPage?: number

  // Callback when user navigates to a different sheet
  onNavigate: (documentId: string, pageNumber?: number) => void

  // Whether the panel is open/visible
  isOpen: boolean

  // Callback when user closes the panel
  onClose: () => void
}
```

## Usage

### Basic Usage

```typescript
import { useState } from 'react'
import { DrawingIndexPanel } from '@/features/documents/components'
import type { Document } from '@/types/database'

function DrawingViewer({ documents }: { documents: Document[] }) {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [currentDocId, setCurrentDocId] = useState<string>()

  return (
    <div className="flex">
      {/* Your document viewer */}
      <div className="flex-1">
        {/* Viewer content */}
      </div>

      {/* Index Panel */}
      <DrawingIndexPanel
        documents={documents}
        currentDocumentId={currentDocId}
        onNavigate={(docId) => setCurrentDocId(docId)}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}
```

### With Page Navigation

```typescript
function DrawingViewerWithPages({ documents }: { documents: Document[] }) {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [currentDoc, setCurrentDoc] = useState<string>()
  const [currentPage, setCurrentPage] = useState(1)

  const handleNavigate = (documentId: string, pageNumber?: number) => {
    setCurrentDoc(documentId)
    if (pageNumber !== undefined) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <DrawingIndexPanel
      documents={documents}
      currentDocumentId={currentDoc}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
    />
  )
}
```

### Mobile-Responsive Pattern

```typescript
function MobileDrawingViewer({ documents }: { documents: Document[] }) {
  const [isIndexOpen, setIsIndexOpen] = useState(false)

  return (
    <div className="h-screen flex flex-col">
      {/* Header with toggle button (mobile only) */}
      <header className="p-4 border-b md:hidden">
        <Button onClick={() => setIsIndexOpen(true)}>
          <List className="h-4 w-4 mr-2" />
          Show Index
        </Button>
      </header>

      {/* Viewer content */}
      <main className="flex-1">
        {/* Your viewer */}
      </main>

      {/* Index panel - auto-closes on mobile after navigation */}
      <DrawingIndexPanel
        documents={documents}
        onNavigate={(docId) => {
          console.log('Navigate to:', docId)
          // Panel closes automatically on mobile
        }}
        isOpen={isIndexOpen}
        onClose={() => setIsIndexOpen(false)}
      />
    </div>
  )
}
```

## Discipline Mapping

The component automatically recognizes the following sheet prefixes:

| Prefix | Discipline | Badge Color |
|--------|------------|-------------|
| A | Architectural | Blue |
| S | Structural | Green |
| M | Mechanical | Orange |
| E | Electrical | Yellow |
| P | Plumbing | Purple |
| FP | Fire Protection | Red |
| C | Civil | Teal |
| L | Landscape | Emerald |
| G | General | Gray |

Any sheets that don't match a known prefix are assigned to "General" (G).

## Sheet Filename Parsing

The component intelligently parses sheet information from filenames:

### Supported Formats

```
A-001 Cover Sheet.pdf → Sheet: A-001, Title: Cover Sheet
S100 Foundation Plan.pdf → Sheet: S100, Title: Foundation Plan
M-250-HVAC-Layout.pdf → Sheet: M-250, Title: HVAC-Layout
```

### Parsing Rules

1. **Sheet Number**: Extracts prefix + number pattern (e.g., "A-001", "S100")
2. **Discipline**: Uses first 1-2 letters before numbers
3. **Title**: Everything after the sheet number

## Styling

The component uses Tailwind CSS and follows the app's design system:

- **Colors**: Adapts to light/dark theme automatically
- **Typography**: Uses system font stack
- **Spacing**: 4px grid system
- **Borders**: Consistent with app border styles
- **Shadows**: Subtle elevation on panel

### Custom Styling

You can customize the panel's appearance by wrapping it in a styled container:

```typescript
<div className="custom-panel-wrapper">
  <DrawingIndexPanel {...props} />
</div>
```

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **ARIA Labels**: Proper labels for screen readers
- **Focus Management**: Clear focus indicators
- **Semantic HTML**: Uses semantic elements (header, nav, buttons)
- **Color Contrast**: WCAG AA compliant

## Responsive Behavior

### Desktop (≥768px)
- Fixed sidebar (320px width)
- Always visible when `isOpen={true}`
- No backdrop overlay
- Remains open after navigation

### Mobile (<768px)
- Slide-out panel from right
- Full-screen backdrop overlay
- Auto-closes after navigation
- Smooth slide animations

## Performance

- **Efficient Rendering**: Uses `useMemo` for expensive computations
- **Lazy Grouping**: Documents grouped only when search/filter changes
- **Optimized Sorting**: Numeric sorting for proper sheet order
- **Minimal Re-renders**: Optimized state management

## Best Practices

### 1. Filter Drawing Documents

Only pass drawing documents to the panel:

```typescript
const drawingDocs = documents.filter(doc =>
  doc.document_type === 'drawing' ||
  doc.file_name?.match(/\.(pdf|dwg|dxf)$/i)
)

<DrawingIndexPanel documents={drawingDocs} {...props} />
```

### 2. Maintain Panel State

Keep panel state at a higher level for persistence:

```typescript
function DrawingSet() {
  const [isPanelOpen, setIsPanelOpen] = useState(
    localStorage.getItem('drawing-index-open') === 'true'
  )

  useEffect(() => {
    localStorage.setItem('drawing-index-open', String(isPanelOpen))
  }, [isPanelOpen])

  // ...
}
```

### 3. Handle Missing Documents

Provide fallback for empty document sets:

```typescript
{documents.length === 0 ? (
  <EmptyState message="No drawings in this set" />
) : (
  <DrawingIndexPanel documents={documents} {...props} />
)}
```

## Integration Examples

### With PDF Viewer

```typescript
import { PDFViewer, DrawingIndexPanel } from '@/features/documents/components'

function PDFDrawingViewer({ projectId }: { projectId: string }) {
  const { data: documents } = useDocuments({ projectId, type: 'drawing' })
  const [currentDocId, setCurrentDocId] = useState<string>()
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const currentDoc = documents?.find(d => d.id === currentDocId)

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        {currentDoc && (
          <PDFViewer
            documentId={currentDoc.id}
            projectId={projectId}
            fileUrl={currentDoc.file_url}
            fileName={currentDoc.file_name}
          />
        )}
      </div>

      <DrawingIndexPanel
        documents={documents || []}
        currentDocumentId={currentDocId}
        onNavigate={setCurrentDocId}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}
```

### With Drawing Set Hook

```typescript
import { useDrawingSetManagement } from '@/features/documents/hooks'

function DrawingSetViewer({ projectId }: { projectId: string }) {
  const { drawingSet, navigate } = useDrawingSetManagement(projectId)
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <DrawingIndexPanel
      documents={drawingSet.documents}
      currentDocumentId={drawingSet.currentDocumentId}
      onNavigate={(docId) => navigate(docId)}
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
    />
  )
}
```

## Troubleshooting

### Issue: Sheets not grouping correctly

**Solution**: Ensure filenames follow standard naming conventions (e.g., "A-001 Title.pdf")

### Issue: Panel not closing on mobile

**Solution**: Verify `onClose` callback is properly connected to state

### Issue: Current sheet not highlighting

**Solution**: Ensure `currentDocumentId` matches the document's `id` property exactly

### Issue: Search not working

**Solution**: Check that documents have `file_name` or `name` properties

## Future Enhancements

Potential improvements for future versions:

- [ ] Multi-page sheet navigation within single PDFs
- [ ] Recent sheets history
- [ ] Favorite/bookmark sheets
- [ ] Bulk selection for batch operations
- [ ] Export sheet index to CSV/PDF
- [ ] Custom discipline color configuration
- [ ] Sheet thumbnail previews
- [ ] Revision indicator badges
- [ ] Cross-reference visualization

## Related Components

- `PDFViewer` - PDF document viewer with markup support
- `ImageViewer` - Image document viewer
- `SheetHyperlinkManager` - Manage cross-references between sheets
- `BookmarkManager` - Save and navigate to specific drawing views
- `DrawingRegister` - Master drawing list with revision tracking

## TypeScript Types

```typescript
// Document type (from database)
interface Document {
  id: string
  file_name?: string
  name?: string
  document_type?: string
  file_url?: string
  // ... other properties
}

// Internal grouping structure
interface GroupedDocuments {
  discipline: string
  disciplineName: string
  disciplineColor: string
  documents: Array<{
    id: string
    sheetNumber: string
    sheetTitle: string
    fileName: string
  }>
}
```

## License

Part of the SuperSiteHero construction management platform.
