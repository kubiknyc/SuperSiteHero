// File: /src/components/ui/time-picker.tsx
// Time picker component with hour/minute selection

import * as React from 'react'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'

// ============================================================================
// Types
// ============================================================================

export interface TimeValue {
  hours: number
  minutes: number
}

export interface TimePickerProps {
  /** Current time value */
  value?: TimeValue | null
  /** Callback when time changes */
  onChange?: (time: TimeValue | null) => void
  /** Use 24-hour format */
  use24Hour?: boolean
  /** Minute step interval */
  minuteStep?: number
  /** Minimum time */
  minTime?: TimeValue
  /** Maximum time */
  maxTime?: TimeValue
  /** Placeholder text */
  placeholder?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Error state */
  error?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(time: TimeValue | null, use24Hour: boolean): string {
  if (!time) {return ''}

  const { hours, minutes } = time

  if (use24Hour) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function parseTime(timeStr: string, use24Hour: boolean): TimeValue | null {
  if (!timeStr) {return null}

  const cleanStr = timeStr.trim().toUpperCase()

  if (use24Hour) {
    const match = cleanStr.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) {return null}

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {return null}

    return { hours, minutes }
  }

  // 12-hour format
  const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)
  if (!match) {return null}

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[3]

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {return null}

  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return { hours, minutes }
}

function isTimeValid(time: TimeValue, minTime?: TimeValue, maxTime?: TimeValue): boolean {
  const timeMinutes = time.hours * 60 + time.minutes

  if (minTime) {
    const minMinutes = minTime.hours * 60 + minTime.minutes
    if (timeMinutes < minMinutes) {return false}
  }

  if (maxTime) {
    const maxMinutes = maxTime.hours * 60 + maxTime.minutes
    if (timeMinutes > maxMinutes) {return false}
  }

  return true
}

// ============================================================================
// Sub-components
// ============================================================================

interface TimeSpinnerProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  pad?: number
  disabled?: boolean
}

function TimeSpinner({
  value,
  onChange,
  min,
  max,
  step = 1,
  pad = 2,
  disabled,
}: TimeSpinnerProps) {
  const increment = () => {
    const next = value + step
    onChange(next > max ? min : next)
  }

  const decrement = () => {
    const next = value - step
    onChange(next < min ? max : next)
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={increment}
        disabled={disabled}
        className="h-8 w-12"
        aria-label="Increment"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <div className="text-2xl font-mono font-semibold tabular-nums py-1">
        {value.toString().padStart(pad, '0')}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={decrement}
        disabled={disabled}
        className="h-8 w-12"
        aria-label="Decrement"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TimePicker({
  value,
  onChange,
  use24Hour = false,
  minuteStep = 1,
  minTime,
  maxTime,
  placeholder = 'Select time',
  disabled = false,
  className,
  error = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  // Sync input value with prop value
  React.useEffect(() => {
    setInputValue(formatTime(value || null, use24Hour))
  }, [value, use24Hour])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    const parsed = parseTime(newValue, use24Hour)
    if (parsed && isTimeValid(parsed, minTime, maxTime)) {
      onChange?.(parsed)
    }
  }

  const handleInputBlur = () => {
    const parsed = parseTime(inputValue, use24Hour)
    if (parsed && isTimeValid(parsed, minTime, maxTime)) {
      onChange?.(parsed)
      setInputValue(formatTime(parsed, use24Hour))
    } else if (!inputValue) {
      onChange?.(null)
    } else {
      // Reset to current value
      setInputValue(formatTime(value || null, use24Hour))
    }
  }

  const handleHoursChange = (hours: number) => {
    const newTime = { hours, minutes: value?.minutes ?? 0 }
    if (isTimeValid(newTime, minTime, maxTime)) {
      onChange?.(newTime)
    }
  }

  const handleMinutesChange = (minutes: number) => {
    const newTime = { hours: value?.hours ?? 0, minutes }
    if (isTimeValid(newTime, minTime, maxTime)) {
      onChange?.(newTime)
    }
  }

  const handlePeriodChange = (period: 'AM' | 'PM') => {
    if (!value) {return}

    let newHours = value.hours
    if (period === 'AM' && newHours >= 12) {
      newHours -= 12
    } else if (period === 'PM' && newHours < 12) {
      newHours += 12
    }

    const newTime = { hours: newHours, minutes: value.minutes }
    if (isTimeValid(newTime, minTime, maxTime)) {
      onChange?.(newTime)
    }
  }

  const currentPeriod = value ? (value.hours >= 12 ? 'PM' : 'AM') : 'AM'
  const displayHours = value
    ? use24Hour
      ? value.hours
      : value.hours % 12 || 12
    : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pr-10',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setOpen(true)}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center gap-2">
          {/* Hours */}
          <TimeSpinner
            value={displayHours}
            onChange={(h) => {
              if (use24Hour) {
                handleHoursChange(h)
              } else {
                // Convert to 24-hour
                let hours24 = h
                if (currentPeriod === 'PM' && h !== 12) {
                  hours24 = h + 12
                } else if (currentPeriod === 'AM' && h === 12) {
                  hours24 = 0
                }
                handleHoursChange(hours24)
              }
            }}
            min={use24Hour ? 0 : 1}
            max={use24Hour ? 23 : 12}
            disabled={disabled}
          />

          <span className="text-2xl font-semibold">:</span>

          {/* Minutes */}
          <TimeSpinner
            value={value?.minutes ?? 0}
            onChange={handleMinutesChange}
            min={0}
            max={59}
            step={minuteStep}
            disabled={disabled}
          />

          {/* AM/PM selector (only for 12-hour format) */}
          {!use24Hour && (
            <div className="flex flex-col gap-1 ml-2">
              <Button
                type="button"
                variant={currentPeriod === 'AM' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodChange('AM')}
                disabled={disabled}
                className="h-8 px-3"
              >
                AM
              </Button>
              <Button
                type="button"
                variant={currentPeriod === 'PM' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodChange('PM')}
                disabled={disabled}
                className="h-8 px-3"
              >
                PM
              </Button>
            </div>
          )}
        </div>

        {/* Quick presets */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quick select</p>
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Now', getTime: () => ({ hours: new Date().getHours(), minutes: new Date().getMinutes() }) },
              { label: '9:00 AM', getTime: () => ({ hours: 9, minutes: 0 }) },
              { label: '12:00 PM', getTime: () => ({ hours: 12, minutes: 0 }) },
              { label: '5:00 PM', getTime: () => ({ hours: 17, minutes: 0 }) },
            ].map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const time = preset.getTime()
                  if (isTimeValid(time, minTime, maxTime)) {
                    onChange?.(time)
                    setOpen(false)
                  }
                }}
                disabled={disabled}
                className="h-7 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Time Range Picker
// ============================================================================

export interface TimeRangeValue {
  start: TimeValue | null
  end: TimeValue | null
}

export interface TimeRangePickerProps {
  value?: TimeRangeValue
  onChange?: (range: TimeRangeValue) => void
  use24Hour?: boolean
  minuteStep?: number
  disabled?: boolean
  className?: string
  startLabel?: string
  endLabel?: string
}

export function TimeRangePicker({
  value = { start: null, end: null },
  onChange,
  use24Hour = false,
  minuteStep = 1,
  disabled = false,
  className,
  startLabel = 'Start',
  endLabel = 'End',
}: TimeRangePickerProps) {
  return (
    <div className={cn('flex items-end gap-4', className)}>
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground mb-1 block">{startLabel}</Label>
        <TimePicker
          value={value.start}
          onChange={(start) => onChange?.({ ...value, start })}
          use24Hour={use24Hour}
          minuteStep={minuteStep}
          maxTime={value.end || undefined}
          disabled={disabled}
          placeholder="Start time"
        />
      </div>
      <span className="text-muted-foreground pb-2">to</span>
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground mb-1 block">{endLabel}</Label>
        <TimePicker
          value={value.end}
          onChange={(end) => onChange?.({ ...value, end })}
          use24Hour={use24Hour}
          minuteStep={minuteStep}
          minTime={value.start || undefined}
          disabled={disabled}
          placeholder="End time"
        />
      </div>
    </div>
  )
}
