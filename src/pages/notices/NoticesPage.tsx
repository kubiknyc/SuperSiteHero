// File: /src/pages/notices/NoticesPage.tsx
// Notices list and management page

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  useNotices,
  useNoticeStats,
  useOverdueNotices,
  useNoticesDueSoon,
} from '@/features/notices/hooks'
import {
  NoticesList,
  NoticeFilters,
  NoticesSummaryCards,
  ActionRequiredBanner,
  CreateNoticeDialog,
} from '@/features/notices/components'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FileText, AlertCircle } from 'lucide-react'
import type { NoticeFilters as FilterType } from '@/features/notices/types'

export function NoticesPage() {
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [filters, setFilters] = useState<FilterType>({})

  // Use the selected project or first active project
  const activeProjectId =
    selectedProjectId ||
    projects?.find((p) => p.status === 'active')?.id ||
    projects?.[0]?.id

  // Fetch notices and stats
  const { data: notices, isLoading, error } = useNotices(activeProjectId, filters)
  const { data: stats, isLoading: statsLoading } = useNoticeStats(activeProjectId)
  const { data: overdueNotices } = useOverdueNotices(activeProjectId)
  const { data: dueSoonNotices } = useNoticesDueSoon(activeProjectId, 7)

  // Calculate counts for banner
  const overdueCount = overdueNotices?.length || 0
  const dueSoonCount = dueSoonNotices?.length || 0

  // Filter notices based on current filters
  const filteredNotices = useMemo(() => {
    if (!notices) {return []}
    return notices
  }, [notices])

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
            <p className="text-gray-600 mt-1">
              Track formal notices, correspondence, and response deadlines
            </p>
          </div>
          {activeProjectId && <CreateNoticeDialog projectId={activeProjectId} />}
        </div>

        {/* Project Selector */}
        {projects && projects.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="max-w-xs">
                <Label htmlFor="project-select">Project</Label>
                <Select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">Select a Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Required Banner */}
        {activeProjectId && (overdueCount > 0 || dueSoonCount > 0) && (
          <ActionRequiredBanner
            overdueCount={overdueCount}
            dueSoonCount={dueSoonCount}
            onViewOverdue={() =>
              setFilters({ ...filters, response_required: true })
            }
            onViewDueSoon={() =>
              setFilters({ ...filters, response_required: true })
            }
          />
        )}

        {/* Summary Cards */}
        {activeProjectId && (
          <NoticesSummaryCards stats={stats} isLoading={statsLoading} />
        )}

        {/* Filters */}
        {activeProjectId && (
          <Card>
            <CardContent className="p-4">
              <NoticeFilters
                filters={filters}
                onFiltersChange={setFilters}
                overdueCount={overdueCount}
              />
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading notices...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Notices
              </h3>
              <p className="text-gray-600">{error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* No project selected */}
        {!activeProjectId && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a Project
              </h3>
              <p className="text-gray-600">
                Choose a project to view and manage notices.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notices List */}
        {activeProjectId && !isLoading && !error && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredNotices.length} Notice{filteredNotices.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <NoticesList
              notices={filteredNotices}
              isLoading={isLoading}
              emptyMessage={
                notices && notices.length > 0
                  ? 'No notices match your filters'
                  : 'No notices yet. Create your first notice to get started.'
              }
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
