// File: /src/features/checklists/components/PhotoMetadataDisplay.tsx
// Display photo EXIF metadata in a readable format

import { MapPin, Clock, Camera, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PhotoMetadata } from '@/types/offline'
import {
  formatGPSCoordinates,
  formatExposureTime,
  formatFNumber,
} from '../utils/exifUtils'

interface PhotoMetadataDisplayProps {
  metadata: PhotoMetadata
  compact?: boolean
}

export function PhotoMetadataDisplay({
  metadata,
  compact = false,
}: PhotoMetadataDisplayProps) {
  const hasGPS = metadata.latitude !== undefined && metadata.longitude !== undefined
  const hasCamera = metadata.make || metadata.model
  const hasCameraSettings = metadata.focalLength || metadata.exposureTime || metadata.fNumber || metadata.iso
  const hasTimestamp = metadata.timestamp

  // If no metadata, don't render anything
  if (!hasGPS && !hasCamera && !hasCameraSettings && !hasTimestamp) {
    return null
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        {hasGPS && (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <MapPin className="w-3 h-3 mr-1" />
            GPS
          </Badge>
        )}
        {hasTimestamp && (
          <Badge variant="outline" className="text-gray-600 border-gray-600">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(metadata.timestamp!).toLocaleString()}
          </Badge>
        )}
        {hasCamera && (
          <Badge variant="outline" className="text-purple-600 border-purple-600">
            <Camera className="w-3 h-3 mr-1" />
            {metadata.make} {metadata.model}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-gray-600" />
        <h4 className="text-sm font-medium text-gray-700">Photo Metadata</h4>
      </div>

      <div className="space-y-3">
        {/* GPS Coordinates */}
        {hasGPS && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Location</span>
            </div>
            {(() => {
              const formatted = formatGPSCoordinates(metadata.latitude!, metadata.longitude!)
              return (
                <div className="ml-6 text-sm text-gray-600">
                  <div>{formatted.lat}, {formatted.lng}</div>
                  {metadata.altitude && (
                    <div className="text-xs text-gray-500">
                      Altitude: {metadata.altitude.toFixed(1)}m
                    </div>
                  )}
                  <a
                    href={formatted.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    View on Google Maps →
                  </a>
                </div>
              )
            })()}
          </div>
        )}

        {/* Timestamp */}
        {hasTimestamp && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Captured</span>
            </div>
            <div className="ml-6 text-sm text-gray-600">
              {new Date(metadata.timestamp!).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </div>
        )}

        {/* Camera Info */}
        {hasCamera && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Camera className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Camera</span>
            </div>
            <div className="ml-6 text-sm text-gray-600">
              {metadata.make && metadata.model
                ? `${metadata.make} ${metadata.model}`
                : metadata.make || metadata.model}
            </div>
          </div>
        )}

        {/* Camera Settings */}
        {hasCameraSettings && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </div>
            <div className="ml-6 text-sm text-gray-600 space-y-1">
              {metadata.focalLength && (
                <div>Focal Length: {metadata.focalLength}mm</div>
              )}
              {metadata.exposureTime && (
                <div>Exposure: {formatExposureTime(metadata.exposureTime)}</div>
              )}
              {metadata.fNumber && (
                <div>Aperture: {formatFNumber(metadata.fNumber)}</div>
              )}
              {metadata.iso && (
                <div>ISO: {metadata.iso}</div>
              )}
            </div>
          </div>
        )}

        {/* Image Dimensions */}
        {(metadata.width || metadata.height) && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Dimensions: {metadata.width} × {metadata.height} pixels
          </div>
        )}
      </div>
    </Card>
  )
}
