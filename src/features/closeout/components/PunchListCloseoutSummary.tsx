/**
 * PunchListCloseoutSummary Component
 *
 * Displays punch list completion status for closeout assessment.
 * Shows counts, progress bars, and outstanding items breakdown.
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CheckSquare,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Building2,
  ExternalLink,
  ListChecks,
} from 'lucide-react'
import { usePunchListCloseout, type PunchListCloseoutStatus } from '../hooks/usePunchListCloseout'
import { cn } from '@/lib/utils'

interface PunchListCloseoutSummaryProps {
  projectId: string
  className?: string
}

export function PunchListCloseoutSummary({ projectId, className }: PunchListCloseoutSummaryProps) {
  const { data: status, isLoading, error } = usePunchListCloseout(projectId)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-destructive/50', className)}>
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load punch list status</p>
        </CardContent>
      </Card>
    )
  }

  if (!status) return null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Punch List Status
            </CardTitle>
            <CardDescription>
              Punch list completion for project closeout
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/punch-lists?project=${projectId}`}>
              <ListChecks className="h-4 w-4 mr-2" />
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ready Status Banner */}
        <div
          className={cn(
            'p-4 rounded-lg flex items-center gap-3',
            status.isReadyForCloseout
              ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800'
          )}
        >
          {status.isReadyForCloseout ? (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Ready for Closeout
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  All punch list items have been verified
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Not Ready for Closeout
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  {status.open + status.inProgress} item{status.open + status.inProgress !== 1 ? 's' : ''} still outstanding
                </p>
              </div>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion Progress</span>
            <span className="font-medium">{status.completionPercent}%</span>
          </div>
          <Progress value={status.completionPercent} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verification Progress</span>
            <span className="font-medium">{status.verificationPercent}%</span>
          </div>
          <Progress value={status.verificationPercent} className="h-2 [&>div]:bg-green-500" />
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{status.open}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{status.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{status.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{status.verified}</div>
            <div className="text-xs text-muted-foreground">Verified</div>
          </div>
        </div>

        {/* Priority Breakdown (only if outstanding items exist) */}
        {(status.criticalOpen > 0 || status.highOpen > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Outstanding by Priority</p>
            <div className="flex flex-wrap gap-2">
              {status.criticalOpen > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {status.criticalOpen} Critical
                </Badge>
              )}
              {status.highOpen > 0 && (
                <Badge variant="default" className="gap-1 bg-orange-500">
                  <AlertTriangle className="h-3 w-3" />
                  {status.highOpen} High
                </Badge>
              )}
              {status.mediumOpen > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {status.mediumOpen} Medium
                </Badge>
              )}
              {status.lowOpen > 0 && (
                <Badge variant="outline" className="gap-1">
                  {status.lowOpen} Low
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Outstanding Items Breakdown */}
        {(status.byAssignee.length > 0 || status.byLocation.length > 0) && (
          <Accordion type="single" collapsible className="w-full">
            {/* By Assignee */}
            {status.byAssignee.length > 0 && (
              <AccordionItem value="assignees">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Outstanding by Assignee ({status.byAssignee.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {status.byAssignee.map((assignee, index) => (
                      <div
                        key={assignee.assigneeId || index}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {assignee.assigneeType === 'subcontractor' ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{assignee.assigneeName}</span>
                        </div>
                        <div className="flex gap-2">
                          {assignee.openCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {assignee.openCount} open
                            </Badge>
                          )}
                          {assignee.inProgressCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {assignee.inProgressCount} in progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* By Location */}
            {status.byLocation.length > 0 && (
              <AccordionItem value="locations">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Outstanding by Location ({status.byLocation.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {status.byLocation.slice(0, 10).map((location, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <span className="text-sm truncate flex-1">{location.location}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {location.openCount} outstanding
                        </Badge>
                      </div>
                    ))}
                    {status.byLocation.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{status.byLocation.length - 10} more locations
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}

        {/* Action Button */}
        {!status.isReadyForCloseout && (
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/punch-lists?project=${projectId}&status=open,in_progress`}>
              View Outstanding Items
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default PunchListCloseoutSummary
