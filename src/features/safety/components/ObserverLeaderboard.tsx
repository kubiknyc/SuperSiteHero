/**
 * Observer Leaderboard Component
 *
 * Displays a gamified leaderboard of top safety observers.
 * Shows rankings, points, and observation counts.
 */

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLeaderboard, useMyPoints } from '../hooks/useSafetyObservations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeaderboardEntry } from '@/types/safety-observations'
import {
  Trophy,
  Medal,
  Award,
  Flame,
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  Star,
  TrendingUp,
  Crown,
} from 'lucide-react'

interface ObserverLeaderboardProps {
  projectId?: string
  companyId?: string
  className?: string
  showMyStats?: boolean
  limit?: number
}

const RANK_ICONS = [Crown, Medal, Award]
const RANK_COLORS = ['text-warning', 'text-disabled', 'text-warning']

export function ObserverLeaderboard({
  projectId,
  companyId,
  className,
  showMyStats = true,
  limit = 10,
}: ObserverLeaderboardProps) {
  const [timePeriod, setTimePeriod] = useState<'all_time' | 'yearly' | 'monthly'>('monthly')

  const { data: leaderboard, isLoading } = useLeaderboard({
    project_id: projectId,
    company_id: companyId,
    time_period: timePeriod,
    limit,
  })

  const { data: myPoints } = useMyPoints(projectId)

  const getPointsForPeriod = (entry: LeaderboardEntry) => {
    switch (timePeriod) {
      case 'monthly':
        return entry.monthly_points
      case 'yearly':
        return entry.yearly_points
      default:
        return entry.total_points
    }
  }

  const getRankForPeriod = (entry: LeaderboardEntry) => {
    switch (timePeriod) {
      case 'monthly':
        return projectId ? entry.monthly_project_rank : entry.monthly_company_rank
      default:
        return projectId ? entry.project_rank : entry.company_rank
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Safety Observer Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          Safety Observer Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Period Tabs */}
        <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as typeof timePeriod)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monthly">This Month</TabsTrigger>
            <TabsTrigger value="yearly">This Year</TabsTrigger>
            <TabsTrigger value="all_time">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* My Stats (if logged in) */}
        {showMyStats && myPoints && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-info-light rounded-full">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Your Stats</p>
                    <p className="text-xs text-primary">
                      {myPoints.total_observations} observations
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary-hover">
                    {timePeriod === 'monthly'
                      ? myPoints.monthly_points
                      : timePeriod === 'yearly'
                        ? myPoints.yearly_points
                        : myPoints.total_points}
                  </p>
                  <p className="text-xs text-primary">points</p>
                </div>
              </div>
              {myPoints.current_streak > 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm text-orange-600">
                  <Flame className="h-4 w-4" />
                  {myPoints.current_streak} day streak!
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2">
          {leaderboard?.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No observations yet. Be the first!</p>
            </div>
          ) : (
            leaderboard?.map((entry, index) => {
              const rank = getRankForPeriod(entry)
              const points = getPointsForPeriod(entry)
              const RankIcon = RANK_ICONS[index] || null
              const rankColor = RANK_COLORS[index] || 'text-muted'

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    index === 0 && 'bg-warning-light',
                    index === 1 && 'bg-surface',
                    index === 2 && 'bg-warning-light',
                    index > 2 && 'hover:bg-surface'
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 flex items-center justify-center">
                    {RankIcon ? (
                      <RankIcon className={cn('h-6 w-6', rankColor)} />
                    ) : (
                      <span className="text-lg font-bold text-disabled">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn(index < 3 && 'bg-gradient-to-br from-blue-400 to-blue-600 text-white')}>
                      {(entry.observer_name || entry.observer_email)
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.observer_name || entry.observer_email}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{entry.total_observations} observations</span>
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-500">
                          <Flame className="h-3 w-3" />
                          {entry.current_streak}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{points}</p>
                    <p className="text-xs text-muted">pts</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Observation Type Breakdown (for top 3) */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-secondary mb-3">Top Observer Breakdown</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-success-light rounded-lg">
                <ThumbsUp className="h-4 w-4 mx-auto text-success" />
                <p className="text-xs text-secondary mt-1">Safe</p>
                <p className="text-sm font-semibold text-success-dark">
                  {leaderboard[0]?.safe_behavior_count || 0}
                </p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 mx-auto text-orange-600" />
                <p className="text-xs text-secondary mt-1">Unsafe</p>
                <p className="text-sm font-semibold text-orange-700">
                  {leaderboard[0]?.unsafe_condition_count || 0}
                </p>
              </div>
              <div className="p-2 bg-warning-light rounded-lg">
                <AlertCircle className="h-4 w-4 mx-auto text-warning" />
                <p className="text-xs text-secondary mt-1">Near Miss</p>
                <p className="text-sm font-semibold text-yellow-700">
                  {leaderboard[0]?.near_miss_count || 0}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Award className="h-4 w-4 mx-auto text-primary" />
                <p className="text-xs text-secondary mt-1">Best</p>
                <p className="text-sm font-semibold text-primary-hover">
                  {leaderboard[0]?.best_practice_count || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ObserverLeaderboard
