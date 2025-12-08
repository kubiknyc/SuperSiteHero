/**
 * Voice-to-Text Types
 * Types for Web Speech API integration for field notes
 */

// =============================================
// Core Types
// =============================================

/**
 * Voice recognition status
 */
export type VoiceRecognitionStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'error'
  | 'not_supported'

/**
 * Voice input mode
 */
export type VoiceInputMode =
  | 'replace'   // Replace existing text
  | 'append'    // Append to existing text

/**
 * Supported languages for speech recognition
 */
export type SpeechLanguage =
  | 'en-US'
  | 'en-GB'
  | 'es-ES'
  | 'es-MX'
  | 'fr-FR'
  | 'de-DE'
  | 'pt-BR'
  | 'zh-CN'

/**
 * Voice recognition error types
 */
export type VoiceRecognitionError =
  | 'not_supported'    // Browser doesn't support Web Speech API
  | 'not_allowed'      // Permission denied
  | 'no_speech'        // No speech detected
  | 'audio_capture'    // Audio capture failed
  | 'network'          // Network error
  | 'aborted'          // Recognition aborted
  | 'unknown'          // Unknown error

// =============================================
// Interfaces
// =============================================

/**
 * Options for useVoiceToText hook
 */
export interface UseVoiceToTextOptions {
  /** Callback when transcript is received */
  onTranscript?: (text: string, isFinal: boolean) => void
  /** Callback when error occurs */
  onError?: (error: VoiceRecognitionError, message: string) => void
  /** Callback when listening starts */
  onStart?: () => void
  /** Callback when listening ends */
  onEnd?: () => void
  /** Language for speech recognition */
  language?: SpeechLanguage
  /** Whether to continue listening after speech ends */
  continuous?: boolean
  /** Whether to show interim results */
  interimResults?: boolean
  /** Input mode - replace or append */
  inputMode?: VoiceInputMode
  /** Auto-stop after silence (milliseconds) */
  silenceTimeout?: number
}

/**
 * Return type for useVoiceToText hook
 */
export interface UseVoiceToTextReturn {
  /** Whether currently listening */
  isListening: boolean
  /** Current status */
  status: VoiceRecognitionStatus
  /** Whether Web Speech API is supported */
  isSupported: boolean
  /** Current transcript (interim or final) */
  transcript: string
  /** Final transcript only */
  finalTranscript: string
  /** Any error that occurred */
  error: VoiceRecognitionError | null
  /** Error message */
  errorMessage: string | null
  /** Start listening */
  startListening: () => void
  /** Stop listening */
  stopListening: () => void
  /** Toggle listening */
  toggleListening: () => void
  /** Clear transcript */
  clearTranscript: () => void
  /** Reset error state */
  resetError: () => void
}

/**
 * Props for VoiceInput component
 */
export interface VoiceInputProps {
  /** Current value of the text field */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Input mode */
  mode?: VoiceInputMode
  /** Language */
  language?: SpeechLanguage
  /** Whether component is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Class name for styling */
  className?: string
  /** Callback when listening starts */
  onListeningStart?: () => void
  /** Callback when listening ends */
  onListeningEnd?: () => void
}

/**
 * Props for VoiceButton component (standalone button)
 */
export interface VoiceButtonProps {
  /** Callback with transcript */
  onTranscript: (text: string) => void
  /** Language */
  language?: SpeechLanguage
  /** Whether button is disabled */
  disabled?: boolean
  /** Class name for styling */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show tooltip */
  showTooltip?: boolean
}

// =============================================
// Constants
// =============================================

/**
 * Language options for UI
 */
export const SPEECH_LANGUAGES: { value: SpeechLanguage; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
]

/**
 * Error messages for display
 */
export const VOICE_ERROR_MESSAGES: Record<VoiceRecognitionError, string> = {
  not_supported: 'Voice recognition is not supported in this browser',
  not_allowed: 'Microphone access was denied. Please allow microphone access to use voice input.',
  no_speech: 'No speech was detected. Please try again.',
  audio_capture: 'Failed to capture audio. Please check your microphone.',
  network: 'Network error occurred. Please check your connection.',
  aborted: 'Voice recognition was stopped.',
  unknown: 'An unknown error occurred. Please try again.',
}

/**
 * Status messages for display
 */
export const VOICE_STATUS_MESSAGES: Record<VoiceRecognitionStatus, string> = {
  idle: 'Click to start voice input',
  listening: 'Listening...',
  processing: 'Processing...',
  error: 'Error occurred',
  not_supported: 'Voice input not supported',
}

// =============================================
// Utility Functions
// =============================================

/**
 * Check if Web Speech API is supported
 */
export function isWebSpeechSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
}

/**
 * Get SpeechRecognition constructor (with webkit prefix fallback)
 */
export function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null

  return (
    (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition ||
    null
  )
}

/**
 * Map Web Speech API error to our error type
 */
export function mapSpeechError(error: string): VoiceRecognitionError {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not_allowed'
    case 'no-speech':
      return 'no_speech'
    case 'audio-capture':
      return 'audio_capture'
    case 'network':
      return 'network'
    case 'aborted':
      return 'aborted'
    default:
      return 'unknown'
  }
}

/**
 * Format transcript for display (capitalize first letter, add period if needed)
 */
export function formatTranscript(text: string): string {
  if (!text) return ''

  // Capitalize first letter
  let formatted = text.charAt(0).toUpperCase() + text.slice(1)

  // Add period if no ending punctuation
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.'
  }

  return formatted
}
