# RFI Components Usage Examples

This document provides usage examples for the RFI workflow components.

## Component Overview

### 1. RFIStatusBadge
Displays RFI status with color-coded badges.

```tsx
import { RFIStatusBadge } from '@/features/rfis/components'

// Basic usage
<RFIStatusBadge status="submitted" />

// With custom className
<RFIStatusBadge status="approved" className="ml-2" />

// All available statuses
<RFIStatusBadge status="pending" />
<RFIStatusBadge status="submitted" />
<RFIStatusBadge status="approved" />
<RFIStatusBadge status="rejected" />
<RFIStatusBadge status="closed" />
```

### 2. RFIPriorityBadge
Displays RFI priority level with color-coded badges.

```tsx
import { RFIPriorityBadge } from '@/features/rfis/components'

// Basic usage
<RFIPriorityBadge priority="normal" />

// With custom className
<RFIPriorityBadge priority="high" className="ml-2" />

// All available priorities
<RFIPriorityBadge priority="low" />
<RFIPriorityBadge priority="normal" />
<RFIPriorityBadge priority="high" />
```

### 3. RFIForm
Form for creating or editing RFI workflow items.

```tsx
import { RFIForm } from '@/features/rfis/components'
import type { RFIFormData } from '@/features/rfis/components'
import { useNavigate } from 'react-router-dom'

// Create mode
function CreateRFIPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: RFIFormData) => {
    setIsLoading(true)
    try {
      // Your API call here
      await createRFI(data)
      navigate('/rfis')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <RFIForm
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onCancel={() => navigate('/rfis')}
    />
  )
}

// Edit mode
function EditRFIPage({ rfiId }: { rfiId: string }) {
  const navigate = useNavigate()
  const { data: rfi } = useRFI(rfiId)
  const { mutateAsync: updateRFI, isPending } = useUpdateRFI()

  const handleSubmit = async (data: RFIFormData) => {
    await updateRFI({ id: rfiId, ...data })
    navigate(`/rfis/${rfiId}`)
  }

  if (!rfi) return <div>Loading...</div>

  return (
    <RFIForm
      initialData={rfi}
      onSubmit={handleSubmit}
      isLoading={isPending}
      onCancel={() => navigate(`/rfis/${rfiId}`)}
    />
  )
}
```

### 4. RFICommentThread
Displays comments and allows adding new comments with @mention support.

```tsx
import { RFICommentThread } from '@/features/rfis/components'
import { useRFIComments, useAddRFIComment } from '@/features/rfis/hooks'
import { useAuth } from '@/lib/auth/AuthContext'

function RFIDetailPage({ rfiId }: { rfiId: string }) {
  const { userProfile } = useAuth()
  const { data: comments = [], isLoading } = useRFIComments(rfiId)
  const { mutateAsync: addComment, isPending } = useAddRFIComment()

  const handleAddComment = async (comment: string) => {
    await addComment({ rfiId, comment })
  }

  return (
    <RFICommentThread
      rfiId={rfiId}
      comments={comments}
      isLoadingComments={isLoading}
      isAddingComment={isPending}
      onAddComment={handleAddComment}
      userProfile={userProfile}
    />
  )
}
```

### 5. RFIList
Table list of RFIs with filtering capabilities.

```tsx
import { RFIList } from '@/features/rfis/components'
import { useRFIs } from '@/features/rfis/hooks'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

function RFIsPage({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<{ status?: string; priority?: string }>({})

  const { data: rfis = [], isLoading } = useRFIs(projectId)

  const handleSelectRFI = (rfi: WorkflowItem) => {
    navigate(`/rfis/${rfi.id}`)
  }

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex gap-4">
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filters.priority || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* RFI List */}
      <RFIList
        rfis={rfis}
        isLoading={isLoading}
        onSelectRFI={handleSelectRFI}
        filters={filters}
      />
    </div>
  )
}
```

## Complete Example: RFI Detail Page

Here's a complete example combining multiple components:

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RFIStatusBadge,
  RFIPriorityBadge,
  RFICommentThread
} from '@/features/rfis/components'
import { useRFI, useRFIComments, useAddRFIComment } from '@/features/rfis/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export function RFIDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const { data: rfi, isLoading } = useRFI(id!)
  const { data: comments = [], isLoading: isLoadingComments } = useRFIComments(id!)
  const { mutateAsync: addComment, isPending: isAddingComment } = useAddRFIComment()

  const handleAddComment = async (comment: string) => {
    await addComment({ rfiId: id!, comment })
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!rfi) {
    return <div>RFI not found</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{rfi.title}</h1>
          <p className="text-gray-500 mt-1">RFI #{rfi.number}</p>
        </div>
        <Button onClick={() => navigate(`/rfis/${id}/edit`)}>
          Edit RFI
        </Button>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <RFIStatusBadge status={rfi.status as any} className="mt-1" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <RFIPriorityBadge priority={rfi.priority} className="mt-1" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Discipline</p>
              <p className="font-medium">{rfi.discipline || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium">
                {rfi.due_date ? format(new Date(rfi.due_date), 'MMM d, yyyy') : '-'}
              </p>
            </div>
          </div>

          {rfi.description && (
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="mt-1">{rfi.description}</p>
            </div>
          )}

          {rfi.more_information && (
            <div>
              <p className="text-sm text-gray-500">More Information</p>
              <p className="mt-1">{rfi.more_information}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <RFICommentThread
        rfiId={id!}
        comments={comments}
        isLoadingComments={isLoadingComments}
        isAddingComment={isAddingComment}
        onAddComment={handleAddComment}
        userProfile={userProfile}
      />
    </div>
  )
}
```

## Accessibility Checklist

All components follow these accessibility guidelines:

- [ ] Semantic HTML elements
- [ ] Proper ARIA labels and roles
- [ ] Keyboard navigation support
- [ ] Color is not the only indicator (text labels included)
- [ ] High contrast ratios for readability
- [ ] Form validation with clear error messages
- [ ] Loading states with appropriate indicators
- [ ] Focus management for interactive elements

## Performance Considerations

1. **RFIList**: Use virtual scrolling for 100+ items
2. **RFICommentThread**: Implement pagination for long threads
3. **RFIForm**: Debounce validation for large forms
4. **Badge components**: Already optimized (inline, no state)

## TypeScript Types

All components export their prop types for reuse:

```tsx
import type {
  RFIStatus,
  RFIStatusBadgeProps,
  RFIPriority,
  RFIPriorityBadgeProps,
  RFIFormData,
  RFIFormProps,
  RFICommentThreadProps,
  RFIListProps,
} from '@/features/rfis/components'
```
