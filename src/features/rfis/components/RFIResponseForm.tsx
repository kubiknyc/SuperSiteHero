// File: /src/features/rfis/components/RFIResponseForm.tsx
// Enhanced RFI response form with response type selection

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Send,
  Loader2,
  MessageSquare,
  FileText,
  Book,
  Clock,
  HelpCircle,
  Check,
  DollarSign,
  CalendarClock,
} from 'lucide-react'
import { useSubmitRFIResponse } from '../hooks/useDedicatedRFIs'
import { RFI_RESPONSE_TYPES, type RFIResponseType } from '@/types/rfi'
import { cn } from '@/lib/utils'

interface RFIResponseFormProps {
  rfiId: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Response type configuration with icons and colors
const RESPONSE_TYPE_CONFIG: Record<RFIResponseType, { icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  answered: { icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  see_drawings: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  see_specs: { icon: Book, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  deferred: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  partial_response: { icon: HelpCircle, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
  request_clarification: { icon: HelpCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
  no_change_required: { icon: Check, color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200' },
}

export function RFIResponseForm({ rfiId, onSuccess, onCancel }: RFIResponseFormProps) {
  const [response, setResponse] = useState('')
  const [responseType, setResponseType] = useState<RFIResponseType>('answered')
  const [costImpact, setCostImpact] = useState('')
  const [scheduleImpactDays, setScheduleImpactDays] = useState('')
  const [showImpactFields, setShowImpactFields] = useState(false)

  const submitResponse = useSubmitRFIResponse()

  const handleSubmit = async () => {
    if (!response.trim()) {return}

    try {
      await submitResponse.mutateAsync({
        rfiId,
        response: response.trim(),
        responseType,
        costImpact: costImpact ? parseFloat(costImpact) : undefined,
        scheduleImpactDays: scheduleImpactDays ? parseInt(scheduleImpactDays) : undefined,
      })

      // Reset form
      setResponse('')
      setResponseType('answered')
      setCostImpact('')
      setScheduleImpactDays('')
      setShowImpactFields(false)

      onSuccess?.()
    } catch (error) {
      // Error handling is done by React Query
    }
  }

  const selectedTypeConfig = RESPONSE_TYPE_CONFIG[responseType]
  const SelectedIcon = selectedTypeConfig.icon

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Submit Response
        </CardTitle>
        <CardDescription>
          Provide your response to this RFI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Response Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="responseType">Response Type</Label>
          <Select value={responseType} onValueChange={(v) => setResponseType(v as RFIResponseType)}>
            <SelectTrigger id="responseType" className={cn('w-full', selectedTypeConfig.bgColor)}>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <SelectedIcon className={cn('h-4 w-4', selectedTypeConfig.color)} />
                  <span>{RFI_RESPONSE_TYPES.find(t => t.value === responseType)?.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RFI_RESPONSE_TYPES.map((type) => {
                const config = RESPONSE_TYPE_CONFIG[type.value]
                const Icon = config.icon
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Response Text */}
        <div className="space-y-2">
          <Label htmlFor="response">Response</Label>
          <Textarea
            id="response"
            placeholder={
              responseType === 'see_drawings'
                ? 'Reference the specific drawing(s) and detail(s)...'
                : responseType === 'see_specs'
                ? 'Reference the specification section(s)...'
                : responseType === 'request_clarification'
                ? 'Describe what clarification is needed...'
                : 'Enter your response...'
            }
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={5}
            className="min-h-[120px]"
          />
        </div>

        {/* Impact Assessment Toggle */}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImpactFields(!showImpactFields)}
            className="text-xs"
          >
            {showImpactFields ? 'Hide' : 'Add'} Impact Assessment
          </Button>
        </div>

        {/* Impact Fields */}
        {showImpactFields && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="costImpact" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Cost Impact ($)
              </Label>
              <Input
                id="costImpact"
                type="number"
                placeholder="0.00"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleImpact" className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-600" />
                Schedule Impact (days)
              </Label>
              <Input
                id="scheduleImpact"
                type="number"
                placeholder="0"
                value={scheduleImpactDays}
                onChange={(e) => setScheduleImpactDays(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!response.trim() || submitResponse.isPending}
          >
            {submitResponse.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Response
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default RFIResponseForm
