/**
 * Photo Report Card Component
 *
 * Displays a summary card for a photo progress report.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhotoReportStatusBadge } from './PhotoReportStatusBadge';
import { format } from 'date-fns';
import {
  FileText,
  Calendar,
  Image,
  MapPin,
  GitCompare,
  User,
} from 'lucide-react';
import type { PhotoProgressReport } from '@/types/photo-progress';

interface PhotoReportCardProps {
  report: PhotoProgressReport;
  projectId: string;
}

export function PhotoReportCard({ report, projectId }: PhotoReportCardProps) {
  const reportTypeLabels: Record<string, string> = {
    progress: 'Progress Report',
    milestone: 'Milestone Report',
    monthly: 'Monthly Report',
    final: 'Final Report',
  };

  return (
    <Link to={`/projects/${projectId}/photo-progress/report/${report.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-muted-foreground">
                  #{String(report.report_number).padStart(3, '0')}
                </span>
                <Badge variant="outline">
                  {reportTypeLabels[report.report_type] || report.report_type}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground truncate">
                {report.title}
              </h3>
            </div>
            <PhotoReportStatusBadge status={report.status} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {report.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {report.description}
            </p>
          )}

          {/* Report Period */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(report.period_start), 'MMM d')} -{' '}
              {format(new Date(report.period_end), 'MMM d, yyyy')}
            </span>
          </div>

          {/* Content summary */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {report.location_ids && report.location_ids.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{report.location_ids.length} locations</span>
              </div>
            )}
            {report.photo_ids && report.photo_ids.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5" />
                <span>{report.photo_ids.length} photos</span>
              </div>
            )}
            {report.comparison_ids && report.comparison_ids.length > 0 && (
              <div className="flex items-center gap-1.5">
                <GitCompare className="h-3.5 w-3.5" />
                <span>{report.comparison_ids.length} comparisons</span>
              </div>
            )}
          </div>

          {/* Executive Summary preview */}
          {report.executive_summary && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {report.executive_summary}
              </p>
            </div>
          )}

          {/* Distribution info */}
          {report.distributed_at && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  Distributed on {format(new Date(report.distributed_at), 'MMM d, yyyy')}
                </span>
                {report.distributed_to && (
                  <span>to {report.distributed_to.length} recipients</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
