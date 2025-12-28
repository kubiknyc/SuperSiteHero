import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/lib/notifications/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateDrawing,
  useUpdateDrawing,
} from '@/features/drawings/hooks/useDrawings';
import {
  DRAWING_DISCIPLINES,
  SHEET_SIZES,
  type Drawing,
  type DrawingDiscipline,
  type SheetSize,
} from '@/types/drawing';

const formSchema = z.object({
  drawingNumber: z.string().min(1, 'Drawing number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  discipline: z.enum([
    'architectural',
    'structural',
    'mechanical',
    'electrical',
    'plumbing',
    'civil',
    'landscape',
    'fire_protection',
    'other',
  ] as const),
  subdiscipline: z.string().optional(),
  sheetSize: z.string().optional(),
  specSection: z.string().optional(),
  isIssuedForConstruction: z.boolean().default(false),
  ifcDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DrawingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  drawing?: Drawing | null;
}

export function DrawingFormDialog({
  open,
  onOpenChange,
  projectId,
  drawing,
}: DrawingFormDialogProps) {
  const { success, error: showError } = useToast();
  const { userProfile } = useAuth();
  const isEditing = !!drawing;

  const createDrawing = useCreateDrawing();
  const updateDrawing = useUpdateDrawing();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      drawingNumber: '',
      title: '',
      description: '',
      discipline: 'architectural',
      subdiscipline: '',
      sheetSize: 'D',
      specSection: '',
      isIssuedForConstruction: false,
      ifcDate: '',
    },
  });

  // Reset form when drawing changes
  useEffect(() => {
    if (drawing) {
      form.reset({
        drawingNumber: drawing.drawingNumber,
        title: drawing.title,
        description: drawing.description || '',
        discipline: drawing.discipline,
        subdiscipline: drawing.subdiscipline || '',
        sheetSize: drawing.sheetSize || 'D',
        specSection: drawing.specSection || '',
        isIssuedForConstruction: drawing.isIssuedForConstruction,
        ifcDate: drawing.ifcDate || '',
      });
    } else {
      form.reset({
        drawingNumber: '',
        title: '',
        description: '',
        discipline: 'architectural',
        subdiscipline: '',
        sheetSize: 'D',
        specSection: '',
        isIssuedForConstruction: false,
        ifcDate: '',
      });
    }
  }, [drawing, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && drawing) {
        await updateDrawing.mutateAsync({
          id: drawing.id,
          updates: {
            drawingNumber: data.drawingNumber,
            title: data.title,
            description: data.description || null,
            discipline: data.discipline,
            subdiscipline: data.subdiscipline || null,
            sheetSize: (data.sheetSize as SheetSize) || null,
            specSection: data.specSection || null,
            isIssuedForConstruction: data.isIssuedForConstruction,
            ifcDate: data.ifcDate || null,
          },
        });
        success('Drawing updated', `${data.drawingNumber} has been updated`);
      } else {
        await createDrawing.mutateAsync({
          companyId: userProfile?.company_id || '',
          projectId,
          drawingNumber: data.drawingNumber,
          title: data.title,
          description: data.description,
          discipline: data.discipline,
          subdiscipline: data.subdiscipline,
          sheetSize: data.sheetSize as SheetSize,
          specSection: data.specSection,
          isIssuedForConstruction: data.isIssuedForConstruction,
          ifcDate: data.ifcDate,
        });
        success('Drawing created', `${data.drawingNumber} has been added to the register`);
      }
      onOpenChange(false);
    } catch (_err) {
      showError('Error', isEditing ? 'Failed to update drawing' : 'Failed to create drawing');
    }
  };

  const isPending = createDrawing.isPending || updateDrawing.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Drawing' : 'Add Drawing'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="drawingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drawing Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="A-101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discipline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discipline *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select discipline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DRAWING_DISCIPLINES.map((discipline) => (
                          <SelectItem key={discipline.value} value={discipline.value}>
                            {discipline.prefix} - {discipline.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="First Floor Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this drawing..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subdiscipline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdiscipline</FormLabel>
                    <FormControl>
                      <Input placeholder="Floor Plans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sheetSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SHEET_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specSection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spec Section</FormLabel>
                  <FormControl>
                    <Input placeholder="03 30 00" {...field} />
                  </FormControl>
                  <FormDescription>CSI MasterFormat section reference</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-4 pt-2">
              <FormField
                control={form.control}
                name="isIssuedForConstruction"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">
                      Issued for Construction
                    </FormLabel>
                  </FormItem>
                )}
              />

              {form.watch('isIssuedForConstruction') && (
                <FormField
                  control={form.control}
                  name="ifcDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Drawing'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
