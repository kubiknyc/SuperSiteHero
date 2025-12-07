# UI Component Generator Agent

**Purpose**: Generate consistent, accessible, and well-styled UI components following the shadcn/ui pattern for the construction management platform.

**When to Use**: When creating new UI components, forms, layouts, or interactive elements.

## Component Design System

### Design Tokens (via Tailwind)

```css
/* Colors */
--primary: Construction orange/blue
--secondary: Neutral gray
--success: Green (for approvals, completed items)
--warning: Yellow (for pending items)
--destructive: Red (for rejections, errors)
--muted: Light gray (for backgrounds)

/* Spacing */
--spacing-unit: 4px (base unit for 4px grid system)

/* Typography */
--font-sans: Inter, system-ui
--font-mono: 'Fira Code', monospace
```

### Component Patterns

All components should follow these patterns:

1. **TypeScript**: Full type safety with proper interfaces
2. **Accessibility**: ARIA labels, keyboard navigation, focus management
3. **Responsive**: Mobile-first, adapts to screen sizes
4. **Composable**: Can be combined with other components
5. **Consistent**: Uses design tokens and utility classes

## Form Component Template

```typescript
// src/components/ui/form-field.tsx
import { forwardRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input, InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface FormFieldProps extends InputProps {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required, className, ...props }, ref) => {
    const id = props.id || `field-${label.toLowerCase().replace(/\s/g, '-')}`

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>

        <Input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(error && 'border-destructive', className)}
          {...props}
        />

        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${id}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'
```

## Data Table Template

```typescript
// src/components/ui/data-table.tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && (
                          <ChevronUp className="h-4 w-4" />
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

## Status Badge Component

```typescript
// src/components/ui/status-badge.tsx
import { Badge, BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const statusVariants = cva('', {
  variants: {
    status: {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  },
  defaultVariants: {
    status: 'pending',
  },
})

export interface StatusBadgeProps
  extends Omit<BadgeProps, 'variant'>,
    VariantProps<typeof statusVariants> {
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'draft'
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusVariants({ status }), className)}
      {...props}
    >
      {status.replace('_', ' ')}
    </Badge>
  )
}
```

## Empty State Component

```typescript
// src/components/ui/empty-state.tsx
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

## Loading Skeleton Component

```typescript
// src/components/ui/skeleton.tsx
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

// Pre-built skeleton patterns
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}
```

## Confirmation Dialog Component

```typescript
// src/components/ui/confirm-dialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## File Upload Component

```typescript
// src/components/ui/file-upload.tsx
import { useRef, useState } from 'react'
import { Upload, X, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  accept?: string
  maxSize?: number // in MB
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  selectedFile?: File | null
  disabled?: boolean
  className?: string
}

export function FileUpload({
  accept = '*/*',
  maxSize = 10,
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }
    onFileSelect(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {selectedFile ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          <File className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFileRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drop file here or click to upload
          </p>
          <p className="text-xs text-muted-foreground">
            Max file size: {maxSize}MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}
```

## Component Checklist

When creating a new component, ensure:

- [ ] TypeScript interfaces for all props
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] Responsive (mobile-first)
- [ ] Uses design tokens (Tailwind classes)
- [ ] Proper error states
- [ ] Loading states where applicable
- [ ] Composable with other components
- [ ] Documented usage examples
- [ ] Follows naming conventions
- [ ] Uses `cn()` for className merging

## Construction-Specific Components

Consider building these domain-specific components:

- `ProjectCard` - Display project overview
- `DailyReportCard` - Show daily report summary
- `WeatherWidget` - Display weather conditions
- `PhotoGallery` - Construction photo viewer
- `DrawingViewer` - PDF/image drawing viewer
- `SignatureCapture` - For approvals and sign-offs
- `TimelineView` - Project schedule visualization
- `WeatherConditions` - Weather input for daily reports
