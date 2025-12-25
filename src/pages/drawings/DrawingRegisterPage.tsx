import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Filter,
  Download,
  Upload,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DrawingTable } from '@/features/drawings/components/DrawingTable';
import { DrawingFormDialog } from '@/features/drawings/components/DrawingFormDialog';
import { DrawingDetailDialog } from '@/features/drawings/components/DrawingDetailDialog';
import {
  useDrawings,
  useDrawingsByDisciplineSummary,
} from '@/features/drawings/hooks/useDrawings';
import { DRAWING_DISCIPLINES, type DrawingDiscipline, type Drawing } from '@/types/drawing';

export default function DrawingRegisterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<DrawingDiscipline | 'all'>('all');
  const [ifcFilter, setIfcFilter] = useState<'all' | 'ifc' | 'not_ifc'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filters = {
    discipline: disciplineFilter !== 'all' ? disciplineFilter : undefined,
    isIssuedForConstruction: ifcFilter === 'ifc' ? true : ifcFilter === 'not_ifc' ? false : undefined,
    search: search || undefined,
  };

  const { data: drawings, isLoading } = useDrawings(projectId, filters);
  const { data: disciplineSummary } = useDrawingsByDisciplineSummary(projectId);

  const totalDrawings = drawings?.length || 0;
  const ifcDrawings = drawings?.filter((d) => d.isIssuedForConstruction).length || 0;
  const pendingDrawings = totalDrawings - ifcDrawings;

  const handleDrawingClick = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
    setIsDetailOpen(true);
  };

  const handleAddDrawing = () => {
    setSelectedDrawing(null);
    setIsFormOpen(true);
  };

  const handleEditDrawing = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
            <FileText className="h-6 w-6" />
            Drawing Register
          </h1>
          <p className="text-muted-foreground">
            Track and manage construction drawings and revisions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddDrawing}>
            <Plus className="h-4 w-4 mr-2" />
            Add Drawing
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Drawings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrawings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              Issued for Construction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{ifcDrawings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4 text-warning" />
              Pending IFC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingDrawings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disciplines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disciplineSummary?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Discipline Summary */}
      {disciplineSummary && disciplineSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {disciplineSummary.map((summary) => {
            const discipline = DRAWING_DISCIPLINES.find((d) => d.value === summary.discipline);
            return (
              <Badge
                key={summary.discipline}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => setDisciplineFilter(summary.discipline)}
              >
                {discipline?.prefix || summary.discipline.charAt(0).toUpperCase()}: {summary.totalDrawings}
                {summary.ifcDrawings > 0 && (
                  <span className="ml-1 text-success">({summary.ifcDrawings} IFC)</span>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drawings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={disciplineFilter}
          onValueChange={(value) => setDisciplineFilter(value as DrawingDiscipline | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Discipline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disciplines</SelectItem>
            {DRAWING_DISCIPLINES.map((discipline) => (
              <SelectItem key={discipline.value} value={discipline.value}>
                {discipline.prefix} - {discipline.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={ifcFilter}
          onValueChange={(value) => setIfcFilter(value as 'all' | 'ifc' | 'not_ifc')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="IFC Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ifc">Issued for Construction</SelectItem>
            <SelectItem value="not_ifc">Not Yet IFC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drawing Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : drawings && drawings.length > 0 ? (
        <DrawingTable
          drawings={drawings}
          onDrawingClick={handleDrawingClick}
          onEditClick={handleEditDrawing}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium heading-subsection">No drawings found</h3>
            <p className="text-muted-foreground mb-4">
              {search || disciplineFilter !== 'all' || ifcFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first drawing'}
            </p>
            {!search && disciplineFilter === 'all' && ifcFilter === 'all' && (
              <Button onClick={handleAddDrawing}>
                <Plus className="h-4 w-4 mr-2" />
                Add Drawing
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <DrawingFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        projectId={projectId || ''}
        drawing={selectedDrawing}
      />

      {/* Detail Dialog */}
      <DrawingDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        drawing={selectedDrawing}
        onEdit={handleEditDrawing}
      />
    </div>
  );
}
