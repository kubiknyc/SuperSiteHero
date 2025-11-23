// File: /src/pages/submittals/SubmittalsPage.tsx
// Main submittals page showing all submittals

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useSubmittalWorkflowType, useSubmittals } from '@/features/submittals/hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CreateSubmittalDialog } from '@/features/submittals/components'
import { SubmittalStatusBadge } from '@/features/submittals/components'
import { Plus, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { WorkflowItem } from '@/types/database'

interface SubmittalsPageState {
  projectId: string
  searchTerm: string
  statusFilter: string
  createOpen: boolean
}

export function SubmittalsPage() {
  const [state, setState] = useState<SubmittalsPageState>({
    projectId: '',
    searchTerm: '',
    statusFilter: '',
    createOpen: false,
  })

  const { data: workflowType } = useSubmittalWorkflowType()
  const { data: submittals, isLoading, error } = useSubmittals(state.projectId, workflowType?.id)

  // Filter submittals
  const filtered = (submittals || []).filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(state.searchTerm.toLowerCase())

    const matchesStatus = state.statusFilter ? item.status === state.statusFilter : true

    return matchesSearch && matchesStatus
  })

  // Calculate statistics
  const stats = {
    total: submittals?.length || 0,
    draft: submittals?.filter((s) => s.status === 'draft').length || 0,
    submitted: submittals?.filter((s) => s.status === 'submitted').length || 0,
    approved: submittals?.filter((s) => s.status === 'approved').length || 0,
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submittals</h1>
            <p className="text-gray-600 mt-1">Manage project submittals and approvals</p>
          </div>
          <Button onClick={() => setState({ ...state, createOpen: true })}>
            <Plus className="h-4 w-4 mr-2" />
            New Submittal
          </Button>
        </div>

        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter project ID (or leave empty to see all)"
              value={state.projectId}
              onChange={(e) => setState({ ...state, projectId: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Main Content Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Submittal List</CardTitle>
              <CardDescription>
                {filtered.length} item{filtered.length !== 1 ? 's' : ''} • {stats.draft} draft •{' '}
                {stats.submitted} submitted • {stats.approved} approved
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Input
                placeholder="Search by title..."
                value={state.searchTerm}
                onChange={(e) => setState({ ...state, searchTerm: e.target.value })}
                className="flex-1"
              />
              <Select
                value={state.statusFilter}
                onChange={(e) => setState({ ...state, statusFilter: e.target.value })}
              >
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
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading submittals...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600">Failed to load submittals</p>
              </div>
            ) : filtered.length === 0 ? (
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
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Cost Impact</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Schedule Impact</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: WorkflowItem) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.number}</td>
                        <td className="py-3 px-4">
                          <a href={`/submittals/${item.id}`} className="text-blue-600 hover:underline">
                            {item.title}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <SubmittalStatusBadge status={item.status} />
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{item.cost_impact || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{item.schedule_impact || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {item.due_date ? item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : 'N/A' : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <CreateSubmittalDialog
          projectId={state.projectId || undefined}
          open={state.createOpen}
          onOpenChange={(open) => setState({ ...state, createOpen: open })}
          onSuccess={() => setState({ ...state, searchTerm: '' })}
        />
      </div>
    </AppLayout>
  )
}
