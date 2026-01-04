// File: /src/components/ui/index.ts
// Export all UI components for easy importing

export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'

export { Input, inputVariants } from './input'
export type { InputProps } from './input'

export { Label } from './label'
export type { LabelProps } from './label'

export { Textarea } from './textarea'
export type { TextareaProps } from './textarea'

export {
  Select,
  NativeSelect,
  nativeSelectVariants,
  RadixSelect,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './select'
export type { SelectProps } from './select'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card'

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

export { Badge, badgeVariants } from './badge'
export type { BadgeProps } from './badge'

export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider,
  useToast,
} from './toast'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'

export { Alert, AlertTitle, AlertDescription } from './alert'

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog'

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './tabs'

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip'

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from './popover'

export { Checkbox, checkboxVariants } from './checkbox'
export type { CheckboxProps } from './checkbox'

export { Slider } from './slider'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu'

export {
  CSISpecPicker,
  CSI_DIVISIONS,
  CSI_SPEC_SECTIONS,
  getSpecSectionTitle,
  getDivisionTitle,
} from './csi-spec-picker'

export { ScrollArea, ScrollBar } from './scroll-area'

export { Separator } from './separator'

// Touch-friendly components
export {
  SwipeableListItem,
  createCompleteAction,
  createEditAction,
  createDeleteAction,
  createCancelAction,
} from './swipeable-list-item'
export type { SwipeableListItemProps, SwipeAction } from './swipeable-list-item'

export { PullToRefresh, RefreshableList } from './pull-to-refresh'
export type { PullToRefreshProps, RefreshableListProps } from './pull-to-refresh'

// Theme components
export {
  ThemeToggle,
  ThemeSwitch,
  ThemeSelector,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from '../ThemeToggle'

// Tablet-optimized components
export {
  TabletCard,
  TabletCardGrid,
} from './tablet-card'
export type { TabletCardProps, TabletCardGridProps } from './tablet-card'

export {
  TabletForm,
  TabletFormField,
  TabletFormSection,
  TabletFormRow,
  TabletFormActions,
  TabletInput,
} from './tablet-form'
export type {
  TabletFormProps,
  TabletFormFieldProps,
  TabletFormSectionProps,
  TabletFormRowProps,
  TabletFormActionsProps,
  TabletInputProps,
} from './tablet-form'

export {
  TabletTable,
  TabletTableHeader,
  TabletTableBody,
  TabletTableRow,
  TabletTableHead,
  TabletTableCell,
  TabletTableEmpty,
} from './tablet-table'
export type {
  TabletTableProps,
  TabletTableHeaderProps,
  TabletTableRowProps,
  TabletTableHeadProps,
  TabletTableCellProps,
  TabletTableEmptyProps,
} from './tablet-table'

// Command Palette and Keyboard Shortcuts
export { CommandPalette, useCommandPalette } from './command-palette'
export type { default as CommandPaletteProps } from './command-palette'

export {
  KeyboardShortcutsHelp,
  QuickShortcut,
  ShortcutHint,
} from './keyboard-shortcuts-help'

export {
  KeyboardShortcutsProvider,
  useKeyboardShortcutsContext,
  CommandPaletteButton,
  ShortcutsHelpButton,
} from './keyboard-shortcuts-provider'

// Collapsible
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'
