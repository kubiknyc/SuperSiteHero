// File: /src/features/checklists/pages/ChecklistsDashboardPage.tsx
// Dashboard with analytics and insights for checklist executions
// Enhancement: #5 - Dashboard with Analytics Charts

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  FileText,
  Users,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useExecutions } from '../hooks/useExecutions'
import { useTemplates } from '../hooks/useTemplates'
import { format, subDays, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns'

export function ChecklistsDashboardPage() {
  const navigate = useNavigate()

  // Fetch all executions and templates
  const { data: allExecutions = [], isLoading: loadingExecutions } = useExecutions()
  const { data: templates = [], isLoading: loadingTemplates } = useTemplates()

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!allExecutions.length) {
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        inProgressExecutions: 0,
        avgScore: 0,
        passRate: 0,
        failRate: 0,
        naRate: 0,
        recentTrend: 0,
        topInspectors: [],
        categoryBreakdown: [],
        scoreDistribution: [],
        dailyActivity: [],
        templateUsage: [],
        lowScoringExecutions: [],
      }
    }

    const total = allExecutions.length
    const completed = allExecutions.filter((e) => e.is_completed).length
    const inProgress = allExecutions.filter((e) => !e.is_completed).length

    // Calculate average score
    const completedWithScores = allExecutions.filter(
      (e) => e.is_completed && e.score_percentage !== null
    )
    const avgScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce((sum, e) => sum + (e.score_percentage || 0), 0) /
          completedWithScores.length
        : 0

    // Calculate pass/fail/na rates
    const totalResponses = allExecutions.reduce(
      (sum, e) => sum + e.score_total,
      0
    )
    const totalPass = allExecutions.reduce((sum, e) => sum + e.score_pass, 0)
    const totalFail = allExecutions.reduce((sum, e) => sum + e.score_fail, 0)
    const totalNA = allExecutions.reduce((sum, e) => sum + e.score_na, 0)

    const passRate = totalResponses > 0 ? (totalPass / totalResponses) * 100 : 0
    const failRate = totalResponses > 0 ? (totalFail / totalResponses) * 100 : 0
    const naRate = totalResponses > 0 ? (totalNA / totalResponses) * 100 : 0

    // Recent trend (last 7 days vs previous 7 days)
    const now = new Date()
    const last7Days = allExecutions.filter((e) =>
      isWithinInterval(parseISO(e.created_at), {
        start: startOfDay(subDays(now, 7)),
        end: endOfDay(now),
      })
    )
    const previous7Days = allExecutions.filter((e) =>
      isWithinInterval(parseISO(e.created_at), {
        start: startOfDay(subDays(now, 14)),
        end: endOfDay(subDays(now, 7)),
      })
    )
    const recentTrend =
      previous7Days.length > 0
        ? ((last7Days.length - previous7Days.length) / previous7Days.length) * 100
        : 0

    // Top inspectors by execution count
    const inspectorCounts = new Map<string, number>()
    allExecutions.forEach((e) => {
      if (e.inspector_name) {
        inspectorCounts.set(
          e.inspector_name,
          (inspectorCounts.get(e.inspector_name) || 0) + 1
        )
      }
    })
    const topInspectors = Array.from(inspectorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Category breakdown
    const categoryCounts = new Map<string, number>()
    allExecutions.forEach((e) => {
      const category = e.category || 'Uncategorized'
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    })
    const categoryBreakdown = Array.from(categoryCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Score distribution (0-49%, 50-69%, 70-89%, 90-100%)
    const scoreRanges = {
      'Failed (<50%)': 0,
      'Mixed (50-69%)': 0,
      'Passed (70-89%)': 0,
      'Excellent (90-100%)': 0,
    }
    completedWithScores.forEach((e) => {
      const score = e.score_percentage || 0
      if (score < 50) {scoreRanges['Failed (<50%)']++}
      else if (score < 70) {scoreRanges['Mixed (50-69%)']++}
      else if (score < 90) {scoreRanges['Passed (70-89%)']++}
      else {scoreRanges['Excellent (90-100%)']++}
    })
    const scoreDistribution = Object.entries(scoreRanges).map(([name, value]) => ({
      name,
      value,
    }))

    // Daily activity (last 14 days)
    const dailyActivity = []
    for (let i = 13; i >= 0; i--) {
      const date = subDays(now, i)
      const dayExecutions = allExecutions.filter((e) =>
        isWithinInterval(parseISO(e.created_at), {
          start: startOfDay(date),
          end: endOfDay(date),
        })
      )
      const dayCompleted = dayExecutions.filter((e) => e.is_completed)

      // Calculate average score for the day
      const dayCompletedWithScores = dayCompleted.filter((e) => e.score_percentage !== null)
      const dayAvgScore =
        dayCompletedWithScores.length > 0
          ? dayCompletedWithScores.reduce((sum, e) => sum + (e.score_percentage || 0), 0) /
            dayCompletedWithScores.length
          : null

      dailyActivity.push({
        date: format(date, 'MMM dd'),
        executions: dayExecutions.length,
        completed: dayCompleted.length,
        avgScore: dayAvgScore,
      })
    }

    // Template usage
    const templateCounts = new Map<string, { count: number; name: string }>()
    allExecutions.forEach((e) => {
      if (e.checklist_template_id) {
        const template = templates.find((t) => t.id === e.checklist_template_id)
        const name = template?.name || 'Unknown Template'
        const current = templateCounts.get(e.checklist_template_id) || { count: 0, name }
        templateCounts.set(e.checklist_template_id, {
          count: current.count + 1,
          name,
        })
      }
    })
    const templateUsage = Array.from(templateCounts.entries())
      .map(([id, { name, count }]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Low scoring executions (below 70%)
    const lowScoringExecutions = completedWithScores
      .filter((e) => (e.score_percentage || 0) < 70)
      .sort((a, b) => (a.score_percentage || 0) - (b.score_percentage || 0))
      .slice(0, 5)

    return {
      totalExecutions: total,
      completedExecutions: completed,
      inProgressExecutions: inProgress,
      avgScore,
      passRate,
      failRate,
      naRate,
      recentTrend,
      topInspectors,
      categoryBreakdown,
      scoreDistribution,
      dailyActivity,
      templateUsage,
      lowScoringExecutions,
    }
  }, [allExecutions, templates])

  const isLoading = loadingExecutions || loadingTemplates

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-secondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const COLORS = {
    pass: '#10b981', // green
    fail: '#ef4444', // red
    na: '#6b7280', // gray
    primary: '#3b82f6', // blue
    secondary: '#8b5cf6', // purple
    warning: '#f59e0b', // amber
  }

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 heading-page">
                <BarChart3 className="w-8 h-8 text-primary" />
                Checklists Analytics
              </h1>
              <p className="text-secondary mt-1">
                Insights and performance metrics for your checklists
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/checklists/executions')}>
                <FileText className="w-4 h-4 mr-2" />
                View All
              </Button>
              <Button onClick={() => navigate('/checklists/templates')}>
                Start Checklist
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Executions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Total Executions</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {analytics.totalExecutions}
                  </p>
                </div>
                <div className="rounded-full bg-info-light p-3">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {analytics.recentTrend >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-error" />
                )}
                <span
                  className={`text-sm ${
                    analytics.recentTrend >= 0 ? 'text-success' : 'text-error'
                  }`}
                >
                  {Math.abs(analytics.recentTrend).toFixed(1)}% vs last week
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Completed</p>
                  <p className="text-3xl font-bold text-success mt-1">
                    {analytics.completedExecutions}
                  </p>
                </div>
                <div className="rounded-full bg-success-light p-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              </div>
              <p className="text-sm text-muted mt-3">
                {analytics.totalExecutions > 0
                  ? Math.round(
                      (analytics.completedExecutions / analytics.totalExecutions) * 100
                    )
                  : 0}
                % completion rate
              </p>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">In Progress</p>
                  <p className="text-3xl font-bold text-warning mt-1">
                    {analytics.inProgressExecutions}
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-3">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-muted mt-3">Pending completion</p>
            </CardContent>
          </Card>

          {/* Average Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Average Score</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {analytics.avgScore.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-full bg-info-light p-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted mt-3">Across all completed checklists</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Daily Activity (Last 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="executions"
                    stroke={COLORS.primary}
                    name="Started"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="completed"
                    stroke={COLORS.secondary}
                    name="Completed"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgScore"
                    stroke={COLORS.warning}
                    name="Avg Score (%)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pass/Fail/NA Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Response Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pass */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium text-secondary">Pass</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {analytics.passRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full transition-all"
                      style={{ width: `${analytics.passRate}%` }}
                    />
                  </div>
                </div>

                {/* Fail */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-error" />
                      <span className="text-sm font-medium text-secondary">Fail</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {analytics.failRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-error h-2 rounded-full transition-all"
                      style={{ width: `${analytics.failRate}%` }}
                    />
                  </div>
                </div>

                {/* N/A */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-medium text-secondary">N/A</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {analytics.naRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full transition-all"
                      style={{ width: `${analytics.naRate}%` }}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-secondary">
                    Total responses across all checklists:{' '}
                    <span className="font-semibold text-foreground">
                      {allExecutions.reduce((sum, e) => sum + e.score_total, 0).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.scoreDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.scoreDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? COLORS.fail
                            : index === 1
                            ? COLORS.warning
                            : index === 2
                            ? COLORS.primary
                            : COLORS.pass
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Checklists by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary}>
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Inspectors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Inspectors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topInspectors.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topInspectors.map((inspector, index) => (
                    <div
                      key={inspector.name}
                      className="flex items-center justify-between pb-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {inspector.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {inspector.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Template Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Most Used Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.templateUsage.length > 0 ? (
                <div className="space-y-2">
                  {analytics.templateUsage.slice(0, 5).map((template) => (
                    <div
                      key={template.name}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm text-secondary truncate" title={template.name}>
                        {template.name}
                      </span>
                      <Badge variant="outline">{template.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No templates used yet</p>
              )}
            </CardContent>
          </Card>

          {/* Low Scoring Executions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.lowScoringExecutions.length > 0 ? (
                <div className="space-y-3">
                  {analytics.lowScoringExecutions.map((execution) => (
                    <div
                      key={execution.id}
                      className="pb-3 border-b border-border last:border-0 cursor-pointer hover:bg-surface rounded p-2 -m-2"
                      onClick={() => navigate(`/checklists/executions/${execution.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {execution.name}
                          </p>
                          <p className="text-xs text-muted mt-1">
                            {execution.category || 'Uncategorized'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="ml-2 text-error border-error"
                        >
                          {execution.score_percentage?.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-secondary">All checklists performing well!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {analytics.totalExecutions === 0 && (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-disabled mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2 heading-subsection">
                No checklist data yet
              </h3>
              <p className="text-secondary mb-6">
                Start completing checklists to see analytics and insights here.
              </p>
              <Button onClick={() => navigate('/checklists/templates')}>
                Browse Templates
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ChecklistsDashboardPage
