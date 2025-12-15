// @ts-nocheck
// File: /src/pages/submittals/DedicatedSubmittalsPage.tsx
// Submittals page using the dedicated submittals table with CSI MasterFormat organization

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  useProjectSubmittals,
  useSubmittalStats,
  REVIEW_STATUSES,
  BALL_IN_COURT_ENTITIES,
  type SubmittalWithDetails,
} from '@/features/submittals/hooks/useDedicatedSubmittals'
import { CreateDedicatedSubmittalDialog, DedicatedSubmittalAnalytics } from '@/features/submittals/components'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getDivisionTitle } from '@/components/ui/csi-spec-picker'
import {
  Plus,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Download,
  TrendingUp,
} from 'lucide-react'
import { downloadSubmittalLog } from '@/features/submittals/utils/submittalExport'
import { format } from 'date-fns'
import type { SubmittalReviewStatus, BallInCourtEntity } from '@/types/database'

// Status badge component
function SubmittalReviewStatusBadge({ status }: { status: string }) {
  const statusConfig = REVIEW_STATUSES.find((s) => s.value === status) || {
    label: status,
    color: 'gray',
  }

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    lime: 'bg-lime-100 text-lime-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
  }

  return (
    <Badge className={colorClasses[statusConfig.color] || colorClasses.gray}>
      {statusConfig.label}
    </Badge>
  )
}

// Ball-in-court badge
function BallInCourtBadge({ entity }: { entity: string | null }) {
  if (!entity) {return <span className="text-gray-400">-</span>}

  const entityConfig = BALL_IN_COURT_ENTITIES.find((e) => e.value === entity) || {
    label: entity,
  }

  return (
    <Badge variant="outline" className="text-xs">
      {entityConfig.label}
    </Badge>
  )
}

interface PageState {
  selectedProjectId: string
  searchTerm: string
  statusFilter: SubmittalReviewStatus | ''
  ballInCourtFilter: BallInCourtEntity | ''
  viewMode: 'list' | 'spec-grouped' | 'analytics'
  createOpen: boolean
  expandedSections: Set<string>
}

export function DedicatedSubmittalsPage() {
  const navigate = useNavigate()
  const { data: projects, isLoading: projectsLoading } = useMyProjects()

  const [state, setState] = useState<PageState>({
    selectedProjectId: '',
    searchTerm: '',
    statusFilter: '',
    ballInCourtFilter: '',
    viewMode: 'spec-grouped',
    createOpen: false,
    expandedSections: new Set(),
  })

  // Use selected project or first active project
  const projectId =
    state.selectedProjectId ||
    projects?.find((p) => p.status === 'active')?.id ||
    projects?.[0]?.id ||
    ''

  const { data: submittals, isLoading, error } = useProjectSubmittals(projectId)
  const stats = useSubmittalStats(projectId)

  // Filter submittals
  const filteredSubmittals = useMemo(() => {
    if (!submittals) {return []}

    return submittals.filter((item) => {
      const matchesSearch =
        !state.searchTerm ||
        item.title?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.submittal_number?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.spec_section?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.spec_section_title?.toLowerCase().includes(state.searchTerm.toLowerCase())

      const matchesStatus = !state.statusFilter || item.review_status === state.statusFilter

      const matchesBallInCourt =
        !state.ballInCourtFilter || item.ball_in_court_entity === state.ballInCourtFilter

      return matchesSearch && matchesStatus && matchesBallInCourt
    })
  }, [submittals, state.searchTerm, state.statusFilter, state.ballInCourtFilter])

  // Group by spec section for grouped view
  const groupedBySpecSection = useMemo(() => {
    const groups: Record<
      string,
      {
        division: string
        divisionTitle: string
        specSection: string
        specSectionTitle: string
        submittals: SubmittalWithDetails[]
      }
    > = {}

    filteredSubmittals.forEach((submittal) => {
      const specSection = submittal.spec_section
      const division = specSection.substring(0, 2)

      if (!groups[specSection]) {
        groups[specSection] = {
          division,
          divisionTitle: getDivisionTitle(division),
          specSection,
          specSectionTitle: submittal.spec_section_title || '',
          submittals: [],
        }
      }
      groups[specSection].submittals.push(submittal)
    })

    // Sort by spec section
    return Object.values(groups).sort((a, b) => a.specSection.localeCompare(b.specSection))
  }, [filteredSubmittals])

  const toggleSection = (specSection: string) => {
    const newExpanded = new Set(state.expandedSections)
    if (newExpanded.has(specSection)) {
      newExpanded.delete(specSection)
    } else {
      newExpanded.add(specSection)
    }
    setState({ ...state, expandedSections: newExpanded })
  }

  const expandAll = () => {
    const allSections = new Set(groupedBySpecSection.map((g) => g.specSection))
    setState({ ...state, expandedSections: allSections })
  }

  const collapseAll = () => {
    setState({ ...state, expandedSections: new Set() })
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submittals</h1>
            <p className="text-gray-600 mt-1">
              Manage project submittals with CSI MasterFormat organization
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const projectName = projects?.find((p) => p.id === projectId)?.name
                downloadSubmittalLog(filteredSubmittals, projectName)
              }}
              disabled={!submittals || submittals.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setState({ ...state, createOpen: true })}>
              <Plus className="h-4 w-4 mr-2" />
              New Submittal
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {!isLoading && submittals && submittals.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === '' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
              onClick={() => setState({ ...state, statusFilter: '' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'submitted' ? 'ring-2 ring-yellow-500' : 'hover:bg-gray-50'}`}
              onClick={() => setState({ ...state, statusFilter: 'submitted' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.submitted + stats.underReview}</p>
                    <p className="text-xs text-gray-500">In Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'approved' ? 'ring-2 ring-green-500' : 'hover:bg-gray-50'}`}
              onClick={() => setState({ ...state, statusFilter: 'approved' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.approved + stats.approvedAsNoted}</p>
                    <p className="text-xs text-gray-500">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'revise_resubmit' ? 'ring-2 ring-orange-500' : 'hover:bg-gray-50'}`}
              onClick={() => setState({ ...state, statusFilter: 'revise_resubmit' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.reviseResubmit}</p>
                    <p className="text-xs text-gray-500">Revise</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'rejected' ? 'ring-2 ring-red-500' : 'hover:bg-gray-50'}`}
              onClick={() => setState({ ...state, statusFilter: 'rejected' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                    <p className="text-xs text-gray-500">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {stats.overdue > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-700" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
                      <p className="text-xs text-red-600">Overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Project Selection & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <Select
                  value={state.selectedProjectId}
                  onChange={(e) => setState({ ...state, selectedProjectId: e.target.value })}
                  disabled={projectsLoading}
                >
                  <option value="">
                    {projectsLoading ? 'Loading projects...' : 'Select a project'}
                  </option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <Input
                  placeholder="Search submittals..."
                  value={state.searchTerm}
                  onChange={(e) => setState({ ...state, searchTerm: e.target.value })}
                />
              </div>

              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  value={state.statusFilter}
                  onChange={(e) =>
                    setState({ ...state, statusFilter: e.target.value as SubmittalReviewStatus | '' })
                  }
                >
                  <option value="">All Statuses</option>
                  {REVIEW_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ball-in-Court</label>
                <Select
                  value={state.ballInCourtFilter}
                  onChange={(e) =>
                    setState({ ...state, ballInCourtFilter: e.target.value as BallInCourtEntity | '' })
                  }
                >
                  <option value="">All</option>
                  {BALL_IN_COURT_ENTITIES.map((entity) => (
                    <option key={entity.value} value={entity.value}>
                      {entity.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={state.viewMode === 'spec-grouped' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setState({ ...state, viewMode: 'spec-grouped' })}
                  className="px-2"
                  title="Group by Spec Section"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={state.viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setState({ ...state, viewMode: 'list' })}
                  className="px-2"
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={state.viewMode === 'analytics' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setState({ ...state, viewMode: 'analytics' })}
                  className="px-2"
                  title="Lead Time Analytics"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Submittal Log</CardTitle>
              <CardDescription>
                {state.viewMode === 'analytics' ? (
                  'Lead time analytics and performance metrics'
                ) : (
                  <>
                    {filteredSubmittals.length} submittal{filteredSubmittals.length !== 1 ? 's' : ''}{' '}
                    {state.viewMode === 'spec-grouped' &&
                      `across ${groupedBySpecSection.length} spec section${groupedBySpecSection.length !== 1 ? 's' : ''}`}
                  </>
                )}
              </CardDescription>
            </div>
            {state.viewMode === 'spec-grouped' && groupedBySpecSection.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
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
            ) : filteredSubmittals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No submittals found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setState({ ...state, createOpen: true })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Submittal
                </Button>
              </div>
            ) : state.viewMode === 'analytics' ? (
              /* Analytics View */
              <DedicatedSubmittalAnalytics projectId={projectId} />
            ) : state.viewMode === 'spec-grouped' ? (
              /* Spec Section Grouped View */
              <div className="space-y-2">
                {groupedBySpecSection.map((group) => {
                  const isExpanded = state.expandedSections.has(group.specSection)

                  return (
                    <div
                      key={group.specSection}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Section Header */}
                      <button
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        onClick={() => toggleSection(group.specSection)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600">
                                {group.specSection}
                              </span>
                              <span className="font-medium">{group.specSectionTitle}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Division {group.division} - {group.divisionTitle}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">
                            {group.submittals.length} submittal
                            {group.submittals.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="border-t">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left py-2 px-4 font-medium text-gray-700">
                                  Number
                                </th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700">
                                  Title
                                </th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700">
                                  Type
                                </th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700">
                                  Status
                                </th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700">
                                  Ball-in-Court
                                </th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700">
                                  Due Date
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.submittals.map((submittal) => (
                                <tr
                                  key={submittal.id}
                                  className="border-t hover:bg-gray-50 cursor-pointer"
                                  onClick={() => navigate(`/submittals-v2/${submittal.id}`)}
                                >
                                  <td className="py-2 px-4 font-mono text-blue-600">
                                    {submittal.submittal_number}
                                    {(submittal.revision_number || 0) > 0 && (
                                      <span className="text-gray-400 ml-1">
                                        R{submittal.revision_number}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-4 text-blue-600 hover:underline">
                                    {submittal.title}
                                  </td>
                                  <td className="py-2 px-4 text-gray-600 capitalize">
                                    {submittal.submittal_type?.replace(/_/g, ' ')}
                                  </td>
                                  <td className="py-2 px-4">
                                    <SubmittalReviewStatusBadge status={submittal.review_status} />
                                  </td>
                                  <td className="py-2 px-4">
                                    <BallInCourtBadge entity={submittal.ball_in_court_entity} />
                                  </td>
                                  <td className="py-2 px-4 text-gray-600">
                                    {submittal.date_required
                                      ? format(new Date(submittal.date_required), 'MMM d, yyyy')
                                      : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Flat List View */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Number</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Spec Section</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Ball-in-Court</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmittals.map((submittal) => (
                      <tr
                        key={submittal.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/submittals-v2/${submittal.id}`)}
                      >
                        <td className="py-3 px-4 font-mono text-blue-600">
                          {submittal.submittal_number}
                          {(submittal.revision_number || 0) > 0 && (
                            <span className="text-gray-400 ml-1">R{submittal.revision_number}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                            {submittal.spec_section}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-blue-600 hover:underline">
                          {submittal.title}
                        </td>
                        <td className="py-3 px-4 text-gray-600 capitalize">
                          {submittal.submittal_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4">
                          <SubmittalReviewStatusBadge status={submittal.review_status} />
                        </td>
                        <td className="py-3 px-4">
                          <BallInCourtBadge entity={submittal.ball_in_court_entity} />
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {submittal.date_required
                            ? format(new Date(submittal.date_required), 'MMM d, yyyy')
                            : '-'}
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
        <CreateDedicatedSubmittalDialog
          projectId={projectId || undefined}
          open={state.createOpen}
          onOpenChange={(open) => setState({ ...state, createOpen: open })}
          onSuccess={() => setState({ ...state, searchTerm: '' })}
        />
      </div>
    </AppLayout>
  )
}

export default DedicatedSubmittalsPage
