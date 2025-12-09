import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  Clock,
  Edit,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
  FileText,
  History,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/notifications/ToastContext';
import {
  useDeleteDrawing,
  useMarkDrawingIFC,
  useBulkMarkIFC,
} from '@/features/drawings/hooks/useDrawings';
import { DRAWING_DISCIPLINES, type Drawing, type DrawingDiscipline } from '@/types/drawing';

interface DrawingTableProps {
  drawings: Drawing[];
  onDrawingClick: (drawing: Drawing) => void;
  onEditClick: (drawing: Drawing) => void;
}

export function DrawingTable({ drawings, onDrawingClick, onEditClick }: DrawingTableProps) {
  const { success, error: showError } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDrawing, setDeleteDrawing] = useState<Drawing | null>(null);

  const deleteDrawingMutation = useDeleteDrawing();
  const markIFCMutation = useMarkDrawingIFC();
  const bulkMarkIFCMutation = useBulkMarkIFC();

  const getDisciplineInfo = (discipline: DrawingDiscipline) => {
    return DRAWING_DISCIPLINES.find((d) => d.value === discipline);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(drawings.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleDelete = async () => {
    if (!deleteDrawing) return;
    try {
      await deleteDrawingMutation.mutateAsync(deleteDrawing.id);
      success('Drawing deleted', `${deleteDrawing.drawingNumber} has been deleted`);
      setDeleteDrawing(null);
    } catch (err) {
      showError('Error', 'Failed to delete drawing');
    }
  };

  const handleMarkIFC = async (drawing: Drawing) => {
    try {
      await markIFCMutation.mutateAsync({ id: drawing.id });
      success('Drawing marked IFC', `${drawing.drawingNumber} is now Issued for Construction`);
    } catch (err) {
      showError('Error', 'Failed to mark drawing as IFC');
    }
  };

  const handleBulkMarkIFC = async () => {
    if (selectedIds.size === 0) return;
    try {
      await bulkMarkIFCMutation.mutateAsync({ drawingIds: Array.from(selectedIds) });
      success('Drawings marked IFC', `${selectedIds.size} drawings are now Issued for Construction`);
      setSelectedIds(new Set());
    } catch (err) {
      showError('Error', 'Failed to mark drawings as IFC');
    }
  };

  const allSelected = drawings.length > 0 && selectedIds.size === drawings.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < drawings.length;

  return (
    <>
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkMarkIFC}
            disabled={bulkMarkIFCMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark IFC
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
              <TableHead className="w-[100px]">Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[100px]">Discipline</TableHead>
              <TableHead className="w-[80px]">Revision</TableHead>
              <TableHead className="w-[100px]">Rev. Date</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drawings.map((drawing) => {
              const disciplineInfo = getDisciplineInfo(drawing.discipline);
              return (
                <TableRow
                  key={drawing.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onDrawingClick(drawing)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(drawing.id)}
                      onCheckedChange={(checked) => handleSelectOne(drawing.id, !!checked)}
                      aria-label={`Select ${drawing.drawingNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {drawing.drawingNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[300px]">{drawing.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {disciplineInfo?.prefix || drawing.discipline.charAt(0).toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {drawing.currentRevision || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {drawing.currentRevisionDate
                      ? format(new Date(drawing.currentRevisionDate), 'MM/dd/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDrawingClick(drawing)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditClick(drawing)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="h-4 w-4 mr-2" />
                          Revision History
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {!drawing.isIssuedForConstruction && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleMarkIFC(drawing)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as IFC
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDrawing(drawing)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDrawing} onOpenChange={() => setDeleteDrawing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drawing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete drawing {deleteDrawing?.drawingNumber}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
