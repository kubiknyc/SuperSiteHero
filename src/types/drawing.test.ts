// File: /src/types/drawing.test.ts
// Tests for drawing register types and constants

import { describe, it, expect } from 'vitest'
import {
  DRAWING_DISCIPLINES,
  DRAWING_STATUSES,
  REVISION_TYPES,
  SHEET_SIZES,
  ISSUE_PURPOSES,
  MARKUP_TYPES,
  type DrawingDiscipline,
  type DrawingStatus,
  type RevisionType,
  type MarkupType,
  type MarkupStatus,
  type DrawingSetStatus,
  type IssuePurpose,
  type SheetSize,
  type Drawing,
  type DrawingInsert,
  type DrawingUpdate,
  type DrawingRevision,
  type DrawingRevisionInsert,
  type DrawingSet,
  type DrawingSetItem,
  type DrawingTransmittal,
  type DrawingMarkup,
  type DrawingFilters,
  type DrawingRegisterEntry,
  type DisciplineSummary,
  type RevisionHistoryEntry,
} from './drawing'

describe('Drawing Types', () => {
  describe('DRAWING_DISCIPLINES', () => {
    it('should have all expected disciplines', () => {
      const values = DRAWING_DISCIPLINES.map((d) => d.value)
      expect(values).toContain('architectural')
      expect(values).toContain('structural')
      expect(values).toContain('mechanical')
      expect(values).toContain('electrical')
      expect(values).toContain('plumbing')
      expect(values).toContain('civil')
      expect(values).toContain('landscape')
      expect(values).toContain('fire_protection')
      expect(values).toContain('other')
    })

    it('should have exactly 9 disciplines', () => {
      expect(DRAWING_DISCIPLINES).toHaveLength(9)
    })

    it('should have standard prefixes', () => {
      const architectural = DRAWING_DISCIPLINES.find((d) => d.value === 'architectural')
      expect(architectural?.prefix).toBe('A')

      const structural = DRAWING_DISCIPLINES.find((d) => d.value === 'structural')
      expect(structural?.prefix).toBe('S')

      const mechanical = DRAWING_DISCIPLINES.find((d) => d.value === 'mechanical')
      expect(mechanical?.prefix).toBe('M')

      const electrical = DRAWING_DISCIPLINES.find((d) => d.value === 'electrical')
      expect(electrical?.prefix).toBe('E')

      const plumbing = DRAWING_DISCIPLINES.find((d) => d.value === 'plumbing')
      expect(plumbing?.prefix).toBe('P')

      const civil = DRAWING_DISCIPLINES.find((d) => d.value === 'civil')
      expect(civil?.prefix).toBe('C')

      const fireProtection = DRAWING_DISCIPLINES.find((d) => d.value === 'fire_protection')
      expect(fireProtection?.prefix).toBe('FP')
    })

    it('should have labels for all disciplines', () => {
      DRAWING_DISCIPLINES.forEach((discipline) => {
        expect(discipline.label).toBeDefined()
        expect(discipline.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('DRAWING_STATUSES', () => {
    it('should have all expected statuses', () => {
      const values = DRAWING_STATUSES.map((s) => s.value)
      expect(values).toContain('active')
      expect(values).toContain('superseded')
      expect(values).toContain('void')
      expect(values).toContain('for_reference_only')
    })

    it('should have exactly 4 statuses', () => {
      expect(DRAWING_STATUSES).toHaveLength(4)
    })

    it('should have appropriate colors', () => {
      const active = DRAWING_STATUSES.find((s) => s.value === 'active')
      expect(active?.color).toBe('green')

      const superseded = DRAWING_STATUSES.find((s) => s.value === 'superseded')
      expect(superseded?.color).toBe('yellow')

      const voidStatus = DRAWING_STATUSES.find((s) => s.value === 'void')
      expect(voidStatus?.color).toBe('red')
    })

    it('should have labels for all statuses', () => {
      DRAWING_STATUSES.forEach((status) => {
        expect(status.label).toBeDefined()
        expect(status.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('REVISION_TYPES', () => {
    it('should have all expected revision types', () => {
      const values = REVISION_TYPES.map((r) => r.value)
      expect(values).toContain('standard')
      expect(values).toContain('asi')
      expect(values).toContain('bulletin')
      expect(values).toContain('addendum')
      expect(values).toContain('rfi_response')
    })

    it('should have exactly 5 revision types', () => {
      expect(REVISION_TYPES).toHaveLength(5)
    })

    it('should have ASI label with full name', () => {
      const asi = REVISION_TYPES.find((r) => r.value === 'asi')
      expect(asi?.label).toContain("Architect's Supplemental Instruction")
    })

    it('should have labels for all types', () => {
      REVISION_TYPES.forEach((type) => {
        expect(type.label).toBeDefined()
        expect(type.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('SHEET_SIZES', () => {
    it('should have standard sheet sizes', () => {
      const values = SHEET_SIZES.map((s) => s.value)
      expect(values).toContain('A')
      expect(values).toContain('B')
      expect(values).toContain('C')
      expect(values).toContain('D')
      expect(values).toContain('E')
    })

    it('should have architectural sheet sizes', () => {
      const values = SHEET_SIZES.map((s) => s.value)
      expect(values).toContain('ARCH A')
      expect(values).toContain('ARCH B')
      expect(values).toContain('ARCH C')
      expect(values).toContain('ARCH D')
      expect(values).toContain('ARCH E')
    })

    it('should have exactly 10 sheet sizes', () => {
      expect(SHEET_SIZES).toHaveLength(10)
    })

    it('should have dimensions for all sizes', () => {
      SHEET_SIZES.forEach((size) => {
        expect(size.dimensions).toBeDefined()
        expect(size.dimensions).toContain('x')
        expect(size.dimensions).toContain('"')
      })
    })

    it('should have correct dimensions for standard sizes', () => {
      const sizeA = SHEET_SIZES.find((s) => s.value === 'A')
      expect(sizeA?.dimensions).toBe('8.5" x 11"')

      const sizeD = SHEET_SIZES.find((s) => s.value === 'D')
      expect(sizeD?.dimensions).toBe('22" x 34"')
    })
  })

  describe('ISSUE_PURPOSES', () => {
    it('should have all expected issue purposes', () => {
      const values = ISSUE_PURPOSES.map((p) => p.value)
      expect(values).toContain('For Construction')
      expect(values).toContain('For Permit')
      expect(values).toContain('For Bid')
      expect(values).toContain('For Review')
      expect(values).toContain('For Coordination')
      expect(values).toContain('For Record')
    })

    it('should have exactly 6 issue purposes', () => {
      expect(ISSUE_PURPOSES).toHaveLength(6)
    })

    it('should have labels matching values', () => {
      ISSUE_PURPOSES.forEach((purpose) => {
        expect(purpose.label).toBe(purpose.value)
      })
    })
  })

  describe('MARKUP_TYPES', () => {
    it('should have all expected markup types', () => {
      const values = MARKUP_TYPES.map((m) => m.value)
      expect(values).toContain('comment')
      expect(values).toContain('cloud')
      expect(values).toContain('arrow')
      expect(values).toContain('dimension')
      expect(values).toContain('text')
      expect(values).toContain('highlight')
      expect(values).toContain('redline')
    })

    it('should have exactly 7 markup types', () => {
      expect(MARKUP_TYPES).toHaveLength(7)
    })

    it('should have icons for all types', () => {
      MARKUP_TYPES.forEach((type) => {
        expect(type.icon).toBeDefined()
        expect(type.icon.length).toBeGreaterThan(0)
      })
    })

    it('should have appropriate icons', () => {
      const comment = MARKUP_TYPES.find((m) => m.value === 'comment')
      expect(comment?.icon).toBe('MessageSquare')

      const cloud = MARKUP_TYPES.find((m) => m.value === 'cloud')
      expect(cloud?.icon).toBe('Cloud')

      const ruler = MARKUP_TYPES.find((m) => m.value === 'dimension')
      expect(ruler?.icon).toBe('Ruler')
    })
  })

  describe('Type definitions', () => {
    describe('DrawingDiscipline type', () => {
      it('should accept valid disciplines', () => {
        const disciplines: DrawingDiscipline[] = [
          'architectural',
          'structural',
          'mechanical',
          'electrical',
          'plumbing',
          'civil',
          'landscape',
          'fire_protection',
          'other',
        ]
        expect(disciplines).toHaveLength(9)
      })
    })

    describe('DrawingStatus type', () => {
      it('should accept valid statuses', () => {
        const statuses: DrawingStatus[] = ['active', 'superseded', 'void', 'for_reference_only']
        expect(statuses).toHaveLength(4)
      })
    })

    describe('RevisionType type', () => {
      it('should accept valid revision types', () => {
        const types: RevisionType[] = ['standard', 'asi', 'bulletin', 'addendum', 'rfi_response']
        expect(types).toHaveLength(5)
      })
    })

    describe('MarkupType type', () => {
      it('should accept valid markup types', () => {
        const types: MarkupType[] = [
          'comment',
          'cloud',
          'arrow',
          'dimension',
          'text',
          'highlight',
          'redline',
        ]
        expect(types).toHaveLength(7)
      })
    })

    describe('MarkupStatus type', () => {
      it('should accept valid markup statuses', () => {
        const statuses: MarkupStatus[] = ['open', 'resolved', 'void']
        expect(statuses).toHaveLength(3)
      })
    })

    describe('DrawingSetStatus type', () => {
      it('should accept valid set statuses', () => {
        const statuses: DrawingSetStatus[] = ['draft', 'issued', 'superseded']
        expect(statuses).toHaveLength(3)
      })
    })

    describe('IssuePurpose type', () => {
      it('should accept valid issue purposes', () => {
        const purposes: IssuePurpose[] = [
          'For Construction',
          'For Permit',
          'For Bid',
          'For Review',
          'For Coordination',
          'For Record',
        ]
        expect(purposes).toHaveLength(6)
      })
    })

    describe('SheetSize type', () => {
      it('should accept valid sheet sizes', () => {
        const sizes: SheetSize[] = [
          'A',
          'B',
          'C',
          'D',
          'E',
          'ARCH A',
          'ARCH B',
          'ARCH C',
          'ARCH D',
          'ARCH E',
        ]
        expect(sizes).toHaveLength(10)
      })
    })
  })

  describe('Drawing interface', () => {
    it('should have all required fields', () => {
      const drawing: Drawing = {
        id: 'draw-1',
        companyId: 'company-1',
        projectId: 'project-1',
        drawingNumber: 'A-101',
        title: 'Floor Plan - Level 1',
        discipline: 'architectural',
        status: 'active',
        isIssuedForConstruction: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(drawing.id).toBe('draw-1')
      expect(drawing.drawingNumber).toBe('A-101')
      expect(drawing.discipline).toBe('architectural')
      expect(drawing.isIssuedForConstruction).toBe(true)
    })

    it('should allow optional fields', () => {
      const drawing: Drawing = {
        id: 'draw-1',
        companyId: 'company-1',
        projectId: 'project-1',
        drawingNumber: 'A-101',
        title: 'Floor Plan - Level 1',
        discipline: 'architectural',
        status: 'active',
        isIssuedForConstruction: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        description: 'First floor plan',
        currentRevision: '02',
        sheetSize: 'ARCH D',
        specSection: '01 00 00',
        revisionCount: 3,
      }

      expect(drawing.description).toBe('First floor plan')
      expect(drawing.currentRevision).toBe('02')
      expect(drawing.sheetSize).toBe('ARCH D')
    })
  })

  describe('DrawingInsert interface', () => {
    it('should require minimum fields for insert', () => {
      const insert: DrawingInsert = {
        companyId: 'company-1',
        projectId: 'project-1',
        drawingNumber: 'S-101',
        title: 'Foundation Plan',
        discipline: 'structural',
      }

      expect(insert.companyId).toBeDefined()
      expect(insert.projectId).toBeDefined()
      expect(insert.drawingNumber).toBeDefined()
      expect(insert.title).toBeDefined()
      expect(insert.discipline).toBeDefined()
    })
  })

  describe('DrawingRevision interface', () => {
    it('should have all required fields', () => {
      const revision: DrawingRevision = {
        id: 'rev-1',
        drawingId: 'draw-1',
        revision: '01',
        revisionDate: '2024-03-15',
        revisionType: 'standard',
        isCurrent: true,
        isSuperseded: false,
        createdAt: '2024-03-15T00:00:00Z',
      }

      expect(revision.id).toBe('rev-1')
      expect(revision.revision).toBe('01')
      expect(revision.isCurrent).toBe(true)
    })

    it('should allow ASI revision type', () => {
      const revision: DrawingRevision = {
        id: 'rev-2',
        drawingId: 'draw-1',
        revision: '02',
        revisionDate: '2024-04-01',
        revisionType: 'asi',
        sourceReference: 'ASI-005',
        isCurrent: true,
        isSuperseded: false,
        createdAt: '2024-04-01T00:00:00Z',
      }

      expect(revision.revisionType).toBe('asi')
      expect(revision.sourceReference).toBe('ASI-005')
    })
  })

  describe('DrawingSet interface', () => {
    it('should have all required fields', () => {
      const set: DrawingSet = {
        id: 'set-1',
        companyId: 'company-1',
        projectId: 'project-1',
        name: 'IFC Set 1',
        setDate: '2024-03-01',
        isCurrent: true,
        status: 'issued',
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z',
      }

      expect(set.id).toBe('set-1')
      expect(set.name).toBe('IFC Set 1')
      expect(set.status).toBe('issued')
      expect(set.isCurrent).toBe(true)
    })

    it('should allow items array', () => {
      const setItem: DrawingSetItem = {
        id: 'item-1',
        drawingSetId: 'set-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        sortOrder: 1,
        addedAt: '2024-03-01T00:00:00Z',
      }

      const set: DrawingSet = {
        id: 'set-1',
        companyId: 'company-1',
        projectId: 'project-1',
        name: 'IFC Set 1',
        setDate: '2024-03-01',
        isCurrent: true,
        status: 'issued',
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z',
        items: [setItem],
        itemCount: 1,
      }

      expect(set.items).toHaveLength(1)
      expect(set.itemCount).toBe(1)
    })
  })

  describe('DrawingTransmittal interface', () => {
    it('should have all required fields', () => {
      const transmittal: DrawingTransmittal = {
        id: 'trans-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        transmittalDate: '2024-03-15',
        copiesSent: 2,
        acknowledged: false,
        createdAt: '2024-03-15T00:00:00Z',
      }

      expect(transmittal.id).toBe('trans-1')
      expect(transmittal.copiesSent).toBe(2)
      expect(transmittal.acknowledged).toBe(false)
    })

    it('should track acknowledgment', () => {
      const transmittal: DrawingTransmittal = {
        id: 'trans-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        transmittalDate: '2024-03-15',
        recipientCompany: 'Acme Construction',
        recipientName: 'John Doe',
        copiesSent: 2,
        acknowledged: true,
        acknowledgedAt: '2024-03-16T10:00:00Z',
        acknowledgedBy: 'John Doe',
        createdAt: '2024-03-15T00:00:00Z',
      }

      expect(transmittal.acknowledged).toBe(true)
      expect(transmittal.acknowledgedAt).toBeDefined()
      expect(transmittal.acknowledgedBy).toBe('John Doe')
    })
  })

  describe('DrawingMarkup interface', () => {
    it('should have all required fields', () => {
      const markup: DrawingMarkup = {
        id: 'markup-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        pageNumber: 1,
        markupType: 'comment',
        color: '#FF0000',
        status: 'open',
        createdAt: '2024-03-20T00:00:00Z',
      }

      expect(markup.id).toBe('markup-1')
      expect(markup.markupType).toBe('comment')
      expect(markup.status).toBe('open')
    })

    it('should allow position and dimension', () => {
      const markup: DrawingMarkup = {
        id: 'markup-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        pageNumber: 1,
        xPosition: 150,
        yPosition: 200,
        width: 100,
        height: 50,
        markupType: 'cloud',
        content: 'Verify dimension',
        color: '#FF0000',
        status: 'open',
        createdAt: '2024-03-20T00:00:00Z',
      }

      expect(markup.xPosition).toBe(150)
      expect(markup.yPosition).toBe(200)
      expect(markup.width).toBe(100)
      expect(markup.height).toBe(50)
    })

    it('should track resolution', () => {
      const markup: DrawingMarkup = {
        id: 'markup-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        pageNumber: 1,
        markupType: 'comment',
        color: '#FF0000',
        status: 'resolved',
        resolvedAt: '2024-03-25T00:00:00Z',
        resolvedBy: 'user-123',
        resolutionNotes: 'Dimension verified and corrected',
        createdAt: '2024-03-20T00:00:00Z',
      }

      expect(markup.status).toBe('resolved')
      expect(markup.resolvedAt).toBeDefined()
      expect(markup.resolutionNotes).toContain('verified')
    })
  })

  describe('DrawingFilters interface', () => {
    it('should support all filter options', () => {
      const filters: DrawingFilters = {
        projectId: 'project-1',
        discipline: 'structural',
        status: 'active',
        isIssuedForConstruction: true,
        search: 'foundation',
        specSection: '03 30 00',
      }

      expect(filters.projectId).toBe('project-1')
      expect(filters.discipline).toBe('structural')
      expect(filters.isIssuedForConstruction).toBe(true)
    })
  })

  describe('DrawingRegisterEntry interface', () => {
    it('should have all expected fields', () => {
      const entry: DrawingRegisterEntry = {
        id: 'draw-1',
        drawingNumber: 'A-101',
        title: 'Floor Plan',
        discipline: 'architectural',
        currentRevision: '03',
        currentRevisionDate: '2024-03-15',
        status: 'active',
        isIssuedForConstruction: true,
        revisionCount: 3,
        lastTransmittalDate: '2024-03-16',
      }

      expect(entry.drawingNumber).toBe('A-101')
      expect(entry.revisionCount).toBe(3)
      expect(entry.isIssuedForConstruction).toBe(true)
    })
  })

  describe('DisciplineSummary interface', () => {
    it('should have all expected fields', () => {
      const summary: DisciplineSummary = {
        discipline: 'structural',
        totalDrawings: 25,
        ifcDrawings: 20,
        latestRevisionDate: '2024-03-15',
      }

      expect(summary.discipline).toBe('structural')
      expect(summary.totalDrawings).toBe(25)
      expect(summary.ifcDrawings).toBe(20)
    })
  })

  describe('RevisionHistoryEntry interface', () => {
    it('should have all expected fields', () => {
      const entry: RevisionHistoryEntry = {
        revision: '02',
        revisionDate: '2024-03-01',
        revisionDescription: 'Updated per RFI-025',
        revisionType: 'rfi_response',
        isCurrent: true,
        isSuperseded: false,
        fileUrl: 'https://example.com/files/A-101-02.pdf',
        createdByName: 'John Architect',
      }

      expect(entry.revision).toBe('02')
      expect(entry.revisionType).toBe('rfi_response')
      expect(entry.isCurrent).toBe(true)
    })
  })
})
