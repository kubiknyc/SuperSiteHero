import { format } from 'date-fns';
import {
  CheckCircle,
  Clock,
  Edit,
  FileText,
  History,
  Send,
  Calendar,
  MapPin,
  Hash,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDrawingRevisions,
  useDrawingTransmittals,
} from '@/features/drawings/hooks/useDrawings';
import { DRAWING_DISCIPLINES, REVISION_TYPES, type Drawing } from '@/types/drawing';

interface DrawingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawing: Drawing | null;
  onEdit: (drawing: Drawing) => void;
}

export function DrawingDetailDialog({
  open,
  onOpenChange,
  drawing,
  onEdit,
}: DrawingDetailDialogProps) {
  const { data: revisions, isLoading: revisionsLoading } = useDrawingRevisions(
    drawing?.id
  );
  const { data: transmittals, isLoading: transmittalsLoading } = useDrawingTransmittals(
    drawing?.id
  );

  if (!drawing) {return null;}

  const disciplineInfo = DRAWING_DISCIPLINES.find((d) => d.value === drawing.discipline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {drawing.drawingNumber}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{drawing.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {drawing.isIssuedForConstruction ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  IFC
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => onEdit(drawing)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drawing Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Discipline</p>
              <Badge variant="outline" className="mt-1">
                {disciplineInfo?.prefix} - {disciplineInfo?.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Revision</p>
              <p className="font-mono font-medium mt-1">
                {drawing.currentRevision || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revision Date</p>
              <p className="mt-1">
                {drawing.currentRevisionDate
                  ? format(new Date(drawing.currentRevisionDate), 'MMM d, yyyy')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sheet Size</p>
              <p className="mt-1">{drawing.sheetSize || '-'}</p>
            </div>
          </div>

          {drawing.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p>{drawing.description}</p>
            </div>
          )}

          {drawing.specSection && (
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Spec Section:</span>
              <span className="font-mono">{drawing.specSection}</span>
            </div>
          )}

          {drawing.ifcDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">IFC Date:</span>
              <span>{format(new Date(drawing.ifcDate), 'MMM d, yyyy')}</span>
            </div>
          )}

          <Separator />

          {/* Tabs for Revisions and Transmittals */}
          <Tabs defaultValue="revisions">
            <TabsList>
              <TabsTrigger value="revisions" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                Revisions ({revisions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="transmittals" className="flex items-center gap-1">
                <Send className="h-4 w-4" />
                Transmittals ({transmittals?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revisions" className="mt-4">
              {revisionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : revisions && revisions.length > 0 ? (
                <div className="space-y-3">
                  {revisions.map((revision) => {
                    const revisionTypeInfo = REVISION_TYPES.find(
                      (t) => t.value === revision.revisionType
                    );
                    return (
                      <Card key={revision.id}>
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className="text-lg font-mono font-bold">
                                  {revision.revision}
                                </p>
                                {revision.isCurrent && (
                                  <Badge variant="default" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {format(new Date(revision.revisionDate), 'MMM d, yyyy')}
                                </p>
                                {revision.revisionDescription && (
                                  <p className="text-sm text-muted-foreground">
                                    {revision.revisionDescription}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {revisionTypeInfo?.label || revision.revisionType}
                                  </Badge>
                                  {revision.sourceReference && (
                                    <span className="text-xs text-muted-foreground">
                                      Ref: {revision.sourceReference}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {revision.fileUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={revision.fileUrl} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            )}
                          </div>
                          {revision.isSuperseded && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Superseded on{' '}
                              {revision.supersededDate
                                ? format(new Date(revision.supersededDate), 'MMM d, yyyy')
                                : 'unknown date'}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No revisions recorded</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transmittals" className="mt-4">
              {transmittalsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : transmittals && transmittals.length > 0 ? (
                <div className="space-y-3">
                  {transmittals.map((transmittal) => (
                    <Card key={transmittal.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {transmittal.transmittalNumber || 'Manual Distribution'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transmittal.transmittalDate), 'MMM d, yyyy')}
                            </p>
                            {transmittal.recipientCompany && (
                              <p className="text-sm mt-1">
                                To: {transmittal.recipientCompany}
                                {transmittal.recipientName && ` (${transmittal.recipientName})`}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {transmittal.acknowledged ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {transmittal.copiesSent > 1 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {transmittal.copiesSent} copies
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transmittals recorded</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
