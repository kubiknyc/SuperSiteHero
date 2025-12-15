// File: /src/features/checklists/components/ScoringReportView.tsx
// Comprehensive scoring report view with filtering and export capabilities

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { CompactGradeDisplay } from './ChecklistGradeDisplay'
import type { ChecklistExecution } from '@/types/checklists'
import type {
  ScoringReportFilters,
  ScoringReportSummary,
  ChecklistScore,
} from '@/types/checklist-scoring'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ScoringReportViewProps {
  executions: ChecklistExecution[]
  summary: ScoringReportSummary
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void
  isLoading?: boolean
}

export function ScoringReportView({
  executions,
  summary,
  onExport,
  isLoading = false,
}: ScoringReportViewProps) {
  const [filters, setFilters] = useState<ScoringReportFilters>({})
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and sort executions
  const filteredExecutions = useMemo(() => {
    let filtered = [...executions]

    // Apply filters
    if (filters.passed !== undefined) {
      const passThreshold = 70 // Default threshold
      filtered = filtered.filter((e) =>
        filters.passed
          ? (e.score_percentage || 0) >= passThreshold
          : (e.score_percentage || 0) < passThreshold
      )
    }

    if (filters.min_score !== undefined) {
      filtered = filtered.filter((e) => (e.score_percentage || 0) >= filters.min_score!)
    }

    if (filters.max_score !== undefined) {
      filtered = filtered.filter((e) => (e.score_percentage || 0) <= filters.max_score!)
    }

    if (filters.date_from) {
      filtered = filtered.filter((e) =>
        e.completed_at ? new Date(e.completed_at) >= new Date(filters.date_from!) : false
      )
    }

    if (filters.date_to) {
      filtered = filtered.filter((e) =>
        e.completed_at ? new Date(e.completed_at) <= new Date(filters.date_to!) : false
      )
    }

    if (filters.inspector_id) {
      filtered = filtered.filter((e) => e.inspector_user_id === filters.inspector_id)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison =
            new Date(a.completed_at || 0).getTime() -
            new Date(b.completed_at || 0).getTime()
          break
        case 'score':
          comparison = (a.score_percentage || 0) - (b.score_percentage || 0)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [executions, filters, sortBy, sortOrder])

  const handleFilterChange = (key: keyof ScoringReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const toggleSort = (field: 'date' | 'score' | 'name') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Convert execution to score object
  const getExecutionScore = (execution: ChecklistExecution): ChecklistScore => {
    return {
      execution_id: execution.id,
      scoring_type: 'percentage',
      score: execution.score_percentage || 0,
      passed: (execution.score_percentage || 0) >= 70,
      breakdown: {
        total_items: execution.score_total,
        completed_items: execution.score_total,
        scorable_items: execution.score_pass + execution.score_fail,
        pass_count: execution.score_pass,
        fail_count: execution.score_fail,
        na_count: execution.score_na,
        item_scores: [],
      },
      calculated_at: execution.updated_at,
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{summary.total_executions}</div>
              <div className="text-sm text-gray-600 mt-1">Total Checklists</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.passed_count}</div>
              <div className="text-sm text-gray-600 mt-1">Passed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{summary.failed_count}</div>
              <div className="text-sm text-gray-600 mt-1">Failed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {summary.average_score.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Average Score</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pass Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pass Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {summary.passed_count} / {summary.total_executions} passed
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {summary.pass_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    summary.pass_rate >= 70 ? 'bg-green-600' : 'bg-red-600'
                  )}
                  style={{ width: `${summary.pass_rate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Distribution */}
      {Object.keys(summary.grade_distribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(summary.grade_distribution).map(([grade, count]) => (
                <div key={grade} className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{grade}</div>
                  <div className="text-sm text-gray-600">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Export
              </CardTitle>
              <CardDescription>Filter and export scoring data</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onExport && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onExport('excel')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pass/Fail Filter */}
            <div className="space-y-2">
              <Label>Pass/Fail Status</Label>
              <Select
                value={filters.passed === undefined ? 'all' : filters.passed ? 'passed' : 'failed'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'passed',
                    value === 'all' ? undefined : value === 'passed'
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="passed">Passed Only</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>

            {/* Min Score */}
            <div className="space-y-2">
              <Label>Min Score</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={filters.min_score || ''}
                onChange={(e) =>
                  handleFilterChange('min_score', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>

            {/* Max Score */}
            <div className="space-y-2">
              <Label>Max Score</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="100"
                value={filters.max_score || ''}
                onChange={(e) =>
                  handleFilterChange('max_score', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Scoring Results ({filteredExecutions.length} of {executions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
              <p className="text-gray-600">Loading scores...</p>
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No results found with current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Checklist
                        {sortBy === 'name' &&
                          (sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
                      </div>
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('score')}
                    >
                      <div className="flex items-center gap-2">
                        Score
                        {sortBy === 'score' &&
                          (sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        {sortBy === 'date' &&
                          (sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExecutions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">{execution.name}</TableCell>
                      <TableCell>
                        {execution.category && (
                          <Badge variant="outline">{execution.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{execution.inspector_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CompactGradeDisplay score={getExecutionScore(execution)} />
                      </TableCell>
                      <TableCell>
                        {(execution.score_percentage || 0) >= 70 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Passed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Failed</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {execution.completed_at
                            ? format(new Date(execution.completed_at), 'MMM d, yyyy')
                            : 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
