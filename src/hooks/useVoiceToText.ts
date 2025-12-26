// File: src/hooks/useVoiceToText.ts
// Voice-to-text hook using Web Speech API for field notes

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  UseVoiceToTextOptions,
  UseVoiceToTextReturn,
  VoiceRecognitionStatus,
  VoiceRecognitionError,
  SpeechLanguage,
} from '@/types/voice'
import {
  isWebSpeechSupported,
  getSpeechRecognition,
  mapSpeechError,
  VOICE_ERROR_MESSAGES,
} from '@/types/voice'
import { logger } from '../lib/utils/logger';


/**
 * Hook for voice-to-text input using Web Speech API
 *
 * @example
 * ```tsx
 * const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceToText({
 *   onTranscript: (text, isFinal) => {
 *     if (isFinal) setFieldValue(text)
 *   },
 *   language: 'en-US',
 * })
 * ```
 */
export function useVoiceToText(options: UseVoiceToTextOptions = {}): UseVoiceToTextReturn {
  const {
    onTranscript,
    onError,
    onStart,
    onEnd,
    language = 'en-US' as SpeechLanguage,
    continuous = false,
    interimResults = true,
    silenceTimeout = 3000,
  } = options

  // State
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState<VoiceRecognitionStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<VoiceRecognitionError | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSupported = isWebSpeechSupported()

  // Callback refs to avoid re-creating recognition instance
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)
  const onStartRef = useRef(onStart)
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onErrorRef.current = onError
    onStartRef.current = onStart
    onEndRef.current = onEnd
  }, [onTranscript, onError, onStart, onEnd])

  // Clear silence timeout
  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
  }, [])

  // Reset silence timeout
  const resetSilenceTimeout = useCallback(() => {
    clearSilenceTimeout()
    if (silenceTimeout > 0 && !continuous) {
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop()
        }
      }, silenceTimeout)
    }
  }, [clearSilenceTimeout, silenceTimeout, continuous, isListening])

  // Initialize recognition
  useEffect(() => {
    if (!isSupported) {
      setStatus('not_supported')
      return
    }

    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setStatus('not_supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults

    recognition.onstart = () => {
      setIsListening(true)
      setStatus('listening')
      setError(null)
      setErrorMessage(null)
      onStartRef.current?.()
    }

    recognition.onend = () => {
      setIsListening(false)
      setStatus('idle')
      clearSilenceTimeout()
      onEndRef.current?.()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setStatus('processing')
      resetSilenceTimeout()

      let interimTranscript = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalText += text
        } else {
          interimTranscript += text
        }
      }

      if (finalText) {
        setFinalTranscript((prev) => prev + finalText)
        onTranscriptRef.current?.(finalText, true)
      }

      const fullTranscript = finalTranscript + finalText + interimTranscript
      setTranscript(fullTranscript)

      if (interimTranscript) {
        onTranscriptRef.current?.(interimTranscript, false)
      }

      setStatus('listening')
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const mappedError = mapSpeechError(event.error)
      setError(mappedError)
      setErrorMessage(VOICE_ERROR_MESSAGES[mappedError])
      setStatus('error')
      onErrorRef.current?.(mappedError, VOICE_ERROR_MESSAGES[mappedError])

      // Don't stop on no-speech - user might just be pausing
      if (event.error !== 'no-speech') {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // Ignore errors during cleanup
        }
      }
      clearSilenceTimeout()
    }
  }, [isSupported, language, continuous, interimResults, clearSilenceTimeout, resetSilenceTimeout, finalTranscript])

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('not_supported')
      setErrorMessage(VOICE_ERROR_MESSAGES.not_supported)
      return
    }

    if (!recognitionRef.current) {return}

    // Clear previous transcript if starting fresh
    setTranscript('')
    setFinalTranscript('')
    setError(null)
    setErrorMessage(null)

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Recognition might already be started
      logger.warn('Speech recognition start error:', err)
    }
  }, [isSupported])

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {return}

    clearSilenceTimeout()

    try {
      recognitionRef.current.stop()
    } catch {
      // Recognition might already be stopped
    }
  }, [clearSilenceTimeout])

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('')
    setFinalTranscript('')
  }, [])

  // Reset error state
  const resetError = useCallback(() => {
    setError(null)
    setErrorMessage(null)
    if (status === 'error') {
      setStatus('idle')
    }
  }, [status])

  return {
    isListening,
    status,
    isSupported,
    transcript,
    finalTranscript,
    error,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    resetError,
  }
}

export default useVoiceToText
