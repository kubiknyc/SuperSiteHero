// File: src/features/gantt/utils/msProjectImport.test.ts
// Comprehensive tests for MS Project XML import
// Phase: Testing - Gantt feature coverage

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseMSProjectXML,
  validateImportedSchedule,
  importFromFile,
  generateSampleXML,
} from './msProjectImport'

describe('MS Project Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================
  // PARSE MS PROJECT XML
  // =============================================

  describe('parseMSProjectXML', () => {
    it('should parse valid MS Project XML', () => {
      const xml = generateSampleXML()

      const result = parseMSProjectXML(xml)

      expect(result.tasks.length).toBeGreaterThan(0)
      expect(result.errors.length).toBe(0)
    })

    it('should extract task properties correctly', () => {
      const xml = generateSampleXML()

      const result = parseMSProjectXML(xml)

      const designTask = result.tasks.find(t => t.task_name === 'Design Phase')
      expect(designTask).toBeDefined()
      expect(designTask?.start_date).toBe('2025-01-01')
      expect(designTask?.percent_complete).toBe(100)
    })

    it('should parse dependencies', () => {
      const xml = generateSampleXML()

      const result = parseMSProjectXML(xml)

      expect(result.dependencies.length).toBeGreaterThan(0)
    })

    it('should identify milestones', () => {
      const xml = generateSampleXML()

      const result = parseMSProjectXML(xml)

      const milestone = result.tasks.find(t => t.is_milestone)
      expect(milestone).toBeDefined()
      expect(milestone?.task_name).toBe('Design Complete')
    })

    it('should skip summary task (ID 0)', () => {
      const xml = generateSampleXML()

      const result = parseMSProjectXML(xml)

      const summaryTask = result.tasks.find(t => t.task_name === 'Project Summary')
      expect(summaryTask).toBeUndefined()
    })

    it('should handle XML with no tasks', () => {
      const xml = `<?xml version="1.0"?><Project><Tasks></Tasks></Project>`

      const result = parseMSProjectXML(xml)

      expect(result.tasks.length).toBe(0)
      expect(result.errors).toContain('No tasks found in the XML file')
    })

    it('should handle malformed XML', () => {
      const xml = `<not valid xml`

      const result = parseMSProjectXML(xml)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Failed to parse XML')
    })

    it('should extract WBS codes', () => {
      const xml = generateSampleXML()

      const result = parseMSProjectXML(xml)

      const taskWithWBS = result.tasks.find(t => t.wbs)
      expect(taskWithWBS?.wbs).toBeDefined()
    })

    it('should warn about summary tasks being skipped', () => {
      const xml = `<?xml version="1.0"?>
        <Project>
          <Tasks>
            <Task>
              <UID>1</UID><ID>1</ID><Name>Summary</Name>
              <Summary>1</Summary>
              <Start>2024-01-01T00:00:00</Start>
              <Finish>2024-01-10T00:00:00</Finish>
            </Task>
          </Tasks>
        </Project>`

      const result = parseMSProjectXML(xml)

      expect(result.warnings.some(w => w.includes('summary task'))).toBe(true)
    })
  })

  // =============================================
  // VALIDATE IMPORTED SCHEDULE
  // =============================================

  describe('validateImportedSchedule', () => {
    it('should pass validation for valid schedule', () => {
      const xml = generateSampleXML()
      const parsed = parseMSProjectXML(xml)

      const validation = validateImportedSchedule(parsed)

      expect(validation.isValid).toBe(true)
    })

    it('should detect duplicate task names', () => {
      const parsed = {
        tasks: [
          { task_name: 'Task A', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 },
          { task_name: 'Task A', start_date: '2024-01-11', finish_date: '2024-01-20', duration_days: 10 },
        ],
        dependencies: [],
        errors: [],
        warnings: [],
      }

      const validation = validateImportedSchedule(parsed as any)

      expect(validation.warnings.some(w => w.includes('Duplicate task name'))).toBe(true)
    })

    it('should detect invalid date ranges', () => {
      const parsed = {
        tasks: [
          { task_name: 'Invalid Task', start_date: '2024-01-20', finish_date: '2024-01-10', duration_days: 10, is_milestone: false },
        ],
        dependencies: [],
        errors: [],
        warnings: [],
      }

      const validation = validateImportedSchedule(parsed as any)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(e => e.includes('start date after finish date'))).toBe(true)
    })

    it('should allow milestones with same start and finish', () => {
      const parsed = {
        tasks: [
          { task_name: 'Milestone', start_date: '2024-01-15', finish_date: '2024-01-15', duration_days: 0, is_milestone: true },
        ],
        dependencies: [],
        errors: [],
        warnings: [],
      }

      const validation = validateImportedSchedule(parsed as any)

      expect(validation.isValid).toBe(true)
    })
  })

  // =============================================
  // IMPORT FROM FILE
  // =============================================

  describe('importFromFile', () => {
    it('should read and parse file content', async () => {
      const xml = generateSampleXML()
      const file = new File([xml], 'project.xml', { type: 'text/xml' })

      const result = await importFromFile(file)

      expect(result.tasks.length).toBeGreaterThan(0)
    })

    it('should handle file read error', async () => {
      const file = {
        name: 'project.xml',
      } as File

      // Mock FileReader to simulate error
      const originalFileReader = globalThis.FileReader
      globalThis.FileReader = class MockFileReader {
        onerror: ((event: ProgressEvent) => void) | null = null
        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new ProgressEvent('error'))
            }
          }, 0)
        }
      } as unknown as typeof FileReader

      await expect(importFromFile(file)).rejects.toThrow('Failed to read file')

      globalThis.FileReader = originalFileReader
    })

    it('should combine parse and validation errors', async () => {
      const xml = `<?xml version="1.0"?>
        <Project>
          <Tasks>
            <Task>
              <UID>1</UID><ID>1</ID><Name>Invalid Task</Name>
              <Start>2024-01-20T00:00:00</Start>
              <Finish>2024-01-10T00:00:00</Finish>
              <Summary>0</Summary>
              <Milestone>0</Milestone>
            </Task>
          </Tasks>
        </Project>`
      const file = new File([xml], 'project.xml', { type: 'text/xml' })

      const result = await importFromFile(file)

      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  // =============================================
  // GENERATE SAMPLE XML
  // =============================================

  describe('generateSampleXML', () => {
    it('should generate valid XML structure', () => {
      const xml = generateSampleXML()

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<Project')
      expect(xml).toContain('<Tasks>')
      expect(xml).toContain('<Task>')
    })

    it('should include sample tasks', () => {
      const xml = generateSampleXML()

      expect(xml).toContain('Design Phase')
      expect(xml).toContain('Development Phase')
    })

    it('should include milestone', () => {
      const xml = generateSampleXML()

      expect(xml).toContain('<Milestone>1</Milestone>')
    })

    it('should include dependencies', () => {
      const xml = generateSampleXML()

      expect(xml).toContain('<PredecessorLink>')
      expect(xml).toContain('<PredecessorUID>')
    })

    it('should be parseable', () => {
      const xml = generateSampleXML()
      const result = parseMSProjectXML(xml)

      expect(result.errors.length).toBe(0)
      expect(result.tasks.length).toBeGreaterThan(0)
    })
  })

  // =============================================
  // DEPENDENCY TYPE CONVERSION
  // =============================================

  describe('dependency type conversion', () => {
    it('should convert FS (type 1) dependency', () => {
      const xml = `<?xml version="1.0"?>
        <Project>
          <Tasks>
            <Task>
              <UID>1</UID><ID>1</ID><Name>Task 1</Name>
              <Start>2024-01-01T00:00:00</Start>
              <Finish>2024-01-10T00:00:00</Finish>
              <Summary>0</Summary>
              <Milestone>0</Milestone>
            </Task>
            <Task>
              <UID>2</UID><ID>2</ID><Name>Task 2</Name>
              <Start>2024-01-11T00:00:00</Start>
              <Finish>2024-01-20T00:00:00</Finish>
              <Summary>0</Summary>
              <Milestone>0</Milestone>
              <PredecessorLink>
                <PredecessorUID>1</PredecessorUID>
                <Type>1</Type>
              </PredecessorLink>
            </Task>
          </Tasks>
        </Project>`

      const result = parseMSProjectXML(xml)

      expect(result.dependencies[0].type).toBe('FS')
    })

    it('should convert SS (type 3) dependency', () => {
      const xml = `<?xml version="1.0"?>
        <Project>
          <Tasks>
            <Task>
              <UID>1</UID><ID>1</ID><Name>Task 1</Name>
              <Start>2024-01-01T00:00:00</Start>
              <Finish>2024-01-10T00:00:00</Finish>
              <Summary>0</Summary>
              <Milestone>0</Milestone>
            </Task>
            <Task>
              <UID>2</UID><ID>2</ID><Name>Task 2</Name>
              <Start>2024-01-01T00:00:00</Start>
              <Finish>2024-01-10T00:00:00</Finish>
              <Summary>0</Summary>
              <Milestone>0</Milestone>
              <PredecessorLink>
                <PredecessorUID>1</PredecessorUID>
                <Type>3</Type>
              </PredecessorLink>
            </Task>
          </Tasks>
        </Project>`

      const result = parseMSProjectXML(xml)

      expect(result.dependencies[0].type).toBe('SS')
    })
  })
})
