// File: src/components/ui/voice-input.tsx
// Voice input components for field data entry

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { useVoiceToText } from '@/hooks/useVoiceToText'
import type {
  VoiceInputProps,
  VoiceButtonProps,
  SpeechLanguage,
  VoiceInputMode,
} from '@/types/voice'
import { VOICE_STATUS_MESSAGES } from '@/types/voice'

/**
 * Microphone icon component
 */
function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

/**
 * Microphone off icon component
 */
function MicrophoneOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

/**
 * Standalone voice button for triggering speech recognition
 */
export function VoiceButton({
  onTranscript,
  language = 'en-US',
  disabled = false,
  className,
  size = 'md',
  showTooltip = true,
}: VoiceButtonProps) {
  const {
    isListening,
    isSupported,
    status,
    startListening,
    stopListening,
    finalTranscript,
    error,
  } = useVoiceToText({
    language: language as SpeechLanguage,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        onTranscript(text)
      }
    },
  })

  // Report final transcript when stopping
  React.useEffect(() => {
    if (!isListening && finalTranscript) {
      // Transcript already reported via onTranscript callback
    }
  }, [isListening, finalTranscript])

  if (!isSupported) {
    return null
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      className={cn(
        sizeClasses[size],
        isListening && 'animate-pulse',
        className
      )}
      onClick={isListening ? stopListening : startListening}
      disabled={disabled || !!error}
      title={showTooltip ? VOICE_STATUS_MESSAGES[status] : undefined}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isListening ? (
        <MicrophoneOffIcon className={iconSizes[size]} />
      ) : (
        <MicrophoneIcon className={iconSizes[size]} />
      )}
    </Button>
  )
}

/**
 * Voice input field with integrated speech recognition
 */
export function VoiceInput({
  value,
  onChange,
  mode = 'append',
  language = 'en-US',
  disabled = false,
  placeholder,
  className,
  onListeningStart,
  onListeningEnd,
}: VoiceInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const {
    isListening,
    isSupported,
    status,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    error,
    errorMessage,
  } = useVoiceToText({
    language: language as SpeechLanguage,
    interimResults: true,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        if (mode === 'replace') {
          onChange(text)
        } else {
          const newValue = value ? `${value} ${text}` : text
          onChange(newValue)
        }
      }
    },
    onStart: onListeningStart,
    onEnd: () => {
      clearTranscript()
      onListeningEnd?.()
    },
  })

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value, transcript])

  // Display value with interim transcript
  const displayValue = isListening && transcript ? `${value} ${transcript}`.trim() : value

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => {
          if (!isListening) {
            onChange(e.target.value)
          }
        }}
        placeholder={placeholder}
        disabled={disabled || isListening}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 pr-12 text-sm',
          'placeholder:text-disabled focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isListening && 'border-red-400 ring-2 ring-red-200',
          error && 'border-red-500'
        )}
        rows={3}
      />

      {/* Voice button */}
      {isSupported && (
        <div className="absolute right-2 top-2">
          <Button
            type="button"
            variant={isListening ? 'destructive' : 'ghost'}
            size="icon"
            className={cn(
              'h-8 w-8',
              isListening && 'animate-pulse'
            )}
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            title={VOICE_STATUS_MESSAGES[status]}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? (
              <MicrophoneOffIcon className="h-4 w-4" />
            ) : (
              <MicrophoneIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Status indicator */}
      {isListening && (
        <div className="absolute left-3 bottom-2 flex items-center gap-2 text-xs text-error">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          Listening...
        </div>
      )}

      {/* Error message */}
      {error && errorMessage && (
        <p className="mt-1 text-xs text-error">{errorMessage}</p>
      )}
    </div>
  )
}

/**
 * Simple voice button that can be placed next to any input
 */
export function VoiceInputButton({
  onTranscript,
  mode = 'append' as VoiceInputMode,
  currentValue = '',
  language = 'en-US' as SpeechLanguage,
  disabled = false,
  className,
}: {
  onTranscript: (value: string) => void
  mode?: VoiceInputMode
  currentValue?: string
  language?: SpeechLanguage
  disabled?: boolean
  className?: string
}) {
  const {
    isListening,
    isSupported,
    status,
    startListening,
    stopListening,
  } = useVoiceToText({
    language,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        if (mode === 'replace') {
          onTranscript(text)
        } else {
          const newValue = currentValue ? `${currentValue} ${text}` : text
          onTranscript(newValue)
        }
      }
    },
  })

  if (!isSupported) {
    return null
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'ghost'}
      size="icon"
      className={cn(
        'h-8 w-8 shrink-0',
        isListening && 'animate-pulse',
        className
      )}
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      title={VOICE_STATUS_MESSAGES[status]}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isListening ? (
        <MicrophoneOffIcon className="h-4 w-4" />
      ) : (
        <MicrophoneIcon className="h-4 w-4" />
      )}
    </Button>
  )
}

export { MicrophoneIcon, MicrophoneOffIcon }
