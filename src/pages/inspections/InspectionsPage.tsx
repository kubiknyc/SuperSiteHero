/**
 * Inspections Page
 *
 * Dashboard view of all inspections with statistics,
 * filtering, and inspection cards.
 */

import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  InspectionCard,
  InspectionFilters,
} from '@/features/inspections/components'
import {
  useInspections,
  useInspectionStats,
  useUpcomingInspections,
} from '@/features/inspections/hooks'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import type { InspectionFilters as InspectionFiltersType } from '@/features/inspections/types'
import {
  Plus,
  ClipboardCheck,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function InspectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: projects, isLoading: isLoadingProjects } = useMyProjects()

  // Get project from URL or default to first project
  const selectedProjectId = searchParams.get('project') || projects?.[0]?.id || ''

  // Filters state
  const [filters, setFilters] = useState<InspectionFiltersType>({})

  // Fetch inspections for selected project
  const {
    data: inspections = [],
    isLoading: isLoadingInspections,
  } = useInspections(selectedProjectId, filters)

  // Fetch statistics
  const { data: stats } = useInspectionStats(selectedProjectId)

  // Fetch upcoming inspections
  const { data: upcomingInspections = [] } = useUpcomingInspections(selectedProjectId)

  // Filter by search locally for instant feedback
  const filteredInspections = useMemo(() => {
    if (!filters.search) {return inspections}
    const lowerSearch = filters.search.toLowerCase()
    return inspections.filter(
      (i) =>
        i.inspection_name.toLowerCase().includes(lowerSearch) ||
        i.description?.toLowerCase().includes(lowerSearch) ||
        i.inspector_name?.toLowerCase().includes(lowerSearch) ||
        i.inspector_company?.toLowerCase().includes(lowerSearch)
    )
  }, [inspections, filters.search])

  const handleProjectChange = (projectId: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('project', projectId)
    setSearchParams(newParams)
  }

  const isLoading = isLoadingProjects || isLoadingInspections

  // Show project selector if no project selected
  if (!isLoadingProjects && !selectedProjectId && projects?.length === 0) {
    return (
      <SmartLayout title="Inspections" subtitle="Quality inspections">
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4 heading-subsection">
              No Projects Found
            </h3>
            <p className="text-muted mt-2">
              You need to be assigned to a project to view inspections.
            </p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Inspections" subtitle="Quality inspections">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">Inspections</h1>
            <p className="text-muted mt-1">
              Schedule and track inspections for your projects
            </p>
          </div>
          <Link to={`/inspections/new?project=${selectedProjectId}`}>
            <Button disabled={!selectedProjectId}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Inspection
            </Button>
          </Link>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-2">
            Select Project
          </label>
          <Select
            value={selectedProjectId}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProjectId && (
          <>
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-info-light rounded-lg p-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Inspections</p>
                      <p className="text-2xl font-bold">{stats.total_inspections}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-warning-light rounded-lg p-2">
                      <Calendar className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Upcoming (7 days)</p>
                      <p className="text-2xl font-bold text-warning">
                        {stats.upcoming_this_week}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-success-light rounded-lg p-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Passed</p>
                      <p className="text-2xl font-bold text-success">
                        {stats.passed_count}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'rounded-lg p-2',
                      stats.overdue_count > 0 ? 'bg-error-light' : 'bg-muted'
                    )}>
                      <AlertTriangle className={cn(
                        'h-5 w-5',
                        stats.overdue_count > 0 ? 'text-error' : 'text-secondary'
                      )} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Overdue</p>
                      <p className={cn(
                        'text-2xl font-bold',
                        stats.overdue_count > 0 ? 'text-error' : 'text-foreground'
                      )}>
                        {stats.overdue_count}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Inspections Section */}
            {upcomingInspections.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-muted" />
                  <h2 className="text-lg font-medium text-foreground heading-section">
                    Upcoming Inspections (Next 7 Days)
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingInspections.slice(0, 6).map((inspection) => (
                    <InspectionCard
                      key={inspection.id}
                      inspection={inspection}
                    />
                  ))}
                </div>
                {upcomingInspections.length > 6 && (
                  <p className="text-sm text-muted mt-4 text-center">
                    +{upcomingInspections.length - 6} more upcoming inspections
                  </p>
                )}
              </div>
            )}

            {/* Filters */}
            <InspectionFilters
              filters={filters}
              onFiltersChange={setFilters}
              className="mb-6"
            />

            {/* Inspections List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted mt-4">Loading inspections...</p>
              </div>
            ) : filteredInspections.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border">
                <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="text-lg font-medium text-foreground mt-4 heading-subsection">
                  No inspections found
                </h3>
                <p className="text-muted mt-2">
                  {Object.keys(filters).length > 0
                    ? 'Try adjusting your filters'
                    : 'Schedule your first inspection to get started.'}
                </p>
                {Object.keys(filters).length === 0 && (
                  <Link
                    to={`/inspections/new?project=${selectedProjectId}`}
                    className="mt-4 inline-block"
                  >
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Inspection
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-foreground heading-section">
                    All Inspections
                  </h2>
                  <p className="text-sm text-muted">
                    {filteredInspections.length} inspection
                    {filteredInspections.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInspections.map((inspection) => (
                    <InspectionCard
                      key={inspection.id}
                      inspection={inspection}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SmartLayout>
  )
}

export default InspectionsPage
