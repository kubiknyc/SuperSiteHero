/**
 * NCR Card Component
 *
 * Displays a summary card for a Non-Conformance Report.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NCRStatusBadge } from './NCRStatusBadge';
import { NCRSeverityBadge } from './NCRSeverityBadge';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Calendar, User, Building2 } from 'lucide-react';
import type { NCRWithDetails } from '@/types/quality-control';

interface NCRCardProps {
  ncr: NCRWithDetails;
  projectId: string;
}

export function NCRCard({ ncr, projectId }: NCRCardProps) {
  return (
    <Link to={`/projects/${projectId}/quality-control/ncr/${ncr.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-muted-foreground">
                  NCR-{String(ncr.ncr_number).padStart(4, '0')}
                </span>
                <NCRSeverityBadge severity={ncr.severity} />
              </div>
              <h3 className="font-semibold text-foreground truncate">
                {ncr.title}
              </h3>
            </div>
            <NCRStatusBadge status={ncr.status} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {ncr.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {ncr.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {ncr.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{ncr.location}</span>
              </div>
            )}
            {ncr.date_identified && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDistanceToNow(new Date(ncr.date_identified), { addSuffix: true })}</span>
              </div>
            )}
            {ncr.assigned_to_name && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{ncr.assigned_to_name}</span>
              </div>
            )}
            {ncr.responsible_party_name && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{ncr.responsible_party_name}</span>
              </div>
            )}
          </div>

          {ncr.due_date && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className={ncr.due_date < new Date().toISOString().split('T')[0] ? 'text-red-600 font-medium' : ''}>
                  {new Date(ncr.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
