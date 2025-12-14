// File: /src/features/drawings/hooks/useDrawings.test.tsx
// Tests for drawings hooks

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock drawingsApi
const mockGetDrawings = vi.fn()
const mockGetDrawing = vi.fn()
const mockGetDrawingWithRevisions = vi.fn()
const mockGetDrawingRegister = vi.fn()
const mockGetDrawingsByDiscipline = vi.fn()
const mockGetDrawingRevisions = vi.fn()
const mockGetRevisionHistory = vi.fn()
const mockGetCurrentRevision = vi.fn()
const mockGetDrawingSets = vi.fn()
const mockGetDrawingSet = vi.fn()
const mockGetDrawingTransmittals = vi.fn()
const mockGetDrawingMarkups = vi.fn()
const mockCreateDrawing = vi.fn()
const mockUpdateDrawing = vi.fn()
const mockDeleteDrawing = vi.fn()
const mockMarkDrawingIFC = vi.fn()
const mockBulkCreateDrawings = vi.fn()
const mockBulkMarkIFC = vi.fn()
const mockDuplicateDrawing = vi.fn()
const mockCreateRevision = vi.fn()
const mockUpdateRevision = vi.fn()
const mockSetCurrentRevision = vi.fn()
const mockCreateDrawingSet = vi.fn()
const mockAddDrawingToSet = vi.fn()
const mockRemoveDrawingFromSet = vi.fn()
const mockSetCurrentDrawingSet = vi.fn()
const mockCreateDrawingTransmittal = vi.fn()
const mockAcknowledgeDrawingTransmittal = vi.fn()
const mockCreateDrawingMarkup = vi.fn()
const mockUpdateDrawingMarkup = vi.fn()
const mockResolveDrawingMarkup = vi.fn()

vi.mock('@/lib/api/services/drawings', () => ({
  drawingsApi: {
    getDrawings: (...args: unknown[]) => mockGetDrawings(...args),
    getDrawing: (...args: unknown[]) => mockGetDrawing(...args),
    getDrawingWithRevisions: (...args: unknown[]) => mockGetDrawingWithRevisions(...args),
    getDrawingRegister: (...args: unknown[]) => mockGetDrawingRegister(...args),
    getDrawingsByDiscipline: (...args: unknown[]) => mockGetDrawingsByDiscipline(...args),
    getDrawingRevisions: (...args: unknown[]) => mockGetDrawingRevisions(...args),
    getRevisionHistory: (...args: unknown[]) => mockGetRevisionHistory(...args),
    getCurrentRevision: (...args: unknown[]) => mockGetCurrentRevision(...args),
    getDrawingSets: (...args: unknown[]) => mockGetDrawingSets(...args),
    getDrawingSet: (...args: unknown[]) => mockGetDrawingSet(...args),
    getDrawingTransmittals: (...args: unknown[]) => mockGetDrawingTransmittals(...args),
    getDrawingMarkups: (...args: unknown[]) => mockGetDrawingMarkups(...args),
    createDrawing: (...args: unknown[]) => mockCreateDrawing(...args),
    updateDrawing: (...args: unknown[]) => mockUpdateDrawing(...args),
    deleteDrawing: (...args: unknown[]) => mockDeleteDrawing(...args),
    markDrawingIFC: (...args: unknown[]) => mockMarkDrawingIFC(...args),
    bulkCreateDrawings: (...args: unknown[]) => mockBulkCreateDrawings(...args),
    bulkMarkIFC: (...args: unknown[]) => mockBulkMarkIFC(...args),
    duplicateDrawing: (...args: unknown[]) => mockDuplicateDrawing(...args),
    createRevision: (...args: unknown[]) => mockCreateRevision(...args),
    updateRevision: (...args: unknown[]) => mockUpdateRevision(...args),
    setCurrentRevision: (...args: unknown[]) => mockSetCurrentRevision(...args),
    createDrawingSet: (...args: unknown[]) => mockCreateDrawingSet(...args),
    addDrawingToSet: (...args: unknown[]) => mockAddDrawingToSet(...args),
    removeDrawingFromSet: (...args: unknown[]) => mockRemoveDrawingFromSet(...args),
    setCurrentDrawingSet: (...args: unknown[]) => mockSetCurrentDrawingSet(...args),
    createDrawingTransmittal: (...args: unknown[]) => mockCreateDrawingTransmittal(...args),
    acknowledgeDrawingTransmittal: (...args: unknown[]) => mockAcknowledgeDrawingTransmittal(...args),
    createDrawingMarkup: (...args: unknown[]) => mockCreateDrawingMarkup(...args),
    updateDrawingMarkup: (...args: unknown[]) => mockUpdateDrawingMarkup(...args),
    resolveDrawingMarkup: (...args: unknown[]) => mockResolveDrawingMarkup(...args),
  },
}))

import {
  drawingKeys,
  useDrawings,
  useDrawingsByDiscipline,
  useIFCDrawings,
  useDrawing,
  useDrawingWithRevisions,
  useDrawingRegister,
  useDrawingsByDisciplineSummary,
  useDrawingRevisions,
  useRevisionHistory,
  useCurrentRevision,
  useDrawingSets,
  useDrawingSet,
  useDrawingTransmittals,
  useDrawingMarkups,
  useCreateDrawing,
  useUpdateDrawing,
  useDeleteDrawing,
  useMarkDrawingIFC,
  useBulkCreateDrawings,
  useBulkMarkIFC,
  useDuplicateDrawing,
  useCreateRevision,
  useUpdateRevision,
  useSetCurrentRevision,
  useCreateDrawingSet,
  useAddDrawingToSet,
  useRemoveDrawingFromSet,
  useSetCurrentDrawingSet,
  useCreateDrawingTransmittal,
  useAcknowledgeTransmittal,
  useCreateDrawingMarkup,
  useUpdateDrawingMarkup,
  useResolveDrawingMarkup,
} from './useDrawings'

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock drawing data
const mockDrawing = {
  id: 'draw-1',
  companyId: 'company-123',
  projectId: 'project-123',
  drawingNumber: 'A-101',
  title: 'Floor Plan - Level 1',
  discipline: 'architectural',
  status: 'active',
  isIssuedForConstruction: true,
  currentRevision: '02',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockRevision = {
  id: 'rev-1',
  drawingId: 'draw-1',
  revision: '02',
  revisionDate: '2024-03-15',
  revisionType: 'standard',
  isCurrent: true,
  isSuperseded: false,
  createdAt: '2024-03-15T00:00:00Z',
}

const mockDrawingSet = {
  id: 'set-1',
  companyId: 'company-123',
  projectId: 'project-123',
  name: 'IFC Set 1',
  setDate: '2024-03-01',
  isCurrent: true,
  status: 'issued',
  createdAt: '2024-03-01T00:00:00Z',
  updatedAt: '2024-03-01T00:00:00Z',
}

const mockMarkup = {
  id: 'markup-1',
  drawingId: 'draw-1',
  revisionId: 'rev-1',
  pageNumber: 1,
  markupType: 'comment',
  color: '#FF0000',
  status: 'open',
  createdAt: '2024-03-20T00:00:00Z',
}

describe('useDrawings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('drawingKeys', () => {
    it('should generate correct all key', () => {
      expect(drawingKeys.all).toEqual(['drawings'])
    })

    it('should generate correct lists key', () => {
      expect(drawingKeys.lists()).toEqual(['drawings', 'list'])
    })

    it('should generate correct list key with projectId', () => {
      expect(drawingKeys.list('project-123')).toEqual(['drawings', 'list', 'project-123', undefined])
    })

    it('should generate correct list key with filters', () => {
      const filters = { discipline: 'structural' as const }
      expect(drawingKeys.list('project-123', filters)).toEqual([
        'drawings',
        'list',
        'project-123',
        filters,
      ])
    })

    it('should generate correct details key', () => {
      expect(drawingKeys.details()).toEqual(['drawings', 'detail'])
    })

    it('should generate correct detail key', () => {
      expect(drawingKeys.detail('draw-1')).toEqual(['drawings', 'detail', 'draw-1'])
    })

    it('should generate correct withRevisions key', () => {
      expect(drawingKeys.withRevisions('draw-1')).toEqual([
        'drawings',
        'detail',
        'draw-1',
        'revisions',
      ])
    })

    it('should generate correct register key', () => {
      expect(drawingKeys.register('project-123')).toEqual(['drawings', 'register', 'project-123'])
    })

    it('should generate correct byDiscipline key', () => {
      expect(drawingKeys.byDiscipline('project-123')).toEqual([
        'drawings',
        'by-discipline',
        'project-123',
      ])
    })

    it('should generate correct revisions key', () => {
      expect(drawingKeys.revisions('draw-1')).toEqual(['drawings', 'revisions', 'draw-1'])
    })

    it('should generate correct revisionHistory key', () => {
      expect(drawingKeys.revisionHistory('draw-1')).toEqual([
        'drawings',
        'revision-history',
        'draw-1',
      ])
    })

    it('should generate correct sets key', () => {
      expect(drawingKeys.sets('project-123')).toEqual(['drawings', 'sets', 'project-123'])
    })

    it('should generate correct set key', () => {
      expect(drawingKeys.set('set-1')).toEqual(['drawings', 'set', 'set-1'])
    })

    it('should generate correct transmittals key', () => {
      expect(drawingKeys.transmittals('draw-1')).toEqual(['drawings', 'transmittals', 'draw-1'])
    })

    it('should generate correct markups key', () => {
      expect(drawingKeys.markups('rev-1')).toEqual(['drawings', 'markups', 'rev-1'])
    })
  })

  describe('useDrawings hook', () => {
    it('should fetch drawings for a project', async () => {
      mockGetDrawings.mockResolvedValue([mockDrawing])

      const { result } = renderHook(() => useDrawings('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetDrawings).toHaveBeenCalledWith({ projectId: 'project-123' })
    })

    it('should fetch drawings with filters', async () => {
      mockGetDrawings.mockResolvedValue([mockDrawing])

      const filters = { discipline: 'architectural' as const }
      const { result } = renderHook(() => useDrawings('project-123', filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawings).toHaveBeenCalledWith({
        projectId: 'project-123',
        discipline: 'architectural',
      })
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useDrawings(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useDrawingsByDiscipline hook', () => {
    it('should fetch drawings by discipline', async () => {
      mockGetDrawings.mockResolvedValue([mockDrawing])

      const { result } = renderHook(
        () => useDrawingsByDiscipline('project-123', 'structural'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawings).toHaveBeenCalledWith({
        projectId: 'project-123',
        discipline: 'structural',
      })
    })
  })

  describe('useIFCDrawings hook', () => {
    it('should fetch only IFC drawings', async () => {
      mockGetDrawings.mockResolvedValue([mockDrawing])

      const { result } = renderHook(() => useIFCDrawings('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawings).toHaveBeenCalledWith({
        projectId: 'project-123',
        isIssuedForConstruction: true,
      })
    })
  })

  describe('useDrawing hook', () => {
    it('should fetch a single drawing', async () => {
      mockGetDrawing.mockResolvedValue(mockDrawing)

      const { result } = renderHook(() => useDrawing('draw-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.id).toBe('draw-1')
      expect(mockGetDrawing).toHaveBeenCalledWith('draw-1')
    })

    it('should be disabled when drawingId is undefined', () => {
      const { result } = renderHook(() => useDrawing(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useDrawingWithRevisions hook', () => {
    it('should fetch drawing with revisions', async () => {
      mockGetDrawingWithRevisions.mockResolvedValue({
        ...mockDrawing,
        revisions: [mockRevision],
      })

      const { result } = renderHook(() => useDrawingWithRevisions('draw-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawingWithRevisions).toHaveBeenCalledWith('draw-1')
    })
  })

  describe('useDrawingRegister hook', () => {
    it('should fetch drawing register', async () => {
      mockGetDrawingRegister.mockResolvedValue([mockDrawing])

      const { result } = renderHook(() => useDrawingRegister('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawingRegister).toHaveBeenCalledWith('project-123')
    })
  })

  describe('useDrawingsByDisciplineSummary hook', () => {
    it('should fetch discipline summary', async () => {
      const summary = [
        { discipline: 'architectural', totalDrawings: 20, ifcDrawings: 15 },
        { discipline: 'structural', totalDrawings: 15, ifcDrawings: 12 },
      ]
      mockGetDrawingsByDiscipline.mockResolvedValue(summary)

      const { result } = renderHook(() => useDrawingsByDisciplineSummary('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawingsByDiscipline).toHaveBeenCalledWith('project-123')
    })
  })

  describe('useDrawingRevisions hook', () => {
    it('should fetch drawing revisions', async () => {
      mockGetDrawingRevisions.mockResolvedValue([mockRevision])

      const { result } = renderHook(() => useDrawingRevisions('draw-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetDrawingRevisions).toHaveBeenCalledWith('draw-1')
    })
  })

  describe('useRevisionHistory hook', () => {
    it('should fetch revision history', async () => {
      mockGetRevisionHistory.mockResolvedValue([mockRevision])

      const { result } = renderHook(() => useRevisionHistory('draw-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetRevisionHistory).toHaveBeenCalledWith('draw-1')
    })
  })

  describe('useCurrentRevision hook', () => {
    it('should fetch current revision', async () => {
      mockGetCurrentRevision.mockResolvedValue(mockRevision)

      const { result } = renderHook(() => useCurrentRevision('draw-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.isCurrent).toBe(true)
    })
  })

  describe('useDrawingSets hook', () => {
    it('should fetch drawing sets', async () => {
      mockGetDrawingSets.mockResolvedValue([mockDrawingSet])

      const { result } = renderHook(() => useDrawingSets('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetDrawingSets).toHaveBeenCalledWith('project-123')
    })
  })

  describe('useDrawingSet hook', () => {
    it('should fetch a single drawing set', async () => {
      mockGetDrawingSet.mockResolvedValue(mockDrawingSet)

      const { result } = renderHook(() => useDrawingSet('set-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.id).toBe('set-1')
    })
  })

  describe('useDrawingTransmittals hook', () => {
    it('should fetch drawing transmittals', async () => {
      const transmittal = {
        id: 'trans-1',
        drawingId: 'draw-1',
        transmittalDate: '2024-03-15',
        copiesSent: 2,
      }
      mockGetDrawingTransmittals.mockResolvedValue([transmittal])

      const { result } = renderHook(() => useDrawingTransmittals('draw-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
    })
  })

  describe('useDrawingMarkups hook', () => {
    it('should fetch drawing markups', async () => {
      mockGetDrawingMarkups.mockResolvedValue([mockMarkup])

      const { result } = renderHook(() => useDrawingMarkups('rev-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
    })

    it('should fetch markups with status filter', async () => {
      mockGetDrawingMarkups.mockResolvedValue([mockMarkup])

      const { result } = renderHook(() => useDrawingMarkups('rev-1', 'open'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDrawingMarkups).toHaveBeenCalledWith('rev-1', 'open')
    })
  })

  describe('useCreateDrawing hook', () => {
    it('should create a drawing', async () => {
      mockCreateDrawing.mockResolvedValue(mockDrawing)

      const { result } = renderHook(() => useCreateDrawing(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        companyId: 'company-123',
        projectId: 'project-123',
        drawingNumber: 'A-101',
        title: 'Floor Plan',
        discipline: 'architectural',
      })

      expect(mockCreateDrawing).toHaveBeenCalled()
    })
  })

  describe('useUpdateDrawing hook', () => {
    it('should update a drawing', async () => {
      mockUpdateDrawing.mockResolvedValue({ ...mockDrawing, title: 'Updated Title' })

      const { result } = renderHook(() => useUpdateDrawing(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'draw-1',
        updates: { title: 'Updated Title' },
      })

      expect(mockUpdateDrawing).toHaveBeenCalledWith('draw-1', { title: 'Updated Title' })
    })
  })

  describe('useDeleteDrawing hook', () => {
    it('should delete a drawing', async () => {
      mockDeleteDrawing.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteDrawing(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('draw-1')

      expect(mockDeleteDrawing).toHaveBeenCalledWith('draw-1')
    })
  })

  describe('useMarkDrawingIFC hook', () => {
    it('should mark drawing as IFC', async () => {
      mockMarkDrawingIFC.mockResolvedValue({
        ...mockDrawing,
        isIssuedForConstruction: true,
        ifcDate: '2024-03-15',
      })

      const { result } = renderHook(() => useMarkDrawingIFC(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ id: 'draw-1', ifcDate: '2024-03-15' })

      expect(mockMarkDrawingIFC).toHaveBeenCalledWith('draw-1', '2024-03-15')
    })
  })

  describe('useBulkCreateDrawings hook', () => {
    it('should bulk create drawings', async () => {
      mockBulkCreateDrawings.mockResolvedValue([mockDrawing])

      const { result } = renderHook(() => useBulkCreateDrawings(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync([
        {
          companyId: 'company-123',
          projectId: 'project-123',
          drawingNumber: 'A-101',
          title: 'Floor Plan 1',
          discipline: 'architectural',
        },
      ])

      expect(mockBulkCreateDrawings).toHaveBeenCalled()
    })
  })

  describe('useBulkMarkIFC hook', () => {
    it('should bulk mark drawings as IFC', async () => {
      mockBulkMarkIFC.mockResolvedValue([mockDrawing])

      const { result } = renderHook(() => useBulkMarkIFC(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        drawingIds: ['draw-1', 'draw-2'],
        ifcDate: '2024-03-15',
      })

      expect(mockBulkMarkIFC).toHaveBeenCalledWith(['draw-1', 'draw-2'], '2024-03-15')
    })
  })

  describe('useDuplicateDrawing hook', () => {
    it('should duplicate a drawing', async () => {
      mockDuplicateDrawing.mockResolvedValue({ ...mockDrawing, id: 'draw-2', drawingNumber: 'A-102' })

      const { result } = renderHook(() => useDuplicateDrawing(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ drawingId: 'draw-1', newNumber: 'A-102' })

      expect(mockDuplicateDrawing).toHaveBeenCalledWith('draw-1', 'A-102')
    })
  })

  describe('useCreateRevision hook', () => {
    it('should create a revision', async () => {
      mockCreateRevision.mockResolvedValue(mockRevision)

      const { result } = renderHook(() => useCreateRevision(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        drawingId: 'draw-1',
        revision: '03',
        revisionDate: '2024-04-01',
      })

      expect(mockCreateRevision).toHaveBeenCalled()
    })
  })

  describe('useUpdateRevision hook', () => {
    it('should update a revision', async () => {
      mockUpdateRevision.mockResolvedValue(mockRevision)

      const { result } = renderHook(() => useUpdateRevision(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'rev-1',
        drawingId: 'draw-1',
        updates: { revisionDescription: 'Updated description' },
      })

      expect(mockUpdateRevision).toHaveBeenCalledWith('rev-1', {
        revisionDescription: 'Updated description',
      })
    })
  })

  describe('useSetCurrentRevision hook', () => {
    it('should set current revision', async () => {
      mockSetCurrentRevision.mockResolvedValue(mockRevision)

      const { result } = renderHook(() => useSetCurrentRevision(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ revisionId: 'rev-1', drawingId: 'draw-1' })

      expect(mockSetCurrentRevision).toHaveBeenCalledWith('rev-1')
    })
  })

  describe('useCreateDrawingSet hook', () => {
    it('should create a drawing set', async () => {
      mockCreateDrawingSet.mockResolvedValue(mockDrawingSet)

      const { result } = renderHook(() => useCreateDrawingSet(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        companyId: 'company-123',
        projectId: 'project-123',
        name: 'IFC Set 2',
        setDate: '2024-04-01',
      })

      expect(mockCreateDrawingSet).toHaveBeenCalled()
    })
  })

  describe('useAddDrawingToSet hook', () => {
    it('should add drawing to set', async () => {
      mockAddDrawingToSet.mockResolvedValue({})

      const { result } = renderHook(() => useAddDrawingToSet(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        drawingSetId: 'set-1',
        drawingId: 'draw-1',
        revisionId: 'rev-1',
      })

      expect(mockAddDrawingToSet).toHaveBeenCalled()
    })
  })

  describe('useRemoveDrawingFromSet hook', () => {
    it('should remove drawing from set', async () => {
      mockRemoveDrawingFromSet.mockResolvedValue(undefined)

      const { result } = renderHook(() => useRemoveDrawingFromSet(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ setId: 'set-1', drawingId: 'draw-1' })

      expect(mockRemoveDrawingFromSet).toHaveBeenCalledWith('set-1', 'draw-1')
    })
  })

  describe('useSetCurrentDrawingSet hook', () => {
    it('should set current drawing set', async () => {
      mockSetCurrentDrawingSet.mockResolvedValue(mockDrawingSet)

      const { result } = renderHook(() => useSetCurrentDrawingSet(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ setId: 'set-1', projectId: 'project-123' })

      expect(mockSetCurrentDrawingSet).toHaveBeenCalledWith('set-1', 'project-123')
    })
  })

  describe('useCreateDrawingTransmittal hook', () => {
    it('should create a transmittal', async () => {
      const transmittal = { id: 'trans-1', drawingId: 'draw-1' }
      mockCreateDrawingTransmittal.mockResolvedValue(transmittal)

      const { result } = renderHook(() => useCreateDrawingTransmittal(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        transmittalDate: '2024-03-15',
      })

      expect(mockCreateDrawingTransmittal).toHaveBeenCalled()
    })
  })

  describe('useAcknowledgeTransmittal hook', () => {
    it('should acknowledge transmittal', async () => {
      mockAcknowledgeDrawingTransmittal.mockResolvedValue({})

      const { result } = renderHook(() => useAcknowledgeTransmittal(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'trans-1',
        drawingId: 'draw-1',
        acknowledgedBy: 'user-123',
      })

      expect(mockAcknowledgeDrawingTransmittal).toHaveBeenCalledWith('trans-1', 'user-123')
    })
  })

  describe('useCreateDrawingMarkup hook', () => {
    it('should create a markup', async () => {
      mockCreateDrawingMarkup.mockResolvedValue(mockMarkup)

      const { result } = renderHook(() => useCreateDrawingMarkup(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        drawingId: 'draw-1',
        revisionId: 'rev-1',
        markupType: 'comment',
      })

      expect(mockCreateDrawingMarkup).toHaveBeenCalled()
    })
  })

  describe('useUpdateDrawingMarkup hook', () => {
    it('should update a markup', async () => {
      mockUpdateDrawingMarkup.mockResolvedValue(mockMarkup)

      const { result } = renderHook(() => useUpdateDrawingMarkup(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'markup-1',
        revisionId: 'rev-1',
        updates: { content: 'Updated content' },
      })

      expect(mockUpdateDrawingMarkup).toHaveBeenCalledWith('markup-1', { content: 'Updated content' })
    })
  })

  describe('useResolveDrawingMarkup hook', () => {
    it('should resolve a markup', async () => {
      mockResolveDrawingMarkup.mockResolvedValue({ ...mockMarkup, status: 'resolved' })

      const { result } = renderHook(() => useResolveDrawingMarkup(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'markup-1',
        revisionId: 'rev-1',
        notes: 'Resolved - dimension corrected',
      })

      expect(mockResolveDrawingMarkup).toHaveBeenCalledWith('markup-1', 'Resolved - dimension corrected')
    })
  })
})
