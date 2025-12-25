/**
 * TRIR Calculator Component
 *
 * Interactive calculator for OSHA safety rates:
 * - TRIR (Total Recordable Incident Rate)
 * - DART (Days Away, Restricted, or Transferred)
 * - LTIR (Lost Time Injury Rate)
 * - Severity Rate
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Info,
  RefreshCw,
  Download,
  Copy,
  CheckCircle,
} from 'lucide-react'
import {
  calculateTRIR,
  calculateDART,
  calculateLTIR,
  calculateSeverityRate,
  getRateStatus,
  getStatusColors,
  formatRate,
  getDefaultBenchmark,
} from '../utils/safetyCalculations'
import type { RateStatus } from '@/types/safety-metrics'

// ============================================================================
// Props
// ============================================================================

interface TRIRCalculatorProps {
  initialHoursWorked?: number
  initialRecordableCases?: number
  initialDartCases?: number
  initialLostTimeCases?: number
  initialDaysAway?: number
  initialDaysRestricted?: number
  naicsCode?: string
  onCalculate?: (results: CalculationResults) => void
  className?: string
}

interface CalculationResults {
  trir: number | null
  dart: number | null
  ltir: number | null
  severityRate: number | null
  hoursWorked: number
  recordableCases: number
  dartCases: number
  lostTimeCases: number
  daysAway: number
  daysRestricted: number
}

// ============================================================================
// Rate Display Component
// ============================================================================

interface RateDisplayProps {
  label: string
  shortLabel: string
  value: number | null
  benchmark: number | null
  formula: string
  description: string
}

function RateDisplay({ label, shortLabel, value, benchmark, formula, description }: RateDisplayProps) {
  const status = getRateStatus(shortLabel.toLowerCase() as any, value, benchmark)
  const colors = getStatusColors(status)

  return (
    <div className={cn('p-4 rounded-lg border', colors.border, colors.bg)}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{shortLabel}</span>
        {benchmark !== null && (
          <Badge variant="outline" className="text-xs">
            Industry: {benchmark.toFixed(2)}
          </Badge>
        )}
      </div>

      <div className={cn('text-3xl font-bold', colors.text)}>
        {value !== null ? value.toFixed(2) : 'N/A'}
      </div>

      <div className="mt-2 text-xs text-secondary">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-muted">{formula}</p>
      </div>

      {value !== null && benchmark !== null && (
        <div className="mt-2">
          {value < benchmark ? (
            <Badge className="bg-success-light text-green-800 text-xs">
              {((1 - value / benchmark) * 100).toFixed(1)}% better than industry
            </Badge>
          ) : value > benchmark ? (
            <Badge className="bg-error-light text-red-800 text-xs">
              {((value / benchmark - 1) * 100).toFixed(1)}% above industry
            </Badge>
          ) : (
            <Badge className="bg-warning-light text-yellow-800 text-xs">
              At industry average
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Input Field Component
// ============================================================================

interface NumberInputProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  helpText?: string
}

function NumberInput({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  helpText,
}: NumberInputProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="mt-1"
      />
      {helpText && (
        <p className="mt-1 text-xs text-muted">{helpText}</p>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TRIRCalculator({
  initialHoursWorked = 0,
  initialRecordableCases = 0,
  initialDartCases = 0,
  initialLostTimeCases = 0,
  initialDaysAway = 0,
  initialDaysRestricted = 0,
  naicsCode = '23',
  onCalculate,
  className,
}: TRIRCalculatorProps) {
  // Input state
  const [hoursWorked, setHoursWorked] = React.useState(initialHoursWorked)
  const [recordableCases, setRecordableCases] = React.useState(initialRecordableCases)
  const [dartCases, setDartCases] = React.useState(initialDartCases)
  const [lostTimeCases, setLostTimeCases] = React.useState(initialLostTimeCases)
  const [daysAway, setDaysAway] = React.useState(initialDaysAway)
  const [daysRestricted, setDaysRestricted] = React.useState(initialDaysRestricted)

  // UI state
  const [copied, setCopied] = React.useState(false)

  // Get benchmark
  const benchmark = getDefaultBenchmark(naicsCode)

  // Calculate rates
  const trir = calculateTRIR(recordableCases, hoursWorked)
  const dart = calculateDART(dartCases, hoursWorked)
  const ltir = calculateLTIR(lostTimeCases, hoursWorked)
  const severityRate = calculateSeverityRate(daysAway, daysRestricted, hoursWorked)

  // Call onCalculate when values change
  React.useEffect(() => {
    onCalculate?.({
      trir,
      dart,
      ltir,
      severityRate,
      hoursWorked,
      recordableCases,
      dartCases,
      lostTimeCases,
      daysAway,
      daysRestricted,
    })
  }, [trir, dart, ltir, severityRate, hoursWorked, recordableCases, dartCases, lostTimeCases, daysAway, daysRestricted, onCalculate])

  // Reset all values
  const handleReset = () => {
    setHoursWorked(0)
    setRecordableCases(0)
    setDartCases(0)
    setLostTimeCases(0)
    setDaysAway(0)
    setDaysRestricted(0)
  }

  // Copy results to clipboard
  const handleCopy = () => {
    const results = `
Safety Metrics Calculation Results
==================================
Hours Worked: ${hoursWorked.toLocaleString()}

TRIR: ${trir?.toFixed(2) ?? 'N/A'}
DART: ${dart?.toFixed(2) ?? 'N/A'}
LTIR: ${ltir?.toFixed(2) ?? 'N/A'}
Severity Rate: ${severityRate?.toFixed(2) ?? 'N/A'}

Inputs:
- Recordable Cases: ${recordableCases}
- DART Cases: ${dartCases}
- Lost Time Cases: ${lostTimeCases}
- Days Away: ${daysAway}
- Days Restricted: ${daysRestricted}

Industry Benchmarks (NAICS ${naicsCode}):
- TRIR: ${benchmark?.trir ?? 'N/A'}
- DART: ${benchmark?.dart ?? 'N/A'}
- LTIR: ${benchmark?.ltir ?? 'N/A'}
`.trim()

    navigator.clipboard.writeText(results)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Quick estimate from employee count
  const handleEstimateHours = (employees: number) => {
    // Standard: 2000 hours per FTE per year
    setHoursWorked(employees * 2000)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          OSHA Rate Calculator
        </CardTitle>
        <CardDescription>
          Calculate TRIR, DART, LTIR, and Severity Rate based on your safety data
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Hours Worked Input */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <NumberInput
            id="hoursWorked"
            label="Total Hours Worked"
            value={hoursWorked}
            onChange={setHoursWorked}
            step={1000}
            helpText="Total employee-hours worked during the period"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted">Quick estimate from employees:</span>
            {[25, 50, 100, 250, 500].map((count) => (
              <Button
                key={count}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleEstimateHours(count)}
              >
                {count} employees
              </Button>
            ))}
          </div>
        </div>

        {/* Input Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumberInput
            id="recordableCases"
            label="Recordable Cases"
            value={recordableCases}
            onChange={setRecordableCases}
            helpText="OSHA-recordable injuries/illnesses"
          />

          <NumberInput
            id="dartCases"
            label="DART Cases"
            value={dartCases}
            onChange={setDartCases}
            helpText="Cases with days away, restricted, or transfer"
          />

          <NumberInput
            id="lostTimeCases"
            label="Lost Time Cases"
            value={lostTimeCases}
            onChange={setLostTimeCases}
            helpText="Cases with lost work days"
          />

          <NumberInput
            id="daysAway"
            label="Days Away"
            value={daysAway}
            onChange={setDaysAway}
            helpText="Total days away from work"
          />

          <NumberInput
            id="daysRestricted"
            label="Days Restricted"
            value={daysRestricted}
            onChange={setDaysRestricted}
            helpText="Total days on restricted duty"
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RateDisplay
            label="Total Recordable Incident Rate"
            shortLabel="TRIR"
            value={trir}
            benchmark={benchmark?.trir ?? null}
            formula="(Recordable x 200,000) / Hours"
            description="Per 200,000 hours worked"
          />

          <RateDisplay
            label="Days Away, Restricted, or Transferred"
            shortLabel="DART"
            value={dart}
            benchmark={benchmark?.dart ?? null}
            formula="(DART Cases x 200,000) / Hours"
            description="Per 200,000 hours worked"
          />

          <RateDisplay
            label="Lost Time Injury Rate"
            shortLabel="LTIR"
            value={ltir}
            benchmark={benchmark?.ltir ?? null}
            formula="(Lost Time x 200,000) / Hours"
            description="Per 200,000 hours worked"
          />

          <RateDisplay
            label="Severity Rate"
            shortLabel="SR"
            value={severityRate}
            benchmark={null}
            formula="(Days Away + Restricted x 200,000) / Hours"
            description="Days lost per 200,000 hours"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Info className="h-4 w-4" />
            <span>200,000 = 100 full-time employees working 40 hrs/week for 50 weeks</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>

            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-success" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Results
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Formula Reference */}
        <div className="bg-surface rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3 heading-card">OSHA Rate Formulas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">TRIR (Total Recordable Incident Rate)</p>
              <p className="text-secondary font-mono text-xs mt-1">
                = (Number of Recordable Cases x 200,000) / Hours Worked
              </p>
            </div>
            <div>
              <p className="font-medium">DART Rate</p>
              <p className="text-secondary font-mono text-xs mt-1">
                = (DART Cases x 200,000) / Hours Worked
              </p>
            </div>
            <div>
              <p className="font-medium">LTIR (Lost Time Injury Rate)</p>
              <p className="text-secondary font-mono text-xs mt-1">
                = (Lost Time Cases x 200,000) / Hours Worked
              </p>
            </div>
            <div>
              <p className="font-medium">Severity Rate</p>
              <p className="text-secondary font-mono text-xs mt-1">
                = (Days Away + Restricted x 200,000) / Hours Worked
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-xs text-muted">
            <p className="font-medium mb-2">What counts as DART?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cases resulting in days away from work</li>
              <li>Cases resulting in restricted work activity</li>
              <li>Cases resulting in job transfer</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TRIRCalculator
