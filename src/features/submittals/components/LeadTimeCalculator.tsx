/**
 * Lead Time Calculator Component
 *
 * Visual calculator for submittal lead times showing:
 * - Fabrication time input
 * - Review cycles (GC, Architect, etc.)
 * - Total lead time with calendar visualization
 * - Required by date calculation
 * - Holiday calendar integration
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  subDays,
  differenceInDays,
  isPast,
  isBefore,
  isWeekend,
  isSameDay,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Truck,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  Pencil,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'

interface LeadTimeCalculatorProps {
  /** Required on-site date */
  requiredOnSite?: Date | null
  /** Fabrication/manufacturing lead time in weeks */
  leadTimeWeeks?: number
  /** Architect/engineer review cycle in days */
  reviewCycleDays?: number
  /** Callback when dates are calculated */
  onCalculate?: (result: LeadTimeResult) => void
  /** Whether the component is in read-only mode */
  readOnly?: boolean
  /** Show compact mode */
  compact?: boolean
  /** Class name */
  className?: string
}

interface LeadTimeResult {
  requiredOnSite: Date
  submitByDate: Date
  leadTimeWeeks: number
  reviewCycleDays: number
  daysUntilDeadline: number
  isOverdue: boolean
  status: 'safe' | 'warning' | 'critical' | 'overdue'
  workingDays: number
  holidaysInRange: number
  reviewCycleBreakdown: ReviewCycleItem[]
}

interface ReviewCycleItem {
  id: string
  name: string
  entity: string
  days: number
  color: string
}

interface Holiday {
  id: string
  name: string
  holiday_date: string
  holiday_type: string
}

// Review cycle configuration
const DEFAULT_REVIEW_CYCLES: ReviewCycleItem[] = [
  { id: 'gc', name: 'GC Review', entity: 'General Contractor', days: 3, color: 'bg-info' },
  { id: 'architect', name: 'Architect Review', entity: 'Architect', days: 7, color: 'bg-primary' },
  { id: 'engineer', name: 'Engineer Review', entity: 'Engineer', days: 5, color: 'bg-success' },
  { id: 'owner', name: 'Owner Review', entity: 'Owner', days: 0, color: 'bg-warning' },
]

const COMMON_LEAD_TIMES = [
  { label: 'Standard (2-3 weeks)', weeks: 3, description: 'Standard materials' },
  { label: 'Custom Millwork (6-8 weeks)', weeks: 7, description: 'Custom millwork' },
  { label: 'Structural Steel (8-12 weeks)', weeks: 10, description: 'Structural steel' },
  { label: 'Elevator Equipment (12-16 weeks)', weeks: 14, description: 'Elevator equipment' },
  { label: 'Switchgear (16-24 weeks)', weeks: 20, description: 'Electrical switchgear' },
  { label: 'Generator (20-30 weeks)', weeks: 25, description: 'Generator sets' },
  { label: 'Chillers (24-32 weeks)', weeks: 28, description: 'HVAC chillers' },
]

// ============================================================================
// Hooks
// ============================================================================

function useHolidays(startDate: Date | null, endDate: Date | null) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['holidays', userProfile?.company_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!userProfile?.company_id || !startDate || !endDate) {
        return []
      }

      const { data, error } = await supabase
        .from('holidays')
        .select('id, name, holiday_date, holiday_type')
        .eq('company_id', userProfile.company_id)
        .gte('holiday_date', format(startDate, 'yyyy-MM-dd'))
        .lte('holiday_date', format(endDate, 'yyyy-MM-dd'))
        .order('holiday_date', { ascending: true })

      if (error) {
        console.warn('Could not fetch holidays:', error)
        return []
      }

      return data as Holiday[]
    },
    enabled: !!userProfile?.company_id && !!startDate && !!endDate,
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateWorkingDays(startDate: Date, endDate: Date, holidays: Holiday[]): number {
  const holidayDates = new Set(holidays.map(h => h.holiday_date))
  let workingDays = 0
  let currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    if (!isWeekend(currentDate) && !holidayDates.has(dateStr)) {
      workingDays++
    }
    currentDate = addDays(currentDate, 1)
  }

  return workingDays
}

function subtractWorkingDays(date: Date, days: number, holidays: Holiday[]): Date {
  const holidayDates = new Set(holidays.map(h => h.holiday_date))
  let currentDate = new Date(date)
  let daysSubtracted = 0

  while (daysSubtracted < days) {
    currentDate = subDays(currentDate, 1)
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    if (!isWeekend(currentDate) && !holidayDates.has(dateStr)) {
      daysSubtracted++
    }
  }

  return currentDate
}

// ============================================================================
// Mini Calendar Sub-Component
// ============================================================================

interface MiniCalendarProps {
  month: Date
  requiredDate: Date | null
  submitByDate: Date | null
  holidays: Holiday[]
  onPrevMonth: () => void
  onNextMonth: () => void
}

function MiniCalendar({
  month,
  requiredDate,
  submitByDate,
  holidays,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const days = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return eachDayOfInterval({ start, end })
  }, [month])

  const holidayDates = useMemo(() => {
    return new Set(holidays.map(h => h.holiday_date))
  }, [holidays])

  const today = new Date()

  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={onPrevMonth} className="h-7 w-7 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(month, 'MMMM yyyy')}
        </span>
        <Button variant="ghost" size="sm" onClick={onNextMonth} className="h-7 w-7 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}

        {/* Empty cells for days before the start of the month */}
        {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isHoliday = holidayDates.has(dateStr)
          const isRequired = requiredDate && isSameDay(day, requiredDate)
          const isSubmitBy = submitByDate && isSameDay(day, submitByDate)
          const isToday = isSameDay(day, today)
          const isWeekendDay = isWeekend(day)

          return (
            <div
              key={dateStr}
              className={cn(
                'text-xs py-1 rounded transition-colors',
                isWeekendDay && 'text-muted-foreground',
                isHoliday && 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
                isToday && !isRequired && !isSubmitBy && 'ring-1 ring-primary',
                isRequired && 'bg-error text-white font-bold',
                isSubmitBy && 'bg-success text-white font-bold'
              )}
              title={
                isRequired
                  ? 'Required on-site date'
                  : isSubmitBy
                  ? 'Submit by date'
                  : isHoliday
                  ? holidays.find(h => h.holiday_date === dateStr)?.name
                  : undefined
              }
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-success" />
          <span className="text-muted-foreground">Submit by</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-error" />
          <span className="text-muted-foreground">Required</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning-light dark:bg-warning/50" />
          <span className="text-muted-foreground">Holiday</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function LeadTimeCalculator({
  requiredOnSite: initialRequiredOnSite,
  leadTimeWeeks: initialLeadTimeWeeks = 4,
  reviewCycleDays: initialReviewCycleDays = 14,
  onCalculate,
  readOnly = false,
  compact = false,
  className,
}: LeadTimeCalculatorProps) {
  const [requiredOnSite, setRequiredOnSite] = useState<Date | undefined>(
    initialRequiredOnSite ? new Date(initialRequiredOnSite) : undefined
  )
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(initialLeadTimeWeeks)
  const [reviewCycles, setReviewCycles] = useState<Record<string, number>>(() => {
    // Initialize from default review cycles
    return DEFAULT_REVIEW_CYCLES.reduce((acc, cycle) => {
      acc[cycle.id] = cycle.days
      return acc
    }, {} as Record<string, number>)
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState('calculator')

  // Calculate total review days from individual cycles
  const totalReviewDays = useMemo(() => {
    return Object.values(reviewCycles).reduce((sum, days) => sum + days, 0)
  }, [reviewCycles])

  // Calculate date range for holidays
  const dateRange = useMemo(() => {
    if (!requiredOnSite) {return { start: null, end: null }}
    const start = subDays(requiredOnSite, 365)
    return { start, end: requiredOnSite }
  }, [requiredOnSite])

  // Fetch holidays
  const { data: holidays = [] } = useHolidays(dateRange.start, dateRange.end)

  // Calculate the submit-by date with holiday support
  const calculation = useMemo((): LeadTimeResult | null => {
    if (!requiredOnSite) {return null}

    // Calculate working days needed
    const fabricationWorkingDays = leadTimeWeeks * 5 // 5 working days per week
    const totalWorkingDays = fabricationWorkingDays + totalReviewDays

    // Subtract working days to get submit-by date
    const submitByDate = subtractWorkingDays(requiredOnSite, totalWorkingDays, holidays)
    const daysUntilDeadline = differenceInDays(submitByDate, new Date())

    // Calculate statistics
    const workingDays = calculateWorkingDays(submitByDate, requiredOnSite, holidays)
    const holidaysInRange = holidays.filter(h => {
      const date = new Date(h.holiday_date)
      return date >= submitByDate && date <= requiredOnSite
    }).length

    let status: LeadTimeResult['status'] = 'safe'
    if (isPast(submitByDate)) {
      status = 'overdue'
    } else if (daysUntilDeadline <= 7) {
      status = 'critical'
    } else if (daysUntilDeadline <= 14) {
      status = 'warning'
    }

    // Build review cycle breakdown
    const reviewCycleBreakdown = DEFAULT_REVIEW_CYCLES.map(cycle => ({
      ...cycle,
      days: reviewCycles[cycle.id] || 0,
    })).filter(cycle => cycle.days > 0)

    return {
      requiredOnSite,
      submitByDate,
      leadTimeWeeks,
      reviewCycleDays: totalReviewDays,
      daysUntilDeadline,
      isOverdue: isPast(submitByDate),
      status,
      workingDays,
      holidaysInRange,
      reviewCycleBreakdown,
    }
  }, [requiredOnSite, leadTimeWeeks, totalReviewDays, holidays, reviewCycles])

  // Notify parent when calculation changes
  useEffect(() => {
    if (calculation && onCalculate) {
      onCalculate(calculation)
    }
  }, [calculation, onCalculate])

  // Handle calculate button click
  const handleCalculate = useCallback(() => {
    if (calculation && onCalculate) {
      onCalculate(calculation)
    }
  }, [calculation, onCalculate])

  // Handle review cycle change
  const handleReviewCycleChange = useCallback((cycleId: string, days: number) => {
    setReviewCycles(prev => ({ ...prev, [cycleId]: Math.max(0, days) }))
  }, [])

  // Status colors and badges
  const getStatusBadge = (status: LeadTimeResult['status']) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </Badge>
        )
      case 'critical':
        return (
          <Badge variant="destructive" className="gap-1">
            <Clock className="h-3 w-3" />
            Critical
          </Badge>
        )
      case 'warning':
        return (
          <Badge variant="secondary" className="gap-1 bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning">
            <AlertTriangle className="h-3 w-3" />
            Due Soon
          </Badge>
        )
      case 'safe':
        return (
          <Badge variant="secondary" className="gap-1 bg-success-light text-success-dark dark:bg-success/20 dark:text-success">
            <CheckCircle2 className="h-3 w-3" />
            On Track
          </Badge>
        )
    }
  }

  // Compact view
  if (compact && calculation) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">Lead Time</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fab:</span>{' '}
                <span className="font-medium">{leadTimeWeeks}w</span>
              </div>
              <div>
                <span className="text-muted-foreground">Review:</span>{' '}
                <span className="font-medium">{totalReviewDays}d</span>
              </div>
              <div>
                <span className="text-muted-foreground">Submit:</span>{' '}
                <span className={cn('font-medium',
                  calculation.status === 'overdue' && 'text-destructive',
                  calculation.status === 'critical' && 'text-destructive',
                  calculation.status === 'warning' && 'text-warning',
                  calculation.status === 'safe' && 'text-success'
                )}>
                  {format(calculation.submitByDate, 'MMM d')}
                </span>
              </div>
              {getStatusBadge(calculation.status)}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Lead Time Calculator</CardTitle>
          </div>
          {calculation && getStatusBadge(calculation.status)}
        </div>
        <CardDescription>
          Calculate when this submittal must be submitted to meet the required on-site date
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6 mt-4">
            {/* Required On-Site Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Required On-Site Date
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={readOnly}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !requiredOnSite && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {requiredOnSite ? format(requiredOnSite, 'PPP') : 'Select date...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={requiredOnSite}
                    onSelect={(date) => {
                      setRequiredOnSite(date)
                      setCalendarOpen(false)
                    }}
                    disabled={(date) => isBefore(date, new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fabrication Lead Time */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Fabrication Lead Time
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[leadTimeWeeks]}
                  onValueChange={([value]) => setLeadTimeWeeks(value)}
                  min={1}
                  max={30}
                  step={1}
                  disabled={readOnly}
                  className="flex-1"
                />
                <div className="w-20 text-right">
                  <span className="text-lg font-bold text-foreground">{leadTimeWeeks}</span>
                  <span className="text-sm text-muted-foreground ml-1">weeks</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {COMMON_LEAD_TIMES.slice(0, 5).map((lt) => (
                  <Button
                    key={lt.weeks}
                    variant={leadTimeWeeks === lt.weeks ? 'default' : 'outline'}
                    size="sm"
                    disabled={readOnly}
                    className="h-7 text-xs"
                    onClick={() => setLeadTimeWeeks(lt.weeks)}
                    title={lt.description}
                  >
                    {lt.weeks}w
                  </Button>
                ))}
              </div>
            </div>

            {/* Review Cycles (Detailed) */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                Review Cycles
              </Label>
              <div className="space-y-2">
                {DEFAULT_REVIEW_CYCLES.map((cycle) => (
                  <div key={cycle.id} className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', cycle.color)} />
                    <Label htmlFor={`review-${cycle.id}`} className="flex-1 text-sm text-secondary">
                      {cycle.name}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`review-${cycle.id}`}
                        type="number"
                        min={0}
                        max={30}
                        value={reviewCycles[cycle.id] || 0}
                        onChange={(e) => handleReviewCycleChange(cycle.id, parseInt(e.target.value) || 0)}
                        disabled={readOnly}
                        className="w-16 text-center h-8"
                      />
                      <span className="text-xs text-muted-foreground w-8">days</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium text-secondary">Total Review Time</span>
                <span className="text-lg font-bold text-foreground">{totalReviewDays} days</span>
              </div>
            </div>

            {/* Calculation Result */}
            {calculation && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Submit By:</span>
                  <span className={cn(
                    'text-lg font-bold',
                    calculation.status === 'overdue' && 'text-destructive',
                    calculation.status === 'critical' && 'text-destructive',
                    calculation.status === 'warning' && 'text-warning',
                    calculation.status === 'safe' && 'text-success'
                  )}>
                    {format(calculation.submitByDate, 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="text-center py-2">
                  {calculation.isOverdue ? (
                    <p className="text-destructive font-medium">
                      {Math.abs(calculation.daysUntilDeadline)} days overdue!
                    </p>
                  ) : calculation.daysUntilDeadline === 0 ? (
                    <p className="text-warning font-medium">Due today!</p>
                  ) : (
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {calculation.daysUntilDeadline}
                      </span>{' '}
                      days until deadline
                    </p>
                  )}
                </div>

                {/* Review Cycle Breakdown Progress Bar */}
                {calculation.reviewCycleBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Review Cycle Breakdown</p>
                    <div className="flex h-3 rounded-full overflow-hidden">
                      {calculation.reviewCycleBreakdown.map((cycle) => (
                        <div
                          key={cycle.id}
                          className={cn(cycle.color, 'transition-all')}
                          style={{ width: `${(cycle.days / totalReviewDays) * 100}%` }}
                          title={`${cycle.name}: ${cycle.days} days`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {calculation.reviewCycleBreakdown.map((cycle) => (
                        <div key={cycle.id} className="flex items-center gap-1">
                          <div className={cn('w-2 h-2 rounded-full', cycle.color)} />
                          <span className="text-muted-foreground">{cycle.name}: {cycle.days}d</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Review</p>
                    <p className="font-medium">{totalReviewDays} days</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Lead Time</p>
                    <p className="font-medium">{leadTimeWeeks} weeks</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Working Days</p>
                    <p className="font-medium">{calculation.workingDays}</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Holidays</p>
                    <p className={cn('font-medium', calculation.holidaysInRange > 0 && 'text-warning')}>
                      {calculation.holidaysInRange}
                    </p>
                  </div>
                </div>

                {/* Holidays Warning */}
                {calculation.holidaysInRange > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-light border border-warning/30 dark:bg-warning/20 dark:border-warning/30">
                    <Info className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning-dark dark:text-warning">
                        {calculation.holidaysInRange} holiday{calculation.holidaysInRange !== 1 ? 's' : ''} in this period
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {holidays
                          .filter(h => {
                            const date = new Date(h.holiday_date)
                            return date >= calculation.submitByDate && date <= calculation.requiredOnSite
                          })
                          .slice(0, 3)
                          .map(h => (
                            <li key={h.id} className="text-xs text-warning-dark dark:text-warning">
                              {format(new Date(h.holiday_date), 'MMM d')}: {h.name}
                            </li>
                          ))}
                        {calculation.holidaysInRange > 3 && (
                          <li className="text-xs text-warning-dark dark:text-warning">
                            +{calculation.holidaysInRange - 3} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Apply Button */}
            {!readOnly && onCalculate && calculation && (
              <Button onClick={handleCalculate} className="w-full">
                Apply to Submittal
              </Button>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            {calculation ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success-light border border-success/30 dark:bg-success/20 dark:border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="font-medium text-foreground">Submit By</span>
                    </div>
                    <p className="text-xl font-bold text-success">
                      {format(calculation.submitByDate, 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(calculation.submitByDate, 'EEEE')}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-error-light border border-error/30 dark:bg-error/20 dark:border-error/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-error" />
                      <span className="font-medium text-foreground">Required On-Site</span>
                    </div>
                    <p className="text-xl font-bold text-error">
                      {format(calculation.requiredOnSite, 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(calculation.requiredOnSite, 'EEEE')}
                    </p>
                  </div>
                </div>

                {/* Calendar */}
                <MiniCalendar
                  month={calendarMonth}
                  requiredDate={calculation.requiredOnSite}
                  submitByDate={calculation.submitByDate}
                  holidays={holidays}
                  onPrevMonth={() => setCalendarMonth(prev => subMonths(prev, 1))}
                  onNextMonth={() => setCalendarMonth(prev => addMonths(prev, 1))}
                />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">
                      {differenceInDays(calculation.requiredOnSite, calculation.submitByDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">Calendar Days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">
                      {calculation.workingDays}
                    </p>
                    <p className="text-xs text-muted-foreground">Working Days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className={cn('text-2xl font-bold', calculation.holidaysInRange > 0 ? 'text-warning' : 'text-foreground')}>
                      {calculation.holidaysInRange}
                    </p>
                    <p className="text-xs text-muted-foreground">Holidays</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-secondary font-medium">No Date Selected</p>
                <p className="text-sm text-muted-foreground">
                  Select a required on-site date to view the calendar
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default LeadTimeCalculator
