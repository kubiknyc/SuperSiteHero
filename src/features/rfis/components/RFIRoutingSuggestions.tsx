/**
 * RFI Routing Suggestions Component
 * Displays AI-powered routing suggestions for RFIs with accept/modify/reject actions
 */

import { useState, useEffect } from 'react'
import {
  Brain,
  Check,
  X,
  Edit2,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Link,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  useRFIRoutingWorkflow,
  useQuickRoleSuggestion,
  useRelatedItems,
} from '../hooks/useRFIRouting'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type { BallInCourtRole, RelatedItem } from '@/types/ai'
import { cn } from '@/lib/utils'

interface RFIRoutingSuggestionsProps {
  rfiId?: string
  projectId?: string
  subject: string
  question: string
  specSection?: string
  onRoleSelect?: (role: BallInCourtRole) => void
  onAssigneeSelect?: (assigneeId: string) => void
  className?: string
}

const ROLE_LABELS: Record<BallInCourtRole, { label: string; color: string }> = {
  architect: { label: 'Architect', color: 'bg-purple-100 text-purple-800' },
  engineer: { label: 'Engineer', color: 'bg-blue-100 text-blue-800' },
  owner: { label: 'Owner', color: 'bg-amber-100 text-amber-800' },
  gc_pm: { label: 'GC/PM', color: 'bg-green-100 text-green-800' },
  subcontractor: { label: 'Subcontractor', color: 'bg-orange-100 text-orange-800' },
  consultant: { label: 'Consultant', color: 'bg-cyan-100 text-cyan-800' },
  inspector: { label: 'Inspector', color: 'bg-red-100 text-red-800' },
}

export function RFIRoutingSuggestions({
  rfiId,
  projectId,
  subject,
  question,
  specSection,
  onRoleSelect,
  onAssigneeSelect,
  className,
}: RFIRoutingSuggestionsProps) {
  const [showRelated, setShowRelated] = useState(false)
  const [showModify, setShowModify] = useState(false)
  const [selectedRole, setSelectedRole] = useState<BallInCourtRole | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const { isEnabled: aiEnabled, isLoading: aiConfigLoading } = useAIFeatureEnabled('rfi_routing')

  const {
    latestSuggestion,
    hasPendingSuggestion,
    isLoading,
    isGenerating,
    generateSuggestion,
    acceptSuggestion,
    modifySuggestion,
    rejectSuggestion,
  } = useRFIRoutingWorkflow(rfiId, projectId)

  // Quick suggestion for real-time feedback
  const quickSuggestion = useQuickRoleSuggestion(subject, question)

  // Related items
  const { data: relatedItems } = useRelatedItems(
    projectId,
    subject,
    question,
    showRelated && !!projectId
  )

  // Auto-select role when suggestion is accepted
  useEffect(() => {
    if (latestSuggestion?.feedback_status === 'accepted' && onRoleSelect) {
      onRoleSelect(latestSuggestion.suggested_role)
    }
  }, [latestSuggestion, onRoleSelect])

  const handleGenerateSuggestion = async () => {
    const result = await generateSuggestion(subject, question, specSection)
    if (result?.suggestion && onRoleSelect) {
      // Pre-select the suggested role
      setSelectedRole(result.suggestion.suggested_role)
    }
  }

  const handleAccept = async () => {
    await acceptSuggestion()
    if (latestSuggestion && onRoleSelect) {
      onRoleSelect(latestSuggestion.suggested_role)
    }
    if (latestSuggestion?.suggested_assignee_id && onAssigneeSelect) {
      onAssigneeSelect(latestSuggestion.suggested_assignee_id)
    }
  }

  const handleModify = async () => {
    if (selectedRole) {
      await modifySuggestion(selectedRole)
      onRoleSelect?.(selectedRole)
      setShowModify(false)
    }
  }

  const handleReject = async () => {
    await rejectSuggestion(rejectNotes)
    setShowRejectInput(false)
    setRejectNotes('')
  }

  // If AI is not enabled, show quick suggestion only
  if (aiConfigLoading) {
    return null
  }

  if (!aiEnabled) {
    // Show quick keyword-based suggestion
    if (!quickSuggestion || quickSuggestion.confidence < 30) {return null}

    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Quick Suggestion</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={ROLE_LABELS[quickSuggestion.role].color}>
              {ROLE_LABELS[quickSuggestion.role].label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {quickSuggestion.confidence}% confidence
            </span>
          </div>
          {quickSuggestion.matchedKeywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {quickSuggestion.matchedKeywords.slice(0, 5).map((keyword) => (
                <Badge key={keyword} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onRoleSelect?.(quickSuggestion.role)}
          >
            Use Suggestion
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          AI Routing Suggestion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No suggestion yet - show generate button */}
        {!latestSuggestion && !isGenerating && (
          <div className="space-y-3">
            {quickSuggestion && quickSuggestion.confidence >= 30 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Quick suggestion:</span>
                  <Badge className={ROLE_LABELS[quickSuggestion.role].color}>
                    {ROLE_LABELS[quickSuggestion.role].label}
                  </Badge>
                </div>
              </div>
            )}
            <Button
              onClick={handleGenerateSuggestion}
              disabled={!subject && !question}
              className="w-full"
              variant="outline"
            >
              <Brain className="w-4 h-4 mr-2" />
              Generate AI Suggestion
            </Button>
            {!subject && !question && (
              <p className="text-xs text-muted-foreground text-center">
                Enter a subject or question to get routing suggestions
              </p>
            )}
          </div>
        )}

        {/* Loading state */}
        {isGenerating && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm">Analyzing RFI content...</span>
          </div>
        )}

        {/* Show suggestion */}
        {latestSuggestion && !isGenerating && (
          <div className="space-y-4">
            {/* Suggested Role */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Suggested Routing</p>
                <Badge
                  className={cn(
                    'text-sm px-3 py-1',
                    ROLE_LABELS[latestSuggestion.suggested_role].color
                  )}
                >
                  {ROLE_LABELS[latestSuggestion.suggested_role].label}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={latestSuggestion.role_confidence}
                    className="w-16 h-2"
                  />
                  <span className="text-sm font-medium">
                    {latestSuggestion.role_confidence}%
                  </span>
                </div>
              </div>
            </div>

            {/* CSI Classification */}
            {latestSuggestion.csi_division && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">CSI Division</p>
                <Badge variant="secondary">
                  Division {latestSuggestion.csi_division}
                  {latestSuggestion.csi_section && ` - ${latestSuggestion.csi_section}`}
                </Badge>
              </div>
            )}

            {/* Keywords */}
            {latestSuggestion.keywords && latestSuggestion.keywords.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {latestSuggestion.keywords.slice(0, 6).map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {latestSuggestion.reasoning && (
              <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                {latestSuggestion.reasoning}
              </div>
            )}

            {/* Action buttons */}
            {hasPendingSuggestion && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleAccept} className="flex-1">
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowModify(!showModify)}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Modify
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRejectInput(!showRejectInput)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Modify panel */}
            {showModify && (
              <div className="p-3 border rounded-lg space-y-3">
                <div>
                  <Label className="text-xs">Select correct role</Label>
                  <RadixSelect
                    value={selectedRole || latestSuggestion.suggested_role}
                    onValueChange={(v) => setSelectedRole(v as BallInCourtRole)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([role, { label }]) => (
                        <SelectItem key={role} value={role}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </RadixSelect>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleModify} className="flex-1">
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowModify(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Reject panel */}
            {showRejectInput && (
              <div className="p-3 border border-destructive/20 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs">Why was this suggestion wrong? (optional)</Label>
                  <Textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Help us improve..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    className="flex-1"
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Feedback status */}
            {!hasPendingSuggestion && (
              <div className="flex items-center gap-2 text-sm">
                {latestSuggestion.feedback_status === 'accepted' && (
                  <>
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <span className="text-green-700">Suggestion accepted</span>
                  </>
                )}
                {latestSuggestion.feedback_status === 'modified' && (
                  <>
                    <Edit2 className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-700">
                      Modified to: {ROLE_LABELS[latestSuggestion.actual_role_assigned!].label}
                    </span>
                  </>
                )}
                {latestSuggestion.feedback_status === 'rejected' && (
                  <>
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                    <span className="text-red-700">Suggestion rejected</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Related Items */}
        <Collapsible open={showRelated} onOpenChange={setShowRelated}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Related Items
              </span>
              {showRelated ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {/* Related RFIs */}
            {relatedItems?.rfis && relatedItems.rfis.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Related RFIs</p>
                <div className="space-y-1">
                  {relatedItems.rfis.map((rfi) => (
                    <RelatedItemRow key={rfi.id} item={rfi} type="rfi" />
                  ))}
                </div>
              </div>
            )}

            {/* Related Submittals */}
            {relatedItems?.submittals && relatedItems.submittals.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Related Submittals</p>
                <div className="space-y-1">
                  {relatedItems.submittals.map((sub) => (
                    <RelatedItemRow key={sub.id} item={sub} type="submittal" />
                  ))}
                </div>
              </div>
            )}

            {(!relatedItems?.rfis?.length && !relatedItems?.submittals?.length) && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No related items found
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function RelatedItemRow({ item, type }: { item: RelatedItem; type: 'rfi' | 'submittal' }) {
  const href = type === 'rfi' ? `/rfis-v2/${item.id}` : `/submittals-v2/${item.id}`

  return (
    <a
      href={href}
      className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm"
    >
      <Badge variant="outline" className="text-xs shrink-0">
        {item.number}
      </Badge>
      <span className="truncate flex-1">{item.subject}</span>
      <Badge
        variant={item.status === 'open' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {item.status}
      </Badge>
    </a>
  )
}
