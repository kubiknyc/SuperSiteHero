/**
 * RemoteMarkupHighlight Component
 * Visual indicator showing which markups are being edited by other collaborators
 */

import { useMemo } from 'react';
import { Rect, Text as KonvaText, Group } from 'react-konva';
import type Konva from 'konva';
import type { RemoteEditHighlight } from '@/lib/realtime/markup-sync-types';

interface RemoteMarkupHighlightProps {
  highlights: RemoteEditHighlight[];
  stageRef: React.RefObject<Konva.Stage>;
  layerRef: React.RefObject<Konva.Layer>;
}

interface HighlightBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get the bounding box of a shape by its ID
 */
function getShapeBounds(
  markupId: string,
  layerRef: React.RefObject<Konva.Layer>
): HighlightBounds | null {
  if (!layerRef.current) {return null;}

  const shape = layerRef.current.findOne(`#${markupId}`);
  if (!shape) {return null;}

  const rect = shape.getClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Single highlight for a remote edit
 */
function SingleHighlight({
  highlight,
  bounds,
}: {
  highlight: RemoteEditHighlight;
  bounds: HighlightBounds;
}) {
  const padding = 8;
  const labelHeight = 18;
  const labelPadding = 4;

  // Shorten name if too long
  const displayName = highlight.userName.length > 12
    ? `${highlight.userName.slice(0, 10)}...`
    : highlight.userName;

  return (
    <Group>
      {/* Highlight border around the shape */}
      <Rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        stroke={highlight.userColor}
        strokeWidth={2}
        dash={[6, 3]}
        cornerRadius={4}
        listening={false}
        // Animation effect
        shadowColor={highlight.userColor}
        shadowBlur={8}
        shadowOpacity={0.4}
      />

      {/* User name label */}
      <Group x={bounds.x - padding} y={bounds.y - padding - labelHeight - 4}>
        {/* Label background */}
        <Rect
          width={displayName.length * 7 + labelPadding * 2}
          height={labelHeight}
          fill={highlight.userColor}
          cornerRadius={3}
        />
        {/* Label text */}
        <KonvaText
          x={labelPadding}
          y={3}
          text={displayName}
          fontSize={11}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#FFFFFF"
          fontStyle="bold"
        />
      </Group>
    </Group>
  );
}

/**
 * Container for all remote edit highlights
 * Renders highlights for markups being edited by other users
 */
export function RemoteMarkupHighlights({
  highlights,
  stageRef,
  layerRef,
}: RemoteMarkupHighlightProps) {
  // Calculate bounds for each highlight
  const highlightsWithBounds = useMemo(() => {
    return highlights
      .map((highlight) => {
        const bounds = getShapeBounds(highlight.markupId, layerRef);
        if (!bounds) {return null;}
        return { highlight, bounds };
      })
      .filter((h): h is { highlight: RemoteEditHighlight; bounds: HighlightBounds } => h !== null);
  }, [highlights, layerRef]);

  if (highlightsWithBounds.length === 0) {
    return null;
  }

  return (
    <>
      {highlightsWithBounds.map(({ highlight, bounds }) => (
        <SingleHighlight
          key={`${highlight.markupId}-${highlight.userId}`}
          highlight={highlight}
          bounds={bounds}
        />
      ))}
    </>
  );
}

/**
 * Hook to manage remote highlights with automatic cleanup
 */
export function useRemoteHighlights(
  initialHighlights: RemoteEditHighlight[] = []
) {
  // The actual highlight management is done in useMarkupCollaboration hook
  // This is a placeholder for any additional highlight-specific logic
  return useMemo(() => initialHighlights, [initialHighlights]);
}

/**
 * CSS-based highlight overlay for use outside of Konva
 * Useful for HTML-based indicators or when Konva Layer is not available
 */
export function RemoteEditOverlay({
  highlights,
  containerRef,
  scale = 1,
  offset = { x: 0, y: 0 },
}: {
  highlights: Array<{
    markupId: string;
    userName: string;
    userColor: string;
    bounds: HighlightBounds;
  }>;
  containerRef: React.RefObject<HTMLDivElement>;
  scale?: number;
  offset?: { x: number; y: number };
}) {
  if (highlights.length === 0 || !containerRef.current) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {highlights.map((highlight) => {
        const x = (highlight.bounds.x * scale) + offset.x;
        const y = (highlight.bounds.y * scale) + offset.y;
        const width = highlight.bounds.width * scale;
        const height = highlight.bounds.height * scale;

        return (
          <div
            key={highlight.markupId}
            className="absolute"
            style={{
              left: x - 8,
              top: y - 8,
              width: width + 16,
              height: height + 16,
            }}
          >
            {/* Highlight border */}
            <div
              className="absolute inset-0 rounded border-2 border-dashed animate-pulse"
              style={{
                borderColor: highlight.userColor,
                boxShadow: `0 0 8px ${highlight.userColor}40`,
              }}
            />

            {/* User label */}
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: highlight.userColor }}
            >
              {highlight.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RemoteMarkupHighlights;
