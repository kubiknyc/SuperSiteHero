/**
 * Agent Tools Index
 * Export all agent tools and auto-register them
 */

// Tool registry
export { toolRegistry, createTool } from './registry'
export type { Tool, ToolContext, ToolResult, ToolCategory } from './registry'

// Document tools
export { classifyDocumentTool } from './document/classify'
export { compareRevisionsTool } from './document/compare-revisions'

// Search tools
export { semanticSearchTool } from './search/semantic-search'

// RFI/Submittal tools
export { routeRFITool } from './rfi-submittal/route-rfi'
export { draftRFITool } from './rfi-submittal/draft-rfi'

// Report tools
export { summarizeDailyReportTool } from './reports/summarize-daily'
export { generateDailyLogTool } from './reports/generate-daily-log'

// Change Order tools
export { analyzeChangeOrderImpactTool } from './change-orders/analyze-impact'

// Punch List tools
export { generatePunchItemsTool } from './punch-list/generate-punch-items'

// Meeting tools
export { extractActionItemsTool } from './meetings/extract-action-items'
export { generateMeetingMinutesTool } from './meetings/generate-minutes'

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
export { analyzeBudgetVarianceTool } from './cost/analyze-budget-variance'

// Submittal tools
export { trackSubmittalsTool } from './submittals/track-submittals'

// Contractor tools
export { evaluateContractorPerformanceTool } from './contractors/evaluate-performance'

// Inspection tools
export { scheduleInspectionsTool } from './inspections/schedule-inspections'

// Closeout tools
export { generateCloseoutChecklistTool } from './closeout/generate-checklist'

// Warranty tools
export { trackWarrantiesTool } from './warranty/track-warranties'

// Quality tools
export { analyzeDeficienciesTool } from './quality/analyze-deficiencies'

// Procurement tools
export { trackMaterialsTool } from './procurement/track-materials'

// Communication tools
export { draftLetterTool } from './communication/draft-letter'

// Photo tools
export { analyzeProgressPhotosTool } from './photos/analyze-progress'

// Labor tools
export { analyzeLaborProductivityTool } from './labor/analyze-productivity'

// ============================================================================
// Field Operations Tools (Daily Reports Enhancement)
// ============================================================================
export { autoPopulateWeatherTool } from './reports/auto-populate-weather'
export { suggestActivitiesTool } from './reports/suggest-activities'
export { prefillReportTool } from './reports/prefill-report'
export { voiceToStructuredTool } from './reports/voice-to-structured'

// ============================================================================
// Field Operations Tools (Inspection Intelligence)
// ============================================================================
export { prepareInspectionTool } from './inspections/prepare-inspection'
export { predictInspectionResultTool } from './inspections/predict-result'
export { scheduleInspectionCorrelationTool } from './inspections/schedule-correlation'

// ============================================================================
// Field Operations Tools (Safety Intelligence)
// ============================================================================
export { createSafetyObservationTool } from './safety/create-observation'
export { analyzeIncidentPatternsTool } from './safety/analyze-incident-patterns'
export { suggestToolboxTopicsTool } from './safety/suggest-toolbox-topics'
export { nearMissTrendsTool } from './safety/near-miss-trends'

// ============================================================================
// Field Operations Tools (Schedule Intelligence)
// ============================================================================
export { identifyScheduleRisksTool } from './schedule/identify-risks'
export { generateLookaheadTool } from './schedule/generate-lookahead'
export { detectResourceConflictsTool } from './schedule/detect-resource-conflicts'
export { predictWeatherImpactTool } from './schedule/predict-weather-impact'

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
    document: ['classify_document', 'compare_document_revisions'],
    search: ['semantic_search'],
    rfi_submittal: ['route_rfi', 'draft_rfi'],
    reports: ['summarize_daily_report', 'generate_daily_log', 'auto_populate_weather', 'suggest_activities', 'prefill_report', 'voice_to_structured'],
    change_orders: ['analyze_change_order_impact'],
    punch_list: ['generate_punch_items'],
    meetings: ['extract_action_items', 'generate_meeting_minutes'],
    project: ['get_project_status', 'assess_project_risk'],
    weather: ['get_weather_forecast'],
    schedule: ['analyze_schedule_delays', 'identify_schedule_risks', 'generate_lookahead', 'detect_resource_conflicts', 'predict_weather_impact'],
    safety: ['generate_safety_checklist', 'create_safety_observation', 'analyze_incident_patterns', 'suggest_toolbox_topics', 'near_miss_trends'],
    cost: ['estimate_cost', 'analyze_budget_variance'],
    submittals: ['track_submittals'],
    contractors: ['evaluate_contractor_performance'],
    inspections: ['schedule_inspections', 'prepare_inspection', 'predict_inspection_result', 'schedule_inspection_correlation'],
    closeout: ['generate_closeout_checklist'],
    warranty: ['track_warranties'],
    quality: ['analyze_quality_deficiencies'],
    procurement: ['track_materials'],
    communication: ['draft_construction_letter'],
    photos: ['analyze_progress_photos'],
    labor: ['analyze_labor_productivity']
  })
}
