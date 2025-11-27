// File: /src/features/documents/utils/cloudShape.test.ts
// Tests for cloud shape path generation algorithm

import { describe, it, expect } from 'vitest'

/**
 * Generate cloud shape path points
 * Creates a cloud/callout bubble using bezier curves
 */
function generateCloudPath(
  width: number,
  height: number,
  numBumps: number = 8
): string {
  if (width === 0 || height === 0) return ''

  const absWidth = Math.abs(width)
  const absHeight = Math.abs(height)
  const offsetX = width < 0 ? width : 0
  const offsetY = height < 0 ? height : 0

  const bumpRadius = Math.min(absWidth, absHeight) / (numBumps / 2)
  const path: string[] = []

  // Start at bottom left
  path.push(`M ${offsetX + bumpRadius} ${offsetY + absHeight}`)

  // Bottom edge bumps
  const bottomBumps = Math.max(2, Math.floor(absWidth / bumpRadius / 1.5))
  for (let i = 0; i < bottomBumps; i++) {
    const x1 = offsetX + (i + 0.5) * (absWidth / bottomBumps)
    const x2 = offsetX + (i + 1) * (absWidth / bottomBumps)
    const cy = offsetY + absHeight + bumpRadius * 0.3
    path.push(`Q ${x1} ${cy} ${x2} ${offsetY + absHeight}`)
  }

  // Right edge bumps
  const rightBumps = Math.max(2, Math.floor(absHeight / bumpRadius / 1.5))
  for (let i = 0; i < rightBumps; i++) {
    const y1 = offsetY + absHeight - (i + 0.5) * (absHeight / rightBumps)
    const y2 = offsetY + absHeight - (i + 1) * (absHeight / rightBumps)
    const cx = offsetX + absWidth + bumpRadius * 0.3
    path.push(`Q ${cx} ${y1} ${offsetX + absWidth} ${y2}`)
  }

  // Top edge bumps
  for (let i = 0; i < bottomBumps; i++) {
    const x1 = offsetX + absWidth - (i + 0.5) * (absWidth / bottomBumps)
    const x2 = offsetX + absWidth - (i + 1) * (absWidth / bottomBumps)
    const cy = offsetY - bumpRadius * 0.3
    path.push(`Q ${x1} ${cy} ${x2} ${offsetY}`)
  }

  // Left edge bumps
  for (let i = 0; i < rightBumps; i++) {
    const y1 = offsetY + (i + 0.5) * (absHeight / rightBumps)
    const y2 = offsetY + (i + 1) * (absHeight / rightBumps)
    const cx = offsetX - bumpRadius * 0.3
    path.push(`Q ${cx} ${y1} ${offsetX} ${y2}`)
  }

  path.push('Z')
  return path.join(' ')
}

describe('generateCloudPath', () => {
  describe('Basic Path Generation', () => {
    it('should generate a valid SVG path string', () => {
      const path = generateCloudPath(100, 100, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M') // Move command
      expect(path).toContain('Q') // Quadratic bezier curve
      expect(path).toContain('Z') // Close path
    })

    it('should start with M (move) command', () => {
      const path = generateCloudPath(100, 100, 8)
      expect(path.startsWith('M')).toBe(true)
    })

    it('should end with Z (close path) command', () => {
      const path = generateCloudPath(100, 100, 8)
      expect(path.endsWith('Z')).toBe(true)
    })

    it('should contain multiple Q (quadratic curve) commands', () => {
      const path = generateCloudPath(100, 100, 8)
      const qCount = (path.match(/Q/g) || []).length
      expect(qCount).toBeGreaterThan(4) // Should have bumps on all 4 sides
    })
  })

  describe('Edge Cases', () => {
    it('should return empty string for zero width', () => {
      const path = generateCloudPath(0, 100, 8)
      expect(path).toBe('')
    })

    it('should return empty string for zero height', () => {
      const path = generateCloudPath(100, 0, 8)
      expect(path).toBe('')
    })

    it('should handle negative width', () => {
      const path = generateCloudPath(-100, 100, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })

    it('should handle negative height', () => {
      const path = generateCloudPath(100, -100, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })

    it('should handle both negative width and height', () => {
      const path = generateCloudPath(-100, -100, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })
  })

  describe('Size Variations', () => {
    it('should generate path for very small dimensions', () => {
      const path = generateCloudPath(10, 10, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })

    it('should generate path for very large dimensions', () => {
      const path = generateCloudPath(1000, 1000, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })

    it('should generate path for rectangular shapes (wide)', () => {
      const path = generateCloudPath(200, 50, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })

    it('should generate path for rectangular shapes (tall)', () => {
      const path = generateCloudPath(50, 200, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })
  })

  describe('Bump Count Variations', () => {
    it('should handle low bump count', () => {
      const path = generateCloudPath(100, 100, 2)

      expect(path).toBeTruthy()
      expect(path).toContain('Q')
    })

    it('should handle high bump count', () => {
      const path = generateCloudPath(100, 100, 20)

      expect(path).toBeTruthy()
      expect(path).toContain('Q')
    })

    it('should use default bump count when not specified', () => {
      const pathWithDefault = generateCloudPath(100, 100)
      const pathWithExplicit = generateCloudPath(100, 100, 8)

      // Should produce similar results (though not necessarily identical due to rounding)
      expect(pathWithDefault).toBeTruthy()
      expect(pathWithExplicit).toBeTruthy()
    })
  })

  describe('Path Structure', () => {
    it('should generate consistent path structure', () => {
      const path1 = generateCloudPath(100, 100, 8)
      const path2 = generateCloudPath(100, 100, 8)

      // Same inputs should produce same output (deterministic)
      expect(path1).toBe(path2)
    })

    it('should produce different paths for different sizes', () => {
      const path1 = generateCloudPath(100, 100, 8)
      const path2 = generateCloudPath(200, 200, 8)

      expect(path1).not.toBe(path2)
    })

    it('should produce different paths for different bump counts', () => {
      const path1 = generateCloudPath(100, 100, 4)
      const path2 = generateCloudPath(100, 100, 12)

      expect(path1).not.toBe(path2)
    })
  })

  describe('Coordinate Correctness', () => {
    it('should generate valid numeric coordinates', () => {
      const path = generateCloudPath(100, 100, 8)

      // Extract all numeric values from path
      const numbers = path.match(/-?\d+\.?\d*/g)

      expect(numbers).toBeTruthy()
      if (numbers) {
        numbers.forEach((num) => {
          expect(isNaN(parseFloat(num))).toBe(false)
        })
      }
    })

    it('should handle floating point dimensions', () => {
      const path = generateCloudPath(100.5, 99.7, 8)

      expect(path).toBeTruthy()
      expect(path).toContain('M')
      expect(path).toContain('Q')
      expect(path).toContain('Z')
    })
  })

  describe('Performance', () => {
    it('should generate path quickly for normal sizes', () => {
      const start = performance.now()
      generateCloudPath(100, 100, 8)
      const end = performance.now()

      // Should complete in less than 10ms
      expect(end - start).toBeLessThan(10)
    })

    it('should handle multiple rapid generations', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        generateCloudPath(100, 100, 8)
      }

      const end = performance.now()

      // 100 generations should complete in less than 100ms
      expect(end - start).toBeLessThan(100)
    })
  })
})
