// File: /src/features/submittals/components/SubmittalsList.tsx
// Submittals list view for project detail page

import { useState, useCallback, useMemo, memo } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSubmittalWorkflowType, useSubmittals } from '../hooks'
import { CreateSubmittalDialog } from './CreateSubmittalDialog'
import { SubmittalStatusBadge } from './SubmittalStatusBadge'
import { Plus, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowItem } from '@/types/database'

interface SubmittalsListProps {
  projectId: string | undefined
}

// Memoized row component to prevent re-renders when other rows change
interface SubmittalRowProps {
  item: WorkflowItem
}

const SubmittalRow = memo(function SubmittalRow({ item }: SubmittalRowProps) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4 font-medium text-gray-900">{item.number}</td>
      <td className="py-3 px-4">
        <a href={`/submittals/${item.id}`} className="text-blue-600 hover:underline">
          {item.title}
        </a>
      </td>
      <td className="py-3 px-4">
        <SubmittalStatusBadge status={item.status} />
      </td>
      <td className="py-3 px-4 text-gray-600 text-sm">
        {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '-'}
      </td>
      <td className="py-3 px-4 text-gray-600 text-sm">
        {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
      </td>
    </tr>
  )
})

export function SubmittalsList({ projectId }: SubmittalsListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: workflowType } = useSubmittalWorkflowType()
  const { data: submittals, isLoading, error } = useSubmittals(projectId, workflowType?.id)

  // Filter submittals - memoized to prevent recalculation on every render
  const filtered = useMemo(() => (submittals || []).filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter ? item.status === statusFilter : true

    return matchesSearch && matchesStatus
  }), [submittals, searchTerm, statusFilter])

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
          <p className="text-gray-600">Loading submittals...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Failed to load submittals</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate statistics - memoized to prevent recalculation on every render
  const stats = useMemo(() => ({
    total: submittals?.length || 0,
    draft: submittals?.filter((s) => s.status === 'draft').length || 0,
    submitted: submittals?.filter((s) => s.status === 'submitted').length || 0,
    approved: submittals?.filter((s) => s.status === 'approved').length || 0,
  }), [submittals])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Submittals</CardTitle>
            <CardDescription>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} • {stats.draft} draft •{' '}
              {stats.submitted} submitted • {stats.approved} approved
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Submittal
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by title..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1"
            />
            <Select value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="resubmit_required">Resubmit Required</option>
            </Select>
          </div>

          {/* Submittals Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No submittals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Submitted</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: WorkflowItem) => (
                    <SubmittalRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateSubmittalDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => setSearchTerm('')}
      />
    </>
  )
}
