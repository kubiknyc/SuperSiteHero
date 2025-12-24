// File: /src/pages/takeoffs/TakeoffsListPage.tsx
// Project-level takeoffs management page

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Ruler,
  FileText,
  Download,
  Plus,
  TrendingUp,
  DollarSign,
  Filter,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useTakeoffItemsByProject } from '@/features/takeoffs/hooks/useTakeoffItems'
import { exportTakeoffsToCSV, exportTakeoffsToExcel } from '@/features/takeoffs/utils/export'
import { TakeoffTemplateDialog } from '@/features/takeoffs/components/TakeoffTemplateDialog'
import { useAuth } from '@/lib/auth/AuthContext'
import type { MeasurementType } from '@/features/takeoffs/utils/measurements'

/**
 * TakeoffsListPage Component
 *
 * Shows all project documents with takeoff indicators and summaries.
 * Features:
 * - All documents displayed (with/without takeoffs)
 * - Measurement count badges
 * - Bulk export functionality
 * - Quick navigation to takeoff canvas
 * - Filter by document name or measurement type
 */
export default function TakeoffsListPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<MeasurementType | 'all'>('all')
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  // Fetch data
  const { data: project } = useProject(projectId)
  const { data: documents = [] } = useDocuments(projectId)
  const { data: allTakeoffs = [] } = useTakeoffItemsByProject(projectId)

  // Group takeoffs by document
  const takeoffsByDocument = useMemo(() => {
    const grouped = new Map<string, typeof allTakeoffs>()

    allTakeoffs.forEach((takeoff) => {
      const docId = takeoff.document_id
      if (!grouped.has(docId)) {
        grouped.set(docId, [])
      }
      grouped.get(docId)!.push(takeoff)
    })

    return grouped
  }, [allTakeoffs])

  // Calculate totals
  const stats = useMemo(() => {
    const totalMeasurements = allTakeoffs.length
    const documentsWithTakeoffs = takeoffsByDocument.size

    // Count by type
    const byType = allTakeoffs.reduce((acc, t) => {
      acc[t.measurement_type] = (acc[t.measurement_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalMeasurements,
      documentsWithTakeoffs,
      totalDocuments: documents.length,
      byType,
    }
  }, [allTakeoffs, takeoffsByDocument, documents])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((doc) => {
        const docTakeoffs = takeoffsByDocument.get(doc.id) || []
        return docTakeoffs.some((t) => t.measurement_type === filterType)
      })
    }

    return filtered
  }, [documents, searchQuery, filterType, takeoffsByDocument])

  // Handle bulk export
  const handleExportAll = (format: 'csv' | 'excel') => {
    if (format === 'csv') {
      exportTakeoffsToCSV(
        allTakeoffs,
        project?.name || 'Project',
        'All Documents'
      )
    } else {
      exportTakeoffsToExcel(
        allTakeoffs,
        project?.name || 'Project',
        'All Documents'
      )
    }
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" className="heading-page">Takeoffs</h1>
          <p className="text-muted-foreground mt-1">
            {project?.name || 'Project'} - Measurement Management
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExportAll('csv')}
            disabled={allTakeoffs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportAll('excel')}
            disabled={allTakeoffs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Measurements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMeasurements}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents with Takeoffs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.documentsWithTakeoffs} / {stats.totalDocuments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Browse Templates
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              <DollarSign className="w-4 h-4 mr-2" />
              Calculate Costs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="area">Area</SelectItem>
            <SelectItem value="count">Count</SelectItem>
            <SelectItem value="linear_with_drop">Linear with Drop</SelectItem>
            <SelectItem value="pitched_area">Pitched Area</SelectItem>
            <SelectItem value="pitched_linear">Pitched Linear</SelectItem>
            <SelectItem value="surface_area">Surface Area</SelectItem>
            <SelectItem value="volume_2d">Volume 2D</SelectItem>
            <SelectItem value="volume_3d">Volume 3D</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((document) => {
          const docTakeoffs = takeoffsByDocument.get(document.id) || []
          const hasTakeoffs = docTakeoffs.length > 0

          // Count by type for this document
          const typeCount = docTakeoffs.reduce((acc, t) => {
            acc[t.measurement_type] = (acc[t.measurement_type] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          return (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {document.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {document.document_type || 'Document'}
                    </CardDescription>
                  </div>
                  {hasTakeoffs ? (
                    <Badge variant="default">{docTakeoffs.length}</Badge>
                  ) : (
                    <Badge variant="outline">No takeoffs</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Type breakdown */}
                {hasTakeoffs && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(typeCount).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      navigate(`/projects/${projectId}/documents/${document.id}/takeoff`)
                    }
                  >
                    <Ruler className="w-4 h-4 mr-2" />
                    {hasTakeoffs ? 'View Takeoffs' : 'Add Takeoffs'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery || filterType !== 'all'
              ? 'No documents match your filters'
              : 'No documents found in this project'}
          </p>
        </div>
      )}

      {/* Template Dialog */}
      {projectId && userProfile && (
        <TakeoffTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          mode="browse"
          projectId={projectId}
          companyId={userProfile.company_id ?? ''}
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  )
}
