/**
 * QC Statistics Cards Component
 *
 * Displays quality control statistics in card format.
 */

import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ClipboardCheck,
  XCircle,
  FileWarning,
} from 'lucide-react';
import type { ProjectQCStats } from '@/types/quality-control';

interface QCStatsCardsProps {
  stats: ProjectQCStats;
}

export function QCStatsCards({ stats }: QCStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Open NCRs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileWarning className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.open_ncrs}</p>
              <p className="text-xs text-muted-foreground">Open NCRs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical NCRs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.critical_ncrs}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closed NCRs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.closed_ncrs}</p>
              <p className="text-xs text-muted-foreground">Closed NCRs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Days to Close */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.avg_days_to_close}</p>
              <p className="text-xs text-muted-foreground">Avg Days to Close</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Inspections */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <ClipboardCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.completed_inspections}</p>
              <p className="text-xs text-muted-foreground">Inspections Done</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Pass Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              stats.inspection_pass_rate >= 80
                ? 'bg-green-100 dark:bg-green-900'
                : stats.inspection_pass_rate >= 60
                  ? 'bg-yellow-100 dark:bg-yellow-900'
                  : 'bg-red-100 dark:bg-red-900'
            }`}>
              {stats.inspection_pass_rate >= 80 ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : stats.inspection_pass_rate >= 60 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.inspection_pass_rate}%</p>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
