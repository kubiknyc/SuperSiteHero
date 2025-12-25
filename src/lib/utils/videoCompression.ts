/**
 * Video Compression Utilities
 *
 * Client-side video compression and processing utilities.
 * Uses HTML5 Canvas and MediaRecorder for re-encoding.
 *
 * Note: Full video transcoding in the browser is limited.
 * For production, consider server-side transcoding with FFmpeg.
 */

export interface VideoCompressionOptions {
  /** Maximum width (maintains aspect ratio) */
  maxWidth?: number
  /** Maximum height (maintains aspect ratio) */
  maxHeight?: number
  /** Target video bitrate in bps (default: 1500000 = 1.5 Mbps) */
  videoBitrate?: number
  /** Target audio bitrate in bps (default: 128000 = 128 kbps) */
  audioBitrate?: number
  /** Output MIME type (default: video/webm) */
  outputMimeType?: string
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void
}

export interface VideoMetadata {
  /** Video duration in seconds */
  duration: number
  /** Video width */
  width: number
  /** Video height */
  height: number
  /** Video codec */
  videoCodec?: string
  /** Audio codec */
  audioCodec?: string
  /** File size in bytes */
  fileSize: number
  /** MIME type */
  mimeType: string
  /** Estimated bitrate */
  bitrate?: number
  /** Frame rate */
  frameRate?: number
}

/**
 * Get metadata from a video file
 */
export async function getVideoMetadata(file: File | Blob): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)

      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fileSize: file.size,
        mimeType: file.type,
        bitrate: file.size > 0 && video.duration > 0
          ? Math.round((file.size * 8) / video.duration)
          : undefined,
      }

      resolve(metadata)
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Check if a video file needs compression based on criteria
 */
export function needsCompression(
  metadata: VideoMetadata,
  maxFileSize: number = 100 * 1024 * 1024, // 100MB
  maxResolution: number = 1080
): boolean {
  // Check file size
  if (metadata.fileSize > maxFileSize) {
    return true
  }

  // Check resolution
  if (metadata.width > maxResolution || metadata.height > maxResolution) {
    return true
  }

  // Check bitrate (> 5 Mbps)
  if (metadata.bitrate && metadata.bitrate > 5000000) {
    return true
  }

  return false
}

/**
 * Calculate target dimensions while maintaining aspect ratio
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let targetWidth = width
  let targetHeight = height

  // Scale down if needed
  if (width > maxWidth) {
    targetWidth = maxWidth
    targetHeight = Math.round((height * maxWidth) / width)
  }

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight
    targetWidth = Math.round((width * maxHeight) / height)
  }

  // Ensure even dimensions (required for some codecs)
  targetWidth = Math.floor(targetWidth / 2) * 2
  targetHeight = Math.floor(targetHeight / 2) * 2

  return { width: targetWidth, height: targetHeight }
}

/**
 * Compress/re-encode a video file using Canvas and MediaRecorder
 *
 * Note: This is a basic browser-based compression. For heavy lifting,
 * use server-side transcoding with FFmpeg.
 */
export async function compressVideo(
  file: File | Blob,
  options: VideoCompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    videoBitrate = 1500000,
    audioBitrate = 128000,
    outputMimeType = 'video/webm',
    onProgress,
  } = options

  // Get video metadata
  const metadata = await getVideoMetadata(file)

  // If video is already small enough, return as-is
  if (!needsCompression(metadata, 100 * 1024 * 1024, Math.max(maxWidth, maxHeight))) {
    return file instanceof File ? file : file
  }

  return new Promise((resolve, reject) => {
    // Create video element
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true

    // Create canvas for re-encoding
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    // Calculate target dimensions
    const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
      metadata.width,
      metadata.height,
      maxWidth,
      maxHeight
    )

    canvas.width = targetWidth
    canvas.height = targetHeight

    video.onloadedmetadata = async () => {
      try {
        // Get canvas stream
        const canvasStream = canvas.captureStream(30)

        // Try to get audio track from original video
        const audioTrack: MediaStreamTrack | null = null

        // Note: Getting audio from video element is complex in browsers
        // For full audio support, consider Web Audio API or server-side processing

        // Set up MediaRecorder
        const chunks: Blob[] = []
        const recorder = new MediaRecorder(canvasStream, {
          mimeType: outputMimeType,
          videoBitsPerSecond: videoBitrate,
          audioBitsPerSecond: audioBitrate,
        })

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }

        recorder.onstop = () => {
          URL.revokeObjectURL(video.src)
          const blob = new Blob(chunks, { type: outputMimeType })
          resolve(blob)
        }

        recorder.onerror = (e) => {
          URL.revokeObjectURL(video.src)
          reject(new Error('Recording failed'))
        }

        // Start recording
        recorder.start()

        // Play and draw video frames
        video.play()

        const drawFrame = () => {
          if (video.ended || video.paused) {
            recorder.stop()
            return
          }

          // Draw current frame
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight)

          // Report progress
          if (onProgress && metadata.duration > 0) {
            const progress = Math.round((video.currentTime / metadata.duration) * 100)
            onProgress(progress)
          }

          requestAnimationFrame(drawFrame)
        }

        drawFrame()

        video.onended = () => {
          recorder.stop()
        }
      } catch (err) {
        URL.revokeObjectURL(video.src)
        reject(err)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Trim video to specified duration
 * Note: This is a simplified version - full trimming requires more complex processing
 */
export async function trimVideo(
  file: File | Blob,
  startTime: number,
  endTime: number,
  options: VideoCompressionOptions = {}
): Promise<Blob> {
  const { onProgress, ...compressionOptions } = options
  const metadata = await getVideoMetadata(file)

  // Validate times
  if (startTime < 0) {startTime = 0}
  if (endTime > metadata.duration) {endTime = metadata.duration}
  if (startTime >= endTime) {
    throw new Error('Invalid trim times')
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
      metadata.width,
      metadata.height,
      compressionOptions.maxWidth || 1920,
      compressionOptions.maxHeight || 1080
    )

    canvas.width = targetWidth
    canvas.height = targetHeight

    video.onloadedmetadata = async () => {
      try {
        // Seek to start time
        video.currentTime = startTime

        video.onseeked = () => {
          const canvasStream = canvas.captureStream(30)
          const chunks: Blob[] = []

          const recorder = new MediaRecorder(canvasStream, {
            mimeType: compressionOptions.outputMimeType || 'video/webm',
            videoBitsPerSecond: compressionOptions.videoBitrate || 1500000,
          })

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data)
            }
          }

          recorder.onstop = () => {
            URL.revokeObjectURL(video.src)
            const blob = new Blob(chunks, {
              type: compressionOptions.outputMimeType || 'video/webm'
            })
            resolve(blob)
          }

          recorder.start()
          video.play()

          const trimDuration = endTime - startTime

          const drawFrame = () => {
            const currentRelativeTime = video.currentTime - startTime

            if (video.currentTime >= endTime || video.ended) {
              video.pause()
              recorder.stop()
              return
            }

            ctx.drawImage(video, 0, 0, targetWidth, targetHeight)

            if (onProgress && trimDuration > 0) {
              const progress = Math.round((currentRelativeTime / trimDuration) * 100)
              onProgress(progress)
            }

            requestAnimationFrame(drawFrame)
          }

          drawFrame()
        }
      } catch (err) {
        URL.revokeObjectURL(video.src)
        reject(err)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Get video codec from MIME type
 */
export function getVideoCodec(mimeType: string): string | undefined {
  // Extract codec from MIME type like "video/webm;codecs=vp9"
  const match = mimeType.match(/codecs=([^,;]+)/)
  if (match) {
    return match[1]
  }

  // Infer codec from container
  if (mimeType.includes('webm')) {return 'vp8/vp9'}
  if (mimeType.includes('mp4')) {return 'h264'}
  if (mimeType.includes('quicktime')) {return 'h264'}

  return undefined
}

/**
 * Check if browser can play a video format
 */
export function canPlayVideoType(mimeType: string): boolean {
  const video = document.createElement('video')
  const result = video.canPlayType(mimeType)
  return result === 'probably' || result === 'maybe'
}

/**
 * Get best supported video format
 */
export function getBestVideoFormat(): string {
  const formats = [
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]

  for (const format of formats) {
    if (canPlayVideoType(format)) {
      return format
    }
  }

  return 'video/mp4' // Fallback
}

export default {
  getVideoMetadata,
  needsCompression,
  compressVideo,
  trimVideo,
  getVideoCodec,
  canPlayVideoType,
  getBestVideoFormat,
  calculateTargetDimensions,
}
