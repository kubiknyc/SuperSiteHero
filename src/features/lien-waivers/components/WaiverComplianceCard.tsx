// File: /src/features/lien-waivers/components/WaiverComplianceCard.tsx
// Card showing waiver compliance status for a project

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWaiverAmount, type ProjectWaiverSummary } from '@/types/lien-waiver';

interface WaiverComplianceCardProps {
  summary: ProjectWaiverSummary;
  className?: string;
}

export function WaiverComplianceCard({ summary, className }: WaiverComplianceCardProps) {
  const totalRequired = summary.total_waivers + summary.missing_count;
  const compliancePercent = totalRequired > 0
    ? Math.round((summary.approved_count / totalRequired) * 100)
    : 100;

  const isCompliant = summary.missing_count === 0 && summary.overdue_count === 0;

  return (
    <Card className={cn(
      'border-l-4',
      isCompliant ? 'border-l-green-500' : 'border-l-amber-500',
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Lien Waiver Compliance
          </span>
          {isCompliant ? (
            <Badge className="bg-success-light text-success-dark">
              <CheckCircle className="h-3 w-3 mr-1" />
              Compliant
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Action Needed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-secondary">Approved</span>
            <span className="font-medium">{compliancePercent}%</span>
          </div>
          <Progress value={compliancePercent} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-surface rounded">
            <div className="text-muted">Pending</div>
            <div className="font-semibold ml-auto">{summary.pending_count}</div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-surface rounded">
            <div className="text-muted">Received</div>
            <div className="font-semibold ml-auto">{summary.received_count}</div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-success-light rounded">
            <div className="text-success-dark">Approved</div>
            <div className="font-semibold ml-auto text-success-dark">{summary.approved_count}</div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-surface rounded">
            <div className="text-muted">Total</div>
            <div className="font-semibold ml-auto">{summary.total_waivers}</div>
          </div>
        </div>

        {/* Alerts */}
        {(summary.missing_count > 0 || summary.overdue_count > 0) && (
          <div className="space-y-2">
            {summary.missing_count > 0 && (
              <div className="flex items-center gap-2 p-2 bg-warning-light border border-amber-200 rounded text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-amber-800">
                  {summary.missing_count} missing waiver{summary.missing_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {summary.overdue_count > 0 && (
              <div className="flex items-center gap-2 p-2 bg-error-light border border-red-200 rounded text-sm">
                <Clock className="h-4 w-4 text-error" />
                <span className="text-red-800">
                  {summary.overdue_count} overdue waiver{summary.overdue_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total Amount */}
        <div className="pt-2 border-t">
          <div className="flex justify-between">
            <span className="text-secondary">Total Waived Amount</span>
            <span className="font-semibold text-success-dark">
              {formatWaiverAmount(summary.total_waived_amount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WaiverComplianceCard;
