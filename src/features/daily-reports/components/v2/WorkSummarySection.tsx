/**
 * WorkSummarySection - Main text entry section with voice-to-text
 * Collapsible section for work summary and planned work
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  AlertCircle,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';

interface WorkSummarySectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function WorkSummarySection({ expanded, onToggle }: WorkSummarySectionProps) {
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);
  const updateDraft = useDailyReportStoreV2((state) => state.updateDraft);

  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState<'summary' | 'planned' | null>(null);
  const [speechSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const workSummary = draftReport?.work_summary || '';
  const workPlanned = draftReport?.work_planned_tomorrow || '';

  const summaryLength = workSummary.length;
  const plannedLength = workPlanned.length;

  const handleVoiceInput = useCallback((field: 'summary' | 'planned') => {
    if (!speechSupported) return;

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      setActiveField(field);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the field with transcribed text
      if (field === 'summary') {
        updateDraft({
          work_summary: workSummary + finalTranscript + interimTranscript,
        });
      } else {
        updateDraft({
          work_planned_tomorrow: workPlanned + finalTranscript + interimTranscript,
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setActiveField(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      setActiveField(null);
    };

    recognition.start();

    // Auto-stop after 60 seconds
    setTimeout(() => {
      recognition.stop();
    }, 60000);

    // Store reference to stop on demand
    (window as any).__speechRecognition = recognition;
  }, [speechSupported, workSummary, workPlanned, updateDraft]);

  const stopVoiceInput = useCallback(() => {
    const recognition = (window as any).__speechRecognition;
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setActiveField(null);
  }, []);

  if (!draftReport) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Briefcase className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base flex items-center gap-2">
              Work Summary
              {(workSummary || workPlanned) && (
                <Badge variant="secondary" className="font-normal">
                  {summaryLength + plannedLength > 0
                    ? `${summaryLength + plannedLength} chars`
                    : 'Empty'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {workSummary
                ? workSummary.slice(0, 60) + (workSummary.length > 60 ? '...' : '')
                : 'Describe work completed and planned'}
            </CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <CardContent className="border-t p-4 space-y-4">
          {/* Work Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="work_summary" className="text-sm font-medium text-gray-700">
                Work Performed Today <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{summaryLength}/2000</span>
                {speechSupported && (
                  <Button
                    type="button"
                    variant={isListening && activeField === 'summary' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() =>
                      isListening && activeField === 'summary'
                        ? stopVoiceInput()
                        : handleVoiceInput('summary')
                    }
                    className="h-7"
                  >
                    {isListening && activeField === 'summary' ? (
                      <>
                        <MicOff className="h-3 w-3 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3 mr-1" />
                        Voice
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <textarea
              id="work_summary"
              value={workSummary}
              onChange={(e) => updateDraft({ work_summary: e.target.value })}
              placeholder="Describe the work performed today. Include details about locations, trades, and accomplishments..."
              className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isListening && activeField === 'summary'
                  ? 'border-red-500 ring-2 ring-red-200'
                  : 'border-gray-300'
              }`}
              maxLength={2000}
            />
            {isListening && activeField === 'summary' && (
              <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                Listening...
              </div>
            )}
          </div>

          {/* Work Planned */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="work_planned" className="text-sm font-medium text-gray-700">
                Work Planned for Tomorrow
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{plannedLength}/1000</span>
                {speechSupported && (
                  <Button
                    type="button"
                    variant={isListening && activeField === 'planned' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() =>
                      isListening && activeField === 'planned'
                        ? stopVoiceInput()
                        : handleVoiceInput('planned')
                    }
                    className="h-7"
                  >
                    {isListening && activeField === 'planned' ? (
                      <>
                        <MicOff className="h-3 w-3 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3 mr-1" />
                        Voice
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <textarea
              id="work_planned"
              value={workPlanned}
              onChange={(e) => updateDraft({ work_planned_tomorrow: e.target.value })}
              placeholder="Describe work planned for tomorrow or upcoming days..."
              className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isListening && activeField === 'planned'
                  ? 'border-red-500 ring-2 ring-red-200'
                  : 'border-gray-300'
              }`}
              maxLength={1000}
            />
            {isListening && activeField === 'planned' && (
              <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                Listening...
              </div>
            )}
          </div>

          {/* Voice Not Supported Warning */}
          {!speechSupported && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              Voice input is not supported in this browser. Try Chrome or Edge.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default WorkSummarySection;
