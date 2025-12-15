/**
 * BidQuestionsSection
 * Manages bid questions with answer functionality for bid managers
 */

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  useBidQuestions,
  useAnswerBidQuestion,
} from '@/features/bidding/hooks/useBidding'
import type { BidQuestion, QuestionStatus } from '@/types/bidding'
import { cn } from '@/lib/utils'

interface BidQuestionsSectionProps {
  packageId: string
  readOnly?: boolean
}

function getStatusBadgeVariant(status: QuestionStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'answered':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'rejected':
      return 'destructive'
    case 'withdrawn':
      return 'outline'
    default:
      return 'secondary'
  }
}

interface QuestionItemProps {
  question: BidQuestion
  onAnswer: (questionId: string, answer: string, isPublished: boolean) => Promise<void>
  isAnswering: boolean
  readOnly?: boolean
}

function QuestionItem({ question, onAnswer, isAnswering, readOnly }: QuestionItemProps) {
  const [isExpanded, setIsExpanded] = useState(question.status === 'pending')
  const [isEditing, setIsEditing] = useState(false)
  const [answerText, setAnswerText] = useState(question.answer || '')
  const [publishAnswer, setPublishAnswer] = useState(question.is_published)

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {return}
    await onAnswer(question.id, answerText, publishAnswer)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setAnswerText(question.answer || '')
    setPublishAnswer(question.is_published)
    setIsEditing(false)
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono">
                  Q{question.question_number}
                </Badge>
                <Badge variant={getStatusBadgeVariant(question.status)}>
                  {question.status}
                </Badge>
                {question.is_published && (
                  <Badge variant="secondary" className="text-xs">
                    Published
                  </Badge>
                )}
              </div>
              <p className="font-medium line-clamp-2">{question.question}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{question.submitted_by_company || question.submitted_by_name}</span>
                <span>{format(new Date(question.submitted_at), 'MMM d, yyyy')}</span>
                {question.reference_document && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {question.reference_document}
                    {question.reference_page && ` p.${question.reference_page}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-4 space-y-4">
            {/* Full Question */}
            <div>
              <Label className="text-xs text-muted-foreground">Question</Label>
              <p className="mt-1">{question.question}</p>
              {question.question_attachments && question.question_attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.question_attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Attachment {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Answer Section */}
            {question.answer && !isEditing ? (
              <div className="pl-4 border-l-2 border-green-500">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">Answer</Label>
                  {!readOnly && question.status === 'answered' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <p>{question.answer}</p>
                {question.answered_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Answered on {format(new Date(question.answered_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            ) : !readOnly && (question.status === 'pending' || isEditing) ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`answer-${question.id}`}>Answer</Label>
                  <Textarea
                    id={`answer-${question.id}`}
                    placeholder="Enter your answer to this question..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`publish-${question.id}`}
                      checked={publishAnswer}
                      onCheckedChange={(checked) => setPublishAnswer(checked === true)}
                    />
                    <Label
                      htmlFor={`publish-${question.id}`}
                      className="text-sm font-normal"
                    >
                      Publish answer to all bidders
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSubmitAnswer}
                      disabled={!answerText.trim() || isAnswering}
                    >
                      {isAnswering ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-1" />
                      )}
                      {isEditing ? 'Update Answer' : 'Submit Answer'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function BidQuestionsSection({ packageId, readOnly = false }: BidQuestionsSectionProps) {
  const { data: questions, isLoading } = useBidQuestions(packageId)
  const answerQuestion = useAnswerBidQuestion()
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all')

  const filteredQuestions = questions?.filter((q) => {
    if (filter === 'all') {return true}
    if (filter === 'pending') {return q.status === 'pending'}
    if (filter === 'answered') {return q.status === 'answered'}
    return true
  })

  const pendingCount = questions?.filter((q) => q.status === 'pending').length || 0
  const answeredCount = questions?.filter((q) => q.status === 'answered').length || 0

  const handleAnswer = async (questionId: string, answer: string, isPublished: boolean) => {
    await answerQuestion.mutateAsync({
      questionId,
      dto: { answer, is_published: isPublished },
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Bidder Questions
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({questions?.length || 0})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === 'answered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('answered')}
          >
            <Check className="w-4 h-4 mr-1" />
            Answered ({answeredCount})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredQuestions || filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {filter === 'all'
                ? 'No questions have been submitted yet'
                : filter === 'pending'
                ? 'No pending questions'
                : 'No answered questions'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <QuestionItem
                key={question.id}
                question={question}
                onAnswer={handleAnswer}
                isAnswering={answerQuestion.isPending}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
