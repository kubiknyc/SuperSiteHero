// File: /src/pages/drawing-sheets/DrawingSheetDetailPage.tsx
// Drawing Sheet detail page - view individual sheet with callouts and AI metadata

import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { SheetViewer } from '@/features/drawing-sheets'
import { useDrawingSheet } from '@/features/drawing-sheets/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronLeft,
  FileText,
  RefreshCw,
  ScanSearch,
} from 'lucide-react'

export function DrawingSheetDetailPage() {
  const { projectId, sheetId } = useParams<{ projectId: string; sheetId: string }>()
  const navigate = useNavigate()

  const { data: sheet, isLoading: sheetLoading, refetch } = useDrawingSheet(sheetId)

  const handleBackToGrid = () => {
    navigate(`/projects/${projectId}/drawing-sheets`)
  }

  if (sheetLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full p-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="flex-1" />
        </div>
      </AppLayout>
    )
  }

  if (!sheet) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground mb-4">Sheet not found</p>
          <Button onClick={handleBackToGrid}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Sheets
          </Button>
        </div>
      </AppLayout>
    )
  }

  const disciplineColors: Record<string, string> = {
    architectural: 'bg-blue-500',
    structural: 'bg-red-500',
    mechanical: 'bg-green-500',
    electrical: 'bg-yellow-500',
    plumbing: 'bg-purple-500',
    civil: 'bg-orange-500',
    landscape: 'bg-emerald-500',
    fire_protection: 'bg-rose-500',
    other: 'bg-gray-500',
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-none border-b border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackToGrid}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    {sheet.sheet_number || `Page ${sheet.page_number}`}
                  </h1>
                  {sheet.discipline && (
                    <Badge
                      className={`${disciplineColors[sheet.discipline] || 'bg-gray-500'} text-white`}
                    >
                      {sheet.discipline.replace('_', ' ')}
                    </Badge>
                  )}
                  {sheet.processing_status === 'processing' && (
                    <Badge variant="outline" className="animate-pulse">
                      AI Processing...
                    </Badge>
                  )}
                </div>
                {sheet.title && (
                  <p className="text-sm text-muted-foreground">{sheet.title}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sheet.scale && (
                <span className="text-sm text-muted-foreground">
                  Scale: {sheet.scale}
                </span>
              )}
              {sheet.revision && (
                <Badge variant="outline">Rev {sheet.revision}</Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/visual-search?sheetId=${sheetId}`)}
              >
                <ScanSearch className="h-4 w-4 mr-2" />
                Visual Search
              </Button>
            </div>
          </div>
        </div>

        {/* Sheet Viewer with Callout Overlay */}
        <div className="flex-1 relative overflow-hidden">
          <SheetViewer
            sheetId={sheet.id}
            onNavigateToSheet={(targetSheetId) =>
              navigate(`/projects/${projectId}/drawing-sheets/${targetSheetId}`)
            }
            showCallouts={true}
            className="h-full"
          />
        </div>

        {/* Footer - Metadata Panel */}
        <div className="flex-none border-t border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {sheet.ai_confidence_score !== null && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>AI Confidence: {Math.round(sheet.ai_confidence_score * 100)}%</span>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Use controls in viewer to zoom and pan
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default DrawingSheetDetailPage
