// File: /src/features/takeoffs/components/TakeoffSummary.tsx
// Summary component showing takeoff totals and statistics

import { useMemo } from 'react'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TakeoffMeasurement } from './TakeoffCanvas'
import type { ScaleFactor } from '../utils/measurements'
import {
  calculateSummary,
  exportToCSV,
  exportToExcel,
  downloadFile,
  type ExportSummary,
} from '../utils/export'
import { logger } from '../../../lib/utils/logger';


export interface TakeoffSummaryProps {
  measurements: TakeoffMeasurement[]
  scale?: ScaleFactor
  projectName?: string
  documentName?: string
  onClose?: () => void
}

/**
 * TakeoffSummary Component
 *
 * Displays summary statistics and export options for measurements.
 */
export function TakeoffSummary({
  measurements,
  scale,
  projectName,
  documentName,
  onClose,
}: TakeoffSummaryProps) {
  // Calculate summary
  const summary: ExportSummary = useMemo(() => {
    return calculateSummary(measurements, scale)
  }, [measurements, scale])

  // Handle CSV export
  const handleExportCSV = () => {
    const csv = exportToCSV(measurements, scale, projectName)
    const filename = `takeoff-${documentName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadFile(csv, filename)
  }

  // Handle Excel export
  const handleExportExcel = async () => {
    try {
      const blob = await exportToExcel(measurements, scale, projectName, documentName)
      const filename = `takeoff-${documentName || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`
      downloadFile(blob, filename)
    } catch (error) {
      logger.error('Error exporting to Excel:', error)
      alert('Failed to export to Excel. Please try CSV export instead.')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Takeoff Summary</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Measurements</div>
            <div className="text-2xl font-bold">{summary.totalMeasurements}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Types</div>
            <div className="text-2xl font-bold">{Object.keys(summary.byType).length}</div>
          </div>
        </div>

        {/* By Type Breakdown */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm heading-subsection">Breakdown by Type</h3>
          <div className="space-y-2">
            {Object.entries(summary.byType).map(([type, quantity]) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{type}</Badge>
                </div>
                <div className="font-mono font-semibold">
                  {quantity.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scale Info */}
        {scale && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Scale Information</div>
            <div className="text-xs text-primary-hover">
              {scale.pixelsPerUnit.toFixed(4)} pixels per {scale.unit}
            </div>
          </div>
        )}

        {!scale && (
          <div className="p-3 bg-warning-light border border-yellow-200 rounded-lg">
            <div className="text-sm font-medium text-yellow-900 mb-1">No Scale Set</div>
            <div className="text-xs text-yellow-700">
              Measurements are shown in pixels. Calibrate scale for accurate quantities.
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold text-sm mb-3 heading-subsection">Export Options</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={measurements.length === 0}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={measurements.length === 0}
              className="w-full"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Project Info */}
        {(projectName || documentName) && (
          <div className="pt-4 border-t text-xs text-muted-foreground">
            {projectName && <div>Project: {projectName}</div>}
            {documentName && <div>Document: {documentName}</div>}
            <div>Exported: {new Date().toLocaleString()}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
