// File: /src/pages/shop-drawings/ShopDrawingsPage.tsx
// Shop Drawings list page with filtering and statistics

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Loader2,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  List,
} from 'lucide-react'
import {
  ShopDrawingList,
  CreateShopDrawingDialog,
  ShopDrawingStatusBadge,
  PriorityBadge,
} from '@/features/shop-drawings/components'
import {
  useShopDrawingStats,
  SHOP_DRAWING_PRIORITIES,
} from '@/features/shop-drawings/hooks'
import { SUBMITTAL_REVIEW_STATUSES } from '@/types/submittal'

export function ShopDrawingsPage() {
  const navigate = useNavigate()
  const { data: projects, isLoading: projectsLoading } = useMyProjects()

  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list')

  const stats = useShopDrawingStats(selectedProjectId || undefined)

  // Set first project as default
  useMemo(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const handleShopDrawingClick = (shopDrawing: { id: string }) => {
    navigate(`/projects/${selectedProjectId}/shop-drawings/${shopDrawing.id}`)
  }

  return (
    <SmartLayout title="Shop Drawings" subtitle="Technical drawings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shop Drawings</h1>
            <p className="text-muted-foreground">
              Manage shop drawing submittals and track approvals
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Project selector */}
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={projectsLoading}
            >
              {projectsLoading ? (
                <option>Loading projects...</option>
              ) : projects?.length === 0 ? (
                <option>No projects available</option>
              ) : (
                <>
                  <option value="">Select a project...</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </>
              )}
            </Select>

            <Button
              onClick={() => setCreateDialogOpen(true)}
              disabled={!selectedProjectId}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Shop Drawing
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedProjectId && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Shop drawings in this project
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingReview}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.byStatus.approved + stats.byStatus.approved_as_noted}
                </div>
                <p className="text-xs text-muted-foreground">
                  A: {stats.byStatus.approved} | B: {stats.byStatus.approved_as_noted}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Path</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byPriority.critical_path}</div>
                <p className="text-xs text-muted-foreground">
                  High priority items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                <p className="text-xs text-muted-foreground">
                  Past required date
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content */}
        {!selectedProjectId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Select a Project</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                Choose a project from the dropdown above to view and manage shop drawings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'stats')}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <ShopDrawingList
                projectId={selectedProjectId}
                onShopDrawingClick={handleShopDrawingClick}
              />
            </TabsContent>

            <TabsContent value="stats" className="mt-4">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byStatus).map(([status, count]) => {
                        const statusInfo = SUBMITTAL_REVIEW_STATUSES.find(s => s.value === status)
                        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <ShopDrawingStatusBadge status={status} showLockIcon={false} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{count}</span>
                                <span className="text-muted-foreground">{percentage}%</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Priority Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Priority Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byPriority).map(([priority, count]) => {
                        const priorityInfo = SHOP_DRAWING_PRIORITIES.find(p => p.value === priority)
                        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                        return (
                          <div key={priority} className="flex items-center gap-3">
                            <PriorityBadge priority={priority as 'critical_path' | 'standard' | 'non_critical'} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{count}</span>
                                <span className="text-muted-foreground">{percentage}%</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Long Lead Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Long Lead Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{stats.longLeadItems}</div>
                        <p className="text-sm text-muted-foreground">
                          Items requiring extended procurement time
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Not Submitted</p>
                        <p className="text-lg font-medium">{stats.byStatus.not_submitted}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Under Review</p>
                        <p className="text-lg font-medium">{stats.pendingReview}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Revise & Resubmit</p>
                        <p className="text-lg font-medium">{stats.byStatus.revise_resubmit}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Rejected</p>
                        <p className="text-lg font-medium">{stats.byStatus.rejected}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create Dialog */}
      {selectedProjectId && (
        <CreateShopDrawingDialog
          projectId={selectedProjectId}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            // Optionally refresh data
          }}
        />
      )}
    </SmartLayout>
  )
}

export default ShopDrawingsPage
