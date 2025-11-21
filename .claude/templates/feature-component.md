# Feature Component Template

Use this template when creating list/detail components for construction features.

## List Page Template

```typescript
// src/pages/{feature-name}/{FeatureName}ListPage.tsx
import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { use{FeatureName}s } from '@/features/{feature-name}/hooks/use{FeatureName}'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { {FeatureName}Table } from '@/features/{feature-name}/components/{FeatureName}Table'
import { Create{FeatureName}Dialog } from '@/features/{feature-name}/components/Create{FeatureName}Dialog'

export function {FeatureName}ListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // TODO: Add project filter from route params or context
  const { data: items, isLoading, error } = use{FeatureName}s()

  const filteredItems = items?.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{FeatureName}s</h1>
          <p className="text-muted-foreground">
            Manage project {feature-name}s
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New {FeatureName}
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search {feature-name}s..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Content */}
      <Card>
        {isLoading && (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading {feature-name}s...</p>
          </div>
        )}

        {error && (
          <div className="p-12 text-center">
            <p className="text-destructive">Error loading {feature-name}s</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && filteredItems?.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No {feature-name}s found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create your first {feature-name}
            </Button>
          </div>
        )}

        {!isLoading && !error && filteredItems && filteredItems.length > 0 && (
          <{FeatureName}Table items={filteredItems} />
        )}
      </Card>

      {/* Create Dialog */}
      <Create{FeatureName}Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  )
}
```

## Table Component Template

```typescript
// src/features/{feature-name}/components/{FeatureName}Table.tsx
import { useState } from 'react'
import { MoreVertical, Eye, Edit, Trash } from 'lucide-react'
import { format } from 'date-fns'
import { useDelete{FeatureName} } from '@/features/{feature-name}/hooks/use{FeatureName}'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { {FeatureName} } from '@/types/database'

interface {FeatureName}TableProps {
  items: {FeatureName}[]
}

export function {FeatureName}Table({ items }: {FeatureName}TableProps) {
  const deleteMutation = useDelete{FeatureName}()
  const [deletingId, setDeletingId] = useState<string>()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this {feature-name}?')) return

    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } finally {
      setDeletingId(undefined)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{item.status}</Badge>
            </TableCell>
            <TableCell>
              {format(new Date(item.created_at), 'MMM d, yyyy')}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

## Create Dialog Template

```typescript
// src/features/{feature-name}/components/Create{FeatureName}Dialog.tsx
import { useState } from 'react'
import { useCreate{FeatureName} } from '@/features/{feature-name}/hooks/use{FeatureName}'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Create{FeatureName}DialogProps {
  open: boolean
  onClose: () => void
}

export function Create{FeatureName}Dialog({ open, onClose }: Create{FeatureName}DialogProps) {
  const createMutation = useCreate{FeatureName}()
  const [formData, setFormData] = useState({
    name: '',
    // Add other fields
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createMutation.mutateAsync(formData)
      onClose()
      setFormData({ name: '' }) // Reset form
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {FeatureName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </div>
            {/* Add more fields */}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

## Replacements Needed

When using this template, replace:
- `{feature-name}` → kebab-case (e.g., 'daily-report', 'rfi')
- `{FeatureName}` → PascalCase (e.g., 'DailyReport', 'RFI')
- Add feature-specific fields to forms and table columns
