// File: /src/features/takeoffs/utils/coordinateCompression.ts
// Coordinate compression using Ramer-Douglas-Peucker algorithm
// Reduces point count while preserving shape accuracy

import pako from 'pako'
import type { Point } from './measurements'

/**
 * Compression result with statistics
 */
export interface CompressionResult {
  original: Point[]
  compressed: Point[]
  originalCount: number
  compressedCount: number
  reductionPercent: number
  epsilon: number
}

/**
 * Ramer-Douglas-Peucker algorithm for polyline simplification
 * Reduces point count while maintaining shape within tolerance
 *
 * @param points - Array of points to simplify
 * @param epsilon - Maximum distance from simplified line (higher = more aggressive)
 * @returns Simplified array of points
 */
export function simplifyPolyline(points: Point[], epsilon: number = 2.0): Point[] {
  if (points.length <= 2) return points

  // Find the point with maximum distance from line segment
  let maxDistance = 0
  let index = 0

  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const leftPoints = simplifyPolyline(points.slice(0, index + 1), epsilon)
    const rightPoints = simplifyPolyline(points.slice(index), epsilon)

    // Concatenate and remove duplicate middle point
    return [...leftPoints.slice(0, -1), ...rightPoints]
  } else {
    // If max distance is less than epsilon, return just endpoints
    return [start, end]
  }
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  // If line segment is actually a point
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
    )
  }

  // Calculate perpendicular distance
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)

  if (t < 0) {
    // Beyond start point
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
    )
  } else if (t > 1) {
    // Beyond end point
    return Math.sqrt(
      (point.x - lineEnd.x) ** 2 + (point.y - lineEnd.y) ** 2
    )
  } else {
    // Perpendicular distance
    const projX = lineStart.x + t * dx
    const projY = lineStart.y + t * dy
    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2)
  }
}

/**
 * Simplify polygon (closed shape)
 * Ensures first and last points remain the same
 */
export function simplifyPolygon(points: Point[], epsilon: number = 2.0): Point[] {
  if (points.length <= 3) return points

  // Close the polygon if not already closed
  const isClosed = points[0].x === points[points.length - 1].x &&
                   points[0].y === points[points.length - 1].y

  const workingPoints = isClosed ? points : [...points, points[0]]

  // Apply RDP algorithm
  const simplified = simplifyPolyline(workingPoints, epsilon)

  // Remove duplicate last point if we added it
  if (!isClosed && simplified.length > 1) {
    return simplified.slice(0, -1)
  }

  return simplified
}

/**
 * Compress points with statistics
 */
export function compressPoints(
  points: Point[],
  epsilon: number = 2.0,
  isPolygon: boolean = false
): CompressionResult {
  const compressed = isPolygon
    ? simplifyPolygon(points, epsilon)
    : simplifyPolyline(points, epsilon)

  const originalCount = points.length
  const compressedCount = compressed.length
  const reductionPercent = originalCount > 0
    ? ((originalCount - compressedCount) / originalCount) * 100
    : 0

  return {
    original: points,
    compressed,
    originalCount,
    compressedCount,
    reductionPercent,
    epsilon,
  }
}

/**
 * Adaptive epsilon selection based on point density
 * Higher density = more aggressive compression
 */
export function calculateAdaptiveEpsilon(
  points: Point[],
  targetReduction: number = 0.5 // Target 50% reduction
): number {
  if (points.length < 10) return 1.0

  // Calculate average point spacing
  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    totalDistance += Math.sqrt(dx * dx + dy * dy)
  }

  const avgSpacing = totalDistance / (points.length - 1)

  // Start with epsilon proportional to average spacing
  let epsilon = avgSpacing * 0.5

  // Iteratively adjust to meet target reduction
  for (let iteration = 0; iteration < 5; iteration++) {
    const result = compressPoints(points, epsilon, false)
    const actualReduction = result.reductionPercent / 100

    if (Math.abs(actualReduction - targetReduction) < 0.1) {
      break // Close enough
    }

    // Adjust epsilon
    if (actualReduction < targetReduction) {
      epsilon *= 1.5 // More aggressive
    } else {
      epsilon *= 0.7 // Less aggressive
    }
  }

  return epsilon
}

/**
 * Compress points to gzip for storage/transmission
 */
export function gzipCompress(points: Point[]): Uint8Array {
  const json = JSON.stringify(points)
  const compressed = pako.gzip(json)
  return compressed
}

/**
 * Decompress gzip points
 */
export function gzipDecompress(compressed: Uint8Array): Point[] {
  const decompressed = pako.ungzip(compressed, { to: 'string' })
  return JSON.parse(decompressed) as Point[]
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize === 0) return 0
  return (1 - compressedSize / originalSize) * 100
}

/**
 * Estimate memory size of points array in bytes
 */
export function estimatePointsSize(points: Point[]): number {
  // Each point has 2 numbers (x, y), each number is ~8 bytes (float64)
  return points.length * 2 * 8
}

/**
 * Combined compression: RDP + gzip
 * Provides maximum compression for storage
 */
export function fullyCompress(
  points: Point[],
  epsilon?: number
): { data: Uint8Array; stats: CompressionResult } {
  // First apply RDP simplification
  const adaptiveEpsilon = epsilon ?? calculateAdaptiveEpsilon(points, 0.6)
  const simplified = compressPoints(points, adaptiveEpsilon, false)

  // Then gzip compress
  const gzipped = gzipCompress(simplified.compressed)

  return {
    data: gzipped,
    stats: {
      ...simplified,
      compressedCount: gzipped.length,
    },
  }
}

/**
 * Fully decompress: ungzip + restore
 */
export function fullyDecompress(data: Uint8Array): Point[] {
  return gzipDecompress(data)
}

/**
 * Batch compress multiple measurement point arrays
 */
export function batchCompress(
  measurements: Array<{ id: string; points: Point[] }>,
  epsilon: number = 2.0
): Array<{ id: string; compressed: Point[]; stats: CompressionResult }> {
  return measurements.map((m) => {
    const result = compressPoints(m.points, epsilon, false)
    return {
      id: m.id,
      compressed: result.compressed,
      stats: result,
    }
  })
}

/**
 * Quality check: ensure compressed shape is similar to original
 * Returns true if compression quality is acceptable
 */
export function validateCompressionQuality(
  original: Point[],
  compressed: Point[],
  maxError: number = 5.0 // Maximum average error in pixels
): { valid: boolean; averageError: number; maxPointError: number } {
  if (compressed.length === 0) {
    return { valid: false, averageError: Infinity, maxPointError: Infinity }
  }

  let totalError = 0
  let maxPointError = 0

  // For each original point, find distance to closest compressed line segment
  for (const point of original) {
    let minDist = Infinity

    for (let i = 0; i < compressed.length - 1; i++) {
      const dist = perpendicularDistance(point, compressed[i], compressed[i + 1])
      if (dist < minDist) minDist = dist
    }

    totalError += minDist
    if (minDist > maxPointError) maxPointError = minDist
  }

  const averageError = totalError / original.length
  const valid = averageError <= maxError

  return { valid, averageError, maxPointError }
}
