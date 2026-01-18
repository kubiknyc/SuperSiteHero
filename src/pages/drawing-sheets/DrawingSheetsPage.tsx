// File: /src/pages/drawing-sheets/DrawingSheetsPage.tsx
// Drawing Sheets management page - displays extracted PDF sheets with AI metadata

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { SheetGrid, DrawingSetUpload } from '@/features/drawing-sheets'
import { useDrawingSheets } from '@/features/drawing-sheets/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
} from 'lucide-react'

const DISCIPLINE_OPTIONS = [
  { value: 'all', label: 'All Disciplines' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'structural', label: 'Structural' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'civil', label: 'Civil' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'fire_protection', label: 'Fire Protection' },
  { value: 'other', label: 'Other' },
]

export function DrawingSheetsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [showUpload, setShowUpload] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: sheets, isLoading, refetch } = useDrawingSheets(projectId, {
    discipline: disciplineFilter !== 'all' ? disciplineFilter : undefined,
  })

  // Filter sheets by search term
  const filteredSheets = sheets?.filter((sheet) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      sheet.sheet_number?.toLowerCase().includes(search) ||
      sheet.title?.toLowerCase().includes(search)
    )
  })

  const handleSheetClick = (sheetId: string) => {
    navigate(`/projects/${projectId}/drawing-sheets/${sheetId}`)
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    refetch()
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-none border-b border-border bg-background p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Drawing Sheets</h1>
              <p className="text-muted-foreground text-sm">
                AI-extracted sheets from uploaded drawing sets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Drawing Set
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by sheet number or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={disciplineFilter}
              onValueChange={setDisciplineFilter}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Discipline" />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredSheets && filteredSheets.length > 0 ? (
            <SheetGrid
              sheets={filteredSheets}
              viewMode={viewMode}
              onSheetClick={handleSheetClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-muted-foreground mb-4">
                {searchTerm || disciplineFilter !== 'all'
                  ? 'No sheets match your filters'
                  : 'No drawing sheets yet'}
              </div>
              {!searchTerm && disciplineFilter === 'all' && (
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Drawing Set
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUpload && projectId && (
          <DrawingSetUpload
            projectId={projectId}
            onClose={() => setShowUpload(false)}
            onComplete={handleUploadComplete}
          />
        )}
      </div>
    </AppLayout>
  )
}

export default DrawingSheetsPage
