// File: /src/features/documents/services/visual-diff.ts
// Visual diff service for comparing document versions using pixelmatch

import pixelmatch from 'pixelmatch'
import type { ChangeRegion } from '../types/markup'

/**
 * Result of a visual comparison between two images
 */
export interface DiffResult {
  changeRegions: ChangeRegion[]
  overallChangePercentage: number
  diffImageData: ImageData
  totalPixels: number
  changedPixels: number
}

/**
 * Configuration options for the diff algorithm
 */
export interface DiffOptions {
  /** Pixel matching threshold (0-1). Higher = more tolerant. Default: 0.1 */
  threshold?: number
  /** Minimum region size in pixels to report. Default: 100 (10x10) */
  minRegionSize?: number
  /** Merge regions within this pixel distance. Default: 20 */
  mergeDistance?: number
  /** Include anti-aliased pixels in comparison. Default: false */
  includeAA?: boolean
}

const DEFAULT_OPTIONS: Required<DiffOptions> = {
  threshold: 0.1,
  minRegionSize: 100,
  mergeDistance: 20,
  includeAA: false,
}

/**
 * Compare two canvases and return the diff result with change regions
 */
export function compareCanvasImages(
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  options: DiffOptions = {}
): DiffResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Get canvas dimensions - use the larger of the two
  const width = Math.max(canvas1.width, canvas2.width)
  const height = Math.max(canvas1.height, canvas2.height)

  // Create normalized canvases if sizes differ
  const ctx1 = getCanvasContext(canvas1, width, height)
  const ctx2 = getCanvasContext(canvas2, width, height)

  const img1 = ctx1.getImageData(0, 0, width, height)
  const img2 = ctx2.getImageData(0, 0, width, height)

  // Create output image data for the diff
  const diffImageData = new ImageData(width, height)

  // Run pixelmatch comparison
  const changedPixels = pixelmatch(
    img1.data,
    img2.data,
    diffImageData.data,
    width,
    height,
    {
      threshold: opts.threshold,
      includeAA: opts.includeAA,
      alpha: 0.1,
      diffColor: [255, 0, 0],      // Red for differences
      diffColorAlt: [0, 255, 0],   // Green for anti-aliased
    }
  )

  const totalPixels = width * height
  const overallChangePercentage = (changedPixels / totalPixels) * 100

  // Find change regions by clustering changed pixels
  const changeRegions = findChangeRegions(
    diffImageData,
    width,
    height,
    opts.minRegionSize,
    opts.mergeDistance
  )

  return {
    changeRegions,
    overallChangePercentage,
    diffImageData,
    totalPixels,
    changedPixels,
  }
}

/**
 * Get canvas context, resizing if necessary to match target dimensions
 */
function getCanvasContext(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): CanvasRenderingContext2D {
  // If dimensions match, return existing context
  if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
    const ctx = sourceCanvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas 2d context')
    return ctx
  }

  // Create a new canvas with target dimensions
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create canvas 2d context')

  // Draw the source canvas onto the new canvas (will be positioned at 0,0)
  ctx.fillStyle = 'white' // Fill background with white
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(sourceCanvas, 0, 0)

  return ctx
}

/**
 * Find change regions by clustering changed pixels using connected components
 */
function findChangeRegions(
  diffImageData: ImageData,
  width: number,
  height: number,
  minRegionSize: number,
  mergeDistance: number
): ChangeRegion[] {
  const data = diffImageData.data

  // Create a binary map of changed pixels (red channel > 0 means changed)
  const changedPixelMap = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    // Check if pixel is marked as changed (red or green in pixelmatch output)
    if (data[i] > 100 || data[i + 1] > 100) {
      changedPixelMap[pixelIndex] = 1
    }
  }

  // Find connected components using union-find or flood fill
  const visited = new Uint8Array(width * height)
  const boundingBoxes: BoundingBox[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (changedPixelMap[idx] === 1 && visited[idx] === 0) {
        // Start flood fill from this pixel
        const box = floodFill(changedPixelMap, visited, width, height, x, y)
        if (box.area >= minRegionSize) {
          boundingBoxes.push(box)
        }
      }
    }
  }

  // Merge nearby bounding boxes
  const mergedBoxes = mergeNearbyBoxes(boundingBoxes, mergeDistance)

  // Convert to ChangeRegion format
  return mergedBoxes.map((box, index) => ({
    id: `change-${index}-${Date.now()}`,
    x: box.minX,
    y: box.minY,
    width: box.maxX - box.minX + 1,
    height: box.maxY - box.minY + 1,
    changeType: 'modified' as const,
    confidence: Math.min(1, box.area / 1000), // Scale confidence by region size
    description: `Change region ${index + 1}: ${box.area} pixels changed`,
  }))
}

interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  area: number
}

/**
 * Flood fill to find connected changed pixels and return bounding box
 */
function floodFill(
  changedPixelMap: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): BoundingBox {
  const stack: [number, number][] = [[startX, startY]]
  let minX = startX
  let maxX = startX
  let minY = startY
  let maxY = startY
  let area = 0

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    const idx = y * width + x

    if (x < 0 || x >= width || y < 0 || y >= height) continue
    if (visited[idx] === 1) continue
    if (changedPixelMap[idx] !== 1) continue

    visited[idx] = 1
    area++

    // Update bounding box
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    // Add neighbors (4-connectivity)
    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
  }

  return { minX, maxX, minY, maxY, area }
}

/**
 * Merge bounding boxes that are within mergeDistance of each other
 */
function mergeNearbyBoxes(boxes: BoundingBox[], mergeDistance: number): BoundingBox[] {
  if (boxes.length === 0) return []

  // Sort by position for more efficient merging
  const sorted = [...boxes].sort((a, b) => a.minY - b.minY || a.minX - b.minX)
  const merged: BoundingBox[] = []
  const used = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue

    let current = { ...sorted[i] }
    used.add(i)

    // Keep merging until no more merges possible
    let changed = true
    while (changed) {
      changed = false
      for (let j = 0; j < sorted.length; j++) {
        if (used.has(j)) continue

        const other = sorted[j]
        if (boxesOverlapOrNear(current, other, mergeDistance)) {
          current = mergeBoxes(current, other)
          used.add(j)
          changed = true
        }
      }
    }

    merged.push(current)
  }

  return merged
}

/**
 * Check if two boxes overlap or are within distance of each other
 */
function boxesOverlapOrNear(a: BoundingBox, b: BoundingBox, distance: number): boolean {
  return !(
    a.maxX + distance < b.minX ||
    b.maxX + distance < a.minX ||
    a.maxY + distance < b.minY ||
    b.maxY + distance < a.minY
  )
}

/**
 * Merge two bounding boxes into one
 */
function mergeBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
    area: a.area + b.area,
  }
}

/**
 * Generate a diff overlay canvas that can be displayed
 */
export function generateDiffOverlayCanvas(diffImageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = diffImageData.width
  canvas.height = diffImageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create canvas context')

  ctx.putImageData(diffImageData, 0, 0)
  return canvas
}

/**
 * Convert diff image data to a data URL for display
 */
export function diffImageDataToDataUrl(diffImageData: ImageData): string {
  const canvas = generateDiffOverlayCanvas(diffImageData)
  return canvas.toDataURL('image/png')
}

/**
 * Analyze change types based on pixel colors in source images
 * This provides more detailed analysis of what changed
 */
export function analyzeChangeTypes(
  img1Data: ImageData,
  img2Data: ImageData,
  region: ChangeRegion
): 'added' | 'removed' | 'modified' {
  const width = img1Data.width
  let whitePixels1 = 0
  let whitePixels2 = 0
  let totalPixels = 0

  // Sample pixels in the region
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      if (x >= width || y >= img1Data.height) continue

      const idx = (y * width + x) * 4
      totalPixels++

      // Check if pixel is white (empty) in each image
      const isWhite1 = img1Data.data[idx] > 250 && img1Data.data[idx + 1] > 250 && img1Data.data[idx + 2] > 250
      const isWhite2 = img2Data.data[idx] > 250 && img2Data.data[idx + 1] > 250 && img2Data.data[idx + 2] > 250

      if (isWhite1) whitePixels1++
      if (isWhite2) whitePixels2++
    }
  }

  if (totalPixels === 0) return 'modified'

  const whiteRatio1 = whitePixels1 / totalPixels
  const whiteRatio2 = whitePixels2 / totalPixels

  // If region was mostly white in v1 but not in v2, content was added
  if (whiteRatio1 > 0.7 && whiteRatio2 < 0.3) return 'added'
  // If region is mostly white in v2 but wasn't in v1, content was removed
  if (whiteRatio2 > 0.7 && whiteRatio1 < 0.3) return 'removed'
  // Otherwise it's a modification
  return 'modified'
}
