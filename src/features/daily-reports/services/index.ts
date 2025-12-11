/**
 * Daily Reports Services
 * Export all service modules
 */

// Workflow Engine
export {
  workflowEngine,
  WorkflowEngine,
  type WorkflowConfig,
  type ApprovalRole,
  type NotificationConfig,
  type NotificationType,
} from './workflowEngine';

// Notification Service
export {
  sendStatusChangeNotification,
  sendPendingReviewReminder,
  sendOverdueDraftReminder,
  type NotificationPayload,
  type NotificationRecipient,
  type NotificationResult,
} from './notificationService';

// Weather API Service
export {
  getWeather,
  getWeatherForProject,
  getCurrentLocation,
  formatWeatherDisplay,
  analyzeWeatherImpact,
  type WeatherData,
  type GeoLocation,
} from './weatherApiService';

// Template Service
export {
  getTemplatesForProject,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTemplateFromReport,
  applyTemplate,
  getSuggestedTemplates,
  getWorkforceFromPreviousDay,
  getEquipmentFromPreviousDay,
  copyFromPreviousDay,
} from './templateService';
