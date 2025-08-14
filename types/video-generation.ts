export interface SegmentTiming {
  duration: number
  startTime?: number
}

export interface IntroImageConfig {
  imageId: string
  imageUrl: string
  duration: number
  order: number
}

export interface IntroVideoConfig {
  videoId: string
  videoUrl: string
  duration: number
  order: number
  thumbnailUrl?: string
}

export interface CustomMusicFile {
  id: string
  name: string
  url: string
  duration?: number
}

export interface CreateVideoRequestBody {
  imageUrls: string[]
  videoUrls?: string[] // Add video URLs for mixed content
  // Ordered content arrays that preserve exact reordering sequence
  orderedContentUrls?: string[]
  orderedContentTypes?: ('image' | 'video' | 'animation')[]
  audioUrl: string
  compressedAudioUrl?: string
  subtitlesUrl?: string
  userId: string
  thumbnailUrl?: string
  segmentTimings?: SegmentTiming[]
  includeOverlay?: boolean
  quality?: 'low' | 'medium' | 'high'
  enableOverlay?: boolean
  enableZoom?: boolean
  enableSubtitles?: boolean
  fontFamily?: string
  fontColor?: string
  fontSize?: number
  strokeWidth?: number
  fontWeight?: string
  textTransform?: string
  audioDuration?: number
  zoomEffect?: boolean
  dustOverlay?: boolean
  // Custom music properties
  useCustomMusic?: boolean
  customMusicFiles?: CustomMusicFile[]
  selectedMusicTrack?: SelectedMusicTrack
}

export interface CreateVideoResponse {
  message?: string
  video_id?: string
  shotstack_id?: string
  error?: string
  details?: string
}

export interface VideoRecord {
  id: string
  user_id: string
  status: 'processing' | 'completed' | 'failed'
  shotstack_id: string
  image_urls: string[]
  audio_url: string
  compressed_audio_url?: string
  subtitles_url?: string
  final_video_url?: string
  thumbnail_url: string
  error_message?: string
  created_at: string
  updated_at: string
  metadata?: {
    type?: 'segmented' | 'traditional' | 'script-based' | 'option1' | 'option2' | 'mixed-content'
    segment_timings?: SegmentTiming[]
    total_duration?: number
    scenes_count?: number
    image_count?: number
    video_count?: number
    video_mode?: 'option1' | 'option2' | 'traditional'
    intro_images?: IntroImageConfig[]
    intro_videos?: IntroVideoConfig[]
    loop_image?: string
    loop_video?: string
  }
}

export interface SelectedMusicTrack {
  id: string
  title: string
  artist: string
  duration: number
  preview_url: string
  download_url?: string
  license_type: string
}

export interface VideoGenerationSettings {
  useSegmentedTiming: boolean
  useScriptBasedTiming: boolean
  videoQuality: 'hd' | 'sd'
  includeSubtitles: boolean
  includeOverlay: boolean
  videoMode: 'traditional' | 'option1' | 'option2'
  zoomEffect: boolean
  dustOverlay: boolean
  introDuration: number
  useEqualIntroDuration: boolean
  // Custom music properties
  useCustomMusic: boolean
  customMusicFiles: CustomMusicFile[]
  selectedMusicTrack?: SelectedMusicTrack
} 