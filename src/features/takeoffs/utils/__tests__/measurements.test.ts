// File: /src/features/takeoffs/utils/__tests__/measurements.test.ts
// Tests for measurement calculations

import { describe, it, expect } from 'vitest'
import {
  calculateLinear,
  calculateArea,
  calculateCount,
  calculateLinearWithDrop,
  calculatePitchedArea,
  calculatePitchedLinear,
  calculateSurfaceArea,
  calculateVolume2D,
  convertLinearUnit,
  convertAreaUnit,
  distanceBetweenPoints,
  calculatePolygonArea,
  type Point,
  type ScaleFactor,
} from '../measurements'

describe('measurements', () => {
  const testScale: ScaleFactor = {
    pixelsPerUnit: 10, // 10 pixels = 1 foot
    unit: 'ft',
  }

  describe('Unit Conversions', () => {
    it('should convert feet to inches', () => {
      const result = convertLinearUnit(1, 'ft', 'in')
      expect(result).toBe(12)
    })

    it('should convert inches to feet', () => {
      const result = convertLinearUnit(12, 'in', 'ft')
      expect(result).toBe(1)
    })

    it('should convert square feet to square inches', () => {
      const result = convertAreaUnit(1, 'ft2', 'in2')
      expect(result).toBe(144)
    })

    it('should handle same unit conversion', () => {
      const result = convertLinearUnit(100, 'ft', 'ft')
      expect(result).toBe(100)
    })
  })

  describe('Geometric Calculations', () => {
    it('should calculate distance between two points', () => {
      const p1: Point = { x: 0, y: 0 }
      const p2: Point = { x: 3, y: 4 }
      const distance = distanceBetweenPoints(p1, p2)
      expect(distance).toBe(5) // 3-4-5 triangle
    })

    it('should calculate polygon area (square)', () => {
      const square: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]
      const area = calculatePolygonArea(square)
      expect(area).toBe(10000)
    })

    it('should calculate polygon area (triangle)', () => {
      const triangle: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ]
      const area = calculatePolygonArea(triangle)
      expect(area).toBe(5000)
    })
  })

  describe('Type 1: Linear Measurement', () => {
    it('should calculate linear distance', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }, // 100 pixels = 10 feet
      ]
      const length = calculateLinear(points, testScale, 'ft')
      expect(length).toBe(10)
    })

    it('should handle polyline with multiple segments', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 30, y: 0 }, // 3 feet
        { x: 30, y: 40 }, // 4 feet
      ]
      const length = calculateLinear(points, testScale, 'ft')
      expect(length).toBe(7) // 3 + 4 = 7 feet
    })
  })

  describe('Type 2: Area Measurement', () => {
    it('should calculate area of a square', () => {
      const square: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }, // 10 feet
        { x: 100, y: 100 }, // 10 feet
        { x: 0, y: 100 },
      ]
      const area = calculateArea(square, testScale, 'ft2')
      expect(area).toBe(100) // 10 * 10 = 100 sq ft
    })

    it('should calculate area of a rectangle', () => {
      const rectangle: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }, // 10 feet
        { x: 100, y: 50 }, // 5 feet
        { x: 0, y: 50 },
      ]
      const area = calculateArea(rectangle, testScale, 'ft2')
      expect(area).toBe(50) // 10 * 5 = 50 sq ft
    })
  })

  describe('Type 3: Count Measurement', () => {
    it('should count points', () => {
      const points: Point[] = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]
      const count = calculateCount(points)
      expect(count).toBe(3)
    })

    it('should return 0 for empty array', () => {
      const count = calculateCount([])
      expect(count).toBe(0)
    })
  })

  describe('Type 4: Linear with Drop', () => {
    it('should calculate diagonal length with drop', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 30, y: 0 }, // 3 feet horizontal
      ]
      const dropHeight = 4 // 4 feet vertical

      const result = calculateLinearWithDrop(points, dropHeight, testScale, 'ft')

      expect(result.horizontal).toBe(3)
      expect(result.vertical).toBe(4)
      expect(result.total).toBe(5) // 3-4-5 triangle
    })
  })

  describe('Type 5: Pitched Area', () => {
    it('should calculate pitched area with pitch factor', () => {
      const square: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]
      const pitch = 0.5 // 6:12 pitch = 0.5 rise/run

      const result = calculatePitchedArea(square, pitch, testScale, 'ft2')

      expect(result.planar).toBe(100)
      expect(result.factor).toBeCloseTo(1.118, 2) // sqrt(1 + 0.5^2)
      expect(result.actual).toBeCloseTo(111.8, 1)
    })
  })

  describe('Type 6: Pitched Linear', () => {
    it('should calculate pitched linear length', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }, // 10 feet horizontal
      ]
      const pitch = 0.333 // 4:12 pitch

      const result = calculatePitchedLinear(points, pitch, testScale, 'ft')

      expect(result.horizontal).toBe(10)
      expect(result.factor).toBeCloseTo(1.054, 2)
      expect(result.actual).toBeCloseTo(10.54, 1)
    })
  })

  describe('Type 7: Surface Area', () => {
    it('should calculate lateral surface area of a wall', () => {
      const wall: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }, // 10 feet perimeter (one side)
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ]
      const height = 8 // 8 feet tall

      const result = calculateSurfaceArea(wall, height, testScale, 'ft2', false)

      // Perimeter = 2*(10+5) = 30 feet
      // Lateral area = 30 * 8 = 240 sq ft
      expect(result.lateral).toBe(240)
      expect(result.total).toBe(240)
    })

    it('should include end caps when requested', () => {
      const wall: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ]
      const height = 8

      const result = calculateSurfaceArea(wall, height, testScale, 'ft2', true)

      // End area = 10 * 5 * 2 = 100 sq ft
      expect(result.ends).toBe(100)
      expect(result.total).toBe(340) // 240 + 100
    })
  })

  describe('Type 8: Volume 2D', () => {
    it('should calculate volume from area and depth', () => {
      const slab: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }, // 10 feet
        { x: 100, y: 100 }, // 10 feet
        { x: 0, y: 100 },
      ]
      const depth = 0.5 // 6 inches = 0.5 feet

      const volume = calculateVolume2D(slab, depth, testScale, 'ft3')

      // 10 * 10 * 0.5 = 50 cubic feet
      expect(volume).toBe(50)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single point', () => {
      const length = calculateLinear([{ x: 0, y: 0 }], testScale, 'ft')
      expect(length).toBe(0)
    })

    it('should handle two identical points', () => {
      const points: Point[] = [
        { x: 10, y: 10 },
        { x: 10, y: 10 },
      ]
      const length = calculateLinear(points, testScale, 'ft')
      expect(length).toBe(0)
    })

    it('should handle empty polygon for area', () => {
      const area = calculateArea([], testScale, 'ft2')
      expect(area).toBe(0)
    })
  })
})
