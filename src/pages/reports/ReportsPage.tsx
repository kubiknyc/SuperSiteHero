/**
 * Reports Page
 *
 * Main landing page for the Custom Report Builder feature.
 * Shows saved templates and quick actions.
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  FileText,
  Calendar,
  History,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Settings,
  Mail,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useReportTemplates,
  useDeleteReportTemplate,
  useDuplicateReportTemplate,
  useScheduledReports,
  useGeneratedReports,
} from '@/features/reports/hooks/useReportBuilder'
import {
  ReportTemplateCard,
  ReportTemplateCardSkeleton,
} from '@/features/reports/components/ReportTemplateCard'
import { ReportShareDialog } from '@/features/reports/components/ReportShareDialog'
import { DataSourceBadge } from '@/features/reports/components/DataSourceSelector'
import { format } from 'date-fns'
import {
  DATA_SOURCE_CONFIG,
  getOutputFormatLabel,
  formatFileSize,
  getScheduleFrequencyLabel,
  type ReportTemplate,
  type ReportDataSource,
} from '@/types/report-builder'
import { Badge } from '@/components/ui/badge'

export function ReportsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [currentTime] = useState(() => Date.now())
  const companyId = userProfile?.company_id

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [dataSourceFilter, setDataSourceFilter] = useState<ReportDataSource | 'all'>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Queries
  const { data: templates, isLoading: templatesLoading, error: templatesError } = useReportTemplates({
    company_id: companyId ?? undefined,
    data_source: dataSourceFilter === 'all' ? undefined : dataSourceFilter,
  })
  const { data: scheduledReports } = useScheduledReports({ company_id: companyId ?? undefined })
  const { data: generatedReports } = useGeneratedReports({ company_id: companyId ?? undefined })

  // Mutations
  const deleteTemplate = useDeleteReportTemplate()
  const duplicateTemplate = useDuplicateReportTemplate()

  // Filter templates by search
  const filteredTemplates = templates?.filter((t) => {
    if (!searchTerm) {return true}
    const term = searchTerm.toLowerCase()
    return (
      t.name.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term)
    )
  })

  // Handlers
  const handleCreateNew = () => {
    navigate('/reports/builder')
  }

  const handleEditTemplate = (template: ReportTemplate) => {
    navigate(`/reports/builder/${template.id}`)
  }

  const handleRunTemplate = (template: ReportTemplate) => {
    navigate(`/reports/builder/${template.id}?run=true`)
  }

  const handleScheduleTemplate = (template: ReportTemplate) => {
    navigate(`/reports/schedules/new?template=${template.id}`)
  }

  const handleDeleteClick = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) {return}
    await deleteTemplate.mutateAsync(selectedTemplate.id)
    setDeleteDialogOpen(false)
    setSelectedTemplate(null)
  }

  const handleDuplicateClick = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setNewTemplateName(`${template.name} (Copy)`)
    setDuplicateDialogOpen(true)
  }

  const handleShareClick = useCallback((template: ReportTemplate) => {
    setSelectedTemplate(template)
    setShareDialogOpen(true)
  }, [])

  const handleDuplicateConfirm = async () => {
    if (!selectedTemplate || !newTemplateName.trim()) {return}
    await duplicateTemplate.mutateAsync({
      id: selectedTemplate.id,
      newName: newTemplateName.trim(),
    })
    setDuplicateDialogOpen(false)
    setSelectedTemplate(null)
    setNewTemplateName('')
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 heading-page">
              <BarChart3 className="h-7 w-7 text-primary" />
              Custom Report Builder
            </h1>
            <p className="text-secondary mt-1">
              Create, manage, and schedule custom reports
            </p>
          </div>

          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {templates?.length || 0}
              </p>
              <p className="text-sm text-muted">Saved Templates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {scheduledReports?.filter((s) => s.is_active).length || 0}
              </p>
              <p className="text-sm text-muted">Active Schedules</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {generatedReports?.filter(
                  (r) =>
                    new Date(r.created_at) >
                    new Date(currentTime - 7 * 24 * 60 * 60 * 1000)
                ).length || 0}
              </p>
              <p className="text-sm text-muted">Reports This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {DATA_SOURCE_CONFIG.length}
              </p>
              <p className="text-sm text-muted">Data Sources</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={dataSourceFilter}
                    onValueChange={(v) => setDataSourceFilter(v as ReportDataSource | 'all')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Data Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Data Sources</SelectItem>
                      {DATA_SOURCE_CONFIG.map((ds) => (
                        <SelectItem key={ds.value} value={ds.value}>
                          {ds.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Template List */}
            {templatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <ReportTemplateCardSkeleton key={i} />
                ))}
              </div>
            ) : templatesError ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
                  <p className="text-secondary">Failed to load templates</p>
                </CardContent>
              </Card>
            ) : filteredTemplates?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-disabled mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                    No templates yet
                  </h3>
                  <p className="text-muted mb-4">
                    Create your first custom report template
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTemplates?.map((template) => (
                  <ReportTemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEditTemplate}
                    onDuplicate={handleDuplicateClick}
                    onDelete={handleDeleteClick}
                    onRun={handleRunTemplate}
                    onSchedule={handleScheduleTemplate}
                    onShare={handleShareClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-4">
            {scheduledReports?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-disabled mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                    No scheduled reports
                  </h3>
                  <p className="text-muted">
                    Schedule reports to be automatically generated and emailed
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {scheduledReports?.map((schedule) => (
                  <Card key={schedule.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Schedule Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium heading-subsection truncate">{schedule.name}</h3>
                            <Badge variant={schedule.is_active ? 'default' : 'secondary'} className="shrink-0">
                              {schedule.is_active ? (
                                <>
                                  <Play className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Pause className="h-3 w-3 mr-1" />
                                  Paused
                                </>
                              )}
                            </Badge>
                          </div>

                          {/* Template & Frequency */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-2">
                            {schedule.template && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {schedule.template.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {getScheduleFrequencyLabel(schedule.frequency)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {schedule.recipients.length} recipient{schedule.recipients.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Last Run Status */}
                          {schedule.last_run_at && (
                            <div className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              <span className="text-success">Last run:</span>
                              <span className="text-muted">
                                {format(new Date(schedule.last_run_at), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right: Next Run & Actions */}
                        <div className="text-right shrink-0">
                          {schedule.next_run_at && schedule.is_active && (
                            <div className="mb-2">
                              <p className="text-xs text-muted uppercase tracking-wide">Next Run</p>
                              <p className="text-sm font-medium text-foreground">
                                {format(new Date(schedule.next_run_at), 'MMM d')}
                              </p>
                              <p className="text-xs text-muted">
                                {format(new Date(schedule.next_run_at), 'h:mm a')}
                              </p>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/reports/schedules/${schedule.id}`)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {generatedReports?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-disabled mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                    No reports generated yet
                  </h3>
                  <p className="text-muted">
                    Generated reports will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {generatedReports?.slice(0, 20).map((report) => (
                      <div key={report.id} className="p-4 hover:bg-surface">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium heading-subsection">{report.report_name}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted mt-1">
                              <DataSourceBadge source={report.data_source} />
                              <span>
                                {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                              {report.row_count !== null && (
                                <span>{report.row_count} rows</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {getOutputFormatLabel(report.output_format)}
                            </span>
                            {report.file_size_bytes && (
                              <p className="text-xs text-muted">
                                {formatFileSize(report.file_size_bytes)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTemplate?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>
              Enter a name for the duplicate template.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Template name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDuplicateConfirm}
              disabled={duplicateTemplate.isPending || !newTemplateName.trim()}
            >
              {duplicateTemplate.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      {selectedTemplate && (
        <ReportShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          template={selectedTemplate}
        />
      )}
    </AppLayout>
  )
}

export default ReportsPage
