/**
 * PhotoDetailDialog Component
 *
 * Full-screen dialog for viewing photo details, metadata, and actions.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  X,
  Download,
  Trash2,
  Edit2,
  Save,
  MapPin,
  Calendar,
  Camera,
  FileImage,
  Info,
  Link2,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/types/photo-management'
import { useUpdatePhoto } from '../hooks/usePhotos'

interface PhotoDetailDialogProps {
  photo: Photo
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
}

export function PhotoDetailDialog({
  photo,
  isOpen,
  onClose,
  onDelete,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: PhotoDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCaption, setEditedCaption] = useState(photo.caption || '')
  const [editedTags, setEditedTags] = useState(photo.tags?.join(', ') || '')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [copied, setCopied] = useState(false)

  const updatePhoto = useUpdatePhoto()

  const handleSave = async () => {
    await updatePhoto.mutateAsync({
      id: photo.id,
      dto: {
        caption: editedCaption,
        tags: editedTags.split(',').map((t) => t.trim()).filter(Boolean),
      },
    })
    setIsEditing(false)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(photo.fileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = photo.fileUrl
    link.download = photo.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatGPS = (lat?: number, lng?: number) => {
    if (!lat || !lng) return null
    const latDir = lat >= 0 ? 'N' : 'S'
    const lngDir = lng >= 0 ? 'E' : 'W'
    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`
  }

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'progress':
        return 'default'
      case 'issue':
        return 'destructive'
      case 'safety':
        return 'warning'
      case 'inspection':
        return 'secondary'
      case 'delivery':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              {photo.fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {hasPrevious && (
                <Button variant="outline" size="icon" onClick={onPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {hasNext && (
                <Button variant="outline" size="icon" onClick={onNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Image Preview */}
          <div className="flex-1 bg-black/95 flex items-center justify-center relative">
            <img
              src={photo.fileUrl}
              alt={photo.caption || photo.fileName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />

            {/* Image Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-lg p-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6 bg-white/30" />
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Details Panel */}
          <div className="w-[350px] border-l overflow-y-auto">
            <Tabs defaultValue="details" className="h-full">
              <TabsList className="w-full justify-start rounded-none border-b h-12 p-0 bg-transparent">
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="metadata"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Metadata
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="p-4 space-y-6 m-0">
                {/* Caption */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Caption</Label>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave}>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false)
                            setEditedCaption(photo.caption || '')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {photo.caption || 'No caption'}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Category & Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={getCategoryBadgeVariant(photo.photoCategory || '') as any}>
                      {photo.photoCategory}
                    </Badge>
                    {photo.reviewStatus && (
                      <Badge
                        variant={
                          photo.reviewStatus === 'approved'
                            ? 'default'
                            : photo.reviewStatus === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {photo.reviewStatus}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tags</Label>
                  {isEditing ? (
                    <Input
                      value={editedTags}
                      onChange={(e) => setEditedTags(e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {photo.tags && photo.tags.length > 0 ? (
                        photo.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No tags
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Date Information */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Captured</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(photo.capturedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Uploaded</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(photo.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Location */}
                {photo.latitude && photo.longitude && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Location</Label>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 mt-1 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {formatGPS(photo.latitude, photo.longitude)}
                          </p>
                          {photo.gpsAccuracy && (
                            <p className="text-xs text-muted-foreground">
                              Accuracy: ±{photo.gpsAccuracy.toFixed(0)}m
                            </p>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={() => {
                              window.open(
                                `https://maps.google.com/?q=${photo.latitude},${photo.longitude}`,
                                '_blank'
                              )
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View in Google Maps
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Building & Floor */}
                {(photo.building || photo.floor) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Location Info</Label>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {photo.building && (
                          <div>
                            <span className="text-muted-foreground">Building:</span>
                            <p className="font-medium">{photo.building}</p>
                          </div>
                        )}
                        {photo.floor && (
                          <div>
                            <span className="text-muted-foreground">Floor:</span>
                            <p className="font-medium">{photo.floor}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* File URL */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">File URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={photo.fileUrl}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyUrl}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Actions</Label>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Photo
                    </Button>
                    {onDelete && (
                      <Button
                        variant="destructive"
                        className="justify-start"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Photo
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="p-4 space-y-4 m-0">
                {/* File Info */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">File Information</Label>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Size</span>
                      <p className="font-medium">{formatFileSize(photo.fileSize)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type</span>
                      <p className="font-medium">{photo.mimeType || 'Unknown'}</p>
                    </div>
                    {photo.width && photo.height && (
                      <div>
                        <span className="text-muted-foreground">Dimensions</span>
                        <p className="font-medium">
                          {photo.width} × {photo.height}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Camera Info */}
                {(photo.cameraMake || photo.cameraModel || photo.lensInfo) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Camera</Label>
                      <div className="space-y-2 text-sm">
                        {photo.cameraMake && (
                          <div>
                            <span className="text-muted-foreground">Make:</span>
                            <p className="font-medium">{photo.cameraMake}</p>
                          </div>
                        )}
                        {photo.cameraModel && (
                          <div>
                            <span className="text-muted-foreground">Model:</span>
                            <p className="font-medium">{photo.cameraModel}</p>
                          </div>
                        )}
                        {photo.lensInfo && (
                          <div>
                            <span className="text-muted-foreground">Lens:</span>
                            <p className="font-medium">{photo.lensInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* EXIF Settings */}
                {(photo.focalLength ||
                  photo.aperture ||
                  photo.shutterSpeed ||
                  photo.iso) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Exposure Settings
                      </Label>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {photo.focalLength && (
                          <div>
                            <span className="text-muted-foreground">
                              Focal Length
                            </span>
                            <p className="font-medium">{photo.focalLength}mm</p>
                          </div>
                        )}
                        {photo.aperture && (
                          <div>
                            <span className="text-muted-foreground">Aperture</span>
                            <p className="font-medium">f/{photo.aperture}</p>
                          </div>
                        )}
                        {photo.shutterSpeed && (
                          <div>
                            <span className="text-muted-foreground">
                              Shutter Speed
                            </span>
                            <p className="font-medium">{photo.shutterSpeed}</p>
                          </div>
                        )}
                        {photo.iso && (
                          <div>
                            <span className="text-muted-foreground">ISO</span>
                            <p className="font-medium">{photo.iso}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* GPS Details */}
                {photo.latitude && photo.longitude && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">GPS Details</Label>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Latitude</span>
                          <p className="font-medium font-mono">
                            {photo.latitude.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Longitude</span>
                          <p className="font-medium font-mono">
                            {photo.longitude.toFixed(6)}
                          </p>
                        </div>
                        {photo.altitude && (
                          <div>
                            <span className="text-muted-foreground">Altitude</span>
                            <p className="font-medium">{photo.altitude.toFixed(1)}m</p>
                          </div>
                        )}
                        {photo.heading && (
                          <div>
                            <span className="text-muted-foreground">Heading</span>
                            <p className="font-medium">{photo.heading.toFixed(0)}°</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Weather */}
                {(photo.weatherCondition || photo.temperature) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Weather</Label>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {photo.weatherCondition && (
                          <div>
                            <span className="text-muted-foreground">Condition</span>
                            <p className="font-medium capitalize">
                              {photo.weatherCondition}
                            </p>
                          </div>
                        )}
                        {photo.temperature && (
                          <div>
                            <span className="text-muted-foreground">Temperature</span>
                            <p className="font-medium">{photo.temperature}°F</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* AI/OCR Data */}
                {(photo.ocrText || photo.aiTags || photo.aiDescription) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Analysis</Label>
                    {photo.aiDescription && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Description:</span>
                        <p>{photo.aiDescription}</p>
                      </div>
                    )}
                    {photo.aiTags && photo.aiTags.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">AI Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {photo.aiTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {photo.ocrText && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">OCR Text:</span>
                        <p className="mt-1 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap">
                          {photo.ocrText}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PhotoDetailDialog
