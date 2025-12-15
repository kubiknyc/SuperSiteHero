/**
 * Transcribe Recording Edge Function
 * Integrates with OpenAI Whisper API for audio/video transcription
 * Cost: $0.006/minute of audio
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscribeRequest {
  recording_id: string;
  language?: string;
}

interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface WhisperResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { recording_id, language = 'en' }: TranscribeRequest = await req.json();

    if (!recording_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'recording_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings')
      .select('*')
      .eq('id', recording_id)
      .single();

    if (recordingError || !recording) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recording not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already transcribed
    if (recording.transcription_status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recording already transcribed',
          transcription_text: recording.transcription_text,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to transcribing
    await supabase
      .from('meeting_recordings')
      .update({
        transcription_status: 'in_progress',
        status: 'transcribing',
      })
      .eq('id', recording_id);

    // Download the audio file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(recording.storage_bucket)
      .download(recording.storage_path);

    if (downloadError || !fileData) {
      await updateTranscriptionError(supabase, recording_id, 'Failed to download recording');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download recording' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare file for Whisper API
    const formData = new FormData();
    formData.append('file', fileData, recording.file_name);
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      await updateTranscriptionError(supabase, recording_id, `Whisper API error: ${whisperResponse.status}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Transcription failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whisperData: WhisperResponse = await whisperResponse.json();

    // Calculate cost ($0.006 per minute)
    const durationMinutes = Math.ceil(whisperData.duration / 60);
    const costCents = Math.round(durationMinutes * 0.6); // $0.006 = 0.6 cents

    // Insert transcription segments
    if (whisperData.segments && whisperData.segments.length > 0) {
      const segments = whisperData.segments.map((seg, index) => ({
        recording_id,
        start_time_ms: Math.round(seg.start * 1000),
        end_time_ms: Math.round(seg.end * 1000),
        text: seg.text.trim(),
        confidence: 1 - seg.no_speech_prob, // Use no_speech_prob as inverse confidence
        segment_index: index,
      }));

      const { error: segmentsError } = await supabase
        .from('recording_transcription_segments')
        .insert(segments);

      if (segmentsError) {
        console.error('Error inserting segments:', segmentsError);
      }
    }

    // Update recording with transcription
    const { error: updateError } = await supabase
      .from('meeting_recordings')
      .update({
        transcription_status: 'completed',
        transcription_text: whisperData.text,
        transcription_language: whisperData.language,
        transcription_cost_cents: costCents,
        duration_seconds: Math.round(whisperData.duration),
        status: 'completed',
      })
      .eq('id', recording_id);

    if (updateError) {
      console.error('Error updating recording:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save transcription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription_text: whisperData.text,
        duration_seconds: Math.round(whisperData.duration),
        segments_count: whisperData.segments?.length || 0,
        cost_cents: costCents,
        language: whisperData.language,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Transcribe recording error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateTranscriptionError(
  supabase: any,
  recordingId: string,
  error: string
): Promise<void> {
  await supabase
    .from('meeting_recordings')
    .update({
      transcription_status: 'failed',
      status: 'failed',
      processing_error: error,
    })
    .eq('id', recordingId);
}
