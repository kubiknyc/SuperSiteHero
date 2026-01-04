// File: /src/features/documents/components/RevisionCloudManager.tsx
// Manages revision clouds on drawings with auto-detection from version comparison

import { useState, useMemo, useCallback } from 'react'
import {
  Cloud,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  GitCompare,
  Calendar,
  User,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  History,
  ChevronDown,
  ChevronRight,
  Triangle,
  Settings,
  Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  useRevisionClouds,
  useCreateRevisionCloud,
  useDeleteRevisionCloud,
  useGenerateRevisionClouds,
} from '../hooks/useDrawingSetManagement'
import { useCompareVersions, useDocumentVersionsForComparison } from '../hooks/useDocumentComparison'
import type {
  RevisionCloud,
  RevisionCloudGenerationOptions,
} from '../types/drawing-set'
import type { ChangeRegion } from '../types/markup'

interface RevisionCloudManagerProps {
  documentId: string
  projectId: string
  onCloudClick?: (cloud: RevisionCloud) => void
  onCloudHover?: (cloud: RevisionCloud | null) => void
  className?: string
}

/**
 * RevisionCloudManager Component
 *
 * Manages revision clouds on drawings including:
 * - Viewing existing revision clouds
 * - Auto-generating clouds from version comparison
 * - Manual cloud creation
 * - Revision history tracking
 * - Cloud visibility controls
 */
export function RevisionCloudManager({
  documentId,
  projectId,
  onCloudClick,
  onCloudHover,
  className = '',
}: RevisionCloudManagerProps) {
  // State
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [hiddenClouds, setHiddenClouds] = useState<Set<string>>(new Set())
  const [expandedRevisions, setExpandedRevisions] = useState<Set<string>>(new Set())
  const [generationOptions, setGenerationOptions] = useState<RevisionCloudGenerationOptions>({
    minRegionSize: 100,
    mergeNearbyRegions: true,
    mergeDistance: 20,
    defaultColor: '#FF0000',
    showMarkers: true,
    markerPosition: 'top-right',
  })

  // Queries
  const { data: clouds, isLoading } = useRevisionClouds(documentId)
  const { data: versions } = useDocumentVersionsForComparison(documentId)

  // Mutations
  const createCloud = useCreateRevisionCloud()
  const deleteCloud = useDeleteRevisionCloud()
  const generateClouds = useGenerateRevisionClouds()

  // Group clouds by revision number
  const groupedClouds = useMemo(() => {
    if (!clouds) return {}
    return clouds.reduce((acc, cloud) => {
      const key = cloud.revisionNumber || 'Unassigned'
      if (!acc[key]) acc[key] = []
      acc[key].push(cloud)
      return acc
    }, {} as Record<string, RevisionCloud[]>)
  }, [clouds])

  // Get revision dates for sorting
  const revisionOrder = useMemo(() => {
    const revisions = Object.keys(groupedClouds)
    return revisions.sort((a, b) => {
      const aCloud = groupedClouds[a][0]
      const bCloud = groupedClouds[b][0]
      const aDate = new Date(aCloud.revisionDate || aCloud.createdAt)
      const bDate = new Date(bCloud.revisionDate || bCloud.createdAt)
      return bDate.getTime() - aDate.getTime()
    })
  }, [groupedClouds])

  // Toggle revision group
  const toggleRevision = useCallback((revision: string) => {
    setExpandedRevisions(prev => {
      const next = new Set(prev)
      if (next.has(revision)) {
        next.delete(revision)
      } else {
        next.add(revision)
      }
      return next
    })
  }, [])

  // Toggle cloud visibility
  const toggleCloudVisibility = useCallback((cloudId: string) => {
    setHiddenClouds(prev => {
      const next = new Set(prev)
      if (next.has(cloudId)) {
        next.delete(cloudId)
      } else {
        next.add(cloudId)
      }
      return next
    })
  }, [])

  // Delete cloud
  const handleDelete = async (cloudId: string) => {
    try {
      await deleteCloud.mutateAsync(cloudId)
      toast.success('Revision cloud deleted')
    } catch (error) {
      toast.error('Failed to delete revision cloud')
    }
  }

  // Stats
  const stats = useMemo(() => {
    if (!clouds) return { total: 0, autoGenerated: 0, revisions: 0 }
    return {
      total: clouds.length,
      autoGenerated: clouds.filter(c => c.isAutoGenerated).length,
      revisions: Object.keys(groupedClouds).length,
    }
  }, [clouds, groupedClouds])

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="w-5 h-5" />
            Revision Clouds
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGenerateDialog(true)}
              disabled={!versions || versions.length < 2}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Auto-Generate
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Cloud
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Cloud className="w-4 h-4" />
            {stats.total} clouds
          </span>
          <span className="flex items-center gap-1">
            <History className="w-4 h-4" />
            {stats.revisions} revisions
          </span>
          {stats.autoGenerated > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {stats.autoGenerated} auto-generated
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : revisionOrder.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No revision clouds</p>
              <p className="text-sm mt-1">
                Auto-generate from version comparison or add manually
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {revisionOrder.map(revision => (
                <RevisionGroup
                  key={revision}
                  revision={revision}
                  clouds={groupedClouds[revision]}
                  isExpanded={expandedRevisions.has(revision)}
                  onToggle={() => toggleRevision(revision)}
                  hiddenClouds={hiddenClouds}
                  onToggleVisibility={toggleCloudVisibility}
                  onCloudClick={onCloudClick}
                  onCloudHover={onCloudHover}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Generate Dialog */}
      <GenerateCloudsDialog
        open={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        documentId={documentId}
        versions={versions || []}
        options={generationOptions}
        onGenerate={generateClouds.mutateAsync}
        isGenerating={generateClouds.isPending}
      />

      {/* Create Dialog */}
      <CreateCloudDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        documentId={documentId}
        options={generationOptions}
        onCreate={createCloud.mutateAsync}
        isCreating={createCloud.isPending}
      />

      {/* Settings Dialog */}
      <CloudSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        options={generationOptions}
        onSave={setGenerationOptions}
      />
    </Card>
  )
}

// ============================================================
// Sub-components
// ============================================================

interface RevisionGroupProps {
  revision: string
  clouds: RevisionCloud[]
  isExpanded: boolean
  onToggle: () => void
  hiddenClouds: Set<string>
  onToggleVisibility: (cloudId: string) => void
  onCloudClick?: (cloud: RevisionCloud) => void
  onCloudHover?: (cloud: RevisionCloud | null) => void
  onDelete: (cloudId: string) => void
}

function RevisionGroup({
  revision,
  clouds,
  isExpanded,
  onToggle,
  hiddenClouds,
  onToggleVisibility,
  onCloudClick,
  onCloudHover,
  onDelete,
}: RevisionGroupProps) {
  const latestCloud = clouds[0]
  const revisionDate = latestCloud?.revisionDate || latestCloud?.createdAt

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <Badge variant="outline" className="font-mono">
            Rev {revision}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {clouds.length} cloud{clouds.length !== 1 ? 's' : ''}
          </span>
        </div>
        {revisionDate && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(revisionDate), 'MMM d, yyyy')}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="divide-y">
          {clouds.map(cloud => (
            <div
              key={cloud.id}
              className={cn(
                'flex items-center justify-between px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors',
                hiddenClouds.has(cloud.id) && 'opacity-50'
              )}
              onClick={() => onCloudClick?.(cloud)}
              onMouseEnter={() => onCloudHover?.(cloud)}
              onMouseLeave={() => onCloudHover?.(null)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    borderColor: cloud.color,
                    backgroundColor: `${cloud.color}20`,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm truncate">{cloud.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {cloud.isAutoGenerated && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Auto
                      </span>
                    )}
                    {cloud.linkedRfiId && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        RFI
                      </span>
                    )}
                    <span>Page {cloud.pageNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleVisibility(cloud.id)
                  }}
                  title={hiddenClouds.has(cloud.id) ? 'Show cloud' : 'Hide cloud'}
                >
                  {hiddenClouds.has(cloud.id) ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(cloud.id)
                  }}
                  className="text-destructive hover:text-destructive"
                  title="Delete cloud"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface GenerateCloudsDialogProps {
  open: boolean
  onClose: () => void
  documentId: string
  versions: any[]
  options: RevisionCloudGenerationOptions
  onGenerate: (params: any) => Promise<any>
  isGenerating: boolean
}

function GenerateCloudsDialog({
  open,
  onClose,
  documentId,
  versions,
  options,
  onGenerate,
  isGenerating,
}: GenerateCloudsDialogProps) {
  const [selectedVersion1, setSelectedVersion1] = useState('')
  const [selectedVersion2, setSelectedVersion2] = useState('')
  const [revisionNumber, setRevisionNumber] = useState('')
  const [previewRegions, setPreviewRegions] = useState<ChangeRegion[]>([])
  const [isComparing, setIsComparing] = useState(false)

  // Compare selected versions
  const handleCompare = async () => {
    if (!selectedVersion1 || !selectedVersion2) return

    setIsComparing(true)
    // This would use the comparison hook
    // For now, simulate the comparison
    await new Promise(resolve => setTimeout(resolve, 1000))
    setPreviewRegions([
      { id: '1', x: 100, y: 100, width: 200, height: 150, changeType: 'modified', confidence: 0.9 },
      { id: '2', x: 400, y: 300, width: 150, height: 100, changeType: 'added', confidence: 0.85 },
    ])
    setIsComparing(false)
  }

  const handleGenerate = async () => {
    if (previewRegions.length === 0 || !revisionNumber) return

    try {
      await onGenerate({
        documentId,
        changeRegions: previewRegions,
        versionFrom: 1, // Would come from selected versions
        versionTo: 2,
        revisionNumber,
        options,
      })
      toast.success(`Generated ${previewRegions.length} revision cloud(s)`)
      onClose()
      setSelectedVersion1('')
      setSelectedVersion2('')
      setRevisionNumber('')
      setPreviewRegions([])
    } catch (error) {
      toast.error('Failed to generate revision clouds')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Auto-Generate Revision Clouds
          </DialogTitle>
          <DialogDescription>
            Compare two versions to automatically detect changes and create revision clouds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previous Version</Label>
              <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version || 'Unknown'} - {format(new Date(v.created_at), 'MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Current Version</Label>
              <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version || 'Unknown'} - {format(new Date(v.created_at), 'MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleCompare}
            disabled={!selectedVersion1 || !selectedVersion2 || isComparing}
            className="w-full"
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Versions
              </>
            )}
          </Button>

          {/* Preview */}
          {previewRegions.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                Detected Changes ({previewRegions.length})
              </h4>
              <div className="space-y-2">
                {previewRegions.map(region => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{region.changeType}</span>
                    <span className="text-muted-foreground">
                      {region.width}x{region.height}px
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t">
                <Label>Revision Number</Label>
                <Input
                  placeholder="e.g., 1, A, Delta 1"
                  value={revisionNumber}
                  onChange={(e) => setRevisionNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || previewRegions.length === 0 || !revisionNumber}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Generate Clouds
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CreateCloudDialogProps {
  open: boolean
  onClose: () => void
  documentId: string
  options: RevisionCloudGenerationOptions
  onCreate: (cloud: any) => Promise<any>
  isCreating: boolean
}

function CreateCloudDialog({
  open,
  onClose,
  documentId,
  options,
  onCreate,
  isCreating,
}: CreateCloudDialogProps) {
  const [description, setDescription] = useState('')
  const [revisionNumber, setRevisionNumber] = useState('')
  const [color, setColor] = useState(options.defaultColor)
  const [pageNumber, setPageNumber] = useState(1)
  const [markerPosition, setMarkerPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>(
    options.markerPosition
  )

  const handleCreate = async () => {
    if (!description || !revisionNumber) return

    try {
      await onCreate({
        documentId,
        versionFrom: 0,
        versionTo: 1,
        region: {
          points: [
            { x: 100, y: 100 },
            { x: 300, y: 100 },
            { x: 300, y: 200 },
            { x: 100, y: 200 },
          ],
          bounds: { x: 100, y: 100, width: 200, height: 100 },
        },
        description,
        revisionNumber,
        revisionDate: new Date().toISOString(),
        isAutoGenerated: false,
        pageNumber,
        color,
        showMarker: options.showMarkers,
        markerPosition,
      })
      toast.success('Revision cloud created')
      onClose()
      setDescription('')
      setRevisionNumber('')
    } catch (error) {
      toast.error('Failed to create revision cloud')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Revision Cloud</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the revision..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Revision Number</Label>
              <Input
                placeholder="e.g., 1, A"
                value={revisionNumber}
                onChange={(e) => setRevisionNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Page Number</Label>
              <Input
                type="number"
                min={1}
                value={pageNumber}
                onChange={(e) => setPageNumber(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Marker Position</Label>
              <Select value={markerPosition} onValueChange={(v) => setMarkerPosition(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !description || !revisionNumber}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Cloud
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CloudSettingsDialogProps {
  open: boolean
  onClose: () => void
  options: RevisionCloudGenerationOptions
  onSave: (options: RevisionCloudGenerationOptions) => void
}

function CloudSettingsDialog({
  open,
  onClose,
  options,
  onSave,
}: CloudSettingsDialogProps) {
  const [localOptions, setLocalOptions] = useState(options)

  const handleSave = () => {
    onSave(localOptions)
    onClose()
    toast.success('Settings saved')
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revision Cloud Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Minimum Region Size (pixels)</Label>
            <Slider
              value={[localOptions.minRegionSize]}
              onValueChange={([v]) => setLocalOptions({ ...localOptions, minRegionSize: v })}
              min={25}
              max={500}
              step={25}
            />
            <span className="text-sm text-muted-foreground">
              {localOptions.minRegionSize}px minimum
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Merge Nearby Regions</Label>
              <p className="text-sm text-muted-foreground">
                Combine close change regions into one cloud
              </p>
            </div>
            <Switch
              checked={localOptions.mergeNearbyRegions}
              onCheckedChange={(v) => setLocalOptions({ ...localOptions, mergeNearbyRegions: v })}
            />
          </div>

          {localOptions.mergeNearbyRegions && (
            <div className="space-y-3">
              <Label>Merge Distance (pixels)</Label>
              <Slider
                value={[localOptions.mergeDistance]}
                onValueChange={([v]) => setLocalOptions({ ...localOptions, mergeDistance: v })}
                min={5}
                max={100}
                step={5}
              />
              <span className="text-sm text-muted-foreground">
                {localOptions.mergeDistance}px
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Default Cloud Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={localOptions.defaultColor}
                onChange={(e) => setLocalOptions({ ...localOptions, defaultColor: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={localOptions.defaultColor}
                onChange={(e) => setLocalOptions({ ...localOptions, defaultColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Revision Markers</Label>
              <p className="text-sm text-muted-foreground">
                Display delta/revision symbols on clouds
              </p>
            </div>
            <Switch
              checked={localOptions.showMarkers}
              onCheckedChange={(v) => setLocalOptions({ ...localOptions, showMarkers: v })}
            />
          </div>

          {localOptions.showMarkers && (
            <div className="space-y-2">
              <Label>Default Marker Position</Label>
              <Select
                value={localOptions.markerPosition}
                onValueChange={(v) => setLocalOptions({ ...localOptions, markerPosition: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RevisionCloudManager
