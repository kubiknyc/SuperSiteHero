/**
 * Photo Progress Statistics Cards Component
 *
 * Displays photo progress statistics in card format.
 */

import { Card, CardContent } from '@/components/ui/card';
import {
  Camera,
  MapPin,
  Image,
  Star,
  GitCompare,
  FileText,
  CalendarClock,
  AlertCircle,
} from 'lucide-react';
import type { PhotoProgressStats } from '@/types/photo-progress';

interface PhotoProgressStatsCardsProps {
  stats: PhotoProgressStats;
}

export function PhotoProgressStatsCards({ stats }: PhotoProgressStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {/* Total Locations */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total_locations}</p>
              <p className="text-xs text-muted-foreground">Locations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Locations */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Camera className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active_locations}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Photos */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total_photos}</p>
              <p className="text-xs text-muted-foreground">Photos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Photos */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.featured_photos}</p>
              <p className="text-xs text-muted-foreground">Featured</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparisons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <GitCompare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total_comparisons}</p>
              <p className="text-xs text-muted-foreground">Comparisons</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
              <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total_reports}</p>
              <p className="text-xs text-muted-foreground">Reports</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos This Month */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <CalendarClock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.photos_this_month}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Due for Capture */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              stats.locations_due_for_capture > 0
                ? 'bg-red-100 dark:bg-red-900'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <AlertCircle className={`h-5 w-5 ${
                stats.locations_due_for_capture > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.locations_due_for_capture}</p>
              <p className="text-xs text-muted-foreground">Due</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
