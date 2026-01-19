/**
 * Dashboard Widget Skeletons
 * Loading states for subcontractor dashboard widgets
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Schedule widget skeleton
 */
export function ScheduleWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Safety compliance widget skeleton
 */
export function SafetyWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Meetings widget skeleton
 */
export function MeetingWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-10" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Certifications widget skeleton
 */
export function CertificationWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-18" />
          </div>
          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Lien Waivers widget skeleton
 */
export function LienWaiverWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Retainage widget skeleton
 */
export function RetainageWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Assignment list item skeleton
 */
export function AssignmentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-card">
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  )
}

export default {
  ScheduleWidgetSkeleton,
  SafetyWidgetSkeleton,
  MeetingWidgetSkeleton,
  CertificationWidgetSkeleton,
  LienWaiverWidgetSkeleton,
  RetainageWidgetSkeleton,
  AssignmentListSkeleton,
}
