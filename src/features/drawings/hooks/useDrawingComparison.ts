/**
 * React Query hooks for Drawing Revision Comparison
 *
 * Provides hooks for:
 * - Comparing two drawing revisions with visual diff detection
 * - Fetching revisions for comparison selection
 * - Managing comparison state
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { drawingKeys } from './useDrawings';
import type {
  DrawingRevision,
  DrawingComparisonResult,
  DrawingComparisonOptions,
  ChangeRegion,
} from '@/types/drawing';
import {
  compareCanvasImages,
  analyzeChangeTypes,
  type DiffResult,
} from '@/features/documents/services/visual-diff';
import {
  renderDocumentToCanvas,
  getPdfInfo,
  type RenderPdfOptions,
} from '@/features/documents/utils/pdf-to-canvas';

// ============================================================================
// Query Keys
// ============================================================================

export const comparisonKeys = {
  all: [...drawingKeys.all, 'comparison'] as const,
  compare: (revision1Id: string, revision2Id: string, options?: DrawingComparisonOptions) =>
    [...comparisonKeys.all, revision1Id, revision2Id, options] as const,
  revisions: (drawingId: string) =>
    [...comparisonKeys.all, 'revisions', drawingId] as const,
};

// ============================================================================
// Comparison Hooks
// ============================================================================

/**
 * Transform database row to DrawingRevision type
 */
function transformRevision(row: Record<string, unknown>): DrawingRevision {
  return {
    id: row.id as string,
    drawingId: row.drawing_id as string,
    revision: row.revision as string,
    revisionDate: row.revision_date as string,
    revisionDescription: row.revision_description as string | undefined,
    revisionType: row.revision_type as DrawingRevision['revisionType'],
    sourceReference: row.source_reference as string | undefined,
    filePath: row.file_path as string | undefined,
    fileUrl: row.file_url as string | undefined,
    fileName: row.file_name as string | undefined,
    fileType: row.file_type as string | undefined,
    fileSize: row.file_size as number | undefined,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    isCurrent: row.is_current as boolean,
    isSuperseded: row.is_superseded as boolean,
    supersededDate: row.superseded_date as string | undefined,
    supersededBy: row.superseded_by as string | undefined,
    reviewedBy: row.reviewed_by as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    approvedBy: row.approved_by as string | undefined,
    approvedAt: row.approved_at as string | undefined,
    firstIssuedDate: row.first_issued_date as string | undefined,
    firstIssuedVia: row.first_issued_via as string | undefined,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | undefined,
    notes: row.notes as string | undefined,
  };
}

/**
 * Fetch revisions for a drawing suitable for comparison
 * Returns revisions with their file URLs and metadata
 */
export function useDrawingRevisionsForComparison(drawingId: string | undefined) {
  return useQuery({
    queryKey: comparisonKeys.revisions(drawingId || ''),
    queryFn: async (): Promise<DrawingRevision[]> => {
      if (!drawingId) {
        throw new Error('Drawing ID required');
      }

      const { data, error } = await supabase
        .from('drawing_revisions')
        .select('*')
        .eq('drawing_id', drawingId)
        .is('deleted_at', null)
        .order('revision_date', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(transformRevision);
    },
    enabled: !!drawingId,
  });
}

/**
 * Compare two drawing revisions with visual diff detection
 * Uses pixelmatch for pixel-level comparison and clusters changes into regions
 */
export function useDrawingRevisionComparison(
  revision1Id: string | undefined,
  revision2Id: string | undefined,
  options: DrawingComparisonOptions = {}
) {
  const { pageNumber = 1, dpi = 150, threshold = 0.1 } = options;

  return useQuery({
    queryKey: comparisonKeys.compare(revision1Id || '', revision2Id || '', { pageNumber, dpi, threshold }),
    queryFn: async (): Promise<DrawingComparisonResult> => {
      if (!revision1Id || !revision2Id) {
        throw new Error('Both revision IDs are required');
      }

      // Fetch both revisions to get their file URLs
      const [{ data: rev1, error: err1 }, { data: rev2, error: err2 }] = await Promise.all([
        supabase.from('drawing_revisions').select('*').eq('id', revision1Id).single(),
        supabase.from('drawing_revisions').select('*').eq('id', revision2Id).single(),
      ]);

      if (err1) {
        throw new Error(`Failed to fetch revision 1: ${err1.message}`);
      }
      if (err2) {
        throw new Error(`Failed to fetch revision 2: ${err2.message}`);
      }
      if (!rev1?.file_url) {
        throw new Error('Revision 1 has no file URL');
      }
      if (!rev2?.file_url) {
        throw new Error('Revision 2 has no file URL');
      }

      const renderOptions: RenderPdfOptions = {
        dpi,
        maxDimension: 2000,
        backgroundColor: '#FFFFFF',
      };

      // Determine file types (default to PDF for drawings)
      const fileType1 = rev1.file_type || 'application/pdf';
      const fileType2 = rev2.file_type || 'application/pdf';

      // Render both revisions to canvas
      const [canvas1, canvas2] = await Promise.all([
        renderDocumentToCanvas(rev1.file_url, fileType1, pageNumber, renderOptions),
        renderDocumentToCanvas(rev2.file_url, fileType2, pageNumber, renderOptions),
      ]);

      // Run the visual diff comparison
      const diffResult = compareCanvasImages(canvas1, canvas2, {
        threshold,
        minRegionSize: 100, // Filter out noise
        mergeDistance: 20,  // Merge nearby regions
      });

      // Get page counts for multi-page documents
      let page1Count = 1;
      let page2Count = 1;

      if (fileType1 === 'application/pdf') {
        const info = await getPdfInfo(rev1.file_url);
        page1Count = info.numPages;
      }
      if (fileType2 === 'application/pdf') {
        const info = await getPdfInfo(rev2.file_url);
        page2Count = info.numPages;
      }

      // Analyze change types for each region
      const canvas1Ctx = canvas1.getContext('2d');
      const canvas2Ctx = canvas2.getContext('2d');
      let enhancedRegions: ChangeRegion[] = diffResult.changeRegions;

      if (canvas1Ctx && canvas2Ctx && diffResult.changeRegions.length > 0) {
        const img1Data = canvas1Ctx.getImageData(0, 0, canvas1.width, canvas1.height);
        const img2Data = canvas2Ctx.getImageData(0, 0, canvas2.width, canvas2.height);

        enhancedRegions = diffResult.changeRegions.map((region) => ({
          ...region,
          changeType: analyzeChangeTypes(img1Data, img2Data, region),
          pageNumber,
        }));
      }

      // Generate summary
      const summary = generateComparisonSummary(diffResult, enhancedRegions);

      // Convert diff image to data URL for display
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = diffResult.diffImageData.width;
      diffCanvas.height = diffResult.diffImageData.height;
      const diffCtx = diffCanvas.getContext('2d');
      diffCtx?.putImageData(diffResult.diffImageData, 0, 0);
      const diffImageDataUrl = diffCanvas.toDataURL('image/png');

      return {
        revision1Id,
        revision2Id,
        revision1: transformRevision(rev1 as Record<string, unknown>),
        revision2: transformRevision(rev2 as Record<string, unknown>),
        changeRegions: enhancedRegions,
        overallChangePercentage: diffResult.overallChangePercentage,
        analyzedAt: new Date().toISOString(),
        summary,
        diffImageDataUrl,
        page1Count,
        page2Count,
      };
    },
    enabled: !!revision1Id && !!revision2Id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
    retry: 1,                  // Only retry once on failure
  });
}

/**
 * Generate a human-readable summary of the comparison
 */
function generateComparisonSummary(diffResult: DiffResult, regions: ChangeRegion[]): string {
  const { overallChangePercentage } = diffResult;
  const regionCount = regions.length;

  if (regionCount === 0) {
    return 'No visual differences detected between these revisions.';
  }

  const addedCount = regions.filter((r) => r.changeType === 'added').length;
  const removedCount = regions.filter((r) => r.changeType === 'removed').length;
  const modifiedCount = regions.filter((r) => r.changeType === 'modified').length;

  const parts: string[] = [];

  if (overallChangePercentage < 1) {
    parts.push('Minor changes detected');
  } else if (overallChangePercentage < 5) {
    parts.push('Moderate changes detected');
  } else if (overallChangePercentage < 20) {
    parts.push('Significant changes detected');
  } else {
    parts.push('Major changes detected');
  }

  parts.push(`(${overallChangePercentage.toFixed(1)}% of page)`);

  const changeParts: string[] = [];
  if (addedCount > 0) {
    changeParts.push(`${addedCount} addition${addedCount > 1 ? 's' : ''}`);
  }
  if (removedCount > 0) {
    changeParts.push(`${removedCount} removal${removedCount > 1 ? 's' : ''}`);
  }
  if (modifiedCount > 0) {
    changeParts.push(`${modifiedCount} modification${modifiedCount > 1 ? 's' : ''}`);
  }

  if (changeParts.length > 0) {
    parts.push(`- ${changeParts.join(', ')}`);
  }

  return parts.join(' ');
}

/**
 * Hook to get comparison state helpers
 * Provides common state management for comparison UI
 */
export function useComparisonState() {
  // This could be extended with more complex state management
  // Currently provides utility functions for common comparison patterns
  return {
    formatRevisionLabel: (revision: DrawingRevision): string => {
      return `Rev ${revision.revision || '?'}`;
    },
    formatRevisionDate: (revision: DrawingRevision): string => {
      if (!revision.revisionDate) {
        return 'Unknown date';
      }
      return new Date(revision.revisionDate).toLocaleDateString();
    },
    getChangeTypeLabel: (type: ChangeRegion['changeType']): string => {
      switch (type) {
        case 'added':
          return 'Added';
        case 'removed':
          return 'Removed';
        case 'modified':
          return 'Modified';
        default:
          return 'Changed';
      }
    },
  };
}

export default {
  useDrawingRevisionsForComparison,
  useDrawingRevisionComparison,
  useComparisonState,
  comparisonKeys,
};
