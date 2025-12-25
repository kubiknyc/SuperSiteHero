/**
 * Video Thumbnail Generation Utilities
 *
 * Generates thumbnail images from video files using HTML5 Canvas.
 * Supports multiple thumbnail extraction at different timestamps.
 */

export interface ThumbnailOptions {
  /** Width of the thumbnail (default: 320) */
  width?: number
  /** Height of the thumbnail (maintains aspect ratio if not specified) */
  height?: number
  /** Time in seconds to capture the thumbnail (default: 1) */
  time?: number
  /** Output format (default: image/jpeg) */
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
  /** JPEG quality 0-1 (default: 0.8) */
  quality?: number
}

export interface ThumbnailResult {
  /** Thumbnail as Blob */
  blob: Blob
  /** Thumbnail as data URL */
  dataUrl: string
  /** Width of generated thumbnail */
  width: number
  /** Height of generated thumbnail */
  height: number
  /** Time in video where thumbnail was captured */
  captureTime: number
}

/**
 * Generate a single thumbnail from a video file
 */
export async function generateVideoThumbnail(
  video: File | Blob | HTMLVideoElement,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const {
    width = 320,
    height,
    time = 1,
    format = 'image/jpeg',
    quality = 0.8,
  } = options

  // If passed a File/Blob, create video element
  let videoElement: HTMLVideoElement
  let shouldCleanup = false

  if (video instanceof HTMLVideoElement) {
    videoElement = video
  } else {
    videoElement = document.createElement('video')
    videoElement.preload = 'metadata'
    videoElement.muted = true
    videoElement.playsInline = true
    shouldCleanup = true
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (shouldCleanup && videoElement.src) {
        URL.revokeObjectURL(videoElement.src)
      }
    }

    const generateThumbnailAtTime = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        const videoWidth = videoElement.videoWidth
        const videoHeight = videoElement.videoHeight

        if (!videoWidth || !videoHeight) {
          cleanup()
          reject(new Error('Invalid video dimensions'))
          return
        }

        const targetWidth = width
        let targetHeight = height

        if (!targetHeight) {
          // Calculate height maintaining aspect ratio
          targetHeight = Math.round((videoHeight / videoWidth) * targetWidth)
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Draw video frame
        ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              cleanup()
              reject(new Error('Failed to generate thumbnail blob'))
              return
            }

            const dataUrl = canvas.toDataURL(format, quality)

            cleanup()
            resolve({
              blob,
              dataUrl,
              width: targetWidth,
              height: targetHeight,
              captureTime: videoElement.currentTime,
            })
          },
          format,
          quality
        )
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    if (video instanceof HTMLVideoElement) {
      // Video element already loaded, seek to time
      if (videoElement.readyState >= 2) {
        videoElement.currentTime = Math.min(time, videoElement.duration || time)
        videoElement.onseeked = generateThumbnailAtTime
      } else {
        videoElement.onloadeddata = () => {
          videoElement.currentTime = Math.min(time, videoElement.duration || time)
          videoElement.onseeked = generateThumbnailAtTime
        }
      }
    } else {
      // Load video from File/Blob
      videoElement.onloadedmetadata = () => {
        // Seek to specified time (or 1s, or end if video is shorter)
        const seekTime = Math.min(time, videoElement.duration - 0.1, videoElement.duration * 0.1)
        videoElement.currentTime = Math.max(0, seekTime)
      }

      videoElement.onseeked = generateThumbnailAtTime

      videoElement.onerror = () => {
        cleanup()
        reject(new Error('Failed to load video'))
      }

      videoElement.src = URL.createObjectURL(video)
    }
  })
}

/**
 * Generate multiple thumbnails from a video at specified intervals
 */
export async function generateVideoThumbnails(
  video: File | Blob,
  count: number = 4,
  options: Omit<ThumbnailOptions, 'time'> = {}
): Promise<ThumbnailResult[]> {
  // First, get video duration
  const videoElement = document.createElement('video')
  videoElement.preload = 'metadata'
  videoElement.muted = true
  videoElement.playsInline = true

  return new Promise((resolve, reject) => {
    videoElement.onloadedmetadata = async () => {
      const duration = videoElement.duration

      if (!duration || !isFinite(duration)) {
        URL.revokeObjectURL(videoElement.src)
        reject(new Error('Could not determine video duration'))
        return
      }

      // Calculate timestamps for thumbnails
      const timestamps: number[] = []
      const interval = duration / (count + 1)

      for (let i = 1; i <= count; i++) {
        timestamps.push(interval * i)
      }

      // Generate thumbnails sequentially (to reuse video element)
      const results: ThumbnailResult[] = []

      try {
        for (const time of timestamps) {
          const result = await generateVideoThumbnail(videoElement, {
            ...options,
            time,
          })
          results.push(result)
        }

        URL.revokeObjectURL(videoElement.src)
        resolve(results)
      } catch (err) {
        URL.revokeObjectURL(videoElement.src)
        reject(err)
      }
    }

    videoElement.onerror = () => {
      URL.revokeObjectURL(videoElement.src)
      reject(new Error('Failed to load video'))
    }

    videoElement.src = URL.createObjectURL(video)
  })
}

/**
 * Generate a thumbnail at a specific percentage of the video
 */
export async function generateThumbnailAtPercent(
  video: File | Blob,
  percent: number = 10,
  options: Omit<ThumbnailOptions, 'time'> = {}
): Promise<ThumbnailResult> {
  // Get video duration first
  const videoElement = document.createElement('video')
  videoElement.preload = 'metadata'
  videoElement.muted = true
  videoElement.playsInline = true

  return new Promise((resolve, reject) => {
    videoElement.onloadedmetadata = async () => {
      const duration = videoElement.duration
      URL.revokeObjectURL(videoElement.src)

      if (!duration || !isFinite(duration)) {
        reject(new Error('Could not determine video duration'))
        return
      }

      const time = (duration * percent) / 100

      try {
        const result = await generateVideoThumbnail(video, {
          ...options,
          time,
        })
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }

    videoElement.onerror = () => {
      URL.revokeObjectURL(videoElement.src)
      reject(new Error('Failed to load video'))
    }

    videoElement.src = URL.createObjectURL(video)
  })
}

/**
 * Generate a poster image suitable for video element
 * Captures at 10% of video duration by default
 */
export async function generateVideoPoster(
  video: File | Blob,
  options: Omit<ThumbnailOptions, 'time'> = {}
): Promise<string> {
  const result = await generateThumbnailAtPercent(video, 10, {
    width: options.width || 640,
    format: 'image/jpeg',
    quality: 0.85,
    ...options,
  })

  return result.dataUrl
}

/**
 * Convert thumbnail blob to File object
 */
export function thumbnailToFile(
  thumbnail: ThumbnailResult,
  fileName: string = 'thumbnail.jpg'
): File {
  return new File([thumbnail.blob], fileName, {
    type: thumbnail.blob.type,
    lastModified: Date.now(),
  })
}

/**
 * Create a video thumbnail strip (multiple thumbnails in one image)
 */
export async function generateThumbnailStrip(
  video: File | Blob,
  count: number = 5,
  thumbWidth: number = 160,
  thumbHeight: number = 90
): Promise<ThumbnailResult> {
  // Generate individual thumbnails
  const thumbnails = await generateVideoThumbnails(video, count, {
    width: thumbWidth,
    height: thumbHeight,
    format: 'image/jpeg',
    quality: 0.7,
  })

  // Create combined canvas
  const canvas = document.createElement('canvas')
  canvas.width = thumbWidth * count
  canvas.height = thumbHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Draw each thumbnail
  for (let i = 0; i < thumbnails.length; i++) {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, i * thumbWidth, 0, thumbWidth, thumbHeight)
        resolve()
      }
      img.onerror = reject
      img.src = thumbnails[i].dataUrl
    })
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate thumbnail strip'))
          return
        }

        resolve({
          blob,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          width: canvas.width,
          height: canvas.height,
          captureTime: 0,
        })
      },
      'image/jpeg',
      0.8
    )
  })
}

export default {
  generateVideoThumbnail,
  generateVideoThumbnails,
  generateThumbnailAtPercent,
  generateVideoPoster,
  thumbnailToFile,
  generateThumbnailStrip,
}
