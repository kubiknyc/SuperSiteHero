/**
 * Checklist PDF Export Tests
 * Tests for checklist execution PDF generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Mock jsPDF
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockSetTextColor = vi.fn()
const mockText = vi.fn()
const mockAddPage = vi.fn()
const mockSave = vi.fn()

const mockJsPDF = {
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setTextColor: mockSetTextColor,
  text: mockText,
  addPage: mockAddPage,
  save: mockSave,
  lastAutoTable: { finalY: 100 },
} as unknown as jsPDF

vi.mock('jspdf', () => ({
  default: vi.fn(() => mockJsPDF),
}))

// Mock autoTable - use vi.fn() directly in factory
vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

// Mock date-fns - use vi.fn() directly in factory
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'PPP p') return 'January 15, 2024 at 10:30 AM'
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15'
    return '2024-01-15'
  }),
}))

// Mock pdfBranding utilities - use vi.fn() directly in factory
vi.mock('@/lib/utils/pdfBranding', () => ({
  getCompanyInfo: vi.fn(),
  addDocumentHeader: vi.fn(async () => 40),
  addFootersToAllPages: vi.fn(),
}))

// Import functions after mocking
import { generateChecklistPDF } from '../pdfExport'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { getCompanyInfo, addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'
import type { ChecklistExecutionWithResponses, ChecklistTemplateItem } from '@/types/checklists'

describe('Checklist PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock company info
    vi.mocked(getCompanyInfo).mockResolvedValue({
      name: 'Test Construction Co',
      address: '123 Main St, TestCity, TS, 12345',
    })
  })

  describe('generateChecklistPDF', () => {
    const mockExecution: ChecklistExecutionWithResponses = {
      id: 'exec-1',
      name: 'Safety Inspection - Building A',
      status: 'completed',
      location: 'Building A - Floor 2',
      inspector_name: 'John Inspector',
      weather_conditions: 'Clear',
      temperature: 72,
      created_at: '2024-01-15T10:00:00Z',
      completed_at: '2024-01-15T12:00:00Z',
      project_id: 'proj-1',
      responses: [],
    } as unknown as ChecklistExecutionWithResponses

    const mockTemplateItems: ChecklistTemplateItem[] = [
      {
        id: 'item-1',
        label: 'Hard hats worn',
        item_type: 'checkbox',
        section: 'Safety Equipment',
        order_index: 0,
      },
      {
        id: 'item-2',
        label: 'Safety inspection notes',
        item_type: 'text',
        section: 'Safety Equipment',
        order_index: 1,
      },
    ] as unknown as ChecklistTemplateItem[]

    const mockScore = {
      pass_count: 8,
      fail_count: 1,
      na_count: 1,
      total_count: 10,
      pass_percentage: 80,
    }

    it('should generate basic checklist PDF', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      // Hyphens in the name are preserved, creating triple hyphens
      expect(mockSave).toHaveBeenCalledWith(
        expect.stringContaining('checklist-safety-inspection---building-a')
      )
    })

    it('should fetch company info when not provided', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(getCompanyInfo).toHaveBeenCalledWith('proj-1')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom GC',
        address: '456 Other St',
      }

      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1', gcCompany)

      expect(getCompanyInfo).not.toHaveBeenCalled()
    })

    it('should fall back to execution project_id when projectId not provided', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore)

      expect(getCompanyInfo).toHaveBeenCalledWith('proj-1')
    })

    it('should add document header with checklist name', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(addDocumentHeader).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          documentTitle: 'Safety Inspection - Building A',
          documentType: 'CHECKLIST',
        })
      )
    })

    it('should render status badge', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(mockText).toHaveBeenCalledWith(
        'Status: COMPLETED',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render metadata section with all fields', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(mockText).toHaveBeenCalledWith('Inspection Details', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Location: Building A - Floor 2', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Inspector: John Inspector', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Weather: Clear', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Temperature: 72°F', expect.any(Number), expect.any(Number))
    })

    it('should render created and completed dates', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(format).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Created:'),
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Completed:'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should not render completed date when not available', async () => {
      const executionWithoutCompletion = {
        ...mockExecution,
        completed_at: null,
      }

      await generateChecklistPDF(executionWithoutCompletion, mockTemplateItems, mockScore, 'proj-1')

      const completedCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('Completed:')
      )
      expect(completedCalls.length).toBe(0)
    })

    it('should render score summary table when score exists', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(mockText).toHaveBeenCalledWith('Score Summary', expect.any(Number), expect.any(Number))
      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['Pass', 'Fail', 'N/A', 'Total', 'Pass Rate']],
          body: [['8', '1', '1', '10', '80%']],
        })
      )
    })

    it('should not render score summary when score is null', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, null, 'proj-1')

      const scoreSummaryCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('Score Summary')
      )
      expect(scoreSummaryCalls.length).toBe(0)
    })

    it('should not render score summary when total_count is 0', async () => {
      const emptyScore = {
        pass_count: 0,
        fail_count: 0,
        na_count: 0,
        total_count: 0,
        pass_percentage: 0,
      }

      await generateChecklistPDF(mockExecution, mockTemplateItems, emptyScore, 'proj-1')

      const scoreSummaryCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('Score Summary')
      )
      expect(scoreSummaryCalls.length).toBe(0)
    })

    it('should render section headers', async () => {
      const executionWithResponses = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-1',
            response_data: { value: 'checked' },
            score_value: 'pass',
            notes: null,
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithResponses, mockTemplateItems, mockScore, 'proj-1')

      expect(mockText).toHaveBeenCalledWith('Safety Equipment', expect.any(Number), expect.any(Number))
    })

    it('should render items table with responses', async () => {
      const executionWithResponses = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-1',
            response_data: { value: 'checked' },
            score_value: 'pass',
            notes: 'All workers compliant',
          },
          {
            id: 'resp-2',
            checklist_template_item_id: 'item-2',
            response_data: { value: 'Safety inspection complete' },
            score_value: null,
            notes: null,
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithResponses, mockTemplateItems, mockScore, 'proj-1')

      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['Item', 'Type', 'Response', 'Score', 'Notes']],
          body: expect.arrayContaining([
            ['Hard hats worn', 'checkbox', 'Pass ✓', 'PASS', 'All workers compliant'],
            ['Safety inspection notes', 'text', 'Safety inspection complete', '-', '-'],
          ]),
        })
      )
    })

    it('should format checkbox responses correctly', async () => {
      // Create separate template items for each score value
      const checkboxItems: ChecklistTemplateItem[] = [
        {
          id: 'item-pass',
          label: 'Pass item',
          item_type: 'checkbox',
          section: 'Test',
          order_index: 0,
        },
        {
          id: 'item-fail',
          label: 'Fail item',
          item_type: 'checkbox',
          section: 'Test',
          order_index: 1,
        },
        {
          id: 'item-na',
          label: 'NA item',
          item_type: 'checkbox',
          section: 'Test',
          order_index: 2,
        },
      ] as unknown as ChecklistTemplateItem[]

      const executionWithCheckbox = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-pass',
            response_data: { value: 'checked' },
            score_value: 'pass',
          },
          {
            id: 'resp-2',
            checklist_template_item_id: 'item-fail',
            response_data: { value: 'checked' },
            score_value: 'fail',
          },
          {
            id: 'resp-3',
            checklist_template_item_id: 'item-na',
            response_data: { value: 'checked' },
            score_value: 'na',
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithCheckbox, checkboxItems, mockScore, 'proj-1')

      // Verify the response formatting
      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const itemsTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.[0] === 'Item'
      })

      expect(itemsTableCall).toBeDefined()
      const tableBody = (itemsTableCall![1] as any).body
      expect(tableBody).toContainEqual(expect.arrayContaining(['Pass ✓']))
      expect(tableBody).toContainEqual(expect.arrayContaining(['Fail ✗']))
      expect(tableBody).toContainEqual(expect.arrayContaining(['N/A']))
    })

    it('should format number responses with units', async () => {
      const numberItem: ChecklistTemplateItem = {
        id: 'item-3',
        label: 'Measurement',
        item_type: 'number',
        section: 'Measurements',
        order_index: 0,
      } as unknown as ChecklistTemplateItem

      const executionWithNumber = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-3',
            response_data: { value: 42, units: 'ft' },
            score_value: null,
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithNumber, [numberItem], mockScore, 'proj-1')

      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const itemsTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.[0] === 'Item'
      })

      expect(itemsTableCall).toBeDefined()
      const tableBody = (itemsTableCall![1] as any).body
      expect(tableBody).toContainEqual(expect.arrayContaining(['42 ft']))
    })

    it('should format photo responses with count', async () => {
      const photoItem: ChecklistTemplateItem = {
        id: 'item-4',
        label: 'Site Photos',
        item_type: 'photo',
        section: 'Documentation',
        order_index: 0,
      } as unknown as ChecklistTemplateItem

      const executionWithPhotos = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-4',
            response_data: {},
            photo_urls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
            score_value: null,
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithPhotos, [photoItem], mockScore, 'proj-1')

      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const itemsTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.[0] === 'Item'
      })

      expect(itemsTableCall).toBeDefined()
      const tableBody = (itemsTableCall![1] as any).body
      expect(tableBody).toContainEqual(expect.arrayContaining(['3 photo(s)']))
    })

    it('should format signature responses', async () => {
      const signatureItem: ChecklistTemplateItem = {
        id: 'item-5',
        label: 'Signature',
        item_type: 'signature',
        section: 'Approval',
        order_index: 0,
      } as unknown as ChecklistTemplateItem

      const executionWithSignature = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-5',
            response_data: {},
            signature_url: 'signature.png',
            score_value: null,
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithSignature, [signatureItem], mockScore, 'proj-1')

      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const itemsTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.[0] === 'Item'
      })

      expect(itemsTableCall).toBeDefined()
      const tableBody = (itemsTableCall![1] as any).body
      expect(tableBody).toContainEqual(expect.arrayContaining(['Signed']))
    })

    it('should truncate long notes to 50 characters', async () => {
      const executionWithLongNotes = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-1',
            response_data: { value: 'checked' },
            score_value: 'pass',
            notes: 'This is a very long note that exceeds fifty characters and should be truncated with ellipsis',
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithLongNotes, mockTemplateItems, mockScore, 'proj-1')

      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const itemsTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.[0] === 'Item'
      })

      expect(itemsTableCall).toBeDefined()
      const tableBody = (itemsTableCall![1] as any).body
      expect(tableBody[0][4]).toMatch(/^.{47}\.\.\.$/)
    })

    it('should add footers to all pages', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      expect(addFootersToAllPages).toHaveBeenCalledWith(mockJsPDF)
    })

    it('should generate filename with sanitized checklist name and date', async () => {
      await generateChecklistPDF(mockExecution, mockTemplateItems, mockScore, 'proj-1')

      // Hyphens in the name are preserved, creating triple hyphens
      expect(mockSave).toHaveBeenCalledWith('checklist-safety-inspection---building-a-2024-01-15.pdf')
    })

    it('should handle missing optional metadata fields', async () => {
      const minimalExecution = {
        ...mockExecution,
        location: null,
        inspector_name: null,
        weather_conditions: null,
        temperature: null,
      }

      const result = generateChecklistPDF(minimalExecution, mockTemplateItems, mockScore, 'proj-1')

      // Should not crash
      await expect(result).resolves.toBeUndefined()
    })

    it('should group items by section correctly', async () => {
      const multiSectionItems: ChecklistTemplateItem[] = [
        {
          id: 'item-1',
          label: 'Item A1',
          item_type: 'checkbox',
          section: 'Section A',
          order_index: 0,
        },
        {
          id: 'item-2',
          label: 'Item A2',
          item_type: 'checkbox',
          section: 'Section A',
          order_index: 1,
        },
        {
          id: 'item-3',
          label: 'Item B1',
          item_type: 'checkbox',
          section: 'Section B',
          order_index: 0,
        },
      ] as unknown as ChecklistTemplateItem[]

      const executionWithMultiSection = {
        ...mockExecution,
        responses: multiSectionItems.map(item => ({
          id: `resp-${item.id}`,
          checklist_template_item_id: item.id,
          response_data: { value: 'checked' },
          score_value: 'pass',
        })),
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithMultiSection, multiSectionItems, mockScore, 'proj-1')

      expect(mockText).toHaveBeenCalledWith('Section A', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Section B', expect.any(Number), expect.any(Number))
    })

    it('should default to "General" section when section is null', async () => {
      const itemWithoutSection: ChecklistTemplateItem[] = [
        {
          id: 'item-1',
          label: 'General Item',
          item_type: 'checkbox',
          section: null,
          order_index: 0,
        },
      ] as unknown as ChecklistTemplateItem[]

      const executionWithGeneral = {
        ...mockExecution,
        responses: [
          {
            id: 'resp-1',
            checklist_template_item_id: 'item-1',
            response_data: { value: 'checked' },
            score_value: 'pass',
          },
        ],
      } as unknown as ChecklistExecutionWithResponses

      await generateChecklistPDF(executionWithGeneral, itemWithoutSection, mockScore, 'proj-1')

      expect(mockText).toHaveBeenCalledWith('General', expect.any(Number), expect.any(Number))
    })
  })
})
