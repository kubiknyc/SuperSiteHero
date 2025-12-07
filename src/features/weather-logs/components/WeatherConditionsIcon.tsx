// File: /src/features/weather-logs/components/WeatherConditionsIcon.tsx
// Icon component for displaying weather conditions

import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudHail,
  CloudFog,
  Wind,
  CloudLightning,
  type LucideIcon,
} from 'lucide-react'
import type { WeatherCondition } from '@/types/database-extensions'

interface WeatherConditionsIconProps {
  condition: WeatherCondition
  className?: string
}

const weatherIconMap: Record<WeatherCondition, LucideIcon> = {
  sunny: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  overcast: Cloud,
  rain: CloudRain,
  heavy_rain: CloudRain,
  drizzle: CloudDrizzle,
  snow: CloudSnow,
  heavy_snow: CloudSnow,
  sleet: CloudSnow,
  hail: CloudHail,
  fog: CloudFog,
  wind: Wind,
  storm: CloudLightning,
  thunderstorm: CloudLightning,
}

const weatherColorMap: Record<WeatherCondition, string> = {
  sunny: 'text-yellow-500',
  partly_cloudy: 'text-yellow-400',
  cloudy: 'text-gray-400',
  overcast: 'text-gray-500',
  rain: 'text-blue-500',
  heavy_rain: 'text-blue-600',
  drizzle: 'text-blue-400',
  snow: 'text-blue-200',
  heavy_snow: 'text-blue-300',
  sleet: 'text-blue-300',
  hail: 'text-blue-400',
  fog: 'text-gray-400',
  wind: 'text-gray-500',
  storm: 'text-purple-600',
  thunderstorm: 'text-purple-700',
}

export function WeatherConditionsIcon({ condition, className = '' }: WeatherConditionsIconProps) {
  const Icon = weatherIconMap[condition]
  const colorClass = weatherColorMap[condition]

  return <Icon className={`${colorClass} ${className}`} />
}

// Helper function to get friendly weather condition name
export function getWeatherConditionLabel(condition: WeatherCondition): string {
  const labels: Record<WeatherCondition, string> = {
    sunny: 'Sunny',
    partly_cloudy: 'Partly Cloudy',
    cloudy: 'Cloudy',
    overcast: 'Overcast',
    rain: 'Rain',
    heavy_rain: 'Heavy Rain',
    drizzle: 'Drizzle',
    snow: 'Snow',
    heavy_snow: 'Heavy Snow',
    sleet: 'Sleet',
    hail: 'Hail',
    fog: 'Fog',
    wind: 'Windy',
    storm: 'Storm',
    thunderstorm: 'Thunderstorm',
  }

  return labels[condition]
}
