// File: /src/features/takeoffs/utils/spatialIndex.ts
// Spatial indexing with R-Tree for efficient viewport culling
// Optimizes canvas rendering by only drawing visible measurements

import RBush from 'rbush'
import type { Point } from './measurements'

/**
 * Bounding box for spatial queries
 */
export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Indexed measurement item with bounding box
 */
export interface IndexedMeasurement extends BoundingBox {
  id: string
  type: string
  points: Point[]
}

/**
 * Spatial index for takeoff measurements
 * Uses R-Tree for O(log n) spatial queries
 */
export class TakeoffSpatialIndex {
  private tree: RBush<IndexedMeasurement>

  constructor() {
    this.tree = new RBush<IndexedMeasurement>()
  }

  /**
   * Calculate bounding box from points
   */
  private calculateBounds(points: Point[]): BoundingBox {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }

    let minX = points[0].x
    let minY = points[0].y
    let maxX = points[0].x
    let maxY = points[0].y

    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      if (point.x < minX) {minX = point.x}
      if (point.y < minY) {minY = point.y}
      if (point.x > maxX) {maxX = point.x}
      if (point.y > maxY) {maxY = point.y}
    }

    return { minX, minY, maxX, maxY }
  }

  /**
   * Add a measurement to the index
   */
  insert(id: string, type: string, points: Point[]): void {
    const bounds = this.calculateBounds(points)
    const item: IndexedMeasurement = {
      id,
      type,
      points,
      ...bounds,
    }
    this.tree.insert(item)
  }

  /**
   * Add multiple measurements at once (bulk load)
   * More efficient than individual inserts
   */
  load(measurements: Array<{ id: string; type: string; points: Point[] }>): void {
    const items = measurements.map((m) => ({
      id: m.id,
      type: m.type,
      points: m.points,
      ...this.calculateBounds(m.points),
    }))
    this.tree.load(items)
  }

  /**
   * Remove a measurement from the index
   */
  remove(id: string): boolean {
    const items = this.tree.all()
    const item = items.find((i: IndexedMeasurement) => i.id === id)
    if (item) {
      this.tree.remove(item)
      return true
    }
    return false
  }

  /**
   * Update a measurement (remove + insert)
   */
  update(id: string, type: string, points: Point[]): void {
    this.remove(id)
    this.insert(id, type, points)
  }

  /**
   * Clear all measurements from the index
   */
  clear(): void {
    this.tree.clear()
  }

  /**
   * Get all measurements in the index
   */
  getAll(): IndexedMeasurement[] {
    return this.tree.all()
  }

  /**
   * Search for measurements within a bounding box
   * This is the core viewport culling function
   */
  search(bbox: BoundingBox): IndexedMeasurement[] {
    return this.tree.search(bbox)
  }

  /**
   * Search for measurements that intersect with a viewport
   * Returns only measurements visible in the current view
   */
  searchViewport(viewport: {
    x: number
    y: number
    width: number
    height: number
  }): IndexedMeasurement[] {
    return this.search({
      minX: viewport.x,
      minY: viewport.y,
      maxX: viewport.x + viewport.width,
      maxY: viewport.y + viewport.height,
    })
  }

  /**
   * Find measurements near a point (for selection/hover)
   */
  searchNearPoint(point: Point, radius: number): IndexedMeasurement[] {
    return this.search({
      minX: point.x - radius,
      minY: point.y - radius,
      maxX: point.x + radius,
      maxY: point.y + radius,
    })
  }

  /**
   * Get count of indexed measurements
   */
  size(): number {
    return this.tree.all().length
  }

  /**
   * Check if index is empty
   */
  isEmpty(): boolean {
    return this.size() === 0
  }

  /**
   * Get measurement by ID
   */
  getById(id: string): IndexedMeasurement | undefined {
    return this.tree.all().find((item: IndexedMeasurement) => item.id === id)
  }

  /**
   * Check if measurement exists in index
   */
  has(id: string): boolean {
    return this.getById(id) !== undefined
  }
}

/**
 * Calculate expanded bounding box with padding
 * Useful for pre-loading measurements just outside viewport
 */
export function expandBounds(bbox: BoundingBox, padding: number): BoundingBox {
  return {
    minX: bbox.minX - padding,
    minY: bbox.minY - padding,
    maxX: bbox.maxX + padding,
    maxY: bbox.maxY + padding,
  }
}

/**
 * Check if two bounding boxes intersect
 */
export function boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

/**
 * Check if a point is inside a bounding box
 */
export function pointInBounds(point: Point, bounds: BoundingBox): boolean {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY
}

/**
 * Calculate area of bounding box
 */
export function boundsArea(bounds: BoundingBox): number {
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)
}

/**
 * Merge multiple bounding boxes into one
 */
export function mergeBounds(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  let minX = boxes[0].minX
  let minY = boxes[0].minY
  let maxX = boxes[0].maxX
  let maxY = boxes[0].maxY

  for (let i = 1; i < boxes.length; i++) {
    const box = boxes[i]
    if (box.minX < minX) {minX = box.minX}
    if (box.minY < minY) {minY = box.minY}
    if (box.maxX > maxX) {maxX = box.maxX}
    if (box.maxY > maxY) {maxY = box.maxY}
  }

  return { minX, minY, maxX, maxY }
}
