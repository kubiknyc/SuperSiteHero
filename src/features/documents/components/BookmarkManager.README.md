# BookmarkManager Component

A comprehensive bookmark management system for saving and navigating to specific drawing locations in construction document management.

## Features

### Core Functionality
- Save current drawing view (page, zoom level, pan position)
- Quick navigation to saved bookmarks
- Organize bookmarks into folders
- Share bookmarks with team members
- Edit and delete bookmarks

### User Interface
- **Dropdown Variant**: Compact dropdown for toolbar integration
- **Panel Variant**: Full panel view for sidebar integration
- Grouped display by folders
- Visual indicators for shared bookmarks
- Edit/delete actions on hover

## Installation

### 1. Database Migration

Apply the migration to create the `drawing_bookmarks` table:

```bash
# Run the migration
npx supabase migration up 169_drawing_bookmarks.sql
```

Migration creates:
- `drawing_bookmarks` table with RLS policies
- Indexes for optimal query performance
- Automatic `updated_at` trigger

### 2. Component Import

```typescript
import { BookmarkManager } from '@/features/documents/components'
import type { Viewport } from '@/features/documents/components'
```

## Usage

### Basic Implementation (Dropdown Variant)

```typescript
import { useState } from 'react'
import { BookmarkManager } from '@/features/documents/components'
import type { Viewport } from '@/features/documents/components'

function DrawingViewer() {
  const [currentPage, setCurrentPage] = useState(1)
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1
  })

  const handleNavigate = (
    documentId: string,
    page: number,
    newViewport?: Viewport
  ) => {
    setCurrentPage(page)
    if (newViewport) {
      setViewport(newViewport)
    }
  }

  return (
    <div className="drawing-viewer">
      {/* Toolbar */}
      <div className="toolbar">
        <BookmarkManager
          projectId={projectId}
          documentId={documentId}
          currentPage={currentPage}
          currentViewport={viewport}
          onNavigate={handleNavigate}
          variant="dropdown"
        />
      </div>

      {/* Drawing viewer content */}
    </div>
  )
}
```

### Panel Variant (Sidebar)

```typescript
<BookmarkManager
  projectId={projectId}
  documentId={documentId}
  currentPage={currentPage}
  currentViewport={viewport}
  onNavigate={handleNavigate}
  variant="panel"
/>
```

### Integration with PDFViewer

```typescript
import { PDFViewer, BookmarkManager } from '@/features/documents/components'
import type { Viewport } from '@/features/documents/components'

function DrawingPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1
  })

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar with bookmark manager */}
      <div className="toolbar flex items-center gap-2 p-2 bg-surface border-b">
        <BookmarkManager
          projectId={projectId}
          documentId={documentId}
          currentPage={currentPage}
          currentViewport={viewport}
          onNavigate={(docId, page, vp) => {
            setCurrentPage(page)
            if (vp) setViewport(vp)
          }}
          variant="dropdown"
        />
      </div>

      {/* PDF Viewer */}
      <PDFViewer
        documentId={documentId}
        projectId={projectId}
        fileUrl={fileUrl}
        pageNumber={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
```

## Props

```typescript
interface BookmarkManagerProps {
  // Required
  projectId: string          // Current project ID
  documentId: string         // Current document ID
  currentPage: number        // Current page number
  currentViewport: Viewport  // Current viewport state
  onNavigate: (              // Navigation callback
    documentId: string,
    page: number,
    viewport?: Viewport
  ) => void

  // Optional
  variant?: 'dropdown' | 'panel'  // UI variant (default: 'dropdown')
}

interface Viewport {
  x: number      // Pan X position
  y: number      // Pan Y position
  zoom: number   // Zoom level (1.0 = 100%)
}
```

## Database Schema

### Table: `drawing_bookmarks`

```sql
Column         | Type      | Description
---------------|-----------|----------------------------------
id             | UUID      | Primary key
project_id     | UUID      | Reference to projects table
user_id        | UUID      | Reference to auth.users
document_id    | UUID      | Reference to documents table
page_number    | INTEGER   | Page number (1-indexed)
viewport       | JSONB     | {x, y, zoom}
name           | TEXT      | Bookmark display name
folder         | TEXT      | Optional folder for organization
shared         | BOOLEAN   | Visible to team members
created_at     | TIMESTAMP | Creation timestamp
updated_at     | TIMESTAMP | Last update timestamp
```

### Row Level Security (RLS)

The table implements comprehensive RLS policies:

1. **View**: Users can see their own bookmarks + shared bookmarks in their projects
2. **Insert**: Users can create bookmarks in projects they're members of
3. **Update**: Users can only update their own bookmarks
4. **Delete**: Users can only delete their own bookmarks

## Features in Detail

### Bookmark Organization

**Folders**
- Bookmarks can be organized into folders
- Folders are displayed as collapsible groups
- No folder = displayed in default group

**Sorting**
- Bookmarks sorted alphabetically within folders
- Folders sorted alphabetically

### Sharing

**Personal Bookmarks** (default)
- Visible only to creator
- Indicated by unfilled star icon

**Shared Bookmarks**
- Visible to all project team members
- Indicated by filled yellow star icon
- Share toggle in add/edit dialog

### Navigation

When clicking a bookmark:
1. Document switches to bookmarked page
2. Viewport restores to saved position and zoom
3. Success toast notification shown

### Edit/Delete Actions

**Edit**
- Update bookmark name
- Change folder
- Toggle shared status
- Cannot change page/viewport (create new bookmark instead)

**Delete**
- Confirmation dialog prevents accidental deletion
- Permanent action - cannot be undone

## Styling

The component uses the application's design system:
- Dark theme optimized
- Responsive layout
- Hover effects for better UX
- Icon integration with lucide-react

### Custom Styling

Override styles using className utilities:

```typescript
// The component uses these main classes
.bg-surface       // Background color
.border-gray-700  // Border colors
.text-gray-200    // Text colors
.hover:bg-gray-700 // Hover states
```

## Performance Considerations

### Optimizations
- React Query for efficient data fetching and caching
- Automatic cache invalidation on mutations
- Memoized bookmark grouping
- Optimistic UI updates

### Query Keys
```typescript
['drawing_bookmarks', projectId, documentId]
```

### Database Indexes
- `project_id` - Fast project-scoped queries
- `user_id` - Fast user bookmark lookup
- `document_id` - Fast document bookmark lookup
- `folder` - Fast folder-based grouping
- `shared` - Fast shared bookmark queries

## Error Handling

The component handles:
- Network errors (with toast notifications)
- Authentication errors
- Validation errors (empty names, etc.)
- Concurrent update conflicts

## Accessibility

- Keyboard navigation supported
- ARIA labels on interactive elements
- Focus management in dialogs
- Screen reader friendly

## Testing

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { BookmarkManager } from './BookmarkManager'

test('renders bookmark dropdown', () => {
  render(
    <BookmarkManager
      projectId="test-project"
      documentId="test-doc"
      currentPage={1}
      currentViewport={{ x: 0, y: 0, zoom: 1 }}
      onNavigate={jest.fn()}
    />
  )

  expect(screen.getByText('Bookmarks')).toBeInTheDocument()
})
```

### Integration Tests
- Test bookmark creation flow
- Test navigation to bookmarks
- Test folder organization
- Test sharing functionality

## Migration Guide

### From Manual Bookmark System

If you have an existing bookmark system:

1. Export existing bookmarks to JSON
2. Transform to new schema:
```typescript
{
  project_id: bookmark.projectId,
  document_id: bookmark.documentId,
  page_number: bookmark.page,
  viewport: {
    x: bookmark.x || 0,
    y: bookmark.y || 0,
    zoom: bookmark.zoom || 1
  },
  name: bookmark.name,
  folder: bookmark.category || null,
  shared: bookmark.isPublic || false
}
```
3. Bulk insert into `drawing_bookmarks` table

## Troubleshooting

### Bookmarks Not Appearing
- Check RLS policies are enabled
- Verify user is project member
- Check browser console for errors

### Navigation Not Working
- Verify `onNavigate` callback is properly wired
- Check viewport format matches spec
- Ensure page numbers are 1-indexed

### Performance Issues
- Check indexes are created
- Verify query keys are stable
- Monitor React Query DevTools

## Future Enhancements

Potential improvements:
- [ ] Bookmark categories/tags
- [ ] Quick bookmark creation keyboard shortcut
- [ ] Export/import bookmarks
- [ ] Bookmark thumbnails
- [ ] Recently used bookmarks
- [ ] Bookmark search/filter
- [ ] Bulk operations (delete multiple)

## Related Components

- `PDFViewer` - PDF document viewer
- `ImageViewer` - Image document viewer
- `DrawingPinOverlay` - RFI/Submittal pins
- `MarkupManager` - Drawing annotations

## License

Part of the SuperSiteHero construction management platform.
