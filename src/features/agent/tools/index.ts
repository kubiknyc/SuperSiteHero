/**
 * Agent Tools Index
 * Export all agent tools and auto-register them
 */

// Tool registry
export { toolRegistry, createTool } from './registry'
export type { Tool, ToolContext, ToolResult, ToolCategory } from './registry'

// Document tools
export { classifyDocumentTool } from './document/classify'

// Search tools
export { semanticSearchTool } from './search/semantic-search'

// RFI/Submittal tools
export { routeRFITool } from './rfi-submittal/route-rfi'
export { draftRFITool } from './rfi-submittal/draft-rfi'

// Report tools
export { summarizeDailyReportTool } from './reports/summarize-daily'

// Change Order tools
export { analyzeChangeOrderImpactTool } from './change-orders/analyze-impact'

// Punch List tools
export { generatePunchItemsTool } from './punch-list/generate-punch-items'

// Meeting tools
export { extractActionItemsTool } from './meetings/extract-action-items'

// Project tools
export { projectStatusSummaryTool } from './project/status-summary'
export { assessRiskTool } from './project/assess-risk'

// Weather tools
export { weatherForecastTool } from './weather/forecast'

// Schedule tools
export { analyzeScheduleDelaysTool } from './schedule/analyze-delays'

// Safety tools
export { generateSafetyChecklistTool } from './safety/generate-checklist'

// Cost tools
export { costEstimateTool } from './cost/estimate'

// Submittal tools
export { trackSubmittalsTool } from './submittals/track-submittals'

// Contractor tools
export { evaluateContractorPerformanceTool } from './contractors/evaluate-performance'

// ============================================================================
// Initialize Tools
// ============================================================================

/**
 * Initialize all built-in tools
 * This is called once when the agent module loads
 */
export function initializeTools(): void {
  // Tools are auto-registered via createTool
  // This function ensures imports are executed
  console.log('[Agent] Tools initialized:', {
    document: ['classify_document'],
    search: ['semantic_search'],
    rfi_submittal: ['route_rfi', 'draft_rfi'],
    reports: ['summarize_daily_report'],
    change_orders: ['analyze_change_order_impact'],
    punch_list: ['generate_punch_items'],
    meetings: ['extract_action_items'],
    project: ['get_project_status', 'assess_project_risk'],
    weather: ['get_weather_forecast'],
    schedule: ['analyze_schedule_delays'],
    safety: ['generate_safety_checklist'],
    cost: ['estimate_cost'],
    submittals: ['track_submittals'],
    contractors: ['evaluate_contractor_performance']
  })
}
