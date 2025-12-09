/**
 * BidPackageDetailPage
 * Detail view for a single bid package
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  FileText,
  HelpCircle,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Package,
  Send,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  BidPackageStatusBadge,
  BidInvitationTable,
  BidSubmissionTable,
  SendInvitationDialog,
} from '@/features/bidding/components'
import {
  useBidPackage,
  useBidPackageStats,
  useBidInvitations,
  useBidSubmissions,
  useBidQuestions,
  usePublishBidPackage,
  useAwardBid,
} from '@/features/bidding/hooks/useBidding'
import {
  formatBidAmount,
  getBidTypeLabel,
  getDivisionName,
  getDaysUntilDue,
} from '@/types/bidding'
import { toast } from 'sonner'

export default function BidPackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [awardDialogOpen, setAwardDialogOpen] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)

  const { data: bidPackage, isLoading: isLoadingPackage } = useBidPackage(packageId!)
  const { data: stats } = useBidPackageStats(packageId!)
  const { data: invitations, isLoading: isLoadingInvitations } = useBidInvitations(packageId!)
  const { data: submissions, isLoading: isLoadingSubmissions } = useBidSubmissions(packageId!)
  const { data: questions, isLoading: isLoadingQuestions } = useBidQuestions(packageId!)

  const publishBidPackage = usePublishBidPackage()
  const awardBid = useAwardBid()

  if (isLoadingPackage) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!bidPackage) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Bid Package Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The bid package you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate('/bidding')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bid Packages
          </Button>
        </div>
      </div>
    )
  }

  const daysUntilDue = getDaysUntilDue(bidPackage.bid_due_date)
  const isOverdue = daysUntilDue < 0
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3

  const handlePublish = async () => {
    try {
      await publishBidPackage.mutateAsync(packageId!)
      toast.success('Bid package published successfully')
      setPublishDialogOpen(false)
    } catch (error) {
      toast.error('Failed to publish bid package')
    }
  }

  const handleAward = async () => {
    if (!selectedSubmissionId) return

    try {
      const submission = submissions?.find((s) => s.id === selectedSubmissionId)
      if (!submission) return

      await awardBid.mutateAsync({
        packageId: packageId!,
        dto: {
          submission_id: selectedSubmissionId,
          award_amount: submission.base_bid_amount,
        },
      })
      toast.success('Bid awarded successfully')
      setAwardDialogOpen(false)
      setSelectedSubmissionId(null)
    } catch (error) {
      toast.error('Failed to award bid')
    }
  }

  const responsesReceived = stats
    ? stats.total_invitations - (invitations?.filter((i) => i.response_status === 'pending').length || 0)
    : 0
  const responseRate = stats && stats.total_invitations > 0
    ? (responsesReceived / stats.total_invitations) * 100
    : 0

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bidding')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bid Packages
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {bidPackage.package_number} - {bidPackage.name}
            </h1>
            <BidPackageStatusBadge status={bidPackage.status} />
          </div>
          {bidPackage.project && (
            <p className="text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <Link to={`/projects/${bidPackage.project_id}`} className="hover:underline">
                {bidPackage.project.name}
              </Link>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {bidPackage.status === 'draft' && (
            <Button onClick={() => setPublishDialogOpen(true)}>
              <Send className="w-4 h-4 mr-2" />
              Publish
            </Button>
          )}
          {['published', 'questions_period', 'bids_due'].includes(bidPackage.status) && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitations
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit Package
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Download Documents
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bid Due Date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-semibold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : ''}`}>
              {format(new Date(bidPackage.bid_due_date), 'MMM d, yyyy')}
            </div>
            <div className="text-sm text-muted-foreground">
              {bidPackage.bid_due_time || '5:00 PM'}
              {!isOverdue && ` (${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} left)`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{stats?.total_invitations || 0}</div>
            <div className="text-sm text-muted-foreground">
              {responsesReceived} responded ({Math.round(responseRate)}%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bids Received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{stats?.bids_received || 0}</div>
            {stats?.low_bid && (
              <div className="text-sm text-green-600">
                Low: {formatBidAmount(stats.low_bid)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{questions?.length || 0}</div>
            <div className="text-sm text-muted-foreground">
              {stats?.pending_questions || 0} pending
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            <Badge variant="secondary" className="ml-2">{invitations?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="submissions">
            Bids
            <Badge variant="secondary" className="ml-2">{submissions?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="questions">
            Questions
            <Badge variant="secondary" className="ml-2">{questions?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Package Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Package Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Bid Type</div>
                      <div className="font-medium">{getBidTypeLabel(bidPackage.bid_type)}</div>
                    </div>
                    {bidPackage.division && (
                      <div>
                        <div className="text-sm text-muted-foreground">Division</div>
                        <div className="font-medium">
                          {bidPackage.division} - {getDivisionName(bidPackage.division)}
                        </div>
                      </div>
                    )}
                    {bidPackage.estimated_value && (
                      <div>
                        <div className="text-sm text-muted-foreground">Estimated Value</div>
                        <div className="font-medium">{formatBidAmount(bidPackage.estimated_value)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-muted-foreground">Public Bid</div>
                      <div className="font-medium">{bidPackage.is_public ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {bidPackage.description && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Description</div>
                        <p>{bidPackage.description}</p>
                      </div>
                    </>
                  )}

                  {bidPackage.scope_of_work && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Scope of Work</div>
                        <p className="whitespace-pre-wrap">{bidPackage.scope_of_work}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle>Bid Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    {bidPackage.requires_prequalification ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span>Prequalification Required</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {bidPackage.requires_bid_bond ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span>
                      Bid Bond Required
                      {bidPackage.requires_bid_bond && ` (${bidPackage.bid_bond_percent}%)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {bidPackage.requires_performance_bond ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span>Performance Bond Required</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {bidPackage.requires_insurance_cert ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span>Insurance Certificate Required</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Key Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {bidPackage.issue_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date</span>
                      <span>{format(new Date(bidPackage.issue_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {bidPackage.pre_bid_meeting_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pre-Bid Meeting</span>
                      <span>{format(new Date(bidPackage.pre_bid_meeting_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {bidPackage.questions_due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions Due</span>
                      <span>{format(new Date(bidPackage.questions_due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Bids Due</span>
                    <span>{format(new Date(bidPackage.bid_due_date), 'MMM d, yyyy')}</span>
                  </div>
                  {bidPackage.award_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Award</span>
                      <span>{format(new Date(bidPackage.award_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              {(bidPackage.contact_name || bidPackage.contact_email) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {bidPackage.contact_name && (
                      <div className="font-medium">{bidPackage.contact_name}</div>
                    )}
                    {bidPackage.contact_email && (
                      <div className="text-muted-foreground">{bidPackage.contact_email}</div>
                    )}
                    {bidPackage.contact_phone && (
                      <div className="text-muted-foreground">{bidPackage.contact_phone}</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Response Progress */}
              {(stats?.total_invitations || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Response Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={responseRate} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 rounded bg-green-50">
                        <div className="text-lg font-semibold text-green-600">
                          {invitations?.filter((i) => i.response_status === 'accepted').length || 0}
                        </div>
                        <div className="text-muted-foreground">Accepted</div>
                      </div>
                      <div className="text-center p-2 rounded bg-red-50">
                        <div className="text-lg font-semibold text-red-600">
                          {invitations?.filter((i) => i.response_status === 'declined').length || 0}
                        </div>
                        <div className="text-muted-foreground">Declined</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bid Invitations</CardTitle>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitations
              </Button>
            </CardHeader>
            <CardContent>
              <BidInvitationTable
                invitations={invitations || []}
                isLoading={isLoadingInvitations}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Bid Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <BidSubmissionTable
                submissions={submissions || []}
                estimatedValue={bidPackage.estimated_value}
                isLoading={isLoadingSubmissions}
                showAwardAction={bidPackage.status !== 'awarded'}
                onAwardBid={(id) => {
                  setSelectedSubmissionId(id)
                  setAwardDialogOpen(true)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Bidder Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : !questions || questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No questions have been submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Q{question.question_number}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {question.submitted_by_company || question.submitted_by_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(question.submitted_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <p className="font-medium">{question.question}</p>
                          {question.answer && (
                            <div className="mt-4 pl-4 border-l-2 border-green-500">
                              <div className="text-sm text-muted-foreground mb-1">Answer:</div>
                              <p>{question.answer}</p>
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={question.status === 'answered' ? 'default' : 'secondary'}
                        >
                          {question.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SendInvitationDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        bidPackageId={packageId!}
        alreadyInvitedIds={invitations?.map((i) => i.subcontractor_id).filter(Boolean) as string[]}
      />

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Bid Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the bid package visible to invited subcontractors.
              Make sure all details are correct before publishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              {publishBidPackage.isPending ? 'Publishing...' : 'Publish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Award Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark this bid as awarded and notify the winning bidder.
              Other bidders will be marked as not awarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAward}>
              {awardBid.isPending ? 'Awarding...' : 'Award Contract'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
