/**
 * Incidents List Page
 *
 * Dashboard view of all safety incidents with statistics,
 * filtering, and incident cards.
 */

import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IncidentCard, SeverityBadge } from '../components'
import { useIncidents, useIncidentStats } from '../hooks/useIncidents'
import type { IncidentSeverity, IncidentStatus, IncidentType } from '@/types/safety-incidents'
import { SEVERITY_CONFIG, INCIDENT_STATUS_CONFIG, INCIDENT_TYPE_CONFIG } from '@/types/safety-incidents'
import {
  Plus,
  Search,
  AlertTriangle,
  Shield,
  TrendingUp,
  Calendar,
  X,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function IncidentsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  // Get filters from URL
  const severityFilter = searchParams.get('severity') as IncidentSeverity | null
  const statusFilter = searchParams.get('status') as IncidentStatus | null
  const typeFilter = searchParams.get('type') as IncidentType | null

  // Fetch incidents with filters
  const { data: incidents = [], isLoading } = useIncidents({
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
    incident_type: typeFilter || undefined,
    search: search || undefined,
  })

  // Fetch statistics
  const { data: stats } = useIncidentStats()

  // Filter incidents locally by search
  const filteredIncidents = useMemo(() => {
    if (!search) {return incidents}
    const lowerSearch = search.toLowerCase()
    return incidents.filter(
      (i) =>
        i.description.toLowerCase().includes(lowerSearch) ||
        i.incident_number.toLowerCase().includes(lowerSearch) ||
        i.location?.toLowerCase().includes(lowerSearch)
    )
  }, [incidents, search])

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({})
    setSearch('')
  }

  const hasActiveFilters = severityFilter || statusFilter || typeFilter

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">Safety Incidents</h1>
            <p className="text-muted mt-1">
              Track and manage safety incidents across all projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/safety/osha-300">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4 mr-2" />
                OSHA 300 Log
              </Button>
            </Link>
            <Link to="/safety/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-info-light rounded-lg p-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted">Total Incidents</p>
                  <p className="text-2xl font-bold">{stats.total_incidents}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-success-light rounded-lg p-2">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted">Days Since Last Incident</p>
                  <p className="text-2xl font-bold text-success">
                    {stats.days_since_last_incident}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-warning-light rounded-lg p-2">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted">Open Incidents</p>
                  <p className="text-2xl font-bold text-warning">
                    {stats.open_incidents}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-error-light rounded-lg p-2">
                  <Calendar className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="text-sm text-muted">OSHA Recordable</p>
                  <p className="text-2xl font-bold text-error">
                    {stats.osha_recordable_count}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Severity Summary */}
        {stats && (
          <div className="bg-card rounded-lg border p-4 mb-6">
            <h3 className="text-sm font-medium text-secondary mb-3 heading-subsection">By Severity</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(SEVERITY_CONFIG).map(([severity, _config]) => {
                const count = stats.by_severity[severity as IncidentSeverity] || 0
                return (
                  <button
                    key={severity}
                    onClick={() =>
                      updateFilter('severity', severity === severityFilter ? null : severity)
                    }
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                      severity === severityFilter
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-surface'
                    )}
                  >
                    <SeverityBadge severity={severity as IncidentSeverity} size="sm" />
                    <span className="text-lg font-semibold">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                <Input
                  placeholder="Search incidents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => updateFilter('status', value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(INCIDENT_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter || 'all'}
              onValueChange={(value) => updateFilter('type', value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(INCIDENT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Incidents List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted mt-4">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4 heading-subsection">No incidents found</h3>
            <p className="text-muted mt-2">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'No safety incidents have been reported yet.'}
            </p>
            {!hasActiveFilters && (
              <Link to="/safety/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Report First Incident
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                showProject
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default IncidentsListPage
