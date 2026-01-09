/**
 * Toolbox Talk Topic Suggestions Tool
 * Suggest relevant toolbox talk topics based on activities, weather, and recent incidents
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import { getWeatherForProject } from '@/features/daily-reports/services/weatherApiService'

interface SuggestToolboxTopicsInput {
  project_id: string
  date: string
  consider_weather?: boolean
  consider_schedule?: boolean
  consider_recent_incidents?: boolean
}

interface TopicRecommendation {
  topic: string
  relevance_reason: string
  priority: 'high' | 'medium' | 'low'
  related_activities: string[]
  key_points: string[]
  estimated_duration: string
}

interface ActivityBasedTopic {
  activity: string
  hazards: string[]
  suggested_topic: string
}

interface WeatherBasedTopic {
  condition: string
  topic: string
  key_points: string[]
}

interface IncidentBasedTopic {
  recent_incident_type: string
  topic: string
  lessons_learned: string[]
}

interface CalendarTopic {
  date: string
  topic: string
  reason: 'osha_emphasis' | 'seasonal' | 'recurring'
}

interface SuggestToolboxTopicsOutput {
  recommended_topics: TopicRecommendation[]
  activity_based: ActivityBasedTopic[]
  weather_based?: WeatherBasedTopic
  incident_based?: IncidentBasedTopic[]
  calendar_topics: CalendarTopic[]
}

// OSHA Focus Four hazards
const OSHA_FOCUS_FOUR = {
  falls: {
    topic: 'Fall Prevention',
    key_points: [
      'Use proper fall protection when working at heights above 6 feet',
      'Inspect harnesses, lanyards, and anchor points daily',
      'Maintain 3 points of contact on ladders',
      'Keep work areas clear of tripping hazards',
      'Use guardrails, safety nets, or personal fall arrest systems',
    ]
  },
  struck_by: {
    topic: 'Struck-By Hazard Prevention',
    key_points: [
      'Never walk under suspended loads',
      'Wear high-visibility vests in active work zones',
      'Establish swing radius zones for equipment',
      'Secure tools when working at height',
      'Use spotters when backing equipment',
    ]
  },
  caught_in: {
    topic: 'Caught-In/Between Hazard Prevention',
    key_points: [
      'Never enter unprotected trenches',
      'Use lockout/tagout on machinery',
      'Keep guards in place on rotating equipment',
      'Avoid loose clothing near moving parts',
      'Never reach into operating machinery',
    ]
  },
  electrocution: {
    topic: 'Electrical Safety',
    key_points: [
      'Treat all wires as energized until verified',
      'Use GFCI protection for all power tools',
      'Maintain safe distances from overhead lines',
      'Inspect cords and tools before use',
      'Never work on energized circuits without lockout/tagout',
    ]
  }
}

// Activity-to-hazard mapping
const ACTIVITY_HAZARDS: Record<string, { hazards: string[]; topic: string; points: string[] }> = {
  'concrete': {
    hazards: ['Silica exposure', 'Burns from wet concrete', 'Heavy lifting'],
    topic: 'Concrete Work Safety',
    points: [
      'Wear appropriate PPE including rubber boots and gloves',
      'Wash skin immediately if contact with wet concrete',
      'Use dust control measures when cutting/grinding',
      'Practice proper lifting techniques',
    ]
  },
  'roofing': {
    hazards: ['Falls from height', 'Heat stress', 'Burns'],
    topic: 'Roofing Safety',
    points: [
      'Use fall protection at all times',
      'Stay hydrated and take breaks in shade',
      'Handle hot materials with appropriate PPE',
      'Secure materials to prevent wind displacement',
    ]
  },
  'electrical': {
    hazards: ['Electrocution', 'Arc flash', 'Burns'],
    topic: 'Electrical Safety',
    points: [
      'Always de-energize before working on circuits',
      'Use proper lockout/tagout procedures',
      'Wear appropriate arc-rated PPE',
      'Test circuits before touching',
    ]
  },
  'excavation': {
    hazards: ['Cave-in', 'Struck by equipment', 'Utility strikes'],
    topic: 'Excavation & Trenching Safety',
    points: [
      'Never enter unprotected excavations',
      'Use shoring, sloping, or trench boxes',
      'Call 811 before digging',
      'Inspect excavations daily and after rain',
    ]
  },
  'steel': {
    hazards: ['Falls', 'Struck by', 'Crushing'],
    topic: 'Steel Erection Safety',
    points: [
      '100% tie-off when working at height',
      'Never stand under suspended loads',
      'Use tag lines to control loads',
      'Verify connections before releasing loads',
    ]
  },
  'scaffold': {
    hazards: ['Falls', 'Collapse', 'Falling objects'],
    topic: 'Scaffold Safety',
    points: [
      'Inspect scaffolds before each use',
      'Use proper access - never climb cross braces',
      'Maintain guardrails and toe boards',
      'Keep platforms clear of debris',
    ]
  },
  'crane': {
    hazards: ['Struck by', 'Electrocution', 'Overturning'],
    topic: 'Crane Safety',
    points: [
      'Never exceed load capacity',
      'Maintain safe distance from power lines',
      'Use qualified signal persons',
      'Ensure proper ground conditions',
    ]
  },
  'welding': {
    hazards: ['Burns', 'Fumes', 'Eye damage', 'Fire'],
    topic: 'Welding & Hot Work Safety',
    points: [
      'Use proper PPE including welding hood and gloves',
      'Ensure adequate ventilation',
      'Have fire extinguisher within reach',
      'Complete hot work permit requirements',
    ]
  },
  'demolition': {
    hazards: ['Collapse', 'Falling debris', 'Hazardous materials'],
    topic: 'Demolition Safety',
    points: [
      'Complete structural survey before demolition',
      'Test for hazardous materials (asbestos, lead)',
      'Establish exclusion zones',
      'Use proper PPE for dust and debris',
    ]
  },
  'painting': {
    hazards: ['Falls', 'Chemical exposure', 'Fire'],
    topic: 'Painting Safety',
    points: [
      'Ensure adequate ventilation',
      'Use appropriate respiratory protection',
      'Keep ignition sources away from flammable products',
      'Review SDS for all products used',
    ]
  }
}

// Weather-based topics
const WEATHER_TOPICS: Record<string, { topic: string; points: string[] }> = {
  'hot': {
    topic: 'Heat Illness Prevention',
    points: [
      'Drink water every 15-20 minutes',
      'Take breaks in shade or air conditioning',
      'Watch for signs of heat exhaustion',
      'Acclimatize new workers gradually',
      'Schedule heavy work for cooler hours',
    ]
  },
  'cold': {
    topic: 'Cold Weather Safety',
    points: [
      'Dress in layers and keep dry',
      'Watch for signs of hypothermia and frostbite',
      'Take warm-up breaks regularly',
      'Be cautious of ice and slick surfaces',
      'Ensure equipment is rated for cold temperatures',
    ]
  },
  'rain': {
    topic: 'Wet Weather Safety',
    points: [
      'Watch for slippery surfaces',
      'Protect electrical equipment from moisture',
      'Inspect excavations after rain',
      'Use waterproof PPE as needed',
      'Be extra cautious on ladders and scaffolds',
    ]
  },
  'wind': {
    topic: 'High Wind Safety',
    points: [
      'Secure loose materials and equipment',
      'Suspend crane operations if winds exceed limits',
      'Be cautious with sheet materials',
      'Watch for falling debris',
      'Avoid working at height in high winds',
    ]
  },
  'lightning': {
    topic: 'Lightning Safety',
    points: [
      'Monitor weather conditions',
      'Stop work and seek shelter when lightning threatens',
      'Wait 30 minutes after last thunder before resuming',
      'Stay away from tall equipment and metal structures',
      'Disconnect from electrical systems',
    ]
  }
}

function getSeasonalTopics(date: Date): CalendarTopic[] {
  const month = date.getMonth()
  const topics: CalendarTopic[] = []

  // Summer months (Jun-Aug)
  if (month >= 5 && month <= 7) {
    topics.push({
      date: date.toISOString().split('T')[0],
      topic: 'Heat Illness Prevention',
      reason: 'seasonal'
    })
  }

  // Winter months (Dec-Feb)
  if (month === 11 || month <= 1) {
    topics.push({
      date: date.toISOString().split('T')[0],
      topic: 'Cold Weather Safety',
      reason: 'seasonal'
    })
  }

  // OSHA Safe + Sound Week (typically August)
  if (month === 7) {
    topics.push({
      date: date.toISOString().split('T')[0],
      topic: 'Safety Culture and Worker Participation',
      reason: 'osha_emphasis'
    })
  }

  // National Safety Month (June)
  if (month === 5) {
    topics.push({
      date: date.toISOString().split('T')[0],
      topic: 'General Safety Awareness',
      reason: 'osha_emphasis'
    })
  }

  return topics
}

export const suggestToolboxTopicsTool = createTool<SuggestToolboxTopicsInput, SuggestToolboxTopicsOutput>({
  name: 'suggest_toolbox_topics',
  displayName: 'Suggest Toolbox Talk Topics',
  description: 'Suggests relevant toolbox talk topics based on scheduled activities, weather conditions, recent incidents, and seasonal considerations. Provides key talking points for each topic.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      date: {
        type: 'string',
        description: 'Date for the toolbox talk (ISO format)'
      },
      consider_weather: {
        type: 'boolean',
        description: 'Consider weather conditions (default: true)'
      },
      consider_schedule: {
        type: 'boolean',
        description: 'Consider scheduled activities (default: true)'
      },
      consider_recent_incidents: {
        type: 'boolean',
        description: 'Consider recent incidents/near-misses (default: true)'
      }
    },
    required: ['project_id', 'date']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const {
      project_id,
      date,
      consider_weather = true,
      consider_schedule = true,
      consider_recent_incidents = true
    } = input

    const recommendedTopics: TopicRecommendation[] = []
    const activityBased: ActivityBasedTopic[] = []
    let weatherBased: WeatherBasedTopic | undefined
    const incidentBased: IncidentBasedTopic[] = []

    // Get scheduled activities for today
    if (consider_schedule) {
      const { data: activities } = await supabase
        .from('schedule_activities')
        .select('name')
        .eq('project_id', project_id)
        .lte('planned_start', date)
        .gte('planned_finish', date)
        .neq('status', 'completed')
        .limit(10)

      if (activities) {
        for (const activity of activities) {
          const lowerName = activity.name.toLowerCase()

          for (const [keyword, config] of Object.entries(ACTIVITY_HAZARDS)) {
            if (lowerName.includes(keyword)) {
              activityBased.push({
                activity: activity.name,
                hazards: config.hazards,
                suggested_topic: config.topic
              })

              recommendedTopics.push({
                topic: config.topic,
                relevance_reason: `Scheduled activity: ${activity.name}`,
                priority: 'high',
                related_activities: [activity.name],
                key_points: config.points,
                estimated_duration: '10-15 minutes'
              })
              break
            }
          }
        }
      }
    }

    // Check weather conditions
    if (consider_weather) {
      const weather = await getWeatherForProject(project_id)

      if (weather) {
        let weatherCondition: string | null = null

        if (weather.temperature > 85) {
          weatherCondition = 'hot'
        } else if (weather.temperature < 40) {
          weatherCondition = 'cold'
        } else if (weather.conditions.toLowerCase().includes('rain')) {
          weatherCondition = 'rain'
        } else if (weather.windSpeed > 20) {
          weatherCondition = 'wind'
        } else if (weather.conditions.toLowerCase().includes('thunder') || weather.conditions.toLowerCase().includes('storm')) {
          weatherCondition = 'lightning'
        }

        if (weatherCondition && WEATHER_TOPICS[weatherCondition]) {
          const weatherTopic = WEATHER_TOPICS[weatherCondition]
          weatherBased = {
            condition: weather.conditions,
            topic: weatherTopic.topic,
            key_points: weatherTopic.points
          }

          recommendedTopics.push({
            topic: weatherTopic.topic,
            relevance_reason: `Current weather: ${weather.conditions}, ${weather.temperature}°F`,
            priority: weatherCondition === 'lightning' ? 'high' : 'medium',
            related_activities: [],
            key_points: weatherTopic.points,
            estimated_duration: '5-10 minutes'
          })
        }
      }
    }

    // Check recent incidents
    if (consider_recent_incidents) {
      const sevenDaysAgo = new Date(date)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: recentIncidents } = await supabase
        .from('safety_incidents')
        .select('incident_type, description, root_cause')
        .eq('project_id', project_id)
        .gte('incident_date', sevenDaysAgo.toISOString().split('T')[0])
        .limit(5)

      if (recentIncidents && recentIncidents.length > 0) {
        for (const incident of recentIncidents) {
          const incidentType = incident.incident_type || 'General'

          // Map to OSHA Focus Four if applicable
          let focusFourKey: keyof typeof OSHA_FOCUS_FOUR | null = null
          if (incidentType.toLowerCase().includes('fall')) focusFourKey = 'falls'
          else if (incidentType.toLowerCase().includes('struck')) focusFourKey = 'struck_by'
          else if (incidentType.toLowerCase().includes('caught') || incidentType.toLowerCase().includes('crush')) focusFourKey = 'caught_in'
          else if (incidentType.toLowerCase().includes('electr') || incidentType.toLowerCase().includes('shock')) focusFourKey = 'electrocution'

          if (focusFourKey) {
            const focusTopic = OSHA_FOCUS_FOUR[focusFourKey]
            incidentBased.push({
              recent_incident_type: incidentType,
              topic: focusTopic.topic,
              lessons_learned: [
                incident.description || 'Review incident details',
                incident.root_cause || 'Root cause under investigation',
                'Discuss how this could have been prevented'
              ]
            })

            recommendedTopics.push({
              topic: focusTopic.topic,
              relevance_reason: `Recent incident: ${incidentType}`,
              priority: 'high',
              related_activities: [],
              key_points: focusTopic.key_points,
              estimated_duration: '15-20 minutes'
            })
          }
        }
      }
    }

    // Get seasonal/calendar topics
    const calendarTopics = getSeasonalTopics(new Date(date))

    // If no topics found, add general OSHA Focus Four rotation
    if (recommendedTopics.length === 0) {
      const dayOfWeek = new Date(date).getDay()
      const focusFourKeys = Object.keys(OSHA_FOCUS_FOUR) as (keyof typeof OSHA_FOCUS_FOUR)[]
      const todaysFocus = OSHA_FOCUS_FOUR[focusFourKeys[dayOfWeek % 4]]

      recommendedTopics.push({
        topic: todaysFocus.topic,
        relevance_reason: 'OSHA Focus Four rotation',
        priority: 'medium',
        related_activities: [],
        key_points: todaysFocus.key_points,
        estimated_duration: '10-15 minutes'
      })
    }

    // Deduplicate topics by name
    const uniqueTopics = recommendedTopics.reduce((acc, topic) => {
      const existing = acc.find(t => t.topic === topic.topic)
      if (existing) {
        // Merge related activities and keep higher priority
        existing.related_activities.push(...topic.related_activities)
        if (topic.priority === 'high' && existing.priority !== 'high') {
          existing.priority = 'high'
        }
      } else {
        acc.push(topic)
      }
      return acc
    }, [] as TopicRecommendation[])

    return {
      success: true,
      data: {
        recommended_topics: uniqueTopics.slice(0, 5),
        activity_based: activityBased,
        weather_based: weatherBased,
        incident_based: incidentBased.slice(0, 3),
        calendar_topics: calendarTopics
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { recommended_topics, weather_based, incident_based } = output

    const hasHighPriority = recommended_topics.some(t => t.priority === 'high')
    const hasIncidentBased = incident_based && incident_based.length > 0

    return {
      title: 'Toolbox Talk Suggestions',
      summary: `${recommended_topics.length} topics recommended${hasIncidentBased ? ' (includes incident follow-up)' : ''}`,
      icon: 'users',
      status: hasHighPriority ? 'warning' : 'success',
      details: [
        { label: 'Topics', value: recommended_topics.length, type: 'text' },
        { label: 'Weather Topic', value: weather_based ? 'Yes' : 'No', type: 'text' },
        { label: 'Incident Follow-up', value: incident_based?.length || 0, type: 'text' },
        { label: 'Top Priority', value: recommended_topics[0]?.priority || 'medium', type: 'badge' },
      ],
      expandedContent: output
    }
  }
})
