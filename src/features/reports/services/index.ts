/**
 * Reports Services Index
 *
 * Export all report-related services.
 */

export {
  reportExportService,
  exportToPdf,
  exportToExcel,
  exportToCsv,
  exportToHtml,
  generateReport,
  downloadReport,
} from './reportExportService'
export type { ReportExportOptions, ReportExportResult } from './reportExportService'

// Standard templates
export {
  getAllStandardTemplates,
  getTemplatesByCategory,
  getTemplatesByDataSource,
  getTemplateById,
  searchTemplates,
  getTemplateCounts,
  getCategoryInfo,
  getAllTags,
  filterByTags,
  STANDARD_TEMPLATES,
} from './standardTemplates'
export type {
  StandardTemplate,
  TemplateCategory,
} from './standardTemplates'
