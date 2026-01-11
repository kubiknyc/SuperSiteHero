/**
 * Voice Input Hook - Web Speech API Integration
 *
 * Provides speech recognition functionality for voice-to-text input
 * in daily report forms. Supports real-time transcription with
 * interim and final results.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

export interface VoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface VoiceInputReturn extends VoiceInputState {
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  appendToField: (currentValue: string, setter: (value: string) => void) => void;
}

/**
 * Check if Web Speech API is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') {return false;}
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Get SpeechRecognition constructor
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {return null;}
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Custom hook for voice-to-text input using Web Speech API
 */
export function useVoiceInput(options: VoiceInputOptions = {}): VoiceInputReturn {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    onTranscript,
    onError,
    onStart,
    onEnd,
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: isSpeechRecognitionSupported(),
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      setState(prev => ({ ...prev, isSupported: false }));
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = maxAlternatives;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          transcriptRef.current += transcript;
          onTranscript?.(transcript, true);
        } else {
          interimTranscript += transcript;
          onTranscript?.(transcript, false);
        }
      }

      setState(prev => ({
        ...prev,
        transcript: transcriptRef.current,
        interimTranscript,
        confidence,
        error: null,
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
      onError?.(errorMessage);
    };

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
      onStart?.();
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      onEnd?.();
    };

    return recognition;
  }, [continuous, interimResults, language, maxAlternatives, onTranscript, onError, onStart, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!state.isSupported) {
      const error = 'Speech recognition is not supported in this browser';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    try {
      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      // Initialize and start new recognition
      recognitionRef.current = initializeRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start speech recognition';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [state.isSupported, initializeRecognition, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    transcriptRef.current = '';
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
    }));
  }, []);

  // Append transcript to a field value
  const appendToField = useCallback((currentValue: string, setter: (value: string) => void) => {
    const fullTranscript = transcriptRef.current;
    if (!fullTranscript) {return;}

    const newValue = currentValue
      ? `${currentValue} ${fullTranscript}`.trim()
      : fullTranscript.trim();

    setter(newValue);
    clearTranscript();
  }, [clearTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    appendToField,
  };
}

/**
 * Get user-friendly error message for speech recognition errors
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'audio-capture':
      return 'No microphone was found. Please ensure a microphone is connected.';
    case 'not-allowed':
      return 'Microphone access was denied. Please allow microphone permissions.';
    case 'network':
      return 'Network error occurred. Please check your internet connection.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed.';
    case 'language-not-supported':
      return 'The selected language is not supported.';
    default:
      return `Speech recognition error: ${errorCode}`;
  }
}

/**
 * Hook for managing voice input for a specific text field
 */
export function useVoiceInputField(
  value: string,
  onChange: (value: string) => void,
  options?: Omit<VoiceInputOptions, 'onTranscript'>
) {
  const [localTranscript, setLocalTranscript] = useState('');

  const voiceInput = useVoiceInput({
    ...options,
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        // Append final transcript to field value
        const newValue = value ? `${value} ${transcript}`.trim() : transcript.trim();
        onChange(newValue);
        setLocalTranscript('');
      } else {
        // Show interim transcript
        setLocalTranscript(transcript);
      }
    },
    onEnd: () => {
      // Clear interim transcript when recognition ends
      setLocalTranscript('');
    },
  });

  // Combined display value (original + interim)
  const displayValue = localTranscript ? `${value} ${localTranscript}`.trim() : value;

  return {
    ...voiceInput,
    displayValue,
    localTranscript,
  };
}

export default useVoiceInput;
