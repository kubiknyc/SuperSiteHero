/**
 * Meeting Recordings Hooks
 * Fetch, manage, and transcribe meeting recordings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseUntyped } from '@/lib/supabase';
import type {
  MeetingRecording,
  TranscriptionSegment,
  RecordingWithSegments,
  TranscriptionSearchResult,
} from '@/types/meeting-recordings';

// Query keys
const recordingsKeys = {
  all: ['meeting-recordings'] as const,
  lists: () => [...recordingsKeys.all, 'list'] as const,
  list: (meetingId: string) => [...recordingsKeys.lists(), meetingId] as const,
  detail: (id: string) => [...recordingsKeys.all, 'detail', id] as const,
  segments: (recordingId: string) => [...recordingsKeys.all, 'segments', recordingId] as const,
  search: (companyId: string, query: string) =>
    [...recordingsKeys.all, 'search', companyId, query] as const,
};

/**
 * Fetch all recordings for a meeting
 */
export function useMeetingRecordings(meetingId: string | undefined) {
  return useQuery({
    queryKey: recordingsKeys.list(meetingId || ''),
    queryFn: async () => {
      if (!meetingId) {throw new Error('Meeting ID required');}

      const { data, error } = await supabaseUntyped
        .from('meeting_recordings')
        .select('*')
        .eq('meeting_id', meetingId)
        .is('deleted_at', null)
        .order('recorded_at', { ascending: false });

      if (error) {throw error;}
      return data as MeetingRecording[];
    },
    enabled: !!meetingId,
  });
}

/**
 * Fetch a single recording with its transcription segments
 */
export function useMeetingRecording(recordingId: string | undefined) {
  return useQuery({
    queryKey: recordingsKeys.detail(recordingId || ''),
    queryFn: async () => {
      if (!recordingId) {throw new Error('Recording ID required');}

      const { data: recording, error: recordingError } = await supabaseUntyped
        .from('meeting_recordings')
        .select('*')
        .eq('id', recordingId)
        .single();

      if (recordingError) {throw recordingError;}

      // Fetch segments if transcription is complete
      let segments: TranscriptionSegment[] = [];
      if (recording.transcription_status === 'completed') {
        const { data: segmentsData, error: segmentsError } = await supabaseUntyped
          .from('recording_transcription_segments')
          .select('*')
          .eq('recording_id', recordingId)
          .order('segment_index', { ascending: true });

        if (!segmentsError && segmentsData) {
          segments = segmentsData as TranscriptionSegment[];
        }
      }

      return {
        ...recording,
        segments,
      } as RecordingWithSegments;
    },
    enabled: !!recordingId,
  });
}

/**
 * Fetch transcription segments for a recording
 */
export function useTranscriptionSegments(recordingId: string | undefined) {
  return useQuery({
    queryKey: recordingsKeys.segments(recordingId || ''),
    queryFn: async () => {
      if (!recordingId) {throw new Error('Recording ID required');}

      const { data, error } = await supabaseUntyped
        .from('recording_transcription_segments')
        .select('*')
        .eq('recording_id', recordingId)
        .order('segment_index', { ascending: true });

      if (error) {throw error;}
      return data as TranscriptionSegment[];
    },
    enabled: !!recordingId,
  });
}

/**
 * Start transcription for a recording
 */
export function useStartTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordingId,
      language = 'en',
    }: {
      recordingId: string;
      language?: string;
    }) => {
      // Update status to pending
      await supabaseUntyped
        .from('meeting_recordings')
        .update({ transcription_status: 'pending' })
        .eq('id', recordingId);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('transcribe-recording', {
        body: {
          recording_id: recordingId,
          language,
        },
      });

      if (error) {throw error;}
      if (!data.success) {throw new Error(data.error || 'Transcription failed');}

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: recordingsKeys.detail(variables.recordingId) });
      queryClient.invalidateQueries({ queryKey: recordingsKeys.segments(variables.recordingId) });
    },
  });
}

/**
 * Delete a recording
 */
export function useDeleteRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordingId: string) => {
      // Get recording details for cleanup
      const { data: recording, error: fetchError } = await supabaseUntyped
        .from('meeting_recordings')
        .select('meeting_id, storage_bucket, storage_path')
        .eq('id', recordingId)
        .single();

      if (fetchError) {throw fetchError;}

      // Soft delete the record
      const { error } = await supabaseUntyped
        .from('meeting_recordings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', recordingId);

      if (error) {throw error;}

      // Optionally delete from storage
      if (recording.storage_path) {
        await supabase.storage
          .from(recording.storage_bucket)
          .remove([recording.storage_path]);
      }

      return recording.meeting_id;
    },
    onSuccess: (meetingId) => {
      queryClient.invalidateQueries({ queryKey: recordingsKeys.list(meetingId) });
    },
  });
}

/**
 * Search within transcriptions
 */
export function useSearchTranscriptions(companyId: string | undefined, searchQuery: string) {
  return useQuery({
    queryKey: recordingsKeys.search(companyId || '', searchQuery),
    queryFn: async () => {
      if (!companyId || !searchQuery.trim()) {return [];}

      const { data, error } = await supabaseUntyped.rpc('search_recording_transcriptions', {
        p_company_id: companyId,
        p_search_query: searchQuery,
      });

      if (error) {throw error;}
      return data as TranscriptionSearchResult[];
    },
    enabled: !!companyId && searchQuery.trim().length >= 3,
  });
}

/**
 * Get signed URL for recording playback
 */
export function useRecordingUrl(recording: MeetingRecording | undefined) {
  return useQuery({
    queryKey: ['recording-url', recording?.id],
    queryFn: async () => {
      if (!recording) {throw new Error('Recording required');}

      const { data, error } = await supabase.storage
        .from(recording.storage_bucket)
        .createSignedUrl(recording.storage_path, 3600); // 1 hour expiry

      if (error) {throw error;}
      return data.signedUrl;
    },
    enabled: !!recording?.storage_path,
    staleTime: 50 * 60 * 1000, // Consider stale after 50 minutes
  });
}

/**
 * Update recording metadata
 */
export function useUpdateRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordingId,
      updates,
    }: {
      recordingId: string;
      updates: Partial<MeetingRecording>;
    }) => {
      const { data, error } = await supabaseUntyped
        .from('meeting_recordings')
        .update(updates)
        .eq('id', recordingId)
        .select()
        .single();

      if (error) {throw error;}
      return data as MeetingRecording;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recordingsKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: recordingsKeys.list(data.meeting_id) });
    },
  });
}
