// File: /src/features/takeoffs/utils/__tests__/export.test.ts
// Tests for export utilities

import { describe, it, expect } from 'vitest'
import type { TakeoffMeasurement } from '../../components/TakeoffCanvas'
import type { ScaleFactor } from '../measurements'
import {
  measurementsToRows,
  calculateSummary,
  exportToCSV,
} from '../export'

describe('Export Utilities', () => {
  const testScale: ScaleFactor = {
    pixelsPerUnit: 10,
    unit: 'ft',
  }

  const testMeasurements: TakeoffMeasurement[] = [
    {
      id: '1',
      type: 'linear',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      color: '#FF0000',
      name: 'Test Linear',
    },
    {
      id: '2',
      type: 'area',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      color: '#0000FF',
      name: 'Test Area',
    },
    {
      id: '3',
      type: 'count',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
      color: '#00FF00',
      name: 'Test Count',
    },
  ]

  describe('measurementsToRows', () => {
    it('should convert measurements to export rows', () => {
      const rows = measurementsToRows(testMeasurements, testScale)

      expect(rows).toHaveLength(3)
      expect(rows[0].name).toBe('Test Linear')
      expect(rows[0].type).toBe('Linear')
      expect(rows[0].unit).toBe('LF')

      expect(rows[1].name).toBe('Test Area')
      expect(rows[1].type).toBe('Area')
      expect(rows[1].unit).toBe('SF')

      expect(rows[2].name).toBe('Test Count')
      expect(rows[2].type).toBe('Count')
      expect(rows[2].unit).toBe('EA')
      expect(rows[2].quantity).toBe(3)
    })

    it('should handle measurements without scale', () => {
      const rows = measurementsToRows(testMeasurements)

      expect(rows).toHaveLength(3)
      // Count should still work without scale
      expect(rows[2].quantity).toBe(3)
      // Others should be 0
      expect(rows[0].quantity).toBe(0)
      expect(rows[1].quantity).toBe(0)
    })

    it('should generate names for unnamed measurements', () => {
      const unnamed: TakeoffMeasurement[] = [
        {
          id: 'abc123def456',
          type: 'linear',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          color: '#FF0000',
        },
      ]

      const rows = measurementsToRows(unnamed)
      expect(rows[0].name).toContain('linear')
      expect(rows[0].name).toContain('abc123de')
    })
  })

  describe('calculateSummary', () => {
    it('should calculate correct summary', () => {
      const summary = calculateSummary(testMeasurements, testScale)

      expect(summary.totalMeasurements).toBe(3)
      expect(summary.byType).toHaveProperty('Linear')
      expect(summary.byType).toHaveProperty('Area')
      expect(summary.byType).toHaveProperty('Count')
      expect(summary.byType['Count']).toBe(3)
    })

    it('should handle empty measurements', () => {
      const summary = calculateSummary([])

      expect(summary.totalMeasurements).toBe(0)
      expect(Object.keys(summary.byType)).toHaveLength(0)
      expect(summary.totalQuantity).toBe(0)
    })
  })

  describe('exportToCSV', () => {
    it('should generate valid CSV', () => {
      const csv = exportToCSV(testMeasurements, testScale)

      expect(csv).toContain('Name,Type,Quantity,Unit,Color,Notes')
      expect(csv).toContain('Test Linear')
      expect(csv).toContain('Test Area')
      expect(csv).toContain('Test Count')
      expect(csv).toContain('SUMMARY')
      expect(csv).toContain('Total Measurements,3')
    })

    it('should escape CSV values with commas', () => {
      const measurements: TakeoffMeasurement[] = [
        {
          id: '1',
          type: 'linear',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          color: '#FF0000',
          name: 'Test, with, commas',
        },
      ]

      const csv = exportToCSV(measurements, testScale)
      expect(csv).toContain('"Test, with, commas"')
    })

    it('should include project name in output', () => {
      const csv = exportToCSV(testMeasurements, testScale, 'Test Project')

      expect(csv).toContain('SUMMARY')
    })
  })

  describe('Type-specific properties in notes', () => {
    it('should include drop height in notes', () => {
      const measurements: TakeoffMeasurement[] = [
        {
          id: '1',
          type: 'linear_with_drop',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          color: '#FF0000',
          dropHeight: 12,
        },
      ]

      const rows = measurementsToRows(measurements, testScale)
      expect(rows[0].notes).toContain('Drop: 12ft')
    })

    it('should include pitch in notes', () => {
      const measurements: TakeoffMeasurement[] = [
        {
          id: '1',
          type: 'pitched_area',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          color: '#FF0000',
          pitch: 0.333, // 4:12 pitch
        },
      ]

      const rows = measurementsToRows(measurements, testScale)
      expect(rows[0].notes).toContain('Pitch: 4:12')
    })

    it('should include height in notes', () => {
      const measurements: TakeoffMeasurement[] = [
        {
          id: '1',
          type: 'surface_area',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          color: '#FF0000',
          height: 8,
        },
      ]

      const rows = measurementsToRows(measurements, testScale)
      expect(rows[0].notes).toContain('Height: 8ft')
    })

    it('should include depth in notes', () => {
      const measurements: TakeoffMeasurement[] = [
        {
          id: '1',
          type: 'volume_2d',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          color: '#FF0000',
          depth: 0.5,
        },
      ]

      const rows = measurementsToRows(measurements, testScale)
      expect(rows[0].notes).toContain('Depth: 0.5ft')
    })
  })
})
