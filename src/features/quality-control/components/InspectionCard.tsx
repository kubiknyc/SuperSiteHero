/**
 * Inspection Card Component
 *
 * Displays a summary card for a QC Inspection.
 * InspectionType values match migration 155: pre_work, in_process, final, mock_up, first_article, receiving
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InspectionStatusBadge, InspectionResultBadge } from './InspectionStatusBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { MapPin, Calendar, User, ClipboardCheck } from 'lucide-react';
import { InspectionType, type QCInspectionWithDetails } from '@/types/quality-control';

interface InspectionCardProps {
  inspection: QCInspectionWithDetails;
  projectId: string;
}

// InspectionType labels aligned with database schema (migration 155)
const inspectionTypeLabels: Record<string, string> = {
  [InspectionType.PRE_WORK]: 'Pre-Work',
  [InspectionType.IN_PROCESS]: 'In-Process',
  [InspectionType.FINAL]: 'Final',
  [InspectionType.MOCK_UP]: 'Mock-Up',
  [InspectionType.FIRST_ARTICLE]: 'First Article',
  [InspectionType.RECEIVING]: 'Receiving',
};

export function InspectionCard({ inspection, projectId }: InspectionCardProps) {
  return (
    <Link to={`/projects/${projectId}/quality-control/inspection/${inspection.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {inspectionTypeLabels[inspection.inspection_type] || inspection.inspection_type}
                </span>
              </div>
              <h3 className="font-semibold text-foreground truncate">
                {inspection.title}
              </h3>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <InspectionStatusBadge status={inspection.status} />
              {inspection.result && inspection.result !== 'pending' && (
                <InspectionResultBadge result={inspection.result} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {inspection.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {inspection.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {inspection.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{inspection.location}</span>
              </div>
            )}
            {inspection.inspection_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(inspection.inspection_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {inspection.inspector_name && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{inspection.inspector_name}</span>
              </div>
            )}
            {inspection.subcontractor_name && (
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="text-xs text-muted-foreground">Sub:</span>
                <span className="truncate">{inspection.subcontractor_name}</span>
              </div>
            )}
          </div>

          {inspection.scheduled_date && inspection.status === 'scheduled' && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scheduled</span>
                <span>
                  {formatDistanceToNow(new Date(inspection.scheduled_date), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
