/**
 * Voice Message Recorder Component
 *
 * Records and sends voice messages in conversations.
 * Features:
 * - Audio level visualization during recording
 * - Recording duration display
 * - Max 2-minute recordings
 * - Cancel/send controls
 */

import { useState, useCallback } from 'react'
import { Mic, MicOff, Send, X, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useVoiceRecorder, formatRecordingDuration } from '@/hooks/useVoiceRecorder'
import { uploadVoiceMessage } from '@/lib/storage/message-uploads'
import { useSendMessage } from '../hooks'
import { toast } from '@/lib/notifications/ToastContext'
import type { MessageAttachment } from '@/types/messaging'
import { logger } from '../../../lib/utils/logger';


interface VoiceMessageRecorderProps {
  conversationId: string
  className?: string
  onSent?: () => void
  /** Compact mode for inline display */
  compact?: boolean
}

export function VoiceMessageRecorder({
  conversationId,
  className,
  onSent,
  compact = false,
}: VoiceMessageRecorderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)

  const sendMessage = useSendMessage()

  const handleRecordingComplete = useCallback((blob: Blob, duration: number) => {
    setRecordedBlob(blob)
    setRecordedDuration(duration)
  }, [])

  const {
    isRecording,
    duration,
    isSupported,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder({
    maxDuration: 120, // 2 minutes max
    onRecordingComplete: handleRecordingComplete,
    onError: (err) => {
      toast.error(err.message || 'Recording failed')
    },
  })

  // Send the recorded voice message
  const sendVoiceMessage = useCallback(async () => {
    if (!recordedBlob) {return}

    setIsUploading(true)
    try {
      // Upload to Supabase Storage
      const attachment = await uploadVoiceMessage(
        conversationId,
        recordedBlob,
        recordedDuration
      )

      // Send message with voice attachment
      await sendMessage.mutateAsync({
        conversation_id: conversationId,
        content: `[Voice message - ${formatRecordingDuration(recordedDuration)}]`,
        message_type: 'file',
        attachments: [attachment],
      })

      // Clear recorded blob
      setRecordedBlob(null)
      setRecordedDuration(0)
      toast.success('Voice message sent')
      onSent?.()
    } catch (err) {
      logger.error('Failed to send voice message:', err)
      toast.error('Failed to send voice message')
    } finally {
      setIsUploading(false)
    }
  }, [recordedBlob, recordedDuration, conversationId, sendMessage, onSent])

  // Cancel and clear recorded blob
  const handleCancel = useCallback(() => {
    if (isRecording) {
      cancelRecording()
    }
    setRecordedBlob(null)
    setRecordedDuration(0)
  }, [isRecording, cancelRecording])

  if (!isSupported) {
    return null
  }

  // Recorded state - show preview and send/cancel buttons
  if (recordedBlob && !isRecording) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary-hover">
            {formatRecordingDuration(recordedDuration)}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted hover:text-secondary"
          onClick={handleCancel}
          disabled={isUploading}
          title="Discard recording"
        >
          <X className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={sendVoiceMessage}
          disabled={isUploading}
          title="Send voice message"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    )
  }

  // Recording state - show duration, levels, and stop button
  if (isRecording) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Audio level indicator */}
        <div className="flex items-center gap-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          {/* Audio level bars */}
          <div className="flex items-end gap-0.5 h-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 bg-red-400 rounded-sm transition-all duration-75',
                  audioLevel > i * 0.2 ? 'opacity-100' : 'opacity-30'
                )}
                style={{
                  height: `${Math.max(4, Math.min(24, audioLevel * 100 * (1 + i * 0.2)))}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Duration */}
        <span className="text-sm font-mono text-error min-w-[40px]">
          {formatRecordingDuration(duration)}
        </span>

        {/* Cancel button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted hover:text-secondary"
          onClick={handleCancel}
          title="Cancel recording"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Stop button */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={stopRecording}
          title="Stop recording"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Default state - show record button
  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-9 w-9 p-0 flex-shrink-0', className)}
        onClick={startRecording}
        disabled={!!error}
        title="Record voice message (up to 2 minutes)"
      >
        <Mic className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={startRecording}
        disabled={!!error}
        title="Record voice message (up to 2 minutes)"
      >
        <Mic className="h-4 w-4" />
        <span>Voice Message</span>
      </Button>
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
    </div>
  )
}

export default VoiceMessageRecorder
