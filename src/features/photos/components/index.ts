/**
 * Photos Components Index
 *
 * Export all photo and video management related components.
 */

export { CameraCapture } from './CameraCapture';
export { PhotoGrid } from './PhotoGrid';
export { PhotoComparison } from './PhotoComparison';
export { PhotoDetailDialog } from './PhotoDetailDialog';
export { PhotoTimeline } from './PhotoTimeline';
export { PhotoTemplateManager } from './PhotoTemplateManager';
export { DailyPhotoChecklist } from './DailyPhotoChecklist';
export { LocationBrowser } from './LocationBrowser';
export { LocationProgressTimeline } from './LocationProgressTimeline';

// 360 Photo Viewer with gyroscope support
export { Photo360Viewer } from './Photo360Viewer';

// Touch-friendly gallery with pinch-to-zoom and swipe
export { TouchPhotoGallery } from './TouchPhotoGallery';
export type { TouchPhotoGalleryProps, GalleryPhoto } from './TouchPhotoGallery';

// Video capture and playback components
export { VideoCapture } from './VideoCapture';
export type { VideoCaptureProps, VideoQuality, VideoQualitySettings } from './VideoCapture';
export { VideoPlayer, SimpleVideoPlayer } from './VideoPlayer';
export type { VideoPlayerProps } from './VideoPlayer';
