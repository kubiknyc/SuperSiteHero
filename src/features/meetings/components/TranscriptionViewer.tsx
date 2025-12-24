/**
 * Transcription Viewer Component
 * Displays timestamped transcript with click-to-seek and search functionality
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Clock,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Sparkles,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useTranscriptionSegments,
  useStartTranscription,
} from '../hooks/useMeetingRecordings';
import type { MeetingRecording, TranscriptionSegment } from '@/types/meeting-recordings';

interface TranscriptionViewerProps {
  recording: MeetingRecording;
  currentTimeMs?: number;
  onSeekToTime?: (timeMs: number) => void;
  className?: string;
}

export function TranscriptionViewer({
  recording,
  currentTimeMs = 0,
  onSeekToTime,
  className = '',
}: TranscriptionViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: segments, isLoading: isLoadingSegments } = useTranscriptionSegments(
    recording.transcription_status === 'completed' ? recording.id : undefined
  );

  const startTranscription = useStartTranscription();

  // Find active segment based on current time
  const activeSegmentIndex = useMemo(() => {
    if (!segments) return -1;
    return segments.findIndex(
      (seg) => currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms
    );
  }, [segments, currentTimeMs]);

  // Filter segments by search query
  const filteredSegments = useMemo(() => {
    if (!segments) return [];
    if (!searchQuery.trim()) return segments;

    const query = searchQuery.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(query));
  }, [segments, searchQuery]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && activeSegmentIndex >= 0) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Format time for display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle starting transcription
  const handleStartTranscription = async () => {
    try {
      await startTranscription.mutateAsync({
        recordingId: recording.id,
        language: recording.transcription_language || 'en',
      });
    } catch (err) {
      console.error('Transcription failed:', err);
    }
  };

  // Copy full transcription to clipboard
  const handleCopyTranscription = async () => {
    const fullText = recording.transcription_text || segments?.map((s) => s.text).join(' ') || '';
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download transcription as text file
  const handleDownloadTranscription = () => {
    const fullText = recording.transcription_text || segments?.map((s) => s.text).join('\n\n') || '';
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${recording.file_name.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Highlight search matches in text
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Render status badge
  const renderStatusBadge = () => {
    switch (recording.transcription_status) {
      case 'completed':
        return (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            Transcribed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="default" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing...
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Not Transcribed</Badge>
        );
    }
  };

  return (
    <Card className={className}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:text-primary transition-colors">
                <FileText className="h-5 w-5" />
                <CardTitle className="text-base">Transcription</CardTitle>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              {renderStatusBadge()}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* No transcription yet */}
            {!recording.transcription_status && recording.status === 'completed' && (
              <div className="text-center py-6 space-y-3">
                <Sparkles className="h-10 w-10 mx-auto text-disabled" />
                <p className="text-secondary">Recording ready for transcription</p>
                <Button
                  onClick={handleStartTranscription}
                  disabled={startTranscription.isPending}
                  className="gap-2"
                >
                  {startTranscription.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Start Transcription
                </Button>
                <p className="text-xs text-muted">
                  Cost: ~$0.006/minute of audio
                </p>
              </div>
            )}

            {/* Pending/In Progress */}
            {(recording.transcription_status === 'pending' ||
              recording.transcription_status === 'in_progress') && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                <p className="text-secondary">
                  {recording.transcription_status === 'pending'
                    ? 'Transcription queued...'
                    : 'Transcribing audio...'}
                </p>
                <p className="text-xs text-muted">
                  This may take a few minutes depending on the recording length.
                </p>
              </div>
            )}

            {/* Failed */}
            {recording.transcription_status === 'failed' && (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="h-10 w-10 mx-auto text-error" />
                <p className="text-error">Transcription failed</p>
                {recording.processing_error && (
                  <p className="text-sm text-muted">{recording.processing_error}</p>
                )}
                <Button
                  variant="outline"
                  onClick={handleStartTranscription}
                  disabled={startTranscription.isPending}
                  className="gap-2"
                >
                  {startTranscription.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Retry Transcription
                </Button>
              </div>
            )}

            {/* Completed - Show transcript */}
            {recording.transcription_status === 'completed' && (
              <>
                {/* Search and Actions */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTranscription}
                    className="gap-1"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownloadTranscription}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                {/* Auto-scroll toggle */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {filteredSegments.length} segment{filteredSegments.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </span>
                  <label className="flex items-center gap-2 text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded"
                    />
                    Auto-scroll
                  </label>
                </div>

                {/* Segments List */}
                {isLoadingSegments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-disabled" />
                  </div>
                ) : filteredSegments.length > 0 ? (
                  <ScrollArea className="h-80" ref={scrollContainerRef}>
                    <div className="space-y-2 pr-4">
                      {filteredSegments.map((segment, index) => {
                        const isActive =
                          !searchQuery &&
                          currentTimeMs >= segment.start_time_ms &&
                          currentTimeMs < segment.end_time_ms;
                        const originalIndex = segments?.findIndex((s) => s.id === segment.id) ?? -1;

                        return (
                          <div
                            key={segment.id}
                            ref={originalIndex === activeSegmentIndex ? activeSegmentRef : null}
                            className={`group flex gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-surface'
                            }`}
                            onClick={() => onSeekToTime?.(segment.start_time_ms)}
                          >
                            {/* Timestamp */}
                            <button
                              className={`flex items-center gap-1 text-xs font-mono whitespace-nowrap ${
                                isActive ? 'text-primary' : 'text-muted'
                              } hover:text-primary transition-colors`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeekToTime?.(segment.start_time_ms);
                              }}
                            >
                              <Play className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              {formatTime(segment.start_time_ms)}
                            </button>

                            {/* Text */}
                            <p
                              className={`flex-1 text-sm ${
                                isActive ? 'text-foreground' : 'text-secondary'
                              }`}
                            >
                              {highlightText(segment.text, searchQuery)}
                            </p>

                            {/* Confidence indicator */}
                            {segment.confidence !== null && segment.confidence < 0.8 && (
                              <Badge variant="outline" className="text-xs opacity-50">
                                {Math.round(segment.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted">
                    {searchQuery ? (
                      <p>No segments matching "{searchQuery}"</p>
                    ) : recording.transcription_text ? (
                      // Show full text if no segments available
                      <div className="text-left">
                        <p className="text-sm text-secondary whitespace-pre-wrap">
                          {recording.transcription_text}
                        </p>
                      </div>
                    ) : (
                      <p>No transcript available</p>
                    )}
                  </div>
                )}

                {/* Cost Info */}
                {recording.transcription_cost_cents && (
                  <p className="text-xs text-disabled text-center">
                    Transcription cost: ${(recording.transcription_cost_cents / 100).toFixed(3)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
