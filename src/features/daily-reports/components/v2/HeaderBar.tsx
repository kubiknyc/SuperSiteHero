/**
 * HeaderBar - Sticky header with date, shift info, and weather
 * Shows at-a-glance information about the daily report
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Thermometer,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { ReportStatus, ShiftType } from '@/types/daily-reports-v2';

const SHIFT_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'double_time', label: 'Double Time' },
  { value: 'weekend', label: 'Weekend' },
];

const STATUS_BADGES: Record<ReportStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  in_review: { label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
  changes_requested: { label: 'Changes Requested', className: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  locked: { label: 'Locked', className: 'bg-purple-100 text-purple-700' },
  voided: { label: 'Voided', className: 'bg-red-100 text-red-700' },
};

interface HeaderBarProps {
  onFetchWeather?: () => void;
  isLoadingWeather?: boolean;
}

export function HeaderBar({ onFetchWeather, isLoadingWeather }: HeaderBarProps) {
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);
  const updateDraft = useDailyReportStoreV2((state) => state.updateDraft);
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);

  if (!draftReport) return null;

  const reportDate = draftReport.report_date
    ? format(parseISO(draftReport.report_date), 'EEEE, MMMM d, yyyy')
    : 'No date set';

  const status = draftReport.status || 'draft';
  const statusBadge = STATUS_BADGES[status];

  const getWeatherIcon = () => {
    const condition = draftReport.weather_condition?.toLowerCase() || '';
    if (condition.includes('rain') || condition.includes('storm')) {
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    }
    if (condition.includes('snow') || condition.includes('ice')) {
      return <Snowflake className="h-5 w-5 text-blue-300" />;
    }
    if (condition.includes('cloud') || condition.includes('overcast')) {
      return <Cloud className="h-5 w-5 text-gray-500" />;
    }
    return <Sun className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
      <div className="px-4 py-3">
        {/* Top row: Date and Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-lg">{reportDate}</span>
          </div>
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
        </div>

        {/* Bottom row: Shift, Time, Weather */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Shift Type */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShiftDropdown(!showShiftDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">
                {SHIFT_OPTIONS.find((s) => s.value === draftReport.shift_type)?.label ||
                  'Day Shift'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showShiftDropdown && (
              <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg min-w-[140px]">
                {SHIFT_OPTIONS.map((shift) => (
                  <button
                    key={shift.value}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => {
                      updateDraft({ shift_type: shift.value });
                      setShowShiftDropdown(false);
                    }}
                  >
                    {shift.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shift Times */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Start:</span>
            <Input
              type="time"
              value={draftReport.shift_start_time || '07:00'}
              onChange={(e) => updateDraft({ shift_start_time: e.target.value })}
              className="w-28 h-8 text-sm"
            />
            <span className="text-sm text-gray-500">End:</span>
            <Input
              type="time"
              value={draftReport.shift_end_time || '15:30'}
              onChange={(e) => updateDraft({ shift_end_time: e.target.value })}
              className="w-28 h-8 text-sm"
            />
          </div>

          {/* Weather */}
          <div className="flex items-center gap-2 ml-auto">
            {draftReport.temperature_high !== undefined && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <Thermometer className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{draftReport.temperature_high}°F</span>
              </div>
            )}

            {draftReport.weather_condition && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                {getWeatherIcon()}
                <span className="text-sm">{draftReport.weather_condition}</span>
              </div>
            )}

            {draftReport.wind_speed !== undefined && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <Wind className="h-4 w-4 text-gray-600" />
                <span className="text-sm">{draftReport.wind_speed} mph</span>
              </div>
            )}

            {onFetchWeather && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onFetchWeather}
                disabled={isLoadingWeather}
                className="h-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingWeather ? 'animate-spin' : ''}`}
                />
                <span className="ml-1 text-xs">
                  {isLoadingWeather ? 'Fetching...' : 'Update Weather'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeaderBar;
