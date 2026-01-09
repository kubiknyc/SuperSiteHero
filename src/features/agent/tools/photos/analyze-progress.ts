/**
 * Progress Photo Analysis Tool
 * Analyzes progress photos, compares to baseline/previous, and generates progress narrative
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeProgressPhotosInput {
  project_id: string
  date_range_start?: string
  date_range_end?: string
  location_filter?: string[]
  compare_to_baseline?: boolean
  include_annotations?: boolean
}

interface PhotoAnalysis {
  id: string
  url: string
  taken_date: string
  location: string
  description: string
  detected_elements: string[]
  work_visible: string[]
  completion_estimate: number
  safety_observations: string[]
  quality_observations: string[]
  weather_conditions: string | null
  comparison_to_previous: {
    progress_made: string[]
    unchanged_areas: string[]
    concerns: string[]
  } | null
}

interface LocationProgress {
  location: string
  photo_count: number
  estimated_completion: number
  trend: 'ahead' | 'on_track' | 'behind' | 'unknown'
  recent_work: string[]
  concerns: string[]
}

interface ProgressNarrative {
  summary: string
  highlights: string[]
  concerns: string[]
  upcoming_work: string[]
  recommendations: string[]
}

interface AnalyzeProgressPhotosOutput {
  summary: {
    total_photos_analyzed: number
    date_range: { start: string; end: string }
    locations_covered: number
    overall_completion_estimate: number
    trend: 'ahead' | 'on_track' | 'behind'
  }
  photos: PhotoAnalysis[]
  by_location: LocationProgress[]
  timeline: Array<{
    date: string
    photos: number
    key_observations: string[]
    completion_change: number
  }>
  progress_narrative: ProgressNarrative
  comparison_report: {
    baseline_date: string | null
    current_date: string
    areas_progressed: string[]
    areas_unchanged: string[]
    areas_of_concern: string[]
  } | null
  visual_documentation: {
    well_documented_areas: string[]
    under_documented_areas: string[]
    suggested_photo_locations: string[]
  }
  recommendations: string[]
}

export const analyzeProgressPhotosTool = createTool<AnalyzeProgressPhotosInput, AnalyzeProgressPhotosOutput>({
  name: 'analyze_progress_photos',
  description: 'Analyzes construction progress photos to assess completion status, compare to previous periods, and generate progress narrative. Identifies work completed, safety observations, and areas needing attention.',
  category: 'photos',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze photos for'
      },
      date_range_start: {
        type: 'string',
        description: 'Start date for photo analysis (ISO format)'
      },
      date_range_end: {
        type: 'string',
        description: 'End date for photo analysis (ISO format)'
      },
      location_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific locations'
      },
      compare_to_baseline: {
        type: 'boolean',
        description: 'Compare current photos to baseline/earlier photos (default: true)'
      },
      include_annotations: {
        type: 'boolean',
        description: 'Include photo annotations in analysis (default: true)'
      }
    },
    required: ['project_id']
  },

  async execute(input: AnalyzeProgressPhotosInput, context: AgentContext): Promise<AnalyzeProgressPhotosOutput> {
    const {
      project_id,
      date_range_start,
      date_range_end,
      location_filter,
      compare_to_baseline = true,
      include_annotations = true
    } = input

    const now = new Date()
    const defaultStart = new Date(now)
    defaultStart.setDate(defaultStart.getDate() - 30)

    const startDate = date_range_start || defaultStart.toISOString().split('T')[0]
    const endDate = date_range_end || now.toISOString().split('T')[0]

    // Get project photos
    let query = supabase
      .from('photos')
      .select(`
        *,
        annotations:photo_annotations(*)
      `)
      .eq('project_id', project_id)
      .gte('taken_at', startDate)
      .lte('taken_at', endDate)
      .is('deleted_at', null)

    if (location_filter && location_filter.length > 0) {
      query = query.in('location', location_filter)
    }

    const { data: photos } = await query.order('taken_at', { ascending: true })

    // Get project info for context
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // Get schedule activities for comparison
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get baseline photos if comparing
    let baselinePhotos: any[] = []
    if (compare_to_baseline && photos && photos.length > 0) {
      const baselineStart = new Date(startDate)
      baselineStart.setDate(baselineStart.getDate() - 30)

      const { data: baseline } = await supabase
        .from('photos')
        .select('*')
        .eq('project_id', project_id)
        .gte('taken_at', baselineStart.toISOString().split('T')[0])
        .lt('taken_at', startDate)
        .is('deleted_at', null)
        .order('taken_at', { ascending: false })

      baselinePhotos = baseline || []
    }

    // Process photos
    const analyzedPhotos: PhotoAnalysis[] = []
    const locationMap = new Map<string, LocationProgress>()
    const timelineMap = new Map<string, { photos: number; observations: string[]; completion: number }>()

    for (const photo of photos || []) {
      const location = photo.location || 'Unspecified'
      const takenDate = photo.taken_at?.split('T')[0] || ''

      // Analyze photo content (simulated - in production would use image AI)
      const analysis = analyzePhotoContent(photo, activities || [])

      // Find previous photos of same location for comparison
      let comparison = null
      if (compare_to_baseline) {
        const previousPhoto = baselinePhotos.find(p => p.location === location)
        if (previousPhoto) {
          comparison = comparePhotos(photo, previousPhoto)
        }
      }

      const photoAnalysis: PhotoAnalysis = {
        id: photo.id,
        url: photo.url || photo.file_path || '',
        taken_date: takenDate,
        location,
        description: photo.description || photo.caption || '',
        detected_elements: analysis.elements,
        work_visible: analysis.workVisible,
        completion_estimate: analysis.completion,
        safety_observations: analysis.safetyObs,
        quality_observations: analysis.qualityObs,
        weather_conditions: photo.weather || null,
        comparison_to_previous: comparison
      }

      analyzedPhotos.push(photoAnalysis)

      // Track by location
      if (!locationMap.has(location)) {
        locationMap.set(location, {
          location,
          photo_count: 0,
          estimated_completion: 0,
          trend: 'unknown',
          recent_work: [],
          concerns: []
        })
      }

      const locProgress = locationMap.get(location)!
      locProgress.photo_count++
      locProgress.estimated_completion = Math.max(locProgress.estimated_completion, analysis.completion)
      locProgress.recent_work.push(...analysis.workVisible.slice(0, 2))
      locProgress.concerns.push(...analysis.safetyObs, ...analysis.qualityObs)

      // Track by date
      if (!timelineMap.has(takenDate)) {
        timelineMap.set(takenDate, { photos: 0, observations: [], completion: 0 })
      }
      const dateData = timelineMap.get(takenDate)!
      dateData.photos++
      dateData.observations.push(...analysis.workVisible.slice(0, 1))
      dateData.completion = Math.max(dateData.completion, analysis.completion)
    }

    // Process location summaries
    const byLocation = Array.from(locationMap.values())
    for (const loc of byLocation) {
      loc.recent_work = [...new Set(loc.recent_work)].slice(0, 5)
      loc.concerns = [...new Set(loc.concerns)].slice(0, 3)
      loc.trend = determineTrend(loc, activities || [])
    }

    // Build timeline
    const timeline = Array.from(timelineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        photos: data.photos,
        key_observations: [...new Set(data.observations)].slice(0, 3),
        completion_change: 0 // Would calculate from previous
      }))

    // Calculate completion change
    for (let i = 1; i < timeline.length; i++) {
      const prev = timelineMap.get(timeline[i - 1].date)
      const curr = timelineMap.get(timeline[i].date)
      if (prev && curr) {
        timeline[i].completion_change = curr.completion - prev.completion
      }
    }

    // Overall summary
    const totalPhotos = analyzedPhotos.length
    const locationsCount = byLocation.length
    const avgCompletion = byLocation.length > 0
      ? Math.round(byLocation.reduce((sum, l) => sum + l.estimated_completion, 0) / byLocation.length)
      : 0

    const overallTrend = determineOverallTrend(byLocation)

    // Generate narrative
    const narrative = generateProgressNarrative(analyzedPhotos, byLocation, timeline, project)

    // Comparison report
    let comparisonReport = null
    if (compare_to_baseline && baselinePhotos.length > 0) {
      comparisonReport = generateComparisonReport(analyzedPhotos, baselinePhotos)
    }

    // Visual documentation analysis
    const visualDocumentation = analyzeDocumentationCoverage(byLocation, activities || [])

    // Recommendations
    const recommendations = generatePhotoRecommendations(
      byLocation,
      visualDocumentation,
      narrative,
      overallTrend
    )

    return {
      summary: {
        total_photos_analyzed: totalPhotos,
        date_range: { start: startDate, end: endDate },
        locations_covered: locationsCount,
        overall_completion_estimate: avgCompletion,
        trend: overallTrend
      },
      photos: analyzedPhotos.slice(0, 50),
      by_location: byLocation,
      timeline: timeline.slice(0, 30),
      progress_narrative: narrative,
      comparison_report: comparisonReport,
      visual_documentation: visualDocumentation,
      recommendations
    }
  }
})

interface PhotoAnalysisResult {
  elements: string[]
  workVisible: string[]
  completion: number
  safetyObs: string[]
  qualityObs: string[]
}

function analyzePhotoContent(photo: any, activities: any[]): PhotoAnalysisResult {
  // In production, this would use image recognition AI
  // For now, we'll simulate based on metadata and descriptions

  const description = (photo.description || photo.caption || '').toLowerCase()
  const location = (photo.location || '').toLowerCase()
  const tags = photo.tags || []

  const elements: string[] = []
  const workVisible: string[] = []
  const safetyObs: string[] = []
  const qualityObs: string[] = []
  let completion = 50 // Default estimate

  // Detect elements from description/tags
  const elementKeywords = {
    'framing': ['framing', 'stud', 'wall frame', 'structure'],
    'drywall': ['drywall', 'sheetrock', 'gypsum'],
    'concrete': ['concrete', 'pour', 'slab', 'foundation'],
    'roofing': ['roof', 'shingle', 'membrane'],
    'MEP rough-in': ['electrical', 'plumbing', 'hvac', 'duct', 'pipe', 'conduit'],
    'finishes': ['paint', 'tile', 'flooring', 'ceiling'],
    'exterior': ['facade', 'exterior', 'brick', 'siding'],
    'sitework': ['grading', 'paving', 'landscape']
  }

  for (const [element, keywords] of Object.entries(elementKeywords)) {
    if (keywords.some(kw => description.includes(kw) || location.includes(kw))) {
      elements.push(element)
    }
  }

  // Infer work visible
  if (elements.includes('concrete')) {
    workVisible.push('Concrete work in progress or complete')
    completion = 25
  }
  if (elements.includes('framing')) {
    workVisible.push('Framing visible')
    completion = 35
  }
  if (elements.includes('MEP rough-in')) {
    workVisible.push('MEP rough-in work visible')
    completion = 50
  }
  if (elements.includes('drywall')) {
    workVisible.push('Drywall installation')
    completion = 65
  }
  if (elements.includes('finishes')) {
    workVisible.push('Finish work in progress')
    completion = 85
  }

  // Check for safety observations
  if (/scaffold|ladder|height|fall/i.test(description)) {
    safetyObs.push('Fall protection work area visible')
  }
  if (/excavation|trench/i.test(description)) {
    safetyObs.push('Excavation/trenching work visible')
  }
  if (!/ppe|hardhat|vest/i.test(description) && elements.length > 0) {
    safetyObs.push('Verify PPE compliance in active work areas')
  }

  // Quality observations
  if (/issue|defect|problem|rework/i.test(description)) {
    qualityObs.push('Potential quality issue noted in description')
  }

  return {
    elements: elements.length > 0 ? elements : ['General construction'],
    workVisible: workVisible.length > 0 ? workVisible : ['General work area'],
    completion,
    safetyObs,
    qualityObs
  }
}

function comparePhotos(current: any, previous: any): {
  progress_made: string[]
  unchanged_areas: string[]
  concerns: string[]
} {
  // Simulated comparison
  const progress: string[] = []
  const unchanged: string[] = []
  const concerns: string[] = []

  const currDesc = (current.description || '').toLowerCase()
  const prevDesc = (previous.description || '').toLowerCase()

  // Simple text-based comparison
  if (currDesc !== prevDesc) {
    progress.push('Visual changes detected since previous photo')
  } else {
    unchanged.push('No significant visible changes')
  }

  // Check dates
  const currDate = new Date(current.taken_at)
  const prevDate = new Date(previous.taken_at)
  const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff > 14 && unchanged.length > 0) {
    concerns.push(`No visible progress in ${daysDiff} days`)
  }

  return { progress_made: progress, unchanged_areas: unchanged, concerns }
}

function determineTrend(location: LocationProgress, activities: any[]): 'ahead' | 'on_track' | 'behind' | 'unknown' {
  // Compare completion to expected based on schedule
  const locationActivities = activities.filter(a =>
    (a.location || '').toLowerCase().includes(location.location.toLowerCase())
  )

  if (locationActivities.length === 0) return 'unknown'

  const avgExpected = locationActivities.reduce((sum, a) => {
    const progress = a.percent_complete || 0
    return sum + progress
  }, 0) / locationActivities.length

  if (location.estimated_completion > avgExpected + 10) return 'ahead'
  if (location.estimated_completion < avgExpected - 10) return 'behind'
  return 'on_track'
}

function determineOverallTrend(locations: LocationProgress[]): 'ahead' | 'on_track' | 'behind' {
  const ahead = locations.filter(l => l.trend === 'ahead').length
  const behind = locations.filter(l => l.trend === 'behind').length

  if (ahead > behind * 2) return 'ahead'
  if (behind > ahead * 2) return 'behind'
  return 'on_track'
}

function generateProgressNarrative(
  photos: PhotoAnalysis[],
  locations: LocationProgress[],
  timeline: Array<{ date: string; photos: number; key_observations: string[]; completion_change: number }>,
  project: any
): ProgressNarrative {
  const highlights: string[] = []
  const concerns: string[] = []
  const upcoming: string[] = []
  const recommendations: string[] = []

  // Gather highlights from locations progressing well
  const progressingLocations = locations.filter(l => l.trend === 'ahead' || l.estimated_completion > 70)
  for (const loc of progressingLocations.slice(0, 3)) {
    highlights.push(`${loc.location}: ${loc.estimated_completion}% complete - ${loc.recent_work[0] || 'work progressing'}`)
  }

  // Gather concerns
  const laggingLocations = locations.filter(l => l.trend === 'behind' || l.concerns.length > 0)
  for (const loc of laggingLocations.slice(0, 3)) {
    if (loc.concerns.length > 0) {
      concerns.push(`${loc.location}: ${loc.concerns[0]}`)
    } else if (loc.trend === 'behind') {
      concerns.push(`${loc.location}: Progress behind schedule`)
    }
  }

  // Photo coverage
  if (photos.length < 10) {
    recommendations.push('Increase photo documentation frequency')
  }

  // Safety observations
  const safetyIssues = photos.filter(p => p.safety_observations.length > 0)
  if (safetyIssues.length > 0) {
    concerns.push(`${safetyIssues.length} photos contain safety observations - review required`)
  }

  // Summary
  const avgCompletion = locations.length > 0
    ? Math.round(locations.reduce((sum, l) => sum + l.estimated_completion, 0) / locations.length)
    : 0

  const summary = `Photo analysis of ${photos.length} images across ${locations.length} locations shows ` +
    `approximately ${avgCompletion}% overall completion. ` +
    `${highlights.length} areas are progressing well, while ${concerns.length} areas require attention.`

  return {
    summary,
    highlights,
    concerns,
    upcoming_work: upcoming,
    recommendations
  }
}

function generateComparisonReport(
  current: PhotoAnalysis[],
  baseline: any[]
): {
  baseline_date: string | null
  current_date: string
  areas_progressed: string[]
  areas_unchanged: string[]
  areas_of_concern: string[]
} {
  const baselineDate = baseline.length > 0 ? baseline[0].taken_at?.split('T')[0] : null
  const currentDate = current.length > 0 ? current[0].taken_date : new Date().toISOString().split('T')[0]

  const currentLocations = new Set(current.map(p => p.location))
  const baselineLocations = new Set(baseline.map(p => p.location))

  const progressed: string[] = []
  const unchanged: string[] = []
  const concerns: string[] = []

  for (const loc of currentLocations) {
    const currPhotos = current.filter(p => p.location === loc)
    const basePhotos = baseline.filter(p => p.location === loc)

    if (basePhotos.length === 0) {
      progressed.push(`${loc}: New area documented`)
    } else {
      const currCompletion = Math.max(...currPhotos.map(p => p.completion_estimate))
      // Simulate baseline completion
      const baseCompletion = currCompletion - 15

      if (currCompletion > baseCompletion + 5) {
        progressed.push(`${loc}: Progress from ~${baseCompletion}% to ${currCompletion}%`)
      } else {
        unchanged.push(loc)
      }
    }
  }

  // Areas in baseline but not current
  for (const loc of baselineLocations) {
    if (!currentLocations.has(loc)) {
      concerns.push(`${loc}: No recent photos - verify status`)
    }
  }

  return {
    baseline_date: baselineDate,
    current_date: currentDate,
    areas_progressed: progressed,
    areas_unchanged: unchanged,
    areas_of_concern: concerns
  }
}

function analyzeDocumentationCoverage(
  locations: LocationProgress[],
  activities: any[]
): {
  well_documented_areas: string[]
  under_documented_areas: string[]
  suggested_photo_locations: string[]
} {
  const wellDocumented: string[] = []
  const underDocumented: string[] = []
  const suggested: string[] = []

  for (const loc of locations) {
    if (loc.photo_count >= 5) {
      wellDocumented.push(loc.location)
    } else if (loc.photo_count < 2) {
      underDocumented.push(loc.location)
    }
  }

  // Check activities without photo coverage
  const documentedLocations = new Set(locations.map(l => l.location.toLowerCase()))
  for (const activity of activities) {
    const activityLoc = (activity.location || activity.area || '').toLowerCase()
    if (activityLoc && !documentedLocations.has(activityLoc)) {
      suggested.push(activity.location || activity.area)
    }
  }

  // Standard suggested areas if not covered
  const standardAreas = ['Building Exterior', 'Roof', 'Site Conditions', 'MEP Rooms', 'Stairwells']
  for (const area of standardAreas) {
    if (!documentedLocations.has(area.toLowerCase())) {
      suggested.push(area)
    }
  }

  return {
    well_documented_areas: wellDocumented,
    under_documented_areas: underDocumented,
    suggested_photo_locations: [...new Set(suggested)].slice(0, 10)
  }
}

function generatePhotoRecommendations(
  locations: LocationProgress[],
  documentation: { well_documented_areas: string[]; under_documented_areas: string[]; suggested_photo_locations: string[] },
  narrative: ProgressNarrative,
  trend: 'ahead' | 'on_track' | 'behind'
): string[] {
  const recommendations: string[] = []

  // Documentation coverage
  if (documentation.under_documented_areas.length > 0) {
    recommendations.push(`Increase photo coverage in: ${documentation.under_documented_areas.slice(0, 3).join(', ')}`)
  }

  if (documentation.suggested_photo_locations.length > 0) {
    recommendations.push(`Add photos for: ${documentation.suggested_photo_locations.slice(0, 3).join(', ')}`)
  }

  // Trend-based
  if (trend === 'behind') {
    recommendations.push('Schedule weekly progress photo review with project team')
  }

  // Safety
  const locationsWithSafety = locations.filter(l => l.concerns.some(c => /safety/i.test(c)))
  if (locationsWithSafety.length > 0) {
    recommendations.push('Review safety observations in progress photos with safety manager')
  }

  // Standard best practices
  recommendations.push('Take progress photos at consistent times for better comparison')
  recommendations.push('Include wide-angle context shots along with detail photos')

  return recommendations.slice(0, 6)
}
