// File: /src/features/punch-lists/components/PunchListsProjectView.tsx
// Punch lists view for project detail page
// Enhanced with tablet-optimized master-detail layout

import { useState, useCallback, useMemo, memo } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { usePunchItems } from '../hooks/usePunchItems'
import { CreatePunchItemDialog } from './CreatePunchItemDialog'
import { PunchItemStatusBadge } from './PunchItemStatusBadge'
import { Plus, AlertCircle, Loader2, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useResponsiveLayout, useOrientation } from '@/hooks/useOrientation'
import type { PunchItem } from '@/types/database'

interface PunchListsProjectViewProps {
  projectId: string | undefined
}

// Memoized row component to prevent re-renders when other rows change
interface PunchItemRowProps {
  item: PunchItem
  isSelected?: boolean
  onSelect?: (item: PunchItem) => void
  isTouchDevice?: boolean
}

const PunchItemRow = memo(function PunchItemRow({
  item,
  isSelected,
  onSelect,
  isTouchDevice,
}: PunchItemRowProps) {
  return (
    <tr
      className={cn(
        "border-b hover:bg-surface cursor-pointer transition-colors",
        isSelected && "bg-blue-50 hover:bg-info-light",
        // Larger row height on touch devices
        isTouchDevice && "h-14"
      )}
      onClick={() => onSelect?.(item)}
    >
      <td className={cn("py-3 px-4 font-medium text-foreground", isTouchDevice && "py-4")}>{item.number}</td>
      <td className={cn("py-3 px-4", isTouchDevice && "py-4")}>
        <a href={`/punch-lists/${item.id}`} className="text-primary hover:underline">
          {item.title}
        </a>
      </td>
      <td className={cn("py-3 px-4 text-secondary capitalize", isTouchDevice && "py-4")}>{item.trade}</td>
      <td className={cn("py-3 px-4 text-secondary text-sm", isTouchDevice && "py-4")}>
        {[item.building, item.floor, item.room].filter(Boolean).join(' / ')}
      </td>
      <td className={cn("py-3 px-4", isTouchDevice && "py-4")}>
        <PunchItemStatusBadge status={item.status} priority={item.priority} />
      </td>
      <td className={cn("py-3 px-4 text-secondary text-sm", isTouchDevice && "py-4")}>
        {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
      </td>
    </tr>
  )
})

// List item component for tablet list view (compact)
interface PunchItemListItemProps {
  item: PunchItem
  isSelected?: boolean
  onSelect?: (item: PunchItem) => void
  isTouchDevice?: boolean
}

const PunchItemListItem = memo(function PunchItemListItem({
  item,
  isSelected,
  onSelect,
  isTouchDevice,
}: PunchItemListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border-b cursor-pointer transition-colors",
        "hover:bg-surface",
        isSelected && "bg-blue-50 hover:bg-info-light border-l-4 border-l-blue-500",
        // Larger touch target on touch devices
        isTouchDevice && "min-h-touch"
      )}
      onClick={() => onSelect?.(item)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-muted">#{item.number}</span>
          <PunchItemStatusBadge status={item.status} priority={item.priority} />
        </div>
        <h4 className="font-medium text-foreground truncate heading-card">{item.title}</h4>
        <p className="text-sm text-muted truncate">
          {[item.building, item.floor, item.room].filter(Boolean).join(' / ') || 'No location'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-disabled flex-shrink-0 ml-2" />
    </div>
  )
})

// Detail panel component for selected punch item
interface PunchItemDetailPanelProps {
  item: PunchItem | null
  onClose?: () => void
  isTouchDevice?: boolean
}

function PunchItemDetailPanel({ item, onClose, isTouchDevice }: PunchItemDetailPanelProps) {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <p>Select a punch item to view details</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-muted">#{item.number}</span>
          <h3 className="font-semibold text-lg heading-subsection">{item.title}</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={cn(isTouchDevice && "min-h-touch min-w-touch")}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <PunchItemStatusBadge status={item.status} priority={item.priority} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted">Trade</label>
            <p className="text-foreground capitalize">{item.trade || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted">Due Date</label>
            <p className="text-foreground">
              {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted">Location</label>
            <p className="text-foreground">
              {[item.building, item.floor, item.room].filter(Boolean).join(' / ') || '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted">Area</label>
            <p className="text-foreground">{item.area || '-'}</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted">Description</label>
          <p className="text-foreground mt-1">{item.description || 'No description provided'}</p>
        </div>

        <div className="pt-4 flex gap-2">
          <Button asChild className={cn("flex-1", isTouchDevice && "min-h-touch")}>
            <a href={`/punch-lists/${item.id}`}>View Full Details</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PunchListsProjectView({ projectId }: PunchListsProjectViewProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedItem, setSelectedItem] = useState<PunchItem | null>(null)

  // Responsive layout hooks
  const layout = useResponsiveLayout()
  const { isTouchDevice, isTablet } = useOrientation()

  // Determine if we should use master-detail layout (tablets in landscape)
  const useMasterDetailLayout = layout === 'tablet-landscape' || layout === 'desktop'
  const useCompactListLayout = layout === 'tablet-portrait'

  const { data: punchItems, isLoading, error } = usePunchItems(projectId)

  // Handle item selection
  const handleSelectItem = useCallback((item: PunchItem) => {
    setSelectedItem(item)
  }, [])

  // Handle closing detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null)
  }, [])

  // Filter punch items - memoized to prevent recalculation on every render
  const filtered = useMemo(() => (punchItems || []).filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.area?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter ? item.status === statusFilter : true

    return matchesSearch && matchesStatus
  }), [punchItems, searchTerm, statusFilter])

  // Calculate statistics - memoized to prevent recalculation on every render
  // IMPORTANT: This must be before any early returns to satisfy React's Rules of Hooks
  const stats = useMemo(() => ({
    total: punchItems?.length || 0,
    open: punchItems?.filter((p) => p.status === 'open').length || 0,
    inProgress: punchItems?.filter((p) => p.status === 'in_progress').length || 0,
    verified: punchItems?.filter((p) => p.status === 'verified').length || 0,
  }), [punchItems])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
  }, [])

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-disabled mx-auto mb-4" />
          <p className="text-secondary">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
          <p className="text-secondary">Loading punch lists...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-error">Failed to load punch lists</p>
        </CardContent>
      </Card>
    )
  }

  // Master-Detail layout for tablets in landscape
  if (useMasterDetailLayout) {
    return (
      <>
        <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-lg overflow-hidden bg-card">
          {/* Master Panel - List */}
          <div className={cn(
            "flex flex-col border-r",
            selectedItem ? "w-[360px] flex-shrink-0" : "flex-1"
          )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-surface">
              <div>
                <h2 className="font-semibold heading-section">Punch List</h2>
                <p className="text-sm text-muted">
                  {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
                className={cn(isTouchDevice && "min-h-touch")}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            {/* Filters */}
            <div className="p-3 border-b space-y-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={cn("w-full", isTouchDevice && "min-h-touch")}
              />
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className={cn(isTouchDevice && "min-h-touch")}
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="ready_for_review">Ready for Review</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-muted text-sm">No items found</p>
                </div>
              ) : (
                filtered.map((item: PunchItem) => (
                  <PunchItemListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onSelect={handleSelectItem}
                    isTouchDevice={isTouchDevice}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <div className="flex-1 bg-surface">
              <PunchItemDetailPanel
                item={selectedItem}
                onClose={handleCloseDetail}
                isTouchDevice={isTouchDevice}
              />
            </div>
          )}

          {/* Empty state for detail panel */}
          {!selectedItem && (
            <div className="flex-1 flex items-center justify-center bg-surface text-muted">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Select a punch item to view details</p>
              </div>
            </div>
          )}
        </div>

        <CreatePunchItemDialog
          projectId={projectId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </>
    )
  }

  // Compact list layout for tablet portrait
  if (useCompactListLayout) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Punch List</CardTitle>
              <CardDescription className="text-sm">
                {stats.open} open / {stats.total} total
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className={cn(isTouchDevice && "min-h-touch")}
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            {/* Compact Filters */}
            <div className="flex gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={cn("flex-1", isTouchDevice && "min-h-touch")}
              />
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className={cn("w-36", isTouchDevice && "min-h-touch")}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
              </Select>
            </div>

            {/* List View */}
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-muted">No punch items found</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden divide-y">
                {filtered.map((item: PunchItem) => (
                  <PunchItemListItem
                    key={item.id}
                    item={item}
                    onSelect={handleSelectItem}
                    isTouchDevice={isTouchDevice}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <CreatePunchItemDialog
          projectId={projectId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </>
    )
  }

  // Default table layout for mobile and desktop
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Punch List</CardTitle>
            <CardDescription>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} - {stats.open} open -{' '}
              {stats.inProgress} in progress - {stats.verified} verified
            </CardDescription>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className={cn(isTouchDevice && "min-h-touch")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by title, trade, or area..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={cn("flex-1", isTouchDevice && "min-h-touch")}
            />
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className={cn(isTouchDevice && "min-h-touch")}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="ready_for_review">Ready for Review</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>

          {/* Punch Items Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted">No punch items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className={cn("text-left py-3 px-4 font-medium text-secondary", isTouchDevice && "py-4")}>#</th>
                    <th className={cn("text-left py-3 px-4 font-medium text-secondary", isTouchDevice && "py-4")}>Title</th>
                    <th className={cn("text-left py-3 px-4 font-medium text-secondary", isTouchDevice && "py-4")}>Trade</th>
                    <th className={cn("text-left py-3 px-4 font-medium text-secondary", isTouchDevice && "py-4")}>Location</th>
                    <th className={cn("text-left py-3 px-4 font-medium text-secondary", isTouchDevice && "py-4")}>Status</th>
                    <th className={cn("text-left py-3 px-4 font-medium text-secondary", isTouchDevice && "py-4")}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: PunchItem) => (
                    <PunchItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={handleSelectItem}
                      isTouchDevice={isTouchDevice}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreatePunchItemDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
