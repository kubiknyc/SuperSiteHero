# Document Components Usage Examples

This document provides examples of how to use the 4 new document management components.

## Components Overview

1. **DocumentUpload** - File upload with drag-drop
2. **DocumentStatusBadge** - Colored badge for document status
3. **DocumentTypeIcon** - Icon for document type
4. **DocumentList** - Table list of documents

---

## 1. DocumentUpload

Upload documents with drag-and-drop support.

### Basic Usage

```tsx
import { DocumentUpload } from '@/features/documents/components'

function DocumentsPage() {
  const projectId = 'abc123'
  const folderId = null // or a folder ID

  const handleUploadSuccess = (document) => {
    console.log('Document uploaded:', document)
    // Refresh document list, show success message, etc.
  }

  return (
    <DocumentUpload
      projectId={projectId}
      folderId={folderId}
      onUploadSuccess={handleUploadSuccess}
    />
  )
}
```

### Features
- Drag and drop files onto the upload zone
- Click to browse files
- Shows file name and size after selection
- Document type dropdown (drawing, specification, etc.)
- Upload and Cancel buttons
- Loading indicator during upload
- Automatic toast notifications via hook

---

## 2. DocumentStatusBadge

Display colored badges for document status.

### Basic Usage

```tsx
import { DocumentStatusBadge } from '@/features/documents/components'

function DocumentCard({ document }) {
  return (
    <div>
      <h3>{document.name}</h3>
      <DocumentStatusBadge status={document.status} />
    </div>
  )
}
```

### Status Colors
- **current**: Green (document is active)
- **superseded**: Amber/Yellow (replaced by newer version)
- **archived**: Gray (no longer in use)
- **void**: Red (invalid/cancelled)

### With Custom Styling

```tsx
<DocumentStatusBadge
  status="current"
  className="text-xs"
/>
```

---

## 3. DocumentTypeIcon

Display icons for different document types.

### Basic Usage

```tsx
import { DocumentTypeIcon } from '@/features/documents/components'

function DocumentItem({ document }) {
  return (
    <div className="flex items-center space-x-2">
      <DocumentTypeIcon type={document.document_type} />
      <span>{document.name}</span>
    </div>
  )
}
```

### Icon Mapping
- **drawing**: FileText icon
- **specification**: FileText icon
- **submittal**: Send icon
- **shop_drawing**: FileText icon
- **scope**: Copy icon
- **general**: File icon
- **photo**: Image icon
- **other**: File icon

### Custom Size/Color

```tsx
<DocumentTypeIcon
  type="photo"
  className="w-8 h-8 text-blue-500"
/>
```

---

## 4. DocumentList

Display documents in a table with actions.

### Basic Usage

```tsx
import { DocumentList } from '@/features/documents/components'
import { useDocuments } from '@/features/documents/hooks/useDocuments'

function DocumentsPage({ projectId }) {
  const { data: documents, isLoading } = useDocuments(projectId)

  const handleView = (doc) => {
    window.open(doc.file_url, '_blank')
  }

  const handleEdit = (doc) => {
    // Open edit dialog
    console.log('Edit:', doc)
  }

  const handleDelete = (doc) => {
    if (confirm(`Delete ${doc.name}?`)) {
      // Call delete mutation
      console.log('Delete:', doc)
    }
  }

  return (
    <DocumentList
      documents={documents || []}
      isLoading={isLoading}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  )
}
```

### Features
- Sortable table columns
- Document type icons
- Status badges with colors
- Human-readable file sizes (KB, MB)
- Formatted dates (MMM d, yyyy)
- Action buttons: View, Edit, Delete
- Loading state with spinner
- Empty state message
- Responsive with horizontal scroll

---

## Complete Example: Full Document Management Page

```tsx
import { useState } from 'react'
import {
  DocumentUpload,
  DocumentList,
  DocumentStatusBadge,
  DocumentTypeIcon,
} from '@/features/documents/components'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useDeleteDocumentWithNotification } from '@/features/documents/hooks/useDocumentsMutations'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

export function DocumentManagementPage({ projectId }) {
  const [showUpload, setShowUpload] = useState(false)
  const { data: documents, isLoading } = useDocuments(projectId)
  const deleteDocument = useDeleteDocumentWithNotification()

  const handleUploadSuccess = (document) => {
    console.log('Upload successful:', document)
    setShowUpload(false)
    // Documents list will automatically refresh via React Query
  }

  const handleView = (doc) => {
    window.open(doc.file_url, '_blank')
  }

  const handleEdit = (doc) => {
    // TODO: Open edit dialog
    console.log('Edit document:', doc)
  }

  const handleDelete = async (doc) => {
    if (window.confirm(`Delete "${doc.name}"?`)) {
      await deleteDocument.mutateAsync(doc.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Hide Upload' : 'Upload Document'}
        </Button>
      </div>

      {/* Upload section */}
      {showUpload && (
        <DocumentUpload
          projectId={projectId}
          folderId={null}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* Documents list */}
      <DocumentList
        documents={documents || []}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
```

---

## Component Props Reference

### DocumentUpload Props

```typescript
interface DocumentUploadProps {
  projectId: string              // Required: Project to upload to
  folderId: string | null        // Optional: Folder within project
  onUploadSuccess: (document: Document) => void  // Callback on success
}
```

### DocumentStatusBadge Props

```typescript
interface DocumentStatusBadgeProps {
  status: DocumentStatus         // 'current' | 'superseded' | 'archived' | 'void'
  className?: string             // Optional: Additional CSS classes
}
```

### DocumentTypeIcon Props

```typescript
interface DocumentTypeIconProps {
  type: DocumentType             // Document type enum
  className?: string             // Optional: Size and color classes
}
```

### DocumentList Props

```typescript
interface DocumentListProps {
  documents: Document[]          // Array of documents to display
  isLoading: boolean             // Loading state
  onView: (doc: Document) => void    // View/download handler
  onEdit: (doc: Document) => void    // Edit handler
  onDelete: (doc: Document) => void  // Delete handler
}
```

---

## Accessibility Features

All components include proper accessibility features:

- **DocumentUpload**: ARIA labels, keyboard navigation, focus management
- **DocumentStatusBadge**: Semantic HTML with proper color contrast
- **DocumentTypeIcon**: Descriptive icon with proper size for visibility
- **DocumentList**: Semantic table structure, ARIA labels on action buttons

---

## Performance Considerations

- **DocumentList**: Uses React Query for caching and automatic refetching
- **DocumentUpload**: Shows loading state during upload, prevents duplicate submissions
- **File size formatting**: Optimized for performance with simple calculations
- **Date formatting**: Uses date-fns for efficient date parsing

---

## Testing

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { DocumentStatusBadge } from './DocumentStatusBadge'

describe('DocumentStatusBadge', () => {
  it('renders current status with green styling', () => {
    render(<DocumentStatusBadge status="current" />)
    const badge = screen.getByText('Current')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders void status with red styling', () => {
    render(<DocumentStatusBadge status="void" />)
    const badge = screen.getByText('Void')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })
})
```

---

## File Locations

All components are located in:
```
src/features/documents/components/
├── DocumentUpload.tsx
├── DocumentStatusBadge.tsx
├── DocumentTypeIcon.tsx
├── DocumentList.tsx
└── index.ts (exports all components)
```

Import from the index:
```typescript
import {
  DocumentUpload,
  DocumentStatusBadge,
  DocumentTypeIcon,
  DocumentList,
} from '@/features/documents/components'
```
