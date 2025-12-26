// File: /src/pages/takeoffs/TakeoffPage.tsx
// Main page for takeoff measurements on PDF drawings

import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Save, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TakeoffCanvas, type TakeoffMeasurement } from '@/features/takeoffs/components/TakeoffCanvas'
import { TakeoffToolbar } from '@/features/takeoffs/components/TakeoffToolbar'
import { TakeoffItemsList } from '@/features/takeoffs/components/TakeoffItemsList'
import { TakeoffItemCard } from '@/features/takeoffs/components/TakeoffItemCard'
import { CalibrationDialog } from '@/features/takeoffs/components/CalibrationDialog'
import { AssemblyPicker } from '@/features/takeoffs/components/AssemblyPicker'
import { TakeoffSummary } from '@/features/takeoffs/components/TakeoffSummary'
import { TakeoffTemplateDialog } from '@/features/takeoffs/components/TakeoffTemplateDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useTakeoffItemsByDocument,
  useCreateTakeoffItem,
  useUpdateTakeoffItem,
  useDeleteTakeoffItem,
} from '@/features/takeoffs/hooks/useTakeoffItems'
import { useIncrementTemplateUsage } from '@/features/takeoffs/hooks/useTakeoffTemplates'
import type { MeasurementType, ScaleFactor, Point } from '@/features/takeoffs/utils/measurements'
import type { TakeoffTemplate } from '@/types/database-extensions'
import { useAuth } from '@/lib/auth/AuthContext'
import { compressPoints } from '@/features/takeoffs/utils/coordinateCompression'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '../../lib/utils/logger';


/**
 * TakeoffPage Component
 *
 * Main page for creating and managing takeoff measurements on PDF drawings.
 * Integrates canvas, toolbar, measurement list, and dialogs.
 */
export default function TakeoffPage() {
  const { documentId, projectId } = useParams<{ documentId: string; projectId: string }>()
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  // State
  const [currentTool, setCurrentTool] = useState<MeasurementType>('linear')
  const [currentColor, setCurrentColor] = useState('#FF0000')
  const [scale, setScale] = useState<ScaleFactor | undefined>(undefined)
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  const [showCalibration, setShowCalibration] = useState(false)
  const [showAssemblyPicker, setShowAssemblyPicker] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [calibrationPoints, setCalibrationPoints] = useState<Point[] | undefined>(undefined)
  const [pageNumber] = useState(1) // TODO: Get from document viewer
  const [templateDialogMode, setTemplateDialogMode] = useState<'create' | 'browse' | null>(null)

  // Fetch measurements
  const { data: measurements = [], isLoading } = useTakeoffItemsByDocument(
    documentId,
    pageNumber
  )

  // Mutations
  const createMutation = useCreateTakeoffItem()
  const updateMutation = useUpdateTakeoffItem()
  const deleteMutation = useDeleteTakeoffItem()
  const incrementTemplateUsageMutation = useIncrementTemplateUsage()

  // Convert database format to canvas format
  const canvasMeasurements: TakeoffMeasurement[] = measurements.map((m) => {
    const measurementData = typeof m.measurement_data === 'object' && m.measurement_data !== null
      ? m.measurement_data as Record<string, any>
      : {}

    return {
      id: m.id,
      type: m.measurement_type as MeasurementType,
      points: Array.isArray(measurementData.points) ? measurementData.points : [],
      color: m.color || '#FF0000',
      name: m.name || undefined,
      dropHeight: measurementData.dropHeight,
      pitch: measurementData.pitch,
      height: measurementData.height,
      depth: measurementData.depth,
      crossSections: measurementData.crossSections,
    }
  })

  // Handle measurement creation
  const handleMeasurementCreate = useCallback(
    async (measurement: Omit<TakeoffMeasurement, 'id'>) => {
      if (!documentId || !projectId || !userProfile?.company_id) {return}

      // Compress coordinates for storage
      const compressed = compressPoints(measurement.points)

      // Store all measurement data in the measurement_data JSON field
      const measurementData: Record<string, any> = {
        points: compressed.compressed,
        dropHeight: measurement.dropHeight,
        pitch: measurement.pitch,
        height: measurement.height,
        depth: measurement.depth,
      }

      // Serialize crossSections if present
      if (measurement.crossSections) {
        measurementData.crossSections = measurement.crossSections.map(cs => ({
          points: cs.points,
          elevation: cs.elevation,
        }))
      }

      await createMutation.mutateAsync({
        document_id: documentId,
        project_id: projectId,
        page_number: pageNumber,
        measurement_type: measurement.type,
        measurement_data: measurementData as any, // JSON type
        color: measurement.color,
        name: measurement.name || `${measurement.type}-${Date.now()}`,
      } as any)
    },
    [documentId, projectId, pageNumber, userProfile, createMutation]
  )

  // Handle measurement update
  const handleMeasurementUpdate = useCallback(
    async (id: string, updates: Partial<TakeoffMeasurement>) => {
      // Find the original measurement to merge with updates
      const original = measurements.find(m => m.id === id)
      if (!original) {return}

      const originalData = typeof original.measurement_data === 'object' && original.measurement_data !== null
        ? original.measurement_data as Record<string, any>
        : {}

      // Build updated measurement data
      const measurementData: Record<string, any> = { ...originalData }

      if (updates.points) {
        const compressed = compressPoints(updates.points)
        measurementData.points = compressed.compressed
      }
      if (updates.dropHeight !== undefined) {measurementData.dropHeight = updates.dropHeight}
      if (updates.pitch !== undefined) {measurementData.pitch = updates.pitch}
      if (updates.height !== undefined) {measurementData.height = updates.height}
      if (updates.depth !== undefined) {measurementData.depth = updates.depth}
      if (updates.crossSections !== undefined) {measurementData.crossSections = updates.crossSections}

      const dbUpdates: Record<string, unknown> = {
        measurement_data: measurementData,
      }

      if (updates.name !== undefined) {dbUpdates.name = updates.name}
      if (updates.color !== undefined) {dbUpdates.color = updates.color}

      await updateMutation.mutateAsync({ id, ...dbUpdates })
    },
    [measurements, updateMutation]
  )

  // Handle measurement deletion
  const handleMeasurementDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id)
      if (selectedMeasurementId === id) {
        setSelectedMeasurementId(null)
      }
    },
    [deleteMutation, selectedMeasurementId]
  )

  // Handle calibration
  const handleCalibrate = useCallback(() => {
    // TODO: Switch to calibration mode where next line drawn sets calibration points
    setShowCalibration(true)
  }, [])

  const handleCalibrationComplete = useCallback((newScale: ScaleFactor) => {
    setScale(newScale)
    setCalibrationPoints(undefined)
  }, [])

  // Handle export
  const handleExport = useCallback(() => {
    setShowSummary(true)
  }, [])

  // Selected measurement for detail card (moved before callbacks that use it)
  const selectedMeasurement = canvasMeasurements.find((m) => m.id === selectedMeasurementId)

  // Handle template application
  const handleApplyTemplate = useCallback(
    async (template: TakeoffTemplate) => {
      // Apply template data to current tool settings
      setCurrentTool(template.measurement_type)

      // If template has specific settings, apply them
      if (template.template_data) {
        // Could apply color, default values, etc.
        // For now, just switch to the template's measurement type
      }

      // Increment usage count
      await incrementTemplateUsageMutation.mutateAsync(template.id)

      toast({
        title: 'Template Applied',
        description: `Using "${template.name}" settings`,
      })
    },
    [incrementTemplateUsageMutation, toast]
  )

  // Handle save selected measurement as template
  const handleSaveAsTemplate = useCallback(() => {
    if (!selectedMeasurement) {
      toast({
        title: 'No Measurement Selected',
        description: 'Please select a measurement to save as a template',
        variant: 'destructive',
      })
      return
    }

    // Build template data from selected measurement
    const templateData: Record<string, any> = {
      color: selectedMeasurement.color,
    }

    if (selectedMeasurement.dropHeight) {templateData.dropHeight = selectedMeasurement.dropHeight}
    if (selectedMeasurement.pitch) {templateData.pitch = selectedMeasurement.pitch}
    if (selectedMeasurement.height) {templateData.height = selectedMeasurement.height}
    if (selectedMeasurement.depth) {templateData.depth = selectedMeasurement.depth}

    setTemplateDialogMode('create')
  }, [selectedMeasurement, toast])

  if (!documentId || !projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Document or project not specified</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold heading-page">Takeoff Measurements</h1>
            <p className="text-sm text-muted-foreground">
              Document ID: {documentId} • Page {pageNumber}
            </p>
          </div>
          {/* Template Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateDialogMode('browse')}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsTemplate}
              disabled={!selectedMeasurement}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <TakeoffToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
          scale={scale}
          onCalibrate={handleCalibrate}
          onShowList={() => setShowList(!showList)}
          onExport={handleExport}
          measurementCount={measurements.length}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading measurements...</div>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-lg overflow-hidden">
              <TakeoffCanvas
                documentId={documentId}
                projectId={projectId}
                pageNumber={pageNumber}
                // backgroundImageUrl={documentUrl} // TODO: Get from document
                width={1200}
                height={800}
                measurements={canvasMeasurements}
                scale={scale}
                currentTool={currentTool}
                onMeasurementCreate={handleMeasurementCreate}
                onMeasurementUpdate={handleMeasurementUpdate}
                onMeasurementSelect={setSelectedMeasurementId}
                onMeasurementDelete={handleMeasurementDelete}
              />
            </div>
          )}
        </div>

        {/* Side Panel */}
        {showList && (
          <div className="w-96 flex flex-col border-l bg-card">
            {selectedMeasurement ? (
              <div className="flex-1 overflow-auto p-4">
                <TakeoffItemCard
                  measurement={selectedMeasurement}
                  scale={scale}
                  onUpdate={handleMeasurementUpdate}
                  onDelete={handleMeasurementDelete}
                  onClose={() => setSelectedMeasurementId(null)}
                />
              </div>
            ) : (
              <TakeoffItemsList
                measurements={canvasMeasurements}
                scale={scale}
                selectedId={selectedMeasurementId}
                onSelect={setSelectedMeasurementId}
                onDelete={handleMeasurementDelete}
                onUpdate={handleMeasurementUpdate}
              />
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CalibrationDialog
        open={showCalibration}
        onOpenChange={setShowCalibration}
        calibrationPoints={calibrationPoints}
        onCalibrationComplete={handleCalibrationComplete}
      />

      <AssemblyPicker
        open={showAssemblyPicker}
        onOpenChange={setShowAssemblyPicker}
        projectId={projectId}
        onSelect={(assembly) => {
          logger.log('Selected assembly:', assembly)
          // TODO: Apply assembly to selected measurements
        }}
      />

      {/* Summary/Export Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Measurements</DialogTitle>
          </DialogHeader>
          <TakeoffSummary
            measurements={canvasMeasurements}
            scale={scale}
            projectName={`Project ${projectId}`}
            documentName={`Document ${documentId}`}
            onClose={() => setShowSummary(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      {templateDialogMode && userProfile && (
        <TakeoffTemplateDialog
          open={templateDialogMode !== null}
          onOpenChange={(open) => !open && setTemplateDialogMode(null)}
          mode={templateDialogMode}
          projectId={projectId}
          companyId={userProfile.company_id ?? ''}
          currentUserId={user?.id ?? ''}
          currentMeasurementType={selectedMeasurement?.type}
          existingTemplate={undefined}
          templateData={
            templateDialogMode === 'create' && selectedMeasurement
              ? {
                  color: selectedMeasurement.color,
                  dropHeight: selectedMeasurement.dropHeight,
                  pitch: selectedMeasurement.pitch,
                  height: selectedMeasurement.height,
                  depth: selectedMeasurement.depth,
                }
              : undefined
          }
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  )
}
