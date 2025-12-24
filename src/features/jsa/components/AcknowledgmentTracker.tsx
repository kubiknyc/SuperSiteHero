/**
 * AcknowledgmentTracker Component
 * Manages worker acknowledgments for JSAs with signature capture
 */

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  PenLine,
  X,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useAddJSAAcknowledgment,
  useRemoveJSAAcknowledgment,
} from '../hooks/useJSA';
import type { JSAAcknowledgment, CreateJSAAcknowledgmentDTO } from '@/types/jsa';

interface AcknowledgmentTrackerProps {
  jsaId: string;
  acknowledgments: JSAAcknowledgment[];
  disabled?: boolean;
  compact?: boolean;
}

export function AcknowledgmentTracker({
  jsaId,
  acknowledgments,
  disabled,
  compact,
}: AcknowledgmentTrackerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const addMutation = useAddJSAAcknowledgment();
  const removeMutation = useRemoveJSAAcknowledgment();

  const handleAdd = async (data: Omit<CreateJSAAcknowledgmentDTO, 'jsa_id'>) => {
    try {
      await addMutation.mutateAsync({
        jsa_id: jsaId,
        ...data,
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to add acknowledgment:', error);
    }
  };

  const handleRemove = async (acknowledgmentId: string) => {
    if (!confirm('Remove this worker acknowledgment?')) {return;}

    try {
      await removeMutation.mutateAsync({
        acknowledgmentId,
        jsaId,
      });
    } catch (error) {
      console.error('Failed to remove acknowledgment:', error);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {acknowledgments.length} Workers Acknowledged
            </span>
          </div>
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {acknowledgments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {acknowledgments.map((ack) => (
              <TooltipProvider key={ack.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="cursor-default flex items-center gap-1"
                    >
                      {ack.has_questions && (
                        <HelpCircle className="h-3 w-3 text-warning" />
                      )}
                      {ack.worker_name}
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(ack.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p>{ack.worker_company || 'No company'}</p>
                      <p>{format(new Date(ack.acknowledged_at), 'PPp')}</p>
                      {ack.worker_trade && <p>Trade: {ack.worker_trade}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        <AddAcknowledgmentDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSubmit={handleAdd}
          isLoading={addMutation.isPending}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Worker Acknowledgments
            </CardTitle>
            <CardDescription>
              {acknowledgments.length} workers have acknowledged this JSA
            </CardDescription>
          </div>
          {!disabled && (
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Worker
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {acknowledgments.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No workers have acknowledged this JSA yet.
            </p>
            {!disabled && (
              <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Worker
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  {!disabled && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {acknowledgments.map((ack) => (
                  <TableRow key={ack.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ack.signature_data ? (
                          <PenLine className="h-4 w-4 text-success" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">{ack.worker_name}</span>
                        {ack.worker_badge_number && (
                          <Badge variant="outline" className="text-xs">
                            #{ack.worker_badge_number}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ack.worker_company || '-'}</TableCell>
                    <TableCell>{ack.worker_trade || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(ack.acknowledged_at), 'h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {ack.understands_hazards ? (
                          <Badge
                            variant="outline"
                            className="bg-success-light text-success-dark border-green-200"
                          >
                            Understood
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-warning-light text-yellow-700 border-yellow-200"
                          >
                            Not confirmed
                          </Badge>
                        )}
                        {ack.has_questions && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-warning" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-[200px]">
                                  {ack.questions_notes || 'Has questions'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    {!disabled && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(ack.id)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <AddAcknowledgmentDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSubmit={handleAdd}
          isLoading={addMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

interface AddAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<CreateJSAAcknowledgmentDTO, 'jsa_id'>) => Promise<void>;
  isLoading: boolean;
}

function AddAcknowledgmentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddAcknowledgmentDialogProps) {
  const [workerName, setWorkerName] = useState('');
  const [workerCompany, setWorkerCompany] = useState('');
  const [workerTrade, setWorkerTrade] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [understandsHazards, setUnderstandsHazards] = useState(true);
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questionsNotes, setQuestionsNotes] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setWorkerName('');
      setWorkerCompany('');
      setWorkerTrade('');
      setBadgeNumber('');
      setUnderstandsHazards(true);
      setHasQuestions(false);
      setQuestionsNotes('');
      setSignatureData(null);
      setHasSignature(false);
    }
  }, [open]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [open]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {return;}

    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureData(canvas.toDataURL('image/png'));
      }
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!workerName.trim()) {return;}

    await onSubmit({
      worker_name: workerName.trim(),
      worker_company: workerCompany.trim() || undefined,
      worker_trade: workerTrade.trim() || undefined,
      worker_badge_number: badgeNumber.trim() || undefined,
      understands_hazards: understandsHazards,
      has_questions: hasQuestions,
      questions_notes: hasQuestions ? questionsNotes.trim() : undefined,
      signature_data: signatureData || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Worker Acknowledgment
          </DialogTitle>
          <DialogDescription>
            Record worker acknowledgment of JSA hazards and controls
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="worker-name">
                Worker Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="worker-name"
                placeholder="Full name"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-company">Company</Label>
              <Input
                id="worker-company"
                placeholder="Employer"
                value={workerCompany}
                onChange={(e) => setWorkerCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="worker-trade">Trade</Label>
              <Input
                id="worker-trade"
                placeholder="e.g., Electrician, Carpenter"
                value={workerTrade}
                onChange={(e) => setWorkerTrade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge">Badge Number</Label>
              <Input
                id="badge"
                placeholder="ID or badge #"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="understands"
                checked={understandsHazards}
                onCheckedChange={(checked) =>
                  setUnderstandsHazards(checked === true)
                }
              />
              <div className="space-y-1">
                <label
                  htmlFor="understands"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  I understand the hazards and controls
                </label>
                <p className="text-xs text-muted-foreground">
                  Worker confirms understanding of identified hazards
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="has-questions"
                checked={hasQuestions}
                onCheckedChange={(checked) => setHasQuestions(checked === true)}
              />
              <div className="space-y-1">
                <label
                  htmlFor="has-questions"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  I have questions or concerns
                </label>
                <p className="text-xs text-muted-foreground">
                  Check if worker has additional questions
                </p>
              </div>
            </div>

            {hasQuestions && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="questions">Questions/Concerns</Label>
                <Textarea
                  id="questions"
                  placeholder="Describe questions or concerns..."
                  value={questionsNotes}
                  onChange={(e) => setQuestionsNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Signature Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signature (Optional)</Label>
              {hasSignature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="border rounded-md p-1 bg-card">
              <canvas
                ref={canvasRef}
                width={450}
                height={100}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Draw signature using mouse or touch
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!workerName.trim() || isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Acknowledgment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AcknowledgmentTracker;
