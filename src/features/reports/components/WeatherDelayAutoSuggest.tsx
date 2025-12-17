/**
 * Weather Delay Auto-Suggest Component
 *
 * Automatically suggests delay reasons based on weather forecasts.
 * Integrates with daily reports delay tracking system.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun,
  Wind,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Clock,
  Shield,
  HardHat,
  Loader2,
} from 'lucide-react';
import {
  useWeatherSuggestions,
  useCurrentWeather,
  useSaveWeather,
  getDelayTemplate,
  formatWeatherDisplay,
  getWeatherSeverity,
  WEATHER_THRESHOLDS,
  type WeatherData,
  type WeatherDelaySuggestion,
  type WeatherDelayType,
} from '../hooks/useWeatherSuggestions';
import type { DelayEntry, DelayType } from '@/types/daily-reports-v2';

// =============================================
// TYPES
// =============================================

export interface WeatherDelayAutoSuggestProps {
  /**
   * Project latitude for weather lookup
   */
  latitude?: number;
  /**
   * Project longitude for weather lookup
   */
  longitude?: number;
  /**
   * Date for weather forecast (YYYY-MM-DD format)
   */
  date: string;
  /**
   * Project ID for saving weather data
   */
  projectId?: string;
  /**
   * Callback when user selects a delay suggestion
   */
  onSelectDelay?: (delay: Partial<DelayEntry>) => void;
  /**
   * Callback when weather data is loaded
   */
  onWeatherLoaded?: (weather: WeatherData) => void;
  /**
   * Whether the component is in a disabled state
   */
  disabled?: boolean;
  /**
   * Compact mode for smaller displays
   */
  compact?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

// =============================================
// WEATHER ICON COMPONENT
// =============================================

interface WeatherIconProps {
  condition: string;
  size?: number;
  className?: string;
}

function WeatherIcon({ condition, size = 24, className = '' }: WeatherIconProps) {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('thunder') || lowerCondition.includes('lightning')) {
    return <CloudLightning size={size} className={`text-purple-500 ${className}`} />;
  }
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {
    return <CloudSnow size={size} className={`text-blue-300 ${className}`} />;
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
    return <CloudRain size={size} className={`text-blue-500 ${className}`} />;
  }
  if (lowerCondition.includes('fog')) {
    return <Cloud size={size} className={`text-gray-400 ${className}`} />;
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return <Cloud size={size} className={`text-gray-500 ${className}`} />;
  }
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
    return <Sun size={size} className={`text-yellow-500 ${className}`} />;
  }

  return <Cloud size={size} className={`text-gray-400 ${className}`} />;
}

// =============================================
// SEVERITY BADGE COMPONENT
// =============================================

interface SeverityBadgeProps {
  severity: WeatherDelaySuggestion['severity'];
}

function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[severity]}`}
    >
      {severity === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

// =============================================
// SUGGESTION CARD COMPONENT
// =============================================

interface SuggestionCardProps {
  suggestion: WeatherDelaySuggestion;
  onSelect: () => void;
  disabled?: boolean;
}

function SuggestionCard({ suggestion, onSelect, disabled }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        disabled ? 'opacity-50' : 'hover:border-primary-300 hover:bg-primary-50/50 dark:hover:border-primary-700 dark:hover:bg-primary-950/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={suggestion.severity} />
            <span className="text-sm text-gray-500">
              <Clock className="w-3 h-3 inline mr-1" />
              {suggestion.estimated_hours}h estimated
            </span>
          </div>
          <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600"
          type="button"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {/* Affected Activities */}
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              <HardHat className="w-3 h-3 inline mr-1" />
              Affected Activities
            </h5>
            <div className="flex flex-wrap gap-1">
              {suggestion.affected_activities.map((activity, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>

          {/* Safety Concerns */}
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              <Shield className="w-3 h-3 inline mr-1" />
              Safety Concerns
            </h5>
            <ul className="text-sm text-gray-600 space-y-1">
              {suggestion.safety_concerns.map((concern, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={onSelect}
          disabled={disabled}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-primary dark:hover:bg-primary/80 dark:focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Use This Reason
        </button>
      </div>
    </div>
  );
}

// =============================================
// WEATHER SUMMARY COMPONENT
// =============================================

interface WeatherSummaryProps {
  weather: WeatherData;
  severity: ReturnType<typeof getWeatherSeverity>;
  compact?: boolean;
}

function WeatherSummary({ weather, severity, compact }: WeatherSummaryProps) {
  const severityColors = {
    none: 'bg-green-50 border-green-200',
    low: 'bg-blue-50 border-blue-200',
    medium: 'bg-yellow-50 border-yellow-200',
    high: 'bg-orange-50 border-orange-200',
    critical: 'bg-red-50 border-red-200',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${severityColors[severity]}`}>
        <WeatherIcon condition={weather.condition.description} size={28} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {weather.condition.description}
          </p>
          <p className="text-sm text-gray-600">
            {weather.temperature_high}F / {weather.temperature_low}F
            {weather.precipitation > 0 && ` | ${weather.precipitation}" precip`}
            {weather.wind_speed >= WEATHER_THRESHOLDS.HIGH_WIND && ` | ${weather.wind_speed} mph wind`}
          </p>
        </div>
        {severity !== 'none' && (
          <AlertTriangle className={`w-5 h-5 ${
            severity === 'critical' ? 'text-red-500' :
            severity === 'high' ? 'text-orange-500' :
            severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
          }`} />
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${severityColors[severity]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <WeatherIcon condition={weather.condition.description} size={40} />
          <div>
            <h3 className="font-semibold text-gray-900">{weather.condition.description}</h3>
            <p className="text-sm text-gray-500">
              {new Date(weather.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        {severity !== 'none' && (
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${
              severity === 'critical' ? 'text-red-500' :
              severity === 'high' ? 'text-orange-500' :
              severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
            }`} />
            <span className="text-sm font-medium capitalize">{severity} Impact</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          <div>
            <p className="text-xs text-gray-500">High</p>
            <p className="font-medium">{weather.temperature_high}F</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Low</p>
            <p className="font-medium">{weather.temperature_low}F</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Precipitation</p>
            <p className="font-medium">{weather.precipitation}"</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Wind</p>
            <p className="font-medium">{weather.wind_speed} mph</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Source: {weather.source} | Updated: {new Date(weather.fetched_at).toLocaleTimeString()}
      </p>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function WeatherDelayAutoSuggest({
  latitude,
  longitude,
  date,
  projectId,
  onSelectDelay,
  onWeatherLoaded,
  disabled = false,
  compact = false,
  className = '',
}: WeatherDelayAutoSuggestProps) {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Fetch weather data with suggestions
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useWeatherSuggestions(latitude, longitude, date);

  // Save weather mutation
  const saveWeather = useSaveWeather();

  // Notify parent when weather is loaded
  React.useEffect(() => {
    if (data?.weather && onWeatherLoaded) {
      onWeatherLoaded(data.weather);
    }
  }, [data?.weather, onWeatherLoaded]);

  // Calculate severity
  const severity = useMemo(() => {
    return data?.weather ? getWeatherSeverity(data.weather) : 'none';
  }, [data?.weather]);

  // Handle selecting a suggestion
  const handleSelectSuggestion = useCallback(
    (suggestion: WeatherDelaySuggestion) => {
      if (!onSelectDelay || disabled) {return;}

      const template = getDelayTemplate(suggestion.type);

      // Convert to DelayEntry format
      const delayEntry: Partial<DelayEntry> = {
        delay_type: 'weather' as DelayType,
        description: template.description,
        duration_hours: suggestion.estimated_hours,
        affected_activities: template.affected_activities,
        // Additional metadata that could be used
      };

      onSelectDelay(delayEntry);

      // Optionally save weather data to database
      if (projectId && data?.weather && latitude && longitude) {
        saveWeather.mutate({
          projectId,
          weatherData: data.weather,
          latitude,
          longitude,
        });
      }
    },
    [onSelectDelay, disabled, projectId, data?.weather, latitude, longitude, saveWeather]
  );

  // Filter suggestions based on view state
  const visibleSuggestions = useMemo(() => {
    if (!data?.suggestions) {return [];}
    if (showAllSuggestions) {return data.suggestions;}
    // Show only high and critical severity by default
    return data.suggestions.filter(
      (s) => s.severity === 'high' || s.severity === 'critical'
    );
  }, [data?.suggestions, showAllSuggestions]);

  // No location provided
  if (latitude === undefined || longitude === undefined) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Info className="w-5 h-5" />
          <span>Weather suggestions require project location (latitude/longitude).</span>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading weather data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={`p-4 bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load weather data: {(error as Error)?.message || 'Unknown error'}</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-red-700 hover:bg-red-100 rounded"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // No data
  if (!data?.weather) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Info className="w-5 h-5" />
          <span>No weather data available for this date.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Weather Summary */}
      <WeatherSummary weather={data.weather} severity={severity} compact={compact} />

      {/* Delay Suggestions */}
      {data.suggestions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Weather Delay Suggestions ({data.suggestions.length})
            </h3>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              type="button"
              title="Refresh weather data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {visibleSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onSelect={() => handleSelectSuggestion(suggestion)}
                disabled={disabled}
              />
            ))}
          </div>

          {/* Show more/less toggle */}
          {data.suggestions.length > visibleSuggestions.length && !showAllSuggestions && (
            <button
              onClick={() => setShowAllSuggestions(true)}
              className="w-full py-2 text-sm text-primary hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:text-primary-300 dark:hover:bg-primary-950 rounded-lg transition-colors"
              type="button"
            >
              Show {data.suggestions.length - visibleSuggestions.length} more suggestion(s)
            </button>
          )}
          {showAllSuggestions && data.suggestions.length > 2 && (
            <button
              onClick={() => setShowAllSuggestions(false)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              type="button"
            >
              Show fewer suggestions
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span>Weather conditions look favorable - no delays expected.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// EXPORTS
// =============================================

export default WeatherDelayAutoSuggest;

// Export sub-components for flexibility
export { WeatherIcon, SeverityBadge, SuggestionCard, WeatherSummary };
