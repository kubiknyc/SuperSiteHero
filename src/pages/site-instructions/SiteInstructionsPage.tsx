import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, FileText, AlertCircle } from 'lucide-react'
import { useSiteInstructions, type SiteInstructionFilters } from '@/features/site-instructions/hooks'
import { SiteInstructionCard, SiteInstructionFilters as Filters } from '@/features/site-instructions/components'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import type { SiteInstructionStatus, SiteInstructionPriority } from '@/types/database'

export default function SiteInstructionsPage() {
  const { userProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get project from URL or default
  const projectId = searchParams.get('project') || ''

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [subcontractorFilter, setSubcontractorFilter] = useState('all')

  // Fetch projects for selector
  const { data: projects, isLoading: projectsLoading } = useProjects()

  // Fetch contacts (subcontractors) for the selected project
  const { data: contacts = [] } = useContacts(projectId)

  // Build filters object
  const filters: SiteInstructionFilters = useMemo(() => {
    const f: SiteInstructionFilters = {}
    if (statusFilter !== 'all') {f.status = statusFilter as SiteInstructionStatus}
    if (priorityFilter !== 'all') {f.priority = priorityFilter as SiteInstructionPriority}
    if (subcontractorFilter !== 'all') {f.subcontractorId = subcontractorFilter}
    if (search) {f.search = search}
    return f
  }, [statusFilter, priorityFilter, subcontractorFilter, search])

  // Fetch site instructions
  const {
    data: instructions = [],
    isLoading,
    error,
  } = useSiteInstructions(projectId, filters)

  const handleProjectChange = (value: string) => {
    setSearchParams({ project: value })
    // Reset subcontractor filter when project changes
    setSubcontractorFilter('all')
  }

  // Stats
  const stats = useMemo(() => {
    const total = instructions.length
    const draft = instructions.filter((i) => i.status === 'draft').length
    const issued = instructions.filter((i) => i.status === 'issued').length
    const inProgress = instructions.filter((i) =>
      ['acknowledged', 'in_progress'].includes(i.status || '')
    ).length
    const completed = instructions.filter((i) =>
      ['completed', 'verified'].includes(i.status || '')
    ).length
    return { total, draft, issued, inProgress, completed }
  }, [instructions])

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold heading-page">Site Instructions</h1>
          <p className="text-muted-foreground">
            Formal written instructions and directives to subcontractors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={projectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId && (
            <Button asChild>
              <Link to={`/site-instructions/new?project=${projectId}`}>
                <Plus className="h-4 w-4 mr-2" />
                New Instruction
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!projectId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 heading-subsection">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Choose a project from the dropdown above to view and manage site instructions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Draft
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.draft}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Issued
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.issued}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Filters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            priority={priorityFilter}
            onPriorityChange={setPriorityFilter}
            subcontractorId={subcontractorFilter}
            onSubcontractorChange={setSubcontractorFilter}
            contacts={contacts.filter((c) => c.contact_type === 'subcontractor')}
          />

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2 heading-subsection">Error Loading Instructions</h3>
                <p className="text-muted-foreground text-center">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
              </CardContent>
            </Card>
          ) : instructions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2 heading-subsection">No Site Instructions</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {search || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'No instructions match your current filters.'
                    : 'Create your first site instruction to provide formal directives to subcontractors.'}
                </p>
                {!search && statusFilter === 'all' && priorityFilter === 'all' && (
                  <Button asChild>
                    <Link to={`/site-instructions/new?project=${projectId}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Instruction
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {instructions.map((instruction) => (
                <SiteInstructionCard key={instruction.id} instruction={instruction} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
