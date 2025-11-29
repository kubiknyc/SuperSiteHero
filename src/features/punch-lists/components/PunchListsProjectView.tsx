// File: /src/features/punch-lists/components/PunchListsProjectView.tsx
// Punch lists view for project detail page

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
import { Plus, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PunchItem } from '@/types/database'

interface PunchListsProjectViewProps {
  projectId: string | undefined
}

// Memoized row component to prevent re-renders when other rows change
interface PunchItemRowProps {
  item: PunchItem
}

const PunchItemRow = memo(function PunchItemRow({ item }: PunchItemRowProps) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4 font-medium text-gray-900">{item.number}</td>
      <td className="py-3 px-4">
        <a href={`/punch-lists/${item.id}`} className="text-blue-600 hover:underline">
          {item.title}
        </a>
      </td>
      <td className="py-3 px-4 text-gray-600 capitalize">{item.trade}</td>
      <td className="py-3 px-4 text-gray-600 text-sm">
        {[item.building, item.floor, item.room].filter(Boolean).join(' / ')}
      </td>
      <td className="py-3 px-4">
        <PunchItemStatusBadge status={item.status} priority={item.priority} />
      </td>
      <td className="py-3 px-4 text-gray-600 text-sm">
        {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
      </td>
    </tr>
  )
})

export function PunchListsProjectView({ projectId }: PunchListsProjectViewProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: punchItems, isLoading, error } = usePunchItems(projectId)

  // Filter punch items - memoized to prevent recalculation on every render
  const filtered = useMemo(() => (punchItems || []).filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.area?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter ? item.status === statusFilter : true

    return matchesSearch && matchesStatus
  }), [punchItems, searchTerm, statusFilter])

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
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading punch lists...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Failed to load punch lists</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate statistics - memoized to prevent recalculation on every render
  const stats = useMemo(() => ({
    total: punchItems?.length || 0,
    open: punchItems?.filter((p) => p.status === 'open').length || 0,
    inProgress: punchItems?.filter((p) => p.status === 'in_progress').length || 0,
    verified: punchItems?.filter((p) => p.status === 'verified').length || 0,
  }), [punchItems])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Punch List</CardTitle>
            <CardDescription>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} • {stats.open} open •{' '}
              {stats.inProgress} in progress • {stats.verified} verified
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
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
              className="flex-1"
            />
            <Select value={statusFilter} onChange={handleStatusFilterChange}>
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
              <p className="text-gray-500">No punch items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Trade</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: PunchItem) => (
                    <PunchItemRow key={item.id} item={item} />
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
